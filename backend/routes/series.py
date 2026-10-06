from fastapi.routing import APIRouter
from fastapi import Depends
from fastapi.requests import Request
from sqlalchemy.orm import Session
from database import get_db
from schema.User import UserResponse
from services.auth import get_current_user
from services.Series import GetSeries, getSerieDetails, getSerieCredits, getSerieVideos, getSerieSeason, getGenres


router = APIRouter(prefix="/series")

@router.get("/popular")
def get_popular_series(request: Request, page:int, sort_by: str | None = None, user: UserResponse = Depends(get_current_user)):
    user_lang = user.preferred_language.value if user and user.preferred_language else "en"
    return GetSeries(request, "popular", page, sort_by=sort_by, lang=user_lang)


@router.get("/genres")
def get_series_genres(request: Request, user: UserResponse = Depends(get_current_user)):
    user_lang = user.preferred_language.value if user and user.preferred_language else "en"
    return getGenres(request, lang=user_lang)


@router.get("/details/{serie_id}")
def get_serie(
    request: Request,
    serie_id: int,
    user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_lang = user.preferred_language.value if user and user.preferred_language else "en"
    return getSerieDetails(request=request, serie_id=serie_id, db=db, user=user, lang=user_lang)


@router.get("/credits/{serie_id}")
def get_serie_credits(request:Request, serie_id:int, user: UserResponse = Depends(get_current_user)):
    user_lang = user.preferred_language.value if user and user.preferred_language else "en"
    return getSerieCredits(request, serie_id, lang=user_lang)

@router.get("/videos/{serie_id}")
def get_serie_videos(request:Request, serie_id:int, user: UserResponse = Depends(get_current_user)):
    user_lang = user.preferred_language.value if user and user.preferred_language else "en"
    return getSerieVideos(request, serie_id, lang=user_lang)


@router.get("/{serie_id}/season/{season_number}")
def get_serie_season(request:Request, serie_id:int, season_number:int, user: UserResponse = Depends(get_current_user)):
    user_lang = user.preferred_language.value if user and user.preferred_language else "en"
    return getSerieSeason(request, serie_id, season_number, lang=user_lang)