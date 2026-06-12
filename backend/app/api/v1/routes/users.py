from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import require_permission
from app.app_db import get_session
from app.core.permissions import Permission
from app.schemas.auth import CurrentPrincipal
from app.schemas.identity import (
    PasswordResetRead,
    UserCreate,
    UserImportResponse,
    UserRead,
    UserRoleAssignmentCreate,
    UserRoleAssignmentUpdate,
    UserUpdate,
)
from app.services.identity import IdentityConflictError, IdentityNotFoundError, IdentityPermissionError, UserManagementService

router = APIRouter()


@router.get("", response_model=list[UserRead], summary="List users in current tenant")
async def list_users(
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.USER_READ))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[UserRead]:
    return await UserManagementService(session).list_users(UUID(principal.organization_id))


@router.post(
    "",
    response_model=UserRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create user in current tenant",
)
async def create_user(
    payload: UserCreate,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.USER_CREATE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> UserRead:
    try:
        user = await UserManagementService(session).create_user(
            organization_id=UUID(principal.organization_id),
            actor_user_id=UUID(principal.user_id),
            actor_roles=principal.roles,
            payload=payload,
        )
        await session.commit()
        return user
    except IdentityNotFoundError as exc:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found") from exc
    except IdentityPermissionError as exc:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except IdentityConflictError as exc:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    except Exception:
        await session.rollback()
        raise


@router.post(
    "/import",
    response_model=UserImportResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Bulk import users from CSV",
)
async def import_users(
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.USER_CREATE))],
    session: Annotated[AsyncSession, Depends(get_session)],
    file: UploadFile = File(...),
) -> UserImportResponse:
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Upload a CSV file")
    try:
        response = await UserManagementService(session).import_users_csv(
            organization_id=UUID(principal.organization_id),
            actor_user_id=UUID(principal.user_id),
            actor_roles=principal.roles,
            content=await file.read(),
        )
        await session.commit()
        return response
    except ValueError as exc:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception:
        await session.rollback()
        raise


@router.patch("/{user_id}", response_model=UserRead, summary="Update user role, scope, status, or profile")
async def update_user(
    user_id: UUID,
    payload: UserUpdate,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.USER_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> UserRead:
    try:
        user = await UserManagementService(session).update_user(
            organization_id=UUID(principal.organization_id),
            actor_user_id=UUID(principal.user_id),
            actor_roles=principal.roles,
            user_id=user_id,
            payload=payload,
        )
        await session.commit()
        return user
    except IdentityNotFoundError as exc:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User or role not found") from exc
    except IdentityPermissionError as exc:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except Exception:
        await session.rollback()
        raise


@router.post("/{user_id}/reset-password", response_model=PasswordResetRead, summary="Reset a user's temporary local password")
async def reset_user_password(
    user_id: UUID,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.USER_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> PasswordResetRead:
    try:
        reset = await UserManagementService(session).reset_password(
            organization_id=UUID(principal.organization_id),
            actor_user_id=UUID(principal.user_id),
            user_id=user_id,
        )
        await session.commit()
        return reset
    except IdentityNotFoundError as exc:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found") from exc
    except Exception:
        await session.rollback()
        raise


@router.post("/{user_id}/role-assignments", response_model=UserRead, status_code=status.HTTP_201_CREATED, summary="Add a scoped role assignment to a user")
async def add_user_role_assignment(
    user_id: UUID,
    payload: UserRoleAssignmentCreate,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.USER_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> UserRead:
    try:
        user = await UserManagementService(session).add_role_assignment(
            organization_id=UUID(principal.organization_id),
            actor_user_id=UUID(principal.user_id),
            actor_roles=principal.roles,
            user_id=user_id,
            payload=payload,
        )
        await session.commit()
        return user
    except IdentityNotFoundError as exc:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User, role, or assignment not found") from exc
    except IdentityPermissionError as exc:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except Exception:
        await session.rollback()
        raise


@router.patch("/{user_id}/role-assignments/{assignment_id}", response_model=UserRead, summary="Update a scoped role assignment")
async def update_user_role_assignment(
    user_id: UUID,
    assignment_id: UUID,
    payload: UserRoleAssignmentUpdate,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.USER_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> UserRead:
    try:
        user = await UserManagementService(session).update_role_assignment(
            organization_id=UUID(principal.organization_id),
            actor_user_id=UUID(principal.user_id),
            actor_roles=principal.roles,
            user_id=user_id,
            assignment_id=assignment_id,
            payload=payload,
        )
        await session.commit()
        return user
    except IdentityNotFoundError as exc:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User, role, or assignment not found") from exc
    except IdentityPermissionError as exc:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except Exception:
        await session.rollback()
        raise


@router.delete("/{user_id}/role-assignments/{assignment_id}", response_model=UserRead, summary="Deactivate a scoped role assignment")
async def deactivate_user_role_assignment(
    user_id: UUID,
    assignment_id: UUID,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.USER_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> UserRead:
    try:
        user = await UserManagementService(session).deactivate_role_assignment(
            organization_id=UUID(principal.organization_id),
            actor_user_id=UUID(principal.user_id),
            user_id=user_id,
            assignment_id=assignment_id,
        )
        await session.commit()
        return user
    except IdentityNotFoundError as exc:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User or assignment not found") from exc
    except Exception:
        await session.rollback()
        raise
