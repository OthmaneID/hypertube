from database import Base
from sqlalchemy import Integer, String, ARRAY, DateTime, func, Boolean, JSON, Column, Enum, LargeBinary
from sqlalchemy.orm import mapped_column, Mapped, relationship
import enum
from datetime import datetime
from typing import List, Dict
# from models.Comment import Comment

class oauthEnum(enum.Enum):
    EMAIL = "email"
    GOOGLE = "google"
    INTRA = "42"




# id, username, email, password, oauth_provider ("email", "google", "42"), favorite_movies, favorite_series, history
class User(Base):
    __tablename__ = "users"
    id : Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    email : Mapped[str] = mapped_column(String, unique=True, nullable=False)
    username : Mapped[str] = mapped_column(String, nullable=False)
    password : Mapped[str] = mapped_column(String, nullable=True)
    oauth_provider: Mapped[oauthEnum] = Column(Enum(oauthEnum), insert_default=oauthEnum.EMAIL)
    created_at : Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    deleted : Mapped[bool] = mapped_column(Boolean, default=False)
    favorite_movies: Mapped[List[int]] = mapped_column(ARRAY(Integer), default=[])
    favorite_series: Mapped[List[int]] = mapped_column(ARRAY(Integer), default=[])
    # history: Mapped[List[Dict[str, str]]] = mapped_column(JSON, default=[])
    watched_history : Mapped[List["History"]] = relationship(back_populates="watcher", cascade="all, delete-orphan")
    comments : Mapped[List["Comment"]] = relationship( back_populates="owner", cascade="all, delete-orphan")

# Late import to avoid circular dependency
from models.History import History
