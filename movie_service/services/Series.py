import requests
from fastapi.requests import Request
import redis
import json

from config import settings


#

headers = {
    "accept": "application/json",
    "Authorization": f"Bearer {settings.tmdb_key}"
}


def GetSeries(request: Request, category:str = "popular", page:int = 1):
    request_url = f"{settings.api_base_url}/tv/{category}" + f"?language=en-US&page={page}"
    rd:redis.Redis = request.app.state.redis
    try:
        if rd is not None and rd.get(f"{category}_series_{page}"):
            return json.loads(rd.get(f"{category}_series_{page}"))
    except Exception as e:
        pass
    
    res = requests.get(request_url, headers=headers)
    data = res.json()
    try:
        if data:
            rd.setex(f"{category}_series_{page}", 60 * 60 * 6, json.dumps(data))
            return data
    except Exception as e:
        print("error while fetching movies: ", e)
        return res.json()
    return {"page": 1, "results": [], "total_pages": 1, "total_results": 0}


def getSerieDetails(request: Request, serie_id: int):
    rd : redis.Redis = request.app.state.redis
    request_url = f"{settings.api_base_url}/tv/{serie_id}"
    try:
        if rd is not None and rd.get(f"serie_{serie_id}"):
            return json.loads(rd.get(f"serie_{serie_id}"))
    except Exception as e:
        pass
    res = requests.get(request_url, headers=headers)
    data = res.json()
    try:
        if data:
            rd.setex(f"serie_{serie_id}", 60 * 60 * 24, json.dumps(data))
        return data
    except Exception as e:
        print("error while fetching serie details : ", e)
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