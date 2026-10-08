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


# for images : (https://image.tmdb.org/t/p/original/{path}.png || .svg or https://image.tmdb.org/t/p/w500/{path})



# TMDB_KEY = os.getenv("TMDB_ACCESS_KEY")

headers = {
    "accept": "application/json",
    "Authorization": f"Bearer {settings.tmdb_key}"
}




def getGenres(request: Request, lang: str = "en") :
    rd : redis.Redis = request.app.state.redis
    cache_key = f"genres_{lang}"
    try:
        if rd is not None and rd.get(cache_key):
            return json.loads(rd.get(cache_key))
    except Exception as e:
        pass
        
    tmdb_lang = "fr-FR" if lang == "fr" else "en-US"
    res = requests.get(f"{settings.api_base_url}genre/movie/list?language={tmdb_lang}", headers=headers)
    try:
        if res.json():
            rd.setex(cache_key, 60 * 60 * 24, json.dumps(res.json()))
        return res.json()
    except Exception as e:
        pass
    if res:
        return res.json()


def getMovies(request : Request, category: str = "popular", page: int = 1, sort_by: str | None = None, lang: str = "en"):
    # Use TMDB Discover when a sort order is requested; keep existing popular feeds unchanged.
    rd :redis.Redis= request.app.state.redis
    tmdb_lang = "fr-FR" if lang == "fr" else "en-US"
    cache_key = f"discover_movies_{sort_by}_{page}_{lang}" if sort_by else f"{category}_movies_{page}_{lang}"
    request_url = f"{settings.api_base_url}discover/movie" if sort_by else f"{settings.api_base_url}movie/{category}"
    try:
        if rd is not None:
            cached_movies = rd.get(cache_key)
            if cached_movies is not None:
                return json.loads(cached_movies)
    except Exception as e :
        pass
    if sort_by:
        res = requests.get(request_url, params={"language": tmdb_lang, "page": page, "sort_by": sort_by}, headers=headers)
    else:
        res = requests.get(request_url, params={"language": tmdb_lang, "page": page}, headers=headers)
    try:
        if res.json():
            rd.setex(cache_key, 60 * 60 * 6, json.dumps(res.json()))
            return res.json()
    except Exception as e:
        print(f"Error while fetching Movies : {e}")
        return res.json()
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
        res = requests.get(f"{settings.api_base_url}movie/{movie_id}?language={tmdb_lang}", headers=headers)
        data = res.json()
        if isinstance(data, dict) and data and rd is not None:
            data.pop("is_favorite", None)
            try:
                rd.setex(cache_key, 60 * 60 * 24, json.dumps(data))
            except Exception as e:
                print(f"Error while caching Movie Details: {e}")

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
    try:
        rd : redis.Redis = request.app.state.redis
        if rd is not None and rd.get(f"movie_cast_{movie_id}_{lang}"):
            return json.loads(rd.get(f"movie_cast_{movie_id}_{lang}"))
    except Exception:
        rd = None
    
    res = requests.get(f"{settings.api_base_url}movie/{movie_id}/credits?language={tmdb_lang}", headers=headers)
    data = res.json()
    try:
        if data and rd is not None:
            rd.setex(f"movie_cast_{movie_id}_{lang}", 60 * 60 * 24, json.dumps(data))
        return data
    except Exception as e:
        print(f"Error while fetching Movie Credits : {e}")
        return data



def getMovieVideos(request: Request, movie_id: str, lang: str = "en"):
    if str(movie_id).startswith("archive-"):
        return {"results": []}
    tmdb_lang = "fr-FR" if lang == "fr" else "en-US"
    request_url = f"{settings.api_base_url}movie/{movie_id}/videos?language={tmdb_lang}"
    rd : redis.Redis = request.app.state.redis
    try:
        if rd is not None and rd.get(f"movie_{movie_id}_videos_{lang}"):
            return json.loads(rd.get(f"movie_{movie_id}_videos_{lang}"))
    except Exception:
        pass
    res = requests.get(request_url, headers=headers)
    data = res.json()
    try:
        if data and rd is not None:
            rd.setex(f"movie_{movie_id}_videos_{lang}", 60 * 60 * 8, json.dumps(data))
    except Exception as e:
        print("error while getting movie trailers : ", e)
    return data

    

#  torrent related functions
