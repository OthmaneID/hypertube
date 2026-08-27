from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Integer, ForeignKey, DateTime
from database import Base
from datetime import datetime
import enum

class favoriteTypeEnum(enum.Enum) :
    MOVIE = "movie"
    SERIES = "series"
    

class Favorites(Base):
    __tablename__ = "favorites"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    favorite_id : Mapped[int] = mapped_column(Integer, nullable=False)
    favorite_type : Mapped[favoriteTypeEnum] = mapped_column(enum.Enum(favoriteTypeEnum), nullable=False)
    user = relationship("User", back_populates="favorites")
    created_at : Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    