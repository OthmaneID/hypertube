from fastapi.routing import APIRouter
from fastapi import Depends
from fastapi.requests import Request
from sqlalchemy.orm import Session
from database import get_db
from services.auth import get_current_user
from services.Comments import AddComment, getComments

router = APIRouter(prefix="/comments")


@router.get("/{movie_id}")
def get_comments(movie_id: int, limit: int = 20, offset: int = 0, db: Session = Depends(get_db)):
    return getComments(movie_id=movie_id, limit=limit, offset=offset, db=db)


@router.post("/{movie_id}")
def add_comment(movie_id: int, content: str, request: Request, db: Session = Depends(get_db), user=Depends(get_current_user)):
    return AddComment(comment=content, owner_id=user.id, movie_id=movie_id, db=db)
