from datetime import datetime
from typing import Literal
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


class PlatformDataIsolationIssueRead(BaseModel):
    id: str
    severity: str
    issue_type: str
    organization_id: UUID | None = None
    organization_name: str | None = None
    organization_slug: str | None = None
    resource_type: str
    affected_records: int = 0
    detail: str
    recommendation: str


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


class PlatformSecurityPolicyRead(BaseModel):
    mfa_required_for_admins: bool = False
    mfa_required_for_all_users: bool = False
    password_min_length: int = 10
    password_rotation_days: int = 180
    session_timeout_minutes: int = 60
    failed_login_lock_threshold: int = 5
    support_session_timeout_minutes: int = 60
    ip_allowlist_enabled: bool = False
    updated_at: datetime | None = None


class PlatformSecurityPolicyUpdate(BaseModel):
    mfa_required_for_admins: bool = False
    mfa_required_for_all_users: bool = False
    password_min_length: int = Field(ge=8, le=128)
    password_rotation_days: int = Field(ge=0, le=730)
    session_timeout_minutes: int = Field(ge=5, le=1440)
    failed_login_lock_threshold: int = Field(ge=1, le=20)
    support_session_timeout_minutes: int = Field(ge=5, le=480)
    ip_allowlist_enabled: bool = False
    reason: str = Field(min_length=3, max_length=1000)


class PlatformIntegrationRead(BaseModel):
    key: str
    name: str
    provider_type: str
    status: str
    health: str
    last_sync_at: datetime | None = None
    secrets_visible: bool = False


class PlatformIntegrationUpdate(BaseModel):
    status: str = Field(min_length=2, max_length=40)
    health: str = Field(min_length=2, max_length=40)
    owner: str = Field(default="Platform team", max_length=200)
    notes: str = Field(default="", max_length=1000)
    reason: str = Field(min_length=3, max_length=1000)


class PlatformMobileFleetDeviceRead(BaseModel):
    organization_id: UUID
    organization_name: str
    organization_slug: str
    field_officer_id: UUID
    officer_name: str | None = None
    device_id: str
    app_version: str = "Unknown"
    last_sync_at: datetime | None = None
    last_seen_at: datetime | None = None
    submission_count: int = 0
    status: str = "Active"


class PlatformMobileFleetSummaryRead(BaseModel):
    active_devices: int = 0
    offline_devices: int = 0
    active_users: int = 0
    submission_throughput: int = 0
    current_production_version: str = "1.0.0-test"
    minimum_supported_version: str = "1.0.0-test"
    app_versions: dict[str, int] = Field(default_factory=dict)
    devices: list[PlatformMobileFleetDeviceRead] = Field(default_factory=list)


class PlatformSectorPackRead(BaseModel):
    id: str
    name: str
    sector: str
    description: str
    entity_types: list[str] = Field(default_factory=list)
    form_templates: list[str] = Field(default_factory=list)
    indicator_templates: list[str] = Field(default_factory=list)
    report_templates: list[str] = Field(default_factory=list)
    validation_rules: list[str] = Field(default_factory=list)
    data_quality_rules: list[str] = Field(default_factory=list)
    workflows: list[str] = Field(default_factory=list)
    mobile_guidance: list[str] = Field(default_factory=list)
    dashboard_widgets: list[str] = Field(default_factory=list)


class PlatformBackupJobRead(BaseModel):
    id: str
    backup_type: str
    status: str
    size: str
    created_at: datetime
    retention: str
    restore_requires_elevation: bool = True


class PlatformBackupPolicyRead(BaseModel):
    backup_frequency: str = "Daily"
    retention_days: int = 90
    configuration_retention_days: int = 30
    tenant_export_enabled: bool = True
    restore_requires_approval: bool = True
    restore_approver_role: str = "super_admin"
    anonymize_archived_data: bool = False
    updated_at: datetime | None = None


class PlatformBackupPolicyUpdate(BaseModel):
    backup_frequency: str = Field(min_length=3, max_length=40)
    retention_days: int = Field(ge=1, le=3650)
    configuration_retention_days: int = Field(ge=1, le=3650)
    tenant_export_enabled: bool = True
    restore_requires_approval: bool = True
    restore_approver_role: str = Field(min_length=3, max_length=80)
    anonymize_archived_data: bool = False
    reason: str = Field(min_length=3, max_length=1000)


class PlatformReleaseRead(BaseModel):
    environment: str
    backend_version: str = "local"
    frontend_version: str = "managed"
    mobile_version: str = "1.0.0-test"
    release_status: str = "Ready for review"
    maintenance_mode: bool = False
    maintenance_message: str = ""
    maintenance_starts_at: datetime | None = None
    maintenance_ends_at: datetime | None = None
    affected_services: list[str] = Field(default_factory=list)
    announcement_enabled: bool = False
    announcement_title: str = ""
    announcement_body: str = ""
    announcement_tone: str = "info"
    database_ready: bool = False
    jwt_ready: bool = False
    redis_ready: bool = False
    kafka_ready: bool = False
    release_notes: str = ""
    checklist: list[str] = Field(default_factory=list)
    updated_at: datetime | None = None


class PlatformReleaseUpdate(BaseModel):
    backend_version: str = Field(min_length=1, max_length=120)
    frontend_version: str = Field(min_length=1, max_length=120)
    mobile_version: str = Field(min_length=1, max_length=120)
    release_status: str = Field(min_length=2, max_length=80)
    maintenance_mode: bool = False
    maintenance_message: str = Field(default="", max_length=1000)
    maintenance_starts_at: datetime | None = None
    maintenance_ends_at: datetime | None = None
    affected_services: list[str] = Field(default_factory=list)
    announcement_enabled: bool = False
    announcement_title: str = Field(default="", max_length=160)
    announcement_body: str = Field(default="", max_length=1000)
    announcement_tone: str = Field(default="info", max_length=40)
    release_notes: str = Field(default="", max_length=4000)
    reason: str = Field(min_length=3, max_length=1000)


class PlatformLeadRead(BaseModel):
    id: UUID
    name: str
    organization: str
    country: str
    email: EmailStr
    phone: str
    organization_size: str
    interest_area: str
    source: str
    message: str
    status: str
    created_at: datetime


class PlatformOrganizationPlanRead(BaseModel):
    organization_id: UUID
    organization_name: str
    organization_slug: str
    plan: str
    status: str
    user_limit: int
    submission_limit: int
    storage_limit_gb: int
    enabled_modules: list[str] = Field(default_factory=list)
    usage_percent: int = 0


class PlatformOrganizationPlanUpdate(BaseModel):
    plan: str = Field(min_length=2, max_length=80)
    status: str = Field(min_length=2, max_length=40)
    user_limit: int = Field(ge=1, le=1_000_000)
    submission_limit: int = Field(ge=1, le=100_000_000)
    storage_limit_gb: int = Field(ge=1, le=1_000_000)
    enabled_modules: list[str] = Field(default_factory=list)
    reason: str = Field(min_length=3, max_length=1000)


class PlatformActionResult(BaseModel):
    status: str = "accepted"
    message: str


class PlatformFeatureFlagUpdate(BaseModel):
    global_enabled: bool | None = None
    rollout_percentage: int | None = Field(default=None, ge=0, le=100)
    reason: str = Field(min_length=3, max_length=1000)


class PlatformUserSecurityAction(BaseModel):
    action: Literal["lock", "unlock", "force_password_reset", "revoke_sessions", "require_mfa"]
    reason: str = Field(min_length=3, max_length=1000)


class PlatformSupportSessionRead(BaseModel):
    id: UUID
    organization_id: UUID
    organization_name: str | None = None
    organization_slug: str | None = None
    actor_email: EmailStr | None = None
    status: str = "started"
    reason: str = ""
    started_at: datetime
    expires_at: datetime | None = None


class PlatformTenantSupportQueueItemRead(BaseModel):
    organization_id: UUID
    organization_name: str
    organization_slug: str
    priority: str
    status: str
    issue_count: int = 0
    user_count: int = 0
    submission_count: int = 0
    last_support_at: datetime | None = None
    reasons: list[str] = Field(default_factory=list)
    recommended_action: str
