from datetime import UTC, datetime
from typing import Annotated
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies import require_permission
from app.app_db import get_session
from app.core.permissions import Permission
from app.schemas.administration import (
    AdministrationSummaryRead,
    ApiKeyCreate,
    ApiKeyRead,
    BackupJobCreate,
    BackupJobRead,
    FeatureFlagRead,
    FeatureFlagUpsert,
    IntegrationCreate,
    IntegrationRead,
    LocationCreate,
    LocationRead,
    LocationUpdate,
    MobileCrashReportCreate,
    MobileCrashReportRead,
    MobileDeviceAction,
    MobileDeviceRead,
    MobileFeedbackCreate,
    MobileFeedbackRead,
    MobileMonitoringSummaryRead,
    MobilePilotCreate,
    MobilePilotRead,
    MobileTestingRecordCreate,
    MobileTestingRecordRead,
    MobileVersionRead,
    MobileVersionUpsert,
    NotificationRuleCreate,
    NotificationRuleRead,
    NotificationRuleUpdate,
    RecoveryJobCreate,
    RecoveryJobRead,
    ReferenceListCreate,
    ReferenceListRead,
    ReferenceListUpdate,
    ReferenceValueCreate,
    ReferenceValueRead,
    ReferenceValueUpdate,
    SystemAuditLogRead,
    SystemSettingRead,
    SystemSettingUpsert,
)
from app.schemas.auth import CurrentPrincipal
from app.services.administration import AdministrationNotFoundError, AdministrationService

router = APIRouter()

require_administration_access = require_permission(Permission.ORGANIZATION_MANAGE)


def actor_uuid(principal: CurrentPrincipal) -> UUID:
    return UUID(principal.user_id)


def audit_organization_uuid(principal: CurrentPrincipal) -> UUID:
    return UUID(principal.platform_organization_id or principal.organization_id)


def not_found(exc: AdministrationNotFoundError) -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


def compare_semver(left: str, right: str) -> int:
    left_parts = [int(part) for part in left.split(".") if part.isdigit()]
    right_parts = [int(part) for part in right.split(".") if part.isdigit()]
    length = max(len(left_parts), len(right_parts))
    for index in range(length):
        difference = (left_parts[index] if index < len(left_parts) else 0) - (
            right_parts[index] if index < len(right_parts) else 0
        )
        if difference != 0:
            return difference
    return 0


@router.get("/summary", response_model=AdministrationSummaryRead, summary="Read administration summary")
async def summary(
    _principal: Annotated[CurrentPrincipal, Depends(require_administration_access)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> AdministrationSummaryRead:
    return await AdministrationService(session).summary()


@router.get("/locations", response_model=list[LocationRead], summary="List platform locations")
async def list_locations(
    _principal: Annotated[CurrentPrincipal, Depends(require_administration_access)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[LocationRead]:
    return await AdministrationService(session).list_locations()


@router.post("/locations", response_model=LocationRead, summary="Create a platform location")
async def create_location(
    payload: LocationCreate,
    principal: Annotated[CurrentPrincipal, Depends(require_administration_access)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> LocationRead:
    return await AdministrationService(session).create_location(actor_uuid(principal), audit_organization_uuid(principal), payload)


@router.patch("/locations/{location_id}", response_model=LocationRead, summary="Update or archive a platform location")
async def update_location(
    location_id: UUID,
    payload: LocationUpdate,
    principal: Annotated[CurrentPrincipal, Depends(require_administration_access)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> LocationRead:
    try:
        return await AdministrationService(session).update_location(actor_uuid(principal), audit_organization_uuid(principal), location_id, payload)
    except AdministrationNotFoundError as exc:
        raise not_found(exc) from exc


@router.get("/reference-lists", response_model=list[ReferenceListRead], summary="List platform reference lists")
async def list_reference_lists(
    _principal: Annotated[CurrentPrincipal, Depends(require_administration_access)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[ReferenceListRead]:
    return await AdministrationService(session).list_reference_lists()


@router.post("/reference-lists", response_model=ReferenceListRead, summary="Create a platform reference list")
async def create_reference_list(
    payload: ReferenceListCreate,
    principal: Annotated[CurrentPrincipal, Depends(require_administration_access)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ReferenceListRead:
    return await AdministrationService(session).create_reference_list(actor_uuid(principal), audit_organization_uuid(principal), payload)


@router.patch("/reference-lists/{reference_list_id}", response_model=ReferenceListRead, summary="Update a platform reference list")
async def update_reference_list(
    reference_list_id: UUID,
    payload: ReferenceListUpdate,
    principal: Annotated[CurrentPrincipal, Depends(require_administration_access)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ReferenceListRead:
    try:
        return await AdministrationService(session).update_reference_list(actor_uuid(principal), audit_organization_uuid(principal), reference_list_id, payload)
    except AdministrationNotFoundError as exc:
        raise not_found(exc) from exc


@router.post("/reference-lists/{reference_list_id}/values", response_model=ReferenceValueRead, summary="Create a reference value")
async def create_reference_value(
    reference_list_id: UUID,
    payload: ReferenceValueCreate,
    principal: Annotated[CurrentPrincipal, Depends(require_administration_access)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ReferenceValueRead:
    try:
        return await AdministrationService(session).create_reference_value(actor_uuid(principal), audit_organization_uuid(principal), reference_list_id, payload)
    except AdministrationNotFoundError as exc:
        raise not_found(exc) from exc


@router.patch("/reference-values/{value_id}", response_model=ReferenceValueRead, summary="Update a reference value")
async def update_reference_value(
    value_id: UUID,
    payload: ReferenceValueUpdate,
    principal: Annotated[CurrentPrincipal, Depends(require_administration_access)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ReferenceValueRead:
    try:
        return await AdministrationService(session).update_reference_value(actor_uuid(principal), audit_organization_uuid(principal), value_id, payload)
    except AdministrationNotFoundError as exc:
        raise not_found(exc) from exc


@router.get("/notification-rules", response_model=list[NotificationRuleRead], summary="List notification rules")
async def list_notification_rules(
    _principal: Annotated[CurrentPrincipal, Depends(require_administration_access)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[NotificationRuleRead]:
    return await AdministrationService(session).list_notification_rules()


@router.post("/notification-rules", response_model=NotificationRuleRead, summary="Create a notification rule")
async def create_notification_rule(
    payload: NotificationRuleCreate,
    principal: Annotated[CurrentPrincipal, Depends(require_administration_access)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> NotificationRuleRead:
    return await AdministrationService(session).create_notification_rule(actor_uuid(principal), audit_organization_uuid(principal), payload)


@router.patch("/notification-rules/{rule_id}", response_model=NotificationRuleRead, summary="Update a notification rule")
async def update_notification_rule(
    rule_id: UUID,
    payload: NotificationRuleUpdate,
    principal: Annotated[CurrentPrincipal, Depends(require_administration_access)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> NotificationRuleRead:
    try:
        return await AdministrationService(session).update_notification_rule(actor_uuid(principal), audit_organization_uuid(principal), rule_id, payload)
    except AdministrationNotFoundError as exc:
        raise not_found(exc) from exc


@router.get("/api-keys", response_model=list[ApiKeyRead], summary="List administration API keys")
async def list_api_keys(
    _principal: Annotated[CurrentPrincipal, Depends(require_administration_access)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[ApiKeyRead]:
    return await AdministrationService(session).list_api_keys()


@router.post("/api-keys", response_model=ApiKeyRead, summary="Create an administration API key")
async def create_api_key(
    payload: ApiKeyCreate,
    principal: Annotated[CurrentPrincipal, Depends(require_administration_access)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ApiKeyRead:
    return await AdministrationService(session).create_api_key(actor_uuid(principal), audit_organization_uuid(principal), payload)


@router.post("/api-keys/{api_key_id}/rotate", response_model=ApiKeyRead, summary="Rotate an administration API key")
async def rotate_api_key(
    api_key_id: UUID,
    principal: Annotated[CurrentPrincipal, Depends(require_administration_access)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ApiKeyRead:
    try:
        return await AdministrationService(session).rotate_api_key(actor_uuid(principal), audit_organization_uuid(principal), api_key_id)
    except AdministrationNotFoundError as exc:
        raise not_found(exc) from exc


@router.post("/api-keys/{api_key_id}/revoke", response_model=ApiKeyRead, summary="Revoke an administration API key")
async def revoke_api_key(
    api_key_id: UUID,
    principal: Annotated[CurrentPrincipal, Depends(require_administration_access)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ApiKeyRead:
    try:
        return await AdministrationService(session).revoke_api_key(actor_uuid(principal), audit_organization_uuid(principal), api_key_id)
    except AdministrationNotFoundError as exc:
        raise not_found(exc) from exc


@router.get("/integrations", response_model=list[IntegrationRead], summary="List platform integrations")
async def list_integrations(
    _principal: Annotated[CurrentPrincipal, Depends(require_administration_access)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[IntegrationRead]:
    return await AdministrationService(session).list_integrations()


@router.post("/integrations", response_model=IntegrationRead, summary="Create a platform integration")
async def create_integration(
    payload: IntegrationCreate,
    principal: Annotated[CurrentPrincipal, Depends(require_administration_access)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> IntegrationRead:
    return await AdministrationService(session).create_integration(actor_uuid(principal), audit_organization_uuid(principal), payload)


@router.post("/integrations/{integration_id}/test", response_model=IntegrationRead, summary="Test a platform integration")
async def test_integration(
    integration_id: UUID,
    principal: Annotated[CurrentPrincipal, Depends(require_administration_access)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> IntegrationRead:
    try:
        return await AdministrationService(session).test_integration(actor_uuid(principal), audit_organization_uuid(principal), integration_id)
    except AdministrationNotFoundError as exc:
        raise not_found(exc) from exc


@router.post("/integrations/{integration_id}/disconnect", response_model=IntegrationRead, summary="Disconnect a platform integration")
async def disconnect_integration(
    integration_id: UUID,
    principal: Annotated[CurrentPrincipal, Depends(require_administration_access)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> IntegrationRead:
    try:
        return await AdministrationService(session).disconnect_integration(actor_uuid(principal), audit_organization_uuid(principal), integration_id)
    except AdministrationNotFoundError as exc:
        raise not_found(exc) from exc


@router.get("/system-settings", response_model=list[SystemSettingRead], summary="List system settings")
async def list_settings(
    _principal: Annotated[CurrentPrincipal, Depends(require_administration_access)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[SystemSettingRead]:
    return await AdministrationService(session).list_settings()


@router.put("/system-settings", response_model=SystemSettingRead, summary="Create or update a system setting")
async def upsert_setting(
    payload: SystemSettingUpsert,
    principal: Annotated[CurrentPrincipal, Depends(require_administration_access)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> SystemSettingRead:
    return await AdministrationService(session).upsert_setting(actor_uuid(principal), audit_organization_uuid(principal), payload)


@router.get("/feature-flags", response_model=list[FeatureFlagRead], summary="List feature flags")
async def list_feature_flags(
    _principal: Annotated[CurrentPrincipal, Depends(require_administration_access)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[FeatureFlagRead]:
    return await AdministrationService(session).list_feature_flags()


@router.put("/feature-flags", response_model=FeatureFlagRead, summary="Create or update a feature flag")
async def upsert_feature_flag(
    payload: FeatureFlagUpsert,
    principal: Annotated[CurrentPrincipal, Depends(require_administration_access)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> FeatureFlagRead:
    return await AdministrationService(session).upsert_feature_flag(actor_uuid(principal), audit_organization_uuid(principal), payload)


@router.get("/backups", response_model=list[BackupJobRead], summary="List backup jobs")
async def list_backup_jobs(
    _principal: Annotated[CurrentPrincipal, Depends(require_administration_access)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[BackupJobRead]:
    return await AdministrationService(session).list_backup_jobs()


@router.post("/backups", response_model=BackupJobRead, summary="Create a backup job request")
async def create_backup_job(
    payload: BackupJobCreate,
    principal: Annotated[CurrentPrincipal, Depends(require_administration_access)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> BackupJobRead:
    return await AdministrationService(session).create_backup_job(actor_uuid(principal), audit_organization_uuid(principal), payload)


@router.post("/recoveries", response_model=RecoveryJobRead, summary="Request a recovery operation")
async def request_recovery(
    payload: RecoveryJobCreate,
    principal: Annotated[CurrentPrincipal, Depends(require_administration_access)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> RecoveryJobRead:
    return await AdministrationService(session).request_recovery(actor_uuid(principal), audit_organization_uuid(principal), payload)


@router.get("/audit-logs", response_model=list[SystemAuditLogRead], summary="List immutable administration audit logs")
async def list_system_audit_logs(
    _principal: Annotated[CurrentPrincipal, Depends(require_administration_access)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[SystemAuditLogRead]:
    return await AdministrationService(session).list_system_audit_logs()


@router.get("/mobile-devices", response_model=list[MobileDeviceRead], summary="List registered mobile devices")
async def list_mobile_devices(
    principal: Annotated[CurrentPrincipal, Depends(require_administration_access)],
) -> list[MobileDeviceRead]:
    now = datetime.now(UTC)
    return [
        MobileDeviceRead(
            device_id="pilot-device-placeholder",
            device_name="Pilot Android Device",
            user_id=UUID(principal.user_id),
            organization_id=UUID(principal.organization_id),
            platform="Android",
            android_version="Android-ready",
            app_version="0.1.0",
            registered_at=now,
            last_sync_at=None,
            last_login_at=now,
            status="Active",
        )
    ]


@router.get("/mobile-devices/{device_id}", response_model=MobileDeviceRead, summary="Read mobile device details")
async def read_mobile_device(
    device_id: str,
    principal: Annotated[CurrentPrincipal, Depends(require_administration_access)],
) -> MobileDeviceRead:
    now = datetime.now(UTC)
    return MobileDeviceRead(
        device_id=device_id,
        device_name="Pilot Android Device",
        user_id=UUID(principal.user_id),
        organization_id=UUID(principal.organization_id),
        platform="Android",
        android_version="Android-ready",
        app_version="0.1.0",
        registered_at=now,
        last_login_at=now,
        status="Active",
    )


@router.post("/mobile-devices/{device_id}/disable", response_model=MobileDeviceRead, summary="Disable a mobile device")
async def disable_mobile_device(
    device_id: str,
    _payload: MobileDeviceAction,
    principal: Annotated[CurrentPrincipal, Depends(require_administration_access)],
) -> MobileDeviceRead:
    device = await read_mobile_device(device_id, principal)
    device.status = "Blocked"
    device.remote_logout_required = True
    return device


@router.post("/mobile-devices/{device_id}/force-logout", response_model=MobileDeviceRead, summary="Force logout on a mobile device")
async def force_logout_mobile_device(
    device_id: str,
    _payload: MobileDeviceAction,
    principal: Annotated[CurrentPrincipal, Depends(require_administration_access)],
) -> MobileDeviceRead:
    device = await read_mobile_device(device_id, principal)
    device.remote_logout_required = True
    return device


@router.get("/mobile-versions", response_model=MobileVersionRead, summary="Read mobile app version policy")
async def read_mobile_versions(
    _principal: Annotated[CurrentPrincipal, Depends(require_administration_access)],
) -> MobileVersionRead:
    return MobileVersionRead()


@router.put("/mobile-versions", response_model=MobileVersionRead, summary="Update mobile app version policy")
async def update_mobile_versions(
    payload: MobileVersionUpsert,
    _principal: Annotated[CurrentPrincipal, Depends(require_administration_access)],
) -> MobileVersionRead:
    mandatory = compare_semver(payload.current_production_version, payload.minimum_supported_version) < 0
    return MobileVersionRead(
        current_production_version=payload.current_production_version,
        minimum_supported_version=payload.minimum_supported_version,
        staging_version=payload.staging_version,
        optional_update=not mandatory,
        mandatory_update=mandatory,
        release_notes=payload.release_notes,
    )


@router.get("/mobile-pilots", response_model=list[MobilePilotRead], summary="List mobile pilot programs")
async def list_mobile_pilots(
    _principal: Annotated[CurrentPrincipal, Depends(require_administration_access)],
) -> list[MobilePilotRead]:
    return []


@router.post("/mobile-pilots", response_model=MobilePilotRead, summary="Create a mobile pilot program")
async def create_mobile_pilot(
    payload: MobilePilotCreate,
    _principal: Annotated[CurrentPrincipal, Depends(require_administration_access)],
) -> MobilePilotRead:
    return MobilePilotRead(id=uuid4(), **payload.model_dump())


@router.get("/mobile-monitoring", response_model=MobileMonitoringSummaryRead, summary="Read mobile monitoring dashboard")
async def mobile_monitoring(
    _principal: Annotated[CurrentPrincipal, Depends(require_administration_access)],
) -> MobileMonitoringSummaryRead:
    return MobileMonitoringSummaryRead(app_versions={"0.1.0": 1}, active_devices=1, active_users=1)


@router.get("/mobile-monitoring/crashes", response_model=list[MobileCrashReportRead], summary="List mobile crash reports")
async def list_mobile_crashes(
    _principal: Annotated[CurrentPrincipal, Depends(require_administration_access)],
) -> list[MobileCrashReportRead]:
    return []


@router.post("/mobile-monitoring/crashes", response_model=MobileCrashReportRead, summary="Create mobile crash report")
async def create_mobile_crash(
    payload: MobileCrashReportCreate,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.SYNC_MOBILE))],
) -> MobileCrashReportRead:
    return MobileCrashReportRead(id=uuid4(), user_id=UUID(principal.user_id), created_at=datetime.now(UTC), **payload.model_dump())


@router.get("/mobile-feedback", response_model=list[MobileFeedbackRead], summary="List mobile feedback")
async def list_mobile_feedback(
    _principal: Annotated[CurrentPrincipal, Depends(require_administration_access)],
) -> list[MobileFeedbackRead]:
    return []


@router.post("/mobile-feedback", response_model=MobileFeedbackRead, summary="Submit mobile feedback")
async def create_mobile_feedback(
    payload: MobileFeedbackCreate,
    principal: Annotated[CurrentPrincipal, Depends(require_permission(Permission.SYNC_MOBILE))],
) -> MobileFeedbackRead:
    return MobileFeedbackRead(id=uuid4(), user_id=UUID(principal.user_id), created_at=datetime.now(UTC), **payload.model_dump())


@router.get("/mobile-testing", response_model=list[MobileTestingRecordRead], summary="List mobile field test records")
async def list_mobile_testing(
    _principal: Annotated[CurrentPrincipal, Depends(require_administration_access)],
) -> list[MobileTestingRecordRead]:
    return []


@router.post("/mobile-testing", response_model=MobileTestingRecordRead, summary="Create mobile field test record")
async def create_mobile_testing(
    payload: MobileTestingRecordCreate,
    principal: Annotated[CurrentPrincipal, Depends(require_administration_access)],
) -> MobileTestingRecordRead:
    return MobileTestingRecordRead(id=uuid4(), tested_by_user_id=UUID(principal.user_id), tested_at=datetime.now(UTC), **payload.model_dump())
