import fastapi
from uvicorn import run
from contextlib import asynccontextmanager
from fastapi.middleware import cors
from fastapi.staticfiles import StaticFiles

from routes.auth import router as auth_router
from config import settings
import redis
from sqlalchemy import text
from database import Base, engine
import models
from authlib.integrations.starlette_client import OAuth
from middlewares.auth import AuthMiddleware

from routes.movies import router as movie_router
from routes.series import router as series_router
from routes.images import router as image_conf_router
from routes.comments import router as comments_router
from routes.user import router as user_router
from routes.search import router as search_router
from routes.history import router as history_router
from routes.torrents import router as torrents_router
from routes.subtitles import router as subtitles_router
from services.Torrents import get_lt_session
from services.Cleanup import cleanup_loop
import asyncio




PORT = settings.backend_port

Base.metadata.create_all(bind=engine)

# create_all() never adds columns to tables that already exist
with engine.begin() as conn:
    conn.execute(text("ALTER TABLE comments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP"))




@asynccontextmanager
async def lifespan(app: fastapi.FastAPI):
    try:
        app.state.redis = redis.Redis(host="redis", port=6379, db=0, decode_responses=True)
    except Exception as e:
        print(f"Error while connecting to redis : {e}")
        app.state.redis = None
    
    oauth = OAuth()
    oauth.register(
        name="google",
        client_id=settings.google_client_id,
        client_secret=settings.google_client_secret,
        authorize_url="https://accounts.google.com/o/oauth2/auth",
        authorize_params={"scope": "openid email profile"},
        access_token_url="https://oauth2.googleapis.com/token",
        client_kwargs={"scope": "openid email profile"},
        server_metadata_url="https://accounts.google.com/.well-known/openid-configuration"
    )
    app.state.oauth: OAuth = oauth

    # Start the BitTorrent session now so the DHT is bootstrapped before the first stream request
    get_lt_session()

    cleanup_task = asyncio.create_task(cleanup_loop())
    
    yield

    cleanup_task.cancel()
    try:
        await cleanup_task
    except asyncio.CancelledError:
        pass

    if app.state.redis:
        app.state.redis.close()

app = fastapi.FastAPI(lifespan=lifespan)

app.add_middleware(
    cors.CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

app.add_middleware(AuthMiddleware)

# Mount static files for profile pictures
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.include_router(auth_router)
app.include_router(user_router)

app.include_router(movie_router)
app.include_router(series_router)

app.include_router(image_conf_router)
app.include_router(comments_router)
app.include_router(search_router)
app.include_router(history_router)
app.include_router(torrents_router)
app.include_router(subtitles_router)









if __name__ == "__main__":
    run(
        app="app:app",
        port=PORT,
        reload=True,
        # Open video streams never finish on their own and would block reloads forever
        timeout_graceful_shutdown=5,
        host="0.0.0.0"
    )