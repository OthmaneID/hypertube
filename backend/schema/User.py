from enum import Enum
from pydantic import AfterValidator, BaseModel, ConfigDict, EmailStr, Field, StringConstraints, model_validator
from typing import Annotated, List
from utils.validation import check_password, PASSWORD_MAX_LENGTH
from models.User import oauthEnum , preferredLanguageEnum


# Names users type themselves; surrounding spaces are dropped before the length check
PersonName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=50)]
Password = Annotated[str, Field(max_length=PASSWORD_MAX_LENGTH), AfterValidator(check_password)]


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
    first_name: PersonName
    last_name: PersonName
    password: Password

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
    first_name: PersonName | None = None
    last_name: PersonName | None = None
    preferred_language : preferredLanguageEnum | None = None

    @model_validator(mode="after")
    def reject_explicit_nulls(self):
        for field_name in self.model_fields_set:
            if getattr(self, field_name) is None:
                raise ValueError(f"{field_name} cannot be null")
        return self