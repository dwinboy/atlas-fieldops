from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, Field, model_validator

SUPPORTED_DATASET_TYPES = {
    "beneficiaries",
    "submissions",
    "geospatial",
    "media",
    "indicators",
    "programs",
    "cases",
    "field_officers",
    "historical_migration",
}

SUPPORTED_IMPORT_FORMATS = {"csv", "xlsx", "xls", "json", "geojson", "kml", "shapefile", "google_sheet"}
SUPPORTED_EXPORT_FORMATS = {"csv", "xlsx", "pdf", "json", "geojson"}


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


class OrganizationalUnitCreate(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    code: str = Field(min_length=2, max_length=80)
    unit_type: str = Field(min_length=2, max_length=80)
    parent_unit_id: UUID | None = None
    region: str | None = Field(default=None, max_length=160)
    manager_user_id: UUID | None = None
    metadata_json: dict[str, object] = Field(default_factory=dict)


class OrganizationalUnitRead(OrganizationalUnitCreate):
    id: UUID

    model_config = {"from_attributes": True}


class WorkflowDefinitionCreate(BaseModel):
    name: str = Field(min_length=2, max_length=180)
    workflow_type: str = Field(min_length=2, max_length=80)
    project_id: UUID | None = None
    steps_json: list[dict[str, object]] = Field(default_factory=list)
    sla_hours: int = Field(default=72, ge=1)


class WorkflowDefinitionRead(WorkflowDefinitionCreate):
    id: UUID
    version: int
    is_active: bool

    model_config = {"from_attributes": True}


class OperationalTaskCreate(BaseModel):
    title: str = Field(min_length=2, max_length=240)
    task_type: str = Field(min_length=2, max_length=80)
    project_id: UUID | None = None
    beneficiary_id: UUID | None = None
    assigned_to_user_id: UUID | None = None
    priority: str = Field(default="normal", pattern=r"^(low|normal|high|urgent)$")
    due_at: datetime | None = None
    context_json: dict[str, object] = Field(default_factory=dict)


class OperationalTaskRead(OperationalTaskCreate):
    id: UUID
    status: str

    model_config = {"from_attributes": True}


class InterventionCreate(BaseModel):
    project_id: UUID
    intervention_type: str = Field(min_length=2, max_length=100)
    beneficiary_id: UUID | None = None
    task_id: UUID | None = None
    planned_at: datetime | None = None
    value_amount: float | None = Field(default=None, ge=0)
    notes: str | None = Field(default=None, max_length=4000)


class InterventionRead(InterventionCreate):
    id: UUID
    status: str
    completed_at: datetime | None

    model_config = {"from_attributes": True}


class OperationalAssetCreate(BaseModel):
    asset_code: str = Field(min_length=2, max_length=100)
    asset_type: str = Field(min_length=2, max_length=80)
    name: str = Field(min_length=2, max_length=200)
    project_id: UUID | None = None
    assigned_to_user_id: UUID | None = None
    region: str | None = Field(default=None, max_length=160)
    metadata_json: dict[str, object] = Field(default_factory=dict)


class OperationalAssetRead(OperationalAssetCreate):
    id: UUID
    status: str

    model_config = {"from_attributes": True}


class ProjectBudgetLineCreate(BaseModel):
    project_id: UUID
    category: str = Field(min_length=2, max_length=120)
    allocated_amount: float = Field(default=0, ge=0)
    spent_amount: float = Field(default=0, ge=0)
    currency: str = Field(default="USD", max_length=12)
    reporting_code: str | None = Field(default=None, max_length=80)


class ProjectBudgetLineRead(ProjectBudgetLineCreate):
    id: UUID
    utilization_percent: float


class KnowledgeDocumentCreate(BaseModel):
    title: str = Field(min_length=2, max_length=240)
    document_type: str = Field(min_length=2, max_length=80)
    storage_url: str = Field(min_length=2, max_length=500)
    project_id: UUID | None = None
    beneficiary_id: UUID | None = None
    metadata_json: dict[str, object] = Field(default_factory=dict)


class KnowledgeDocumentRead(KnowledgeDocumentCreate):
    id: UUID
    status: str

    model_config = {"from_attributes": True}


class OperationsSummary(BaseModel):
    beneficiaries: int
    active_programs: int
    indicators: int
    open_cases: int
    quality_flags: int
    sync_health_percent: float
    offline_ready: bool


class OperationalEffect(BaseModel):
    module: str
    action: str
    status: str = "queued"
    detail: str


class OperationalEventCreate(BaseModel):
    event_type: str = Field(min_length=2, max_length=100)
    source_module: str = Field(min_length=2, max_length=80)
    summary: str = Field(min_length=2, max_length=320)
    project_id: UUID | None = None
    beneficiary_id: UUID | None = None
    submission_id: UUID | None = None
    priority: str = Field(default="normal", pattern=r"^(low|normal|high|urgent)$")
    payload: dict[str, object] = Field(default_factory=dict)


class OperationalEventRead(BaseModel):
    id: UUID
    project_id: UUID | None
    beneficiary_id: UUID | None
    submission_id: UUID | None
    actor_user_id: UUID | None
    event_type: str
    source_module: str
    status: str
    priority: str
    summary: str
    effects_json: list[dict[str, object]]
    created_at: datetime

    model_config = {"from_attributes": True}


class OperationalLinkRead(BaseModel):
    source_type: str
    source_id: str
    target_type: str
    target_id: str
    relationship_type: str
    strength: float

    model_config = {"from_attributes": True}


class WorkflowQueueItemRead(BaseModel):
    id: UUID
    project_id: UUID | None
    beneficiary_id: UUID | None
    submission_id: UUID | None
    queue_type: str
    trigger_event_type: str
    status: str
    priority: str
    title: str
    next_action: str
    due_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class EcosystemNode(BaseModel):
    id: str
    label: str
    node_type: str
    status: str
    count: int = 0


class EcosystemEdge(BaseModel):
    source: str
    target: str
    label: str
    health: str = "connected"


class OperationalEcosystemRead(BaseModel):
    nodes: list[EcosystemNode]
    edges: list[EcosystemEdge]
    recent_events: list[OperationalEventRead]
    workflow_queue: list[WorkflowQueueItemRead]
    attention_items: list[str]


class ColumnMapping(BaseModel):
    source_column: str = Field(min_length=1, max_length=160)
    target_field: str = Field(min_length=1, max_length=160)
    required: bool = False
    transform: str | None = Field(default=None, max_length=160)


class ImportJobCreate(BaseModel):
    dataset_type: str = Field(min_length=2, max_length=80)
    source_name: str = Field(min_length=2, max_length=240)
    source_format: str = Field(min_length=2, max_length=40)
    total_rows: int = Field(default=0, ge=0)
    mapping: list[ColumnMapping] = Field(default_factory=list)

    @model_validator(mode="after")
    def supported_import(self) -> "ImportJobCreate":
        if self.dataset_type not in SUPPORTED_DATASET_TYPES:
            raise ValueError(f"Unsupported dataset type: {self.dataset_type}")
        if self.source_format not in SUPPORTED_IMPORT_FORMATS:
            raise ValueError(f"Unsupported import format: {self.source_format}")
        return self


class ImportJobRead(BaseModel):
    id: UUID
    dataset_type: str
    source_name: str
    source_format: str
    status: str
    total_rows: int
    valid_rows: int
    error_rows: int
    duplicate_rows: int
    rollback_available: bool

    model_config = {"from_attributes": True}


class ImportUploadResponse(BaseModel):
    job: ImportJobRead
    columns: list[str]
    preview_rows: list[dict[str, object]]
    issues: list["ImportValidationIssue"]


class ImportRowRead(BaseModel):
    id: UUID
    import_job_id: UUID
    row_number: int
    row_data: dict[str, object]
    edited_data: dict[str, object]
    validation_status: str
    issue_count: int
    version: int


class ImportRowUpdate(BaseModel):
    changes: dict[str, object] = Field(min_length=1)
    expected_version: int | None = Field(default=None, ge=1)


class ImportValidationIssue(BaseModel):
    row_number: int
    field_name: str | None = None
    issue_type: str
    severity: str = "error"
    message: str
    suggested_fix: str | None = None


class ImportPreviewRequest(BaseModel):
    dataset_type: str = Field(min_length=2, max_length=80)
    columns: list[str] = Field(min_length=1)
    sample_rows: list[dict[str, object]] = Field(default_factory=list, max_length=100)

    @model_validator(mode="after")
    def supported_dataset(self) -> "ImportPreviewRequest":
        if self.dataset_type not in SUPPORTED_DATASET_TYPES:
            raise ValueError(f"Unsupported dataset type: {self.dataset_type}")
        return self


class ImportPreviewResponse(BaseModel):
    suggested_mapping: list[ColumnMapping]
    issues: list[ImportValidationIssue]
    valid_rows: int
    error_rows: int
    duplicate_rows: int


class MappingTemplateCreate(BaseModel):
    name: str = Field(min_length=2, max_length=180)
    dataset_type: str = Field(min_length=2, max_length=80)
    mapping: list[ColumnMapping] = Field(min_length=1)
    is_default: bool = False


class ExportJobCreate(BaseModel):
    dataset_type: str = Field(min_length=2, max_length=80)
    export_format: str = Field(min_length=2, max_length=40)
    filtered_view: dict[str, object] = Field(default_factory=dict)
    scheduled: bool = False

    @model_validator(mode="after")
    def supported_export(self) -> "ExportJobCreate":
        if self.dataset_type not in SUPPORTED_DATASET_TYPES:
            raise ValueError(f"Unsupported dataset type: {self.dataset_type}")
        if self.export_format not in SUPPORTED_EXPORT_FORMATS:
            raise ValueError(f"Unsupported export format: {self.export_format}")
        return self


class ExportJobRead(BaseModel):
    id: UUID
    dataset_type: str
    export_format: str
    status: str
    download_url: str | None
    scheduled: bool

    model_config = {"from_attributes": True}


class BulkEditRequest(BaseModel):
    dataset_type: str = Field(min_length=2, max_length=80)
    record_ids: list[str] = Field(min_length=1)
    changes: dict[str, object] = Field(min_length=1)
    expected_version: int | None = Field(default=None, ge=1)


class BulkEditRead(BaseModel):
    id: UUID
    dataset_type: str
    status: str
    total_records: int
    changed_records: int
    conflict_count: int
    undo_available: bool

    model_config = {"from_attributes": True}
