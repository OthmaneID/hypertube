import json
from authlib.integrations.starlette_client import OAuth
from authlib import oauth2
from fastapi import Depends, HTTPException, Request, Response
from redis import Redis
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
from pydantic import EmailStr

def hashPass(password: str) -> str:

    salt = bcrypt.gensalt()

    hashed_pass = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed_pass.decode("utf-8")

def createTokens(user_email: str):
    
    payload = {
        "user_email": user_email,
        "exp": datetime.now().timestamp() + settings.jwt_expiration
    }

    access_token = jwt.encode(payload, settings.jwt_secret, algorithm="HS256")
    
    refresh_payload = {
        "user_email": user_email,
        "exp" : datetime.now().timestamp() + settings.jwt_refresh_expiration
    }
    refresh_token = jwt.encode(refresh_payload, settings.jwt_secret, algorithm="HS256")
    return access_token, refresh_token
    
def refreshToken(request: Request):
    try:
        refresh_token = request.cookies.get("refresh_token")
        if not refresh_token:
            raise HTTPException(401, "No refresh token found")
        token = jwt.decode(refresh_token, settings.jwt_secret, algorithms=["HS256"])
        user_email = token.get("user_email")
        if not user_email:
            raise HTTPException(401, "Invalid refresh token")
        tokens = createTokens(user_email)
        response = Response(media_type="application/json")
        response.set_cookie(key="access_token", value=tokens[0], httponly=True, secure=True, samesite="lax")
        response.set_cookie(key="refresh_token", value=tokens[1], httponly=True, secure=True, samesite="lax")
        return response
    except jwt.PyJWTError as e:
        print("JWT error : ", e)
        raise HTTPException(401, "Invalid or expired refresh token")
    except Exception as e:
        print("error while refreshing token : ", e)
        raise HTTPException(500, "Internal server error")

def get_current_user(request:Request, db:Session = Depends(get_db)):
    try:
        access_token = request.cookies.get("access_token")
        if not access_token:
            raise HTTPException(401, "No access token found")
        
        token_refreshed = False
        new_tokens = None
        
        try:
            payload = jwt.decode(access_token, settings.jwt_secret, algorithms=["HS256"])
        except jwt.ExpiredSignatureError:
            refresh_token = request.cookies.get("refresh_token")
            if not refresh_token:
                raise HTTPException(401, "No refresh token found")
            
            try:
                refresh_payload = jwt.decode(refresh_token, settings.jwt_secret, algorithms=["HS256"])
                user_email = refresh_payload.get("user_email")
                if not user_email:
                    raise HTTPException(401, "Invalid refresh token")
                
                new_access_token, new_refresh_token = createTokens(user_email)
                new_tokens = {
                    "access_token": new_access_token,
                    "refresh_token": new_refresh_token
                }
                token_refreshed = True
                payload = {"user_email": user_email}
            except jwt.PyJWTError:
                raise HTTPException(401, "Invalid or expired refresh token")
        
        user_email = payload.get("user_email")

        if not user_email:
            raise HTTPException(401, "Invalid token")
        redis : Redis = request.app.state.redis
        if redis:
            user = redis.get(user_email)
            if user:
                return user
        user = db.query(User).filter(User.email == user_email).first()
        if not user:
            raise HTTPException(404, "User not found")
        user_serialized = UserResponse.model_validate(user)
        if redis:
            redis.setex(user_email, 60 * 60 * 24, user_serialized.model_dump_json())
        request.state.token_refreshed = token_refreshed
        request.state.new_tokens = new_tokens
        
        return user_serialized
    except HTTPException:
        raise
    except Exception as e:
        print("Exception : ", e)
        raise HTTPException(500, "Internal server error")




def registerUser(request: Request, user: UserCreate, db: Session, oauth_provider: oauthEnum = oauthEnum.EMAIL):
    try:
        usr = db.query(User).filter(User.email == user.email).first()
        if usr:
            return {"error": "email already exists"}
        user_data = user.model_dump(exclude={"favorite_movies", "favorite_series"})
        if oauth_provider == oauthEnum.EMAIL:
            user_data["password"] = hashPass(user_data["password"])
        user_data["oauth_provider"] = oauth_provider
        user_db = User(**user_data)

        db.add(user_db)
        db.commit()
        db.refresh(user_db)

        user_serialized = UserResponse.model_validate(user_db)
        tokens = createTokens(user_serialized.email)
        http_response = Response(media_type="application/json")
        http_response.set_cookie(key="access_token", value=tokens[0], httponly=True, secure=True, samesite="lax")
        http_response.set_cookie(key="refresh_token", value=tokens[1], httponly=True, secure=True, samesite="lax")

        return http_response
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
        tokens = createTokens(user_serialized.email)

        http_response = Response(media_type="application/json")
        http_response.set_cookie(key="access_token", value=tokens[0], httponly=True, secure=True, samesite="lax")
        http_response.set_cookie(key="refresh_token", value=tokens[1], httponly=True, secure=True, samesite="lax")
        return http_response
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
            tokens = createTokens(user_serialized.email)
            http_response = Response(media_type="application/json")
            http_response.set_cookie(key="access_token", value=tokens[0], httponly=True, secure=True, samesite="lax")
            return http_response
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
            print("res.status_code: ", res.status_code)
            raise Exception({"error": "Invalid token", "status_code": res.status_code})
        token = res.json()
        res = await client.get("https://api.intra.42.fr/v2/me", headers={
            "Authorization": f"Bearer {token['access_token']}"
        })
        return res.json()



async def fortyTwoLogin(request:Request, code:str, state:str, db:Session):
    try:
        user_info = await getFortyTwoData(code)
        user_data = {
            "username": user_info["login"],
            "first_name": user_info["first_name"],
            "last_name": user_info["last_name"],
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
        tokens = createTokens(user_serialized.email)
        response = responses.RedirectResponse(url=f"{settings.frontend_url}/signin")
        response.set_cookie(key="access_token", value=tokens[0], httponly=True, secure=True, samesite="lax")
        response.set_cookie(key="refresh_token", value=tokens[1], httponly=True, secure=True, samesite="lax")
        return response
    except Exception as e:
        print("error while login using 42: ", e)
        return {"error" : "Internal server error", "details": str(e)}


def forgotPassword(request: Request, email: EmailStr, db : Session):
    try:
        pass
    except Exception as e:
        print("[forgot Password error] : ", e)
        return {"error" : "Internal server error", "details": str(e)}
