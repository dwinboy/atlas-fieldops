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
    PlatformAuditLogRead,
    PlatformBackupJobRead,
    PlatformBackupPolicyRead,
    PlatformBackupPolicyUpdate,
    PlatformDataIsolationIssueRead,
    PlatformFeatureFlagUpdate,
    PlatformFeatureFlagRead,
    PlatformHealthServiceRead,
    PlatformIntegrationRead,
    PlatformIntegrationUpdate,
    PlatformLeadRead,
    PlatformMobileFleetDeviceRead,
    PlatformMobileFleetSummaryRead,
    PlatformOrganizationPlanRead,
    PlatformOrganizationPlanUpdate,
    PlatformOrganizationUsageRead,
    PlatformRoleTemplateRead,
    PlatformSecurityEventRead,
    PlatformSecurityPolicyRead,
    PlatformSecurityPolicyUpdate,
    PlatformSectorPackRead,
    PlatformSettingsRead,
    PlatformSummaryRead,
    PlatformSupportSessionRead,
    PlatformSystemHealthRead,
    PlatformUserSecurityAction,
    PlatformUserRead,
)
from app.services.sector_packs import list_sector_packs

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
    value = payload.model_dump(exclude={"reason"})
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
    value = payload.model_dump(exclude={"reason"})
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
        enabled_modules = plan_value.get("enabled_modules") if isinstance(plan_value.get("enabled_modules"), list) else DEFAULT_TENANT_MODULES
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

    checks = [
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
