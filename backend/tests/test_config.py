import pytest

from app.core.config import Settings


def test_database_url_is_required() -> None:
    with pytest.raises(RuntimeError, match="DATABASE_URL is required"):
        Settings(database_url="", cors_origins=[])


def test_railway_postgres_url_is_normalized_for_async_sqlalchemy() -> None:
    settings = Settings(
        database_url="postgresql://postgres:p%40ss%3Aword@postgres.railway.internal:5432/railway",
        cors_origins=[],
    )

    assert (
        settings.database_url
        == "postgresql+asyncpg://postgres:p%40ss%3Aword@postgres.railway.internal:5432/railway"
    )


def test_default_cors_origins_include_vercel_frontends() -> None:
    settings = Settings(database_url="sqlite+aiosqlite:///test.db")

    assert "https://atlas-fieldops.vercel.app" in settings.cors_origins
    assert "https://atlas-fieldops-l6h6tkdyh-dwinboys-projects.vercel.app" in settings.cors_origins


def test_existing_async_sqlalchemy_url_is_preserved() -> None:
    settings = Settings(
        database_url="postgresql+asyncpg://postgres:secret@postgres.railway.internal:5432/railway",
        cors_origins=[],
    )

    assert (
        settings.database_url
        == "postgresql+asyncpg://postgres:secret@postgres.railway.internal:5432/railway"
    )


def test_cors_origins_accept_json_list_from_host_env() -> None:
    settings = Settings(
        database_url="sqlite+aiosqlite:///test.db",
        cors_origins='["https://atlas.vercel.app","https://atlas.example.com"]',
    )

    assert "https://atlas.vercel.app" in settings.cors_origins
    assert "https://atlas.example.com" in settings.cors_origins


def test_cors_origins_accept_comma_separated_host_env() -> None:
    settings = Settings(
        database_url="sqlite+aiosqlite:///test.db",
        cors_origins="https://atlas.vercel.app, https://atlas.example.com",
    )

    assert "https://atlas.vercel.app" in settings.cors_origins
    assert "https://atlas.example.com" in settings.cors_origins


def test_required_vercel_origins_are_kept_when_host_env_overrides_cors() -> None:
    settings = Settings(
        database_url="sqlite+aiosqlite:///test.db",
        cors_origins="https://old-preview.vercel.app",
    )

    assert "https://old-preview.vercel.app" in settings.cors_origins
    assert "https://atlas-fieldops.vercel.app" in settings.cors_origins
    assert "https://atlas-fieldops-l6h6tkdyh-dwinboys-projects.vercel.app" in settings.cors_origins
