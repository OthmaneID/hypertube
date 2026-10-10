from fastapi.routing import APIRouter
from services.Movies import getMovies, getGenres, getMovieDetails, getMovieCredits, getMovieVideos
from fastapi.requests import Request
from database import get_db
from sqlalchemy.orm import Session
from schema.User import UserResponse
from fastapi import Depends, Query
from services.auth import get_current_user
from utils.discover import BrowseSort, build_discover_params

router = APIRouter(prefix="/movies")

@router.get("/popular")
def get_popular_movies(
    request: Request,
    page: int = 1,
    sort_by: BrowseSort | None = None,
    genre: int | None = None,
    min_rating: float | None = Query(None, ge=0, le=10),
    year_from: int | None = None,
    year_to: int | None = None,
    user: UserResponse = Depends(get_current_user),
):
    user_lang = user.preferred_language.value if user and user.preferred_language else "en"
    discover_params = build_discover_params("movie", sort_by, genre, min_rating, year_from, year_to)
    return getMovies(request=request, page=page, discover_params=discover_params, lang=user_lang)


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
    return getMovieCredits(request, str(movie_id), lang=user_lang)

# get movie trailers and related videos that are provided by the tmdb api
@router.get("/videos/{movie_id}")
def get_movie_videos(request:Request, movie_id:int, user : UserResponse = Depends(get_current_user)):
    user_lang = user.preferred_language.value if user and user.preferred_language else "en"
    return getMovieVideos(request, str(movie_id), lang=user_lang)