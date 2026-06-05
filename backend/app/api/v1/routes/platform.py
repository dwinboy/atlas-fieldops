import json
import os
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql.elements import ColumnElement

from app.api.v1.dependencies import require_role
from app.app_db import get_session
from app.core.config import settings
from app.models.audit import AuditLog
from app.models.collection import DataForm, FieldOfficerProfile, Submission
from app.models.identity import Membership, Organization, Role, User
from app.models.operations import Beneficiary, DataExportJob, DataImportJob
from app.repositories.identity import OrganizationRepository
from app.schemas.auth import CurrentPrincipal
from app.schemas.platform import (
    PlatformAuditLogRead,
    PlatformOrganizationUsageRead,
    PlatformSettingsRead,
    PlatformSummaryRead,
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
            Role.name == "super_admin",
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
