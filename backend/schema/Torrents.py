from pydantic import BaseModel, Field, ConfigDict
import enum

class ModesEnum(enum.Enum):
    TV = "tv"
    MOVIE = "movie"

class SourcesRequest(BaseModel):
    mode : ModesEnum
    movie_id : str
    name : str
    Year : str

class sourceElement(BaseModel):
    title : str
    seeds : int # number of users who completed the file download and participating in the file upload
    peers : int # number of users who are still downloading the torrent file
    bytes : int # size of the file
    magnetUrl: str 
    hash : str # a unique fingerprint generated 

    # source : str # where the magnet-link is provided 

class SourcesResponse(BaseModel):
    hits : list[sourceElement]
    total: int
    model_config = ConfigDict(
        extra="ignore",
        from_attributes=True
    )
