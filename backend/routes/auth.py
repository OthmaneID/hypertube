from fastapi.routing import APIRouter
from fastapi.requests import Request
from fastapi.responses import RedirectResponse
from schema.User import GoogleTokenResponse, UserCreate, UserLogin, UserResponse
from database import get_db
from fastapi import Depends, Response
from sqlalchemy.orm import Session
from services.auth import googleLogin, loginEmail, registerUser, fortyTwoLogin, get_current_user, refreshToken
import json
from config import settings
from urllib.parse import quote


router = APIRouter(prefix="/auth")

@router.post("/register")
def register_email(request:Request, user: UserCreate , db: Session = Depends(get_db)):
    # print()
    return registerUser(request=request, user=user, db=db) 

@router.post("/login")
def login_email(request:Request, user: UserLogin , db: Session = Depends(get_db)):
    return loginEmail(request, user, db)

@router.post("/google")
async def google_login(request: Request, token: GoogleTokenResponse, db: Session = Depends(get_db)):
    oauth = request.app.state.oauth
    return await googleLogin(request, token, db, oauth)


@router.get("/redirect/42")
def fourty_two_login_redirect(request: Request):
    encoded_redirect_uri = quote(settings.forty_two_redirect_uri, safe="")
    
    return RedirectResponse(f"https://api.intra.42.fr/oauth/authorize?client_id={settings.forty_two_client_id}&redirect_uri={encoded_redirect_uri}&response_type=code&scope=public&state=RANDOM_STRING")

@router.get("/42")
async def forty_two_login(request: Request, code:str, state: str, db: Session = Depends(get_db)):
    return await fortyTwoLogin(request, code, state, db)


@router.get("/me")
def me(request: Request, user:UserResponse = Depends(get_current_user)):
    return user

@router.post("/refresh")
def refresh_token(request: Request):
    return refreshToken(request)

@router.post("/logout")
def logout(request: Request):
    response = Response(content=json.dumps({"message": "Logged out successfully"}), media_type="application/json")
    response.delete_cookie(key="access_token")
    return response
