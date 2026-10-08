import os
import re
import requests
from config import settings
from fastapi import HTTPException

# Ensure subtitles upload directory exists
SUBTITLES_DIR = os.path.join("uploads", "subtitles")
os.makedirs(SUBTITLES_DIR, exist_ok=True)

def srt_to_vtt(srt_content: str) -> str:
    """Converts SRT text to WebVTT text."""
    # Replace the comma in timestamps with a period
    # e.g. 00:00:01,000 --> 00:00:01.000
    vtt_content = re.sub(r'(\d{2}:\d{2}:\d{2}),(\d{3})', r'\1.\2', srt_content)
    return "WEBVTT\n\n" + vtt_content

def get_movie_subtitles(tmdb_id: int):
    api_key = settings.opensubtitles_api_key
    if not api_key:
        print("Warning: OPENSUBTITLES_API_KEY is not set.")
        return []

    headers = {
        "Api-Key": api_key,
        "User-Agent": "HypertubeApp v1.0"
    }

    # Step 1: Search for subtitles in English, Arabic, and French
    search_url = f"https://api.opensubtitles.com/api/v1/subtitles?tmdb_id={tmdb_id}&languages=en,ar,fr"
    try:
        search_res = requests.get(search_url, headers=headers, timeout=10)
        search_res.raise_for_status()
        data = search_res.json()
    except Exception as e:
        print(f"Failed to fetch subtitles metadata: {e}")
        return []

    results = data.get("data", [])
    if not results:
        return []

    # Sort results by download_count descending to ensure we pick the most popular ones
    results.sort(key=lambda x: x.get("attributes", {}).get("download_count", 0), reverse=True)

    # Pick the top downloaded file for each language
    best_files = {}
    for item in results:
        attrs = item.get("attributes", {})
        lang = attrs.get("language", "unknown")
        files = attrs.get("files", [])
        
        # We only want the first (highest downloaded) file per language
        if files and lang in ["en", "ar", "fr"] and lang not in best_files:
            best_files[lang] = files[0].get("file_id")

    available_subtitles = []

    # Step 2: Download, Convert, and Save
    for lang, file_id in best_files.items():
        vtt_filename = f"{tmdb_id}_{lang}.vtt"
        vtt_filepath = os.path.join(SUBTITLES_DIR, vtt_filename)
        vtt_url = f"http://localhost:{settings.backend_port}/uploads/subtitles/{vtt_filename}"
        
        # Check cache: if we already downloaded this file, just return its URL!
        if os.path.exists(vtt_filepath):
            available_subtitles.append({
                "src": vtt_url,
                "srcLang": lang,
                "label": lang.upper(),
                "default": lang == "en" # Make English default
            })
            continue
            
        # Not cached -> Request download link
        try:
            download_req = requests.post(
                "https://api.opensubtitles.com/api/v1/download",
                json={"file_id": file_id},
                headers=headers,
                timeout=10
            )
            download_req.raise_for_status()
            download_data = download_req.json()
            file_url = download_data.get("link")
            
            if file_url:
                # Download the actual file content
                file_content_res = requests.get(file_url, timeout=10)
                file_content_res.raise_for_status()
                raw_content = file_content_res.text
                
                # Convert to VTT (assuming standard SRT return from opensubtitles)
                # Note: Some OpenSubtitles links give direct vtt if requested, but SRT is most common
                if "WEBVTT" not in raw_content:
                    vtt_content = srt_to_vtt(raw_content)
                else:
                    vtt_content = raw_content
                    
                # Save locally
                with open(vtt_filepath, "w", encoding="utf-8") as f:
                    f.write(vtt_content)
                    
                available_subtitles.append({
                    "src": vtt_url,
                    "srcLang": lang,
                    "label": lang.upper(),
                    "default": lang == "en"
                })
        except Exception as e:
            print(f"Error downloading subtitle {file_id}: {e}")

    return available_subtitles
