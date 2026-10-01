from fastapi.routing import APIRouter
from fastapi.requests import Request
from services.search import searchMovies, searchSeries

router = APIRouter(prefix="/search")


@router.get("/movies")
def search_movies(request: Request, q: str, page: int = 1):
    """
    Search movies across TMDB + archive.org.
    Results sorted alphabetically by title.
    Cached for 15 minutes.
    """
    return searchMovies(request, query=q, page=page)


@router.get("/series")
def search_series(request: Request, q: str, page: int = 1):
    """
    Search TV series on TMDB.
    Results sorted alphabetically by title.
    Cached for 15 minutes.
    """
    return searchSeries(request, query=q, page=page)
