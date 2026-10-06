from fastapi.routing import APIRouter
from fastapi.requests import Request
from schema.Torrents import ModesEnum
from schema.User import UserResponse
from fastapi import Depends
from services.auth import get_current_user
from services.Torrents import getSources


router = APIRouter(prefix="/torrent")

@router.get("/sources")
async def get_movie_sources(request:Request, movie_id : str, name:str, mode: ModesEnum, year: str, user : UserResponse = Depends(get_current_user)):
    return await getSources(request, movie_id=movie_id, name=name, mode=mode, year=year)


