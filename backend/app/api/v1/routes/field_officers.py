from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import require_permission
from app.app_db import get_session
from app.core.permissions import Permission
from app.schemas.auth import CurrentPrincipal
from app.schemas.collection import (
    FieldOfficerImportResponse,
    FieldOfficerInvite,
    FieldOfficerProfileDetailRead,
    FieldOfficerProfileUpdate,
    FieldOfficerRead,
    FieldWorkAssignmentCreate,
    FieldWorkAssignmentRead,
    FieldWorkAssignmentStatusUpdate,
    FieldWorkAssignmentUpdate,
    OfficerAssignmentCreate,
    OfficerAssignmentRead,
)
from app.services.collection import CollectionNotFoundError, FieldOfficerService

router = APIRouter()


@router.get("", response_model=list[FieldOfficerRead], summary="List field officers in current tenant")
async def list_field_officers(
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.OFFICER_READ))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[FieldOfficerRead]:
    return await FieldOfficerService(session).list_officers(UUID(principal.organization_id))


@router.get(
    "/{field_officer_id}",
    response_model=FieldOfficerProfileDetailRead,
    summary="Get a field officer operational profile",
)
async def get_field_officer_profile(
    field_officer_id: UUID,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.OFFICER_READ))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> FieldOfficerProfileDetailRead:
    try:
        profile = await FieldOfficerService(session).get_officer_profile(
            organization_id=UUID(principal.organization_id),
            profile_id=field_officer_id,
            include_mobile_qr=principal.platform_admin or Permission.OFFICER_MANAGE.value in principal.permissions,
        )
        await session.commit()
        return profile
    except CollectionNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.patch(
    "/{field_officer_id}/profile",
    response_model=FieldOfficerProfileDetailRead,
    summary="Update a field officer operational profile",
)
async def update_field_officer_profile(
    field_officer_id: UUID,
    payload: FieldOfficerProfileUpdate,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.OFFICER_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> FieldOfficerProfileDetailRead:
    service = FieldOfficerService(session)
    try:
        profile = await service.update_officer_profile(
            organization_id=UUID(principal.organization_id),
            actor_user_id=UUID(principal.user_id),
            profile_id=field_officer_id,
            payload=payload,
        )
        await session.commit()
        return profile
    except CollectionNotFoundError as exc:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValueError as exc:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception:
        await session.rollback()
        raise


@router.post(
    "",
    response_model=FieldOfficerRead,
    status_code=status.HTTP_201_CREATED,
    summary="Invite a field officer and create an officer profile",
)
async def invite_field_officer(
    payload: FieldOfficerInvite,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.OFFICER_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> FieldOfficerRead:
    service = FieldOfficerService(session)
    try:
        profile = await service.invite_officer(
            organization_id=UUID(principal.organization_id),
            actor_user_id=UUID(principal.user_id),
            payload=payload,
        )
        await session.commit()
        officers = await service.list_officers(UUID(principal.organization_id))
        return next(officer for officer in officers if officer.id == profile.id)
    except CollectionNotFoundError as exc:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except Exception:
        await session.rollback()
        raise


@router.post(
    "/assignments",
    response_model=OfficerAssignmentRead,
    status_code=status.HTTP_201_CREATED,
    summary="Assign a published project form to a field officer for mobile sync",
)
async def create_field_assignment(
    payload: OfficerAssignmentCreate,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.OFFICER_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> OfficerAssignmentRead:
    service = FieldOfficerService(session)
    try:
        assignment = await service.assign_officer(
            organization_id=UUID(principal.organization_id),
            actor_user_id=UUID(principal.user_id),
            payload=payload,
        )
        await session.commit()
        return OfficerAssignmentRead.model_validate(assignment)
    except CollectionNotFoundError as exc:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValueError as exc:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception:
        await session.rollback()
        raise


@router.post(
    "/import",
    response_model=FieldOfficerImportResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Bulk import field officers from CSV",
)
async def import_field_officers(
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.OFFICER_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
    file: UploadFile = File(...),
) -> FieldOfficerImportResponse:
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Upload a CSV file")
    service = FieldOfficerService(session)
    try:
        response = await service.import_officers_csv(
            organization_id=UUID(principal.organization_id),
            actor_user_id=UUID(principal.user_id),
            content=await file.read(),
        )
        await session.commit()
        return response
    except ValueError as exc:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except CollectionNotFoundError as exc:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except Exception:
        await session.rollback()
        raise


@router.get(
    "/work-assignments/all",
    response_model=list[FieldWorkAssignmentRead],
    summary="List field work assignments with lifecycle status and targets",
)
async def list_work_assignments(
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.OFFICER_READ))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[FieldWorkAssignmentRead]:
    return await FieldOfficerService(session).list_work_assignments(UUID(principal.organization_id))


@router.post(
    "/work-assignments",
    response_model=FieldWorkAssignmentRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a field work assignment for one or more officers",
)
async def create_work_assignment(
    payload: FieldWorkAssignmentCreate,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.OFFICER_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> FieldWorkAssignmentRead:
    service = FieldOfficerService(session)
    try:
        assignment = await service.create_work_assignment(
            organization_id=UUID(principal.organization_id),
            actor_user_id=UUID(principal.user_id),
            payload=payload,
        )
        await session.commit()
        return assignment
    except CollectionNotFoundError as exc:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValueError as exc:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception:
        await session.rollback()
        raise


@router.patch(
    "/work-assignments/{assignment_id}",
    response_model=FieldWorkAssignmentRead,
    summary="Update a field work assignment",
)
async def update_work_assignment(
    assignment_id: UUID,
    payload: FieldWorkAssignmentUpdate,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.OFFICER_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> FieldWorkAssignmentRead:
    service = FieldOfficerService(session)
    try:
        assignment = await service.update_work_assignment(
            organization_id=UUID(principal.organization_id),
            actor_user_id=UUID(principal.user_id),
            assignment_id=assignment_id,
            payload=payload,
        )
        await session.commit()
        return assignment
    except CollectionNotFoundError as exc:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValueError as exc:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception:
        await session.rollback()
        raise


@router.post(
    "/work-assignments/{assignment_id}/status",
    response_model=FieldWorkAssignmentRead,
    summary="Transition a field work assignment lifecycle status",
)
async def set_work_assignment_status(
    assignment_id: UUID,
    payload: FieldWorkAssignmentStatusUpdate,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.OFFICER_MANAGE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> FieldWorkAssignmentRead:
    service = FieldOfficerService(session)
    try:
        assignment = await service.set_work_assignment_status(
            organization_id=UUID(principal.organization_id),
            actor_user_id=UUID(principal.user_id),
            assignment_id=assignment_id,
            payload=payload,
        )
        await session.commit()
        return assignment
    except CollectionNotFoundError as exc:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValueError as exc:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception:
        await session.rollback()
        raise
