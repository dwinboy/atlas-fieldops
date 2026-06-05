import json
import os
from datetime import UTC, datetime
from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql.elements import ColumnElement

from app.api.v1.dependencies import require_role
from app.app_db import get_session
from app.core.config import settings
from app.models.audit import AuditLog
from app.models.collection import DataForm, FieldOfficerProfile, Submission
from app.models.identity import Membership, Organization, Role, User
from app.models.marketing import MarketingLead
from app.models.operations import Beneficiary, DataExportJob, DataImportJob
from app.repositories.audit import AuditRepository
from app.repositories.identity import OrganizationRepository
from app.schemas.auth import CurrentPrincipal
from app.schemas.platform import (
    PlatformActionResult,
    PlatformAuditLogRead,
    PlatformBackupJobRead,
    PlatformFeatureFlagUpdate,
    PlatformFeatureFlagRead,
    PlatformHealthServiceRead,
    PlatformIntegrationRead,
    PlatformLeadRead,
    PlatformOrganizationPlanRead,
    PlatformOrganizationUsageRead,
    PlatformRoleTemplateRead,
    PlatformSecurityEventRead,
    PlatformSettingsRead,
    PlatformSummaryRead,
    PlatformSupportSessionRead,
    PlatformSystemHealthRead,
    PlatformUserSecurityAction,
    PlatformUserRead,
)

router = APIRouter()


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
) -> list[PlatformFeatureFlagRead]:
    return feature_flag_catalog(datetime.now(UTC))


@router.patch("/feature-flags/{flag_key}", response_model=PlatformFeatureFlagRead, summary="Audit a platform feature flag change")
async def update_platform_feature_flag(
    flag_key: str,
    payload: PlatformFeatureFlagUpdate,
    principal: Annotated[CurrentPrincipal, Depends(require_role("super_admin"))],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> PlatformFeatureFlagRead:
    flags = {flag.key: flag for flag in feature_flag_catalog(datetime.now(UTC))}
    flag = flags.get(flag_key)
    if flag is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Feature flag not found")
    old_state = flag.model_dump(mode="json")
    if payload.global_enabled is not None:
        flag.global_enabled = payload.global_enabled
    if payload.rollout_percentage is not None:
        flag.rollout_percentage = payload.rollout_percentage
    flag.updated_at = datetime.now(UTC)
    await AuditRepository(session).append(
        organization_id=principal_platform_organization_uuid(principal),
        actor_user_id=principal_user_uuid(principal),
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
) -> list[PlatformIntegrationRead]:
    return [
        PlatformIntegrationRead(key="email", name="Email provider", provider_type="Email", status="not_connected", health="warning"),
        PlatformIntegrationRead(key="sms", name="SMS provider", provider_type="SMS", status="future_ready", health="warning"),
        PlatformIntegrationRead(key="storage", name="Object storage", provider_type="Storage", status="not_connected", health="warning"),
        PlatformIntegrationRead(key="maps", name="Map provider", provider_type="GIS", status="configured", health="healthy"),
        PlatformIntegrationRead(key="monitoring", name="Monitoring provider", provider_type="Observability", status="future_ready", health="warning"),
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
    enabled_modules = ["projects", "forms", "field_operations", "submissions", "mapping", "indicators", "reports", "data_quality"]
    for organization in organizations:
        user_count = await repository.count_users(organization.id)
        submission_count = await count_rows(session, Submission, Submission.organization_id == organization.id, Submission.deleted_at.is_(None))
        plan = "Enterprise" if user_count > 25 or submission_count > 10000 else "Professional"
        user_limit = 250 if plan == "Enterprise" else 50
        submission_limit = 1_000_000 if plan == "Enterprise" else 100_000
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
                status="Active" if organization.is_active else "Suspended",
                user_limit=user_limit,
                submission_limit=submission_limit,
                storage_limit_gb=500 if plan == "Enterprise" else 100,
                enabled_modules=enabled_modules,
                usage_percent=min(usage_percent, 100),
            )
        )
    return rows


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
