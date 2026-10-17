from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any

class BehaviorHints(BaseModel):
    bingeGroup: Optional[str] = None
    filename: Optional[str] = None

class StreamElement(BaseModel):
    name: str
    title: str
    infoHash: str
    fileIdx: Optional[int] = None
    behaviorHints: Optional[BehaviorHints] = None
    sources: Optional[List[str]] = None

class SourcesResponse(BaseModel):
    streams: List[StreamElement]
    cacheMaxAge: int = 3600
    staleRevalidate: int = 14400
    staleError: int = 604800
    # Set when the provider could not be reached; streams is then empty
    error: Optional[str] = None


class EmbeddedSubtitle(BaseModel):
    src: str
    srcLang: str
    label: str
    default: bool = False
    source: str = "embedded"


class EmbeddedSubtitlesResponse(BaseModel):
    # Embedded tracks are spread over the whole file, so they can only be read once it is fully downloaded
    pending: bool
    tracks: List[EmbeddedSubtitle] = []


class StreamInfoResponse(BaseModel):
    transcoded: bool
    # Seconds, from ffprobe; only known for transcoded streams
    duration: Optional[float] = None
    # Seconds the transcoded stream will really start at for the requested ?start= (snapped to a keyframe)
    start: float = 0
