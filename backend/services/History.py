from sqlalchemy.orm import Session
from models.History import History, ModeEnum
from schema.History import HistoryUpdate, HistoryResponse
from fastapi import HTTPException
from schema.User import UserResponse
from fastapi.requests import Request


def UpdateProgress(data: HistoryUpdate,user : UserResponse, db: Session):
    """Create or update the watch progress of a movie, or of one episode when season/episode are set."""
    watcher_id = user.id
    try:
        
        mode = ModeEnum.TV if data.season is not None and data.episode is not None else ModeEnum.MOVIE
        
        entry = (
            db.query(History)
            .filter(
                History.watcher_id == watcher_id,
                History.tmdb_id == data.tmdb_id,
                History.season == data.season,
                History.episode == data.episode,
            )
            .first()
        )
        if entry:
            entry.watched_duration = data.watched_duration
            entry.is_finished = entry.is_finished or data.is_finished
        else:
            entry = History(
                imdb_id=data.imdb_id,
                tmdb_id=data.tmdb_id,
                season=data.season,
                episode=data.episode,
                mode=mode,
                watcher_id=watcher_id,
                watched_duration=data.watched_duration,
                is_finished=data.is_finished,
            )
            db.add(entry)
        db.commit()
        return {"message": "progress updated", "watched_duration": entry.watched_duration, "is_finished": entry.is_finished}
    except Exception as e:
        db.rollback()
        print(f"error while updating progress: {e}")
        raise HTTPException(500, "error while updating progress")


def GetProgress(user: UserResponse, tmdb_id: int, db: Session, season: int | None = None, episode: int | None = None):
    """Return the saved progress of a movie (or one episode), or None if it was never watched."""
    watcher_id = user.id
    entry = (
        db.query(History)
        .filter(
            History.watcher_id == watcher_id,
            History.tmdb_id == tmdb_id,
            History.season == season,
            History.episode == episode,
        )
        .first()
    )
    return HistoryResponse.model_validate(entry) if entry else None





def GetSerieHistory(request:Request, tmdb_id:int, db:Session, user: UserResponse):
    watcher_id = user.id
    try:
        serie_history = db.query(History).filter(History.tmdb_id == tmdb_id, History.watcher_id == watcher_id, History.mode == ModeEnum.TV).all()
        
        return serie_history
    except Exception as e:
        print(f"error while getting serie history: {e}")
        raise HTTPException(500, "error while serie history")