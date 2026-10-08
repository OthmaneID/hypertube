from fastapi.requests import Request
from fastapi.responses import StreamingResponse
from schema.Torrents import SourcesResponse
import httpx2
import redis
from utils.torrents import get_peers, get_trackers, generate_peer_id, find_first_video_file, parse_range_header, pieces_downloaded, check_piece_available
import libtorrent as lt
import asyncio
import os
import subprocess
import math



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


async def stream_from_source(request: Request, hash: str):
    process = None
    try:
        trackers = await get_trackers()

        print(f"trackers: {len(trackers)} trackers loaded")
        session = lt.session()
        settings = session.get_settings()

        settings['listen_interfaces'] = '0.0.0.0:6881'
        settings['enable_outgoing_utp'] = True
        settings['enable_incoming_utp'] = True
        session.apply_settings(settings)

        info_hash = lt.sha1_hash(bytes.fromhex(hash))

        add_params = lt.add_torrent_params()
        add_params.info_hashes = lt.info_hash_t(info_hash)
        add_params.save_path = './uploads/torrent'
        add_params.storage_mode = lt.storage_mode_t.storage_mode_sparse
        add_params.trackers = trackers

        handle = session.add_torrent(add_params)

        # Wait for metadata
        print("Waiting for metadata...")
        while not handle.has_metadata():
            await asyncio.sleep(0.1)

        # Find first video file
        torrent_info = handle.torrent_file()
        video_file = find_first_video_file(torrent_info)

        if not video_file:
            raise Exception("No video file found in torrent")

        print(f"Found video file: {video_file.path}")

        # Get file path
        file_path = os.path.join('./uploads/torrent', video_file.path)

        # Enable sequential download
        handle.set_sequential_download(True)

        # Prioritize first pieces
        for i in range(min(100, torrent_info.num_pieces())):
            handle.piece_priority(i, 7)

        # Wait for initial buffer (5%)
        print("Buffering...")
        while handle.status().progress < 0.02:
            await asyncio.sleep(0.1)

        print(f"Buffer ready. Progress: {handle.status().progress * 100:.2f}%")

        # Handle range requests
        range_header = request.headers.get("range")
        file_size = video_file.size

        if range_header:
            # Parse range header (e.g., "bytes=0-1023")
            start, end = parse_range_header(range_header, file_size)

            print(f"Range request: {start}-{end}/{file_size}")

            # Reprioritize pieces around the seek position
            start_piece = int(start / torrent_info.piece_length())
            end_piece = int(end / torrent_info.piece_length())
            for i in range(start_piece, min(end_piece + 10, torrent_info.num_pieces())):
                handle.piece_priority(i, 7)

            # Wait for pieces to download
            print(f"Waiting for pieces {start_piece}-{end_piece}...")
            while not pieces_downloaded(handle, start_piece, end_piece):
                await asyncio.sleep(0.1)

            # Calculate seek position (0.0 to 1.0)
            seek_position = start / file_size

            # FFmpeg command with seek
            ffmpeg_cmd = [
                'ffmpeg',
                '-ss', str(seek_position),  # Seek position as fraction
                '-i', file_path,
                '-c:v', 'libx264',
                '-preset', 'fast',
                '-crf', '23',
                '-c:a', 'aac',
                '-b:a', '128k',
                '-f', 'mp4',
                '-movflags', 'frag_keyframe+empty_moov',  # Streaming-friendly
                'pipe:1'  # Output to stdout
            ]

            print(f"Running FFmpeg with seek: {' '.join(ffmpeg_cmd)}")
            process = await asyncio.create_subprocess_exec(
                *ffmpeg_cmd,
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )

            async def range_generator():
                chunk_size = 65536
                remaining = end - start + 1
                try:
                    while remaining > 0:
                        chunk = await process.stdout.read(min(chunk_size, remaining))
                        if not chunk:
                            break
                        yield chunk
                        remaining -= len(chunk)
                finally:
                    if process:
                        process.kill()
                        await process.wait()

            return StreamingResponse(
                range_generator(),
                status_code=206,
                media_type="video/mp4",
                headers={
                    "Content-Range": f"bytes {start}-{end}/{file_size}",
                    "Accept-Ranges": "bytes",
                    "Content-Length": str(end - start + 1)
                }
            )
        else:
            # Full stream from beginning
            ffmpeg_cmd = [
                'ffmpeg',
                '-i', file_path,
                '-c:v', 'libx264',
                '-preset', 'fast',
                '-crf', '23',
                '-c:a', 'aac',
                '-b:a', '128k',
                '-f', 'mp4',
                '-movflags', 'frag_keyframe+empty_moov',
                'pipe:1'
            ]

            print(f"Running FFmpeg: {' '.join(ffmpeg_cmd)}")
            process = await asyncio.create_subprocess_exec(
                *ffmpeg_cmd,
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )

            async def video_generator():
                try:
                    while True:
                        chunk = await process.stdout.read(65536)
                        if not chunk:
                            break
                        yield chunk
                finally:
                    if process:
                        process.kill()
                        await process.wait()

            return StreamingResponse(
                video_generator(),
                media_type="video/mp4",
                headers={
                    "Accept-Ranges": "bytes"
                }
            )


    except Exception as e:
        print("error while streaming from a source : ", e)
        if process:
            process.kill()
            await process.wait()
        return {"error": "internal server error while streaming ", "detail": str(e)}

# async def getArchiveSources()