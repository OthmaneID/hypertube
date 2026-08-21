from pydantic_settings import BaseSettings
import os
from dotenv import load_dotenv
load_dotenv(".env")

DB_NAME = os.getenv("POSTGRES_DB")
DB_USER = os.getenv("POSTGRES_USER")
DB_PASSWORD = os.getenv("POSTGRES_PASSWORD")
DB_HOST = os.getenv("POSTGRES_HOST")
DB_PORT = os.getenv("POSTGRES_PORT")

API_BASE_URL = url = "https://api.themoviedb.org/3/"
TMDB_KEY = os.getenv("TMDB_ACCESS_KEY")
JWT_SECRET = os.getenv("JWT_SECRET")
JWT_EXPIRATION = int(os.getenv("JWT_EXPIRATION", 3600))



class Settings(BaseSettings):
    database_url: str = f"postgresql+psycopg2://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    api_base_url: str = API_BASE_URL
    tmdb_key: str = TMDB_KEY
    jwt_secret: str = JWT_SECRET
    jwt_expiration: int = JWT_EXPIRATION

    class Config:
        env_file = ".env"

settings = Settings()