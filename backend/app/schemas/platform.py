from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class PlatformSummaryRead(BaseModel):
    organization_count: int = 0
    active_organization_count: int = 0
    inactive_organization_count: int = 0
    tenant_user_count: int = 0
    platform_admin_count: int = 0
    organizations_without_owner_count: int = 0
    audit_event_count: int = 0


class PlatformUserRead(BaseModel):
    user_id: UUID
    email: EmailStr
    full_name: str
    is_active: bool
    role_name: str
    organization_id: UUID
    organization_name: str
    organization_slug: str
    membership_active: bool
    created_at: datetime
    updated_at: datetime


class PlatformAuditLogRead(BaseModel):
    id: UUID
    organization_id: UUID
    organization_name: str | None = None
    organization_slug: str | None = None
    actor_user_id: UUID | None = None
    actor_email: EmailStr | None = None
    action: str
    resource_type: str
    resource_id: str
    metadata: dict[str, object] = Field(default_factory=dict)
    created_at: datetime


class PlatformOrganizationUsageRead(BaseModel):
    organization_id: UUID
    organization_name: str
    organization_slug: str
    is_active: bool
    user_count: int = 0
    owner_email: EmailStr | None = None
    form_count: int = 0
    submission_count: int = 0
    beneficiary_count: int = 0
    field_officer_count: int = 0
    import_job_count: int = 0
    export_job_count: int = 0
    audit_event_count: int = 0


class PlatformSettingsRead(BaseModel):
    app_name: str
    app_env: str
    api_version: str = "v1"
    cors_origins: list[str]
    cors_origin_regex: str
    access_token_expire_minutes: int
    database_configured: bool
    jwt_secret_configured: bool
    redis_configured: bool
    kafka_configured: bool


class PlatformRoleTemplateRead(BaseModel):
    key: str
    label: str
    scope: str
    protected: bool = False
    status: str = "active"
    permissions: list[str] = Field(default_factory=list)


class PlatformFeatureFlagRead(BaseModel):
    key: str
    label: str
    description: str
    global_enabled: bool
    rollout_percentage: int = 100
    environment: str
    organization_overrides: int = 0
    updated_at: datetime | None = None


class PlatformHealthServiceRead(BaseModel):
    service: str
    status: str
    detail: str
    response_time_ms: int | None = None


class PlatformSystemHealthRead(BaseModel):
    status: str
    services: list[PlatformHealthServiceRead]


class PlatformSecurityEventRead(BaseModel):
    id: str
    event_type: str
    severity: str
    actor: str
    organization: str | None = None
    ip_address: str | None = None
    device: str | None = None
    created_at: datetime
    status: str = "open"


class PlatformIntegrationRead(BaseModel):
    key: str
    name: str
    provider_type: str
    status: str
    health: str
    last_sync_at: datetime | None = None
    secrets_visible: bool = False


class PlatformBackupJobRead(BaseModel):
    id: str
    backup_type: str
    status: str
    size: str
    created_at: datetime
    retention: str
    restore_requires_elevation: bool = True
