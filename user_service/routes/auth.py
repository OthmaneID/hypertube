from fastapi.routing import APIRouter
from fastapi.requests import Request
from schema.User import UserCreate
from database import get_db
from fastapi import Depends
from sqlalchemy.orm import Session
from services.auth import registerUser


router = APIRouter(prefix="/auth")


# i need to use pydantic for type validation later

@router.post("/register")
def register_email(request:Request, user: UserCreate , db: Session = Depends(get_db)):
    # print()
    return registerUser(request=request, user=user, db=db) 
