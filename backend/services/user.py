
import os
import uuid
import aiofiles
from fastapi import Request, UploadFile, HTTPException
from sqlalchemy.orm import Session

from schema.User import UserResponse, UserUpdate
from models.User import User, oauthEnum
from models.Favorites import favoriteTypeEnum
from utils.auth import hashPass
import bcrypt





def getUser(request: Request, user_id: int, db: Session, user: UserResponse):
    try:
        user_db = db.query(User).filter(User.id == user_id).first()
        if not user_db:
            raise HTTPException(status_code=404, detail="User not found")
        user_serialized = UserResponse.model_validate(user_db).model_dump(exclude={"password", "tokens", "watched_history", "email", "oauth_provider", "preferred_language"})
        user_serialized["favorite_movies"] = [
            favorite.favorite_id
            for favorite in user_db.favorites
            if favorite.favorite_type == favoriteTypeEnum.MOVIE
        ]
        user_serialized["favorite_series"] = [
            favorite.favorite_id
            for favorite in user_db.favorites
            if favorite.favorite_type == favoriteTypeEnum.SERIES
        ]
        return user_serialized
    except HTTPException:
        raise
    except Exception as e:
        print("[getUser error]:", e)
        raise HTTPException(status_code=500, detail="Failed to fetch user")


def updateUser(request: Request, user_update: UserUpdate,db :Session, user: UserResponse):
    try:
        user_db = db.query(User).filter(User.id == user.id).first()
        if not user_db:
            raise HTTPException(status_code=404, detail="User not found")

        user_data = user_update.model_dump(exclude_unset=True)
        for key, value in user_data.items():
            setattr(user_db, key, value)
        db.commit()
        db.refresh(user_db)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print("[updateUser error]:", e)
        raise HTTPException(status_code=500, detail="Failed to update profile") from e

    redis = getattr(request.app.state, "redis", None)
    if redis:
        try:
            redis.delete(user_db.email)
        except Exception as e:
            print("[updateUser cache invalidation error]:", e)

    return user_db


def updatePassword(request: Request, old_pass: str, new_pass: str, db: Session, user: UserResponse):
    try:
        user_db = db.query(User).filter(User.id == user.id).first()
        if not user_db:
            return {"error": "user not found"}
        if  user_db.oauth_provider == oauthEnum.EMAIL and not bcrypt.checkpw(old_pass.encode("utf-8"), user_db.password.encode("utf-8")):
            return {"error": "Wrong password"}
        user_db.password = hashPass(new_pass)
        user_db.oauth_provider = oauthEnum.EMAIL
        db.commit()
        db.refresh(user_db)
        redis = request.app.state.redis
        if redis:
            redis.delete(user_db.email)
        return {"message": "password changed succefully"}
    except Exception as e:
        print("[update password error]: ", e)
        return {"error": "internal server error", "details" : str(e)}


def listFavorites(request: Request, user:UserResponse, db: Session):
    pass



def addFavorite(request: Request, user:UserResponse, db: Session, favorite_id: int, favorite_type: str):
    pass



def deleteFavorite(request: Request, user:UserResponse, db: Session, id: int):
    pass


async def uploadProfilePicture(request: Request, file: UploadFile, db: Session, user: UserResponse):
    """
    Upload and save user profile picture with validation.
    
    Args:
        request: FastAPI request object
        file: Uploaded file from form data
        db: Database session
        user: Current authenticated user
    
    Returns:
        Updated user object with new picture path
    
    Raises:
        HTTPException: If file validation fails or upload fails
    """
    try:
        # Validate file type
        allowed_extensions = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
        file_ext = os.path.splitext(file.filename)[1].lower()
        
        if file_ext not in allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type. Allowed types: {', '.join(allowed_extensions)}"
            )
        
        # Validate file size (5MB limit)
        MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
        file.file.seek(0, 2)  # Seek to end
        file_size = file.file.tell()
        file.file.seek(0)  # Seek back to start
        
        if file_size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail="File size exceeds 5MB limit"
            )
        
        # Generate unique filename
        unique_filename = f"{user.id}_{uuid.uuid4().hex}{file_ext}"
        upload_dir = "uploads/profile_pictures"
        file_path = os.path.join(upload_dir, unique_filename)
        
        # Ensure upload directory exists
        os.makedirs(upload_dir, exist_ok=True)
        
        # Save file using async I/O
        async with aiofiles.open(file_path, "wb") as buffer:
            content = await file.read()
            await buffer.write(content)
        
        # Update user's picture in database
        user_db = db.query(User).filter(User.id == user.id).first()
        if not user_db:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Delete only a previous local upload, not the default or a remote image.
        if (
            user_db.picture
            and user_db.picture != "/uploads/default/Default_pfp.svg"
            and not user_db.picture.startswith(("http://", "https://"))
        ):
            old_file_path = f"./{os.path.join(upload_dir, os.path.basename(user_db.picture))}"
            if os.path.exists(old_file_path):
                os.remove(old_file_path)
        
        # Update to new picture path (relative path for serving)
        user_db.picture = f"/uploads/profile_pictures/{unique_filename}"
        db.commit()
        db.refresh(user_db)
        
        return user_db
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[uploadProfilePicture error]: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to upload profile picture"
        )