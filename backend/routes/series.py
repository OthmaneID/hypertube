from fastapi.routing import APIRouter
from fastapi.requests import Request
from services.Series import GetSeries


router = APIRouter("/series")

@router.get("/popular")
def get_popular_series(request: Request, page:int):
    return GetSeries(request, "popular", page)