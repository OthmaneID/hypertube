from fastapi.routing import APIRouter
from fastapi import Depends, HTTPException
from fastapi.requests import Request
from services.Subtitles import get_movie_subtitles
from schema.User import UserResponse
from services.auth import get_current_user

router = APIRouter(prefix="/subtitles")

@router.get("/{movie_id}")
def get_subtitles(request: Request, movie_id: int, user: UserResponse = Depends(get_current_user)):
    """
    Fetches, converts to VTT, caches, and returns subtitles for a given movie.
    """
    subtitles = get_movie_subtitles(tmdb_id=movie_id)
    return subtitles
