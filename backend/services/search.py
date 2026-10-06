import requests
from fastapi.requests import Request
import redis
from config import settings
import json
from concurrent.futures import ThreadPoolExecutor, as_completed


TMDB_HEADERS = {
    "accept": "application/json",
    "Authorization": f"Bearer {settings.tmdb_key}"
}

ARCHIVE_SEARCH_URL = "https://archive.org/advancedsearch.php"


def _search_tmdb_movies(query: str, page: int = 1, lang: str = "en") -> list:
    """Search movies on TMDB."""
    try:
        tmdb_lang = "fr-FR" if lang == "fr" else "en-US"
        url = f"{settings.api_base_url}search/movie"
        res = requests.get(url, headers=TMDB_HEADERS, params={
            "query": query,
            "language": tmdb_lang,
            "page": page,
            "include_adult": False
        }, timeout=8)
        data = res.json()
        results = []
        for item in data.get("results", []):
            results.append({
                "id": item.get("id"),
                "title": item.get("title") or item.get("original_title", ""),
                "overview": item.get("overview", ""),
                "poster_path": item.get("poster_path"),
                "backdrop_path": item.get("backdrop_path"),
                "release_date": item.get("release_date", ""),
                "vote_average": item.get("vote_average", 0),
                "vote_count": item.get("vote_count", 0),
                "genre_ids": item.get("genre_ids", []),
                "media_type": "movie",
                "source": "tmdb",
            })
        return results
    except Exception as e:
        print(f"[search_tmdb_movies] error: {e}")
        return []


def _search_tmdb_series(query: str, page: int = 1, lang: str = "en") -> list:
    """Search TV series on TMDB."""
    try:
        tmdb_lang = "fr-FR" if lang == "fr" else "en-US"
        url = f"{settings.api_base_url}search/tv"
        res = requests.get(url, headers=TMDB_HEADERS, params={
            "query": query,
            "language": tmdb_lang,
            "page": page,
            "include_adult": False
        }, timeout=8)
        data = res.json()
        results = []
        for item in data.get("results", []):
            results.append({
                "id": item.get("id"),
                "title": item.get("name") or item.get("original_name", ""),
                "overview": item.get("overview", ""),
                "poster_path": item.get("poster_path"),
                "backdrop_path": item.get("backdrop_path"),
                "release_date": item.get("first_air_date", ""),
                "vote_average": item.get("vote_average", 0),
                "vote_count": item.get("vote_count", 0),
                "genre_ids": item.get("genre_ids", []),
                "media_type": "series",
                "source": "tmdb",
            })
        return results
    except Exception as e:
        print(f"[search_tmdb_series] error: {e}")
        return []


def _search_archive_org(query: str, page: int = 1, rows: int = 20) -> list:
    """
    Search royalty-free / public-domain movies on archive.org.
    Uses the Advanced Search API — no API key required.
    """
    try:
        params = {
            "q": f'({query}) AND mediatype:(movies)',
            "fl[]": ["identifier", "title", "date", "description", "subject", "downloads", "avg_rating"],
            "rows": rows,
            "page": page,
            "output": "json",
            "sort[]": "downloads desc",
        }
        res = requests.get(ARCHIVE_SEARCH_URL, params=params, timeout=4)
        data = res.json()
        results = []
        for item in data.get("response", {}).get("docs", []):
            identifier = item.get("identifier", "")
            title = item.get("title", identifier)
            date = item.get("date", "")
            year = date[:4] if date else ""
            desc = item.get("description", "")
            if isinstance(desc, list):
                desc = desc[0] if desc else ""
            title_str = title if isinstance(title, str) else (title[0] if title else identifier)
            results.append({
                "id": None,
                "archive_identifier": identifier,
                "title": title_str,
                "overview": desc,
                "poster_path": None,
                "backdrop_path": None,
                "release_date": year,
                "vote_average": float(item.get("avg_rating") or 0),
                "vote_count": int(item.get("downloads") or 0),
                "genre_ids": [],
                "media_type": "movie",
                "source": "archive",
                "archive_url": f"https://archive.org/details/{identifier}",
            })
        return results
    except Exception as e:
        print(f"[search_archive_org] error: {e}")
        return []


def searchMovies(request: Request, query: str, page: int = 1, lang: str = "en") -> dict:
    """
    Merged movie search: TMDB (primary) + archive.org (royalty-free).
    Results are cached in Redis for 15 minutes.
    Sorted alphabetically by title as required by the subject.
    """
    rd: redis.Redis = request.app.state.redis
    cache_key = f"search_movies_{query.lower().strip()}_{page}_{lang}"

    try:
        if rd is not None:
            cached = rd.get(cache_key)
            if cached:
                return json.loads(cached)
    except Exception:
        pass

    # Run both sources in parallel — results appear as fast as the faster source
    tmdb_results: list = []
    archive_results: list = []
    with ThreadPoolExecutor(max_workers=2) as executor:
        futures = {
            executor.submit(_search_tmdb_movies, query, page, lang): "tmdb",
            executor.submit(_search_archive_org, query, page): "archive",
        }
        for future in as_completed(futures, timeout=12):
            source = futures[future]
            try:
                result = future.result()
                if source == "tmdb":
                    tmdb_results = result
                else:
                    archive_results = result
            except Exception as e:
                print(f"[searchMovies] {source} future error: {e}")

    combined = tmdb_results + archive_results
    combined.sort(key=lambda x: (x.get("title") or "").lower())

    response = {
        "query": query,
        "page": page,
        "results": combined,
        "total_results": len(combined),
        "sources": ["tmdb", "archive.org"],
    }

    try:
        if rd is not None:
            rd.setex(cache_key, 60 * 15, json.dumps(response))
    except Exception:
        pass

    return response


def searchSeries(request: Request, query: str, page: int = 1, lang: str = "en") -> dict:
    """
    Series search: TMDB only (archive.org does not have structured series).
    Results are cached in Redis for 15 minutes.
    """
    rd: redis.Redis = request.app.state.redis
    cache_key = f"search_series_{query.lower().strip()}_{page}_{lang}"

    try:
        if rd is not None:
            cached = rd.get(cache_key)
            if cached:
                return json.loads(cached)
    except Exception:
        pass

    tmdb_results = _search_tmdb_series(query, page, lang)
    tmdb_results.sort(key=lambda x: (x.get("title") or "").lower())

    response = {
        "query": query,
        "page": page,
        "results": tmdb_results,
        "total_results": len(tmdb_results),
        "sources": ["tmdb"],
    }

    try:
        if rd is not None:
            rd.setex(cache_key, 60 * 15, json.dumps(response))
    except Exception:
        pass

    return response
