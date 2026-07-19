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
    try:
        rd : redis.Redis = request.state.redis
        if rd is not None and  rd.get("image_config"):
            return json.loads(rd.get("image_config"))
        
        res = requests.get(f"{BASE_URL}configuration")
        
        rd.setex("image_config", 60 * 60 * 24, json.dumps(res.json())) # the cache expires in 24h
        return res.json()
    except Exception as e:
        print(f"error while fetching Image Config : {e}")
        return {}