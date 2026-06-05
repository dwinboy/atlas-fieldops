from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class AdministrationSummaryRead(BaseModel):
    organizations: int = 0
    countries: int = 0
    active_users: int = 0
    active_projects: int = 0
    api_integrations: int = 0
    scheduled_backups: int = 0
    failed_jobs: int = 0
    active_feature_flags: int = 0
    system_health: str = "healthy"


class LocationCreate(BaseModel):
    name: str = Field(min_length=2, max_length=220)
    code: str = Field(min_length=2, max_length=100)
    location_type: str = Field(default="Country", min_length=2, max_length=80)
    parent_location_id: UUID | None = None
    status: str = Field(default="active", pattern=r"^(active|inactive|archived)$")
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    boundary_reference: str | None = Field(default=None, max_length=500)
    metadata_json: dict[str, object] = Field(default_factory=dict)

    @field_validator("code")
    @classmethod
    def normalize_code(cls, value: str) -> str:
        return value.strip().upper()


class LocationUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=220)
    location_type: str | None = Field(default=None, min_length=2, max_length=80)
    parent_location_id: UUID | None = None
    status: str | None = Field(default=None, pattern=r"^(active|inactive|archived)$")
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    boundary_reference: str | None = Field(default=None, max_length=500)
    metadata_json: dict[str, object] | None = None


class LocationRead(BaseModel):
    id: UUID
    organization_id: UUID | None
    parent_location_id: UUID | None
    name: str
    code: str
    location_type: str
    status: str
    latitude: float | None
    longitude: float | None
    boundary_reference: str | None
    metadata_json: dict[str, object]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ReferenceListCreate(BaseModel):
    name: str = Field(min_length=2, max_length=220)
    slug: str | None = Field(default=None, max_length=140)
    description: str | None = None
    category: str = Field(default="General", max_length=120)
    status: str = Field(default="active", pattern=r"^(active|inactive|archived)$")


class ReferenceListUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=220)
    description: str | None = None
    category: str | None = Field(default=None, max_length=120)
    status: str | None = Field(default=None, pattern=r"^(active|inactive|archived)$")


class ReferenceValueCreate(BaseModel):
    code: str = Field(min_length=1, max_length=120)
    label: str = Field(min_length=1, max_length=240)
    description: str | None = None
    is_active: bool = True
    sort_order: int = 0
    metadata_json: dict[str, object] = Field(default_factory=dict)


class ReferenceValueUpdate(BaseModel):
    label: str | None = Field(default=None, min_length=1, max_length=240)
    description: str | None = None
    is_active: bool | None = None
    sort_order: int | None = None
    metadata_json: dict[str, object] | None = None


class ReferenceValueRead(BaseModel):
    id: UUID
    reference_list_id: UUID
    code: str
    label: str
    description: str | None
    is_active: bool
    sort_order: int
    metadata_json: dict[str, object]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ReferenceListRead(BaseModel):
    id: UUID
    organization_id: UUID | None
    name: str
    slug: str
    description: str | None
    category: str
    status: str
    version: int
    values: list[ReferenceValueRead] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class NotificationRuleCreate(BaseModel):
    event_type: str = Field(min_length=2, max_length=120)
    channel: str = Field(default="Email", pattern=r"^(Email|In-App|SMS|Push)$")
    template: str = Field(default="", max_length=5000)
    frequency: str = Field(default="Immediate", max_length=80)
    status: str = Field(default="active", pattern=r"^(active|inactive|archived)$")
    recipients: list[str] = Field(default_factory=list)
    delivery_rules_json: dict[str, object] = Field(default_factory=dict)


class NotificationRuleUpdate(BaseModel):
    event_type: str | None = Field(default=None, min_length=2, max_length=120)
    channel: str | None = Field(default=None, pattern=r"^(Email|In-App|SMS|Push)$")
    template: str | None = Field(default=None, max_length=5000)
    frequency: str | None = Field(default=None, max_length=80)
    status: str | None = Field(default=None, pattern=r"^(active|inactive|archived)$")
    recipients: list[str] | None = None
    delivery_rules_json: dict[str, object] | None = None


class NotificationRuleRead(BaseModel):
    id: UUID
    event_type: str
    channel: str
    template: str
    frequency: str
    status: str
    recipients_json: list[str]
    delivery_rules_json: dict[str, object]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ApiKeyCreate(BaseModel):
    api_name: str = Field(min_length=2, max_length=200)
    owner: str = Field(min_length=2, max_length=200)
    rate_limit: str = Field(default="1000/hour", max_length=80)
    scope: str = Field(default="Read", pattern=r"^(Read|Write|Admin)$")
    metadata_json: dict[str, object] = Field(default_factory=dict)


class ApiKeyRead(BaseModel):
    id: UUID
    api_name: str
    owner: str
    key_prefix: str
    status: str
    last_used_at: datetime | None
    rotated_at: datetime | None
    revoked_at: datetime | None
    rate_limit: str
    scope: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class IntegrationCreate(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    integration_type: str = Field(min_length=2, max_length=100)
    owner: str = Field(default="Platform team", max_length=200)
    environment: str = Field(default="production", max_length=40)
    metadata_json: dict[str, object] = Field(default_factory=dict)


class IntegrationRead(BaseModel):
    id: UUID
    name: str
    integration_type: str
    status: str
    environment: str
    last_sync_at: datetime | None
    owner: str
    metadata_json: dict[str, object]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SystemSettingUpsert(BaseModel):
    category: str = Field(default="General", max_length=100)
    setting_key: str = Field(min_length=2, max_length=140)
    setting_value_json: dict[str, object] = Field(default_factory=dict)
    environment: str = Field(default="production", max_length=40)
    is_sensitive: bool = False


class SystemSettingRead(BaseModel):
    id: UUID
    category: str
    setting_key: str
    setting_value_json: dict[str, object]
    environment: str
    is_sensitive: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class FeatureFlagUpsert(BaseModel):
    flag_key: str = Field(min_length=2, max_length=140)
    label: str = Field(min_length=2, max_length=200)
    description: str | None = None
    enabled: bool = False
    rollout_percentage: int = Field(default=0, ge=0, le=100)
    environment: str = Field(default="production", max_length=40)


class FeatureFlagRead(BaseModel):
    id: UUID
    flag_key: str
    label: str
    description: str | None
    enabled: bool
    rollout_percentage: int
    environment: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class BackupJobCreate(BaseModel):
    backup_type: str = Field(default="Database Backup", pattern=r"^(Database Backup|File Backup|Configuration Backup)$")
    retention_days: int = Field(default=30, ge=1, le=3650)
    metadata_json: dict[str, object] = Field(default_factory=dict)


class BackupJobRead(BaseModel):
    id: UUID
    backup_type: str
    status: str
    size_bytes: int | None
    retention_days: int
    started_at: datetime | None
    finished_at: datetime | None
    metadata_json: dict[str, object]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class RecoveryJobCreate(BaseModel):
    backup_job_id: UUID | None = None
    reason: str = Field(min_length=10, max_length=2000)


class RecoveryJobRead(BaseModel):
    id: UUID
    backup_job_id: UUID | None
    status: str
    reason: str
    requested_by_user_id: UUID | None
    approved_by_user_id: UUID | None
    started_at: datetime | None
    finished_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SystemAuditLogRead(BaseModel):
    id: UUID
    organization_id: UUID | None
    actor_user_id: UUID | None
    action: str
    resource_type: str
    resource_id: str
    old_value_json: dict[str, object]
    new_value_json: dict[str, object]
    reason: str | None
    ip_address: str | None
    user_agent: str | None
    metadata_json: dict[str, object]
    created_at: datetime

    model_config = {"from_attributes": True}
