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


def GetSeries(request: Request, category:str = "popular", page:int = 1, sort_by: str | None = None):
    cache_key = f"discover_series_{sort_by}_{page}" if sort_by else f"{category}_series_{page}"
    request_url = f"{settings.api_base_url}/discover/tv" if sort_by else f"{settings.api_base_url}/tv/{category}?language=en-US&page={page}"
    rd:redis.Redis = request.app.state.redis
    try:
        if rd is not None:
            cached_series = rd.get(cache_key)
            if cached_series is not None:
                return json.loads(cached_series)
    except Exception as e:
        pass

    if sort_by:
        res = requests.get(request_url, params={"language": "en-US", "page": page, "sort_by": sort_by}, headers=headers)
    else:
        res = requests.get(request_url, headers=headers)
    data = res.json()
    try:
        if data:
            rd.setex(cache_key, 60 * 60 * 6, json.dumps(data))
            return data
    except Exception as e:
        print("error while fetching movies: ", e)
        return res.json()
    return {"page": 1, "results": [], "total_pages": 1, "total_results": 0}


def getSerieDetails(request: Request, serie_id: int, db: Session, user: UserResponse):
    rd: redis.Redis | None = getattr(request.app.state, "redis", None)
    cache_key = f"serie_{serie_id}"
    request_url = f"{settings.api_base_url}/tv/{serie_id}"
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



def getSerieCredits(request: Request, serie_id: int):
    rd : redis.Redis = request.app.state.redis
    request_url = f"{settings.api_base_url}/tv/{serie_id}/credits?language=en-US"
    rd_name = f"serie_credits_{serie_id}"
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



def getSerieVideos(request:Request, serie_id:int):
    rd : redis.Redis = request.app.state.redis
    request_url = f"{settings.api_base_url}/tv/{serie_id}/videos?language=en-US"
    rd_name = f"serie_videos_{serie_id}"
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





def getSerieSeason(request: Request, serie_id: int, season_number: int):
    rd : redis.Redis = request.app.state.redis
    request_url = f"{settings.api_base_url}/tv/{serie_id}/season/{season_number}?language=en-US"
    rd_name = f"serie_season_{serie_id}_{season_number}"
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