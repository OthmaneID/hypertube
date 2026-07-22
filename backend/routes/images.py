from fastapi import APIRouter
from fastapi.requests import Request
from services.Images import GetImageConfig, GetMovieImages

router = APIRouter(prefix="/images")


@router.get("/config")
def get_image_config(request:Request):
    return GetImageConfig(request=request)


@router.get("/movie/{movie_id}")
def get_movie_images(request:Request, movie_id: int):
    return GetMovieImages(request=request, movie_id=movie_id)
