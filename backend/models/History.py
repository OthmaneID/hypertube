from sqlalchemy.orm import mapped_column, Mapped, relationship
from sqlalchemy import Integer, String, Text, ForeignKey, DateTime, FLOAT, Boolean, Enum, UniqueConstraint, Index
from database import Base

from datetime import datetime, timezone
import enum

class ModeEnum(enum.Enum):
    MOVIE = "movie"
    TV = "tv"

class History(Base):
    __tablename__ = "history"
    id : Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    imdb_id : Mapped[str] = mapped_column(String, nullable=False)
    tmdb_id : Mapped[int] = mapped_column(Integer, nullable=False, index=True)  #tmdb id , and index true to easally check for is_watched or not
    season : Mapped[int] = mapped_column(Integer, nullable=True)
    episode : Mapped[int] = mapped_column(Integer, nullable=True)
    watcher_id : Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    mode : Mapped[ModeEnum] = mapped_column(Enum(ModeEnum), insert_default=ModeEnum.MOVIE)
    watched_duration: Mapped[int] = mapped_column(Integer, nullable=True,default=0) # watched time in seconds
    is_finished : Mapped[bool] = mapped_column(Boolean, nullable=False)
    # What the "continue watching" cards show, and the player URL that reopens the same stream
    title: Mapped[str | None] = mapped_column(String, nullable=True)
    poster_path: Mapped[str | None] = mapped_column(String, nullable=True)
    episode_title: Mapped[str | None] = mapped_column(String, nullable=True)
    duration: Mapped[float | None] = mapped_column(FLOAT, nullable=True)
    watch_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at : Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    last_viewed_at : Mapped[datetime] = mapped_column(
        default=lambda: datetime.now(timezone.utc), 
        onupdate=lambda: datetime.now(timezone.utc)
    )
    watcher : Mapped["User"] = relationship(back_populates="watched_history")
    __table_args__ = (
        UniqueConstraint(
            "watcher_id",
            "tmdb_id",
            "season",
            "episode",
            name="uq_history_user_media",
            postgresql_nulls_not_distinct=True,
        ),
        Index("ix_history_watcher_last_viewed", "watcher_id", "last_viewed_at"),
    )

# Late import to avoid circular dependency
from models.User import User
