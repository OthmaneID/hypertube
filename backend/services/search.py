import requests
from fastapi.requests import Request
import redis
from config import settings
import json


TMDB_HEADERS = {
    "accept": "application/json",
    "Authorization": f"Bearer {settings.tmdb_key}"
}

SEARCH_CACHE_TTL = 60 * 15


def _search_tmdb(kind: str, query: str, page: int, lang: str) -> tuple[list, int]:
    """Search TMDB movies ("movie") or series ("tv"); returns (results, total_pages)."""
    try:
        tmdb_lang = "fr-FR" if lang == "fr" else "en-US"
        url = f"{settings.api_base_url.rstrip('/')}/search/{kind}"
        res = requests.get(url, headers=TMDB_HEADERS, params={
            "query": query,
            "language": tmdb_lang,
            "page": page,
            "include_adult": False
        }, timeout=8)
        data = res.json()
        is_movie = kind == "movie"
        results = []
        for item in data.get("results", []):
            results.append({
                "id": item.get("id"),
                "title": (item.get("title") or item.get("original_title", "")) if is_movie
                         else (item.get("name") or item.get("original_name", "")),
                "overview": item.get("overview", ""),
                "poster_path": item.get("poster_path"),
                "backdrop_path": item.get("backdrop_path"),
                "release_date": item.get("release_date", "") if is_movie else item.get("first_air_date", ""),
                "vote_average": item.get("vote_average", 0),
                "vote_count": item.get("vote_count", 0),
                "genre_ids": item.get("genre_ids", []),
                "media_type": "movie" if is_movie else "series",
                "source": "tmdb",
            })
        return results, int(data.get("total_pages") or 0)
    except Exception as e:
        print(f"[search_tmdb_{kind}] error: {e}")
        return [], 0


def _cached_search(request: Request, kind: str, query: str, page: int, lang: str) -> dict:
    """Results keep TMDB's relevance order so that consecutive pages stay consistent."""
    rd: redis.Redis | None = getattr(request.app.state, "redis", None)
    cache_key = f"search_{kind}_v2_{query.lower().strip()}_{page}_{lang}"

    try:
        if rd is not None:
            cached = rd.get(cache_key)
            if cached:
                return json.loads(cached)
    except Exception:
        pass

    results, total_pages = _search_tmdb(kind, query, page, lang)
    response = {
        "query": query,
        "page": page,
        "results": results,
        "total_results": len(results),
        "total_pages": total_pages,
        "has_more": page < total_pages,
        "sources": ["tmdb"],
    }

    try:
        if rd is not None:
            rd.setex(cache_key, SEARCH_CACHE_TTL, json.dumps(response))
    except Exception:
        pass

    return response


def searchMovies(request: Request, query: str, page: int = 1, lang: str = "en") -> dict:
    return _cached_search(request, "movie", query, page, lang)


def searchSeries(request: Request, query: str, page: int = 1, lang: str = "en") -> dict:
    return _cached_search(request, "tv", query, page, lang)
