from fastapi import APIRouter, Depends, Query, Request, Response
from sqlalchemy.orm import Session

from database import get_db
from models.User import User
from schema.Api import (
    ApiComment,
    ApiCommentCreate,
    ApiCommentUpdate,
    ApiMovie,
    ApiMovieCommentCreate,
    ApiMovieListItem,
    ApiUser,
    ApiUserListItem,
    ApiUserUpdate,
    TokenResponse,
)
from services.api import (
    createCommentApi,
    deleteCommentApi,
    ensureMovieExists,
    get_api_user,
    getCommentApi,
    getMovieApi,
    getUserApi,
    issueToken,
    listFrontPageMovies,
    listLatestComments,
    listUsers,
    updateCommentApi,
    updateUserApi,
)

router = APIRouter(prefix="/api", tags=["Public API"])


@router.post("/oauth/token", response_model=TokenResponse)
async def oauth_token(request: Request, db: Session = Depends(get_db)):
    """
    OAuth2 client credentials grant. Send `grant_type=client_credentials`, `client_id` and
    `client_secret` as a form (or JSON), or the id and secret through HTTP Basic auth.
    """
    return await issueToken(request, db)


@router.get("/users", response_model=list[ApiUserListItem])
def list_users(db: Session = Depends(get_db), requester: User = Depends(get_api_user)):
    return listUsers(db)


@router.get("/users/{user_id}", response_model=ApiUser, response_model_exclude_none=True)
def get_user(user_id: int, request: Request, db: Session = Depends(get_db), requester: User = Depends(get_api_user)):
    return getUserApi(request, user_id, requester, db)


@router.patch("/users/{user_id}", response_model=ApiUser, response_model_exclude_none=True)
def update_user(
    user_id: int,
    update: ApiUserUpdate,
    request: Request,
    db: Session = Depends(get_db),
    requester: User = Depends(get_api_user),
):
    return updateUserApi(request, user_id, update, requester, db)


@router.get("/movies", response_model=list[ApiMovieListItem])
def list_movies(request: Request):
    """The movies shown on the front page; no authentication needed."""
    return listFrontPageMovies(request)


@router.get("/movies/{movie_id}", response_model=ApiMovie)
async def get_movie(movie_id: int, request: Request, db: Session = Depends(get_db), requester: User = Depends(get_api_user)):
    return await getMovieApi(request, movie_id, requester, db)


@router.get("/movies/{movie_id}/comments", response_model=list[ApiComment])
def list_movie_comments(
    movie_id: int,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    requester: User = Depends(get_api_user),
):
    return listLatestComments(limit, db, movie_id=movie_id, offset=offset)


@router.post("/movies/{movie_id}/comments", response_model=ApiComment, status_code=201)
async def add_movie_comment(
    movie_id: int,
    body: ApiMovieCommentCreate,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    requester: User = Depends(get_api_user),
):
    await ensureMovieExists(request, movie_id, requester, db)
    comment = createCommentApi(movie_id, body.comment, requester, db)
    response.headers["Location"] = f"/api/comments/{comment.id}"
    return comment


@router.get("/comments", response_model=list[ApiComment])
def list_comments(
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    requester: User = Depends(get_api_user),
):
    return listLatestComments(limit, db)


@router.post("/comments", response_model=ApiComment, status_code=201)
async def add_comment(
    body: ApiCommentCreate,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    requester: User = Depends(get_api_user),
):
    await ensureMovieExists(request, body.movie_id, requester, db)
    comment = createCommentApi(body.movie_id, body.comment, requester, db)
    response.headers["Location"] = f"/api/comments/{comment.id}"
    return comment


@router.get("/comments/{comment_id}", response_model=ApiComment)
def get_comment(comment_id: int, db: Session = Depends(get_db), requester: User = Depends(get_api_user)):
    return getCommentApi(comment_id, db)


@router.patch("/comments/{comment_id}", response_model=ApiComment)
def update_comment(
    comment_id: int,
    body: ApiCommentUpdate,
    db: Session = Depends(get_db),
    requester: User = Depends(get_api_user),
):
    return updateCommentApi(comment_id, body.comment, body.username, requester, db)


@router.delete("/comments/{comment_id}", status_code=204)
def delete_comment(comment_id: int, db: Session = Depends(get_db), requester: User = Depends(get_api_user)):
    deleteCommentApi(comment_id, requester, db)
    return Response(status_code=204)
