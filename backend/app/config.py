from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # App
    APP_NAME: str = "AI Paralegal"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = True

    # Database
    DATABASE_URL: str = "postgresql://paralegal:paralegal_secret@localhost:5432/ai_paralegal"

    # JWT
    JWT_SECRET_KEY: str = "your-super-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_MINUTES: int = 60 * 24 * 7  # 7 days
    COOKIE_SECURE: bool = False

    # Groq AI (free tier - OpenAI-compatible API)
    GROQ_API_KEY: str = ""
    AI_MODEL: str = "llama-3.3-70b-versatile"

    # Frontend
    FRONTEND_URL: str = "http://localhost:3000"
    FRONTEND_URL_HTTPS: str = "https://localhost:3000"

    # Local HTTPS toggle
    ENABLE_LOCAL_HTTPS: bool = False

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
