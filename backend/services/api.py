import base64
import hashlib
import hmac
import secrets
from datetime import datetime
from urllib.parse import unquote

import jwt
from fastapi import Depends, HTTPException, Request
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from config import settings
from database import get_db
from models.ApiClient import ApiClient
from models.Comment import Comment
from models.User import User, oauthEnum
from schema.Api import (
    ApiClientCreated,
    ApiClientResponse,
    ApiComment,
    ApiMovie,
    ApiMovieListItem,
    ApiUser,
    ApiUserListItem,
    ApiUserUpdate,
    TokenResponse,
)
from schema.User import UserResponse
from services.auth import sendVerificationEmail
from services.Comments import AddComment, deleteComment, editComment
from services.Movies import getMovieDetails, getMovies
from services.Subtitles import get_subtitles
from utils.auth import API_TOKEN_TYPE, createApiToken, hashPass


def _hash_secret(secret: str) -> str:
    return hashlib.sha256(secret.encode("utf-8")).hexdigest()


def _unauthorized(detail: str):
    raise HTTPException(status_code=401, detail=detail, headers={"WWW-Authenticate": "Bearer"})


def get_api_user(request: Request, db: Session = Depends(get_db)) -> User:
    scheme, _, token = request.headers.get("Authorization", "").partition(" ")
    if scheme.lower() != "bearer" or not token:
        _unauthorized("Missing bearer token")
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        _unauthorized("Token expired")
    except jwt.PyJWTError:
        _unauthorized("Invalid token")
    if payload.get("typ") != API_TOKEN_TYPE:
        _unauthorized("Invalid token")

    client = db.query(ApiClient).filter(ApiClient.client_id == payload.get("client_id")).first()
    if not client or client.revoked or str(client.user_id) != payload.get("sub"):
        _unauthorized("Client revoked")
    user = db.query(User).filter(User.id == client.user_id, User.deleted.is_(False)).first()
    if not user:
        _unauthorized("User not found")
    return user


# ---------- OAuth2 token (RFC 6749, client_credentials) ----------

def _oauth_error(status: int, error: str, description: str) -> JSONResponse:
    headers = {"Cache-Control": "no-store"}
    if status == 401:
        headers["WWW-Authenticate"] = 'Basic realm="hypertube"'
    return JSONResponse(status_code=status, content={"error": error, "error_description": description}, headers=headers)


async def issueToken(request: Request, db: Session):
    content_type = request.headers.get("content-type", "")
    body: dict = {}
    try:
        if content_type.startswith("application/json"):
            data = await request.json()
            body = data if isinstance(data, dict) else {}
        elif content_type.startswith(("application/x-www-form-urlencoded", "multipart/form-data")):
            body = dict(await request.form())
    except Exception:
        return _oauth_error(400, "invalid_request", "Malformed request body")

    client_id = body.get("client_id")
    client_secret = body.get("client_secret")
    scheme, _, credentials = request.headers.get("Authorization", "").partition(" ")
    if scheme.lower() == "basic" and credentials:
        try:
            decoded = base64.b64decode(credentials).decode("utf-8")
            basic_id, _, basic_secret = decoded.partition(":")
            client_id, client_secret = unquote(basic_id), unquote(basic_secret)
        except Exception:
            return _oauth_error(401, "invalid_client", "Malformed Basic credentials")

    grant_type = body.get("grant_type")
    if not grant_type:
        return _oauth_error(400, "invalid_request", "grant_type is required")
    if grant_type != "client_credentials":
        return _oauth_error(400, "unsupported_grant_type", "Only client_credentials is supported")
    if not isinstance(client_id, str) or not isinstance(client_secret, str) or not client_id or not client_secret:
        return _oauth_error(401, "invalid_client", "client_id and client_secret are required")

    client = db.query(ApiClient).filter(ApiClient.client_id == client_id).first()
    if (
        not client
        or client.revoked
        or not hmac.compare_digest(client.secret_hash, _hash_secret(client_secret))
    ):
        return _oauth_error(401, "invalid_client", "Unknown client or wrong secret")
    owner = db.query(User).filter(User.id == client.user_id, User.deleted.is_(False)).first()
    if not owner:
        return _oauth_error(401, "invalid_client", "Unknown client or wrong secret")

    client.last_used_at = datetime.now()
    db.commit()
    token = TokenResponse(access_token=createApiToken(owner.id, client.client_id), expires_in=settings.jwt_expiration)
    return JSONResponse(content=token.model_dump(), headers={"Cache-Control": "no-store"})


# ---------- Users ----------

def _picture_url(request: Request, picture: str | None) -> str:
    picture = picture or "/uploads/default/Default_pfp.svg"
    if picture.startswith(("http://", "https://")):
        return picture
    return f"{str(request.base_url).rstrip('/')}{picture}"


def _user_out(request: Request, user: User, requester: User) -> ApiUser:
    return ApiUser(
        id=user.id,
        username=user.username,
        picture_url=_picture_url(request, user.picture),
        email=user.email if user.id == requester.id else None,
    )


def listUsers(db: Session) -> list[ApiUserListItem]:
    users = db.query(User).filter(User.deleted.is_(False)).order_by(User.id).all()
    return [ApiUserListItem(id=u.id, username=u.username) for u in users]


def getUserApi(request: Request, user_id: int, requester: User, db: Session) -> ApiUser:
    user = db.query(User).filter(User.id == user_id, User.deleted.is_(False)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return _user_out(request, user, requester)


def updateUserApi(request: Request, user_id: int, update: ApiUserUpdate, requester: User, db: Session) -> ApiUser:
    if user_id != requester.id:
        raise HTTPException(status_code=403, detail="You can only update your own profile")

    old_email = requester.email
    email_changed = update.email is not None and update.email.lower() != old_email.lower()
    if email_changed:
        taken = db.query(User).filter(User.email == update.email, User.id != requester.id).first()
        if taken:
            raise HTTPException(status_code=409, detail="Email already in use")

    if update.username is not None:
        requester.username = update.username
    if update.picture_url is not None:
        requester.picture = update.picture_url
    if update.password is not None:
        requester.password = hashPass(update.password)
        requester.oauth_provider = oauthEnum.EMAIL
    if email_changed:
        requester.email = update.email
        # A new address has to be confirmed before the account can sign in with it
        if requester.oauth_provider == oauthEnum.EMAIL:
            requester.is_verified = False
    try:
        db.commit()
        db.refresh(requester)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to update profile") from e

    if email_changed and requester.oauth_provider == oauthEnum.EMAIL:
        sendVerificationEmail(requester, db)

    redis = getattr(request.app.state, "redis", None)
    if redis:
        try:
            redis.delete(old_email, requester.email)
        except Exception:
            pass
    return _user_out(request, requester, requester)


# ---------- Movies ----------

def listFrontPageMovies(request: Request) -> list[ApiMovieListItem]:
    data = getMovies(request=request, page=1, lang="en")
    return [
        ApiMovieListItem(id=movie["id"], name=movie.get("title") or movie.get("original_title") or "")
        for movie in data.get("results", [])
        if movie.get("id") is not None
    ]


async def getMovieApi(request: Request, movie_id: int, requester: User, db: Session) -> ApiMovie:
    lang = requester.preferred_language.value if requester.preferred_language else "en"
    data = await run_in_threadpool(
        getMovieDetails, request=request, movie_id=movie_id, db=db, user=requester, lang=lang,
    )
    if not isinstance(data, dict) or data.get("id") != movie_id:
        raise HTTPException(status_code=404, detail="Movie not found")

    subtitles: list[str] = []
    imdb_id = data.get("imdb_id")
    if imdb_id:
        try:
            tracks = await get_subtitles(getattr(request.app.state, "redis", None), imdb_id, None, None, None, lang)
            subtitles = [track["srcLang"] for track in tracks]
        except Exception:
            subtitles = []

    release_date = data.get("release_date") or ""
    comments_count = db.query(Comment).filter(Comment.movie_id == movie_id, Comment.is_deleted.is_(False)).count()
    return ApiMovie(
        id=movie_id,
        name=data.get("title") or data.get("original_title") or "",
        rating=data.get("vote_average"),
        year=int(release_date[:4]) if release_date[:4].isdigit() else None,
        length=data.get("runtime") or None,
        subtitles=subtitles,
        comments_count=comments_count,
    )


async def ensureMovieExists(request: Request, movie_id: int, requester: User, db: Session):
    data = await run_in_threadpool(
        getMovieDetails, request=request, movie_id=movie_id, db=db, user=requester, lang="en",
    )
    if not isinstance(data, dict) or data.get("id") != movie_id:
        raise HTTPException(status_code=404, detail="Movie not found")


# ---------- Comments ----------

def _comment_out(comment) -> ApiComment:
    return ApiComment(
        id=comment.id,
        comment=comment.content,
        author_username=comment.owner.username,
        date=comment.created_at,
        movie_id=comment.movie_id,
    )


def _visible_comment(comment_id: int, db: Session) -> Comment:
    comment = db.query(Comment).filter(Comment.id == comment_id, Comment.is_deleted.is_(False)).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    return comment


def listLatestComments(limit: int, db: Session, movie_id: int | None = None, offset: int = 0) -> list[ApiComment]:
    query = db.query(Comment).filter(Comment.is_deleted.is_(False))
    if movie_id is not None:
        query = query.filter(Comment.movie_id == movie_id)
    comments = query.order_by(Comment.created_at.desc(), Comment.id.desc()).offset(offset).limit(limit).all()
    return [_comment_out(c) for c in comments]


def getCommentApi(comment_id: int, db: Session) -> ApiComment:
    return _comment_out(_visible_comment(comment_id, db))


def createCommentApi(movie_id: int, content: str, requester: User, db: Session) -> ApiComment:
    return _comment_out(AddComment(comment=content, owner_id=requester.id, movie_id=movie_id, db=db))


def updateCommentApi(comment_id: int, content: str, username: str | None, requester: User, db: Session) -> ApiComment:
    comment = _visible_comment(comment_id, db)
    if comment.owner_id != requester.id or (username is not None and username != requester.username):
        raise HTTPException(status_code=403, detail="You can only edit your own comments")
    return _comment_out(editComment(comment_id=comment_id, content=content, user_id=requester.id, db=db))


def deleteCommentApi(comment_id: int, requester: User, db: Session) -> None:
    _visible_comment(comment_id, db)
    deleteComment(comment_id=comment_id, db=db, user_id=requester.id)


# ---------- Client management (website, cookie auth) ----------

def listApiClients(user: UserResponse, db: Session) -> list[ApiClientResponse]:
    clients = (
        db.query(ApiClient)
        .filter(ApiClient.user_id == user.id, ApiClient.revoked.is_(False))
        .order_by(ApiClient.created_at.desc())
        .all()
    )
    return [ApiClientResponse.model_validate(c) for c in clients]


def createApiClient(name: str, user: UserResponse, db: Session) -> ApiClientCreated:
    secret = secrets.token_urlsafe(32)
    client = ApiClient(
        user_id=user.id,
        name=name.strip() or "API client",
        client_id=secrets.token_urlsafe(16),
        secret_hash=_hash_secret(secret),
    )
    db.add(client)
    db.commit()
    db.refresh(client)
    return ApiClientCreated(**ApiClientResponse.model_validate(client).model_dump(), client_secret=secret)


def revokeApiClient(client_pk: int, user: UserResponse, db: Session) -> None:
    client = db.query(ApiClient).filter(
        ApiClient.id == client_pk, ApiClient.user_id == user.id, ApiClient.revoked.is_(False)
    ).first()
    if not client:
        raise HTTPException(status_code=404, detail="API client not found")
    client.revoked = True
    db.commit()
