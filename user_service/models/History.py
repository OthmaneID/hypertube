from sqlalchemy.orm import mapped_column, Mapped, relationship
from sqlalchemy import Integer, String, ForeignKey, DateTime, FLOAT
from database import Base

from datetime import datetime

class History(Base):
    __tablename__ = "history"
    id : Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    movie_id : Mapped[int] = mapped_column(Integer, nullable=False)
    watcher_id : Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    watched_duration: Mapped[float] = mapped_column(FLOAT, nullable=True)
    created_at : Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    watcher : Mapped["User"] = relationship(back_populates="watched_history")

# Late import to avoid circular dependency
from models.User import User