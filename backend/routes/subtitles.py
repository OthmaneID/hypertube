from fastapi.routing import APIRouter
from fastapi import Depends
from fastapi.requests import Request
from services.Subtitles import get_subtitles
from schema.User import UserResponse
from services.auth import get_current_user

router = APIRouter(prefix="/subtitles")

@router.get("")
async def get_subtitles_route(
    request: Request,
    imdb_id: str,
    season: int | None = None,
    episode: int | None = None,
    filename: str | None = None,
    user: UserResponse = Depends(get_current_user),
):
    """
    Fetches, converts to VTT, caches, and returns the English, French and Arabic subtitles
    for a movie or, when season/episode are given, a series episode.
    """
    user_lang = user.preferred_language.value if user and user.preferred_language else "en"
    rd = getattr(request.app.state, "redis", None)
    return await get_subtitles(
        rd,
        imdb_id=imdb_id,
        season=season,
        episode=episode,
        filename=filename,
        preferred_lang=user_lang,
    )
