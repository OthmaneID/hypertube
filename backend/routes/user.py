from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from database import get_db
from models.Favorites import favoriteTypeEnum
from schema.User import UserResponse, UserUpdate
from services.auth import get_current_user
from services.user import updatePassword, updateUser
from fastapi import Body

router = APIRouter(prefix="/user")



# @router.



# endpointes : get favorites, add favorite, delete favorite

@router.get("/me")
def get_me(request:Request, user: UserResponse = Depends(get_current_user)):
    return user

@router.patch("/me")
def update_user(request: Request, user_update: UserUpdate ,db: Session = Depends(get_db), user: UserResponse = Depends(get_current_user)):
    return updateUser(request, user_update, db, user)

@router.patch("/password-change")
def update_password(request: Request, old_pass: str = Body(embeded=True), new_pass: str = Body(embed=True), user: UserResponse = Depends(get_current_user), db: Session=Depends(get_db)):
    return updatePassword(request, old_pass, new_pass, user=user, db=db)

@router.get("/favorites")
def get_favorites(request: Request, db : Session = Depends(get_db),  user: UserResponse = Depends(get_current_user)):
    pass

@router.post("/favorites")
def add_favorite(request: Request, favorite_id:int , favorite_type: favoriteTypeEnum ,db: Session = Depends(get_db), user: UserResponse = Depends(get_current_user)):
    pass

@router.delete("/favorites")
def delete_favorite(request: Request, id:int, db : Session = Depends(get_db), user: UserResponse = Depends(get_current_user)):
    pass
