from sqlalchemy.orm import mapped_column, Mapped, relationship
from sqlalchemy import Integer, String, ForeignKey, DateTime, FLOAT, Boolean, Column, Enum
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
    created_at : Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    last_viewed_at : Mapped[datetime] = mapped_column(
        default=lambda: datetime.now(timezone.utc), 
        onupdate=lambda: datetime.now(timezone.utc)
    )
    watcher : Mapped["User"] = relationship(back_populates="watched_history")

# Late import to avoid circular dependency
from models.User import User