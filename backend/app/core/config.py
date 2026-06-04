import json
from functools import lru_cache
from typing import Annotated, Any

from pydantic import AliasChoices
from pydantic import Field
from pydantic import field_validator
from pydantic import model_validator
from pydantic_settings import NoDecode
from pydantic_settings import BaseSettings, SettingsConfigDict

REQUIRED_CORS_ORIGINS = [
    "https://atlas-fieldops.vercel.app",
    "https://atlas-fieldops-l6h6tkdyh-dwinboys-projects.vercel.app",
    "https://atlastfieldops.com",
]

LOCAL_CORS_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "http://localhost:3010",
    "http://127.0.0.1:3010",
]


def normalize_database_url(value: str) -> str:
    value = value.strip().strip("\"'")
    if not value:
        raise RuntimeError("DATABASE_URL is required but is not set")
    return value.replace("postgresql://", "postgresql+asyncpg://", 1)


def missing_database_url() -> str:
    raise RuntimeError("DATABASE_URL is required but is not set")


class Settings(BaseSettings):
    # Railway injects production configuration as runtime environment variables.
    model_config = SettingsConfigDict(extra="ignore")

    app_name: str = "enterprise-data-platform"
    app_env: str = "local"
    database_url: str = Field(default_factory=missing_database_url)
    redis_url: str = "redis://localhost:6379/0"
    kafka_bootstrap_servers: str = "localhost:9092"
    kafka_auth_events_topic: str = "identity.events.v1"
    kafka_submission_events_topic: str = "collection.events.v1"
    JWT_SECRET: str = Field(min_length=32)
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    cors_origins: Annotated[list[str], NoDecode] = Field(
        default=REQUIRED_CORS_ORIGINS + LOCAL_CORS_ORIGINS,
        validation_alias=AliasChoices("BACKEND_CORS_ORIGINS", "cors_origins"),
    )
    cors_origin_regex: str = r"^https://atlas-fieldops-.*\.vercel\.app$"

    @field_validator("database_url", mode="before")
    @classmethod
    def normalize_database_url(cls, value: Any) -> Any:
        if not isinstance(value, str):
            return value
        return normalize_database_url(value)

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: Any) -> Any:
        if not isinstance(value, str):
            return value
        if value.strip().startswith("["):
            parsed = json.loads(value)
            if isinstance(parsed, list):
                return parsed
            raise ValueError("BACKEND_CORS_ORIGINS must be a JSON list of origins")
        return [origin.strip() for origin in value.split(",") if origin.strip()]

    @model_validator(mode="after")
    def include_required_cors_origins(self) -> "Settings":
        origins = list(dict.fromkeys([*self.cors_origins, *REQUIRED_CORS_ORIGINS]))
        self.cors_origins = origins
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
