from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import require_permission
from app.app_db import get_session
from app.core.permissions import Permission
from app.models.identity import User
from app.schemas.auth import CurrentPrincipal
from app.schemas.identity import UserCreate, UserRead
from app.services.identity import IdentityNotFoundError, UserManagementService

router = APIRouter()


@router.get("", response_model=list[UserRead], summary="List users in current tenant")
async def list_users(
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.USER_READ))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[User]:
    return await UserManagementService(session).list_users(UUID(principal.organization_id))


@router.post(
    "",
    response_model=UserRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create user in current tenant",
)
async def create_user(
    payload: UserCreate,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.USER_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> object:
    try:
        user = await UserManagementService(session).create_user(
            organization_id=UUID(principal.organization_id),
            actor_user_id=UUID(principal.user_id),
            payload=payload,
        )
        await session.commit()
        return user
    except IdentityNotFoundError as exc:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found") from exc
    except Exception:
        await session.rollback()
        raise
