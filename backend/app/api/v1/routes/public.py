from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.app_db import get_session
from app.schemas.marketing import MarketingLeadCreate, MarketingLeadRead
from app.services.marketing import MarketingService

router = APIRouter()


@router.post(
    "/leads",
    response_model=MarketingLeadRead,
    status_code=status.HTTP_201_CREATED,
    summary="Capture a public website lead",
)
async def create_public_lead(
    payload: MarketingLeadCreate,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> MarketingLeadRead:
    return await MarketingService(session).create_lead(payload)
