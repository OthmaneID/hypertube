from fastapi.routing import APIRouter
from services.Movies import getMovies, getGenres, getMovieDetails, getMovieCredits, getMovieVideos  
from fastapi.requests import Request
from database import get_db
from sqlalchemy.orm import Session
from schema.User import UserResponse
from fastapi import Depends
from services.auth import get_current_user

router = APIRouter(prefix="/movies")

@router.get("/popular")
def get_popular_movies(request:Request, page: int = 1, sort_by: str | None = None, user : UserResponse = Depends(get_current_user)):
    user_lang = user.preferred_language.value if user and user.preferred_language else "en"
    return getMovies(request=request, page=page, sort_by=sort_by, lang=user_lang)


@router.get("/genres")
def get_genres(request:Request, lang: str = "en"):
    return getGenres(request, lang=lang)


@router.get("/details/{movie_id}")
def get_movie(request:Request, movie_id: int, user : UserResponse = Depends(get_current_user), db: Session = Depends(get_db)):
    user_lang = user.preferred_language.value if user and user.preferred_language else "en"
    return getMovieDetails(request=request, movie_id=movie_id, db=db, user=user, lang=user_lang)


@router.get("/credits/{movie_id}")
def get_movie_credits(request:Request, movie_id:int, user : UserResponse = Depends(get_current_user)):
    user_lang = user.preferred_language.value if user and user.preferred_language else "en"
    return getMovieCredits(request, movie_id, lang=user_lang)

# get movie trailers and related videos that are provided by the tmdb api
@router.get("/videos/{movie_id}")
def get_movie_videos(request:Request, movie_id:int, user : UserResponse = Depends(get_current_user)):
    user_lang = user.preferred_language.value if user and user.preferred_language else "en"
    return getMovieVideos(request, movie_id, lang=user_lang)