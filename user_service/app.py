import fastapi
from uvicorn import run
from contextlib import asynccontextmanager
from fastapi.middleware import cors

from routes.auth import router as auth_router
from config import settings
import redis
from database import Base, engine
import models
from authlib.integrations.starlette_client import OAuth
from middlewares.auth import AuthMiddleware

PORT = settings.user_service_port

Base.metadata.create_all(bind=engine)




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
    
    yield

    if app.state.redis:
        await app.state.redis.close()

app = fastapi.FastAPI(lifespan=lifespan)

app.add_middleware(
    cors.CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

app.add_middleware(AuthMiddleware)

app.include_router(auth_router)








if __name__ == "__main__":
    run(
        app=app,
        port=PORT,
        host="0.0.0.0"
    )