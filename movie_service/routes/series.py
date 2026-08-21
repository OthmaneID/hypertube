from fastapi.routing import APIRouter
from fastapi.requests import Request
from services.Series import GetSeries, getSerieDetails, getSerieCredits, getSerieVideos


router = APIRouter(prefix="/series")

@router.get("/popular")
def get_popular_series(request: Request, page:int):
    return GetSeries(request, "popular", page)


@router.get("/details/{serie_id}")
def get_serie(request:Request, serie_id: int):
    return getSerieDetails(request=request, serie_id=serie_id)


@router.get("/credits/{serie_id}")
def get_serie_credits(request:Request, serie_id:int):
    return getSerieCredits(request, serie_id)

@router.get("/videos/{serie_id}")
def get_serie_videos(request:Request, serie_id:int):
    return getSerieVideos(request, serie_id)