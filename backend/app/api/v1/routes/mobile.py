from typing import Annotated, TypeVar
from uuid import UUID

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
from app.schemas.operations import FieldVisitCheckIn, FieldVisitCheckOut, FieldVisitRequestCreate, FieldVisitRequestRead, MediaEvidenceCreate, MediaEvidenceRead
from app.services.collection import CollectionNotFoundError
from app.services.mobile import MobileService
from app.services.operations import OperationsService

router = APIRouter()
T = TypeVar("T")


def page(items: list[T], limit: int) -> list[T]:
    return items[:limit]


@router.get("/bootstrap", response_model=MobileBootstrapRead, summary="Get mobile bootstrap package")
async def mobile_bootstrap(
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.SYNC_MOBILE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> MobileBootstrapRead:
    package = await MobileService(session).sync_package(principal)
    await session.commit()
    return package.bootstrap


@router.post("/devices/register", response_model=MobileDeviceRegistrationRead, summary="Register mobile device")
async def register_mobile_device(
    payload: MobileDeviceRegistrationCreate,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.SYNC_MOBILE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> MobileDeviceRegistrationRead:
    result = await MobileService(session).register_device(principal, payload)
    await session.commit()
    return result


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
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.SUBMISSION_READ))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[MobileSubmissionRead]:
    return await MobileService(session).returned_submissions(principal)


@router.get("/notifications", response_model=list[MobileNotificationRead], summary="Get mobile notifications")
async def mobile_notifications(
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.SYNC_MOBILE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[MobileNotificationRead]:
    return await MobileService(session).notifications(principal)


@router.post("/notifications/{notification_id}/read", response_model=MobileNotificationRead, summary="Mark mobile notification read")
async def mark_mobile_notification_read(
    notification_id: UUID,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.SYNC_MOBILE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> MobileNotificationRead:
    try:
        result = await MobileService(session).mark_notification_read(principal, notification_id)
    except CollectionNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    await session.commit()
    return result


@router.get("/visit-requests", response_model=list[FieldVisitRequestRead], summary="Get field visit requests assigned to this mobile user")
async def mobile_visit_requests(
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.SYNC_MOBILE))],
    session: Annotated[AsyncSession, Depends(get_session)],
    request_status: str | None = Query(default=None, alias="status", max_length=40),
) -> list[FieldVisitRequestRead]:
    return await OperationsService(session).list_field_visit_requests(
        organization_id=UUID(principal.organization_id),
        actor_user_id=UUID(principal.user_id),
        own_only=True,
        status=request_status,
    )


@router.get("/operational-activities", response_model=list[FieldVisitRequestRead], summary="Get organization operational activities assigned to this mobile user")
async def mobile_operational_activities(
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.SYNC_MOBILE))],
    session: Annotated[AsyncSession, Depends(get_session)],
    request_status: str | None = Query(default=None, alias="status", max_length=40),
) -> list[FieldVisitRequestRead]:
    return await mobile_visit_requests(principal, session, request_status)


@router.post(
    "/visit-requests",
    response_model=FieldVisitRequestRead,
    status_code=status.HTTP_201_CREATED,
    summary="Request supervisor approval for a field visit",
)
async def mobile_create_visit_request(
    payload: FieldVisitRequestCreate,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.SYNC_MOBILE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> FieldVisitRequestRead:
    try:
        result = await OperationsService(session).create_field_visit_request(
            organization_id=UUID(principal.organization_id),
            actor_user_id=UUID(principal.user_id),
            payload=payload,
        )
        await session.commit()
        return result
    except ValueError as exc:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception:
        await session.rollback()
        raise


@router.post(
    "/operational-activities",
    response_model=FieldVisitRequestRead,
    status_code=status.HTTP_201_CREATED,
    summary="Request or log an organization operational activity",
)
async def mobile_create_operational_activity(
    payload: FieldVisitRequestCreate,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.SYNC_MOBILE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> FieldVisitRequestRead:
    return await mobile_create_visit_request(payload, principal, session)


@router.post("/visit-requests/{visit_request_id}/check-in", response_model=FieldVisitRequestRead, summary="Check in to an approved field visit")
async def mobile_visit_check_in(
    visit_request_id: UUID,
    payload: FieldVisitCheckIn,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.SYNC_MOBILE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> FieldVisitRequestRead:
    try:
        result = await OperationsService(session).check_in_field_visit_request(
            organization_id=UUID(principal.organization_id),
            actor_user_id=UUID(principal.user_id),
            visit_request_id=visit_request_id,
            payload=payload,
        )
        await session.commit()
        return result
    except ValueError as exc:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception:
        await session.rollback()
        raise


@router.post("/operational-activities/{visit_request_id}/check-in", response_model=FieldVisitRequestRead, summary="Check in to an approved organization activity")
async def mobile_activity_check_in(
    visit_request_id: UUID,
    payload: FieldVisitCheckIn,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.SYNC_MOBILE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> FieldVisitRequestRead:
    return await mobile_visit_check_in(visit_request_id, payload, principal, session)


@router.post("/visit-requests/{visit_request_id}/check-out", response_model=FieldVisitRequestRead, summary="Complete an approved field visit")
async def mobile_visit_check_out(
    visit_request_id: UUID,
    payload: FieldVisitCheckOut,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.SYNC_MOBILE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> FieldVisitRequestRead:
    try:
        result = await OperationsService(session).check_out_field_visit_request(
            organization_id=UUID(principal.organization_id),
            actor_user_id=UUID(principal.user_id),
            visit_request_id=visit_request_id,
            payload=payload,
        )
        await session.commit()
        return result
    except ValueError as exc:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception:
        await session.rollback()
        raise


@router.post("/operational-activities/{visit_request_id}/check-out", response_model=FieldVisitRequestRead, summary="Complete an approved organization activity")
async def mobile_activity_check_out(
    visit_request_id: UUID,
    payload: FieldVisitCheckOut,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.SYNC_MOBILE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> FieldVisitRequestRead:
    return await mobile_visit_check_out(visit_request_id, payload, principal, session)


@router.post(
    "/operational-activities/{visit_request_id}/attachments",
    response_model=MediaEvidenceRead,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Upload mobile evidence metadata for an operational activity",
)
async def mobile_activity_attachment_upload(
    visit_request_id: UUID,
    payload: MediaEvidenceCreate,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.SYNC_MOBILE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> MediaEvidenceRead:
    try:
        result = await OperationsService(session).create_activity_media_evidence(
            organization_id=UUID(principal.organization_id),
            actor_user_id=UUID(principal.user_id),
            activity_id=visit_request_id,
            payload=payload,
            actor_roles=principal.roles,
            actor_project_ids=principal.project_ids,
        )
        await session.commit()
        return result
    except ValueError as exc:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception:
        await session.rollback()
        raise


@router.get("/sync", response_model=MobileSyncPackageRead, summary="Get mobile sync package")
async def mobile_sync_package(
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.SYNC_MOBILE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> MobileSyncPackageRead:
    package = await MobileService(session).sync_package(principal)
    await session.commit()
    return package


@router.post("/sync", response_model=MobileSyncUploadRead, summary="Upload mobile sync queue")
async def mobile_sync_upload(
    payload: MobileSyncQueueUpload,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.SYNC_MOBILE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> MobileSyncUploadRead:
    result = await MobileService(session).upload_sync_queue(principal=principal, payload=payload)
    await session.commit()
    return result


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
    payload: MobileAttachmentRead,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.SYNC_MOBILE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> MobileActionAcceptedRead:
    result = await MobileService(session).upload_attachment(principal=principal, payload=payload)
    await session.commit()
    return result


@router.post("/audit-events", response_model=MobileAuditEventUploadRead, summary="Upload mobile audit events")
async def mobile_audit_events_upload(
    payload: MobileAuditEventUpload,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.SYNC_MOBILE))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> MobileAuditEventUploadRead:
    result = await MobileService(session).upload_audit_events(principal=principal, payload=payload)
    await session.commit()
    return result
