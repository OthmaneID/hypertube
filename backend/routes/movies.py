from fastapi.routing import APIRouter
from services.Movies import getMovies, getGenres
from fastapi import Request

router = APIRouter(prefix="/movies")

@router.get("/popular")
def get_movies(request:Request, page: int = 1):
    return getMovies(request=request, page=page)


@router.get("/genres")
def get_genres(request:Request):
    return getGenres(request=request)
