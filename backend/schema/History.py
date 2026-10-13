from pydantic import BaseModel, Field
from datetime import datetime
from typing import Literal


MediaType = Literal["movie", "tv"]


# Sent by the player while the user watches
class ProgressUpdate(BaseModel):
    media_type: MediaType
    tmdb_id: int
    title: str = Field(max_length=500)
    poster_path: str | None = Field(None, max_length=500)
    season: int | None = Field(None, ge=0)
    episode: int | None = Field(None, ge=0)
    episode_title: str | None = Field(None, max_length=500)
    position: float = Field(ge=0)
    duration: float | None = Field(None, gt=0)
    watch_path: str = Field(pattern=r"^/watch/", max_length=2048)


class ContinueWatchingItem(BaseModel):
    media_type: MediaType
    tmdb_id: int
    title: str | None
    poster_path: str | None
    season: int | None
    episode: int | None
    episode_title: str | None
    position: float
    duration: float | None
    progress: float
    completed: bool
    watch_path: str
    updated_at: datetime
