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




def getGenres(request: Request) :
    rd : redis.Redis = request.app.state.redis
    try:
        if rd is not None and rd.get("genres"):
            return json.loads(rd.get("genres"))
    except Exception as e:
        pass
        
    res = requests.get(f"{BASE_URL}genre/movie/list?language=en", headers=headers)
    try:
        if res.json():
            rd.setex("genres", 60 * 60 * 24, json.dumps(res.json()))
        return res.json()
    except Exception as e:
        pass
    if res:
        return res.json()


def getMovies(request : Request, category: str = "popular", page: int = 1):
    # get populare movies in pagination
    rd :redis.Redis= request.app.state.redis
    try:
        if rd is not None  and rd.get(f"popular_movies_{page}"):
            return json.loads(rd.get(f"popular_movies_{page}"))
    except Exception as e :
        pass
    res = requests.get(f"{BASE_URL}movie/{category}?language=en&page={page}", headers=headers)
    try:
        if res.json():
            rd.setex(f"popular_movies_{page}", 60 * 60 * 6, json.dumps(res.json()))
            return res.json()
    except Exception as e:
        print(f"Error while fetching Movies : {e}")
        return res.json()
    return {"page": 1, "results": [], "total_pages": 0, "total_results": 0}


def getMovieDetails(request: Request, movie_id: int):
    try:
        rd : redis.Redis = request.app.state.redis
        if rd is not None and rd.get(f"movie_{movie_id}"):
            return json.loads(rd.get(f"movie_{movie_id}"))
    except Exception as e:
        pass
    res = requests.get(f"{BASE_URL}movie/{movie_id}", headers=headers)
    try:
        if res.json():
            rd.setex(f"movie_{movie_id}", 60 * 60 * 24, json.dumps(res.json()))
        return res.json()
    except Exception as e:
        print(f"Error while fetching Movie Details : {e}")
        return res.json()
