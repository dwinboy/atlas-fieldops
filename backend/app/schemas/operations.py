from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, Field, model_validator


class ProgramCreate(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    slug: str = Field(min_length=2, max_length=120, pattern=r"^[a-z0-9-]+$")
    region: str | None = Field(default=None, max_length=160)


class ProgramRead(BaseModel):
    id: UUID
    name: str
    slug: str
    region: str | None
    is_active: bool

    model_config = {"from_attributes": True}


class BeneficiaryCreate(BaseModel):
    beneficiary_uid: str = Field(min_length=2, max_length=120)
    beneficiary_type: str = Field(min_length=2, max_length=60)
    display_name: str = Field(min_length=2, max_length=220)
    project_id: UUID | None = None
    sex: str | None = Field(default=None, max_length=30)
    birth_year: int | None = Field(default=None, ge=1900, le=2100)
    phone_number: str | None = Field(default=None, max_length=40)
    region: str | None = Field(default=None, max_length=160)
    district: str | None = Field(default=None, max_length=160)
    community: str | None = Field(default=None, max_length=180)
    vulnerability_score: int = Field(default=0, ge=0, le=100)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    profile_json: dict[str, object] = Field(default_factory=dict)

    @model_validator(mode="after")
    def require_complete_coordinates(self) -> "BeneficiaryCreate":
        if (self.latitude is None) != (self.longitude is None):
            raise ValueError("latitude and longitude must be provided together")
        return self


class BeneficiaryRead(BaseModel):
    id: UUID
    project_id: UUID | None
    beneficiary_uid: str
    beneficiary_type: str
    display_name: str
    sex: str | None
    birth_year: int | None
    phone_number: str | None
    region: str | None
    district: str | None
    community: str | None
    enrollment_status: str
    vulnerability_score: int
    duplicate_risk_score: float
    latitude: float | None
    longitude: float | None
    last_visit_at: datetime | None

    model_config = {"from_attributes": True}


class IndicatorCreate(BaseModel):
    code: str = Field(min_length=2, max_length=80, pattern=r"^[A-Z0-9_.-]+$")
    name: str = Field(min_length=2, max_length=240)
    project_id: UUID | None = None
    description: str | None = Field(default=None, max_length=2000)
    unit: str = Field(default="count", max_length=60)
    reporting_frequency: str = Field(default="monthly", pattern=r"^(monthly|quarterly|annual)$")
    baseline_value: float = 0
    target_value: float = 0
    current_value: float = 0
    sdg_code: str | None = Field(default=None, max_length=40)
    formula: str | None = Field(default=None, max_length=2000)


class IndicatorRead(BaseModel):
    id: UUID
    project_id: UUID | None
    code: str
    name: str
    description: str | None
    unit: str
    reporting_frequency: str
    baseline_value: float
    target_value: float
    current_value: float
    sdg_code: str | None
    formula: str | None
    is_active: bool
    progress_percent: float


class CaseCreate(BaseModel):
    case_number: str = Field(min_length=2, max_length=120)
    case_type: str = Field(min_length=2, max_length=80)
    title: str = Field(min_length=2, max_length=240)
    project_id: UUID | None = None
    beneficiary_id: UUID | None = None
    priority: str = Field(default="normal", pattern=r"^(low|normal|high|urgent)$")
    status: str = Field(default="open", pattern=r"^(open|in_progress|waiting|resolved|closed)$")
    assigned_to_user_id: UUID | None = None
    due_at: datetime | None = None
    notes: str | None = Field(default=None, max_length=4000)


class CaseRead(BaseModel):
    id: UUID
    project_id: UUID | None
    beneficiary_id: UUID | None
    case_number: str
    case_type: str
    title: str
    priority: str
    status: str
    assigned_to_user_id: UUID | None
    due_at: datetime | None
    closed_at: datetime | None
    notes: str | None

    model_config = {"from_attributes": True}


class DonorReportCreate(BaseModel):
    name: str = Field(min_length=2, max_length=220)
    project_id: UUID | None = None
    donor: str | None = Field(default=None, max_length=160)
    report_type: str = Field(default="indicator", max_length=80)
    period_start: date | None = None
    period_end: date | None = None
    summary: str | None = Field(default=None, max_length=4000)
    export_formats: list[str] = Field(default_factory=lambda: ["pdf", "xlsx"])


class DonorReportRead(BaseModel):
    id: UUID
    project_id: UUID | None
    name: str
    donor: str | None
    report_type: str
    period_start: date | None
    period_end: date | None
    status: str
    summary: str | None
    export_formats: list[str]

    model_config = {"from_attributes": True}


class OperationsSummary(BaseModel):
    beneficiaries: int
    active_programs: int
    indicators: int
    open_cases: int
    quality_flags: int
    sync_health_percent: float
    offline_ready: bool
