from sqlalchemy.orm import mapped_column, Mapped, relationship
from database import Base
from sqlalchemy import Integer, String, ForeignKey, DateTime, Enum, Column, Boolean
import enum
from datetime import datetime

class tokenTypeEnum(enum.Enum):
    EMAIL="email"
    PASSWORD_RESET="password_reset"

class Token(Base):
    __tablename__ = "tokens"
    id : Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id : Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    hashed_token : Mapped[str] = mapped_column(String, nullable=False, index=True)
    token_type : Mapped[tokenTypeEnum] = Column(Enum(tokenTypeEnum), insert_default=tokenTypeEnum.EMAIL)
    expires_at : Mapped[datetime] = mapped_column(DateTime, nullable=True)
    created_at : Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    used_at : Mapped[datetime] = mapped_column(DateTime, nullable=True)
    user : Mapped["User"] = relationship(back_populates="tokens")
from models.User import User