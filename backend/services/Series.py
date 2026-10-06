import requests
from fastapi.requests import Request
import redis
import json

from config import settings
from schema.User import UserResponse
from sqlalchemy.orm import Session
from models.User import User
from models.Favorites import favoriteTypeEnum, Favorites


#

headers = {
    "accept": "application/json",
    "Authorization": f"Bearer {settings.tmdb_key}"
}

def getGenres(request: Request, lang: str = "en"):
    rd : redis.Redis = request.app.state.redis
    cache_key = f"series_genres_{lang}"
    try:
        if rd is not None and rd.get(cache_key):
            return json.loads(rd.get(cache_key))
    except Exception:
        pass
        
    tmdb_lang = "fr-FR" if lang == "fr" else "en-US"
    res = requests.get(f"{settings.api_base_url}genre/tv/list?language={tmdb_lang}", headers=headers)
    try:
        data = res.json()
        if data and rd is not None:
            rd.setex(cache_key, 60 * 60 * 24, json.dumps(data))
        return data
    except Exception:
        pass
    if res:
        return res.json()


def GetSeries(request: Request, category:str = "popular", page:int = 1, sort_by: str | None = None, lang: str = "en"):
    tmdb_lang = "fr-FR" if lang == "fr" else "en-US"
    cache_key = f"discover_series_{sort_by}_{page}_{lang}" if sort_by else f"{category}_series_{page}_{lang}"
    request_url = f"{settings.api_base_url}/discover/tv" if sort_by else f"{settings.api_base_url}/tv/{category}"
    rd:redis.Redis = request.app.state.redis
    try:
        if rd is not None:
            cached_series = rd.get(cache_key)
            if cached_series is not None:
                return json.loads(cached_series)
    except Exception as e:
        pass

    if sort_by:
        res = requests.get(request_url, params={"language": tmdb_lang, "page": page, "sort_by": sort_by}, headers=headers)
    else:
        res = requests.get(request_url, params={"language": tmdb_lang, "page": page}, headers=headers)
    data = res.json()
    try:
        if data:
            rd.setex(cache_key, 60 * 60 * 6, json.dumps(data))
            return data
    except Exception as e:
        print("error while fetching movies: ", e)
        return res.json()
    return {"page": 1, "results": [], "total_pages": 1, "total_results": 0}


def getSerieDetails(request: Request, serie_id: int, db: Session, user: UserResponse, lang: str = "en"):
    rd: redis.Redis | None = getattr(request.app.state, "redis", None)
    tmdb_lang = "fr-FR" if lang == "fr" else "en-US"
    cache_key = f"serie_{serie_id}_{lang}"
    request_url = f"{settings.api_base_url}/tv/{serie_id}?language={tmdb_lang}"
    data = None
    try:
        if rd is not None:
            cached_data = rd.get(cache_key)
            if isinstance(cached_data, (str, bytes, bytearray)):
                data = json.loads(cached_data)
    except Exception as e:
        print(f"Error while reading cached serie details: {e}")

    if data is None:
        res = requests.get(request_url, headers=headers)
        data = res.json()
        if isinstance(data, dict) and data and rd is not None:
            data.pop("is_favorite", None)
            try:
                rd.setex(cache_key, 60 * 60 * 24, json.dumps(data))
            except Exception as e:
                print(f"Error while caching serie details: {e}")

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
    rd : redis.Redis = request.app.state.redis
    tmdb_lang = "fr-FR" if lang == "fr" else "en-US"
    request_url = f"{settings.api_base_url}/tv/{serie_id}/credits?language={tmdb_lang}"
    rd_name = f"serie_credits_{serie_id}_{lang}"
    try:
        if rd is not None and rd.get(rd_name):
            return json.loads(rd.get(rd_name))
    except Exception as e:
        pass
    res = requests.get(request_url, headers=headers)
    data = res.json()
    try:
        if data:
            rd.setex(rd_name, 60 * 60 * 24, json.dumps(data))
        return data
    except Exception as e:
        print("error while fetching serie credits : ", e)
        return data



def getSerieVideos(request:Request, serie_id:int, lang: str = "en"):
    rd : redis.Redis = request.app.state.redis
    tmdb_lang = "fr-FR" if lang == "fr" else "en-US"
    request_url = f"{settings.api_base_url}/tv/{serie_id}/videos?language={tmdb_lang}"
    rd_name = f"serie_videos_{serie_id}_{lang}"
    try:
        if rd is not None and rd.get(rd_name):
            return json.loads(rd.get(rd_name))
    except Exception as e:
        pass  
    res = requests.get(request_url, headers=headers)
    data = res.json()
    try:
        if data:
            rd.setex(rd_name, 60 * 60 * 6, json.dumps(data))
        return data
    except Exception as e:
        print("error while fetching serie videos : ", e)
        return data





def getSerieSeason(request: Request, serie_id: int, season_number: int, lang: str = "en"):
    rd : redis.Redis = request.app.state.redis
    tmdb_lang = "fr-FR" if lang == "fr" else "en-US"
    request_url = f"{settings.api_base_url}/tv/{serie_id}/season/{season_number}?language={tmdb_lang}"
    rd_name = f"serie_season_{serie_id}_{season_number}_{lang}"
    try:
        if rd is not None and rd.get(rd_name):
            return json.loads(rd.get(rd_name))
    except Exception as e:
        pass  
    res = requests.get(request_url, headers=headers)
    data = res.json()
    try:
        if data:
            rd.setex(rd_name, 60 * 60 * 6, json.dumps(data))
        return data
    except Exception as e:
        print("error while fetching serie season : ", e)
        return data