from sqlalchemy.orm import mapped_column, Mapped, relationship
from sqlalchemy import Integer, String, Text, ForeignKey, DateTime, FLOAT, Index
from database import Base

from datetime import datetime

class History(Base):
    __tablename__ = "history"
    __table_args__ = (Index("ix_history_watcher_updated", "watcher_id", "updated_at"),)
    id : Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    # TMDB id of the movie or the show
    movie_id : Mapped[str] = mapped_column(String, nullable=False)
    watcher_id : Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    # Last playback position, in seconds
    watched_duration: Mapped[float] = mapped_column(FLOAT, nullable=True)
    media_type: Mapped[str | None] = mapped_column(String, nullable=True)
    title: Mapped[str | None] = mapped_column(String, nullable=True)
    poster_path: Mapped[str | None] = mapped_column(String, nullable=True)
    # For a show: the last episode watched
    season: Mapped[int | None] = mapped_column(Integer, nullable=True)
    episode: Mapped[int | None] = mapped_column(Integer, nullable=True)
    episode_title: Mapped[str | None] = mapped_column(String, nullable=True)
    duration: Mapped[float | None] = mapped_column(FLOAT, nullable=True)
    watch_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at : Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    updated_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    watcher : Mapped["User"] = relationship(back_populates="watched_history")

# Late import to avoid circular dependency
from models.User import User
