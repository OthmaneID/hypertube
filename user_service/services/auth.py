from fastapi import Depends, Request
from database import get_db
from config import settings
from schema.User import UserCreate, UserLogin, UserResponse
from sqlalchemy.orm import Session
import jwt
import bcrypt
from models.User import User, oauthEnum


def hashPass(password: str) -> str:

    salt = bcrypt.gensalt()

    hashed_pass = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed_pass.decode("utf-8")

def createTokens(user: UserResponse):
    
    payload = {
        "exp": settings.jwt_expiration,
        "user": user.model_dump()
    }

    access_token = jwt.encode(payload, settings.jwt_secret, algorithm="HS256")
    
    refresh_payload = {
        "user" : user.model_dump(),
        "exp" : settings.jwt_refresh_expiration
    }
    refresh_token = jwt.encode(refresh_payload, settings.jwt_secret, algorithm="HS256")
    return access_token, refresh_token
    



def registerUser(request: Request, user: UserCreate, db: Session, oauth_provider: oauthEnum = oauthEnum.EMAIL):
    try:
        usr = db.query(User).filter(User.email == user.email).first()
        if usr:
            return {"error": "email already exists"}
        user_data = user.model_dump()
        if oauth_provider == oauthEnum.EMAIL:
            user_data["password"] = hashPass(user_data["password"])
        user_data["oauth_provider"] = oauth_provider
        user_db = User(**user_data)

        db.add(user_db)
        db.commit()
        db.refresh(user_db)

        user_serialized = UserResponse.model_validate(user_db)
        tokens = createTokens(user_serialized)
        payload = {
            "access_token": tokens[0],
            "user": user_serialized
        }
        # later save refresh token in the db so when requested it can be sent
        return payload
    except Exception as e:
        print(e)
        return {"error": "Internal server error", "details": str(e)}



def loginEmail(request: Request, user: UserLogin, db:Session):
    try:
        user_db = db.query(User).filter(User.email == user.email).first()
        if not user_db:
            return {"error": "email/password is not correct"}
        check_pass = bcrypt.checkpw(password=user.password.encode("utf-8"), hashed_password=user_db.password.encode("utf-8"))
        if not check_pass or user_db.oauth_provider != oauthEnum.EMAIL:
            return {"error": "email/password is not correct"}
        user_serialized = UserResponse.model_validate(user_db)
        tokens = createTokens(user_serialized)
        payload = {
            "access_token": tokens[0],
            "user": user_serialized
        }
        return payload
    except Exception as e:
        print(f"error while login: {e}")
        return {"error": "Internal server error", "details": str(e)}
