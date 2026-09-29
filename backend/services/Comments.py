from sqlalchemy.orm import Session
from models.Comment import Comment
from schema.Comment import CommentResponse
from fastapi import HTTPException

from google import genai

client = genai.Client()


def CheckCommentNSFW(comment: str) -> bool:
    try:
        interaction = client.interactions.create(
            model="gemini-3.8-flash",
            input="Check this comment if it contain any bad words or any nsfw content if it is in a language you do not understand or you are not sure about it just say False. Reply with exactly 'True' if it is and 'False' if it is not. Comment: " + comment
        )
        return "True" in interaction.output_text
    except Exception as e:
        print(f"error while checking comment nsfw: {e}")
        return False


def AddComment(comment: str, owner_id: int, movie_id: int, db: Session):
    try:
        # if CheckCommentNSFW(comment):
        #     raise HTTPException(400, "comment contain nsfw content")
        comment_obj = Comment(content=comment, owner_id=owner_id, movie_id=movie_id)
        db.add(comment_obj)
        db.commit()
        db.refresh(comment_obj)
        # Re-query to eagerly load the owner relationship
        comment_obj = db.query(Comment).filter(Comment.id == comment_obj.id).first()
        return CommentResponse.model_validate(comment_obj)
    except HTTPException as e:
        raise e
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
        result = []
        for comment in comments:
            serialized = CommentResponse.model_validate(comment)
            if comment.is_deleted:
                # Mask content and owner identity for deleted comments
                serialized.content = "[deleted]"
                serialized.owner_id = -1
            result.append(serialized)
        return result
    except Exception as e:
        print(f"error while getting comments: {e}")
        raise HTTPException(500, "error while getting comments")



def deleteComment(comment_id: int, db: Session, user_id: int):
    try:
        comment = db.query(Comment).filter(Comment.id == comment_id).first()
        if not comment:
            raise HTTPException(404, "comment not found")
        if comment.owner_id != user_id:
            raise HTTPException(403, "you are not authorized to delete this comment")
        comment.is_deleted = True
        db.commit()
        return True
    except Exception as e:
        db.rollback()
        print(f"error while deleting comment: {e}")
        raise HTTPException(500, "error while deleting comment")