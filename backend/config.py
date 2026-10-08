from pydantic_settings import BaseSettings, SettingsConfigDict
import os
from dotenv import load_dotenv
load_dotenv(".env")

DB_NAME = os.getenv("POSTGRES_DB")
DB_USER = os.getenv("POSTGRES_USER")
DB_PASSWORD = os.getenv("POSTGRES_PASSWORD")
DB_HOST = os.getenv("POSTGRES_HOST")
DB_PORT = os.getenv("POSTGRES_PORT")

# API_BASE_URL = url = "https://api.themoviedb.org/3/"
# TMDB_KEY = os.getenv("TMDB_ACCESS_KEY")
# JWT_SECRET = os.getenv("JWT_SECRET")
# JWT_EXPIRATION = int(os.getenv("JWT_EXPIRATION", 3600))
# JWT_REFRESH_EXPIRATION = int(os.getenv("JWT_REFRESH_EXPIRATION", 86400))
# USER_SERVICE_PORT = int(os.getenv("USER_SERVICE_PORT", 8020))
# HASH_SALT = int(os.getenv("HASH_SALT", 78))


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8"
    )
    
    database_url : str = f"postgresql+psycopg2://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    api_base_url: str = "https://api.themoviedb.org/3/"
    tmdb_key: str
    jwt_secret: str = "thisissecret"
    jwt_expiration: int = 3600
    jwt_refresh_expiration: int = 86400
    backend_port: int = 8000
    hash_salt: int = 78
    google_client_id: str
    google_client_secret: str
    forty_two_client_id: str
    forty_two_client_secret: str
    forty_two_redirect_uri: str = "http://localhost:8020/auth/42"
    frontend_url: str = "http://localhost:3000"
    smtp_google_pass : str
    smtp_google_email : str
    opensubtitles_api_key: str = ""
    

settings = Settings()