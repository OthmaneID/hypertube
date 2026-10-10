from fastapi.requests import Request
from fastapi import HTTPException
from fastapi.responses import JSONResponse, Response, StreamingResponse
from schema.Torrents import SourcesResponse, StreamInfoResponse
from config import settings
import httpx2
import redis
from utils.torrents import get_peers, get_trackers, generate_peer_id, select_video_file, parse_range_header, pieces_downloaded, check_piece_available
import libtorrent as lt
import asyncio
import os
import subprocess
import math
import json
import secrets
import functools
from collections import deque
from dataclasses import dataclass
from datetime import datetime
from sqlalchemy.dialects.postgresql import insert
from database import sessionLocal
from models.CachedTorrentFile import CachedTorrentFile

# Global libtorrent state
lt_session = None
active_torrents = {}
# hash -> indexes of files that have been requested for streaming
wanted_files = {}
# Concurrent requests for a new hash (stream + info) must not add the torrent twice
torrent_add_lock = asyncio.Lock()
# (hash, file index) -> (codec_name, pix_fmt, duration) from ffprobe
probe_cache = {}
# hash -> number of responses currently sending its data; the cleanup job never deletes these
open_streams = {}
# Authorizes ffmpeg's requests to the internal file endpoint, which has no user session
INTERNAL_KEY = secrets.token_urlsafe(32)

METADATA_TIMEOUT = 60
STREAM_BUFFER_PIECES = 3
STREAM_READAHEAD_PIECES = 20
STREAM_CHUNK_SIZE = 65536
PIECE_WAIT_TIMEOUT = 120
# Formats indexed at the end of the file (mov, some avi) need the last pieces before probing succeeds
PROBE_TIMEOUT = 60
TORRENT_SAVE_PATH = './uploads/torrent'

def get_lt_session():
    global lt_session
    if lt_session is None:
        lt_session = lt.session()
        settings = lt_session.get_settings()
        settings['listen_interfaces'] = '0.0.0.0:6881'
        settings['enable_outgoing_utp'] = True
        settings['enable_incoming_utp'] = True
        # Trackers share one tier; by default only one is tried at a time and dead ones eat the metadata timeout
        settings['announce_to_all_trackers'] = True
        settings['announce_to_all_tiers'] = True
        settings['dht_bootstrap_nodes'] = (
            'dht.libtorrent.org:25401,router.bittorrent.com:6881,'
            'router.utorrent.com:6881,dht.transmissionbt.com:6881'
        )
        lt_session.apply_settings(settings)
    return lt_session

async def getSources(request: Request, movie_id:str) -> SourcesResponse :
    api_url = f"https://torrentio.strem.fun/stream/movie/{movie_id}.json"
    rd : redis.Redis = request.app.state.redis
    cache_key = f"movie_{movie_id}_sources"
    
    # Try to get from cache
    try:
        if rd is not None:
            cached = rd.get(cache_key)
            if cached:
                return SourcesResponse.model_validate_json(cached)
    except redis.RedisError as e:
        print(f"Redis cache read error: {e}")
    except Exception as e:
        print(f"Cache deserialization error: {e}")
    
    # Fetch from API
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://torrentio.strem.fun/",
    }
    
    try:
        async with httpx2.AsyncClient() as client:
            res = await client.get(api_url, headers=headers, timeout=10.0)
            res.raise_for_status()
    except httpx2.HTTPStatusError as e:
        print(f"HTTP error fetching sources: {e}")
        raise Exception(f"Failed to fetch sources from API: {e.response.status_code}")
    except httpx2.TimeoutException:
        print("Timeout fetching sources")
        raise Exception("Timeout while fetching sources from API")
    except Exception as e:
        print(f"Error fetching sources: {e}")
        raise Exception(f"Failed to fetch sources: {str(e)}")
    
    # Validate response
    try:
        data = SourcesResponse.model_validate(res.json())
    except Exception as e:
        print(f"API response validation error: {e}")
        raise Exception(f"Invalid response format from API: {str(e)}")
    
    # Cache the result
    try:
        if rd is not None and data:
            rd.setex(cache_key, 60 * 60 * 8, data.model_dump_json())
    except redis.RedisError as e:
        print(f"Redis cache write error: {e}")
    
    return data


async def getEpisodeStreams(request: Request, imdb_id: str, season: int, episode: int) -> SourcesResponse:
    api_url = f"https://torrentio.strem.fun/stream/series/{imdb_id}:{season}:{episode}.json"
    rd : redis.Redis = request.app.state.redis
    cache_key = f"series_{imdb_id}_{season}_{episode}_sources"
    
    # Try to get from cache
    try:
        if rd is not None:
            cached = rd.get(cache_key)
            if cached:
                return SourcesResponse.model_validate_json(cached)
    except redis.RedisError as e:
        print(f"Redis cache read error: {e}")
    except Exception as e:
        print(f"Cache deserialization error: {e}")
    
    # Fetch from API
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://torrentio.strem.fun/",
    }
    
    try:
        async with httpx2.AsyncClient() as client:
            res = await client.get(api_url, headers=headers, timeout=10.0)
            res.raise_for_status()
    except httpx2.HTTPStatusError as e:
        print(f"HTTP error fetching episode sources: {e}")
        raise Exception(f"Failed to fetch episode sources from API: {e.response.status_code}")
    except httpx2.TimeoutException:
        print("Timeout fetching episode sources")
        raise Exception("Timeout while fetching episode sources from API")
    except Exception as e:
        print(f"Error fetching episode sources: {e}")
        raise Exception(f"Failed to fetch episode sources: {str(e)}")
    
    # Validate response
    try:
        data = SourcesResponse.model_validate(res.json())
    except Exception as e:
        print(f"API response validation error: {e}")
        raise Exception(f"Invalid response format from API: {str(e)}")
    
    # Cache the result
    try:
        if rd is not None and data:
            rd.setex(cache_key, 60 * 60 * 8, data.model_dump_json())
    except redis.RedisError as e:
        print(f"Redis cache write error: {e}")
    
    return data


def request_pieces(handle, first_piece, last_piece):
    # Time-critical pieces are fetched before the sequential/priority picker, from multiple peers
    for n, piece in enumerate(range(first_piece, last_piece + 1)):
        handle.set_piece_deadline(piece, n * 200)


async def wait_for_pieces(handle, first_piece, last_piece, request: Request | None = None, timeout=PIECE_WAIT_TIMEOUT):
    """Returns False if the client disconnected; raises TimeoutError if the pieces never arrive."""
    request_pieces(handle, first_piece, last_piece)
    loop = asyncio.get_running_loop()
    started = last_log = loop.time()
    while not pieces_downloaded(handle, first_piece, last_piece):
        # Only safe before the response starts; StreamingResponse owns receive() afterwards
        if request is not None and await request.is_disconnected():
            return False
        now = loop.time()
        if now - started > timeout:
            raise TimeoutError(f"Pieces {first_piece}-{last_piece} not downloaded after {timeout}s")
        if now - last_log >= 5:
            s = handle.status()
            print(
                f"Waiting for pieces {first_piece}-{last_piece}: state={s.state} paused={s.paused} "
                f"peers={s.num_peers} seeds={s.num_seeds} down={s.download_rate / 1024:.0f} KB/s"
            )
            last_log = now
        await asyncio.sleep(0.1)
    return True


async def wait_for_metadata(handle, request: Request, timeout=METADATA_TIMEOUT):
    """Returns False if the client disconnected; raises TimeoutError if no peer sends the metadata."""
    loop = asyncio.get_running_loop()
    started = last_log = loop.time()
    while not handle.has_metadata():
        if await request.is_disconnected():
            return False
        now = loop.time()
        if now - started > timeout:
            raise TimeoutError(f"No metadata received after {timeout}s (torrent has no reachable peers)")
        if now - last_log >= 5:
            s = handle.status()
            print(f"Waiting for metadata: peers={s.num_peers} seeds={s.num_seeds}")
            last_log = now
        await asyncio.sleep(0.1)
    return True


def record_file_access(hash: str, file_idx: int, relative_path: str, size: int):
    db = sessionLocal()
    try:
        stmt = insert(CachedTorrentFile).values(
            info_hash=hash,
            file_idx=file_idx,
            relative_path=relative_path,
            size=size,
            last_accessed_at=datetime.now(),
        )
        stmt = stmt.on_conflict_do_update(
            constraint="uq_cached_torrent_file",
            set_={
                "relative_path": stmt.excluded.relative_path,
                "size": stmt.excluded.size,
                "last_accessed_at": stmt.excluded.last_accessed_at,
            },
        )
        db.execute(stmt)
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"error while recording access to {hash}/{file_idx}: {e}")
    finally:
        db.close()


async def track_stream(hash: str, generator):
    open_streams[hash] = open_streams.get(hash, 0) + 1
    try:
        async for chunk in generator:
            yield chunk
    finally:
        try:
            # Closing the wrapper doesn't close the inner generator, whose finally stops ffmpeg
            await generator.aclose()
        finally:
            open_streams[hash] -= 1
            if open_streams[hash] <= 0:
                open_streams.pop(hash, None)


def drop_torrent(hash: str, handle):
    if active_torrents.get(hash) == handle:
        active_torrents.pop(hash, None)
        wanted_files.pop(hash, None)
        for key in [k for k in probe_cache if k[0] == hash]:
            probe_cache.pop(key)
    try:
        get_lt_session().remove_torrent(handle)
    except Exception as e:
        print(f"error while removing torrent {hash}: {e}")


async def stream_file_range(handle, file_path, file_offset, piece_length, file_last_piece, start, end):
    # Sparse files read back zeros for missing data, so every byte must belong to a verified piece
    pos = start
    current_piece = None
    with open(file_path, "rb") as f:
        while pos <= end:
            piece = (file_offset + pos) // piece_length
            if piece != current_piece:
                current_piece = piece
                request_pieces(handle, piece, min(piece + STREAM_READAHEAD_PIECES, file_last_piece))
                try:
                    await wait_for_pieces(handle, piece, piece)
                except TimeoutError as e:
                    print(f"Stopping stream: {e}")
                    return

            piece_last_byte = (piece + 1) * piece_length - file_offset - 1
            chunk_end = min(end, piece_last_byte, pos + STREAM_CHUNK_SIZE - 1)
            f.seek(pos)
            chunk = f.read(chunk_end - pos + 1)
            if not chunk:
                await asyncio.sleep(0.1)
                continue
            yield chunk
            pos += len(chunk)


@dataclass
class StreamFile:
    hash: str
    handle: object
    idx: int
    path: str
    offset: int
    size: int
    piece_length: int
    last_piece: int
    ext: str

    @property
    def is_native(self):
        return self.ext in ('mp4', 'webm')


def resolve_stream_file(hash, handle, file_idx) -> StreamFile:
    torrent_info = handle.torrent_file()
    files = torrent_info.layout()
    offset = files.file_offset(file_idx)
    size = files.file_size(file_idx)
    piece_length = torrent_info.piece_length()
    return StreamFile(
        hash=hash,
        handle=handle,
        idx=file_idx,
        path=os.path.join(TORRENT_SAVE_PATH, files.file_path(file_idx)),
        offset=offset,
        size=size,
        piece_length=piece_length,
        last_piece=(offset + size - 1) // piece_length,
        ext=files.file_path(file_idx).lower().split('.')[-1],
    )


def internal_url(sf: StreamFile):
    # ffmpeg reads the file through this server so that it can seek with Range requests, which a pipe can't do
    return f"http://127.0.0.1:{settings.backend_port}/torrent/internal/{sf.hash}/{sf.idx}?key={INTERNAL_KEY}"


def stream_errors(fn):
    @functools.wraps(fn)
    async def wrapper(*args, **kwargs):
        try:
            return await fn(*args, **kwargs)
        except HTTPException as e:
            print("error while streaming from a source : ", e.detail)
            return JSONResponse(status_code=e.status_code, content={"error": e.detail})
        except TimeoutError as e:
            print("timeout while streaming from a source : ", e)
            return JSONResponse(status_code=504, content={"error": str(e)})
        except Exception as e:
            print("error while streaming from a source : ", e)
            return JSONResponse(status_code=500, content={"error": "internal server error while streaming", "detail": str(e)})
    return wrapper


async def get_torrent_handle(hash: str):
    async with torrent_add_lock:
        if hash in active_torrents:
            print(f"Reusing existing torrent handle for {hash}")
            return active_torrents[hash]

        trackers = await get_trackers()
        print(f"trackers: {len(trackers)} trackers loaded")

        info_hash = lt.sha1_hash(bytes.fromhex(hash))

        add_params = lt.add_torrent_params()
        add_params.info_hashes = lt.info_hash_t(info_hash)
        add_params.save_path = TORRENT_SAVE_PATH
        add_params.storage_mode = lt.storage_mode_t.storage_mode_sparse
        add_params.trackers = trackers
        # Season packs can be huge: nothing is downloaded until a file is explicitly requested
        add_params.flags |= lt.torrent_flags.default_dont_download

        handle = get_lt_session().add_torrent(add_params)
        active_torrents[hash] = handle
        wanted_files[hash] = set()

        handle.set_sequential_download(True)
        return handle


async def open_stream_file(request: Request, hash: str) -> StreamFile | None:
    """Adds the torrent if needed and resolves the requested file. Returns None if the client disconnected."""
    handle = await get_torrent_handle(hash)

    print("Waiting for metadata...")
    try:
        if not await wait_for_metadata(handle, request):
            print("Client disconnected while waiting for metadata")
            return None
    except TimeoutError:
        drop_torrent(hash, handle)
        raise

    torrent_info = handle.torrent_file()
    files = torrent_info.layout()

    file_idx_str = request.query_params.get("fileIdx", "")
    requested_idx = int(file_idx_str) if file_idx_str.isdigit() else None
    requested_name = request.query_params.get("filename") or None

    file_idx = select_video_file(torrent_info, requested_idx, requested_name)
    if file_idx is None:
        raise HTTPException(status_code=404, detail=f"Requested video file not found in torrent (fileIdx={file_idx_str}, filename={requested_name})")

    # Priorities are tracked here because prioritize_files() is asynchronous,
    # so handle.file_priorities() can return stale values right after it
    wanted = wanted_files.setdefault(hash, set())
    if file_idx not in wanted:
        wanted.add(file_idx)
        handle.prioritize_files([4 if i in wanted else 0 for i in range(files.num_files())])

    print(f"Found video file #{file_idx}: {files.file_path(file_idx)} at torrent offset {files.file_offset(file_idx)}")
    await asyncio.to_thread(record_file_access, hash, file_idx, files.file_path(file_idx), files.file_size(file_idx))
    return resolve_stream_file(hash, handle, file_idx)


async def serve_range(request: Request, sf: StreamFile):
    range_header = request.headers.get("range")
    if range_header:
        start, end = parse_range_header(range_header, sf.size)
        print(f"Range request: {start}-{end}/{sf.size}")
    else:
        start, end = 0, sf.size - 1

    start_piece = (sf.offset + start) // sf.piece_length
    end_piece = (sf.offset + end) // sf.piece_length

    # Deadlines from a previous (abandoned) seek position would otherwise be served first
    sf.handle.clear_piece_deadlines()

    buffer_end_piece = min(start_piece + STREAM_BUFFER_PIECES - 1, end_piece)
    print(f"Waiting for buffer pieces {start_piece}-{buffer_end_piece}...")
    if not await wait_for_pieces(sf.handle, start_piece, buffer_end_piece, request=request):
        print("Client disconnected while buffering")
        return Response(status_code=499)

    generator = track_stream(sf.hash, stream_file_range(sf.handle, sf.path, sf.offset, sf.piece_length, sf.last_piece, start, end))
    media_type = f"video/{sf.ext}" if sf.is_native else "application/octet-stream"
    if range_header:
        return StreamingResponse(
            generator,
            status_code=206,
            media_type=media_type,
            headers={
                "Content-Range": f"bytes {start}-{end}/{sf.size}",
                "Accept-Ranges": "bytes",
                "Content-Length": str(end - start + 1)
            }
        )
    return StreamingResponse(
        generator,
        media_type=media_type,
        headers={
            "Accept-Ranges": "bytes",
            "Content-Length": str(sf.size)
        }
    )


async def run_ffprobe(sf: StreamFile, *args):
    """Runs ffprobe with JSON output on the file; returns the parsed output, or None on failure."""
    process = await asyncio.create_subprocess_exec(
        'ffprobe', '-v', 'error', *args, '-of', 'json', internal_url(sf),
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL
    )
    try:
        stdout, _ = await asyncio.wait_for(process.communicate(), timeout=PROBE_TIMEOUT)
    except asyncio.TimeoutError:
        print(f"ffprobe timed out after {PROBE_TIMEOUT}s for {sf.path}")
        return None
    finally:
        if process.returncode is None:
            process.kill()
            await process.communicate()

    try:
        return json.loads(stdout or b"{}")
    except ValueError:
        return None


async def probe_stream(sf: StreamFile):
    """Returns (codec_name, pix_fmt, duration) of the file's first video stream; all None if probing fails."""
    key = (sf.hash, sf.idx)
    if key in probe_cache:
        return probe_cache[key]

    info = await run_ffprobe(sf, '-select_streams', 'v:0', '-show_entries', 'stream=codec_name,pix_fmt:format=duration') or {}
    streams = info.get("streams") or []
    if not streams:
        print(f"ffprobe found no video stream in {sf.path}")
        return None, None, None

    try:
        duration = float(info.get("format", {}).get("duration"))
    except (TypeError, ValueError):
        duration = None
    result = (streams[0].get("codec_name"), streams[0].get("pix_fmt"), duration)
    probe_cache[key] = result
    return result


def can_copy_video(video_codec, pix_fmt):
    # H.264 8-bit 4:2:0 plays in every browser, so it is remuxed instead of re-encoded
    return video_codec == 'h264' and pix_fmt in ('yuv420p', 'yuvj420p')


async def resolve_start_time(sf: StreamFile, start):
    """Returns the time the transcoded stream will really start at when asked for `start`.

    A stream copy can only begin on a keyframe, so the player must use that keyframe's time
    as its offset; a re-encode starts exactly at `start`.
    """
    video_codec, pix_fmt, _ = await probe_stream(sf)
    if start <= 0 or not can_copy_video(video_codec, pix_fmt):
        return start

    info = await run_ffprobe(sf, '-select_streams', 'v:0', '-read_intervals', f'{start:.3f}%+#1', '-show_entries', 'packet=pts_time,flags') or {}
    for packet in info.get("packets") or []:
        if 'K' in packet.get("flags", ""):
            try:
                # Rounded up so that the -ss given to ffmpeg never falls before the keyframe
                return math.ceil(float(packet["pts_time"]) * 1000) / 1000
            except (KeyError, ValueError):
                break
    return start


def build_transcode_cmd(input_url, start, video_codec, pix_fmt):
    copy_video = can_copy_video(video_codec, pix_fmt)
    if copy_video:
        video_args = ['-c:v', 'copy']
        # ffmpeg seeks to the keyframe before (-ss - 0.13s) for formats indexed by DTS such as mkv, so a
        # start that is exactly on a keyframe would land on the previous one; the stream copy then
        # still begins on the keyframe at `start`
        seek = start + 0.2 if start > 0 else 0
    else:
        seek = start
        video_args = [
            '-c:v', 'libx264',
            '-preset', 'veryfast',
            '-crf', '23',
            '-maxrate', '6M', '-bufsize', '12M',
            # 10-bit sources would otherwise produce High 10 H.264, which browsers can't decode
            '-pix_fmt', 'yuv420p',
            '-vf', "scale=-2:'min(1080,ih)'",
            # Short GOP: each fMP4 fragment starts on a keyframe, so this bounds the startup delay
            '-g', '48',
        ]
    print(f"Transcoding from {start:.1f}s: video={video_codec}/{pix_fmt} -> {'copy' if copy_video else 'libx264'}")

    return [
        'ffmpeg', '-hide_banner', '-loglevel', 'error',
        # Before -i, -ss seeks the input through its index instead of decoding everything up to `start`
        *(['-ss', f'{seek:.3f}'] if seek > 0 else []),
        '-i', input_url,
        # Explicit mapping: the default picks subtitle tracks too, and bitmap ones (PGS/VobSub) make ffmpeg exit
        '-map', '0:v:0', '-map', '0:a:0?',
        '-sn', '-dn',
        *video_args,
        '-c:a', 'aac', '-ac', '2', '-b:a', '160k',
        '-movflags', 'frag_keyframe+empty_moov+default_base_moof',
        '-f', 'mp4',
        'pipe:1'
    ]


async def stream_transcoded_video(input_url, start, video_codec, pix_fmt):
    process = await asyncio.create_subprocess_exec(
        *build_transcode_cmd(input_url, start, video_codec, pix_fmt),
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )

    # stderr must be drained continuously, otherwise ffmpeg blocks once the pipe buffer fills
    stderr_tail = deque(maxlen=20)

    async def stderr_task():
        async for line in process.stderr:
            stderr_tail.append(line.decode(errors="replace").rstrip())

    async def drain_and_wait():
        # Since Python 3.12, process.wait() only returns once every pipe is closed, and the
        # stdout transport stops reading (and never sees EOF) when nobody consumes it
        while await process.stdout.read(65536):
            pass
        return await process.wait()

    stderr_reader = asyncio.create_task(stderr_task())
    finished = False

    try:
        while True:
            chunk = await process.stdout.read(65536)
            if not chunk:
                break
            yield chunk
        finished = True
    finally:
        # Runs on client disconnect too (CancelledError / GeneratorExit), which must keep propagating
        try:
            # On EOF ffmpeg is already exiting; otherwise the client left and it must be stopped
            if not finished and process.returncode is None:
                process.terminate()
            await asyncio.wait_for(drain_and_wait(), timeout=5)
        except ProcessLookupError:
            pass
        except asyncio.TimeoutError:
            process.kill()
            await asyncio.wait_for(drain_and_wait(), timeout=5)
        await asyncio.gather(stderr_reader, return_exceptions=True)
        if finished and process.returncode != 0:
            print(f"ffmpeg exited with code {process.returncode}:\n" + "\n".join(stderr_tail))


def parse_start_time(request: Request):
    try:
        start = float(request.query_params.get("start", 0))
    except ValueError:
        return 0.0
    return start if math.isfinite(start) and start > 0 else 0.0


@stream_errors
async def stream_from_source(request: Request, hash: str):
    sf = await open_stream_file(request, hash)
    if sf is None:
        return Response(status_code=499)

    if sf.is_native:
        return await serve_range(request, sf)

    video_codec, pix_fmt, _ = await probe_stream(sf)
    generator = track_stream(sf.hash, stream_transcoded_video(internal_url(sf), parse_start_time(request), video_codec, pix_fmt))
    return StreamingResponse(
        generator,
        media_type="video/mp4"
    )


@stream_errors
async def get_stream_info(request: Request, hash: str):
    sf = await open_stream_file(request, hash)
    if sf is None:
        return Response(status_code=499)

    if sf.is_native:
        return StreamInfoResponse(transcoded=False)

    _, _, duration = await probe_stream(sf)
    start = await resolve_start_time(sf, parse_start_time(request))
    return StreamInfoResponse(transcoded=True, duration=duration, start=start)


@stream_errors
async def serve_internal_file(request: Request, hash: str, file_idx: int, key: str):
    if not secrets.compare_digest(key, INTERNAL_KEY):
        raise HTTPException(status_code=403, detail="Forbidden")

    handle = active_torrents.get(hash)
    if handle is None or not handle.has_metadata() or not 0 <= file_idx < handle.torrent_file().num_files():
        raise HTTPException(status_code=404, detail="Torrent file is not active")

    return await serve_range(request, resolve_stream_file(hash, handle, file_idx))

# async def getArchiveSources()
