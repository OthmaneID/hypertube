import json
from authlib.integrations.starlette_client import OAuth
from authlib import oauth2
from fastapi import Depends, HTTPException, Request, Response
from database import get_db
from config import settings
from schema.User import GoogleTokenResponse, UserCreate, UserLogin, UserResponse
from sqlalchemy.orm import Session
import jwt
import bcrypt
from models.User import User, oauthEnum
import httpx
from fastapi import responses
from datetime import datetime

def hashPass(password: str) -> str:

    salt = bcrypt.gensalt()

    hashed_pass = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed_pass.decode("utf-8")

def createTokens(user: UserResponse):
    
    payload = {
        "user_email": user.email,
        "exp": datetime.now().timestamp() + settings.jwt_expiration
    }

    access_token = jwt.encode(payload, settings.jwt_secret, algorithm="HS256")
    
    refresh_payload = {
        "user_email": user.email,
        "exp" : datetime.now().timestamp() + settings.jwt_refresh_expiration
    }
    refresh_token = jwt.encode(refresh_payload, settings.jwt_secret, algorithm="HS256")
    return access_token, refresh_token
    

def get_current_user(request:Request, db:Session = Depends(get_db)):
    try:
        access_token = request.cookies.get("access_token")
        if not access_token:
            raise HTTPException(401, "No access token found")
        payload = jwt.decode(access_token, settings.jwt_secret, algorithms=["HS256"])
        user_email = payload.get("user_email")
        if not user_email:
            raise HTTPException(401, "Invalid token")
        user = db.query(User).filter(User.email == user_email).first()
        if not user:
            raise HTTPException(404, "User not found")
        user_serialized = UserResponse.model_validate(user)
        print("current user : ", user_serialized.model_dump())
        return user_serialized
    except jwt.PyJWTError as e:
        print("JWT error : ", e)
        raise HTTPException(401, "Invalid or expired session")
    except Exception as e:
        print("Exception : ", e)
        raise HTTPException(500, "Internal server error")




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
        http_response = Response(media_type="application/json")
        http_response.set_cookie(key="access_token", value=tokens[0], httponly=True, secure=True, samesite="lax")
        return http_response
        # payload = {
        #     "access_token": tokens[0],
        #     "user": user_serialized
        # }
        # later save refresh token in the db so when requested it can be sent
        return payload
    except Exception as e:
        print(e)
        return {"error": "Internal server error", "details": str(e)}




def loginEmail(request: Request, user: UserLogin, db:Session):
    try:
        user_db : User = db.query(User).filter(User.email == user.email).first()
        if not user_db:
            return {"error": "email/password is not correct"}
        check_pass = bcrypt.checkpw(password=user.password.encode("utf-8"), hashed_password=user_db.password.encode("utf-8"))
        if not check_pass or user_db.oauth_provider != oauthEnum.EMAIL:
            return {"error": "email/password is not correct"}
        user_serialized = UserResponse.model_validate(user_db)
        tokens = createTokens(user_serialized)

        http_response = Response(media_type="application/json")
        http_response.set_cookie(key="access_token", value=tokens[0], httponly=True, secure=True, samesite="lax")
        return http_response
        # payload = {
        #     "access_token": tokens[0],
        #     "user": user_serialized
        # }
        # return payload
    except Exception as e:
        print(f"error while login: {e}")
        return {"error": "Internal server error", "details": str(e)}


async def googleLogin(request: Request, token: GoogleTokenResponse, db: Session, google_auth: OAuth):
    try:
        async with httpx.AsyncClient() as client:
            res = await client.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={"Authorization": f"Bearer {token.access_token}"}
            )
            if res.status_code != 200:
                return {"error": "Invalid token"}
            user_info = res.json()
            user_db = db.query(User).filter(User.email == user_info["email"]).first()
            if not user_db:
                user_data = {
                    "email": user_info["email"],
                    "username": user_info["name"],
                    "oauth_provider": oauthEnum.GOOGLE,
                    "picture": user_info["picture"]
                }
                user = User(**user_data)
                db.add(user)
                db.commit()
                db.refresh(user)
                user_serialized = UserResponse.model_validate(user)
            else:
                user_serialized = UserResponse.model_validate(user_db)
            tokens = createTokens(user_serialized)
            print("tokens : ", tokens)
            http_response = Response(media_type="application/json")
            http_response.set_cookie(key="access_token", value=tokens[0], httponly=True, secure=True, samesite="lax")
            return http_response
            # payload = {
            #     "access_token": tokens[0],
            #     "user": user_serialized
            # }
            # return payload
    except Exception as e:
        print("error while googleLogin : ", e)
        return {"error": "Internal server error", "details": str(e)}


async def getFortyTwoData(code:str): 
    async with httpx.AsyncClient() as client:
        res = await client.post("https://api.intra.42.fr/oauth/token", data={
            "client_id": settings.forty_two_client_id,
            "client_secret": settings.forty_two_client_secret,
            "code": code,
            "redirect_uri": settings.forty_two_redirect_uri,
            "grant_type": "authorization_code"
        })
        if res.status_code != 200:
            return {"error": "Invalid token"}
        token = res.json()
        print("42 token: ", token)
        res = await client.get("https://api.intra.42.fr/v2/me", headers={
            "Authorization": f"Bearer {token['access_token']}"
        })
        print("42 user: ", res.json())
        return res.json()



async def fortyTwoLogin(request:Request, code:str, state:str, db:Session):
    try:
        user_info = await getFortyTwoData(code)
        user_data = {
            "username": user_info["login"],
            "email": user_info["email"],
            "oauth_provider": oauthEnum.FORTY_TWO,
            "picture": user_info["image"]["link"]
        }

        user_db = db.query(User).filter(User.email == user_data["email"]).first()
        if not user_db:
            user = User(**user_data)
            db.add(user)
            db.commit()
            db.refresh(user)
            user_serialized = UserResponse.model_validate(user)
        else:
            user_serialized = UserResponse.model_validate(user_db)
        tokens = createTokens(user_serialized)
        print("42 user data: ", user_data)
        # payload = {
        #         "access_token": tokens[0],
        #         "user": user_serialized
        #     }
        response = responses.RedirectResponse(url=f"{settings.frontend_url}/signin")
        response.set_cookie(key="access_token", value=tokens[0], httponly=True, secure=True, samesite="lax")
        return response
    except Exception as e:
        print("error while login using 42: ", e)
        return {"error" : "Internal server error", "details": str(e)}