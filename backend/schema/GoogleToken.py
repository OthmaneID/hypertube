from pydantic import BaseModel


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
