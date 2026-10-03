import requests
from fastapi.requests import Request
import redis

import json
from config import settings


# for images : (https://image.tmdb.org/t/p/original/{path}.png || .svg or https://image.tmdb.org/t/p/w500/{path})



# TMDB_KEY = os.getenv("TMDB_ACCESS_KEY")

headers = {
    "accept": "application/json",
    "Authorization": f"Bearer {settings.tmdb_key}"
}




def getGenres(request: Request) :
    rd : redis.Redis = request.app.state.redis
    try:
        if rd is not None and rd.get("genres"):
            return json.loads(rd.get("genres"))
    except Exception as e:
        pass
        
    res = requests.get(f"{settings.api_base_url}genre/movie/list?language=en", headers=headers)
    try:
        if res.json():
            rd.setex("genres", 60 * 60 * 24, json.dumps(res.json()))
        return res.json()
    except Exception as e:
        pass
    if res:
        return res.json()


def getMovies(request : Request, category: str = "popular", page: int = 1, sort_by: str | None = None):
    # Use TMDB Discover when a sort order is requested; keep existing popular feeds unchanged.
    rd :redis.Redis= request.app.state.redis
    cache_key = f"discover_movies_{sort_by}_{page}" if sort_by else f"{category}_movies_{page}"
    request_url = f"{settings.api_base_url}discover/movie" if sort_by else f"{settings.api_base_url}movie/{category}?language=en&page={page}"
    try:
        if rd is not None:
            cached_movies = rd.get(cache_key)
            if cached_movies is not None:
                return json.loads(cached_movies)
    except Exception as e :
        pass
    if sort_by:
        res = requests.get(request_url, params={"language": "en-US", "page": page, "sort_by": sort_by}, headers=headers)
    else:
        res = requests.get(request_url, headers=headers)
    try:
        if res.json():
            rd.setex(cache_key, 60 * 60 * 6, json.dumps(res.json()))
            return res.json()
    except Exception as e:
        print(f"Error while fetching Movies : {e}")
        return res.json()
    return {"page": 1, "results": [], "total_pages": 1, "total_results": 0}


def getMovieDetails(request: Request, movie_id: str):
    try:
        rd : redis.Redis = request.app.state.redis
        if rd is not None and rd.get(f"movie_{movie_id}"):
            return json.loads(rd.get(f"movie_{movie_id}"))
    except Exception:
        rd = None

    # Handle archive.org movies
    if str(movie_id).startswith("archive-"):
        identifier = str(movie_id).replace("archive-", "", 1)
        try:
            res = requests.get(f"https://archive.org/metadata/{identifier}", timeout=5)
            meta = res.json().get("metadata", {})
            desc = meta.get("description", "No description available.")
            if isinstance(desc, list):
                desc = desc[0] if desc else "No description available."
            mapped = {
                "id": movie_id,
                "title": meta.get("title", identifier),
                "overview": desc,
                "release_date": meta.get("date", ""),
                "runtime": 0,
                "vote_average": 0,
                "backdrop_path": None,
                "poster_path": None,
                "genres": [{"id": 0, "name": "Public Domain"}],
                "status": "Released",
                "source": "archive",
                "archive_identifier": identifier,
                "archive_url": f"https://archive.org/details/{identifier}",
            }
            try:
                if rd is not None:
                    rd.setex(f"movie_{movie_id}", 60 * 60 * 24, json.dumps(mapped))
            except Exception:
                pass
            return mapped
        except Exception as e:
            print(f"[getMovieDetails] archive.org error: {e}")
            return {"id": movie_id, "title": movie_id, "error": "Could not fetch archive metadata"}

    res = requests.get(f"{settings.api_base_url}movie/{movie_id}", headers=headers)
    try:
        data = res.json()
        if data and rd is not None:
            rd.setex(f"movie_{movie_id}", 60 * 60 * 24, json.dumps(data))
        return data
    except Exception as e:
        print(f"Error while fetching Movie Details : {e}")
        return {}


def getMovieCredits(request: Request, movie_id: str):
    if str(movie_id).startswith("archive-"):
        return {"cast": [], "crew": []}
    try:
        rd : redis.Redis = request.app.state.redis
        if rd is not None and rd.get(f"movie_cast_{movie_id}"):
            return json.loads(rd.get(f"movie_cast_{movie_id}"))
    except Exception:
        rd = None
    res = requests.get(f"{settings.api_base_url}movie/{movie_id}/credits?language=en-US", headers=headers)
    data = res.json()
    try:
        if data and rd is not None:
            rd.setex(f"movie_cast_{movie_id}", 60 * 60 * 24, json.dumps(data))
        return data
    except Exception as e:
        print(f"Error while fetching Movie Credits : {e}")
        return data



def getMovieVideos(request: Request, movie_id: str):
    if str(movie_id).startswith("archive-"):
        return {"results": []}
    request_url = f"{settings.api_base_url}movie/{movie_id}/videos?language=en-US"
    rd : redis.Redis = request.app.state.redis
    try:
        if rd is not None and rd.get(f"movie_{movie_id}_videos"):
            return json.loads(rd.get(f"movie_{movie_id}_videos"))
    except Exception:
        pass
    res = requests.get(request_url, headers=headers)
    data = res.json()
    try:
        if data and rd is not None:
            rd.setex(f"movie_{movie_id}_videos", 60 * 60 * 8, json.dumps(data))
    except Exception as e:
        print("error while getting movie trailers : ", e)
    return data

    
