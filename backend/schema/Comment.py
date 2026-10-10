from pydantic import BaseModel, ConfigDict
from datetime import datetime


# What the client sends in the request body
class CommentCreate(BaseModel):
    content: str


# Nested owner info embedded in each comment response
class CommentOwner(BaseModel):
    id: int
    username: str
    picture: str
    first_name: str
    last_name: str
    model_config = ConfigDict(from_attributes=True)


# What the server returns in the response
class CommentResponse(BaseModel):
    id: int
    movie_id: int
    owner_id: int
    content: str
    created_at: datetime
    updated_at: datetime | None = None
    owner: CommentOwner  # embedded owner info
    model_config = ConfigDict(from_attributes=True)
