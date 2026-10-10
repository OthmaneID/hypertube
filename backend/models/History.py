from sqlalchemy.orm import mapped_column, Mapped, relationship
from sqlalchemy import Integer, String, ForeignKey, DateTime, FLOAT, Boolean, Column, Enum
from database import Base

from datetime import datetime
import enum

class ModeEnum(enum.Enum):
    MOVIE = "movie"
    TV = "tv"

class History(Base):
    __tablename__ = "history"
    id : Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    movie_id : Mapped[str] = mapped_column(String, nullable=False)
    watcher_id : Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    mode : Mapped[ModeEnum] = mapped_column(Enum(ModeEnum), insert_default=ModeEnum.MOVIE)
    watched_duration: Mapped[float] = mapped_column(FLOAT, nullable=True) # watched time in seconds
    is_finished : Mapped[bool] = mapped_column(Boolean, nullable=False)
    created_at : Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    last_viewed_at : Mapped[datetime] = mapped_column(DateTime, onupdate=datetime.now)
    watcher : Mapped["User"] = relationship(back_populates="watched_history")

# Late import to avoid circular dependency
from models.User import User