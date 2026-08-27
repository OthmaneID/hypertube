

from fastapi import Request
from sqlalchemy.orm import Session

from user_service.schema.User import UserResponse


def listFavorites(request: Request, user:UserResponse, db: Session):
    pass



def addFavorite(request: Request, user:UserResponse, db: Session, favorite_id: int, favorite_type: str):
    pass



def deleteFavorite(request: Request, user:UserResponse, db: Session, id: int):
    pass