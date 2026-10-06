from fastapi.routing import APIRouter
from services.Movies import getMovies, getGenres, getMovieDetails, getMovieCredits, getMovieVideos
from fastapi.requests import Request
from database import get_db
from sqlalchemy.orm import Session
from schema.User import UserResponse
from fastapi import Depends
from services.auth import get_current_user
from schema.Torrents import SourcesRequest, ModesEnum

router = APIRouter(prefix="/movies")

@router.get("/popular")
def get_popular_movies(request:Request, page: int = 1, sort_by: str | None = None, user : UserResponse = Depends(get_current_user)):
    return getMovies(request=request, page=page, sort_by=sort_by)


@router.get("/genres")
def get_genres(request:Request):
    return getGenres(request)


@router.get("/details/{movie_id}")
def get_movie(request:Request, movie_id: int, user : UserResponse = Depends(get_current_user), db: Session = Depends(get_db)):
    return getMovieDetails(request=request, movie_id=movie_id, db=db, user=user)


@router.get("/credits/{movie_id}")
def get_movie_credits(request:Request, movie_id:int, user : UserResponse = Depends(get_current_user)):
    return getMovieCredits(request, str(movie_id))

# get movie trailers and related videos that are provided by the tmdb api
@router.get("/videos/{movie_id}")
def get_movie_videos(request:Request, movie_id:int, user : UserResponse = Depends(get_current_user)):
    return getMovieVideos(request, str(movie_id))
