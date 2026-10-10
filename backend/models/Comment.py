from sqlalchemy.orm import mapped_column, Mapped, relationship
from sqlalchemy import Integer, String, ForeignKey, DateTime, Boolean
from database import Base
from datetime import datetime
# from models.User import User


class Comment(Base):
    __tablename__ = "comments"
    id : Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, index=True)
    content : Mapped[str] = mapped_column(String, nullable=False)
    owner_id : Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    movie_id : Mapped[int] = mapped_column(Integer, nullable = False)
    is_deleted : Mapped[bool] = mapped_column(Boolean, default=False)
    created_at : Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    updated_at : Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    owner : Mapped["User"] = relationship(back_populates="comments")