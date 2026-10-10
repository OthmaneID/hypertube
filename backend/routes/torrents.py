from fastapi.routing import APIRouter
from fastapi.requests import Request
from schema.User import UserResponse
from fastapi import Depends
from services.auth import get_current_user
from services.Torrents import getSources, getEpisodeStreams, stream_from_source, get_stream_info, serve_internal_file
from database import get_db
from sqlalchemy.orm import Session


router = APIRouter(prefix="/torrent")

@router.get("/stream/movie/{imdb_id}")
async def get_movie_streams(request:Request, imdb_id : str, user : UserResponse = Depends(get_current_user)):
    return await getSources(request, movie_id=imdb_id)


@router.get("/stream/series/{imdb_id}:{season}:{episode}")
async def get_series_streams(request:Request, imdb_id : str, season: int, episode: int, user : UserResponse = Depends(get_current_user)):
    return await getEpisodeStreams(request, imdb_id=imdb_id, season=season, episode=episode)


@router.get("/stream/{hash}/info")
async def stream_torrent_info(request : Request, hash: str, user : UserResponse = Depends(get_current_user)):
    """
    
    """
    return await get_stream_info(request, hash)


# Called by the backend's own ffmpeg/ffprobe processes, authorized by a per-process key instead of a session
@router.get("/internal/{hash}/{file_idx}", include_in_schema=False)
async def internal_torrent_file(request : Request, hash: str, file_idx: int, key: str):
    return await serve_internal_file(request, hash, file_idx, key)


@router.get("/stream/{hash}")
async def stream_torrent_video(request : Request, hash: str, user : UserResponse = Depends(get_current_user), db: Session = Depends(get_db)):
    return await stream_from_source(request, hash)