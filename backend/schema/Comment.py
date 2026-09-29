from enum import Enum
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from typing import List
from models.User import oauthEnum , preferredLanguageEnum


class Comments(BaseModel):
    id : int
    movie_id:int
    user_id:int
    content:str
    model_config = ConfigDict(from_attributes=True)
