

from fastapi import Request
from sqlalchemy.orm import Session

from schema.User import UserResponse, UserUpdate
from models.User import User
from utils.auth import hashPass
import bcrypt




def updateUser(request: Request, user_update: UserUpdate,db :Session, user: UserResponse):
    try:
        user_db = db.query(User).filter(User.email == user.email).first()
        user_data = user_update.model_dump(exclude_unset=True)
        for key, value in user_data.items():
            setattr(user_db, key, value)
        db.commit()
        db.refresh(user_db)
        return user_db
    except Exception as e:
        print("[updateUser error]:", e)
        return {"error": "internal server error", "details": str(e)}


def updatePassword(request: Request, old_pass: str, new_pass: str, db: Session, user: UserResponse):
    try:
        user_db = db.query(User).filter(User.id == user.id).first()
        if not user_db:
            return {"error": "user not found"}
        if not bcrypt.checkpw(old_pass.encode("utf-8"), user_db.password.encode("utf-8")):
            return {"error": "Wrong password"}
        user_db.password = hashPass(new_pass)
        db.commit()
        db.refresh(user_db)
        return {"message": "password changed succefully"}
    except Exception as e:
        print("[update password error]: ", e)
        return {"error": "internal server error", "details" : str(e)}


def listFavorites(request: Request, user:UserResponse, db: Session):
    pass



def addFavorite(request: Request, user:UserResponse, db: Session, favorite_id: int, favorite_type: str):
    pass



def deleteFavorite(request: Request, user:UserResponse, db: Session, id: int):
    pass