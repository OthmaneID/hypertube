from fastapi.requests import Request
from schema.Torrents import ModesEnum, SourcesResponse
import httpx2
from config import settings
import json
import redis


headers = {
    "accept": "application/json",
    "Authorization": f"Bearer {settings.tmdb_key}"
}



async def getSources(request: Request, movie_id:str, mode:ModesEnum, name:str, year:str) -> SourcesResponse :
    api_url = f"https://en.yts-official.com/{movie_id}?api=torrents&mode={mode}&name={name}&year={year}&quality=all" # yts api to get 
    rd : redis.Redis = request.app.state.redis
    try:
        if rd is not None and rd.get(f"{mode}_{movie_id}_sources"):
            return json.loads(rd.get(f"{mode}_{movie_id}_sources"))
    except Exception:
        pass
    async with httpx2.AsyncClient() as client:
        res = await client.get(api_url, headers=headers)

    data = SourcesResponse.model_validate(res.json())
    try:
        if data and rd is not None:
            rd.setex(f"movie_{movie_id}_sources", 60 * 60 * 8, json.dumps(data.model_dump()))
    except Exception as e:
        print("error while getting movie sources : ", e)
    return data


# async def getArchiveSources()