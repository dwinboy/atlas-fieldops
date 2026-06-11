from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, Field


class DepartmentCreate(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    code: str = Field(min_length=2, max_length=80, pattern=r"^[a-z0-9-]+$")
    department_type: str = Field(default="department", max_length=80)
    parent_department_id: UUID | None = None
    manager_user_id: UUID | None = None


class DepartmentRead(BaseModel):
    id: UUID
    name: str
    code: str
    department_type: str
    parent_department_id: UUID | None
    manager_user_id: UUID | None
    created_at: datetime

    model_config = {"from_attributes": True}


class TeamCreate(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    code: str = Field(min_length=2, max_length=80, pattern=r"^[a-z0-9-]+$")
    team_type: str = Field(default="field_team", max_length=80)
    department_id: UUID | None = None
    organization_unit_id: UUID | None = None
    manager_user_id: UUID | None = None
    region: str | None = Field(default=None, max_length=160)
    project_id: UUID | None = None


class TeamUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=200)
    code: str | None = Field(default=None, min_length=2, max_length=80, pattern=r"^[a-z0-9-]+$")
    team_type: str | None = Field(default=None, max_length=80)
    department_id: UUID | None = None
    organization_unit_id: UUID | None = None
    manager_user_id: UUID | None = None
    region: str | None = Field(default=None, max_length=160)
    project_id: UUID | None = None
    is_active: bool | None = None


class TeamRead(BaseModel):
    id: UUID
    name: str
    code: str
    team_type: str
    department_id: UUID | None
    organization_unit_id: UUID | None
    manager_user_id: UUID | None
    region: str | None
    project_id: UUID | None
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class WorkforceProfileCreate(BaseModel):
    user_id: UUID
    employee_code: str | None = Field(default=None, max_length=80)
    job_title: str = Field(default="Team member", max_length=160)
    department_id: UUID | None = None
    team_id: UUID | None = None
    supervisor_user_id: UUID | None = None
    lifecycle_status: str = Field(default="active", max_length=40)
    start_date: date | None = None
    end_date: date | None = None
    clearance_level: str = Field(default="standard", max_length=80)


class WorkforceProfileRead(BaseModel):
    id: UUID
    user_id: UUID
    employee_code: str | None
    job_title: str
    department_id: UUID | None
    team_id: UUID | None
    supervisor_user_id: UUID | None
    lifecycle_status: str
    clearance_level: str
    performance_score: float
    created_at: datetime

    model_config = {"from_attributes": True}


class DelegationCreate(BaseModel):
    delegate_user_id: UUID
    permission: str = Field(min_length=3, max_length=120)
    scope_type: str = Field(default="organization", max_length=40)
    geography_id: str | None = Field(default=None, max_length=120)
    project_id: str | None = Field(default=None, max_length=36)
    starts_at: datetime
    expires_at: datetime
    reason: str | None = None


class DelegationRead(BaseModel):
    id: UUID
    delegator_user_id: UUID
    delegate_user_id: UUID
    permission: str
    scope_type: str
    geography_id: str | None
    project_id: str | None
    starts_at: datetime
    expires_at: datetime
    status: str
    reason: str | None

    model_config = {"from_attributes": True}


class ApprovalMatrixCreate(BaseModel):
    matrix_code: str = Field(min_length=2, max_length=100, pattern=r"^[a-z0-9-]+$")
    workflow_type: str = Field(default="submission", max_length=80)
    threshold_type: str = Field(default="risk", max_length=80)
    threshold_value: float = 0
    required_role: str = Field(min_length=2, max_length=100)
    approval_stage: str = Field(default="review", max_length=100)
    escalation_role: str | None = Field(default=None, max_length=100)
    sla_hours: int = Field(default=72, ge=1, le=8760)
    conditions_json: dict[str, object] = Field(default_factory=dict)


class ApprovalMatrixRead(BaseModel):
    id: UUID
    matrix_code: str
    workflow_type: str
    threshold_type: str
    threshold_value: float
    required_role: str
    approval_stage: str
    escalation_role: str | None
    sla_hours: int
    is_active: bool

    model_config = {"from_attributes": True}


class AccessRequestCreate(BaseModel):
    requested_permission: str = Field(min_length=3, max_length=120)
    requested_scope_type: str = Field(default="project", max_length=40)
    geography_id: str | None = Field(default=None, max_length=120)
    project_id: str | None = Field(default=None, max_length=36)
    reason: str = Field(default="", max_length=1000)
    expires_at: datetime | None = None


class AccessRequestReview(BaseModel):
    decision: str = Field(pattern=r"^(approved|rejected)$")


class AccessRequestRead(BaseModel):
    id: UUID
    requester_user_id: UUID
    requested_permission: str
    requested_scope_type: str
    geography_id: str | None
    project_id: str | None
    reason: str
    status: str
    reviewed_by_user_id: UUID | None
    reviewed_at: datetime | None
    expires_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ClearanceLevelCreate(BaseModel):
    code: str = Field(min_length=2, max_length=80, pattern=r"^[a-z0-9-]+$")
    label: str = Field(min_length=2, max_length=160)
    rank: int = Field(default=1, ge=1, le=10)
    allowed_data_classes: list[str] = Field(default_factory=list)
    requires_mfa: bool = False


class ClearanceLevelRead(BaseModel):
    id: UUID
    code: str
    label: str
    rank: int
    allowed_data_classes: list[str]
    requires_mfa: bool

    model_config = {"from_attributes": True}


class OperationalZoneCreate(BaseModel):
    code: str = Field(min_length=2, max_length=100, pattern=r"^[a-z0-9-]+$")
    name: str = Field(min_length=2, max_length=200)
    zone_type: str = Field(default="district", max_length=80)
    parent_zone_id: UUID | None = None
    geography_id: str | None = Field(default=None, max_length=120)
    boundary_json: dict[str, object] = Field(default_factory=dict)


class OperationalZoneRead(BaseModel):
    id: UUID
    code: str
    name: str
    zone_type: str
    parent_zone_id: UUID | None
    geography_id: str | None
    is_active: bool

    model_config = {"from_attributes": True}


class DeviceCreate(BaseModel):
    device_id: str = Field(min_length=3, max_length=160)
    user_id: UUID | None = None
    device_type: str = Field(default="mobile", max_length=80)
    label: str = Field(default="", max_length=180)
    status: str = Field(default="trusted", max_length=40)
    metadata_json: dict[str, object] = Field(default_factory=dict)


class DeviceRead(BaseModel):
    id: UUID
    user_id: UUID | None
    device_id: str
    device_type: str
    label: str
    status: str
    last_seen_at: datetime | None

    model_config = {"from_attributes": True}


class SessionLogCreate(BaseModel):
    user_id: UUID
    device_id: str | None = Field(default=None, max_length=160)
    ip_address: str | None = Field(default=None, max_length=80)
    user_agent: str | None = Field(default=None, max_length=500)
    location_hint: str | None = Field(default=None, max_length=160)
    risk_score: float = Field(default=0, ge=0, le=1)


class SessionLogRead(BaseModel):
    id: UUID
    user_id: UUID
    device_id: str | None
    ip_address: str | None
    location_hint: str | None
    risk_score: float
    status: str
    created_at: datetime
    ended_at: datetime | None

    model_config = {"from_attributes": True}


class AccessSimulationRequest(BaseModel):
    user_id: UUID
    permission: str
    geography_id: str | None = None
    project_id: str | None = None
    organization_unit_id: UUID | None = None
    workflow_stage: str | None = None


class AccessSimulationRead(BaseModel):
    allowed: bool
    decision: str
    matched_roles: list[str]
    matched_scope: str | None
    reasons: list[str]


class OrganizationGovernanceSummary(BaseModel):
    departments: int
    teams: int
    workforce_profiles: int
    active_delegations: int
    pending_access_requests: int
    approval_matrices: int
    clearance_levels: int
    devices: int
    active_sessions: int
    high_risk_sessions: int
    governance_score: float
    attention_items: list[str]
