from app.core.config import Settings


def test_render_postgres_url_is_normalized_for_async_sqlalchemy() -> None:
    settings = Settings(
        database_url="postgresql://app:secret@example.render.com:5432/atlas",
        cors_origins=[],
    )

    assert settings.database_url == "postgresql+asyncpg://app:secret@example.render.com:5432/atlas"


def test_legacy_postgres_scheme_is_normalized_for_async_sqlalchemy() -> None:
    settings = Settings(
        database_url="postgres://app:secret@example.render.com:5432/atlas",
        cors_origins=[],
    )

    assert settings.database_url == "postgresql+asyncpg://app:secret@example.render.com:5432/atlas"


def test_cors_origins_accept_json_list_from_host_env() -> None:
    settings = Settings(
        database_url="sqlite+aiosqlite:///test.db",
        cors_origins='["https://atlas.vercel.app","https://atlas.example.com"]',
    )

    assert settings.cors_origins == [
        "https://atlas.vercel.app",
        "https://atlas.example.com",
    ]


def test_cors_origins_accept_comma_separated_host_env() -> None:
    settings = Settings(
        database_url="sqlite+aiosqlite:///test.db",
        cors_origins="https://atlas.vercel.app, https://atlas.example.com",
    )

    assert settings.cors_origins == [
        "https://atlas.vercel.app",
        "https://atlas.example.com",
    ]
