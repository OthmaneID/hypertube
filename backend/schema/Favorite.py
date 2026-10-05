from pydantic import BaseModel, Field
from models.Favorites import favoriteTypeEnum


class FavoritesResponse(BaseModel):
    favorite_id: int
    favorite_type: favoriteTypeEnum
    created_at: str


class FavoritesCreate(BaseModel):
    favorite_id: int = Field(..., gt= 0)
    favorite_type: favoriteTypeEnum

