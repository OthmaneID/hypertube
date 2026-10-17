import asyncio
import os
import shutil
import time
from datetime import datetime, timedelta

from sqlalchemy import delete, select

from config import settings
from database import sessionLocal
from models.CachedTorrentFile import CachedTorrentFile
from services.Subtitles import SUBTITLES_DIR
from services.Torrents import TORRENT_SAVE_PATH, active_torrents, open_streams, drop_torrent

PARTS_SUFFIX = ".parts"


def retention_cutoff() -> datetime:
    return datetime.now() - timedelta(days=settings.media_retention_days)


def is_inside(root: str, path: str) -> bool:
    return os.path.realpath(path).startswith(os.path.realpath(root) + os.sep)


def parts_file(hash: str) -> str:
    # libtorrent keeps the pieces of unwanted files (season packs) in this hidden file
    return os.path.join(TORRENT_SAVE_PATH, f".{hash.lower()}{PARTS_SUFFIX}")


def top_level_name(relative_path: str) -> str:
    return relative_path.replace("\\", "/").split("/")[0]


def remove_path(path: str) -> int:
    """Deletes a file or folder inside the torrent directory; returns the number of bytes freed."""
    if not is_inside(TORRENT_SAVE_PATH, path) or not os.path.lexists(path):
        return 0
    freed = 0
    try:
        if os.path.isdir(path) and not os.path.islink(path):
            for dirpath, _, filenames in os.walk(path):
                for name in filenames:
                    try:
                        freed += os.path.getsize(os.path.join(dirpath, name))
                    except OSError:
                        pass
            shutil.rmtree(path)
        else:
            freed = os.path.getsize(path)
            os.remove(path)
    except OSError as e:
        print(f"[cleanup] could not delete {path}: {e}")
        return 0
    return freed


def remove_empty_parents(path: str):
    root = os.path.realpath(TORRENT_SAVE_PATH)
    parent = os.path.dirname(os.path.realpath(path))
    while parent != root and parent.startswith(root + os.sep):
        try:
            os.rmdir(parent)
        except OSError:
            # Not empty (other files of the torrent are still used) or already gone
            return
        parent = os.path.dirname(parent)


def latest_mtime(path: str) -> float:
    """Newest modification time of the files under path; a folder's own mtime only counts when it holds no file."""
    if not os.path.isdir(path) or os.path.islink(path):
        return os.lstat(path).st_mtime
    latest = None
    for dirpath, _, filenames in os.walk(path):
        for name in filenames:
            try:
                mtime = os.lstat(os.path.join(dirpath, name)).st_mtime
            except OSError:
                continue
            latest = mtime if latest is None else max(latest, mtime)
    return latest if latest is not None else os.lstat(path).st_mtime


def claim_expired_torrents(streaming_hashes: set[str]) -> dict[str, dict]:
    """Deletes the rows of files unused since the cutoff and returns them grouped by hash.

    Deleting the rows first means a stream reopened meanwhile (which refreshes its row)
    is never claimed, so its files are kept.
    """
    db = sessionLocal()
    try:
        stmt = delete(CachedTorrentFile).where(CachedTorrentFile.last_accessed_at < retention_cutoff())
        if streaming_hashes:
            stmt = stmt.where(CachedTorrentFile.info_hash.not_in(streaming_hashes))
        claimed_rows = db.execute(
            stmt.returning(CachedTorrentFile.info_hash, CachedTorrentFile.relative_path)
        ).all()
        db.commit()

        claimed: dict[str, dict] = {}
        for hash, relative_path in claimed_rows:
            claimed.setdefault(hash, {"paths": [], "rows_left": False})["paths"].append(relative_path)
        if claimed:
            still_used = db.execute(
                select(CachedTorrentFile.info_hash).where(CachedTorrentFile.info_hash.in_(claimed)).distinct()
            ).scalars()
            for hash in still_used:
                claimed[hash]["rows_left"] = True
        return claimed
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def delete_torrent_files(claimed: dict[str, dict]):
    freed = 0
    for hash, info in claimed.items():
        for relative_path in info["paths"]:
            path = os.path.join(TORRENT_SAVE_PATH, relative_path)
            freed += remove_path(path)
            remove_empty_parents(path)
        if not info["rows_left"]:
            freed += remove_path(parts_file(hash))
    if claimed:
        print(f"[cleanup] deleted {len(claimed)} unused torrent(s), freed {freed / 1024 ** 2:.0f} MB")


def sweep_orphans(protected_names: set[str], protected_hashes: set[str]):
    """Deletes untracked downloads (made before tracking existed, or by a crashed session) once they are old enough."""
    if not os.path.isdir(TORRENT_SAVE_PATH):
        return
    db = sessionLocal()
    try:
        rows = db.execute(select(CachedTorrentFile.info_hash, CachedTorrentFile.relative_path)).all()
    finally:
        db.close()

    tracked_hashes = {hash.lower() for hash, _ in rows} | {hash.lower() for hash in protected_hashes}
    tracked_names = {top_level_name(path) for _, path in rows} | protected_names
    cutoff = time.time() - settings.media_retention_days * 86400

    freed = 0
    removed = 0
    for entry in os.scandir(TORRENT_SAVE_PATH):
        name = entry.name
        if name.startswith(".") and name.endswith(PARTS_SUFFIX):
            if name[1:-len(PARTS_SUFFIX)].lower() in tracked_hashes:
                continue
        elif name in tracked_names:
            continue
        try:
            if latest_mtime(entry.path) >= cutoff:
                continue
        except OSError:
            continue
        freed += remove_path(entry.path)
        removed += 1
    if removed:
        print(f"[cleanup] deleted {removed} untracked torrent entr{'y' if removed == 1 else 'ies'}, freed {freed / 1024 ** 2:.0f} MB")


def cleanup_subtitles():
    if not os.path.isdir(SUBTITLES_DIR):
        return
    cutoff = time.time() - settings.media_retention_days * 86400
    removed = 0
    for entry in os.scandir(SUBTITLES_DIR):
        try:
            # .json are the track lists of embedded subtitles, which must not outlive their .vtt files
            if entry.is_file() and entry.name.endswith((".vtt", ".json")) and entry.stat().st_mtime < cutoff:
                os.remove(entry.path)
                removed += 1
        except OSError as e:
            print(f"[cleanup] could not delete subtitle {entry.path}: {e}")
    if removed:
        print(f"[cleanup] deleted {removed} unused subtitle file(s)")


def active_torrent_names() -> set[str]:
    names = set()
    for handle in list(active_torrents.values()):
        try:
            if handle.has_metadata():
                names.add(handle.torrent_file().name())
        except Exception:
            pass
    return names


async def run_cleanup():
    # active_torrents, open_streams and drop_torrent belong to the event loop; only disk and DB work goes to threads
    claimed = await asyncio.to_thread(claim_expired_torrents, set(open_streams))

    to_delete = {}
    for hash, info in claimed.items():
        if open_streams.get(hash):
            # A stream started while the rows were being claimed; its next open recreates the row
            continue
        handle = active_torrents.get(hash)
        if handle is not None:
            drop_torrent(hash, handle)
        to_delete[hash] = info

    await asyncio.to_thread(delete_torrent_files, to_delete)
    await asyncio.to_thread(sweep_orphans, active_torrent_names(), set(active_torrents))
    await asyncio.to_thread(cleanup_subtitles)


async def cleanup_loop():
    while True:
        try:
            await run_cleanup()
        except asyncio.CancelledError:
            raise
        except Exception as e:
            print(f"[cleanup] error during media cleanup: {e}")
        await asyncio.sleep(settings.cleanup_interval_hours * 3600)
