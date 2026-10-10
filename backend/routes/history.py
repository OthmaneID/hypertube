from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from database import get_db
from services.auth import get_current_user
from schema.User import UserResponse
from models.History import History
from datetime import datetime

router = APIRouter(prefix="/history")


@router.get("/")
def get_my_history(
    request: Request,
    db: Session = Depends(get_db),
    user: UserResponse = Depends(get_current_user),
):
    """Return all movie_ids the current user has watched."""
    rows = (
        db.query(History)
        .filter(History.watcher_id == user.id)
        .order_by(History.created_at.desc())
        .all()
    )
    return {"watched": [r.movie_id for r in rows]}


@router.get("/check/{movie_id}")
def check_watched(
    request: Request,
    movie_id: str,
    db: Session = Depends(get_db),
    user: UserResponse = Depends(get_current_user),
):
    """Return whether the current user has watched this movie."""
    row = (
        db.query(History)
        .filter(History.watcher_id == user.id, History.movie_id == str(movie_id))
        .first()
    )
    return {"watched": row is not None}


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
        .filter(History.watcher_id == user.id, History.movie_id == str(movie_id))
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
        .filter(History.watcher_id == user.id, History.movie_id == str(movie_id))
        .delete(synchronize_session=False)
    )
    db.commit()
    if deleted:
        return {"message": "Removed from history", "movie_id": movie_id}
    return {"message": "Was not in history", "movie_id": movie_id}


@router.get("progress/{movie_id}")
def get_progress(request: Request, movie_id : int):
    pass