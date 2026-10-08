from fastapi.routing import APIRouter
from fastapi.requests import Request
from schema.User import UserResponse
from fastapi import Depends
from services.auth import get_current_user
from services.Torrents import getSources, getEpisodeStreams, stream_from_source
from database import get_db
from sqlalchemy.orm import Session


router = APIRouter(prefix="/torrent")

@router.get("/stream/movie/{imdb_id}.json")
async def get_movie_streams(request:Request, imdb_id : str, user : UserResponse = Depends(get_current_user)):
    return await getSources(request, movie_id=imdb_id)


@router.get("/stream/series/{imdb_id}:{season}:{episode}.json")
async def get_series_streams(request:Request, imdb_id : str, season: int, episode: int, user : UserResponse = Depends(get_current_user)):
    return await getEpisodeStreams(request, imdb_id=imdb_id, season=season, episode=episode)


@router.get("/stream/{hash}")
async def stream_torrent_video(request : Request, hash: str, user : UserResponse = Depends(get_current_user), db: Session = Depends(get_db)):
    return await stream_from_source(request, hash)