from datetime import UTC, datetime
from typing import Annotated, TypeVar

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import require_permission
from app.app_db import get_session
from app.core.permissions import Permission
from app.schemas.auth import CurrentPrincipal
from app.schemas.mobile import (
    MobileActionAcceptedRead,
    MobileAssignmentRead,
    MobileAttachmentRead,
    MobileAuditEventUpload,
    MobileAuditEventUploadRead,
    MobileBootstrapRead,
    MobileDeviceRegistrationCreate,
    MobileDeviceRegistrationRead,
    MobileEntityRead,
    MobileFormRead,
    MobileFormVersionRead,
    MobileLocationRead,
    MobileNotificationRead,
    MobileProjectRead,
    MobileReferenceListRead,
    MobileSubmissionRead,
    MobileSubmissionUpload,
    MobileSubmissionUploadRead,
    MobileSyncPackageRead,
    MobileSyncQueueUpload,
    MobileSyncUploadRead,
    MobileVersionPolicyRead,
)
from app.services.collection import CollectionNotFoundError
from app.services.mobile import MobileService

router = APIRouter()
T = TypeVar("T")


def page(items: list[T], limit: int) -> list[T]:
    return items[:limit]


@router.get("/bootstrap", response_model=MobileBootstrapRead, summary="Get mobile bootstrap package")
async def mobile_bootstrap(
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.SYNC_MOBILE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> MobileBootstrapRead:
    return (await MobileService(session).sync_package(principal)).bootstrap


@router.post("/devices/register", response_model=MobileDeviceRegistrationRead, summary="Register mobile device")
async def register_mobile_device(
    payload: MobileDeviceRegistrationCreate,
    _principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.SYNC_MOBILE))],
) -> MobileDeviceRegistrationRead:
    now = datetime.now(UTC)
    return MobileDeviceRegistrationRead(
        device_id=payload.device_id,
        status="Active",
        registered_at=now,
        last_seen_at=now,
        remote_logout_required=False,
        remote_wipe_required=False,
    )


@router.get("/version-policy", response_model=MobileVersionPolicyRead, summary="Read mobile app version policy")
async def mobile_version_policy(
    _principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.SYNC_MOBILE))],
) -> MobileVersionPolicyRead:
    return MobileVersionPolicyRead()


@router.get("/projects", response_model=list[MobileProjectRead], summary="Get assigned mobile projects")
async def mobile_projects(
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.PROGRAM_READ))],
    session: Annotated[AsyncSession, Depends(get_session)],
    _cursor: str | None = Query(default=None, max_length=200),
    limit: int = Query(default=100, ge=1, le=500),
) -> list[MobileProjectRead]:
    return page(await MobileService(session).projects(principal), limit)


@router.get(
    "/assignments",
    response_model=list[MobileAssignmentRead],
    summary="Get assigned mobile assignments",
)
async def mobile_assignments(
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.OFFICER_READ))],
    session: Annotated[AsyncSession, Depends(get_session)],
    _cursor: str | None = Query(default=None, max_length=200),
    limit: int = Query(default=100, ge=1, le=500),
) -> list[MobileAssignmentRead]:
    return page(await MobileService(session).assignments(principal), limit)


@router.get("/forms", response_model=list[MobileFormRead], summary="Get assigned published mobile forms")
async def mobile_forms(
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.FORM_READ))],
    session: Annotated[AsyncSession, Depends(get_session)],
    _cursor: str | None = Query(default=None, max_length=200),
    limit: int = Query(default=100, ge=1, le=500),
) -> list[MobileFormRead]:
    return page(await MobileService(session).forms(principal), limit)


@router.get(
    "/form-versions",
    response_model=list[MobileFormVersionRead],
    summary="Get assigned published mobile form versions",
)
async def mobile_form_versions(
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.FORM_READ))],
    session: Annotated[AsyncSession, Depends(get_session)],
    _cursor: str | None = Query(default=None, max_length=200),
    limit: int = Query(default=100, ge=1, le=500),
) -> list[MobileFormVersionRead]:
    return page(await MobileService(session).form_versions(principal), limit)


@router.get("/entities", response_model=list[MobileEntityRead], summary="Get assigned mobile entities")
async def mobile_entities(
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.BENEFICIARY_READ))],
    session: Annotated[AsyncSession, Depends(get_session)],
    _cursor: str | None = Query(default=None, max_length=200),
    limit: int = Query(default=250, ge=1, le=1000),
) -> list[MobileEntityRead]:
    return page(await MobileService(session).entities(principal), limit)


@router.get("/locations", response_model=list[MobileLocationRead], summary="Get assigned mobile locations")
async def mobile_locations(
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.PROGRAM_READ))],
    session: Annotated[AsyncSession, Depends(get_session)],
    _cursor: str | None = Query(default=None, max_length=200),
    limit: int = Query(default=250, ge=1, le=1000),
) -> list[MobileLocationRead]:
    return page(await MobileService(session).locations(principal), limit)


@router.get("/reference-data", response_model=list[MobileReferenceListRead], summary="Get assigned mobile reference data")
async def mobile_reference_data(
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.FORM_READ))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[MobileReferenceListRead]:
    return await MobileService(session).reference_data(principal)


@router.get(
    "/returned-submissions",
    response_model=list[MobileSubmissionRead],
    summary="Get returned mobile submissions",
)
async def mobile_returned_submissions(
    _principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.SUBMISSION_READ))],
) -> list[MobileSubmissionRead]:
    return []


@router.get("/notifications", response_model=list[MobileNotificationRead], summary="Get mobile notifications")
async def mobile_notifications(
    _principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.SYNC_MOBILE))],
) -> list[MobileNotificationRead]:
    return []


@router.get("/sync", response_model=MobileSyncPackageRead, summary="Get mobile sync package")
async def mobile_sync_package(
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.SYNC_MOBILE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> MobileSyncPackageRead:
    return await MobileService(session).sync_package(principal)


@router.post("/sync", response_model=MobileSyncUploadRead, summary="Upload mobile sync queue")
async def mobile_sync_upload(
    payload: MobileSyncQueueUpload,
    _principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.SYNC_MOBILE))],
) -> MobileSyncUploadRead:
    return MobileSyncUploadRead(accepted=len(payload.items), failed=0)


@router.post(
    "/submissions",
    response_model=MobileSubmissionUploadRead,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Upload mobile submission",
)
async def mobile_submission_upload(
    payload: MobileSubmissionUpload,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.SUBMISSION_CREATE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> MobileSubmissionUploadRead:
    try:
        result = await MobileService(session).upload_submission(principal=principal, payload=payload)
        await session.commit()
        return result
    except CollectionNotFoundError as exc:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValueError as exc:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    except Exception:
        await session.rollback()
        raise


@router.post(
    "/attachments",
    response_model=MobileActionAcceptedRead,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Upload mobile attachment metadata",
)
async def mobile_attachment_upload(
    _payload: MobileAttachmentRead,
    _principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.SYNC_MOBILE))],
) -> MobileActionAcceptedRead:
    return MobileActionAcceptedRead(message="Attachment metadata accepted. Binary upload provider will be attached later.")


@router.post("/audit-events", response_model=MobileAuditEventUploadRead, summary="Upload mobile audit events")
async def mobile_audit_events_upload(
    payload: MobileAuditEventUpload,
    _principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.SYNC_MOBILE))],
) -> MobileAuditEventUploadRead:
    return MobileAuditEventUploadRead(accepted=len(payload.events))
