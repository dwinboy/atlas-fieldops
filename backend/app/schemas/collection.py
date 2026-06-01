from datetime import datetime
from enum import StrEnum
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field, model_validator


class FormStatus(StrEnum):
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"


class SubmissionStatus(StrEnum):
    DRAFT = "draft"
    PENDING_SYNC = "pending_sync"
    SYNCED = "synced"
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    CORRECTION_REQUESTED = "correction_requested"
    RESUBMITTED = "resubmitted"


class LocationCapture(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    altitude: float | None = None
    accuracy: float | None = Field(default=None, ge=0)
    timestamp: datetime


class DeviceMetadata(BaseModel):
    device_id: str = Field(min_length=2, max_length=160)
    platform: str | None = Field(default=None, max_length=80)
    app_version: str | None = Field(default=None, max_length=80)
    os_version: str | None = Field(default=None, max_length=80)


class FormField(BaseModel):
    id: str = Field(min_length=1, max_length=120)
    type: str = Field(min_length=2, max_length=80)
    label: str = Field(min_length=1, max_length=240)
    hint: str | None = Field(default=None, max_length=500)
    required: bool = False
    validation: dict[str, Any] = Field(default_factory=dict)
    visibility: dict[str, Any] = Field(default_factory=dict)
    options: list[dict[str, Any]] = Field(default_factory=list)
    calculation: str | None = None


class FormSection(BaseModel):
    id: str = Field(min_length=1, max_length=120)
    title: str = Field(min_length=1, max_length=240)
    description: str | None = Field(default=None, max_length=1000)
    fields: list[FormField] = Field(default_factory=list)


class FormSchema(BaseModel):
    version_label: str | None = None
    sections: list[FormSection] = Field(min_length=1)

    @model_validator(mode="after")
    def ensure_offline_safe_fields(self) -> "FormSchema":
        supported = {
            "text",
            "textarea",
            "number",
            "decimal",
            "currency",
            "phone",
            "email",
            "password",
            "select",
            "multiselect",
            "radio",
            "checkbox",
            "gps",
            "photo",
            "image",
            "signature",
            "barcode",
            "qr",
            "audio",
            "video",
            "file",
            "date",
            "time",
            "datetime",
            "repeat_group",
            "repeatable_group",
            "calculated",
            "grid",
        }
        for section in self.sections:
            for field in section.fields:
                if field.type not in supported:
                    raise ValueError(f"Unsupported field type: {field.type}")
        return self


class DataFormCreate(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    slug: str = Field(min_length=2, max_length=140, pattern=r"^[a-z0-9-]+$")
    description: str | None = Field(default=None, max_length=2000)
    form_schema: FormSchema = Field(alias="schema")
    publish: bool = False

    model_config = {"populate_by_name": True}


class DataFormRead(BaseModel):
    id: UUID
    name: str
    slug: str
    description: str | None
    status: str
    current_version: int
    is_active: bool

    model_config = {"from_attributes": True}


class XlsFormSurveyRow(BaseModel):
    type: str
    name: str
    label: str
    hint: str | None = None
    required: str | None = None
    constraint: str | None = None
    relevant: str | None = None
    calculation: str | None = None


class XlsFormChoiceRow(BaseModel):
    list_name: str
    name: str
    label: str


class XlsFormSettings(BaseModel):
    form_title: str
    form_id: str
    version: str
    default_language: str = "en"


class XlsFormWorkbook(BaseModel):
    survey: list[XlsFormSurveyRow]
    choices: list[XlsFormChoiceRow]
    settings: XlsFormSettings


class FormCollectionCompatibility(BaseModel):
    form_id: UUID
    version: int
    offline_ready: bool
    xlsform_ready: bool
    web_form_ready: bool
    mobile_app_ready: bool
    has_gps: bool
    has_repeat_groups: bool
    media_field_count: int
    warnings: list[str] = Field(default_factory=list)


class TemplateFieldSummary(BaseModel):
    field_count: int
    repeat_group_count: int
    has_gps: bool
    has_media: bool
    offline_compatible: bool


class FormTemplateRead(BaseModel):
    id: str
    name: str
    slug: str
    category: str
    description: str
    version: int
    tags: list[str]
    recommended_for: list[str]
    estimated_minutes: int
    popularity_score: int
    is_featured: bool
    summary: TemplateFieldSummary


class FormTemplateDetail(FormTemplateRead):
    template_schema: FormSchema
    logic_overview: list[str] = Field(default_factory=list)
    mobile_preview_fields: list[str] = Field(default_factory=list)


class TemplateDuplicateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=200)
    slug: str | None = Field(default=None, min_length=2, max_length=140, pattern=r"^[a-z0-9-]+$")
    publish: bool = False


class TemplateRecommendationRequest(BaseModel):
    organization_type: str | None = Field(default=None, max_length=80)
    recently_used_categories: list[str] = Field(default_factory=list, max_length=8)


class FieldOfficerInvite(BaseModel):
    email: str = Field(min_length=5, max_length=320)
    full_name: str = Field(min_length=2, max_length=200)
    phone_number: str | None = Field(default=None, max_length=40)
    employee_code: str | None = Field(default=None, max_length=80)
    home_region: str | None = Field(default=None, max_length=160)
    temporary_password: str = Field(min_length=12)


class FieldOfficerRead(BaseModel):
    id: UUID
    user_id: UUID
    email: str
    full_name: str
    phone_number: str | None
    employee_code: str | None
    home_region: str | None
    last_sync_at: datetime | None
    last_seen_at: datetime | None
    last_latitude: float | None
    last_longitude: float | None
    device_id: str | None
    is_active: bool


class SubmissionCreate(BaseModel):
    client_submission_id: str = Field(min_length=4, max_length=160)
    form_id: UUID
    form_version: int
    payload: dict[str, Any]
    captured_at: datetime
    submitted_at: datetime
    offline_created: bool = False
    device: DeviceMetadata
    location: LocationCapture

    @model_validator(mode="after")
    def require_system_metadata(self) -> "SubmissionCreate":
        if not self.device.device_id:
            raise ValueError("device_id is required")
        return self


class SubmissionRead(BaseModel):
    id: UUID
    client_submission_id: str
    form_id: UUID
    field_officer_id: UUID
    status: str
    server_sequence: int
    captured_at: datetime
    submitted_at: datetime
    sync_received_at: datetime
    offline_created: bool
    latitude: float
    longitude: float
    accuracy: float | None
    payload_json: dict[str, Any]

    model_config = {"from_attributes": True}


class SubmissionReviewAction(BaseModel):
    action: str = Field(pattern=r"^(approve|reject|request_correction|start_review)$")
    comment: str = Field(min_length=2, max_length=4000)


class SubmissionHistoryRead(BaseModel):
    id: UUID
    from_status: str | None
    to_status: str
    actor_user_id: UUID
    comment: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class SyncBatchCreate(BaseModel):
    client_batch_id: str = Field(min_length=4, max_length=160)
    device: DeviceMetadata
    cursor: datetime | None = None
    submissions: list[SubmissionCreate] = Field(default_factory=list)


class SyncBatchRead(BaseModel):
    batch_id: UUID
    processed_count: int
    conflict_count: int
    server_time: datetime
    submissions: list[SubmissionRead]
    next_cursor: datetime
