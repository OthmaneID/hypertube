from database import Base
from sqlalchemy import Integer, String, ARRAY, DateTime, Boolean, Column, Enum
from sqlalchemy.orm import mapped_column, Mapped, relationship
import enum
from datetime import datetime
from typing import List
# from models.Comment import Comment

class oauthEnum(enum.Enum):
    EMAIL = "email"
    GOOGLE = "google"
    FORTY_TWO = "42"

class preferredLanguageEnum(enum.Enum):
    FR = "fr"
    EN = "en"



# id, username, email, password, oauth_provider ("email", "google", "42"), favorite_movies, favorite_series, history
class User(Base):
    __tablename__ = "users"
    id : Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    email : Mapped[str] = mapped_column(String, unique=True, nullable=False)
    first_name : Mapped[str] = mapped_column(String, nullable=False)
    last_name : Mapped[str] = mapped_column(String, nullable= False)
    username : Mapped[str] = mapped_column(String, nullable=False)
    preferred_language : Mapped[preferredLanguageEnum] = Column(Enum(preferredLanguageEnum), insert_default=preferredLanguageEnum.EN)
    picture : Mapped[str] = mapped_column(String, default="/uploads/default/Default_pfp.svg")
    password : Mapped[str] = mapped_column(String, nullable=True)
    oauth_provider: Mapped[oauthEnum] = Column(Enum(oauthEnum), insert_default=oauthEnum.EMAIL)
    is_verified : Mapped[bool] = mapped_column(Boolean, default=False)
    created_at : Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    deleted : Mapped[bool] = mapped_column(Boolean, default=False)
    favorites : Mapped[List["Favorites"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    watched_history : Mapped[List["History"]] = relationship(back_populates="watcher", cascade="all, delete-orphan")
    comments : Mapped[List["Comment"]] = relationship( back_populates="owner", cascade="all, delete-orphan")
    tokens : Mapped[List["Token"]] = relationship(back_populates="user", cascade="all, delete-orphan" )

# Late import to avoid circular dependency
from models.History import History
from models.Favorites import Favorites
from models.Comment import Comment
from models.Token import Token
