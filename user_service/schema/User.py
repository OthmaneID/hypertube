from enum import Enum
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from typing import List
from models.User import oauthEnum 


class UserBase(BaseModel):
    username: str = Field(..., min_length=4, max_length=15)
    email: EmailStr
    picture: str = "Default_pfp.svg"
    oauth_provider: oauthEnum = oauthEnum.EMAIL
    favorite_movies: List[int] = []
    favorite_series: List[int] = []


class UserCreate(UserBase):
    password: str = Field(..., min_length=8)


class UserResponse(UserBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


class UserLogin(BaseModel):
    email: EmailStr
    password: str
    model_config = ConfigDict(from_attributes=True)


class GoogleTokenResponse(BaseModel):
    access_token: str
    expires_in: int
    hd: str | None = None
    prompt: str
    token_type: str
    scope: str
    state: str | None = None
    error: str | None = None
    error_description: str | None = None
    error_uri: str | None = None
    scope: str
    state: str | None = None
    error: str | None = None
    error_description: str | None = None
    error_uri: str | None = None

