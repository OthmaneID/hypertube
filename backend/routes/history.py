from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from database import get_db
from services.auth import get_current_user
from schema.User import UserResponse
from models.History import History
from datetime import datetime
from schema.History import HistoryUpdate
from services.History import UpdateProgress, GetProgress, GetSerieHistory

router = APIRouter(prefix="/history")


@router.get("/")
def get_my_history(
    request: Request,movie_id: str, db: Session = Depends(get_db), user: UserResponse = Depends(get_current_user)):
    """Return all movie_ids the current user has watched."""
    rows = (
        db.query(History)
        .filter(History.watcher_id == user.id)
        .order_by(History.created_at.desc())
        .all()
    )
    return {"watched": [r.imdb_id for r in rows]}


@router.get("/check/{tmdb_id}:{season}:{episode}")
def check_watched(
    request: Request,
    tmdb_id: int,
    season: int,
    episode: int,
    db: Session = Depends(get_db),
    user: UserResponse = Depends(get_current_user),
):
    """Return whether the current user has watched this movie or serie."""
    if season == -1 and episode == -1:
        rows = (
            db.query(History)
            .filter(History.watcher_id == user.id, History.tmdb_id == tmdb_id)
            .order_by(History.last_viewed_at.desc())
            .all()
        )
        if rows:
            is_finished = any(r.is_finished for r in rows)
            return {
                "watched": True,
                "duration": rows[0].watched_duration or 0,
                "is_finished": is_finished,
            }
        return {"watched": False, "duration": 0, "is_finished": False}
    else:
        row = (
            db.query(History)
            .filter(
                History.watcher_id == user.id,
                History.tmdb_id == tmdb_id,
                History.season == season,
                History.episode == episode,
            ).order_by(History.last_viewed_at.desc())
            .first()
        )
        if row:
            return {
                "watched": True,
                "duration": row.watched_duration or 0,
                "is_finished": row.is_finished,
            }
        return {"watched": False, "duration": 0, "is_finished": False}


@router.post("/{movie_id}")
def mark_watched(
    request: Request,
    movie_id: str,
    db: Session = Depends(get_db),
    user: UserResponse = Depends(get_current_user),
):
    """
    Mark a movie as watched by the current user.
    Idempotent — calling it multiple times is safe (updates timestamp).
    movie_id can be a numeric TMDB id or 'archive-<identifier>'.
    """
    existing = (
        db.query(History)
        .filter(History.watcher_id == user.id, History.imdb_id == str(movie_id))
        .first()
    )
    if existing:
        existing.created_at = datetime.now()
        db.commit()
        return {"message": "Already watched — timestamp updated", "movie_id": movie_id}

    entry = History(
        movie_id=str(movie_id),
        watcher_id=user.id,
    )
    db.add(entry)
    db.commit()
    return {"message": "Marked as watched", "movie_id": movie_id}


@router.delete("/{movie_id}")
def unmark_watched(
    request: Request,
    movie_id: str,
    db: Session = Depends(get_db),
    user: UserResponse = Depends(get_current_user),
):
    """Remove a movie from the user's watch history (mark as unwatched)."""
    deleted = (
        db.query(History)
        .filter(History.watcher_id == user.id, History.imdb_id == str(movie_id))
        .delete(synchronize_session=False)
    )
    db.commit()
    if deleted:
        return {"message": "Removed from history", "movie_id": movie_id}
    return {"message": "Was not in history", "movie_id": movie_id}



@router.patch("/progress")
def update_progress(request : Request, historyUpdate: HistoryUpdate, user: UserResponse = Depends(get_current_user), db : Session = Depends(get_db)):
    """Movie and serie progress share this route: season/episode are null for movies."""
    return UpdateProgress(historyUpdate, user, db)

# Declared before the movie route: "/progress/{movie_id}" would also match "1399:1:2" and fail int validation
@router.get("/progress/{movie_id}:{season}:{episode}")
def get_serie_progress(request: Request, movie_id : int, season : int, episode : int, user: UserResponse = Depends(get_current_user), db : Session = Depends(get_db)):
    return GetProgress(user, movie_id, db, season, episode)

@router.get("/progress/{movie_id}")
def get_movie_progress(request: Request, movie_id : int, user: UserResponse = Depends(get_current_user), db : Session = Depends(get_db)):
    return GetProgress(user, movie_id, db)



@router.get("/serie/{tmdb_id}")
def get_watched_episodes(request: Request, tmdb_id:int, db:Session = Depends(get_db), user:UserResponse = Depends(get_current_user)):
    """return the history of the whole serie"""
    return GetSerieHistory(request, tmdb_id, db, user)
