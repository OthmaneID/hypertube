import json
from authlib.integrations.starlette_client import OAuth
from authlib import oauth2
from fastapi import Depends, HTTPException, Request, Response
from redis import Redis
from database import get_db
from config import settings
from schema.User import UserCreate, UserLogin, UserResponse
from schema.GoogleToken import GoogleTokenResponse
from sqlalchemy.orm import Session
import jwt
import bcrypt
from models.User import User, oauthEnum
from models.Token import Token, tokenTypeEnum
import httpx2
from fastapi import responses
from datetime import datetime, timedelta
from pydantic import EmailStr
from utils.emailing import sendEmail
import secrets
import base64
from utils.auth import hashPass, createTokens



# need to put this function in a dependencies folder or similar
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
        async with httpx2.AsyncClient() as client:
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
                    "first_name": user_info.get("given_name", ""),
                    "last_name": user_info.get("family_name", ""),
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
        user_db = db.query(User).filter(User.email == email).first()
        if not user_db:
            return Response(content=json.dumps({"message": "if an account exists, we've sent a link"}), media_type="application/json", status_code=200)
        if user_db.oauth_provider != oauthEnum.EMAIL:
            return Response(content=json.dumps({"message": "if an account exists, we've sent a link"}), media_type="application/json", status_code=200)
        token = secrets.token_hex(32)
        hashed_token = hashPass(token)
        url_safe_token = base64.urlsafe_b64encode(hashed_token.encode()).decode("utf-8")

        # token_db = db.query(Token)
        token_db = Token(hashed_token=hashed_token, user_id=user_db.id, expires_at=datetime.now() + timedelta(hours=1), token_type=tokenTypeEnum.PASSWORD_RESET)
        db.add(token_db)
        db.commit()
        db.refresh(token_db)
        # res = Response()
        reset_link = f"{settings.frontend_url}/reset-password?token={url_safe_token}"
        email_subject = "Password Reset Request"
        email_content = f"Hello {user_db.username},\n\nYou requested a password reset. Please click the link below to reset your password:\n\n{reset_link}\n\nIf you did not request this, please ignore this email.\n\nThank you."
        sendEmail(email=email, subject=email_subject, content=email_content)

    except Exception as e:
        print("[forgot Password error] : ", e)
        return {"error" : "Internal server error", "details": str(e)}

def resetPassword(request: Request, token: str, new_pass: str, db:Session):
    try:
        token = base64.urlsafe_b64decode(token).decode("utf-8")
        token_db = db.query(Token).filter(Token.hashed_token == token).first()
        print(token_db)
        # check if token is expired
        if not token_db or token_db.expires_at < datetime.now():
            return Response(content=json.dumps())
        user_db = token_db.user
        user_db.password = hashPass(new_pass)
        db.delete(token_db)
        db.commit()
        db.refresh(user_db)
        user_db = db.query(User).filter(User.email == user_db.email).first()
        return {"message": "password updated successfully"}
    except Exception as e:
        print("[resetPassword error] : ", e)
        return {"error": "Internal server error", "details": str(e)}