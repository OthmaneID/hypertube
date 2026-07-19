import requests
from fastapi.requests import Request
import redis
import os
import json

from dotenv import load_dotenv
load_dotenv(".env")

# for images : (https://image.tmdb.org/t/p/original/{path}.png || .svg or https://image.tmdb.org/t/p/w500/{path})
BASE_URL = url = "https://api.themoviedb.org/3/"

TMDB_KEY = os.getenv("TMDB_ACCESS_KEY")

headers = {
    "accept": "application/json",
    "Authorization": f"Bearer {TMDB_KEY}"
}




def getGenres(request: Request, category: str = None) -> list:
    try:
        rd : redis.Redis = request.state.redis

        if rd is not None and rd.get("genres"):
            return json.loads(rd.get("genres"))
        
        res = requests.get(f"{BASE_URL}genre/movie/list?language=en", headers=headers)
        rd.setex("genres", 60 * 60 * 24, json.dumps(res.json()))
        return res.json()
    except Exception as e:
        print(f"Error while fetchin movie Genres : {e}")
        return {"genres":[]}


def getMovies(request : Request, category: str = "popular", page: int = 1):
    # get populare movies in pagination
    try:
        rd :redis.Redis= request.state.redis
        if rd is not None  and rd.get(f"popular_movies_{page}"):
            return json.loads(rd.get(f"popular_movies_{page}"))
        
        res = requests.get(f"{BASE_URL}movie/{category}?language=en&page={page}", headers=headers)
        rd.setex(f"popular_movies_{page}", 60 * 60 * 6, json.dumps(res.json()))
        return res.json()
    except Exception as e:
        print(f"Error while fetching Popular Movies : {e}")
        return {
            "page": 1,
            "results": []
        }
