from collections.abc import AsyncGenerator
import logging

from sqlalchemy.exc import ArgumentError
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.ext.asyncio import AsyncEngine

from app.core.config import settings

logger = logging.getLogger(__name__)

engine: AsyncEngine | None = None
_sessionmaker: async_sessionmaker[AsyncSession] | None = None


def _get_sessionmaker() -> async_sessionmaker[AsyncSession]:
    global engine, _sessionmaker

    if _sessionmaker is not None:
        return _sessionmaker

    try:
        url = make_url(settings.database_url)
        logger.info(
            "database_connecting",
            extra={"host": url.host, "database": url.database},
        )
        engine = create_async_engine(
            settings.database_url,
            pool_pre_ping=True,
        )
    except ArgumentError as exc:
        raise RuntimeError("DATABASE_URL is invalid; database access is unavailable") from exc

    _sessionmaker = async_sessionmaker(engine, expire_on_commit=False)
    return _sessionmaker


def AsyncSessionLocal() -> AsyncSession:
    return _get_sessionmaker()()


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session
