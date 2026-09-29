from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from database import get_db
from models.Favorites import favoriteTypeEnum
from schema.User import UserResponse
from services.auth import get_current_user

router = APIRouter(prefix="/user")



# @router.



# endpointes : get favorites, add favorite, delete favorite

@router.get("/me")
def get_me(request:Request, user: UserResponse = Depends(get_current_user)):
    return user


@router.get("/favorites")
def get_favorites(request: Request, db : Session = Depends(get_db),  user: UserResponse = Depends(get_current_user)):
    pass

@router.post("/favorites")
def add_favorite(request: Request, favorite_id:int , favorite_type: favoriteTypeEnum ,db: Session = Depends(get_db), user: UserResponse = Depends(get_current_user)):
    pass

@router.delete("/favorites")
def delete_favorite(request: Request, id:int, db : Session = Depends(get_db), user: UserResponse = Depends(get_current_user)):
    pass
