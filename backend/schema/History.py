from pydantic import BaseModel, ConfigDict
from datetime import datetime
from models.History import ModeEnum
from typing import Optional

class HistoryUpdate(BaseModel): # update through sending some video.currentTime from client side, movie_id, season, episode, mode
    imdb_id:str
    tmdb_id: int
    season: Optional[int]
    episode : Optional[int]
    watched_duration : int
    is_finished : bool = False
     



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
