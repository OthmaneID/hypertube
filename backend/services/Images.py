import requests
import os
from fastapi.requests import Request
from dotenv import load_dotenv
import redis
import json
load_dotenv(".env")


# for images : (https://image.tmdb.org/t/p/original/{path}.png || .svg or https://image.tmdb.org/t/p/w500/{path})
BASE_URL = url = "https://api.themoviedb.org/3/"

TMDB_KEY = os.getenv("TMDB_ACCESS_KEY")

headers = {
    "accept": "application/json",
    "Authorization": f"Bearer {TMDB_KEY}"
}

def GetImageConfig(request: Request):
    rd : redis.Redis = request.app.state.redis
    if rd is not None and  rd.get("image_config"):
        return json.loads(rd.get("image_config"))
    res = requests.get(f"{BASE_URL}configuration")
    
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
    res = requests.get(f"{BASE_URL}movie/{movie_id}/images?language=en", headers=headers)
    try:
        if res.json():
            rd.setex(f"movie_{movie_id}_images", 60 * 60 * 24, json.dumps(res.json()))
        return res.json()
    except Exception as e:
        print(f"error while fetching Movie Images : {e}")
        return res.json()