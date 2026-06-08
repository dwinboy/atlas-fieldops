from datetime import datetime
import re
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


OPTIONAL_TEXT_FIELDS = (
    "description",
    "program_type",
    "category",
    "donor",
    "implementing_organization",
    "country",
    "region",
    "district",
    "community",
    "owner",
)


def normalize_optional_text(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, str):
        text = value.strip()
        return text or None
    if isinstance(value, list):
        text = ", ".join(str(item).strip() for item in value if str(item).strip())
        return text or None
    if isinstance(value, dict):
        text = ", ".join(f"{key}: {item}" for key, item in value.items() if item not in (None, ""))
        return text or None
    text = str(value).strip()
    return text or None


def normalize_required_text(value: Any) -> str:
    text = normalize_optional_text(value)
    return text or ""


def normalize_project_code_value(value: Any) -> str:
    text = normalize_required_text(value).lower().replace("_", "-")
    text = re.sub(r"[^a-z0-9-]+", "-", text)
    return text.strip("-")


class ProjectCreate(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    project_code: str = Field(min_length=2, max_length=120)
    description: str | None = Field(default=None, max_length=4000)
    program_type: str | None = Field(default=None, max_length=120)
    category: str | None = Field(default=None, max_length=120)
    donor: str | None = Field(default=None, max_length=160)
    implementing_organization: str | None = Field(default=None, max_length=200)
    country: str | None = Field(default=None, max_length=120)
    region: str | None = Field(default=None, max_length=160)
    district: str | None = Field(default=None, max_length=160)
    community: str | None = Field(default=None, max_length=180)
    owner: str | None = Field(default=None, max_length=200)
    start_date: datetime | None = None
    end_date: datetime | None = None
    settings_json: dict[str, Any] = Field(default_factory=dict)
    status: str = Field(default="draft", pattern=r"^(draft|planning|approved|active|suspended|completed|closed|archived)$")

    @field_validator("project_code", mode="before")
    @classmethod
    def normalize_project_code(cls, value: Any) -> str:
        return normalize_project_code_value(value)

    @field_validator("name", mode="before")
    @classmethod
    def coerce_name(cls, value: Any) -> str:
        return normalize_required_text(value)

    @field_validator(*OPTIONAL_TEXT_FIELDS, mode="before")
    @classmethod
    def coerce_optional_text(cls, value: Any) -> str | None:
        return normalize_optional_text(value)

    @field_validator("start_date", "end_date", mode="before")
    @classmethod
    def blank_dates_to_none(cls, value: Any) -> Any:
        return None if value == "" else value

    @field_validator("settings_json", mode="before")
    @classmethod
    def ensure_settings_dict(cls, value: Any) -> dict[str, Any]:
        return value if isinstance(value, dict) else {}


class ProjectUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=200)
    project_code: str | None = Field(default=None, min_length=2, max_length=120)
    description: str | None = Field(default=None, max_length=4000)
    donor: str | None = Field(default=None, max_length=160)
    implementing_organization: str | None = Field(default=None, max_length=200)
    country: str | None = Field(default=None, max_length=120)
    region: str | None = Field(default=None, max_length=160)
    district: str | None = Field(default=None, max_length=160)
    community: str | None = Field(default=None, max_length=180)
    owner: str | None = Field(default=None, max_length=200)
    start_date: datetime | None = None
    end_date: datetime | None = None
    program_type: str | None = Field(default=None, max_length=120)
    category: str | None = Field(default=None, max_length=120)
    settings_json: dict[str, Any] | None = None
    status: str | None = Field(default=None, pattern=r"^(draft|planning|approved|active|suspended|completed|closed|archived)$")

    @field_validator("project_code", mode="before")
    @classmethod
    def normalize_optional_project_code(cls, value: Any) -> str | None:
        if value is None:
            return value
        text = normalize_optional_text(value)
        return normalize_project_code_value(text) if text else None

    @field_validator("name", mode="before")
    @classmethod
    def coerce_optional_name(cls, value: Any) -> str | None:
        return normalize_optional_text(value)

    @field_validator(*OPTIONAL_TEXT_FIELDS, mode="before")
    @classmethod
    def coerce_optional_update_text(cls, value: Any) -> str | None:
        return normalize_optional_text(value)

    @field_validator("start_date", "end_date", mode="before")
    @classmethod
    def blank_update_dates_to_none(cls, value: Any) -> Any:
        return None if value == "" else value

    @field_validator("settings_json", mode="before")
    @classmethod
    def ensure_update_settings_dict(cls, value: Any) -> dict[str, Any] | None:
        if value is None:
            return None
        return value if isinstance(value, dict) else {}


class ProjectSummaryRead(BaseModel):
    total_projects: int = 0
    active_projects: int = 0
    draft_projects: int = 0
    closed_projects: int = 0
    total_beneficiaries: int = 0
    total_submissions: int = 0
    active_forms: int = 0
    active_field_officers: int = 0
    project_completion_rate: float = 0
    indicator_achievement_rate: float = 0
    attention_projects: int = 0
    risk_alerts: int = 0


class ProjectListItemRead(BaseModel):
    id: UUID
    name: str
    project_code: str
    status: str
    donor: str | None = None
    country: str | None = None
    region: str | None = None
    owner: str | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None
    active_forms: int = 0
    active_assignments: int = 0
    total_submissions: int = 0
    indicator_count: int = 0
    beneficiary_count: int = 0
    progress_percent: float = 0
    health_score: float = 0
    health_status: str = "Needs Attention"
    created_at: datetime
    updated_at: datetime


class ProjectRelatedRecordRead(BaseModel):
    id: UUID
    label: str
    status: str = "active"
    category: str | None = None
    metric: str | None = None
    updated_at: datetime | None = None


class ProjectAuditEventRead(BaseModel):
    id: UUID
    user: str | None = None
    action: str
    resource_type: str
    old_value: str | None = None
    new_value: str | None = None
    reason: str | None = None
    created_at: datetime


class ProjectDetailRead(ProjectListItemRead):
    description: str | None = None
    program_type: str | None = None
    category: str | None = None
    implementing_organization: str | None = None
    settings_json: dict[str, Any] = Field(default_factory=dict)
    forms: list[ProjectRelatedRecordRead] = Field(default_factory=list)
    indicators: list[ProjectRelatedRecordRead] = Field(default_factory=list)
    locations: list[ProjectRelatedRecordRead] = Field(default_factory=list)
    teams: list[ProjectRelatedRecordRead] = Field(default_factory=list)
    assignments: list[ProjectRelatedRecordRead] = Field(default_factory=list)
    submissions: list[ProjectRelatedRecordRead] = Field(default_factory=list)
    reports: list[ProjectRelatedRecordRead] = Field(default_factory=list)
    audit_trail: list[ProjectAuditEventRead] = Field(default_factory=list)


class ProjectTemplateRead(BaseModel):
    id: str
    name: str
    template_type: str
    description: str
    forms: int
    indicators: int
    governance_controls: int
    status: str = "published"
