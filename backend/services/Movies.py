import requests
from fastapi.requests import Request
import redis

import json
from config import settings
from schema.User import UserResponse
from sqlalchemy.orm import Session
from models.User import User
from models.Favorites import favoriteTypeEnum, Favorites
import httpx2
from utils.discover import discover_cache_key


# for images : (https://image.tmdb.org/t/p/original/{path}.png || .svg or https://image.tmdb.org/t/p/w500/{path})



# TMDB_KEY = os.getenv("TMDB_ACCESS_KEY")

headers = {
    "accept": "application/json",
    "Authorization": f"Bearer {settings.tmdb_key}"
}




def getGenres(request: Request, lang: str = "en") :
    rd: redis.Redis | None = getattr(request.app.state, "redis", None)
    cache_key = f"genres_{lang}"
    try:
        if rd is not None:
            cached = rd.get(cache_key)
            if cached:
                return json.loads(cached)
    except Exception:
        pass

    tmdb_lang = "fr-FR" if lang == "fr" else "en-US"
    try:
        res = requests.get(f"{settings.api_base_url.rstrip('/')}/genre/movie/list?language={tmdb_lang}", headers=headers, timeout=10)
        data = res.json()
        if data and rd is not None and res.status_code == 200:
            rd.setex(cache_key, 60 * 60 * 24, json.dumps(data))
        return data
    except Exception as e:
        print(f"Error while fetching movie genres: {e}")
        return {"genres": []}


def getMovies(request : Request, category: str = "popular", page: int = 1, discover_params: dict | None = None, lang: str = "en"):
    # TMDB Discover sorts and filters the whole catalog, so consecutive pages stay consistent
    rd: redis.Redis | None = getattr(request.app.state, "redis", None)
    tmdb_lang = "fr-FR" if lang == "fr" else "en-US"
    if discover_params:
        cache_key = discover_cache_key("movie", discover_params, page, lang)
        request_url = f"{settings.api_base_url.rstrip('/')}/discover/movie"
    else:
        cache_key = f"{category}_movies_{page}_{lang}"
        request_url = f"{settings.api_base_url.rstrip('/')}/movie/{category}"
    try:
        if rd is not None:
            cached_movies = rd.get(cache_key)
            if cached_movies is not None:
                return json.loads(cached_movies)
    except Exception as e:
        pass

    try:
        res = requests.get(request_url, params={"language": tmdb_lang, "page": page, **(discover_params or {})}, headers=headers, timeout=10)
        data = res.json()
        if data and rd is not None and res.status_code == 200:
            rd.setex(cache_key, 60 * 60 * 6, json.dumps(data))
        return data
    except Exception as e:
        print(f"Error while fetching Movies : {e}")
        return {"page": 1, "results": [], "total_pages": 1, "total_results": 0}


def getTrending(request: Request, media_type: str, time_window: str, lang: str = "en"):
    # media_type is TMDB's "movie" or "tv", time_window is "day" or "week"
    rd: redis.Redis | None = getattr(request.app.state, "redis", None)
    tmdb_lang = "fr-FR" if lang == "fr" else "en-US"
    cache_key = f"trending_{media_type}_{time_window}_{lang}"
    try:
        if rd is not None:
            cached = rd.get(cache_key)
            if cached is not None:
                return json.loads(cached)
    except Exception:
        pass

    try:
        res = requests.get(f"{settings.api_base_url.rstrip('/')}/trending/{media_type}/{time_window}", params={"language": tmdb_lang}, headers=headers, timeout=10)
        data = res.json()
        if data and rd is not None and res.status_code == 200:
            rd.setex(cache_key, 60 * 60, json.dumps(data))
        return data
    except Exception as e:
        print(f"Error while fetching trending {media_type}: {e}")
        return {"page": 1, "results": [], "total_pages": 1, "total_results": 0}


def getMovieDetails(request: Request, movie_id: int, db: Session, user: UserResponse, lang: str = "en"):
    rd: redis.Redis | None = getattr(request.app.state, "redis", None)
    tmdb_lang = "fr-FR" if lang == "fr" else "en-US"
    cache_key = f"movie_{movie_id}_{lang}"
    data = None
    try:
        if rd is not None:
            cached_data = rd.get(cache_key)
            if isinstance(cached_data, (str, bytes, bytearray)):
                data = json.loads(cached_data)
    except Exception as e:
        print(f"Error while reading cached Movie Details: {e}")

    if data is None:
        try:
            res = requests.get(f"{settings.api_base_url.rstrip('/')}/movie/{movie_id}?language={tmdb_lang}", headers=headers, timeout=10)
            data = res.json()
            if isinstance(data, dict) and data and rd is not None and res.status_code == 200:
                data_to_cache = {**data}
                data_to_cache.pop("is_favorite", None)
                try:
                    rd.setex(cache_key, 60 * 60 * 24, json.dumps(data_to_cache))
                except Exception as e:
                    print(f"Error while caching Movie Details: {e}")
        except Exception as e:
            print(f"Error while fetching Movie Details: {e}")
            return {"error": str(e)}

    if isinstance(data, dict):
        data["is_favorite"] = (
            db.query(User)
            .join(User.favorites)
            .filter(
                User.id == user.id,
                Favorites.favorite_type == favoriteTypeEnum.MOVIE,
                Favorites.favorite_id == movie_id,
            )
            .first()
            is not None
        )
    return data


def getMovieCredits(request: Request, movie_id: str, lang: str = "en"):
    if str(movie_id).startswith("archive-"):
        return {"cast": [], "crew": []}
    tmdb_lang = "fr-FR" if lang == "fr" else "en-US"
    rd: redis.Redis | None = getattr(request.app.state, "redis", None)
    rd_name = f"movie_cast_{movie_id}_{lang}"
    try:
        if rd is not None:
            cached = rd.get(rd_name)
            if cached:
                return json.loads(cached)
    except Exception:
        pass

    try:
        res = requests.get(f"{settings.api_base_url.rstrip('/')}/movie/{movie_id}/credits?language={tmdb_lang}", headers=headers, timeout=10)
        data = res.json()
        if data and rd is not None and res.status_code == 200:
            rd.setex(rd_name, 60 * 60 * 24, json.dumps(data))
        return data
    except Exception as e:
        print(f"Error while fetching Movie Credits : {e}")
        return {"cast": [], "crew": [], "error": str(e)}



def getMovieVideos(request: Request, movie_id: str, lang: str = "en"):
    if str(movie_id).startswith("archive-"):
        return {"results": []}
    tmdb_lang = "fr-FR" if lang == "fr" else "en-US"
    request_url = f"{settings.api_base_url.rstrip('/')}/movie/{movie_id}/videos?language={tmdb_lang}"
    rd: redis.Redis | None = getattr(request.app.state, "redis", None)
    rd_name = f"movie_{movie_id}_videos_{lang}"
    try:
        if rd is not None:
            cached = rd.get(rd_name)
            if cached:
                return json.loads(cached)
    except Exception:
        pass

    try:
        res = requests.get(request_url, headers=headers, timeout=10)
        data = res.json()
        if data and rd is not None and res.status_code == 200:
            rd.setex(rd_name, 60 * 60 * 8, json.dumps(data))
        return data
    except Exception as e:
        print("error while getting movie trailers : ", e)
        return {"results": [], "error": str(e)}

    

#  torrent related functions
