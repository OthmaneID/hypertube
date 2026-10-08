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
