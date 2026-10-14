from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime
from models.History import ModeEnum
from typing import Literal, Optional

class HistoryUpdate(BaseModel): # update through sending some video.currentTime from client side, movie_id, season, episode, mode
    imdb_id:str
    tmdb_id: int
    season: Optional[int]
    episode : Optional[int]
    watched_duration : int
    is_finished : bool = False
    # Optional: only needed for the "continue watching" list
    title: Optional[str] = Field(None, max_length=500)
    poster_path: Optional[str] = Field(None, max_length=500)
    episode_title: Optional[str] = Field(None, max_length=500)
    duration: Optional[float] = Field(None, gt=0)
    watch_path: Optional[str] = Field(None, pattern=r"^/watch/", max_length=2048)
     



class HistoryResponse(BaseModel):
    id : int
    mode : ModeEnum
    imdb_id : str
    tmdb_id : int
    season : Optional[int] =  None
    episode : Optional[int] = None
    is_finished: bool
    watched_duration: int
    last_viewed_at : Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ContinueWatchingItem(BaseModel):
    media_type: Literal["movie", "tv"]
    tmdb_id: int
    title: Optional[str]
    poster_path: Optional[str]
    season: Optional[int]
    episode: Optional[int]
    episode_title: Optional[str]
    position: float
    duration: Optional[float]
    # 0 to 1
    progress: float
    completed: bool
    watch_path: str
    updated_at: datetime
