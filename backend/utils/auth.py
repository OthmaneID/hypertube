from datetime import datetime
from fastapi import Request, Response, HTTPException
import jwt
import bcrypt
from config import settings


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
        response.set_cookie(key="access_token", value=tokens[0], httponly=True, secure=settings.cookie_secure, samesite="lax")
        response.set_cookie(key="refresh_token", value=tokens[1], httponly=True, secure=settings.cookie_secure, samesite="lax")
        return response
    except jwt.PyJWTError as e:
        print("JWT error : ", e)
        raise HTTPException(401, "Invalid or expired refresh token")
    except Exception as e:
        print("error while refreshing token : ", e)
        raise HTTPException(500, "Internal server error")

