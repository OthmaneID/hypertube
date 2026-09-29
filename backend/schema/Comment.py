from pydantic import BaseModel, ConfigDict
from datetime import datetime


# What the client sends in the request body
class CommentCreate(BaseModel):
    content: str


# What the server returns in the response
class CommentResponse(BaseModel):
    id: int
    movie_id: int
    owner_id: int
    content: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)
