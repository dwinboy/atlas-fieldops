from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


def snake_to_camel(value: str) -> str:
    head, *tail = value.split("_")
    return head + "".join(part.capitalize() for part in tail)


class MobileSchema(BaseModel):
    model_config = {
        "alias_generator": snake_to_camel,
        "populate_by_name": True,
    }


class MobileUserRead(MobileSchema):
    id: str
    email: str | None = None
    full_name: str | None = None
    roles: list[str] = Field(default_factory=list)
    permissions: list[str] = Field(default_factory=list)


class MobileOrganizationRead(MobileSchema):
    id: str
    name: str | None = None
    slug: str | None = None
    default_language: str = "English"
    timezone: str = "UTC"
    branding: dict[str, Any] = Field(default_factory=dict)


class MobileProjectRead(MobileSchema):
    id: str
    organization_id: str
    name: str
    code: str
    status: str = "Active"
    region: str | None = None
    country: str | None = None


class MobileAssignmentRead(MobileSchema):
    id: str
    project_id: str
    form_id: str | None = None
    form_version_id: str | None = None
    entity_ids: list[str] = Field(default_factory=list)
    location_ids: list[str] = Field(default_factory=list)
    start_date: datetime | None = None
    end_date: datetime | None = None
    target_count: int = 0
    completed_count: int = 0
    status: str = "Assigned"
    priority: str = "Normal"


class MobileEntityRead(MobileSchema):
    id: str
    entity_uid: str
    entity_type: str
    name: str
    phone: str | None = None
    national_id: str | None = None
    household_id: str | None = None
    gender: str | None = None
    date_of_birth: str | None = None
    location: dict[str, Any] = Field(default_factory=dict)
    gps: dict[str, Any] = Field(default_factory=dict)
    status: str = "Active"
    project_ids: list[str] = Field(default_factory=list)
    assigned_form_ids: list[str] = Field(default_factory=list)
    profile: dict[str, Any] = Field(default_factory=dict)


class MobileLocationRead(MobileSchema):
    id: str
    organization_id: str
    parent_id: str | None = None
    name: str
    code: str | None = None
    level: str = "Custom"
    latitude: float | None = None
    longitude: float | None = None
    boundary_version_id: str | None = None
    active: bool = True


class MobileFormRead(MobileSchema):
    id: str
    project_id: str | None = None
    name: str
    description: str | None = None
    status: str
    current_version_id: str | None = None


class MobileFormVersionRead(MobileSchema):
    id: str
    form_id: str
    version: int
    published_at: datetime | None = None
    offline_compatible: bool = True
    sections: list[dict[str, Any]] = Field(default_factory=list)
    entity_settings: dict[str, Any] = Field(default_factory=dict)


class MobileReferenceListRead(MobileSchema):
    id: str
    name: str
    slug: str
    version: int
    values: list[dict[str, Any]] = Field(default_factory=list)


class MobileSubmissionRead(MobileSchema):
    id: str
    project_id: str
    assignment_id: str | None = None
    form_id: str
    form_version_id: str
    entity_id: str | None = None
    status: str
    frequency_period: str | None = None
    event_id: str | None = None
    responses: list[dict[str, Any]] = Field(default_factory=list)
    sync_status: str = "Queued"


class MobileSubmissionResponseUpload(MobileSchema):
    question_id: str
    variable_name: str
    value: Any
    updated_at: datetime


class MobileSubmissionUpload(MobileSchema):
    local_id: str = Field(min_length=2, max_length=160)
    project_id: str
    assignment_id: str | None = None
    form_id: str
    form_version_id: str
    entity_id: str | None = None
    entity_type: str | None = None
    frequency_period: str | None = None
    event_id: str | None = None
    responses: list[MobileSubmissionResponseUpload] = Field(default_factory=list)
    attachments: list[dict[str, Any]] = Field(default_factory=list)
    location: dict[str, Any] | None = None
    device_id: str | None = None
    app_version: str | None = None
    created_at: datetime
    submitted_at: datetime | None = None


class MobileSubmissionUploadRead(MobileSchema):
    status: Literal["synced", "conflict", "failed"]
    server_submission_id: str | None = None
    local_id: str
    synced_at: datetime | None = None
    message: str


class MobileAttachmentRead(MobileSchema):
    id: str
    submission_local_id: str
    type: str
    local_uri: str
    remote_url: str | None = None
    mime_type: str
    size: int
    sync_status: str = "Queued"


class MobileNotificationRead(MobileSchema):
    id: str
    title: str
    body: str
    read_at: datetime | None = None
    created_by_server_at: datetime


class MobileAuditEventRead(MobileSchema):
    id: str
    event_type: str
    module: str
    entity_type: str | None = None
    entity_id: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    occurred_at: datetime


class MobileBootstrapRead(MobileSchema):
    user: MobileUserRead
    organization: MobileOrganizationRead
    permissions: list[str] = Field(default_factory=list)
    assigned_projects: list[MobileProjectRead] = Field(default_factory=list)
    last_sync: dict[str, Any] = Field(default_factory=dict)


class MobileSyncPackageRead(MobileSchema):
    bootstrap: MobileBootstrapRead
    assignments: list[MobileAssignmentRead] = Field(default_factory=list)
    forms: list[MobileFormRead] = Field(default_factory=list)
    form_versions: list[MobileFormVersionRead] = Field(default_factory=list)
    entities: list[MobileEntityRead] = Field(default_factory=list)
    locations: list[MobileLocationRead] = Field(default_factory=list)
    reference_lists: list[MobileReferenceListRead] = Field(default_factory=list)
    returned_submissions: list[MobileSubmissionRead] = Field(default_factory=list)
    notifications: list[MobileNotificationRead] = Field(default_factory=list)


class MobileSyncQueueUpload(MobileSchema):
    items: list[dict[str, Any]] = Field(default_factory=list)


class MobileSyncUploadRead(MobileSchema):
    accepted: int
    failed: int


class MobileAuditEventUpload(MobileSchema):
    events: list[MobileAuditEventRead] = Field(default_factory=list)


class MobileAuditEventUploadRead(MobileSchema):
    accepted: int


class MobileActionAcceptedRead(MobileSchema):
    status: Literal["accepted"] = "accepted"
    message: str


class MobileDeviceRegistrationCreate(MobileSchema):
    device_id: str = Field(min_length=2, max_length=160)
    device_name: str | None = Field(default=None, max_length=200)
    platform: str = Field(default="Android", max_length=40)
    app_version: str = Field(default="0.1.0", max_length=40)
    os_version: str | None = Field(default=None, max_length=80)


class MobileDeviceRegistrationRead(MobileSchema):
    device_id: str
    status: str = "Active"
    registered_at: datetime
    last_seen_at: datetime
    remote_logout_required: bool = False
    remote_wipe_required: bool = False


class MobileVersionPolicyRead(MobileSchema):
    current_production_version: str = "0.1.0"
    minimum_supported_version: str = "0.1.0"
    staging_version: str = "0.1.0"
    update_available: bool = False
    update_required: bool = False
    message: str | None = None
