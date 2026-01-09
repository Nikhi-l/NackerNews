"""Application configuration using Pydantic settings."""

from functools import lru_cache
from typing import Optional

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Database
    database_url: str = "postgresql://user:password@localhost:5432/nacker_news"

    # JWT
    jwt_secret: str = "dev-secret-change-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expiration_minutes: int = 60 * 24 * 7  # 7 days

    # CORS
    cors_origins: str = "http://localhost:3000"

    # Vercel KV (optional, for rate limiting)
    kv_rest_api_url: Optional[str] = None
    kv_rest_api_token: Optional[str] = None

    # Pagination
    default_page_limit: int = 30
    max_page_limit: int = 100

    @property
    def cors_origins_list(self) -> list[str]:
        """Parse CORS origins from comma-separated string."""
        if not self.cors_origins:
            return ["*"]
        return [origin.strip() for origin in self.cors_origins.split(",")]

    @property
    def kv_enabled(self) -> bool:
        """Check if Vercel KV is configured."""
        return bool(self.kv_rest_api_url and self.kv_rest_api_token)

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
