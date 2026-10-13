from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session
from database import get_db
from services.auth import get_current_user
from schema.User import UserResponse
from schema.History import ContinueWatchingItem, ProgressUpdate
from models.History import History
from datetime import datetime

router = APIRouter(prefix="/history")

COMPLETED_RATIO = 0.95


@router.put("/progress")
def save_progress(
    request: Request,
    body: ProgressUpdate,
    db: Session = Depends(get_db),
    user: UserResponse = Depends(get_current_user),
):
    """Store where the user is in a movie, or in the last episode watched of a show."""
    entry = (
        db.query(History)
        .filter(
            History.watcher_id == user.id,
            History.movie_id == str(body.tmdb_id),
            History.media_type == body.media_type,
        )
        .first()
    )
    if entry is None:
        entry = History(movie_id=str(body.tmdb_id), watcher_id=user.id, media_type=body.media_type)
        db.add(entry)

    entry.title = body.title
    entry.poster_path = body.poster_path
    entry.season = body.season
    entry.episode = body.episode
    entry.episode_title = body.episode_title
    entry.watched_duration = body.position
    entry.duration = body.duration
    entry.watch_path = body.watch_path
    entry.updated_at = datetime.now()
    db.commit()
    return {"message": "Progress saved"}


@router.get("/continue", response_model=list[ContinueWatchingItem])
def get_continue_watching(
    request: Request,
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    user: UserResponse = Depends(get_current_user),
):
    """Return the current user's watched movies and shows, most recent first."""
    rows = (
        db.query(History)
        .filter(
            History.watcher_id == user.id,
            History.media_type.isnot(None),
            History.watch_path.isnot(None),
        )
        .order_by(History.updated_at.desc())
        .limit(limit)
        .all()
    )
    items = []
    for row in rows:
        position = row.watched_duration or 0
        progress = min(1.0, position / row.duration) if row.duration else 0.0
        items.append(ContinueWatchingItem(
            media_type=row.media_type,
            tmdb_id=int(row.movie_id),
            title=row.title,
            poster_path=row.poster_path,
            season=row.season,
            episode=row.episode,
            episode_title=row.episode_title,
            position=position,
            duration=row.duration,
            progress=progress,
            completed=progress >= COMPLETED_RATIO,
            watch_path=row.watch_path,
            updated_at=row.updated_at or row.created_at,
        ))
    return items


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
