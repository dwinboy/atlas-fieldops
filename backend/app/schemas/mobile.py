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


class MobileOfficerProfileRead(MobileSchema):
    id: str
    user_id: str
    username: str
    email: str | None = None
    full_name: str | None = None
    employee_code: str | None = None
    phone: str | None = None
    team: str | None = None
    supervisor_id: str | None = None
    supervisor_name: str | None = None
    status: Literal["Active", "Inactive", "Suspended", "OnLeave"] = "Active"
    last_sync_at: datetime | None = None


class MobileSupervisorProfileRead(MobileSchema):
    id: str
    full_name: str | None = None
    email: str | None = None
    phone: str | None = None
    team: str | None = None


class MobilePermissionSetRead(MobileSchema):
    id: str
    user_id: str
    permissions: list[str] = Field(default_factory=list)
    can_collect_data: bool = False
    can_work_offline: bool = True
    can_upload_media: bool = False
    can_use_gps: bool = True
    can_correct_returned_submissions: bool = False


class MobileOfflineRulesRead(MobileSchema):
    id: str = "mobile-rules"
    offline_collection_allowed: bool = True
    sync_required: bool = False
    max_offline_days: int = 7
    gps_required: bool = False
    photo_required: bool = False
    minimum_app_version: str = "1.0.0-test"
    allowed_collection_hours: dict[str, str | None] = Field(
        default_factory=lambda: {"start": None, "end": None},  # type: ignore[arg-type]
    )
    maximum_submissions_per_day: int | None = None
    minimum_interview_duration_seconds: int | None = None


class MobileAssignedCountsRead(MobileSchema):
    projects: int = 0
    assignments: int = 0
    forms: int = 0
    beneficiaries: int = 0
    locations: int = 0
    returned_submissions: int = 0
    pending_uploads: int = 0


class MobileBlockedStateRead(MobileSchema):
    blocked: bool = False
    reason: str | None = None
    account_status: str = "Unknown"
    device_status: str = "Unknown"


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
    sector: dict[str, Any] = Field(default_factory=dict)


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
    entity_category_id: str | None = None
    parent_entity_ids: list[str] = Field(default_factory=list)
    child_entity_ids: list[str] = Field(default_factory=list)
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


class MobileEntityCategoryAttributeRead(MobileSchema):
    id: str
    label: str
    field_key: str
    field_type: str
    description: str | None = None
    required: bool = False
    order_index: int = 0
    options: list[str] = Field(default_factory=list)
    validation: dict[str, Any] = Field(default_factory=dict)
    default_value: str | None = None


class MobileEntityCategoryRead(MobileSchema):
    id: str
    project_id: str | None = None
    parent_category_id: str | None = None
    name: str
    slug: str
    sector: str | None = None
    icon: str = "layers"
    color: str = "#0f8a4b"
    statuses: list[str] = Field(default_factory=list)
    workflow: dict[str, Any] = Field(default_factory=dict)
    attributes: list[MobileEntityCategoryAttributeRead] = Field(default_factory=list)


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


class MobileFormEntitySettingsRead(MobileSchema):
    linked_to_entity: bool = False
    entity_type: str | None = None
    entity_category_id: str | None = None
    creates_new_entity: bool = False
    updates_existing_entity: bool = False
    requires_existing_entity: bool = False
    allows_anonymous_submission: bool = True
    respondent_identity_mode: str | None = None
    entity_search_mode: Literal["required", "optional", "disabled"] = "disabled"
    frequency_rule: str = "Unlimited"
    prefill_mappings: list[dict[str, Any]] = Field(default_factory=list)
    duplicate_mode: Literal["exact", "fuzzy", "weighted"] = "weighted"
    duplicate_threshold: int = 60
    duplicate_action: Literal["block", "warn", "review"] = "block"


class MobileFormVersionRead(MobileSchema):
    id: str
    form_id: str
    version: int
    published_at: datetime | None = None
    offline_compatible: bool = True
    sections: list[dict[str, Any]] = Field(default_factory=list)
    entity_settings: MobileFormEntitySettingsRead = Field(default_factory=MobileFormEntitySettingsRead)


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
    review_status: str = "pending_review"
    review_comments: str | None = None
    reviewed_at: datetime | None = None
    approved_at: datetime | None = None


class MobileSubmissionStatusRead(MobileSchema):
    client_submission_id: str
    status: str
    review_status: str = "pending_review"
    review_comments: str | None = None
    reviewed_at: datetime | None = None
    approved_at: datetime | None = None


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
    linked_entity_ids: list[str] = Field(default_factory=list)
    entity_type: str | None = None
    frequency_period: str | None = None
    event_id: str | None = None
    responses: list[MobileSubmissionResponseUpload] = Field(default_factory=list)
    attachments: list[dict[str, Any]] = Field(default_factory=list)
    location: dict[str, Any] | None = None
    integrity_signals: dict[str, Any] | None = None
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
    # Optional base64-encoded file bytes. When present the server stores the actual file so it can
    # be bundled into exports; when absent only the reference (local_uri/remote_url) is recorded.
    content_base64: str | None = None


class MobileNotificationRead(MobileSchema):
    id: str
    title: str
    body: str
    event_type: str
    resource_type: str | None = None
    resource_id: str | None = None
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


class MobileDeviceRecordRead(MobileSchema):
    id: str
    device_id: str
    device_name: str | None = None
    platform: str = "Android"
    app_version: str = "1.0.0-test"
    os_version: str | None = None
    user_id: str
    organization_id: str
    status: str = "Active"
    registered_at: datetime
    last_seen_at: datetime
    last_sync_at: datetime | None = None
    last_login_at: datetime | None = None
    remote_logout_required: bool = False
    remote_wipe_required: bool = False


class MobileBootstrapRead(MobileSchema):
    user: MobileUserRead
    organization: MobileOrganizationRead
    field_officer_profile: MobileOfficerProfileRead | None = None
    supervisor: MobileSupervisorProfileRead | None = None
    permission_set: MobilePermissionSetRead
    mobile_rules: MobileOfflineRulesRead
    device: MobileDeviceRecordRead | None = None
    assigned_counts: MobileAssignedCountsRead = Field(default_factory=MobileAssignedCountsRead)
    blocked_state: MobileBlockedStateRead = Field(default_factory=MobileBlockedStateRead)
    permissions: list[str] = Field(default_factory=list)
    assigned_projects: list[MobileProjectRead] = Field(default_factory=list)
    last_sync: dict[str, Any] = Field(default_factory=dict)


class MobileLinkedRecordRead(MobileSchema):
    """A record collected by another form, made available offline for linked-record lookups."""

    id: str
    form_id: str
    label: str
    data: dict[str, Any] = Field(default_factory=dict)
    verified: bool = False
    created_at: datetime | None = None
    # The entity the source record was collected for — powers per-beneficiary carry-forward.
    entity_id: str | None = None


class MobileSyncPackageRead(MobileSchema):
    bootstrap: MobileBootstrapRead
    assignments: list[MobileAssignmentRead] = Field(default_factory=list)
    forms: list[MobileFormRead] = Field(default_factory=list)
    form_versions: list[MobileFormVersionRead] = Field(default_factory=list)
    entity_categories: list[MobileEntityCategoryRead] = Field(default_factory=list)
    entities: list[MobileEntityRead] = Field(default_factory=list)
    locations: list[MobileLocationRead] = Field(default_factory=list)
    reference_lists: list[MobileReferenceListRead] = Field(default_factory=list)
    returned_submissions: list[MobileSubmissionRead] = Field(default_factory=list)
    submission_statuses: list[MobileSubmissionStatusRead] = Field(default_factory=list)
    linked_records: list[MobileLinkedRecordRead] = Field(default_factory=list)
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
    server_id: str | None = None


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
