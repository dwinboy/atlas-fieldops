from app.core.config import Settings


def test_database_url_can_be_empty_until_deployment_injects_it() -> None:
    settings = Settings(database_url="", cors_origins=[])

    assert settings.database_url == ""


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


def test_database_url_accepts_accidental_env_assignment_value() -> None:
    settings = Settings(
        database_url="DATABASE_URL='postgresql://app:secret@example.render.com:5432/atlas'",
        cors_origins=[],
    )

    assert settings.database_url == "postgresql+asyncpg://app:secret@example.render.com:5432/atlas"


def test_database_url_can_be_built_from_render_database_parts() -> None:
    settings = Settings(
        database_host="dpg-example-a",
        database_name="atlas",
        database_user="atlas_user",
        database_password="pa:ss@word",
        cors_origins=[],
    )

    assert settings.database_url == "postgresql+asyncpg://atlas_user:pa%3Ass%40word@dpg-example-a:5432/atlas"


def test_database_url_can_be_built_from_url_encoded_password_part() -> None:
    settings = Settings(
        database_host="dpg-example-a",
        database_name="atlas",
        database_user="atlas_user",
        database_password="pa%3Ass%40word",
        database_password_is_url_encoded=True,
        cors_origins=[],
    )

    assert settings.database_url == "postgresql+asyncpg://atlas_user:pa%3Ass%40word@dpg-example-a:5432/atlas"


def test_database_ssl_enables_asyncpg_ssl_connect_args() -> None:
    settings = Settings(
        database_url="postgresql://app:secret@example.render.com:5432/atlas",
        database_ssl=True,
        cors_origins=[],
    )

    assert settings.database_connect_args == {"ssl": True}


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
