import pytest
from pydantic import ValidationError

from app.core.config import Settings

TEST_JWT_SECRET = "test-jwt-secret-with-at-least-32-characters"


def test_database_url_is_required() -> None:
    with pytest.raises(RuntimeError, match="DATABASE_URL is required"):
        Settings(database_url="", JWT_SECRET=TEST_JWT_SECRET, cors_origins=[])


def test_jwt_secret_is_required(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("JWT_SECRET", raising=False)

    with pytest.raises(ValidationError, match="JWT_SECRET"):
        Settings(_env_file=None, database_url="sqlite+aiosqlite:///test.db", cors_origins=[])


def test_jwt_secret_rejects_short_values() -> None:
    with pytest.raises(ValidationError, match="at least 32 characters"):
        Settings(database_url="sqlite+aiosqlite:///test.db", JWT_SECRET="too-short", cors_origins=[])


def test_jwt_secret_reads_uppercase_env_var(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("JWT_SECRET", TEST_JWT_SECRET)

    settings = Settings(_env_file=None, database_url="sqlite+aiosqlite:///test.db", cors_origins=[])

    assert settings.JWT_SECRET == TEST_JWT_SECRET


def test_railway_postgres_url_is_normalized_for_async_sqlalchemy() -> None:
    settings = Settings(
        database_url="postgresql://postgres:p%40ss%3Aword@postgres.railway.internal:5432/railway",
        JWT_SECRET=TEST_JWT_SECRET,
        cors_origins=[],
    )

    assert (
        settings.database_url
        == "postgresql+asyncpg://postgres:p%40ss%3Aword@postgres.railway.internal:5432/railway"
    )


def test_default_cors_origins_include_vercel_frontends() -> None:
    settings = Settings(database_url="sqlite+aiosqlite:///test.db", JWT_SECRET=TEST_JWT_SECRET)

    assert "https://atlas-fieldops.vercel.app" in settings.cors_origins
    assert "https://atlas-fieldops-l6h6tkdyh-dwinboys-projects.vercel.app" in settings.cors_origins
    assert "https://atlastfieldops.com" in settings.cors_origins
    assert "https://atlas-fieldops.vercel.app/app" not in settings.cors_origins


def test_existing_async_sqlalchemy_url_is_preserved() -> None:
    settings = Settings(
        database_url="postgresql+asyncpg://postgres:secret@postgres.railway.internal:5432/railway",
        JWT_SECRET=TEST_JWT_SECRET,
        cors_origins=[],
    )

    assert (
        settings.database_url
        == "postgresql+asyncpg://postgres:secret@postgres.railway.internal:5432/railway"
    )


def test_cors_origins_accept_json_list_from_host_env() -> None:
    settings = Settings(
        database_url="sqlite+aiosqlite:///test.db",
        JWT_SECRET=TEST_JWT_SECRET,
        cors_origins='["https://atlas.vercel.app","https://atlas.example.com"]',
    )

    assert "https://atlas.vercel.app" in settings.cors_origins
    assert "https://atlas.example.com" in settings.cors_origins


def test_cors_origins_accept_comma_separated_host_env() -> None:
    settings = Settings(
        database_url="sqlite+aiosqlite:///test.db",
        JWT_SECRET=TEST_JWT_SECRET,
        cors_origins="https://atlas.vercel.app, https://atlas.example.com",
    )

    assert "https://atlas.vercel.app" in settings.cors_origins
    assert "https://atlas.example.com" in settings.cors_origins


def test_required_vercel_origins_are_kept_when_host_env_overrides_cors() -> None:
    settings = Settings(
        database_url="sqlite+aiosqlite:///test.db",
        JWT_SECRET=TEST_JWT_SECRET,
        cors_origins="https://old-preview.vercel.app",
    )

    assert "https://old-preview.vercel.app" in settings.cors_origins
    assert "https://atlas-fieldops.vercel.app" in settings.cors_origins
    assert "https://atlas-fieldops-l6h6tkdyh-dwinboys-projects.vercel.app" in settings.cors_origins
    assert "https://atlastfieldops.com" in settings.cors_origins
