from enum import Enum
from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator
from typing import List
from models.User import oauthEnum , preferredLanguageEnum


class UserBase(BaseModel):
    username: str = Field(..., min_length=4, max_length=50)
    first_name: str 
    last_name: str 
    preferred_language : preferredLanguageEnum = preferredLanguageEnum.EN
    email: EmailStr
    picture: str = "/uploads/default/Default_pfp.svg"
    oauth_provider: oauthEnum = oauthEnum.EMAIL
    favorite_movies: List[int] = []
    favorite_series: List[int] = []


class UserCreate(UserBase):
    password: str = Field(..., min_length=8)

# class UserUpdate(UserBase):
#     pass

class UserResponse(UserBase):
    id: int
    is_verified: bool
    model_config = ConfigDict(from_attributes=True)


class UserLogin(BaseModel):
    email: EmailStr
    password: str
    model_config = ConfigDict(from_attributes=True)

class UserUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    username: str | None = Field(default=None, min_length=4, max_length=50)
    first_name: str | None = None
    last_name: str | None = None
    preferred_language : preferredLanguageEnum | None = None

    @model_validator(mode="after")
    def reject_explicit_nulls(self):
        for field_name in self.model_fields_set:
            if getattr(self, field_name) is None:
                raise ValueError(f"{field_name} cannot be null")
        return self