import requests
from fastapi.requests import Request
import redis
import json

from config import settings
from schema.User import UserResponse
from sqlalchemy.orm import Session
from models.User import User
from models.Favorites import favoriteTypeEnum, Favorites
from utils.discover import discover_cache_key


#

headers = {
    "accept": "application/json",
    "Authorization": f"Bearer {settings.tmdb_key}"
}

def getGenres(request: Request, lang: str = "en"):
    rd: redis.Redis | None = getattr(request.app.state, "redis", None)
    cache_key = f"series_genres_{lang}"
    try:
        if rd is not None:
            cached = rd.get(cache_key)
            if cached:
                return json.loads(cached)
    except Exception:
        pass

    tmdb_lang = "fr-FR" if lang == "fr" else "en-US"
    try:
        res = requests.get(f"{settings.api_base_url.rstrip('/')}/genre/tv/list?language={tmdb_lang}", headers=headers, timeout=10)
        data = res.json()
        if data and rd is not None and res.status_code == 200:
            rd.setex(cache_key, 60 * 60 * 24, json.dumps(data))
        return data
    except Exception as e:
        print(f"Error while fetching series genres: {e}")
        return {"genres": []}


def GetSeries(request: Request, category:str = "popular", page:int = 1, discover_params: dict | None = None, lang: str = "en"):
    # TMDB Discover sorts and filters the whole catalog, so consecutive pages stay consistent
    tmdb_lang = "fr-FR" if lang == "fr" else "en-US"
    if discover_params:
        cache_key = discover_cache_key("tv", discover_params, page, lang)
        request_url = f"{settings.api_base_url.rstrip('/')}/discover/tv"
    else:
        cache_key = f"{category}_series_{page}_{lang}"
        request_url = f"{settings.api_base_url.rstrip('/')}/tv/{category}"
    rd: redis.Redis | None = getattr(request.app.state, "redis", None)
    try:
        if rd is not None:
            cached_series = rd.get(cache_key)
            if cached_series is not None:
                return json.loads(cached_series)
    except Exception as e:
        pass

    try:
        res = requests.get(request_url, params={"language": tmdb_lang, "page": page, **(discover_params or {})}, headers=headers, timeout=10)
        data = res.json()
        if data and rd is not None and res.status_code == 200:
            rd.setex(cache_key, 60 * 60 * 6, json.dumps(data))
            return data
        return data
    except Exception as e:
        print("error while fetching series: ", e)
        return {"page": 1, "results": [], "total_pages": 1, "total_results": 0}


def getSerieDetails(request: Request, serie_id: int, db: Session, user: UserResponse, lang: str = "en"):
    rd: redis.Redis | None = getattr(request.app.state, "redis", None)
    tmdb_lang = "fr-FR" if lang == "fr" else "en-US"
    cache_key = f"serie_{serie_id}_{lang}"
    request_url = f"{settings.api_base_url.rstrip('/')}/tv/{serie_id}?language={tmdb_lang}&append_to_response=external_ids"
    data = None
    try:
        if rd is not None:
            cached_data = rd.get(cache_key)
            if isinstance(cached_data, (str, bytes, bytearray)):
                data = json.loads(cached_data)
    except Exception as e:
        print(f"Error while reading cached serie details: {e}")

    if data is None:
        try:
            res = requests.get(request_url, headers=headers, timeout=10)
            data = res.json()
            imdb_id = data.get('external_ids', {}).get('imdb_id')
            data["imdb_id"] = imdb_id
            if isinstance(data, dict) and data and rd is not None and res.status_code == 200:
                data_to_cache = {**data}
                data_to_cache.pop("is_favorite", None)
                try:
                    rd.setex(cache_key, 60 * 60 * 24, json.dumps(data_to_cache))
                except Exception as e:
                    print(f"Error while caching serie details: {e}")
        except Exception as e:
            print(f"Error while fetching serie details: {e}")
            return {"error": str(e)}

    if isinstance(data, dict):
        data["is_favorite"] = (
            db.query(User)
            .join(User.favorites)
            .filter(
                User.id == user.id,
                Favorites.favorite_type == favoriteTypeEnum.SERIES,
                Favorites.favorite_id == serie_id,
            )
            .first()
            is not None
        )
    return data



def getSerieCredits(request: Request, serie_id: int, lang: str = "en"):
    rd: redis.Redis | None = getattr(request.app.state, "redis", None)
    tmdb_lang = "fr-FR" if lang == "fr" else "en-US"
    request_url = f"{settings.api_base_url.rstrip('/')}/tv/{serie_id}/credits?language={tmdb_lang}"
    rd_name = f"serie_credits_{serie_id}_{lang}"
    try:
        if rd is not None:
            cached = rd.get(rd_name)
            if cached:
                return json.loads(cached)
    except Exception as e:
        print(f"Error while reading cached serie credits: {e}")

    try:
        res = requests.get(request_url, headers=headers, timeout=10)
        data = res.json()
        if isinstance(data, dict) and data and rd is not None and res.status_code == 200:
            try:
                rd.setex(rd_name, 60 * 60 * 24, json.dumps(data))
            except Exception as e:
                print(f"Error while caching serie credits: {e}")
        return data
    except Exception as e:
        print(f"Error while fetching serie credits: {e}")
        return {"cast": [], "crew": [], "error": str(e)}



def getSerieVideos(request: Request, serie_id: int, lang: str = "en"):
    rd: redis.Redis | None = getattr(request.app.state, "redis", None)
    tmdb_lang = "fr-FR" if lang == "fr" else "en-US"
    request_url = f"{settings.api_base_url.rstrip('/')}/tv/{serie_id}/videos?language={tmdb_lang}"
    rd_name = f"serie_videos_{serie_id}_{lang}"
    try:
        if rd is not None:
            cached = rd.get(rd_name)
            if cached:
                return json.loads(cached)
    except Exception as e:
        print(f"Error while reading cached serie videos: {e}")

    try:
        res = requests.get(request_url, headers=headers, timeout=10)
        data = res.json()
        if isinstance(data, dict) and data and rd is not None and res.status_code == 200:
            try:
                rd.setex(rd_name, 60 * 60 * 6, json.dumps(data))
            except Exception as e:
                print(f"Error while caching serie videos: {e}")
        return data
    except Exception as e:
        print(f"Error while fetching serie videos: {e}")
        return {"results": [], "error": str(e)}





def getSerieSeason(request: Request, serie_id: int, season_number: int, lang: str = "en"):
    rd: redis.Redis | None = getattr(request.app.state, "redis", None)
    tmdb_lang = "fr-FR" if lang == "fr" else "en-US"
    request_url = f"{settings.api_base_url.rstrip('/')}/tv/{serie_id}/season/{season_number}?language={tmdb_lang}"
    rd_name = f"serie_season_{serie_id}_{season_number}_{lang}"
    try:
        if rd is not None:
            cached = rd.get(rd_name)
            if cached:
                return json.loads(cached)
    except Exception as e:
        print(f"Error while reading cached serie season: {e}")

    try:
        res = requests.get(request_url, headers=headers, timeout=10)
        data = res.json()
        if isinstance(data, dict) and data and rd is not None and res.status_code == 200:
            try:
                rd.setex(rd_name, 60 * 60 * 6, json.dumps(data))
            except Exception as e:
                print(f"Error while caching serie season: {e}")
        return data
    except Exception as e:
        print(f"Error while fetching serie season: {e}")
        return {"episodes": [], "error": str(e)}