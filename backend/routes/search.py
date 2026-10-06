from fastapi.routing import APIRouter
from fastapi.requests import Request
from services.search import searchMovies, searchSeries
from fastapi import Depends
from schema.User import UserResponse
from services.auth import get_current_user

router = APIRouter(prefix="/search")


@router.get("/movies")
def search_movies(request: Request, q: str, page: int = 1, user: UserResponse = Depends(get_current_user)):
    """
    Search movies across TMDB + archive.org.
    Results sorted alphabetically by title.
    Cached for 15 minutes.
    """
    user_lang = user.preferred_language.value if user and user.preferred_language else "en"
    return searchMovies(request, query=q, page=page, lang=user_lang)


@router.get("/series")
def search_series(request: Request, q: str, page: int = 1, user: UserResponse = Depends(get_current_user)):
    """
    Search TV series on TMDB.
    Results sorted alphabetically by title.
    Cached for 15 minutes.
    """
    user_lang = user.preferred_language.value if user and user.preferred_language else "en"
    return searchSeries(request, query=q, page=page, lang=user_lang)
