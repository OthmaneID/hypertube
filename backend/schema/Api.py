from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "Bearer"
    expires_in: int


class ApiUserListItem(BaseModel):
    id: int
    username: str


class ApiUser(BaseModel):
    id: int
    username: str
    picture_url: str
    # Only filled in for the profile owner
    email: str | None = None


class ApiUserUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    username: str | None = Field(default=None, min_length=4, max_length=50)
    email: EmailStr | None = None
    password: str | None = Field(default=None, min_length=8, max_length=128)
    picture_url: str | None = Field(default=None, max_length=2048)

    @field_validator("picture_url")
    @classmethod
    def check_picture_url(cls, value: str | None):
        if value is None:
            return value
        if not value.startswith(("http://", "https://", "/uploads/profile_pictures/")):
            raise ValueError("picture_url must be an http(s) URL or an uploaded profile picture")
        return value

    @model_validator(mode="after")
    def check_fields(self):
        for field_name in self.model_fields_set:
            if getattr(self, field_name) is None:
                raise ValueError(f"{field_name} cannot be null")
        if not self.model_fields_set:
            raise ValueError("at least one field is required")
        return self


class ApiMovieListItem(BaseModel):
    id: int
    name: str


class ApiMovie(BaseModel):
    id: int
    name: str
    rating: float | None = None
    year: int | None = None
    # Minutes
    length: int | None = None
    # Language codes, e.g. ["en", "fr"]
    subtitles: list[str]
    comments_count: int


class ApiComment(BaseModel):
    id: int
    comment: str
    author_username: str
    date: datetime
    movie_id: int


class ApiMovieCommentCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    comment: str = Field(min_length=1, max_length=2000)

    @field_validator("comment")
    @classmethod
    def strip_comment(cls, value: str):
        value = value.strip()
        if not value:
            raise ValueError("comment cannot be empty")
        return value


class ApiCommentCreate(ApiMovieCommentCreate):
    movie_id: int = Field(gt=0)


class ApiCommentUpdate(ApiMovieCommentCreate):
    # Optional; when given it must be the author's username
    username: str | None = None


class ApiClientCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=100)


class ApiClientResponse(BaseModel):
    id: int
    name: str
    client_id: str
    created_at: datetime
    last_used_at: datetime | None = None
    model_config = ConfigDict(from_attributes=True)


class ApiClientCreated(ApiClientResponse):
    client_secret: str
