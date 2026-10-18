from fastapi import APIRouter, Depends, Request, Response, UploadFile, File
from sqlalchemy.orm import Session

from database import get_db
from models.Favorites import favoriteTypeEnum
from schema.User import UserResponse, UserUpdate
from schema.Favorite import FavoritesCreate
from services.auth import get_current_user
from services.user import updatePassword, updateUser, uploadProfilePicture, getUser, addFavorite, deleteFavorite, updateEmail
from services.api import listApiClients, createApiClient, revokeApiClient
from schema.Api import ApiClientCreate, ApiClientCreated, ApiClientResponse
from fastapi import Body
from pydantic import EmailStr

router = APIRouter(prefix="/user")



# @router.



# endpointes : get favorites, add favorite, delete favorite

@router.get("/me")
def get_me(request:Request, user: UserResponse = Depends(get_current_user)):
    return user

# Declared before /{user_id}, which would otherwise capture "api-clients"
@router.get("/api-clients", response_model=list[ApiClientResponse])
def list_api_clients(db: Session = Depends(get_db), user: UserResponse = Depends(get_current_user)):
    return listApiClients(user, db)

@router.post("/api-clients", response_model=ApiClientCreated, status_code=201)
def create_api_client(body: ApiClientCreate, db: Session = Depends(get_db), user: UserResponse = Depends(get_current_user)):
    return createApiClient(body.name, user, db)

@router.delete("/api-clients/{client_pk}", status_code=204)
def revoke_api_client(client_pk: int, db: Session = Depends(get_db), user: UserResponse = Depends(get_current_user)):
    revokeApiClient(client_pk, user, db)
    return Response(status_code=204)

@router.get("/{user_id}")
def get_user(request:Request, user_id:int, db: Session = Depends(get_db), user: UserResponse = Depends(get_current_user)):
    return getUser(request, user_id, db, user)

@router.patch("/me")
def update_user(request: Request, user_update: UserUpdate ,db: Session = Depends(get_db), user: UserResponse = Depends(get_current_user)):
    return updateUser(request, user_update, db, user)

@router.patch("/password-change")
def update_password(request: Request, old_pass: str = Body(embed=True), new_pass: str = Body(embed=True), user: UserResponse = Depends(get_current_user), db: Session=Depends(get_db)):
    return updatePassword(request, old_pass, new_pass, user=user, db=db)

@router.patch("/me/picture")
async def update_picture(request: Request, file: UploadFile = File(...), user: UserResponse = Depends(get_current_user), db: Session=Depends(get_db)):
    """
    Upload and update user profile picture.
    
    Accepts an image file (jpg, jpeg, png, gif, webp) with max size 5MB.
    Returns the updated user object with the new picture path.
    """
    return await uploadProfilePicture(request, file, db, user)

@router.get("/favorites")
def get_favorites(request: Request, favorite_type : favoriteTypeEnum, db : Session = Depends(get_db),  user: UserResponse = Depends(get_current_user)):
    pass

@router.post("/favorites")
def add_favorite(request: Request, favorite_create: FavoritesCreate, db: Session = Depends(get_db), user: UserResponse = Depends(get_current_user)):
    """
    """
    return addFavorite(request, favorite_create, user, db)

@router.delete("/favorites")
def delete_favorite(request: Request, favorite_create: FavoritesCreate, db : Session = Depends(get_db), user: UserResponse = Depends(get_current_user)):
    return deleteFavorite(request, user, db, favorite_create)

@router.patch("/email")
def update_email(request: Request, email:EmailStr = Body(embed=True), db:Session = Depends(get_db), user: UserResponse = Depends(get_current_user)):
    return updateEmail(request, email, db, user)