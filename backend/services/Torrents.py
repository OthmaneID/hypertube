from fastapi.requests import Request
from fastapi import HTTPException
from fastapi.responses import JSONResponse, Response, StreamingResponse
from schema.Torrents import SourcesResponse
import httpx2
import redis
from utils.torrents import get_peers, get_trackers, generate_peer_id, select_video_file, parse_range_header, pieces_downloaded, check_piece_available
import libtorrent as lt
import asyncio
import os
import subprocess
import math
import secrets
from dataclasses import dataclass
from urllib.parse import urlencode
from config import settings

# Global libtorrent state
lt_session = None
active_torrents = {}
# hash -> indexes of files that have been requested for streaming
wanted_files = {}
# Concurrent requests for a new hash (stream + info) must not add the torrent twice
torrent_add_lock = asyncio.Lock()

METADATA_TIMEOUT = 60
STREAM_BUFFER_PIECES = 3
STREAM_READAHEAD_PIECES = 20
STREAM_CHUNK_SIZE = 65536
PIECE_WAIT_TIMEOUT = 120
PROBE_TIMEOUT = 90

# Lets ffmpeg/ffprobe read the raw file back through this server without a user session
INTERNAL_STREAM_TOKEN = secrets.token_urlsafe(32)

TRANSCODE_OUTPUT_ARGS = [
    '-c:v', 'libvpx',
    '-deadline', 'realtime',
    '-cpu-used', '4',
    '-b:v', '3000k',
    '-c:a', 'libvorbis',
    '-f', 'webm',
    'pipe:1'
]

def get_lt_session():
    global lt_session
    if lt_session is None:
        lt_session = lt.session()
        settings = lt_session.get_settings()
        settings['listen_interfaces'] = '0.0.0.0:6881'
        settings['enable_outgoing_utp'] = True
        settings['enable_incoming_utp'] = True
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


def drop_torrent(hash: str, handle):
    if active_torrents.get(hash) == handle:
        active_torrents.pop(hash, None)
        wanted_files.pop(hash, None)
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


async def stream_transcoded_video(handle, file_path, file_offset, piece_length, file_last_piece, file_size):
    cmd = ['ffmpeg', '-i', 'pipe:0', *TRANSCODE_OUTPUT_ARGS]

    process = await asyncio.create_subprocess_exec(
        *cmd,
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL
    )

    async def writer_task():
        try:
            generator = stream_file_range(handle, file_path, file_offset, piece_length, file_last_piece, 0, file_size - 1)
            async for chunk in generator:
                if process.returncode is not None:
                    break
                process.stdin.write(chunk)
                await process.stdin.drain()
        except (BrokenPipeError, ConnectionResetError):
            pass
        except Exception as e:
            print(f"Error in ffmpeg writer task: {e}")
        finally:
            if process.returncode is None:
                try:
                    process.stdin.close()
                    await process.stdin.wait_closed()
                except Exception:
                    pass

    task = asyncio.create_task(writer_task())

    try:
        while True:
            chunk = await process.stdout.read(65536)
            if not chunk:
                break
            yield chunk
    except asyncio.CancelledError:
        print("Transcoding cancelled by client")
    finally:
        if process.returncode is None:
            try:
                process.terminate()
            except ProcessLookupError:
                pass
            await process.wait()
        task.cancel()


async def stream_transcoded_from_url(url: str, start_seconds: float):
    # ffmpeg's http input seeks with Range requests, so only the pieces around the target time are fetched
    cmd = ['ffmpeg', '-ss', f"{start_seconds:.3f}", '-i', url, *TRANSCODE_OUTPUT_ARGS]

    process = await asyncio.create_subprocess_exec(
        *cmd,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL
    )

    try:
        while True:
            chunk = await process.stdout.read(65536)
            if not chunk:
                break
            yield chunk
    except asyncio.CancelledError:
        print("Transcoding cancelled by client")
    finally:
        if process.returncode is None:
            try:
                process.terminate()
            except ProcessLookupError:
                pass
            await process.wait()


async def probe_duration(url: str) -> float | None:
    process = await asyncio.create_subprocess_exec(
        'ffprobe', '-v', 'error',
        '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1',
        url,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL
    )
    try:
        stdout, _ = await asyncio.wait_for(process.communicate(), timeout=PROBE_TIMEOUT)
    except asyncio.TimeoutError:
        print("ffprobe timed out")
        return None
    finally:
        if process.returncode is None:
            try:
                process.kill()
            except ProcessLookupError:
                pass
            await process.wait()
    try:
        duration = float(stdout.decode().strip())
    except ValueError:
        return None
    return duration if math.isfinite(duration) and duration > 0 else None


def internal_raw_url(request: Request, hash: str) -> str:
    params = {key: request.query_params[key] for key in ("fileIdx", "filename") if request.query_params.get(key)}
    params["token"] = INTERNAL_STREAM_TOKEN
    return f"http://127.0.0.1:{settings.backend_port}/torrent/raw/{hash}?{urlencode(params)}"


def parse_start_seconds(request: Request) -> float:
    try:
        start = float(request.query_params.get("start", 0))
    except ValueError:
        return 0.0
    return start if math.isfinite(start) and start > 0 else 0.0


@dataclass
class TorrentFile:
    handle: object
    file_path: str
    file_offset: int
    file_size: int
    piece_length: int
    file_last_piece: int
    ext: str

    @property
    def is_native(self) -> bool:
        return self.ext in ['mp4', 'webm']


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
        add_params.save_path = './uploads/torrent'
        add_params.storage_mode = lt.storage_mode_t.storage_mode_sparse
        add_params.trackers = trackers
        # Season packs can be huge: nothing is downloaded until a file is explicitly requested
        add_params.flags |= lt.torrent_flags.default_dont_download

        handle = get_lt_session().add_torrent(add_params)
        active_torrents[hash] = handle
        wanted_files[hash] = set()

        handle.set_sequential_download(True)
        return handle


async def open_torrent_file(request: Request, hash: str) -> TorrentFile | None:
    """Returns None if the client disconnected before the torrent metadata arrived."""
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

    file_offset = files.file_offset(file_idx)
    file_size = files.file_size(file_idx)
    file_path = os.path.join('./uploads/torrent', files.file_path(file_idx))
    print(f"Found video file #{file_idx}: {files.file_path(file_idx)} at torrent offset {file_offset}")

    piece_length = torrent_info.piece_length()
    return TorrentFile(
        handle=handle,
        file_path=file_path,
        file_offset=file_offset,
        file_size=file_size,
        piece_length=piece_length,
        file_last_piece=(file_offset + file_size - 1) // piece_length,
        ext=files.file_path(file_idx).lower().split('.')[-1],
    )


async def serve_file_range(request: Request, tf: TorrentFile):
    handle, file_offset, file_size, piece_length = tf.handle, tf.file_offset, tf.file_size, tf.piece_length

    range_header = request.headers.get("range")
    if range_header:
        start, end = parse_range_header(range_header, file_size)
        print(f"Range request: {start}-{end}/{file_size}")
    else:
        start, end = 0, file_size - 1

    start_piece = (file_offset + start) // piece_length
    end_piece = (file_offset + end) // piece_length

    # Deadlines from a previous (abandoned) seek position would otherwise be served first
    handle.clear_piece_deadlines()

    buffer_end_piece = min(start_piece + STREAM_BUFFER_PIECES - 1, end_piece)
    print(f"Waiting for buffer pieces {start_piece}-{buffer_end_piece}...")
    if not await wait_for_pieces(handle, start_piece, buffer_end_piece, request=request):
        print("Client disconnected while buffering")
        return Response(status_code=499)

    generator = stream_file_range(handle, tf.file_path, file_offset, piece_length, tf.file_last_piece, start, end)
    media_type = f"video/{tf.ext}" if tf.is_native else "video/mp4"
    if range_header:
        return StreamingResponse(
            generator,
            status_code=206,
            media_type=media_type,
            headers={
                "Content-Range": f"bytes {start}-{end}/{file_size}",
                "Accept-Ranges": "bytes",
                "Content-Length": str(end - start + 1)
            }
        )
    return StreamingResponse(
        generator,
        media_type=media_type,
        headers={
            "Accept-Ranges": "bytes",
            "Content-Length": str(file_size)
        }
    )


def stream_error_response(e: Exception):
    if isinstance(e, HTTPException):
        print("error while streaming from a source : ", e.detail)
        return JSONResponse(status_code=e.status_code, content={"error": e.detail})
    if isinstance(e, TimeoutError):
        print("timeout while streaming from a source : ", e)
        return JSONResponse(status_code=504, content={"error": str(e)})
    print("error while streaming from a source : ", e)
    return JSONResponse(status_code=500, content={"error": "internal server error while streaming", "detail": str(e)})


async def stream_from_source(request: Request, hash: str):
    try:
        tf = await open_torrent_file(request, hash)
        if tf is None:
            return Response(status_code=499)

        if tf.is_native:
            return await serve_file_range(request, tf)

        start_seconds = parse_start_seconds(request)
        if start_seconds > 0:
            print(f"Transcoding from {start_seconds:.1f}s")
            return StreamingResponse(
                stream_transcoded_from_url(internal_raw_url(request, hash), start_seconds),
                media_type="video/webm"
            )

        handle, file_offset, piece_length = tf.handle, tf.file_offset, tf.piece_length
        start_piece = file_offset // piece_length
        end_piece = tf.file_last_piece
        handle.clear_piece_deadlines()

        buffer_end_piece = min(start_piece + STREAM_BUFFER_PIECES - 1, end_piece)
        print(f"Waiting for buffer pieces {start_piece}-{buffer_end_piece} for transcoding...")
        if not await wait_for_pieces(handle, start_piece, buffer_end_piece, request=request):
            print("Client disconnected while buffering")
            return Response(status_code=499)

        generator = stream_transcoded_video(handle, tf.file_path, file_offset, piece_length, tf.file_last_piece, tf.file_size)
        return StreamingResponse(
            generator,
            media_type="video/webm"
        )

    except Exception as e:
        return stream_error_response(e)


async def stream_raw_from_source(request: Request, hash: str):
    """Range-capable raw bytes for the local ffmpeg/ffprobe processes, whatever the container format."""
    if not secrets.compare_digest(request.query_params.get("token", ""), INTERNAL_STREAM_TOKEN):
        return JSONResponse(status_code=403, content={"error": "forbidden"})
    try:
        tf = await open_torrent_file(request, hash)
        if tf is None:
            return Response(status_code=499)
        return await serve_file_range(request, tf)
    except Exception as e:
        return stream_error_response(e)


async def get_stream_info(request: Request, hash: str):
    try:
        tf = await open_torrent_file(request, hash)
        if tf is None:
            return Response(status_code=499)
        # The browser reads the duration of native files itself; transcoded output is a live stream without one
        duration = None if tf.is_native else await probe_duration(internal_raw_url(request, hash))
        return {"transcoded": not tf.is_native, "duration": duration}
    except Exception as e:
        return stream_error_response(e)

# async def getArchiveSources()