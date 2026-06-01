import json
from functools import lru_cache
from typing import Annotated, Any

from pydantic import Field
from pydantic import field_validator
from pydantic_settings import NoDecode
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "enterprise-data-platform"
    app_env: str = "local"
    database_url: str = "postgresql+asyncpg://app:app@localhost:5432/data_platform"
    redis_url: str = "redis://localhost:6379/0"
    kafka_bootstrap_servers: str = "localhost:9092"
    kafka_auth_events_topic: str = "identity.events.v1"
    kafka_submission_events_topic: str = "collection.events.v1"
    jwt_secret: str = Field(default="", min_length=0)
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    cors_origins: Annotated[list[str], NoDecode] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:3010",
        "http://127.0.0.1:3010",
    ]

    @field_validator("database_url", mode="before")
    @classmethod
    def normalize_database_url(cls, value: Any) -> Any:
        if not isinstance(value, str):
            return value
        value = value.strip().strip("\"'")
        if value.startswith("DATABASE_URL="):
            value = value.removeprefix("DATABASE_URL=").strip().strip("\"'")
        if value.startswith("postgres://"):
            value = value.replace("postgres://", "postgresql://", 1)
        if value.startswith("postgresql://"):
            return value.replace("postgresql://", "postgresql+asyncpg://", 1)
        return value

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: Any) -> Any:
        if not isinstance(value, str):
            return value
        if value.strip().startswith("["):
            parsed = json.loads(value)
            if isinstance(parsed, list):
                return parsed
            raise ValueError("CORS_ORIGINS must be a JSON list of origins")
        return [origin.strip() for origin in value.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
