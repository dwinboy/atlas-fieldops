import json
import os
from datetime import UTC, datetime, timedelta
from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql.elements import ColumnElement

from app.api.v1.dependencies import require_role
from app.app_db import get_session
from app.core.config import settings
from app.models.administration import FeatureFlag, Integration, SystemSetting
from app.models.audit import AuditLog
from app.models.collection import DataForm, FieldOfficerProfile, OfficerAssignment, Project, Submission
from app.models.identity import Membership, Organization, Role, User
from app.models.marketing import MarketingLead
from app.models.operations import Beneficiary, DataExportJob, DataImportJob, EntityCategory
from app.repositories.audit import AuditRepository
from app.repositories.identity import OrganizationRepository
from app.schemas.auth import CurrentPrincipal
from app.schemas.platform import (
    PlatformActionResult,
    PlatformApiGovernancePolicyRead,
    PlatformApiGovernancePolicyUpdate,
    PlatformAiGovernancePolicyRead,
    PlatformAiGovernancePolicyUpdate,
    PlatformAuditLogRead,
    PlatformBackupJobRead,
    PlatformBackupPolicyRead,
    PlatformBackupPolicyUpdate,
    PlatformBackupRequest,
    PlatformCompliancePolicyRead,
    PlatformCompliancePolicyUpdate,
    PlatformCommunicationPolicyRead,
    PlatformCommunicationPolicyUpdate,
    PlatformDataIsolationIssueRead,
    PlatformFeatureFlagUpdate,
    PlatformFeatureFlagRead,
    PlatformHealthServiceRead,
    PlatformIntegrationRead,
    PlatformIntegrationUpdate,
    PlatformLeadRead,
    PlatformMobileFleetDeviceRead,
    PlatformMobileFleetSummaryRead,
    PlatformObservabilityPolicyRead,
    PlatformObservabilityPolicyUpdate,
    PlatformOrganizationPlanRead,
    PlatformOrganizationPlanUpdate,
    PlatformOrganizationUsageRead,
    PlatformQuotaPolicyRead,
    PlatformQuotaPolicyUpdate,
    PlatformReleaseRead,
    PlatformReleaseUpdate,
    PlatformRetentionPolicyRead,
    PlatformRetentionPolicyUpdate,
    PlatformRoleTemplateRead,
    PlatformSecurityEventRead,
    PlatformSecurityPolicyRead,
    PlatformSecurityPolicyUpdate,
    PlatformSectorPackRead,
    PlatformSlaPolicyRead,
    PlatformSlaPolicyUpdate,
    PlatformSettingsRead,
    PlatformSummaryRead,
    PlatformSupportSessionRead,
    PlatformSystemHealthRead,
    PlatformTenantSupportQueueItemRead,
    PlatformTenantLifecyclePolicyRead,
    PlatformTenantLifecyclePolicyUpdate,
    PlatformUserSecurityAction,
    PlatformUserRead,
)
from app.services.sector_packs import list_sector_packs


def _platform_list(value: object) -> list[Any]:
    return value if isinstance(value, list) else []

router = APIRouter()

DEFAULT_TENANT_MODULES = ["projects", "forms", "field_operations", "submissions", "mapping", "indicators", "reports", "data_quality"]


async def count_rows(
    session: AsyncSession,
    model: type[Any],
    *conditions: ColumnElement[bool],
) -> int:
    result = await session.execute(select(func.count()).select_from(model).where(*conditions))
    return int(result.scalar_one())


def parse_metadata(value: str) -> dict[str, object]:
    try:
        parsed = json.loads(value or "{}")
    except json.JSONDecodeError:
        return {}
    return parsed if isinstance(parsed, dict) else {}


def principal_user_uuid(principal: CurrentPrincipal) -> UUID | None:
    try:
        return UUID(principal.user_id)
    except ValueError:
        return None


def principal_platform_organization_uuid(principal: CurrentPrincipal) -> UUID:
    return UUID(principal.platform_organization_id or principal.organization_id)


def feature_flag_catalog(now: datetime) -> list[PlatformFeatureFlagRead]:
    return [
        PlatformFeatureFlagRead(key="mapping", label="Mapping", description="GIS maps, boundaries, GPS validation, and spatial analysis.", global_enabled=True, environment=settings.app_env, updated_at=now),
        PlatformFeatureFlagRead(key="indicators", label="Indicators", description="Indicator library, targets, baselines, and results frameworks.", global_enabled=True, environment=settings.app_env, updated_at=now),
        PlatformFeatureFlagRead(key="reports", label="Reports", description="Standard, custom, scheduled, and donor reports.", global_enabled=True, environment=settings.app_env, updated_at=now),
        PlatformFeatureFlagRead(key="data_quality", label="Data Quality", description="Quality scoring, duplicate detection, risk alerts, and investigations.", global_enabled=True, environment=settings.app_env, updated_at=now),
        PlatformFeatureFlagRead(key="mobile_app", label="Mobile App", description="Offline mobile collection and sync workflows.", global_enabled=True, environment=settings.app_env, updated_at=now),
        PlatformFeatureFlagRead(key="ai_features", label="AI Features", description="AI-assisted review, scoring, fraud signals, and recommendations.", global_enabled=False, rollout_percentage=0, environment=settings.app_env, updated_at=now),
    ]


def feature_flag_defaults(now: datetime) -> dict[str, PlatformFeatureFlagRead]:
    return {flag.key: flag for flag in feature_flag_catalog(now)}


def default_security_policy(updated_at: datetime | None = None) -> PlatformSecurityPolicyRead:
    return PlatformSecurityPolicyRead(
        mfa_required_for_admins=False,
        mfa_required_for_all_users=False,
        password_min_length=10,
        password_rotation_days=180,
        session_timeout_minutes=settings.access_token_expire_minutes,
        failed_login_lock_threshold=5,
        support_session_timeout_minutes=60,
        ip_allowlist_enabled=False,
        updated_at=updated_at,
    )


def default_backup_policy(updated_at: datetime | None = None) -> PlatformBackupPolicyRead:
    return PlatformBackupPolicyRead(
        backup_frequency="Daily",
        retention_days=90,
        configuration_retention_days=30,
        tenant_export_enabled=True,
        restore_requires_approval=True,
        restore_approver_role="super_admin",
        anonymize_archived_data=False,
        updated_at=updated_at,
    )


def default_tenant_lifecycle_policy(updated_at: datetime | None = None) -> PlatformTenantLifecyclePolicyRead:
    return PlatformTenantLifecyclePolicyRead(
        trial_days=14,
        grace_days=7,
        suspend_after_grace=True,
        require_owner_before_activation=True,
        require_project_before_activation=False,
        default_plan="Professional",
        default_user_limit=50,
        default_submission_limit=100_000,
        onboarding_checklist=[
            "Create organization owner",
            "Invite core users",
            "Create first project",
            "Publish first form",
            "Assign field officers",
        ],
        updated_at=updated_at,
    )


def default_compliance_policy(updated_at: datetime | None = None) -> PlatformCompliancePolicyRead:
    return PlatformCompliancePolicyRead(
        default_data_region="EU",
        allowed_data_regions=["EU", "US", "Africa", "Custom"],
        pii_masking_default=True,
        require_export_approval=True,
        require_dpa_for_exports=True,
        audit_retention_days=3650,
        data_processing_contact="",
        subprocessors_public_url="",
        updated_at=updated_at,
    )


def default_sla_policy(updated_at: datetime | None = None) -> PlatformSlaPolicyRead:
    return PlatformSlaPolicyRead(
        uptime_target_percent=99.5,
        critical_response_minutes=60,
        high_response_hours=4,
        normal_response_hours=24,
        support_session_max_minutes=60,
        escalation_email="",
        incident_manager="",
        status_page_url="",
        updated_at=updated_at,
    )


def default_quota_policy(updated_at: datetime | None = None) -> PlatformQuotaPolicyRead:
    return PlatformQuotaPolicyRead(
        warning_threshold_percent=80,
        critical_threshold_percent=95,
        api_rate_limit_per_minute=600,
        storage_overage_action="warn",
        submission_overage_action="warn",
        notify_owners_on_warning=True,
        notify_super_admins_on_critical=True,
        updated_at=updated_at,
    )


def default_observability_policy(updated_at: datetime | None = None) -> PlatformObservabilityPolicyRead:
    return PlatformObservabilityPolicyRead(
        health_check_interval_seconds=60,
        api_error_rate_threshold_percent=5.0,
        slow_request_threshold_ms=2000,
        mobile_sync_failure_threshold_percent=10.0,
        offline_device_alert_days=7,
        alert_email="",
        pager_channel="",
        updated_at=updated_at,
    )


def default_retention_policy(updated_at: datetime | None = None) -> PlatformRetentionPolicyRead:
    return PlatformRetentionPolicyRead(
        tenant_data_retention_days=2555,
        audit_log_retention_days=3650,
        backup_retention_days=90,
        export_retention_days=30,
        inactive_tenant_archive_days=180,
        anonymize_deleted_user_days=30,
        legal_hold_enabled=True,
        updated_at=updated_at,
    )


def default_api_governance_policy(updated_at: datetime | None = None) -> PlatformApiGovernancePolicyRead:
    return PlatformApiGovernancePolicyRead(
        public_api_enabled=True,
        api_key_expiry_days=180,
        webhook_retry_attempts=5,
        webhook_timeout_seconds=15,
        secret_rotation_days=90,
        require_scoped_api_keys=True,
        audit_external_access=True,
        updated_at=updated_at,
    )


def default_ai_governance_policy(updated_at: datetime | None = None) -> PlatformAiGovernancePolicyRead:
    return PlatformAiGovernancePolicyRead(
        ai_features_enabled=True,
        default_provider="OpenAI",
        pii_redaction_required=True,
        human_review_required=True,
        monthly_token_budget=1_000_000,
        max_prompt_retention_days=30,
        audit_ai_actions=True,
        updated_at=updated_at,
    )


def default_communication_policy(updated_at: datetime | None = None) -> PlatformCommunicationPolicyRead:
    return PlatformCommunicationPolicyRead(
        transactional_email_enabled=True,
        default_from_email="support@atlasfieldops.com",
        support_reply_to_email="support@atlasfieldops.com",
        sms_enabled=False,
        push_notifications_enabled=True,
        tenant_broadcasts_enabled=True,
        notification_log_retention_days=365,
        updated_at=updated_at,
    )


def runtime_release_read(value: dict[str, object] | None = None, updated_at: datetime | None = None) -> PlatformReleaseRead:
    stored = value or {}
    backend_version = str(
        stored.get("backend_version")
        or os.environ.get("RAILWAY_GIT_COMMIT_SHA")
        or os.environ.get("VERCEL_GIT_COMMIT_SHA")
        or os.environ.get("GIT_SHA")
        or "local"
    )
    if len(backend_version) > 16 and backend_version != "local":
        backend_version = backend_version[:12]
    database_ready = bool(settings.database_url.strip())
    jwt_ready = len(os.environ.get("JWT_SECRET", "").strip()) >= 32
    redis_ready = bool(settings.redis_url.strip()) and "localhost" not in settings.redis_url
    kafka_ready = bool(settings.kafka_bootstrap_servers.strip()) and "localhost" not in settings.kafka_bootstrap_servers
    checklist = [
        "Database configured" if database_ready else "Configure production database",
        "JWT secret configured" if jwt_ready else "Set a strong JWT_SECRET",
        "Redis configured" if redis_ready else "Configure production Redis before scale rollout",
        "Kafka configured" if kafka_ready else "Configure Kafka/event stream before high-volume rollout",
        "Mobile version recorded",
    ]
    return PlatformReleaseRead(
        environment=settings.app_env,
        backend_version=backend_version,
        frontend_version=str(stored.get("frontend_version") or "managed-by-vercel"),
        mobile_version=str(stored.get("mobile_version") or "1.0.0-test"),
        release_status=str(stored.get("release_status") or "Ready for review"),
        maintenance_mode=bool(stored.get("maintenance_mode", False)),
        maintenance_message=str(stored.get("maintenance_message") or ""),
        maintenance_starts_at=stored.get("maintenance_starts_at") if isinstance(stored.get("maintenance_starts_at"), str) else None,
        maintenance_ends_at=stored.get("maintenance_ends_at") if isinstance(stored.get("maintenance_ends_at"), str) else None,
        affected_services=[str(item) for item in _platform_list(stored.get("affected_services"))],
        announcement_enabled=bool(stored.get("announcement_enabled", False)),
        announcement_title=str(stored.get("announcement_title") or ""),
        announcement_body=str(stored.get("announcement_body") or ""),
        announcement_tone=str(stored.get("announcement_tone") or "info"),
        database_ready=database_ready,
        jwt_ready=jwt_ready,
        redis_ready=redis_ready,
        kafka_ready=kafka_ready,
        release_notes=str(stored.get("release_notes") or ""),
        checklist=checklist,
        updated_at=updated_at,
    )


@router.get("/summary", response_model=PlatformSummaryRead, summary="Platform operations summary")
async def platform_summary(
    _principal: Annotated[CurrentPrincipal, Depends(require_role("super_admin"))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> PlatformSummaryRead:
    organization_count = await count_rows(session, Organization, Organization.deleted_at.is_(None))
    active_organization_count = await count_rows(
        session,
        Organization,
        Organization.deleted_at.is_(None),
        Organization.is_active.is_(True),
    )
    tenant_user_count = await count_rows(
        session,
        Membership,
        Membership.deleted_at.is_(None),
    )
    platform_admin_count = await count_rows(
        session,
        Membership,
        Membership.deleted_at.is_(None),
        Role.id == Membership.role_id,
        Role.deleted_at.is_(None),
        Role.name == "super_admin",
    )
    audit_event_count = await count_rows(session, AuditLog)

    repository = OrganizationRepository(session)
    organizations = await repository.list_all()
    organizations_without_owner_count = 0
    for organization in organizations:
        if not await repository.owner_email(organization.id):
            organizations_without_owner_count += 1

    return PlatformSummaryRead(
        organization_count=organization_count,
        active_organization_count=active_organization_count,
        inactive_organization_count=max(organization_count - active_organization_count, 0),
        tenant_user_count=tenant_user_count,
        platform_admin_count=platform_admin_count,
        organizations_without_owner_count=organizations_without_owner_count,
        audit_event_count=audit_event_count,
    )


@router.get("/users", response_model=list[PlatformUserRead], summary="List platform administrator accounts")
async def platform_users(
    _principal: Annotated[CurrentPrincipal, Depends(require_role("super_admin"))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[PlatformUserRead]:
    result = await session.execute(
        select(User, Membership, Role, Organization)
        .join(Membership, Membership.user_id == User.id)
        .join(Role, Role.id == Membership.role_id)
        .join(Organization, Organization.id == Membership.organization_id)
        .where(
            User.deleted_at.is_(None),
            Membership.deleted_at.is_(None),
            Role.deleted_at.is_(None),
            Organization.deleted_at.is_(None),
        )
        .order_by(User.email)
    )
    return [
        PlatformUserRead(
            user_id=user.id,
            email=user.email,
            full_name=user.full_name,
            is_active=user.is_active,
            role_name=role.name,
            organization_id=organization.id,
            organization_name=organization.name,
            organization_slug=organization.slug,
            membership_active=membership.is_active,
            created_at=user.created_at,
            updated_at=user.updated_at,
        )
        for user, membership, role, organization in result.all()
    ]


@router.get("/roles", response_model=list[PlatformRoleTemplateRead], summary="List protected platform role templates")
async def platform_roles(
    _principal: Annotated[CurrentPrincipal, Depends(require_role("super_admin"))],
) -> list[PlatformRoleTemplateRead]:
    return [
        PlatformRoleTemplateRead(key="super_admin", label="Super Admin", scope="global", protected=True, permissions=["platform.*"]),
        PlatformRoleTemplateRead(key="owner", label="System Admin", scope="organization", protected=False, permissions=["organization.*", "users.*", "administration.*"]),
        PlatformRoleTemplateRead(key="me_manager", label="M&E Manager", scope="organization", permissions=["projects.*", "forms.*", "field_operations.*", "reports.view"]),
        PlatformRoleTemplateRead(key="data_manager", label="Data Manager", scope="project", permissions=["submissions.review", "data_quality.*", "reports.*"]),
        PlatformRoleTemplateRead(key="supervisor", label="Supervisor", scope="location/team", permissions=["assignments.view", "submissions.review_assigned"]),
        PlatformRoleTemplateRead(key="field_officer", label="Field Officer", scope="own records", permissions=["assignments.view_own", "submissions.create"]),
        PlatformRoleTemplateRead(key="donor_viewer", label="Viewer/Donor", scope="approved aggregates", permissions=["reports.view_approved"]),
    ]


@router.get("/feature-flags", response_model=list[PlatformFeatureFlagRead], summary="List platform feature flags")
async def platform_feature_flags(
    _principal: Annotated[CurrentPrincipal, Depends(require_role("super_admin"))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[PlatformFeatureFlagRead]:
    now = datetime.now(UTC)
    defaults = feature_flag_defaults(now)
    result = await session.execute(
        select(FeatureFlag).where(
            FeatureFlag.organization_id.is_(None),
            FeatureFlag.environment == settings.app_env,
            FeatureFlag.deleted_at.is_(None),
        )
    )
    for row in result.scalars().all():
        default = defaults.get(row.flag_key)
        defaults[row.flag_key] = PlatformFeatureFlagRead(
            key=row.flag_key,
            label=row.label or (default.label if default else row.flag_key.replace("_", " ").title()),
            description=row.description or (default.description if default else "Platform-managed feature flag."),
            global_enabled=row.enabled,
            rollout_percentage=row.rollout_percentage,
            environment=row.environment,
            organization_overrides=0,
            updated_at=row.updated_at,
        )
    return list(defaults.values())


@router.patch("/feature-flags/{flag_key}", response_model=PlatformFeatureFlagRead, summary="Audit a platform feature flag change")
async def update_platform_feature_flag(
    flag_key: str,
    payload: PlatformFeatureFlagUpdate,
    principal: Annotated[CurrentPrincipal, Depends(require_role("super_admin"))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> PlatformFeatureFlagRead:
    defaults = feature_flag_defaults(datetime.now(UTC))
    default = defaults.get(flag_key)
    if default is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Feature flag not found")
    result = await session.execute(
        select(FeatureFlag).where(
            FeatureFlag.organization_id.is_(None),
            FeatureFlag.environment == settings.app_env,
            FeatureFlag.flag_key == flag_key,
            FeatureFlag.deleted_at.is_(None),
        )
    )
    row = result.scalar_one_or_none()
    old_state = default.model_dump(mode="json")
    actor_id = principal_user_uuid(principal)
    next_enabled = payload.global_enabled if payload.global_enabled is not None else default.global_enabled
    next_rollout = payload.rollout_percentage if payload.rollout_percentage is not None else default.rollout_percentage
    if row is None:
        row = FeatureFlag(
            organization_id=None,
            flag_key=flag_key,
            label=default.label,
            description=default.description,
            enabled=next_enabled,
            rollout_percentage=next_rollout,
            environment=settings.app_env,
            created_by_user_id=actor_id,
            updated_by_user_id=actor_id,
        )
        session.add(row)
    else:
        old_state = PlatformFeatureFlagRead(
            key=row.flag_key,
            label=row.label,
            description=row.description or default.description,
            global_enabled=row.enabled,
            rollout_percentage=row.rollout_percentage,
            environment=row.environment,
            updated_at=row.updated_at,
        ).model_dump(mode="json")
        row.enabled = next_enabled
        row.rollout_percentage = next_rollout
        row.updated_by_user_id = actor_id
    flag = PlatformFeatureFlagRead(
        key=flag_key,
        label=row.label,
        description=row.description or default.description,
        global_enabled=row.enabled,
        rollout_percentage=row.rollout_percentage,
        environment=row.environment,
        updated_at=datetime.now(UTC),
    )
    await AuditRepository(session).append(
        organization_id=principal_platform_organization_uuid(principal),
        actor_user_id=actor_id,
        action="platform.feature_flag_changed",
        resource_type="feature_flag",
        resource_id=flag.key,
        metadata={
            "reason": payload.reason,
            "old_value": old_state,
            "new_value": flag.model_dump(mode="json"),
            "environment": settings.app_env,
        },
    )
    await session.commit()
    return flag


@router.get("/system-health", response_model=PlatformSystemHealthRead, summary="Read platform system health")
async def platform_system_health(
    _principal: Annotated[CurrentPrincipal, Depends(require_role("super_admin"))],
) -> PlatformSystemHealthRead:
    services = [
        PlatformHealthServiceRead(service="API", status="healthy", detail="FastAPI service is responding.", response_time_ms=42),
        PlatformHealthServiceRead(service="Database", status="healthy" if settings.database_url.strip() else "critical", detail="Database URL is configured." if settings.database_url.strip() else "Database URL is missing."),
        PlatformHealthServiceRead(service="Storage", status="warning", detail="Storage provider health check is architecture-ready."),
        PlatformHealthServiceRead(service="Queue", status="healthy" if settings.kafka_bootstrap_servers.strip() else "warning", detail="Kafka configured." if settings.kafka_bootstrap_servers.strip() else "Queue backend is not configured for this environment."),
        PlatformHealthServiceRead(service="Email", status="warning", detail="Email provider connection test endpoint is pending."),
        PlatformHealthServiceRead(service="Backups", status="warning", detail="Automated backup orchestration is architecture-ready."),
    ]
    status = "critical" if any(service.status == "critical" for service in services) else "warning" if any(service.status == "warning" for service in services) else "healthy"
    return PlatformSystemHealthRead(status=status, services=services)


@router.get("/security", response_model=list[PlatformSecurityEventRead], summary="List platform security events")
async def platform_security_events(
    _principal: Annotated[CurrentPrincipal, Depends(require_role("super_admin"))],
) -> list[PlatformSecurityEventRead]:
    now = datetime.now(UTC)
    return [
        PlatformSecurityEventRead(id="sec-session-policy", event_type="Session policy review", severity="medium", actor="System", organization=None, ip_address=None, device="Policy engine", created_at=now, status="monitoring"),
        PlatformSecurityEventRead(id="sec-mfa-readiness", event_type="MFA readiness", severity="medium", actor="System", organization=None, ip_address=None, device="Identity service", created_at=now, status="open"),
    ]


@router.get("/security-policy", response_model=PlatformSecurityPolicyRead, summary="Read platform security policy")
async def platform_security_policy(
    _principal: Annotated[CurrentPrincipal, Depends(require_role("super_admin"))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> PlatformSecurityPolicyRead:
    result = await session.execute(
        select(SystemSetting).where(
            SystemSetting.organization_id.is_(None),
            SystemSetting.environment == settings.app_env,
            SystemSetting.setting_key == "security-policy",
            SystemSetting.deleted_at.is_(None),
        )
    )
    setting = result.scalar_one_or_none()
    policy = default_security_policy(setting.updated_at if setting else None)
    if setting is None:
        return policy
    value = setting.setting_value_json
    return PlatformSecurityPolicyRead(
        mfa_required_for_admins=bool(value.get("mfa_required_for_admins", policy.mfa_required_for_admins)),
        mfa_required_for_all_users=bool(value.get("mfa_required_for_all_users", policy.mfa_required_for_all_users)),
        password_min_length=int(value.get("password_min_length", policy.password_min_length)),
        password_rotation_days=int(value.get("password_rotation_days", policy.password_rotation_days)),
        session_timeout_minutes=int(value.get("session_timeout_minutes", policy.session_timeout_minutes)),
        failed_login_lock_threshold=int(value.get("failed_login_lock_threshold", policy.failed_login_lock_threshold)),
        support_session_timeout_minutes=int(value.get("support_session_timeout_minutes", policy.support_session_timeout_minutes)),
        ip_allowlist_enabled=bool(value.get("ip_allowlist_enabled", policy.ip_allowlist_enabled)),
        updated_at=setting.updated_at,
    )


@router.patch("/security-policy", response_model=PlatformSecurityPolicyRead, summary="Update platform security policy")
async def update_platform_security_policy(
    payload: PlatformSecurityPolicyUpdate,
    principal: Annotated[CurrentPrincipal, Depends(require_role("super_admin"))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> PlatformSecurityPolicyRead:
    result = await session.execute(
        select(SystemSetting).where(
            SystemSetting.organization_id.is_(None),
            SystemSetting.environment == settings.app_env,
            SystemSetting.setting_key == "security-policy",
            SystemSetting.deleted_at.is_(None),
        )
    )
    setting = result.scalar_one_or_none()
    actor_id = principal_user_uuid(principal)
    value = payload.model_dump(exclude={"reason"}, mode="json")
    old_value = setting.setting_value_json if setting else default_security_policy().model_dump(mode="json")
    if setting is None:
        setting = SystemSetting(
            organization_id=None,
            category="Security",
            setting_key="security-policy",
            setting_value_json=value,
            environment=settings.app_env,
            is_sensitive=False,
            created_by_user_id=actor_id,
            updated_by_user_id=actor_id,
        )
        session.add(setting)
    else:
        setting.setting_value_json = value
        setting.updated_by_user_id = actor_id
    await AuditRepository(session).append(
        organization_id=principal_platform_organization_uuid(principal),
        actor_user_id=actor_id,
        action="platform.security_policy_updated",
        resource_type="security_policy",
        resource_id="global",
        metadata={"reason": payload.reason, "old_value": old_value, "new_value": value, "environment": settings.app_env},
    )
    await session.commit()
    return PlatformSecurityPolicyRead(**value, updated_at=datetime.now(UTC))


@router.post("/users/{user_id}/security-action", response_model=PlatformActionResult, summary="Run a Super Admin user security action")
async def platform_user_security_action(
    user_id: UUID,
    payload: PlatformUserSecurityAction,
    principal: Annotated[CurrentPrincipal, Depends(require_role("super_admin"))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> PlatformActionResult:
    if payload.action == "lock" and user_id == principal_user_uuid(principal):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Super Admins cannot lock their own account")
    result = await session.execute(
        select(User, Membership, Organization)
        .join(Membership, Membership.user_id == User.id)
        .join(Organization, Organization.id == Membership.organization_id)
        .where(
            User.id == user_id,
            User.deleted_at.is_(None),
            Membership.deleted_at.is_(None),
            Organization.deleted_at.is_(None),
        )
        .limit(1)
    )
    row = result.first()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    user, _membership, organization = row
    old_active = user.is_active
    if payload.action == "lock":
        user.is_active = False
    elif payload.action == "unlock":
        user.is_active = True
    await AuditRepository(session).append(
        organization_id=organization.id,
        actor_user_id=principal_user_uuid(principal),
        action=f"platform.user_{payload.action}",
        resource_type="user",
        resource_id=str(user.id),
        metadata={
            "reason": payload.reason,
            "email": user.email,
            "organization_slug": organization.slug,
            "old_active": old_active,
            "new_active": user.is_active,
        },
    )
    await session.commit()
    messages = {
        "lock": "User account locked.",
        "unlock": "User account unlocked.",
        "force_password_reset": "Password reset requirement recorded for identity provider integration.",
        "revoke_sessions": "Session revocation recorded for session store integration.",
        "require_mfa": "MFA requirement recorded for authentication provider integration.",
    }
    return PlatformActionResult(message=messages[payload.action])


@router.get("/integrations", response_model=list[PlatformIntegrationRead], summary="List platform-wide integrations")
async def platform_integrations(
    _principal: Annotated[CurrentPrincipal, Depends(require_role("super_admin"))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[PlatformIntegrationRead]:
    catalog = {
        "email": PlatformIntegrationRead(key="email", name="Email provider", provider_type="Email", status="not_connected", health="warning"),
        "sms": PlatformIntegrationRead(key="sms", name="SMS provider", provider_type="SMS", status="future_ready", health="warning"),
        "storage": PlatformIntegrationRead(key="storage", name="Object storage", provider_type="Storage", status="not_connected", health="warning"),
        "maps": PlatformIntegrationRead(key="maps", name="Map provider", provider_type="GIS", status="configured", health="healthy"),
        "monitoring": PlatformIntegrationRead(key="monitoring", name="Monitoring provider", provider_type="Observability", status="future_ready", health="warning"),
    }
    result = await session.execute(
        select(Integration).where(
            Integration.organization_id.is_(None),
            Integration.environment == settings.app_env,
            Integration.deleted_at.is_(None),
        )
    )
    for row in result.scalars().all():
        metadata = row.metadata_json if isinstance(row.metadata_json, dict) else {}
        key = str(metadata.get("key") or row.integration_type.lower())
        catalog[key] = PlatformIntegrationRead(
            key=key,
            name=row.name,
            provider_type=row.integration_type,
            status=row.status,
            health=str(metadata.get("health") or "warning"),
            last_sync_at=row.last_sync_at,
            secrets_visible=False,
        )
    return list(catalog.values())


@router.patch("/integrations/{integration_key}", response_model=PlatformIntegrationRead, summary="Update platform integration status")
async def update_platform_integration(
    integration_key: str,
    payload: PlatformIntegrationUpdate,
    principal: Annotated[CurrentPrincipal, Depends(require_role("super_admin"))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> PlatformIntegrationRead:
    catalog = {item.key: item for item in await platform_integrations(principal, session)}
    existing = catalog.get(integration_key)
    if existing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Integration not found")
    result = await session.execute(
        select(Integration).where(
            Integration.organization_id.is_(None),
            Integration.environment == settings.app_env,
            Integration.deleted_at.is_(None),
        )
    )
    row = next(
        (
            integration
            for integration in result.scalars().all()
            if str((integration.metadata_json or {}).get("key") or integration.integration_type.lower()) == integration_key
        ),
        None,
    )
    actor_id = principal_user_uuid(principal)
    old_value = existing.model_dump(mode="json")
    metadata = {"key": integration_key, "health": payload.health, "notes": payload.notes}
    if row is None:
        row = Integration(
            organization_id=None,
            name=existing.name,
            integration_type=existing.provider_type,
            status=payload.status,
            environment=settings.app_env,
            owner=payload.owner,
            metadata_json=metadata,
            created_by_user_id=actor_id,
            updated_by_user_id=actor_id,
        )
        session.add(row)
    else:
        row.status = payload.status
        row.owner = payload.owner
        row.metadata_json = {**(row.metadata_json or {}), **metadata}
        row.updated_by_user_id = actor_id
    updated = PlatformIntegrationRead(
        key=integration_key,
        name=row.name,
        provider_type=row.integration_type,
        status=row.status,
        health=payload.health,
        last_sync_at=row.last_sync_at,
        secrets_visible=False,
    )
    await AuditRepository(session).append(
        organization_id=principal_platform_organization_uuid(principal),
        actor_user_id=actor_id,
        action="platform.integration_updated",
        resource_type="integration",
        resource_id=integration_key,
        metadata={"reason": payload.reason, "old_value": old_value, "new_value": updated.model_dump(mode="json"), "notes": payload.notes},
    )
    await session.commit()
    return updated


@router.get("/mobile-fleet", response_model=PlatformMobileFleetSummaryRead, summary="Read platform mobile fleet")
async def platform_mobile_fleet(
    _principal: Annotated[CurrentPrincipal, Depends(require_role("super_admin"))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> PlatformMobileFleetSummaryRead:
    now = datetime.now(UTC)
    offline_before = now - timedelta(days=7)
    version_result = await session.execute(
        select(SystemSetting).where(
            SystemSetting.organization_id.is_(None),
            SystemSetting.environment == settings.app_env,
            SystemSetting.setting_key == "mobile-version-policy",
            SystemSetting.deleted_at.is_(None),
        )
    )
    version_settings = version_result.scalar_one_or_none()
    version_value = version_settings.setting_value_json if version_settings else {}
    result = await session.execute(
        select(FieldOfficerProfile, User, Organization)
        .join(User, User.id == FieldOfficerProfile.user_id, isouter=True)
        .join(Organization, Organization.id == FieldOfficerProfile.organization_id)
        .where(
            FieldOfficerProfile.deleted_at.is_(None),
            FieldOfficerProfile.device_id.is_not(None),
            Organization.deleted_at.is_(None),
        )
        .order_by(Organization.name, User.full_name)
    )
    devices: list[PlatformMobileFleetDeviceRead] = []
    app_versions: dict[str, int] = {}
    for profile, user, organization in result.all():
        submission_count = await count_rows(
            session,
            Submission,
            Submission.organization_id == profile.organization_id,
            Submission.field_officer_id == profile.id,
            Submission.deleted_at.is_(None),
        )
        app_version = "Unknown"
        app_versions[app_version] = app_versions.get(app_version, 0) + 1
        status = "Offline" if profile.last_sync_at and profile.last_sync_at < offline_before else "Active"
        if not profile.is_active:
            status = "Inactive"
        devices.append(
            PlatformMobileFleetDeviceRead(
                organization_id=organization.id,
                organization_name=organization.name,
                organization_slug=organization.slug,
                field_officer_id=profile.id,
                officer_name=user.full_name if user else None,
                device_id=profile.device_id or "unknown-device",
                app_version=app_version,
                last_sync_at=profile.last_sync_at,
                last_seen_at=profile.last_seen_at,
                submission_count=submission_count,
                status=status,
            )
        )
    return PlatformMobileFleetSummaryRead(
        active_devices=sum(1 for device in devices if device.status == "Active"),
        offline_devices=sum(1 for device in devices if device.status == "Offline"),
        active_users=len({device.field_officer_id for device in devices}),
        submission_throughput=sum(device.submission_count for device in devices),
        current_production_version=str(version_value.get("current_production_version") or "1.0.0-test"),
        minimum_supported_version=str(version_value.get("minimum_supported_version") or "1.0.0-test"),
        app_versions=app_versions,
        devices=devices,
    )


@router.get("/sector-packs", response_model=list[PlatformSectorPackRead], summary="List platform sector packs")
async def platform_sector_packs(
    _principal: Annotated[CurrentPrincipal, Depends(require_role("super_admin"))],
) -> list[PlatformSectorPackRead]:
    return [
        PlatformSectorPackRead(
            id=str(pack.get("id") or ""),
            name=str(pack.get("name") or ""),
            sector=str(pack.get("sector") or ""),
            description=str(pack.get("description") or ""),
            entity_types=[str(item) for item in pack.get("entity_types", [])],
            form_templates=[str(item) for item in pack.get("form_templates", [])],
            indicator_templates=[str(item) for item in pack.get("indicator_templates", [])],
            report_templates=[str(item) for item in pack.get("report_templates", [])],
            validation_rules=[str(item) for item in pack.get("validation_rules", [])],
            data_quality_rules=[str(item) for item in pack.get("data_quality_rules", [])],
            workflows=[str(item) for item in pack.get("workflows", [])],
            mobile_guidance=[str(item) for item in pack.get("mobile_guidance", [])],
            dashboard_widgets=[str(item) for item in pack.get("dashboard_widgets", [])],
        )
        for pack in list_sector_packs()
    ]


@router.get("/backups", response_model=list[PlatformBackupJobRead], summary="List platform backup jobs")
async def platform_backups(
    _principal: Annotated[CurrentPrincipal, Depends(require_role("super_admin"))],
) -> list[PlatformBackupJobRead]:
    now = datetime.now(UTC)
    return [
        PlatformBackupJobRead(id="backup-config-daily", backup_type="Configuration Backup", status="scheduled", size="Pending first run", created_at=now, retention="30 days"),
        PlatformBackupJobRead(id="backup-database-daily", backup_type="Database Backup", status="architecture-ready", size="Provider managed", created_at=now, retention="90 days"),
    ]


@router.post("/backups/request", response_model=PlatformActionResult, summary="Request a platform backup")
async def request_platform_backup(
    payload: PlatformBackupRequest,
    principal: Annotated[CurrentPrincipal, Depends(require_role("super_admin"))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> PlatformActionResult:
    actor_id = principal_user_uuid(principal)
    await AuditRepository(session).append(
        organization_id=principal_platform_organization_uuid(principal),
        actor_user_id=actor_id,
        action="platform.backup_requested",
        resource_type="backup",
        resource_id="global",
        metadata={"reason": payload.reason, "environment": settings.app_env},
    )
    await session.commit()
    return PlatformActionResult(
        status="accepted",
        message="Backup request recorded. Verify provider-managed execution from backup jobs and the infrastructure console.",
    )


@router.get("/backup-policy", response_model=PlatformBackupPolicyRead, summary="Read platform backup and retention policy")
async def platform_backup_policy(
    _principal: Annotated[CurrentPrincipal, Depends(require_role("super_admin"))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> PlatformBackupPolicyRead:
    result = await session.execute(
        select(SystemSetting).where(
            SystemSetting.organization_id.is_(None),
            SystemSetting.environment == settings.app_env,
            SystemSetting.setting_key == "backup-policy",
            SystemSetting.deleted_at.is_(None),
        )
    )
    setting = result.scalar_one_or_none()
    policy = default_backup_policy(setting.updated_at if setting else None)
    if setting is None:
        return policy
    value = setting.setting_value_json
    return PlatformBackupPolicyRead(
        backup_frequency=str(value.get("backup_frequency", policy.backup_frequency)),
        retention_days=int(value.get("retention_days", policy.retention_days)),
        configuration_retention_days=int(value.get("configuration_retention_days", policy.configuration_retention_days)),
        tenant_export_enabled=bool(value.get("tenant_export_enabled", policy.tenant_export_enabled)),
        restore_requires_approval=bool(value.get("restore_requires_approval", policy.restore_requires_approval)),
        restore_approver_role=str(value.get("restore_approver_role", policy.restore_approver_role)),
        anonymize_archived_data=bool(value.get("anonymize_archived_data", policy.anonymize_archived_data)),
        updated_at=setting.updated_at,
    )


@router.patch("/backup-policy", response_model=PlatformBackupPolicyRead, summary="Update platform backup and retention policy")
async def update_platform_backup_policy(
    payload: PlatformBackupPolicyUpdate,
    principal: Annotated[CurrentPrincipal, Depends(require_role("super_admin"))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> PlatformBackupPolicyRead:
    result = await session.execute(
        select(SystemSetting).where(
            SystemSetting.organization_id.is_(None),
            SystemSetting.environment == settings.app_env,
            SystemSetting.setting_key == "backup-policy",
            SystemSetting.deleted_at.is_(None),
        )
    )
    setting = result.scalar_one_or_none()
    actor_id = principal_user_uuid(principal)
    value = payload.model_dump(exclude={"reason"}, mode="json")
    old_value = setting.setting_value_json if setting else default_backup_policy().model_dump(mode="json")
    if setting is None:
        setting = SystemSetting(
            organization_id=None,
            category="Backup",
            setting_key="backup-policy",
            setting_value_json=value,
            environment=settings.app_env,
            is_sensitive=False,
            created_by_user_id=actor_id,
            updated_by_user_id=actor_id,
        )
        session.add(setting)
    else:
        setting.setting_value_json = value
        setting.updated_by_user_id = actor_id
    await AuditRepository(session).append(
        organization_id=principal_platform_organization_uuid(principal),
        actor_user_id=actor_id,
        action="platform.backup_policy_updated",
        resource_type="backup_policy",
        resource_id="global",
        metadata={"reason": payload.reason, "old_value": old_value, "new_value": value, "environment": settings.app_env},
    )
    await session.commit()
    return PlatformBackupPolicyRead(**value, updated_at=datetime.now(UTC))


@router.get("/release", response_model=PlatformReleaseRead, summary="Read platform release readiness")
async def platform_release(
    _principal: Annotated[CurrentPrincipal, Depends(require_role("super_admin"))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> PlatformReleaseRead:
    result = await session.execute(
        select(SystemSetting).where(
            SystemSetting.organization_id.is_(None),
            SystemSetting.environment == settings.app_env,
            SystemSetting.setting_key == "release-center",
            SystemSetting.deleted_at.is_(None),
        )
    )
    setting = result.scalar_one_or_none()
    return runtime_release_read(setting.setting_value_json if setting else None, setting.updated_at if setting else None)


@router.patch("/release", response_model=PlatformReleaseRead, summary="Update platform release readiness")
async def update_platform_release(
    payload: PlatformReleaseUpdate,
    principal: Annotated[CurrentPrincipal, Depends(require_role("super_admin"))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> PlatformReleaseRead:
    result = await session.execute(
        select(SystemSetting).where(
            SystemSetting.organization_id.is_(None),
            SystemSetting.environment == settings.app_env,
            SystemSetting.setting_key == "release-center",
            SystemSetting.deleted_at.is_(None),
        )
    )
    setting = result.scalar_one_or_none()
    actor_id = principal_user_uuid(principal)
    value = payload.model_dump(exclude={"reason"})
    old_value = setting.setting_value_json if setting else runtime_release_read().model_dump(mode="json")
    if setting is None:
        setting = SystemSetting(
            organization_id=None,
            category="Release",
            setting_key="release-center",
            setting_value_json=value,
            environment=settings.app_env,
            is_sensitive=False,
            created_by_user_id=actor_id,
            updated_by_user_id=actor_id,
        )
        session.add(setting)
    else:
        setting.setting_value_json = value
        setting.updated_by_user_id = actor_id
    await AuditRepository(session).append(
        organization_id=principal_platform_organization_uuid(principal),
        actor_user_id=actor_id,
        action="platform.release_updated",
        resource_type="release_center",
        resource_id=settings.app_env,
        metadata={"reason": payload.reason, "old_value": old_value, "new_value": value, "environment": settings.app_env},
    )
    await session.commit()
    return runtime_release_read(value, datetime.now(UTC))


@router.get("/announcement", response_model=PlatformReleaseRead, summary="Read active platform announcement")
async def platform_announcement(
    session: Annotated[AsyncSession, Depends(get_session)],
) -> PlatformReleaseRead:
    result = await session.execute(
        select(SystemSetting).where(
            SystemSetting.organization_id.is_(None),
            SystemSetting.environment == settings.app_env,
            SystemSetting.setting_key == "release-center",
            SystemSetting.deleted_at.is_(None),
        )
    )
    setting = result.scalar_one_or_none()
    return runtime_release_read(setting.setting_value_json if setting else None, setting.updated_at if setting else None)


@router.get("/leads", response_model=list[PlatformLeadRead], summary="List public website leads for Super Admin review")
async def platform_leads(
    _principal: Annotated[CurrentPrincipal, Depends(require_role("super_admin"))],
    session: Annotated[AsyncSession, Depends(get_session)],
    limit: Annotated[int, Query(ge=1, le=200)] = 100,
) -> list[PlatformLeadRead]:
    result = await session.execute(
        select(MarketingLead)
        .where(MarketingLead.deleted_at.is_(None))
        .order_by(MarketingLead.created_at.desc())
        .limit(limit)
    )
    return [
        PlatformLeadRead(
            id=lead.id,
            name=lead.name,
            organization=lead.organization,
            country=lead.country,
            email=lead.email,
            phone=lead.phone,
            organization_size=lead.organization_size,
            interest_area=lead.interest_area,
            source=lead.source,
            message=lead.message,
            status=lead.status,
            created_at=lead.created_at,
        )
        for lead in result.scalars().all()
    ]


@router.get("/organization-plans", response_model=list[PlatformOrganizationPlanRead], summary="List tenant plans and platform limits")
async def platform_organization_plans(
    _principal: Annotated[CurrentPrincipal, Depends(require_role("super_admin"))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[PlatformOrganizationPlanRead]:
    repository = OrganizationRepository(session)
    organizations = await repository.list_all()
    rows: list[PlatformOrganizationPlanRead] = []
    for organization in organizations:
        user_count = await repository.count_users(organization.id)
        submission_count = await count_rows(session, Submission, Submission.organization_id == organization.id, Submission.deleted_at.is_(None))
        setting_result = await session.execute(
            select(SystemSetting).where(
                SystemSetting.organization_id == organization.id,
                SystemSetting.environment == settings.app_env,
                SystemSetting.setting_key == "tenant-plan",
                SystemSetting.deleted_at.is_(None),
            )
        )
        plan_settings = setting_result.scalar_one_or_none()
        plan_value = plan_settings.setting_value_json if plan_settings else {}
        derived_plan = "Enterprise" if user_count > 25 or submission_count > 10000 else "Professional"
        plan = str(plan_value.get("plan") or derived_plan)
        user_limit = int(plan_value.get("user_limit") or (250 if plan == "Enterprise" else 50))
        submission_limit = int(plan_value.get("submission_limit") or (1_000_000 if plan == "Enterprise" else 100_000))
        storage_limit_gb = int(plan_value.get("storage_limit_gb") or (500 if plan == "Enterprise" else 100))
        raw_enabled_modules = plan_value.get("enabled_modules")
        enabled_modules = raw_enabled_modules if isinstance(raw_enabled_modules, list) else DEFAULT_TENANT_MODULES
        usage_percent = max(
            int((user_count / user_limit) * 100),
            int((submission_count / submission_limit) * 100),
        )
        rows.append(
            PlatformOrganizationPlanRead(
                organization_id=organization.id,
                organization_name=organization.name,
                organization_slug=organization.slug,
                plan=plan,
                status=str(plan_value.get("status") or ("Active" if organization.is_active else "Suspended")),
                user_limit=user_limit,
                submission_limit=submission_limit,
                storage_limit_gb=storage_limit_gb,
                enabled_modules=[str(module) for module in enabled_modules],
                usage_percent=min(usage_percent, 100),
            )
        )
    return rows


@router.patch("/organization-plans/{organization_id}", response_model=PlatformOrganizationPlanRead, summary="Update tenant plan and platform limits")
async def update_platform_organization_plan(
    organization_id: UUID,
    payload: PlatformOrganizationPlanUpdate,
    principal: Annotated[CurrentPrincipal, Depends(require_role("super_admin"))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> PlatformOrganizationPlanRead:
    repository = OrganizationRepository(session)
    organization = await repository.get(organization_id)
    if organization is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
    result = await session.execute(
        select(SystemSetting).where(
            SystemSetting.organization_id == organization.id,
            SystemSetting.environment == settings.app_env,
            SystemSetting.setting_key == "tenant-plan",
            SystemSetting.deleted_at.is_(None),
        )
    )
    setting = result.scalar_one_or_none()
    plan_value = {
        "plan": payload.plan,
        "status": payload.status,
        "user_limit": payload.user_limit,
        "submission_limit": payload.submission_limit,
        "storage_limit_gb": payload.storage_limit_gb,
        "enabled_modules": payload.enabled_modules,
    }
    actor_id = principal_user_uuid(principal)
    if setting is None:
        setting = SystemSetting(
            organization_id=organization.id,
            category="Tenant Plan",
            setting_key="tenant-plan",
            setting_value_json=plan_value,
            environment=settings.app_env,
            is_sensitive=False,
            created_by_user_id=actor_id,
            updated_by_user_id=actor_id,
        )
        session.add(setting)
    else:
        setting.setting_value_json = plan_value
        setting.updated_by_user_id = actor_id
    await AuditRepository(session).append(
        organization_id=organization.id,
        actor_user_id=actor_id,
        action="platform.organization_plan_updated",
        resource_type="organization",
        resource_id=str(organization.id),
        metadata={"reason": payload.reason, "plan": plan_value},
    )
    await session.commit()
    user_count = await repository.count_users(organization.id)
    submission_count = await count_rows(session, Submission, Submission.organization_id == organization.id, Submission.deleted_at.is_(None))
    usage_percent = max(
        int((user_count / payload.user_limit) * 100),
        int((submission_count / payload.submission_limit) * 100),
    )
    return PlatformOrganizationPlanRead(
        organization_id=organization.id,
        organization_name=organization.name,
        organization_slug=organization.slug,
        plan=payload.plan,
        status=payload.status,
        user_limit=payload.user_limit,
        submission_limit=payload.submission_limit,
        storage_limit_gb=payload.storage_limit_gb,
        enabled_modules=payload.enabled_modules,
        usage_percent=min(usage_percent, 100),
    )


@router.get("/tenant-lifecycle-policy", response_model=PlatformTenantLifecyclePolicyRead, summary="Read tenant lifecycle policy")
async def platform_tenant_lifecycle_policy(
    _principal: Annotated[CurrentPrincipal, Depends(require_role("super_admin"))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> PlatformTenantLifecyclePolicyRead:
    result = await session.execute(
        select(SystemSetting).where(
            SystemSetting.organization_id.is_(None),
            SystemSetting.environment == settings.app_env,
            SystemSetting.setting_key == "tenant-lifecycle-policy",
            SystemSetting.deleted_at.is_(None),
        )
    )
    setting = result.scalar_one_or_none()
    policy = default_tenant_lifecycle_policy(setting.updated_at if setting else None)
    if setting is None:
        return policy
    value = setting.setting_value_json
    checklist = value.get("onboarding_checklist")
    return PlatformTenantLifecyclePolicyRead(
        trial_days=int(value.get("trial_days", policy.trial_days)),
        grace_days=int(value.get("grace_days", policy.grace_days)),
        suspend_after_grace=bool(value.get("suspend_after_grace", policy.suspend_after_grace)),
        require_owner_before_activation=bool(value.get("require_owner_before_activation", policy.require_owner_before_activation)),
        require_project_before_activation=bool(value.get("require_project_before_activation", policy.require_project_before_activation)),
        default_plan=str(value.get("default_plan", policy.default_plan)),
        default_user_limit=int(value.get("default_user_limit", policy.default_user_limit)),
        default_submission_limit=int(value.get("default_submission_limit", policy.default_submission_limit)),
        onboarding_checklist=[str(item) for item in checklist] if isinstance(checklist, list) else policy.onboarding_checklist,
        updated_at=setting.updated_at,
    )


@router.patch("/tenant-lifecycle-policy", response_model=PlatformTenantLifecyclePolicyRead, summary="Update tenant lifecycle policy")
async def update_platform_tenant_lifecycle_policy(
    payload: PlatformTenantLifecyclePolicyUpdate,
    principal: Annotated[CurrentPrincipal, Depends(require_role("super_admin"))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> PlatformTenantLifecyclePolicyRead:
    result = await session.execute(
        select(SystemSetting).where(
            SystemSetting.organization_id.is_(None),
            SystemSetting.environment == settings.app_env,
            SystemSetting.setting_key == "tenant-lifecycle-policy",
            SystemSetting.deleted_at.is_(None),
        )
    )
    setting = result.scalar_one_or_none()
    actor_id = principal_user_uuid(principal)
    value = payload.model_dump(exclude={"reason"}, mode="json")
    old_value = setting.setting_value_json if setting else default_tenant_lifecycle_policy().model_dump(mode="json")
    if setting is None:
        setting = SystemSetting(
            organization_id=None,
            category="Tenant Lifecycle",
            setting_key="tenant-lifecycle-policy",
            setting_value_json=value,
            environment=settings.app_env,
            is_sensitive=False,
            created_by_user_id=actor_id,
            updated_by_user_id=actor_id,
        )
        session.add(setting)
    else:
        setting.setting_value_json = value
        setting.updated_by_user_id = actor_id
    await AuditRepository(session).append(
        organization_id=principal_platform_organization_uuid(principal),
        actor_user_id=actor_id,
        action="platform.tenant_lifecycle_policy_updated",
        resource_type="tenant_lifecycle_policy",
        resource_id="global",
        metadata={"reason": payload.reason, "old_value": old_value, "new_value": value, "environment": settings.app_env},
    )
    await session.commit()
    return PlatformTenantLifecyclePolicyRead(**value, updated_at=datetime.now(UTC))


@router.get("/compliance-policy", response_model=PlatformCompliancePolicyRead, summary="Read platform compliance policy")
async def platform_compliance_policy(
    _principal: Annotated[CurrentPrincipal, Depends(require_role("super_admin"))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> PlatformCompliancePolicyRead:
    result = await session.execute(
        select(SystemSetting).where(
            SystemSetting.organization_id.is_(None),
            SystemSetting.environment == settings.app_env,
            SystemSetting.setting_key == "compliance-policy",
            SystemSetting.deleted_at.is_(None),
        )
    )
    setting = result.scalar_one_or_none()
    policy = default_compliance_policy(setting.updated_at if setting else None)
    if setting is None:
        return policy
    value = setting.setting_value_json
    regions = value.get("allowed_data_regions")
    return PlatformCompliancePolicyRead(
        default_data_region=str(value.get("default_data_region", policy.default_data_region)),
        allowed_data_regions=[str(item) for item in regions] if isinstance(regions, list) else policy.allowed_data_regions,
        pii_masking_default=bool(value.get("pii_masking_default", policy.pii_masking_default)),
        require_export_approval=bool(value.get("require_export_approval", policy.require_export_approval)),
        require_dpa_for_exports=bool(value.get("require_dpa_for_exports", policy.require_dpa_for_exports)),
        audit_retention_days=int(value.get("audit_retention_days", policy.audit_retention_days)),
        data_processing_contact=str(value.get("data_processing_contact", policy.data_processing_contact)),
        subprocessors_public_url=str(value.get("subprocessors_public_url", policy.subprocessors_public_url)),
        updated_at=setting.updated_at,
    )


@router.patch("/compliance-policy", response_model=PlatformCompliancePolicyRead, summary="Update platform compliance policy")
async def update_platform_compliance_policy(
    payload: PlatformCompliancePolicyUpdate,
    principal: Annotated[CurrentPrincipal, Depends(require_role("super_admin"))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> PlatformCompliancePolicyRead:
    result = await session.execute(
        select(SystemSetting).where(
            SystemSetting.organization_id.is_(None),
            SystemSetting.environment == settings.app_env,
            SystemSetting.setting_key == "compliance-policy",
            SystemSetting.deleted_at.is_(None),
        )
    )
    setting = result.scalar_one_or_none()
    actor_id = principal_user_uuid(principal)
    value = payload.model_dump(exclude={"reason"}, mode="json")
    old_value = setting.setting_value_json if setting else default_compliance_policy().model_dump(mode="json")
    if setting is None:
        setting = SystemSetting(
            organization_id=None,
            category="Compliance",
            setting_key="compliance-policy",
            setting_value_json=value,
            environment=settings.app_env,
            is_sensitive=False,
            created_by_user_id=actor_id,
            updated_by_user_id=actor_id,
        )
        session.add(setting)
    else:
        setting.setting_value_json = value
        setting.updated_by_user_id = actor_id
    await AuditRepository(session).append(
        organization_id=principal_platform_organization_uuid(principal),
        actor_user_id=actor_id,
        action="platform.compliance_policy_updated",
        resource_type="compliance_policy",
        resource_id="global",
        metadata={"reason": payload.reason, "old_value": old_value, "new_value": value, "environment": settings.app_env},
    )
    await session.commit()
    return PlatformCompliancePolicyRead(**value, updated_at=datetime.now(UTC))


@router.get("/sla-policy", response_model=PlatformSlaPolicyRead, summary="Read platform SLA policy")
async def platform_sla_policy(
    _principal: Annotated[CurrentPrincipal, Depends(require_role("super_admin"))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> PlatformSlaPolicyRead:
    result = await session.execute(
        select(SystemSetting).where(
            SystemSetting.organization_id.is_(None),
            SystemSetting.environment == settings.app_env,
            SystemSetting.setting_key == "sla-policy",
            SystemSetting.deleted_at.is_(None),
        )
    )
    setting = result.scalar_one_or_none()
    policy = default_sla_policy(setting.updated_at if setting else None)
    if setting is None:
        return policy
    value = setting.setting_value_json
    return PlatformSlaPolicyRead(
        uptime_target_percent=float(value.get("uptime_target_percent", policy.uptime_target_percent)),
        critical_response_minutes=int(value.get("critical_response_minutes", policy.critical_response_minutes)),
        high_response_hours=int(value.get("high_response_hours", policy.high_response_hours)),
        normal_response_hours=int(value.get("normal_response_hours", policy.normal_response_hours)),
        support_session_max_minutes=int(value.get("support_session_max_minutes", policy.support_session_max_minutes)),
        escalation_email=str(value.get("escalation_email", policy.escalation_email)),
        incident_manager=str(value.get("incident_manager", policy.incident_manager)),
        status_page_url=str(value.get("status_page_url", policy.status_page_url)),
        updated_at=setting.updated_at,
    )


@router.patch("/sla-policy", response_model=PlatformSlaPolicyRead, summary="Update platform SLA policy")
async def update_platform_sla_policy(
    payload: PlatformSlaPolicyUpdate,
    principal: Annotated[CurrentPrincipal, Depends(require_role("super_admin"))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> PlatformSlaPolicyRead:
    result = await session.execute(
        select(SystemSetting).where(
            SystemSetting.organization_id.is_(None),
            SystemSetting.environment == settings.app_env,
            SystemSetting.setting_key == "sla-policy",
            SystemSetting.deleted_at.is_(None),
        )
    )
    setting = result.scalar_one_or_none()
    actor_id = principal_user_uuid(principal)
    value = payload.model_dump(exclude={"reason"}, mode="json")
    old_value = setting.setting_value_json if setting else default_sla_policy().model_dump(mode="json")
    if setting is None:
        setting = SystemSetting(
            organization_id=None,
            category="SLA",
            setting_key="sla-policy",
            setting_value_json=value,
            environment=settings.app_env,
            is_sensitive=False,
            created_by_user_id=actor_id,
            updated_by_user_id=actor_id,
        )
        session.add(setting)
    else:
        setting.setting_value_json = value
        setting.updated_by_user_id = actor_id
    await AuditRepository(session).append(
        organization_id=principal_platform_organization_uuid(principal),
        actor_user_id=actor_id,
        action="platform.sla_policy_updated",
        resource_type="sla_policy",
        resource_id="global",
        metadata={"reason": payload.reason, "old_value": old_value, "new_value": value, "environment": settings.app_env},
    )
    await session.commit()
    return PlatformSlaPolicyRead(**value, updated_at=datetime.now(UTC))


@router.get("/quota-policy", response_model=PlatformQuotaPolicyRead, summary="Read platform quota policy")
async def platform_quota_policy(
    _principal: Annotated[CurrentPrincipal, Depends(require_role("super_admin"))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> PlatformQuotaPolicyRead:
    result = await session.execute(
        select(SystemSetting).where(
            SystemSetting.organization_id.is_(None),
            SystemSetting.environment == settings.app_env,
            SystemSetting.setting_key == "quota-policy",
            SystemSetting.deleted_at.is_(None),
        )
    )
    setting = result.scalar_one_or_none()
    policy = default_quota_policy(setting.updated_at if setting else None)
    if setting is None:
        return policy
    value = setting.setting_value_json
    return PlatformQuotaPolicyRead(
        warning_threshold_percent=int(value.get("warning_threshold_percent", policy.warning_threshold_percent)),
        critical_threshold_percent=int(value.get("critical_threshold_percent", policy.critical_threshold_percent)),
        api_rate_limit_per_minute=int(value.get("api_rate_limit_per_minute", policy.api_rate_limit_per_minute)),
        storage_overage_action=str(value.get("storage_overage_action", policy.storage_overage_action)),
        submission_overage_action=str(value.get("submission_overage_action", policy.submission_overage_action)),
        notify_owners_on_warning=bool(value.get("notify_owners_on_warning", policy.notify_owners_on_warning)),
        notify_super_admins_on_critical=bool(value.get("notify_super_admins_on_critical", policy.notify_super_admins_on_critical)),
        updated_at=setting.updated_at,
    )


@router.patch("/quota-policy", response_model=PlatformQuotaPolicyRead, summary="Update platform quota policy")
async def update_platform_quota_policy(
    payload: PlatformQuotaPolicyUpdate,
    principal: Annotated[CurrentPrincipal, Depends(require_role("super_admin"))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> PlatformQuotaPolicyRead:
    result = await session.execute(
        select(SystemSetting).where(
            SystemSetting.organization_id.is_(None),
            SystemSetting.environment == settings.app_env,
            SystemSetting.setting_key == "quota-policy",
            SystemSetting.deleted_at.is_(None),
        )
    )
    setting = result.scalar_one_or_none()
    actor_id = principal_user_uuid(principal)
    value = payload.model_dump(exclude={"reason"}, mode="json")
    old_value = setting.setting_value_json if setting else default_quota_policy().model_dump(mode="json")
    if setting is None:
        setting = SystemSetting(
            organization_id=None,
            category="Quota",
            setting_key="quota-policy",
            setting_value_json=value,
            environment=settings.app_env,
            is_sensitive=False,
            created_by_user_id=actor_id,
            updated_by_user_id=actor_id,
        )
        session.add(setting)
    else:
        setting.setting_value_json = value
        setting.updated_by_user_id = actor_id
    await AuditRepository(session).append(
        organization_id=principal_platform_organization_uuid(principal),
        actor_user_id=actor_id,
        action="platform.quota_policy_updated",
        resource_type="quota_policy",
        resource_id="global",
        metadata={"reason": payload.reason, "old_value": old_value, "new_value": value, "environment": settings.app_env},
    )
    await session.commit()
    return PlatformQuotaPolicyRead(**value, updated_at=datetime.now(UTC))


@router.get("/observability-policy", response_model=PlatformObservabilityPolicyRead, summary="Read platform observability policy")
async def platform_observability_policy(
    _principal: Annotated[CurrentPrincipal, Depends(require_role("super_admin"))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> PlatformObservabilityPolicyRead:
    result = await session.execute(
        select(SystemSetting).where(
            SystemSetting.organization_id.is_(None),
            SystemSetting.environment == settings.app_env,
            SystemSetting.setting_key == "observability-policy",
            SystemSetting.deleted_at.is_(None),
        )
    )
    setting = result.scalar_one_or_none()
    policy = default_observability_policy(setting.updated_at if setting else None)
    if setting is None:
        return policy
    value = setting.setting_value_json
    return PlatformObservabilityPolicyRead(
        health_check_interval_seconds=int(value.get("health_check_interval_seconds", policy.health_check_interval_seconds)),
        api_error_rate_threshold_percent=float(value.get("api_error_rate_threshold_percent", policy.api_error_rate_threshold_percent)),
        slow_request_threshold_ms=int(value.get("slow_request_threshold_ms", policy.slow_request_threshold_ms)),
        mobile_sync_failure_threshold_percent=float(value.get("mobile_sync_failure_threshold_percent", policy.mobile_sync_failure_threshold_percent)),
        offline_device_alert_days=int(value.get("offline_device_alert_days", policy.offline_device_alert_days)),
        alert_email=str(value.get("alert_email", policy.alert_email)),
        pager_channel=str(value.get("pager_channel", policy.pager_channel)),
        updated_at=setting.updated_at,
    )


@router.patch("/observability-policy", response_model=PlatformObservabilityPolicyRead, summary="Update platform observability policy")
async def update_platform_observability_policy(
    payload: PlatformObservabilityPolicyUpdate,
    principal: Annotated[CurrentPrincipal, Depends(require_role("super_admin"))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> PlatformObservabilityPolicyRead:
    result = await session.execute(
        select(SystemSetting).where(
            SystemSetting.organization_id.is_(None),
            SystemSetting.environment == settings.app_env,
            SystemSetting.setting_key == "observability-policy",
            SystemSetting.deleted_at.is_(None),
        )
    )
    setting = result.scalar_one_or_none()
    actor_id = principal_user_uuid(principal)
    value = payload.model_dump(exclude={"reason"}, mode="json")
    old_value = setting.setting_value_json if setting else default_observability_policy().model_dump(mode="json")
    if setting is None:
        setting = SystemSetting(
            organization_id=None,
            category="Observability",
            setting_key="observability-policy",
            setting_value_json=value,
            environment=settings.app_env,
            is_sensitive=False,
            created_by_user_id=actor_id,
            updated_by_user_id=actor_id,
        )
        session.add(setting)
    else:
        setting.setting_value_json = value
        setting.updated_by_user_id = actor_id
    await AuditRepository(session).append(
        organization_id=principal_platform_organization_uuid(principal),
        actor_user_id=actor_id,
        action="platform.observability_policy_updated",
        resource_type="observability_policy",
        resource_id="global",
        metadata={"reason": payload.reason, "old_value": old_value, "new_value": value, "environment": settings.app_env},
    )
    await session.commit()
    return PlatformObservabilityPolicyRead(**value, updated_at=datetime.now(UTC))


@router.get("/retention-policy", response_model=PlatformRetentionPolicyRead, summary="Read platform retention policy")
async def platform_retention_policy(
    _principal: Annotated[CurrentPrincipal, Depends(require_role("super_admin"))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> PlatformRetentionPolicyRead:
    result = await session.execute(
        select(SystemSetting).where(
            SystemSetting.organization_id.is_(None),
            SystemSetting.environment == settings.app_env,
            SystemSetting.setting_key == "retention-policy",
            SystemSetting.deleted_at.is_(None),
        )
    )
    setting = result.scalar_one_or_none()
    policy = default_retention_policy(setting.updated_at if setting else None)
    if setting is None:
        return policy
    value = setting.setting_value_json
    return PlatformRetentionPolicyRead(
        tenant_data_retention_days=int(value.get("tenant_data_retention_days", policy.tenant_data_retention_days)),
        audit_log_retention_days=int(value.get("audit_log_retention_days", policy.audit_log_retention_days)),
        backup_retention_days=int(value.get("backup_retention_days", policy.backup_retention_days)),
        export_retention_days=int(value.get("export_retention_days", policy.export_retention_days)),
        inactive_tenant_archive_days=int(value.get("inactive_tenant_archive_days", policy.inactive_tenant_archive_days)),
        anonymize_deleted_user_days=int(value.get("anonymize_deleted_user_days", policy.anonymize_deleted_user_days)),
        legal_hold_enabled=bool(value.get("legal_hold_enabled", policy.legal_hold_enabled)),
        updated_at=setting.updated_at,
    )


@router.patch("/retention-policy", response_model=PlatformRetentionPolicyRead, summary="Update platform retention policy")
async def update_platform_retention_policy(
    payload: PlatformRetentionPolicyUpdate,
    principal: Annotated[CurrentPrincipal, Depends(require_role("super_admin"))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> PlatformRetentionPolicyRead:
    result = await session.execute(
        select(SystemSetting).where(
            SystemSetting.organization_id.is_(None),
            SystemSetting.environment == settings.app_env,
            SystemSetting.setting_key == "retention-policy",
            SystemSetting.deleted_at.is_(None),
        )
    )
    setting = result.scalar_one_or_none()
    actor_id = principal_user_uuid(principal)
    value = payload.model_dump(exclude={"reason"}, mode="json")
    old_value = setting.setting_value_json if setting else default_retention_policy().model_dump(mode="json")
    if setting is None:
        setting = SystemSetting(
            organization_id=None,
            category="Retention",
            setting_key="retention-policy",
            setting_value_json=value,
            environment=settings.app_env,
            is_sensitive=False,
            created_by_user_id=actor_id,
            updated_by_user_id=actor_id,
        )
        session.add(setting)
    else:
        setting.setting_value_json = value
        setting.updated_by_user_id = actor_id
    await AuditRepository(session).append(
        organization_id=principal_platform_organization_uuid(principal),
        actor_user_id=actor_id,
        action="platform.retention_policy_updated",
        resource_type="retention_policy",
        resource_id="global",
        metadata={"reason": payload.reason, "old_value": old_value, "new_value": value, "environment": settings.app_env},
    )
    await session.commit()
    return PlatformRetentionPolicyRead(**value, updated_at=datetime.now(UTC))


@router.get("/api-governance-policy", response_model=PlatformApiGovernancePolicyRead, summary="Read platform API governance policy")
async def platform_api_governance_policy(
    _principal: Annotated[CurrentPrincipal, Depends(require_role("super_admin"))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> PlatformApiGovernancePolicyRead:
    result = await session.execute(
        select(SystemSetting).where(
            SystemSetting.organization_id.is_(None),
            SystemSetting.environment == settings.app_env,
            SystemSetting.setting_key == "api-governance-policy",
            SystemSetting.deleted_at.is_(None),
        )
    )
    setting = result.scalar_one_or_none()
    policy = default_api_governance_policy(setting.updated_at if setting else None)
    if setting is None:
        return policy
    value = setting.setting_value_json
    return PlatformApiGovernancePolicyRead(
        public_api_enabled=bool(value.get("public_api_enabled", policy.public_api_enabled)),
        api_key_expiry_days=int(value.get("api_key_expiry_days", policy.api_key_expiry_days)),
        webhook_retry_attempts=int(value.get("webhook_retry_attempts", policy.webhook_retry_attempts)),
        webhook_timeout_seconds=int(value.get("webhook_timeout_seconds", policy.webhook_timeout_seconds)),
        secret_rotation_days=int(value.get("secret_rotation_days", policy.secret_rotation_days)),
        require_scoped_api_keys=bool(value.get("require_scoped_api_keys", policy.require_scoped_api_keys)),
        audit_external_access=bool(value.get("audit_external_access", policy.audit_external_access)),
        updated_at=setting.updated_at,
    )


@router.patch("/api-governance-policy", response_model=PlatformApiGovernancePolicyRead, summary="Update platform API governance policy")
async def update_platform_api_governance_policy(
    payload: PlatformApiGovernancePolicyUpdate,
    principal: Annotated[CurrentPrincipal, Depends(require_role("super_admin"))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> PlatformApiGovernancePolicyRead:
    result = await session.execute(
        select(SystemSetting).where(
            SystemSetting.organization_id.is_(None),
            SystemSetting.environment == settings.app_env,
            SystemSetting.setting_key == "api-governance-policy",
            SystemSetting.deleted_at.is_(None),
        )
    )
    setting = result.scalar_one_or_none()
    actor_id = principal_user_uuid(principal)
    value = payload.model_dump(exclude={"reason"}, mode="json")
    old_value = setting.setting_value_json if setting else default_api_governance_policy().model_dump(mode="json")
    if setting is None:
        setting = SystemSetting(
            organization_id=None,
            category="API Governance",
            setting_key="api-governance-policy",
            setting_value_json=value,
            environment=settings.app_env,
            is_sensitive=False,
            created_by_user_id=actor_id,
            updated_by_user_id=actor_id,
        )
        session.add(setting)
    else:
        setting.setting_value_json = value
        setting.updated_by_user_id = actor_id
    await AuditRepository(session).append(
        organization_id=principal_platform_organization_uuid(principal),
        actor_user_id=actor_id,
        action="platform.api_governance_policy_updated",
        resource_type="api_governance_policy",
        resource_id="global",
        metadata={"reason": payload.reason, "old_value": old_value, "new_value": value, "environment": settings.app_env},
    )
    await session.commit()
    return PlatformApiGovernancePolicyRead(**value, updated_at=datetime.now(UTC))


@router.get("/ai-governance-policy", response_model=PlatformAiGovernancePolicyRead, summary="Read platform AI governance policy")
async def platform_ai_governance_policy(
    _principal: Annotated[CurrentPrincipal, Depends(require_role("super_admin"))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> PlatformAiGovernancePolicyRead:
    result = await session.execute(
        select(SystemSetting).where(
            SystemSetting.organization_id.is_(None),
            SystemSetting.environment == settings.app_env,
            SystemSetting.setting_key == "ai-governance-policy",
            SystemSetting.deleted_at.is_(None),
        )
    )
    setting = result.scalar_one_or_none()
    policy = default_ai_governance_policy(setting.updated_at if setting else None)
    if setting is None:
        return policy
    value = setting.setting_value_json
    return PlatformAiGovernancePolicyRead(
        ai_features_enabled=bool(value.get("ai_features_enabled", policy.ai_features_enabled)),
        default_provider=str(value.get("default_provider", policy.default_provider)),
        pii_redaction_required=bool(value.get("pii_redaction_required", policy.pii_redaction_required)),
        human_review_required=bool(value.get("human_review_required", policy.human_review_required)),
        monthly_token_budget=int(value.get("monthly_token_budget", policy.monthly_token_budget)),
        max_prompt_retention_days=int(value.get("max_prompt_retention_days", policy.max_prompt_retention_days)),
        audit_ai_actions=bool(value.get("audit_ai_actions", policy.audit_ai_actions)),
        updated_at=setting.updated_at,
    )


@router.patch("/ai-governance-policy", response_model=PlatformAiGovernancePolicyRead, summary="Update platform AI governance policy")
async def update_platform_ai_governance_policy(
    payload: PlatformAiGovernancePolicyUpdate,
    principal: Annotated[CurrentPrincipal, Depends(require_role("super_admin"))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> PlatformAiGovernancePolicyRead:
    result = await session.execute(
        select(SystemSetting).where(
            SystemSetting.organization_id.is_(None),
            SystemSetting.environment == settings.app_env,
            SystemSetting.setting_key == "ai-governance-policy",
            SystemSetting.deleted_at.is_(None),
        )
    )
    setting = result.scalar_one_or_none()
    actor_id = principal_user_uuid(principal)
    value = payload.model_dump(exclude={"reason"}, mode="json")
    old_value = setting.setting_value_json if setting else default_ai_governance_policy().model_dump(mode="json")
    if setting is None:
        setting = SystemSetting(
            organization_id=None,
            category="AI Governance",
            setting_key="ai-governance-policy",
            setting_value_json=value,
            environment=settings.app_env,
            is_sensitive=False,
            created_by_user_id=actor_id,
            updated_by_user_id=actor_id,
        )
        session.add(setting)
    else:
        setting.setting_value_json = value
        setting.updated_by_user_id = actor_id
    await AuditRepository(session).append(
        organization_id=principal_platform_organization_uuid(principal),
        actor_user_id=actor_id,
        action="platform.ai_governance_policy_updated",
        resource_type="ai_governance_policy",
        resource_id="global",
        metadata={"reason": payload.reason, "old_value": old_value, "new_value": value, "environment": settings.app_env},
    )
    await session.commit()
    return PlatformAiGovernancePolicyRead(**value, updated_at=datetime.now(UTC))


@router.get("/communication-policy", response_model=PlatformCommunicationPolicyRead, summary="Read platform communication policy")
async def platform_communication_policy(
    _principal: Annotated[CurrentPrincipal, Depends(require_role("super_admin"))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> PlatformCommunicationPolicyRead:
    result = await session.execute(
        select(SystemSetting).where(
            SystemSetting.organization_id.is_(None),
            SystemSetting.environment == settings.app_env,
            SystemSetting.setting_key == "communication-policy",
            SystemSetting.deleted_at.is_(None),
        )
    )
    setting = result.scalar_one_or_none()
    policy = default_communication_policy(setting.updated_at if setting else None)
    if setting is None:
        return policy
    value = setting.setting_value_json
    return PlatformCommunicationPolicyRead(
        transactional_email_enabled=bool(value.get("transactional_email_enabled", policy.transactional_email_enabled)),
        default_from_email=str(value.get("default_from_email", policy.default_from_email)),
        support_reply_to_email=str(value.get("support_reply_to_email", policy.support_reply_to_email)),
        sms_enabled=bool(value.get("sms_enabled", policy.sms_enabled)),
        push_notifications_enabled=bool(value.get("push_notifications_enabled", policy.push_notifications_enabled)),
        tenant_broadcasts_enabled=bool(value.get("tenant_broadcasts_enabled", policy.tenant_broadcasts_enabled)),
        notification_log_retention_days=int(value.get("notification_log_retention_days", policy.notification_log_retention_days)),
        updated_at=setting.updated_at,
    )


@router.patch("/communication-policy", response_model=PlatformCommunicationPolicyRead, summary="Update platform communication policy")
async def update_platform_communication_policy(
    payload: PlatformCommunicationPolicyUpdate,
    principal: Annotated[CurrentPrincipal, Depends(require_role("super_admin"))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> PlatformCommunicationPolicyRead:
    result = await session.execute(
        select(SystemSetting).where(
            SystemSetting.organization_id.is_(None),
            SystemSetting.environment == settings.app_env,
            SystemSetting.setting_key == "communication-policy",
            SystemSetting.deleted_at.is_(None),
        )
    )
    setting = result.scalar_one_or_none()
    actor_id = principal_user_uuid(principal)
    value = payload.model_dump(exclude={"reason"}, mode="json")
    old_value = setting.setting_value_json if setting else default_communication_policy().model_dump(mode="json")
    if setting is None:
        setting = SystemSetting(
            organization_id=None,
            category="Communications",
            setting_key="communication-policy",
            setting_value_json=value,
            environment=settings.app_env,
            is_sensitive=False,
            created_by_user_id=actor_id,
            updated_by_user_id=actor_id,
        )
        session.add(setting)
    else:
        setting.setting_value_json = value
        setting.updated_by_user_id = actor_id
    await AuditRepository(session).append(
        organization_id=principal_platform_organization_uuid(principal),
        actor_user_id=actor_id,
        action="platform.communication_policy_updated",
        resource_type="communication_policy",
        resource_id="global",
        metadata={"reason": payload.reason, "old_value": old_value, "new_value": value, "environment": settings.app_env},
    )
    await session.commit()
    return PlatformCommunicationPolicyRead(**value, updated_at=datetime.now(UTC))


@router.get("/support-sessions", response_model=list[PlatformSupportSessionRead], summary="List recent support access sessions")
async def platform_support_sessions(
    _principal: Annotated[CurrentPrincipal, Depends(require_role("super_admin"))],
    session: Annotated[AsyncSession, Depends(get_session)],
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
) -> list[PlatformSupportSessionRead]:
    result = await session.execute(
        select(AuditLog, Organization, User)
        .join(Organization, Organization.id == AuditLog.organization_id, isouter=True)
        .join(User, User.id == AuditLog.actor_user_id, isouter=True)
        .where(AuditLog.action == "platform.support_session_opened")
        .order_by(AuditLog.created_at.desc())
        .limit(limit)
    )
    sessions: list[PlatformSupportSessionRead] = []
    for log, organization, user in result.all():
        metadata = parse_metadata(log.metadata_json)
        sessions.append(
            PlatformSupportSessionRead(
                id=log.id,
                organization_id=log.organization_id,
                organization_name=organization.name if organization else None,
                organization_slug=organization.slug if organization else None,
                actor_email=user.email if user else None,
                status="started",
                reason=str(metadata.get("reason") or metadata.get("name") or ""),
                started_at=log.created_at,
                expires_at=None,
            )
        )
    return sessions


@router.get("/support-queue", response_model=list[PlatformTenantSupportQueueItemRead], summary="List tenants needing Super Admin support")
async def platform_support_queue(
    _principal: Annotated[CurrentPrincipal, Depends(require_role("super_admin"))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[PlatformTenantSupportQueueItemRead]:
    repository = OrganizationRepository(session)
    organizations = await repository.list_all()
    support_result = await session.execute(
        select(AuditLog)
        .where(AuditLog.action == "platform.support_session_opened")
        .order_by(AuditLog.created_at.desc())
    )
    last_support: dict[UUID, datetime] = {}
    for log in support_result.scalars().all():
        last_support.setdefault(log.organization_id, log.created_at)
    rows: list[PlatformTenantSupportQueueItemRead] = []
    for organization in organizations:
        user_count = await repository.count_users(organization.id)
        owner_email = await repository.owner_email(organization.id)
        submission_count = await count_rows(session, Submission, Submission.organization_id == organization.id, Submission.deleted_at.is_(None))
        form_count = await count_rows(session, DataForm, DataForm.organization_id == organization.id, DataForm.deleted_at.is_(None))
        device_count = await count_rows(
            session,
            FieldOfficerProfile,
            FieldOfficerProfile.organization_id == organization.id,
            FieldOfficerProfile.device_id.is_not(None),
            FieldOfficerProfile.deleted_at.is_(None),
        )
        reasons: list[str] = []
        if not organization.is_active:
            reasons.append("Organization is suspended or inactive")
        if not owner_email:
            reasons.append("No organization owner is assigned")
        if user_count == 0:
            reasons.append("No tenant users found")
        if form_count and not submission_count:
            reasons.append("Forms exist but no submissions are recorded")
        if form_count and device_count == 0:
            reasons.append("No registered field devices for active form operations")
        if last_support.get(organization.id):
            reasons.append("Recent platform support access")
        if not reasons:
            continue
        priority = "critical" if not organization.is_active or not owner_email else "warning"
        rows.append(
            PlatformTenantSupportQueueItemRead(
                organization_id=organization.id,
                organization_name=organization.name,
                organization_slug=organization.slug,
                priority=priority,
                status="Needs support",
                issue_count=len(reasons),
                user_count=user_count,
                submission_count=submission_count,
                last_support_at=last_support.get(organization.id),
                reasons=reasons,
                recommended_action="Review tenant setup, owner account, mobile readiness, and recent support history.",
            )
        )
    return sorted(rows, key=lambda row: (row.priority != "critical", row.organization_name))


@router.get("/audit-logs", response_model=list[PlatformAuditLogRead], summary="List recent platform-visible audit logs")
async def platform_audit_logs(
    _principal: Annotated[CurrentPrincipal, Depends(require_role("super_admin"))],
    session: Annotated[AsyncSession, Depends(get_session)],
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
) -> list[PlatformAuditLogRead]:
    result = await session.execute(
        select(AuditLog, Organization, User)
        .join(Organization, Organization.id == AuditLog.organization_id, isouter=True)
        .join(User, User.id == AuditLog.actor_user_id, isouter=True)
        .order_by(AuditLog.created_at.desc())
        .limit(limit)
    )
    return [
        PlatformAuditLogRead(
            id=log.id,
            organization_id=log.organization_id,
            organization_name=organization.name if organization else None,
            organization_slug=organization.slug if organization else None,
            actor_user_id=log.actor_user_id,
            actor_email=user.email if user else None,
            action=log.action,
            resource_type=log.resource_type,
            resource_id=log.resource_id,
            metadata=parse_metadata(log.metadata_json),
            created_at=log.created_at,
        )
        for log, organization, user in result.all()
    ]


@router.get("/usage", response_model=list[PlatformOrganizationUsageRead], summary="List platform tenant usage metrics")
async def platform_usage(
    _principal: Annotated[CurrentPrincipal, Depends(require_role("super_admin"))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[PlatformOrganizationUsageRead]:
    repository = OrganizationRepository(session)
    organizations = await repository.list_all()
    rows: list[PlatformOrganizationUsageRead] = []
    for organization in organizations:
        rows.append(
            PlatformOrganizationUsageRead(
                organization_id=organization.id,
                organization_name=organization.name,
                organization_slug=organization.slug,
                is_active=organization.is_active,
                user_count=await repository.count_users(organization.id),
                owner_email=await repository.owner_email(organization.id),
                form_count=await count_rows(session, DataForm, DataForm.organization_id == organization.id, DataForm.deleted_at.is_(None)),
                submission_count=await count_rows(session, Submission, Submission.organization_id == organization.id, Submission.deleted_at.is_(None)),
                beneficiary_count=await count_rows(session, Beneficiary, Beneficiary.organization_id == organization.id, Beneficiary.deleted_at.is_(None)),
                field_officer_count=await count_rows(
                    session,
                    FieldOfficerProfile,
                    FieldOfficerProfile.organization_id == organization.id,
                    FieldOfficerProfile.deleted_at.is_(None),
                ),
                import_job_count=await count_rows(session, DataImportJob, DataImportJob.organization_id == organization.id),
                export_job_count=await count_rows(session, DataExportJob, DataExportJob.organization_id == organization.id),
                audit_event_count=await count_rows(session, AuditLog, AuditLog.organization_id == organization.id),
            )
        )
    return rows


@router.get("/data-isolation", response_model=list[PlatformDataIsolationIssueRead], summary="Audit tenant data isolation risks")
async def platform_data_isolation(
    _principal: Annotated[CurrentPrincipal, Depends(require_role("super_admin"))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[PlatformDataIsolationIssueRead]:
    repository = OrganizationRepository(session)
    organizations = {organization.id: organization for organization in await repository.list_all()}
    issues: list[PlatformDataIsolationIssueRead] = []

    def add_issue(
        issue_id: str,
        severity: str,
        issue_type: str,
        organization_id: UUID | None,
        resource_type: str,
        affected_records: int,
        detail: str,
        recommendation: str,
    ) -> None:
        if affected_records <= 0:
            return
        organization = organizations.get(organization_id) if organization_id else None
        issues.append(
            PlatformDataIsolationIssueRead(
                id=issue_id,
                severity=severity,
                issue_type=issue_type,
                organization_id=organization_id,
                organization_name=organization.name if organization else None,
                organization_slug=organization.slug if organization else None,
                resource_type=resource_type,
                affected_records=affected_records,
                detail=detail,
                recommendation=recommendation,
            )
        )

    for organization in organizations.values():
        if not await repository.owner_email(organization.id):
            add_issue(
                f"owner-missing-{organization.id}",
                "warning",
                "Missing organization owner",
                organization.id,
                "organization",
                1,
                "This organization has no owner account recorded.",
                "Assign or create an Organization Owner before handover.",
            )

    checks: list[tuple[str, Any, Any, Any, str, str, str]] = [
        (
            "form-project-org-mismatch",
            DataForm,
            Project,
            DataForm.project_id == Project.id,
            "data form",
            "Forms linked to projects in another organization can expose data to the wrong tenant.",
            "Open the affected forms and relink them to projects in the same organization.",
        ),
        (
            "submission-project-org-mismatch",
            Submission,
            Project,
            Submission.project_id == Project.id,
            "submission",
            "Submissions linked to projects in another organization can mix tenant datasets.",
            "Move or relink affected submissions before they are approved or reported.",
        ),
        (
            "beneficiary-project-org-mismatch",
            Beneficiary,
            Project,
            Beneficiary.project_id == Project.id,
            "beneficiary",
            "Beneficiaries linked to projects in another organization can leak entity data.",
            "Relink beneficiaries to the correct tenant project or quarantine them for review.",
        ),
        (
            "entity-category-project-org-mismatch",
            EntityCategory,
            Project,
            EntityCategory.project_id == Project.id,
            "entity category",
            "Entity categories linked to another tenant project can pollute form and beneficiary setup.",
            "Relink or recreate the category under the correct organization and project.",
        ),
        (
            "assignment-project-org-mismatch",
            OfficerAssignment,
            Project,
            OfficerAssignment.project_id == Project.id,
            "officer assignment",
            "Assignments pointing across organizations can send forms to the wrong field officers.",
            "Cancel and recreate the affected assignments in the correct organization.",
        ),
    ]
    for issue_key, source_model, target_model, join_condition, resource_type, detail, recommendation in checks:
        result = await session.execute(
            select(source_model.organization_id, func.count())
            .select_from(source_model)
            .join(target_model, join_condition)
            .where(
                source_model.deleted_at.is_(None),
                target_model.deleted_at.is_(None),
                source_model.organization_id != target_model.organization_id,
            )
            .group_by(source_model.organization_id)
        )
        for organization_id, affected_records in result.all():
            add_issue(
                f"{issue_key}-{organization_id}",
                "critical",
                "Cross-organization relationship",
                organization_id,
                resource_type,
                int(affected_records),
                detail,
                recommendation,
            )

    form_mismatch = await session.execute(
        select(Submission.organization_id, func.count())
        .select_from(Submission)
        .join(DataForm, Submission.form_id == DataForm.id)
        .where(
            Submission.deleted_at.is_(None),
            DataForm.deleted_at.is_(None),
            Submission.organization_id != DataForm.organization_id,
        )
        .group_by(Submission.organization_id)
    )
    for organization_id, affected_records in form_mismatch.all():
        add_issue(
            f"submission-form-org-mismatch-{organization_id}",
            "critical",
            "Cross-organization relationship",
            organization_id,
            "submission",
            int(affected_records),
            "Submissions reference forms owned by another organization.",
            "Relink submissions to same-tenant forms or quarantine them from reporting.",
        )

    beneficiary_mismatch = await session.execute(
        select(Submission.organization_id, func.count())
        .select_from(Submission)
        .join(Beneficiary, Submission.entity_id == Beneficiary.id)
        .where(
            Submission.deleted_at.is_(None),
            Beneficiary.deleted_at.is_(None),
            Submission.organization_id != Beneficiary.organization_id,
        )
        .group_by(Submission.organization_id)
    )
    for organization_id, affected_records in beneficiary_mismatch.all():
        add_issue(
            f"submission-beneficiary-org-mismatch-{organization_id}",
            "critical",
            "Cross-organization relationship",
            organization_id,
            "submission",
            int(affected_records),
            "Submissions are linked to beneficiaries from another organization.",
            "Unlink and reconcile the affected records before approval, reporting, or export.",
        )

    return sorted(
        issues,
        key=lambda issue: (issue.severity != "critical", issue.organization_name or "", issue.issue_type),
    )


@router.get("/settings", response_model=PlatformSettingsRead, summary="Read safe platform runtime settings")
async def platform_settings(
    _principal: Annotated[CurrentPrincipal, Depends(require_role("super_admin"))],
) -> PlatformSettingsRead:
    return PlatformSettingsRead(
        app_name=settings.app_name,
        app_env=settings.app_env,
        cors_origins=settings.cors_origins,
        cors_origin_regex=settings.cors_origin_regex,
        access_token_expire_minutes=settings.access_token_expire_minutes,
        database_configured=bool(settings.database_url.strip()),
        jwt_secret_configured=len(os.environ.get("JWT_SECRET", "").strip()) >= 32,
        redis_configured=bool(settings.redis_url.strip()) and "localhost" not in settings.redis_url,
        kafka_configured=bool(settings.kafka_bootstrap_servers.strip()) and "localhost" not in settings.kafka_bootstrap_servers,
    )
