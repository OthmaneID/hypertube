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
    rd: redis.Redis | None = getattr(request.app.state, "redis", None)
    if rd is not None:
        try:
            cached = rd.get("image_config")
            if cached:
                return json.loads(cached)
        except Exception:
            pass

    try:
        res = requests.get(f"{settings.api_base_url.rstrip('/')}/configuration", headers=headers, timeout=10)
        data = res.json()
        if data and rd is not None and res.status_code == 200:
            rd.setex("image_config", 60 * 60 * 24, json.dumps(data))
        return data
    except Exception as e:
        print(f"error while fetching Image Config : {e}")
        return {"images": {}, "change_keys": []}
    

def GetMovieImages(request: Request, movie_id: int):
    rd: redis.Redis | None = getattr(request.app.state, "redis", None)
    rd_name = f"movie_{movie_id}_images"
    try:
        if rd is not None:
            cached = rd.get(rd_name)
            if cached:
                return json.loads(cached)
    except Exception as e:
        print(f"Error while reading cached movie images: {e}")

    try:
        res = requests.get(f"{settings.api_base_url.rstrip('/')}/movie/{movie_id}/images?language=en", headers=headers, timeout=10)
        data = res.json()
        if isinstance(data, dict) and data and rd is not None and res.status_code == 200:
            try:
                rd.setex(rd_name, 60 * 60 * 24, json.dumps(data))
            except Exception as e:
                print(f"Error while caching movie images: {e}")
        return data
    except Exception as e:
        print(f"Error while fetching movie images: {e}")
        return {"backdrops": [], "logos": [], "posters": [], "error": str(e)}

# /tv/{series_id}

def GetSerieImages(request: Request, serie_id: int):
    rd: redis.Redis | None = getattr(request.app.state, "redis", None)
    rd_name = f"serie_{serie_id}_images"
    try:
        if rd is not None:
            cached = rd.get(rd_name)
            if cached:
                return json.loads(cached)
    except Exception as e:
        print(f"Error while reading cached serie images: {e}")

    try:
        res = requests.get(f"{settings.api_base_url.rstrip('/')}/tv/{serie_id}/images?language=en", headers=headers, timeout=10)
        data = res.json()
        if isinstance(data, dict) and data and rd is not None and res.status_code == 200:
            try:
                rd.setex(rd_name, 60 * 60 * 24, json.dumps(data))
            except Exception as e:
                print(f"Error while caching serie images: {e}")
        return data
    except Exception as e:
        print(f"Error while fetching serie images: {e}")
        return {"backdrops": [], "logos": [], "posters": [], "error": str(e)}