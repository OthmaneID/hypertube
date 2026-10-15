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
from utils.validation import password_error
import hashlib
from models.User import User, oauthEnum
from models.Token import Token, tokenTypeEnum
import httpx2
from fastapi import responses
from datetime import datetime, timedelta
from pydantic import EmailStr
from utils.emailing import sendEmail
from utils.i18n import get_translation
import secrets
import base64
from urllib.parse import quote
from utils.auth import hashPass, createTokens, refreshToken



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
        except jwt.PyJWTError:
            raise HTTPException(401, "Invalid token")

        user_email = payload.get("user_email")

        if not user_email:
            raise HTTPException(401, "Invalid token")
        redis : Redis = request.app.state.redis
        if redis:
            user = redis.get(user_email)
            if user:
                cached_user = json.loads(user)
                if "is_verified" in cached_user:
                    return UserResponse.model_validate(cached_user)
                redis.delete(user_email)
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


def get_optional_user(request: Request, db: Session = Depends(get_db)) -> UserResponse | None:
    # A logged-out visitor is a normal state, not an error: answering 401 here
    # would print a network error in the browser console on every public page
    try:
        return get_current_user(request, db)
    except HTTPException as e:
        if e.status_code in (401, 404):
            return None
        raise




def sendVerificationEmail(user: User, db: Session):
    db.query(Token).filter(
        Token.user_id == user.id,
        Token.token_type == tokenTypeEnum.EMAIL,
    ).delete(synchronize_session=False)

    raw_token = secrets.token_urlsafe(32)
    token_db = Token(
        hashed_token=hashlib.sha256(raw_token.encode("utf-8")).hexdigest(),
        user_id=user.id,
        expires_at=datetime.now() + timedelta(hours=24),
        token_type=tokenTypeEnum.EMAIL,
    )
    db.add(token_db)
    db.commit()

    verification_link = f"{settings.frontend_url}/verify-email?token={quote(raw_token, safe='')}"
    
    lang = user.preferred_language.value if user.preferred_language else "en"
    subject = get_translation(lang, "verify_subject")
    body = get_translation(lang, "verify_body").format(
        username=user.username,
        link=verification_link,
    )
    email_result = sendEmail(
        email=user.email,
        subject=subject,
        content=body,
    )
    return not (isinstance(email_result, dict) and email_result.get("error"))


def verifyEmail(request: Request, raw_token: str, db: Session):
    token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
    token_db = db.query(Token).filter(
        Token.hashed_token == token_hash,
        Token.token_type == tokenTypeEnum.EMAIL,
    ).first()

    if not token_db:
        raise HTTPException(status_code=400, detail="Invalid or expired verification link")

    user_db = token_db.user
    if token_db.used_at:
        if user_db.is_verified:
            return {
                "message": "Email already verified",
                "user": UserResponse.model_validate(user_db),
            }
        raise HTTPException(status_code=400, detail="Invalid or expired verification link")

    if not token_db.expires_at or token_db.expires_at <= datetime.now():
        raise HTTPException(status_code=400, detail="Invalid or expired verification link")

    user_db.is_verified = True
    token_db.used_at = datetime.now()
    db.commit()
    db.refresh(user_db)

    redis = getattr(request.app.state, "redis", None)
    if redis:
        redis.delete(user_db.email)

    return {
        "message": "Email verified successfully",
        "user": UserResponse.model_validate(user_db),
    }


def resendVerificationEmail(current_user: UserResponse, db: Session):
    user_db = db.query(User).filter(User.id == current_user.id).first()
    if not user_db:
        raise HTTPException(status_code=404, detail="User not found")
    if user_db.oauth_provider != oauthEnum.EMAIL or user_db.is_verified:
        return {"message": "Email verification is not required"}
    if not sendVerificationEmail(user_db, db):
        raise HTTPException(status_code=502, detail="Could not send verification email")
    return {"message": "Verification email sent"}


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

        if oauth_provider == oauthEnum.EMAIL and not sendVerificationEmail(user_db, db):
            return {"error": "Could not send verification email. Sign in to request another link."}

        user_serialized = UserResponse.model_validate(user_db)
        tokens = createTokens(user_serialized.email)
        http_response = Response(media_type="application/json")
        http_response.set_cookie(key="access_token", value=tokens[0], httponly=True, secure=settings.cookie_secure, samesite="lax")
        http_response.set_cookie(key="refresh_token", value=tokens[1], httponly=True, secure=settings.cookie_secure, samesite="lax")

        return http_response
    except Exception as e:
        print(e)
        return {"error": "Internal server error", "details": str(e)}




def loginEmail(request: Request, user: UserLogin, db:Session):
    try:
        if not user.email or not user.password:
            return {"error": "email/password is not correct"}
        user_db = db.query(User).filter(User.email == user.email).first()
        if not user_db:
            return {"error": "email/password is not correct"}
        check_pass = bcrypt.checkpw(password=user.password.encode("utf-8"), hashed_password=user_db.password.encode("utf-8"))
        if not check_pass or user_db.oauth_provider != oauthEnum.EMAIL:
            return {"error": "email/password is not correct"}
        user_serialized = UserResponse.model_validate(user_db)
        tokens = createTokens(user_serialized.email)

        http_response = Response(media_type="application/json")
        http_response.set_cookie(key="access_token", value=tokens[0], httponly=True, secure=settings.cookie_secure, samesite="lax")
        http_response.set_cookie(key="refresh_token", value=tokens[1], httponly=True, secure=settings.cookie_secure, samesite="lax")
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
                    "picture": user_info["picture"],
                    "is_verified": True,
                }
                user = User(**user_data)
                db.add(user)
                db.commit()
                db.refresh(user)
                user_serialized = UserResponse.model_validate(user)
            else:
                user_db.is_verified = True
                db.commit()
                db.refresh(user_db)
                user_serialized = UserResponse.model_validate(user_db)
            redis = getattr(request.app.state, "redis", None)
            if redis:
                redis.delete(user_serialized.email)
            tokens = createTokens(user_serialized.email)
            http_response = Response(media_type="application/json")
            http_response.set_cookie(key="access_token", value=tokens[0], httponly=True, secure=settings.cookie_secure, samesite="lax")
            http_response.set_cookie(key="refresh_token", value=tokens[1], httponly=True, secure=settings.cookie_secure, samesite="lax")
            return http_response
    except Exception as e:
        print("error while googleLogin : ", e)
        return {"error": "Internal server error", "details": str(e)}


async def getFortyTwoData(code:str): 
    async with httpx2.AsyncClient() as client:
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
            "picture": user_info["image"]["link"],
            "is_verified": True,
        }

        user_db = db.query(User).filter(User.email == user_data["email"]).first()
        if not user_db:
            user = User(**user_data)
            db.add(user)
            db.commit()
            db.refresh(user)
            user_serialized = UserResponse.model_validate(user)
        else:
            user_db.is_verified = True
            db.commit()
            db.refresh(user_db)
            user_serialized = UserResponse.model_validate(user_db)
        redis = getattr(request.app.state, "redis", None)
        if redis:
            redis.delete(user_serialized.email)
        tokens = createTokens(user_serialized.email)
        response = responses.RedirectResponse(url=f"{settings.frontend_url}/signin")
        response.set_cookie(key="access_token", value=tokens[0], httponly=True, secure=settings.cookie_secure, samesite="lax")
        response.set_cookie(key="refresh_token", value=tokens[1], httponly=True, secure=settings.cookie_secure, samesite="lax")
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
        
        lang = user_db.preferred_language.value if user_db.preferred_language else "en"
        subject = get_translation(lang, "reset_subject")
        body = get_translation(lang, "reset_body").format(
            username=user_db.username,
            link=reset_link,
        )
        sendEmail(email=email, subject=subject, content=body)

    except Exception as e:
        print("[forgot Password error] : ", e)
        return {"error" : "Internal server error", "details": str(e)}

def resetPassword(request: Request, token: str, new_pass: str, db:Session):
    try:
        token = base64.urlsafe_b64decode(token).decode("utf-8")
        token_db = db.query(Token).filter(
            Token.hashed_token == token,
            Token.token_type == tokenTypeEnum.PASSWORD_RESET,
            Token.used_at.is_(None),
        ).first()
        print(token_db)
        # check if token is expired
        if not token_db or not token_db.expires_at or token_db.expires_at <= datetime.now():
            return Response(content=json.dumps({"error": "Invalid or expired token"}), media_type="application/json", status_code=400)
        weak = password_error(new_pass)
        if weak:
            return Response(content=json.dumps({"error": weak}), media_type="application/json", status_code=400)
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