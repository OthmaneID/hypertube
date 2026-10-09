import asyncio
import json
import os
import re

import httpx2
import redis
from fastapi import HTTPException

from config import settings

SUBTITLES_DIR = os.path.join("uploads", "subtitles")
os.makedirs(SUBTITLES_DIR, exist_ok=True)

# App language code -> codes used by the subtitle sources (ISO 639-2 for Stremio)
SUBTITLE_LANGUAGES = {
    "en": {"stremio": "eng", "label": "English"},
    "fr": {"stremio": "fre", "label": "Français"},
    "ar": {"stremio": "ara", "label": "العربية"},
}

STREMIO_SUBTITLES_URL = "https://opensubtitles-v3.strem.io/subtitles"
OPENSUBTITLES_API_URL = "https://api.opensubtitles.com/api/v1"
CANDIDATES_CACHE_TTL = 60 * 60 * 12
CANDIDATES_PER_LANGUAGE = 3
REQUEST_TIMEOUT = 15.0

IMDB_ID_RE = re.compile(r"^tt\d+$")
SRT_TIMESTAMP_RE = re.compile(r"(\d{1,2}:\d{2}:\d{2}),(\d{3})")
# SSA/ASS override tags such as {\an8} that browsers would render literally
SSA_TAG_RE = re.compile(r"\{\\[^}]*\}")
TOKEN_RE = re.compile(r"[a-z0-9]+")
MULTI_PART_RE = re.compile(r"\bcd\s?\d\b")


def srt_to_vtt(srt_content: str) -> str:
    """Converts SRT text to WebVTT text."""
    text = srt_content.lstrip("\ufeff").replace("\r\n", "\n").replace("\r", "\n")
    text = SRT_TIMESTAMP_RE.sub(r"\1.\2", text)
    text = SSA_TAG_RE.sub("", text)
    return "WEBVTT\n\n" + text.strip() + "\n"


def to_vtt(content: str) -> str:
    stripped = content.lstrip("\ufeff")
    if stripped.startswith("WEBVTT"):
        return SSA_TAG_RE.sub("", stripped)
    return srt_to_vtt(stripped)


def decode_subtitle(raw: bytes, lang: str) -> str:
    try:
        return raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        # Legacy subtitles are usually in the Windows code page of their language
        return raw.decode("cp1256" if lang == "ar" else "cp1252", errors="replace")


def release_score(candidate: dict, filename: str | None) -> int:
    """Higher means the subtitle was more likely made for the same release as the video."""
    if not filename:
        return 0
    name = filename.lower()
    file_tokens = set(TOKEN_RE.findall(name))
    score = 0
    group = (candidate.get("releaseGroup") or "").lower()
    if group and group in file_tokens:
        score += 10
    release = f"{candidate.get('movieReleaseName', '')} {candidate.get('subtitleFileName', '')}".lower()
    score += len(file_tokens & set(TOKEN_RE.findall(release)))
    # Split "CD1/CD2" subtitles only cover part of the movie
    if MULTI_PART_RE.search(release) and not MULTI_PART_RE.search(name):
        score -= 20
    return score


def subtitle_key(imdb_id: str, season: int | None, episode: int | None) -> str:
    if season is not None and episode is not None:
        return f"{imdb_id}_s{season}e{episode}"
    return imdb_id


async def fetch_stremio_candidates(client: httpx2.AsyncClient, rd: redis.Redis | None, imdb_id: str, season: int | None, episode: int | None) -> list[dict]:
    cache_key = f"subtitles_candidates_{subtitle_key(imdb_id, season, episode)}"
    try:
        if rd is not None and (cached := rd.get(cache_key)):
            return json.loads(cached)
    except redis.RedisError as e:
        print(f"Redis cache read error: {e}")

    if season is not None and episode is not None:
        url = f"{STREMIO_SUBTITLES_URL}/series/{imdb_id}:{season}:{episode}.json"
    else:
        url = f"{STREMIO_SUBTITLES_URL}/movie/{imdb_id}.json"

    try:
        res = await client.get(url)
        res.raise_for_status()
        candidates = res.json().get("subtitles", [])
    except Exception as e:
        print(f"Failed to fetch subtitles from Stremio: {e}")
        return []

    try:
        if rd is not None:
            rd.setex(cache_key, CANDIDATES_CACHE_TTL, json.dumps(candidates))
    except redis.RedisError as e:
        print(f"Redis cache write error: {e}")
    return candidates


def pick_stremio_candidates(candidates: list[dict], lang: str, season: int | None, episode: int | None, filename: str | None) -> list[dict]:
    code = SUBTITLE_LANGUAGES[lang]["stremio"]
    matching = [
        c for c in candidates
        if c.get("lang") == code and c.get("url")
        and (season is None or (c.get("season") == season and c.get("episode") == episode))
    ]
    # sorted() is stable, so ties keep Stremio's own ordering
    return sorted(matching, key=lambda c: release_score(c, filename), reverse=True)[:CANDIDATES_PER_LANGUAGE]


async def fetch_official_subtitle(client: httpx2.AsyncClient, imdb_id: str, season: int | None, episode: int | None, lang: str) -> bytes | None:
    """Fallback on the official API; its free plan only allows a handful of downloads per day."""
    api_key = settings.opensubtitles_api_key
    if not api_key:
        return None
    headers = {"Api-Key": api_key, "User-Agent": "HypertubeApp v1.0"}
    numeric_id = imdb_id[2:].lstrip("0")
    if season is not None and episode is not None:
        params = {"parent_imdb_id": numeric_id, "season_number": season, "episode_number": episode, "languages": lang}
    else:
        params = {"imdb_id": numeric_id, "languages": lang}

    try:
        search = await client.get(f"{OPENSUBTITLES_API_URL}/subtitles", params=params, headers=headers)
        search.raise_for_status()
        results = search.json().get("data", [])
        results.sort(key=lambda x: x.get("attributes", {}).get("download_count", 0), reverse=True)
        file_id = next((r["attributes"]["files"][0]["file_id"] for r in results if r.get("attributes", {}).get("files")), None)
        if file_id is None:
            return None

        link_res = await client.post(f"{OPENSUBTITLES_API_URL}/download", json={"file_id": file_id}, headers=headers)
        link_res.raise_for_status()
        link_data = link_res.json()
        print(f"OpenSubtitles downloads remaining today: {link_data.get('remaining')}")
        if not link_data.get("link"):
            return None
        file_res = await client.get(link_data["link"])
        file_res.raise_for_status()
        return file_res.content
    except Exception as e:
        print(f"Official OpenSubtitles fallback failed for {lang}: {e}")
        return None


async def resolve_language(client: httpx2.AsyncClient, candidates: list[dict], imdb_id: str, season: int | None, episode: int | None, filename: str | None, lang: str) -> str | None:
    """Returns the cached VTT filename for this language, downloading it if needed."""
    base = f"{subtitle_key(imdb_id, season, episode)}_{lang}"

    for candidate in pick_stremio_candidates(candidates, lang, season, episode, filename):
        vtt_filename = f"{base}_{candidate.get('id', 'x')}.vtt"
        if os.path.exists(os.path.join(SUBTITLES_DIR, vtt_filename)):
            return vtt_filename
        try:
            res = await client.get(candidate["url"])
            res.raise_for_status()
        except Exception as e:
            print(f"Failed to download subtitle {candidate.get('id')} ({lang}): {e}")
            continue
        return save_vtt(vtt_filename, decode_subtitle(res.content, lang))

    official_filename = f"{base}_official.vtt"
    if os.path.exists(os.path.join(SUBTITLES_DIR, official_filename)):
        return official_filename
    raw = await fetch_official_subtitle(client, imdb_id, season, episode, lang)
    if raw:
        return save_vtt(official_filename, decode_subtitle(raw, lang))
    return None


def save_vtt(vtt_filename: str, content: str) -> str | None:
    vtt = to_vtt(content)
    if "-->" not in vtt:
        return None
    with open(os.path.join(SUBTITLES_DIR, vtt_filename), "w", encoding="utf-8") as f:
        f.write(vtt)
    return vtt_filename


async def get_subtitles(rd: redis.Redis | None, imdb_id: str, season: int | None, episode: int | None, filename: str | None, preferred_lang: str) -> list[dict]:
    if not IMDB_ID_RE.match(imdb_id):
        raise HTTPException(status_code=400, detail="Invalid IMDb id")
    if (season is None) != (episode is None):
        raise HTTPException(status_code=400, detail="season and episode must be given together")

    default_lang = preferred_lang if preferred_lang in SUBTITLE_LANGUAGES else "en"

    async with httpx2.AsyncClient(timeout=REQUEST_TIMEOUT, follow_redirects=True) as client:
        candidates = await fetch_stremio_candidates(client, rd, imdb_id, season, episode)
        langs = list(SUBTITLE_LANGUAGES)
        files = await asyncio.gather(*(
            resolve_language(client, candidates, imdb_id, season, episode, filename, lang) for lang in langs
        ))

    return [
        {
            "src": f"/uploads/subtitles/{vtt_filename}",
            "srcLang": lang,
            "label": SUBTITLE_LANGUAGES[lang]["label"],
            "default": lang == default_lang,
        }
        for lang, vtt_filename in zip(langs, files)
        if vtt_filename
    ]
