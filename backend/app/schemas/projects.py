from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


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
    status: str = Field(default="draft", pattern=r"^(draft|planning|approved|active|suspended|completed|closed|archived)$")

    @field_validator("project_code")
    @classmethod
    def normalize_project_code(cls, value: str) -> str:
        return value.strip().lower().replace(" ", "-").replace("_", "-")


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

