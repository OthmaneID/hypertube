import requests
from fastapi.requests import Request
import redis
import json
from config import settings


headers = {
    "accept": "application/json",
    "Authorization": f"Bearer {settings.tmdb_key}"
}

def GetImageConfig(request: Request):
    rd : redis.Redis = request.app.state.redis
    if rd is not None and  rd.get("image_config"):
        return json.loads(rd.get("image_config"))
    res = requests.get(f"{settings.api_base_url}configuration")
    
    try:
        if res.json():
            rd.setex("image_config", 60 * 60 * 24, json.dumps(res.json())) # the cache expires in 24h
        return res.json()
    except Exception as e:
        print(f"error while fetching Image Config : {e}")
        return res.json()
    

def GetMovieImages(request: Request, movie_id: int):
    rd : redis.Redis = request.app.state.redis
    if rd is not None and rd.get(f"movie_{movie_id}_images"):
        return json.loads(rd.get(f"movie_{movie_id}_images"))
    res = requests.get(f"{settings.api_base_url}movie/{movie_id}/images?language=en", headers=headers)
    try:
        if res.json():
            rd.setex(f"movie_{movie_id}_images", 60 * 60 * 24, json.dumps(res.json()))
        return res.json()
    except Exception as e:
        print(f"error while fetching Movie Images : {e}")
        return res.json()
# /tv/{series_id}

def GetSerieImages(request: Request, serie_id: int):
    rd : redis.Redis = request.app.state.redis
    if rd is not None and rd.get(f"serie_{serie_id}_images"):
        return json.loads(rd.get(f"serie_{serie_id}_images"))
    res = requests.get(f"{settings.api_base_url}tv/{serie_id}/images?language=en", headers=headers)
    try:
        if res.json():
            rd.setex(f"serie_{serie_id}_images", 60 * 60 * 24, json.dumps(res.json()))
        return res.json()
    except Exception as e:
        print(f"error while fetching Movie Images : {e}")
        return res.json()