from fastapi.requests import Request
from schema.Torrents import SourcesResponse
import httpx2
import redis
from utils.torrents import get_peers, get_trackers, generate_peer_id
import libtorrent as lt
import time



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
    try:
        trackers = await get_trackers()

        print(f"trakers : {trackers}")
        session = lt.session()
        settings = session.get_settings()
        
        settings['listen_interfaces'] = '0.0.0.0:6881' 
        settings['enable_outgoing_utp'] = True
        settings['enable_incoming_utp'] = True
        session.apply_settings(settings)

        info_hash = lt.sha1_hash(bytes.fromhex(hash))

        add_params = lt.add_torrent_params()
        add_params.info_hashes = lt.info_hash_t(info_hash)

        #  we need to change this into streaming
        add_params.save_path = './uploads/torrent'  # Path where data will save
        # add_params.storage_mode = lt.storage_mode_t.storage_mode_sparse
        
        add_params.trackers = trackers


        handle = session.add_torrent(add_params)
        handle.set_sequential_download(True)

        # Monitor the download status loop
        while True:
            status = handle.status()
            print(
                f"\rState: {status.state} | "
                f"Progress: {status.progress * 100:.2f}% | "
                f"Download Speed: {status.download_rate / 1000:.1f} kB/s | "
                f"Peers: {status.num_peers}", 
                end="", flush=True
            )

            if status.is_seeding:
                print("\nDownload Completed !")
                break
            time.sleep(0.5)


    except Exception as e:
        print("error while streaming from a source : ", e)
        return {"error": "internal server error while streaming ", "detail": e}

# async def getArchiveSources()