import fastapi
from uvicorn import run
from contextlib import asynccontextmanager
from fastapi.middleware import cors

from routes.movies import router as movie_router

import redis


PORT = 8000

@asynccontextmanager
async def lifespan(app: fastapi.FastAPI):
    app.state.redis = redis.Redis(host="localhost", port=6379, db=0, decode_responses=True)
    
    yield

    await app.state.redis.close()

app = fastapi.FastAPI(lifespan=lifespan)



app.add_middleware(
    cors.CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)



app.include_router(movie_router)



if __name__ == "__main__":
    run(
        app=app,
        port=PORT,
        host="0.0.0.0"
    )