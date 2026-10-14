import requests
from fastapi.requests import Request
import redis
from config import settings
import json
import math
from concurrent.futures import ThreadPoolExecutor


TMDB_HEADERS = {
    "accept": "application/json",
    "Authorization": f"Bearer {settings.tmdb_key}"
}

SEARCH_CACHE_TTL = 60 * 15
# A list built while a source was failing is only kept briefly, so the full results come back soon
DEGRADED_CACHE_TTL = 60
ITEM_CACHE_TTL = 60 * 60 * 24
PAGE_SIZE = 20
TMDB_MAX_PAGES = 5
TRAKT_LIMIT = 50
DETAIL_WORKERS = 8


def _tmdb_lang(lang: str) -> str:
    return "fr-FR" if lang == "fr" else "en-US"


def _to_item(item: dict, kind: str) -> dict | None:
    """Turns a TMDB search result or detail response into the item shape the frontend expects."""
    is_movie = kind == "movie"
    title = (item.get("title") or item.get("original_title")) if is_movie else (item.get("name") or item.get("original_name"))
    if not title or item.get("id") is None:
        return None
    genre_ids = item.get("genre_ids")
    if genre_ids is None:
        genre_ids = [g.get("id") for g in item.get("genres", []) if g.get("id") is not None]
    return {
        "id": item.get("id"),
        "title": title,
        "overview": item.get("overview", ""),
        "poster_path": item.get("poster_path"),
        "backdrop_path": item.get("backdrop_path"),
        "release_date": (item.get("release_date") if is_movie else item.get("first_air_date")) or "",
        "vote_average": item.get("vote_average", 0),
        "vote_count": item.get("vote_count", 0),
        "genre_ids": genre_ids,
        "media_type": "movie" if is_movie else "series",
    }


def _search_tmdb_page(kind: str, query: str, page: int, lang: str) -> tuple[list[dict], int] | None:
    """One TMDB search page as (items, total_pages); None when the request failed."""
    try:
        url = f"{settings.api_base_url.rstrip('/')}/search/{kind}"
        res = requests.get(url, headers=TMDB_HEADERS, params={
            "query": query,
            "language": _tmdb_lang(lang),
            "page": page,
            "include_adult": False
        }, timeout=8)
        res.raise_for_status()
        data = res.json()
        items = [i for i in (_to_item(r, kind) for r in data.get("results", [])) if i]
        return items, int(data.get("total_pages") or 0)
    except Exception as e:
        print(f"[search_tmdb_{kind}] page {page} error: {e}")
        return None


def _tmdb_candidates(kind: str, query: str, lang: str) -> tuple[list[dict], bool]:
    """Up to TMDB_MAX_PAGES pages of TMDB results; the flag is False if TMDB failed."""
    first = _search_tmdb_page(kind, query, 1, lang)
    if first is None:
        return [], False
    items, total_pages = first
    last_page = min(total_pages, TMDB_MAX_PAGES)
    if last_page > 1:
        with ThreadPoolExecutor(max_workers=last_page - 1) as pool:
            pages = pool.map(lambda p: _search_tmdb_page(kind, query, p, lang), range(2, last_page + 1))
            for page in pages:
                if page is not None:
                    items.extend(page[0])
    return items, True


def _search_trakt(kind: str, query: str) -> list[int] | None:
    """TMDB ids of Trakt's matches, in Trakt's order; [] without a key, None when Trakt failed."""
    if not settings.trakt_client_id:
        return []
    trakt_type = "movie" if kind == "movie" else "show"
    try:
        res = requests.get(
            f"https://api.trakt.tv/search/{trakt_type}",
            params={"query": query, "limit": TRAKT_LIMIT},
            headers={
                "Content-Type": "application/json",
                "trakt-api-version": "2",
                "trakt-api-key": settings.trakt_client_id,
            },
            timeout=8,
        )
        res.raise_for_status()
        ids: list[int] = []
        for result in res.json():
            tmdb_id = ((result.get(trakt_type) or {}).get("ids") or {}).get("tmdb")
            if isinstance(tmdb_id, int) and tmdb_id not in ids:
                ids.append(tmdb_id)
        return ids
    except Exception as e:
        print(f"[search_trakt_{kind}] error: {e}")
        return None


def _tmdb_by_id(rd: redis.Redis | None, kind: str, tmdb_id: int, lang: str) -> dict | None:
    """A title that only Trakt found, built from its TMDB details."""
    cache_key = f"search_item_{kind}_{tmdb_id}_{lang}"
    try:
        if rd is not None:
            cached = rd.get(cache_key)
            if cached:
                return json.loads(cached) or None
    except Exception:
        pass

    try:
        res = requests.get(
            f"{settings.api_base_url.rstrip('/')}/{kind}/{tmdb_id}",
            headers=TMDB_HEADERS,
            params={"language": _tmdb_lang(lang)},
            timeout=8,
        )
        if res.status_code == 404:
            item = None
        else:
            res.raise_for_status()
            data = res.json()
            item = None if data.get("adult") else _to_item(data, kind)
    except Exception as e:
        print(f"[search_tmdb_by_id] {kind} {tmdb_id} error: {e}")
        return None

    try:
        if rd is not None:
            # Unknown ids are cached too ("null") so they aren't requested again
            rd.setex(cache_key, ITEM_CACHE_TTL, json.dumps(item))
    except Exception:
        pass
    return item


def _sort_key(item: dict):
    return (item["title"].casefold(), item.get("release_date") or "")


def _build_results(rd: redis.Redis | None, kind: str, query: str, lang: str) -> tuple[list[dict], list[str], bool]:
    """Merged and name-sorted results, the sources used, and whether every source answered."""
    with ThreadPoolExecutor(max_workers=2) as pool:
        tmdb_future = pool.submit(_tmdb_candidates, kind, query, lang)
        trakt_future = pool.submit(_search_trakt, kind, query)
        tmdb_items, tmdb_ok = tmdb_future.result()
        trakt_ids = trakt_future.result()

    merged: dict[int, dict] = {}
    for item in tmdb_items:
        if item["id"] not in merged:
            merged[item["id"]] = {**item, "sources": ["tmdb"]}

    trakt_ids = trakt_ids or []
    for tmdb_id in trakt_ids:
        if tmdb_id in merged:
            merged[tmdb_id]["sources"].append("trakt")

    missing = [tmdb_id for tmdb_id in trakt_ids if tmdb_id not in merged]
    if missing:
        with ThreadPoolExecutor(max_workers=DETAIL_WORKERS) as pool:
            for item in pool.map(lambda i: _tmdb_by_id(rd, kind, i, lang), missing):
                if item and item["id"] not in merged:
                    merged[item["id"]] = {**item, "sources": ["trakt"]}

    sources = ["tmdb", "trakt"] if settings.trakt_client_id else ["tmdb"]
    all_ok = tmdb_ok and (not settings.trakt_client_id or trakt_ids is not None)
    return sorted(merged.values(), key=_sort_key), sources, all_ok


def _cached_search(request: Request, kind: str, query: str, page: int, lang: str) -> dict:
    """
    The full merged list is built once per query and cached, then served in pages, so that the
    name order holds across pages for the infinite scroll.
    """
    rd: redis.Redis | None = getattr(request.app.state, "redis", None)
    normalized = query.lower().strip()
    trakt_flag = "t" if settings.trakt_client_id else "n"
    cache_key = f"search_{kind}_v3_{trakt_flag}_{normalized}_{lang}"

    cached = None
    try:
        if rd is not None:
            raw = rd.get(cache_key)
            if raw:
                cached = json.loads(raw)
    except Exception:
        pass

    if cached is None:
        results, sources, all_ok = _build_results(rd, kind, normalized, lang)
        cached = {"results": results, "sources": sources}
        try:
            if rd is not None:
                rd.setex(cache_key, SEARCH_CACHE_TTL if all_ok else DEGRADED_CACHE_TTL, json.dumps(cached))
        except Exception:
            pass

    results = cached["results"]
    page = max(page, 1)
    total_pages = math.ceil(len(results) / PAGE_SIZE)
    start = (page - 1) * PAGE_SIZE
    return {
        "query": query,
        "page": page,
        "results": results[start:start + PAGE_SIZE],
        "total_results": len(results),
        "total_pages": total_pages,
        "has_more": page < total_pages,
        "sources": cached["sources"],
    }


def searchMovies(request: Request, query: str, page: int = 1, lang: str = "en") -> dict:
    return _cached_search(request, "movie", query, page, lang)


def searchSeries(request: Request, query: str, page: int = 1, lang: str = "en") -> dict:
    return _cached_search(request, "tv", query, page, lang)
