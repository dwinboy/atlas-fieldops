from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import require_permission
from app.app_db import get_session
from app.core.permissions import Permission
from app.schemas.auth import CurrentPrincipal
from app.schemas.collection import DataFormCreate, DataFormRead
from app.services.collection import FormService

router = APIRouter()


@router.get("", response_model=list[DataFormRead], summary="List tenant forms")
async def list_forms(
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.FORM_READ))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[object]:
    return await FormService(session).list_forms(UUID(principal.organization_id))


@router.post("", response_model=DataFormRead, status_code=status.HTTP_201_CREATED, summary="Create a dynamic form")
async def create_form(
    payload: DataFormCreate,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.FORM_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> object:
    try:
        form = await FormService(session).create_form(
            organization_id=UUID(principal.organization_id),
            actor_user_id=UUID(principal.user_id),
            payload=payload,
        )
        await session.commit()
        return form
    except Exception:
        await session.rollback()
        raise
