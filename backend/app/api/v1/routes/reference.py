from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import require_permission
from app.app_db import get_session
from app.core.permissions import Permission
from app.schemas.auth import CurrentPrincipal
from app.schemas.reference import (
    OptionItemCreate,
    OptionItemRead,
    OptionItemReorder,
    OptionItemUpdate,
    OptionSetCatalogRead,
    OptionSetRead,
)
from app.services.reference import ReferenceDataService

router = APIRouter()


@router.get("/option-sets", response_model=OptionSetCatalogRead, summary="List all tenant reference option sets")
async def list_option_sets(
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.ORGANIZATION_READ))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> OptionSetCatalogRead:
    catalog = await ReferenceDataService(session).get_catalog(UUID(principal.organization_id))
    await session.commit()
    return catalog


@router.get("/option-sets/{set_key}", response_model=OptionSetRead, summary="Get one option set")
async def get_option_set(
    set_key: str,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.ORGANIZATION_READ))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> OptionSetRead:
    result = await ReferenceDataService(session).get_set(UUID(principal.organization_id), set_key)
    await session.commit()
    return result


@router.post(
    "/option-sets/{set_key}/items",
    response_model=OptionItemRead,
    status_code=status.HTTP_201_CREATED,
    summary="Add a custom option to a set",
)
async def create_option_item(
    set_key: str,
    payload: OptionItemCreate,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.ORGANIZATION_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> OptionItemRead:
    result = await ReferenceDataService(session).create_item(UUID(principal.organization_id), set_key, payload)
    await session.commit()
    return result


@router.patch("/option-sets/{set_key}/items/{item_id}", response_model=OptionItemRead, summary="Edit an option")
async def update_option_item(
    set_key: str,
    item_id: UUID,
    payload: OptionItemUpdate,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.ORGANIZATION_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> OptionItemRead:
    result = await ReferenceDataService(session).update_item(UUID(principal.organization_id), set_key, item_id, payload)
    await session.commit()
    return result


@router.delete(
    "/option-sets/{set_key}/items/{item_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a custom option (built-ins must be deactivated instead)",
)
async def delete_option_item(
    set_key: str,
    item_id: UUID,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.ORGANIZATION_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> None:
    await ReferenceDataService(session).delete_item(UUID(principal.organization_id), set_key, item_id)
    await session.commit()


@router.post("/option-sets/{set_key}/reorder", response_model=OptionSetRead, summary="Reorder a set's options")
async def reorder_option_set(
    set_key: str,
    payload: OptionItemReorder,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.ORGANIZATION_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> OptionSetRead:
    result = await ReferenceDataService(session).reorder(UUID(principal.organization_id), set_key, payload.item_ids)
    await session.commit()
    return result


@router.post("/option-sets/{set_key}/reset", response_model=OptionSetRead, summary="Reset a set to its built-in defaults")
async def reset_option_set(
    set_key: str,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.ORGANIZATION_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> OptionSetRead:
    result = await ReferenceDataService(session).reset(UUID(principal.organization_id), set_key)
    await session.commit()
    return result
