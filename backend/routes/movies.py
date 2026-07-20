from fastapi.routing import APIRouter
from services.Movies import getMovies, getGenres, getMovieDetails
from fastapi.requests import Request

router = APIRouter(prefix="/movies")

@router.get("/popular")
def get_movies(request:Request, page: int = 1):
    return getMovies(request=request, page=page)


@router.get("/genres")
def get_genres(request:Request):
    return getGenres(request)


@router.get("/details/{movie_id}")
def get_movie(request:Request, movie_id: int):
    return getMovieDetails(request=request, movie_id=movie_id)



