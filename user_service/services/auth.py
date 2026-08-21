from fastapi import Depends, Request
from database import get_db
from config import settings
from schema.User import UserCreate, UserResponse
from sqlalchemy.orm import Session
import jwt
import bcrypt
from models.User import User, oauthEnum


def hashPass(password: str) -> str:
    password_byte = password.encode(encoding='utf-8')

    salt = bcrypt.gensalt()

    hashed_pass = bcrypt.hashpw(password=password_byte, salt=salt)
    return hashed_pass.decode(encoding='utf-8')

def verifyPass(password: str, hashed_pass: str) -> bool:
    return bcrypt.checkpw(password.encode(encoding='utf-8'), hashed_pass.encode(encoding='utf-8'))

def createTokens(user: UserResponse):
    
    payload = {
        "exp": settings.jwt_expiration,
        "user": user.model_dump()
    }

    access_token = jwt.encode(payload, settings.jwt_secret, algorithm="HS256")
    
    refresh_payload = {
        
    }
    return access_token, None
    



def registerUser(request: Request, user: UserCreate, db: Session, oauth_provider: oauthEnum = oauthEnum.EMAIL) -> UserResponse:
    try:
        user_data = user.model_dump()
        if oauth_provider == oauthEnum.EMAIL:
            user_data["password"] = hashPass(user_data["password"])
        user_data["oauth_provider"] = oauth_provider
        db_user = User(**user_data)
        db.add(db_user)
        db.commit()
        db.refresh(db_user)

        return db_user
    except Exception as e:
        print(f"error : {e}")

# def loginUser(request: Request, user: User):pass