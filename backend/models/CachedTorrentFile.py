from sqlalchemy.orm import mapped_column, Mapped
from sqlalchemy import Integer, String, DateTime, Boolean, BigInteger, UniqueConstraint
from database import Base
from datetime import datetime


class CachedTorrentFile(Base):
    __tablename__ = "cached_torrent_files"
    __table_args__ = (
        UniqueConstraint("info_hash", "file_idx", name="uq_cached_torrent_file"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    info_hash: Mapped[str] = mapped_column(String, nullable=False, index=True)
    file_idx: Mapped[int] = mapped_column(Integer, nullable=False)
    relative_path: Mapped[str] = mapped_column(String, nullable=False)
    size: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    is_complete: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    last_accessed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, nullable=False)
