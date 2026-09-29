from sqlalchemy.orm import Session
from models.Comment import Comment
from fastapi import HTTPException




def AddComment(comment: str, owner_id: int, movie_id: int, db: Session):
    try:
        comment_obj = Comment(content=comment, owner_id=owner_id, movie_id=movie_id)
        db.add(comment_obj)
        db.commit()
        db.refresh(comment_obj)
        return comment_obj
    except Exception as e:
        db.rollback()
        print(f"error while adding comment: {e}")
        raise HTTPException(500, "error while adding comment")
        


def getComments(movie_id: int, limit: int, offset: int, db: Session):
    try:
        if limit <= 0:
            limit = 40
        if offset < 0:
            offset = 0
        comments = db.query(Comment).filter(Comment.movie_id == movie_id).order_by(Comment.id.desc()).limit(limit).offset(offset).all()
        if not comments:
            return []
        return comments
    except Exception as e:
        print(f"error while getting comments: {e}")
        raise HTTPException(500, "error while getting comments")
