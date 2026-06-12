from fastapi import APIRouter
from sqlalchemy import text

from app.db.session import AsyncSessionLocal
from app.core.redis import get_redis_client

router = APIRouter()


@router.get("/health", summary="Service health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/ready", summary="Service readiness")
async def ready() -> dict[str, str]:
    redis = get_redis_client()
    await redis.ping()
    async with AsyncSessionLocal() as session:
        await session.execute(text("SELECT 1"))
    return {"status": "ready"}
