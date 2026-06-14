from datetime import date, datetime
from typing import Any
from uuid import UUID

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import JSON

from app.models.base import Base, SoftDeleteMixin, TimestampMixin, UUIDPrimaryKeyMixin

JsonType = JSON().with_variant(JSONB, "postgresql")


class Beneficiary(UUIDPrimaryKeyMixin, SoftDeleteMixin, TimestampMixin, Base):
    __tablename__ = "beneficiaries"
    __table_args__ = (UniqueConstraint("organization_id", "beneficiary_uid"),)

    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    project_id: Mapped[UUID | None] = mapped_column(ForeignKey("projects.id"), index=True, nullable=True)
    beneficiary_uid: Mapped[str] = mapped_column(String(120), nullable=False)
    beneficiary_type: Mapped[str] = mapped_column(String(60), index=True)
    display_name: Mapped[str] = mapped_column(String(220), nullable=False)
    sex: Mapped[str | None] = mapped_column(String(30), nullable=True)
    birth_year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    phone_number: Mapped[str | None] = mapped_column(String(40), nullable=True)
    region: Mapped[str | None] = mapped_column(String(160), index=True, nullable=True)
    district: Mapped[str | None] = mapped_column(String(160), nullable=True)
    community: Mapped[str | None] = mapped_column(String(180), nullable=True)
    enrollment_status: Mapped[str] = mapped_column(String(40), default="active", index=True)
    vulnerability_score: Mapped[int] = mapped_column(Integer, default=0)
    duplicate_risk_score: Mapped[float] = mapped_column(Float, default=0)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    last_visit_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    profile_json: Mapped[dict[str, Any]] = mapped_column(JsonType, default=dict)
    is_imported: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    source_system: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    source_record_id: Mapped[str | None] = mapped_column(String(180), nullable=True, index=True)
    source_project_id: Mapped[str | None] = mapped_column(String(180), nullable=True, index=True)
    import_batch_id: Mapped[UUID | None] = mapped_column(ForeignKey("data_import_jobs.id"), index=True, nullable=True)
    imported_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    imported_by_user_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"), index=True, nullable=True)


class EntityCategory(UUIDPrimaryKeyMixin, SoftDeleteMixin, TimestampMixin, Base):
    __tablename__ = "entity_categories"
    __table_args__ = (UniqueConstraint("organization_id", "project_id", "slug"),)

    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    project_id: Mapped[UUID | None] = mapped_column(ForeignKey("projects.id"), index=True, nullable=True)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    slug: Mapped[str] = mapped_column(String(120), nullable=False)
    sector: Mapped[str | None] = mapped_column(String(80), index=True, nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    icon: Mapped[str] = mapped_column(String(80), default="users")
    color: Mapped[str] = mapped_column(String(20), default="#0f8a4b")
    status: Mapped[str] = mapped_column(String(40), default="active", index=True)
    is_predefined: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    metadata_json: Mapped[dict[str, Any]] = mapped_column(JsonType, default=dict)
    statuses_json: Mapped[list[str]] = mapped_column(JsonType, default=list)
    workflow_json: Mapped[dict[str, Any]] = mapped_column(JsonType, default=dict)


class EntityAttribute(UUIDPrimaryKeyMixin, SoftDeleteMixin, TimestampMixin, Base):
    __tablename__ = "entity_attributes"
    __table_args__ = (UniqueConstraint("category_id", "field_key"),)

    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    category_id: Mapped[UUID] = mapped_column(ForeignKey("entity_categories.id"), index=True)
    label: Mapped[str] = mapped_column(String(160), nullable=False)
    field_key: Mapped[str] = mapped_column(String(120), nullable=False)
    field_type: Mapped[str] = mapped_column(String(40), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    required: Mapped[bool] = mapped_column(Boolean, default=False)
    order_index: Mapped[int] = mapped_column(Integer, default=0)
    options_json: Mapped[list[str]] = mapped_column(JsonType, default=list)
    validation_json: Mapped[dict[str, Any]] = mapped_column(JsonType, default=dict)
    default_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(40), default="active", index=True)


class EntityAttributeValue(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "entity_attribute_values"
    __table_args__ = (UniqueConstraint("entity_id", "attribute_id"),)

    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    entity_id: Mapped[UUID] = mapped_column(ForeignKey("beneficiaries.id"), index=True)
    attribute_id: Mapped[UUID] = mapped_column(ForeignKey("entity_attributes.id"), index=True)
    value_json: Mapped[dict[str, Any]] = mapped_column(JsonType, default=dict)
    source_submission_id: Mapped[UUID | None] = mapped_column(ForeignKey("submissions.id"), index=True, nullable=True)


class MonitoringIndicator(UUIDPrimaryKeyMixin, SoftDeleteMixin, TimestampMixin, Base):
    __tablename__ = "monitoring_indicators"
    __table_args__ = (UniqueConstraint("organization_id", "code"),)

    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    project_id: Mapped[UUID | None] = mapped_column(ForeignKey("projects.id"), index=True, nullable=True)
    survey_id: Mapped[UUID | None] = mapped_column(ForeignKey("surveys.id"), index=True, nullable=True)
    code: Mapped[str] = mapped_column(String(80), nullable=False)
    name: Mapped[str] = mapped_column(String(240), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    unit: Mapped[str] = mapped_column(String(60), default="count")
    reporting_frequency: Mapped[str] = mapped_column(String(40), default="monthly")
    baseline_value: Mapped[float] = mapped_column(Float, default=0)
    target_value: Mapped[float] = mapped_column(Float, default=0)
    current_value: Mapped[float] = mapped_column(Float, default=0)
    sdg_code: Mapped[str | None] = mapped_column(String(40), nullable=True)
    formula: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[str | None] = mapped_column(String(60), nullable=True)
    disaggregation_json: Mapped[list[str]] = mapped_column(JsonType, default=list)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_imported: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    source_system: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    source_record_id: Mapped[str | None] = mapped_column(String(180), nullable=True, index=True)
    source_project_id: Mapped[str | None] = mapped_column(String(180), nullable=True, index=True)
    import_batch_id: Mapped[UUID | None] = mapped_column(ForeignKey("data_import_jobs.id"), index=True, nullable=True)
    imported_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    imported_by_user_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"), index=True, nullable=True)


class CaseRecord(UUIDPrimaryKeyMixin, SoftDeleteMixin, TimestampMixin, Base):
    __tablename__ = "case_records"

    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    project_id: Mapped[UUID | None] = mapped_column(ForeignKey("projects.id"), index=True, nullable=True)
    beneficiary_id: Mapped[UUID | None] = mapped_column(ForeignKey("beneficiaries.id"), index=True, nullable=True)
    case_number: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    case_type: Mapped[str] = mapped_column(String(80), index=True)
    title: Mapped[str] = mapped_column(String(240), nullable=False)
    priority: Mapped[str] = mapped_column(String(40), default="normal", index=True)
    status: Mapped[str] = mapped_column(String(40), default="open", index=True)
    assigned_to_user_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"), index=True, nullable=True)
    due_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)


class VisitRecord(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "visit_records"

    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    beneficiary_id: Mapped[UUID] = mapped_column(ForeignKey("beneficiaries.id"), index=True)
    field_officer_id: Mapped[UUID | None] = mapped_column(ForeignKey("field_officer_profiles.id"), index=True, nullable=True)
    submission_id: Mapped[UUID | None] = mapped_column(ForeignKey("submissions.id"), index=True, nullable=True)
    visit_type: Mapped[str] = mapped_column(String(80), default="follow_up")
    visited_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    media_count: Mapped[int] = mapped_column(Integer, default=0)


class FieldVisitRequest(UUIDPrimaryKeyMixin, SoftDeleteMixin, TimestampMixin, Base):
    __tablename__ = "field_visit_requests"

    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    project_id: Mapped[UUID | None] = mapped_column(ForeignKey("projects.id"), index=True, nullable=True)
    beneficiary_id: Mapped[UUID | None] = mapped_column(ForeignKey("beneficiaries.id"), index=True, nullable=True)
    field_officer_id: Mapped[UUID] = mapped_column(ForeignKey("field_officer_profiles.id"), index=True)
    supervisor_user_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"), index=True, nullable=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    activity_type: Mapped[str] = mapped_column(String(80), default="field_visit", index=True)
    activity_scope: Mapped[str] = mapped_column(String(40), default="organization", index=True)
    requires_approval: Mapped[bool] = mapped_column(Boolean, default=True)
    purpose: Mapped[str | None] = mapped_column(Text, nullable=True)
    location_name: Mapped[str] = mapped_column(String(220), nullable=False)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    requested_start_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    requested_end_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    priority: Mapped[str] = mapped_column(String(40), default="normal", index=True)
    status: Mapped[str] = mapped_column(String(40), default="pending", index=True)
    required_form_ids_json: Mapped[list[str]] = mapped_column(JsonType, default=list)
    planned_activities_json: Mapped[list[str]] = mapped_column(JsonType, default=list)
    supervisor_instructions: Mapped[str | None] = mapped_column(Text, nullable=True)
    reviewed_by_user_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"), index=True, nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    check_in_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    check_in_latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    check_in_longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    check_in_accuracy: Mapped[float | None] = mapped_column(Float, nullable=True)
    check_in_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    check_out_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    check_out_latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    check_out_longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    check_out_accuracy: Mapped[float | None] = mapped_column(Float, nullable=True)
    check_out_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    verification_status: Mapped[str] = mapped_column(String(40), default="not_checked_in", index=True)
    distance_from_planned_meters: Mapped[float | None] = mapped_column(Float, nullable=True)
    metadata_json: Mapped[dict[str, Any]] = mapped_column(JsonType, default=dict)


class DataQualitySignal(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "data_quality_signals"

    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    submission_id: Mapped[UUID | None] = mapped_column(ForeignKey("submissions.id"), index=True, nullable=True)
    beneficiary_id: Mapped[UUID | None] = mapped_column(ForeignKey("beneficiaries.id"), index=True, nullable=True)
    signal_type: Mapped[str] = mapped_column(String(80), index=True)
    severity: Mapped[str] = mapped_column(String(40), default="medium", index=True)
    confidence: Mapped[float] = mapped_column(Float, default=0)
    summary: Mapped[str] = mapped_column(String(300), nullable=False)
    status: Mapped[str] = mapped_column(String(40), default="open", index=True)
    evidence_json: Mapped[dict[str, Any]] = mapped_column(JsonType, default=dict)


class OrganizationalUnit(UUIDPrimaryKeyMixin, SoftDeleteMixin, TimestampMixin, Base):
    __tablename__ = "organizational_units"
    __table_args__ = (UniqueConstraint("organization_id", "code"),)

    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    parent_unit_id: Mapped[UUID | None] = mapped_column(ForeignKey("organizational_units.id"), index=True, nullable=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    code: Mapped[str] = mapped_column(String(80), nullable=False)
    unit_type: Mapped[str] = mapped_column(String(80), index=True)
    region: Mapped[str | None] = mapped_column(String(160), index=True, nullable=True)
    manager_user_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"), index=True, nullable=True)
    metadata_json: Mapped[dict[str, Any]] = mapped_column(JsonType, default=dict)
    is_imported: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    source_system: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    source_record_id: Mapped[str | None] = mapped_column(String(180), nullable=True, index=True)
    import_batch_id: Mapped[UUID | None] = mapped_column(ForeignKey("data_import_jobs.id"), index=True, nullable=True)
    imported_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    imported_by_user_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"), index=True, nullable=True)


class Department(UUIDPrimaryKeyMixin, SoftDeleteMixin, TimestampMixin, Base):
    __tablename__ = "departments"
    __table_args__ = (UniqueConstraint("organization_id", "code"),)

    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    parent_department_id: Mapped[UUID | None] = mapped_column(ForeignKey("departments.id"), index=True, nullable=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    code: Mapped[str] = mapped_column(String(80), nullable=False)
    department_type: Mapped[str] = mapped_column(String(80), default="department", index=True)
    manager_user_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"), index=True, nullable=True)
    metadata_json: Mapped[dict[str, Any]] = mapped_column(JsonType, default=dict)


class OperationalTeam(UUIDPrimaryKeyMixin, SoftDeleteMixin, TimestampMixin, Base):
    __tablename__ = "operational_teams"
    __table_args__ = (UniqueConstraint("organization_id", "code"),)

    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    department_id: Mapped[UUID | None] = mapped_column(ForeignKey("departments.id"), index=True, nullable=True)
    organization_unit_id: Mapped[UUID | None] = mapped_column(ForeignKey("organizational_units.id"), index=True, nullable=True)
    manager_user_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"), index=True, nullable=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    code: Mapped[str] = mapped_column(String(80), nullable=False)
    team_type: Mapped[str] = mapped_column(String(80), default="field_team", index=True)
    region: Mapped[str | None] = mapped_column(String(160), index=True, nullable=True)
    project_id: Mapped[UUID | None] = mapped_column(ForeignKey("projects.id"), index=True, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    metadata_json: Mapped[dict[str, Any]] = mapped_column(JsonType, default=dict)
    is_imported: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    source_system: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    source_record_id: Mapped[str | None] = mapped_column(String(180), nullable=True, index=True)
    import_batch_id: Mapped[UUID | None] = mapped_column(ForeignKey("data_import_jobs.id"), index=True, nullable=True)
    imported_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    imported_by_user_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"), index=True, nullable=True)


class WorkforceProfile(UUIDPrimaryKeyMixin, SoftDeleteMixin, TimestampMixin, Base):
    __tablename__ = "workforce_profiles"
    __table_args__ = (UniqueConstraint("organization_id", "user_id"),)

    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    employee_code: Mapped[str | None] = mapped_column(String(80), index=True, nullable=True)
    job_title: Mapped[str] = mapped_column(String(160), default="Team member")
    department_id: Mapped[UUID | None] = mapped_column(ForeignKey("departments.id"), index=True, nullable=True)
    team_id: Mapped[UUID | None] = mapped_column(ForeignKey("operational_teams.id"), index=True, nullable=True)
    supervisor_user_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"), index=True, nullable=True)
    lifecycle_status: Mapped[str] = mapped_column(String(40), default="active", index=True)
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    clearance_level: Mapped[str] = mapped_column(String(80), default="standard", index=True)
    performance_score: Mapped[float] = mapped_column(Float, default=0)
    metadata_json: Mapped[dict[str, Any]] = mapped_column(JsonType, default=dict)


class AccessDelegation(UUIDPrimaryKeyMixin, SoftDeleteMixin, TimestampMixin, Base):
    __tablename__ = "access_delegations"

    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    delegator_user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    delegate_user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    permission: Mapped[str] = mapped_column(String(120), index=True)
    scope_type: Mapped[str] = mapped_column(String(40), default="organization", index=True)
    geography_id: Mapped[str | None] = mapped_column(String(120), index=True, nullable=True)
    project_id: Mapped[str | None] = mapped_column(String(36), index=True, nullable=True)
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    status: Mapped[str] = mapped_column(String(40), default="active", index=True)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)


class ApprovalMatrix(UUIDPrimaryKeyMixin, SoftDeleteMixin, TimestampMixin, Base):
    __tablename__ = "approval_matrices"
    __table_args__ = (UniqueConstraint("organization_id", "matrix_code"),)

    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    matrix_code: Mapped[str] = mapped_column(String(100), nullable=False)
    workflow_type: Mapped[str] = mapped_column(String(80), index=True)
    threshold_type: Mapped[str] = mapped_column(String(80), default="risk", index=True)
    threshold_value: Mapped[float] = mapped_column(Float, default=0)
    required_role: Mapped[str] = mapped_column(String(100), nullable=False)
    approval_stage: Mapped[str] = mapped_column(String(100), default="review", index=True)
    escalation_role: Mapped[str | None] = mapped_column(String(100), nullable=True)
    sla_hours: Mapped[int] = mapped_column(Integer, default=72)
    conditions_json: Mapped[dict[str, Any]] = mapped_column(JsonType, default=dict)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class PolicyRule(UUIDPrimaryKeyMixin, SoftDeleteMixin, TimestampMixin, Base):
    __tablename__ = "policy_rules"
    __table_args__ = (UniqueConstraint("organization_id", "rule_code"),)

    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    rule_code: Mapped[str] = mapped_column(String(100), nullable=False)
    name: Mapped[str] = mapped_column(String(220), nullable=False)
    policy_type: Mapped[str] = mapped_column(String(80), index=True)
    effect: Mapped[str] = mapped_column(String(40), default="allow", index=True)
    expression: Mapped[str] = mapped_column(Text, default="")
    priority: Mapped[int] = mapped_column(Integer, default=100)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class AccessRequest(UUIDPrimaryKeyMixin, SoftDeleteMixin, TimestampMixin, Base):
    __tablename__ = "access_requests"

    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    requester_user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    requested_permission: Mapped[str] = mapped_column(String(120), index=True)
    requested_scope_type: Mapped[str] = mapped_column(String(40), default="project", index=True)
    geography_id: Mapped[str | None] = mapped_column(String(120), index=True, nullable=True)
    project_id: Mapped[str | None] = mapped_column(String(36), index=True, nullable=True)
    reason: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(40), default="pending", index=True)
    reviewed_by_user_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"), index=True, nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class ClearanceLevel(UUIDPrimaryKeyMixin, SoftDeleteMixin, TimestampMixin, Base):
    __tablename__ = "clearance_levels"
    __table_args__ = (UniqueConstraint("organization_id", "code"),)

    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    code: Mapped[str] = mapped_column(String(80), nullable=False)
    label: Mapped[str] = mapped_column(String(160), nullable=False)
    rank: Mapped[int] = mapped_column(Integer, default=1, index=True)
    allowed_data_classes: Mapped[list[str]] = mapped_column(JsonType, default=list)
    requires_mfa: Mapped[bool] = mapped_column(Boolean, default=False)


class OperationalZone(UUIDPrimaryKeyMixin, SoftDeleteMixin, TimestampMixin, Base):
    __tablename__ = "operational_zones"
    __table_args__ = (UniqueConstraint("organization_id", "code"),)

    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    code: Mapped[str] = mapped_column(String(100), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    zone_type: Mapped[str] = mapped_column(String(80), default="district", index=True)
    parent_zone_id: Mapped[UUID | None] = mapped_column(ForeignKey("operational_zones.id"), index=True, nullable=True)
    geography_id: Mapped[str | None] = mapped_column(String(120), index=True, nullable=True)
    boundary_json: Mapped[dict[str, Any]] = mapped_column(JsonType, default=dict)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class SessionLog(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "session_logs"

    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    device_id: Mapped[str | None] = mapped_column(String(160), index=True, nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(80), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String(500), nullable=True)
    location_hint: Mapped[str | None] = mapped_column(String(160), nullable=True)
    risk_score: Mapped[float] = mapped_column(Float, default=0)
    status: Mapped[str] = mapped_column(String(40), default="active", index=True)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class DeviceRegistry(UUIDPrimaryKeyMixin, SoftDeleteMixin, TimestampMixin, Base):
    __tablename__ = "device_registry"
    __table_args__ = (UniqueConstraint("organization_id", "device_id"),)

    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    user_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"), index=True, nullable=True)
    device_id: Mapped[str] = mapped_column(String(160), nullable=False)
    device_type: Mapped[str] = mapped_column(String(80), default="mobile", index=True)
    label: Mapped[str] = mapped_column(String(180), default="")
    status: Mapped[str] = mapped_column(String(40), default="trusted", index=True)
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    metadata_json: Mapped[dict[str, Any]] = mapped_column(JsonType, default=dict)


class WorkflowDefinition(UUIDPrimaryKeyMixin, SoftDeleteMixin, TimestampMixin, Base):
    __tablename__ = "workflow_definitions"
    __table_args__ = (UniqueConstraint("organization_id", "name", "version"),)

    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    project_id: Mapped[UUID | None] = mapped_column(ForeignKey("projects.id"), index=True, nullable=True)
    name: Mapped[str] = mapped_column(String(180), nullable=False)
    workflow_type: Mapped[str] = mapped_column(String(80), index=True)
    version: Mapped[int] = mapped_column(Integer, default=1)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    steps_json: Mapped[list[dict[str, Any]]] = mapped_column(JsonType, default=list)
    sla_hours: Mapped[int] = mapped_column(Integer, default=72)


class OperationalTask(UUIDPrimaryKeyMixin, SoftDeleteMixin, TimestampMixin, Base):
    __tablename__ = "operational_tasks"

    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    project_id: Mapped[UUID | None] = mapped_column(ForeignKey("projects.id"), index=True, nullable=True)
    beneficiary_id: Mapped[UUID | None] = mapped_column(ForeignKey("beneficiaries.id"), index=True, nullable=True)
    assigned_to_user_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"), index=True, nullable=True)
    title: Mapped[str] = mapped_column(String(240), nullable=False)
    task_type: Mapped[str] = mapped_column(String(80), index=True)
    status: Mapped[str] = mapped_column(String(40), default="open", index=True)
    priority: Mapped[str] = mapped_column(String(40), default="normal", index=True)
    due_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    context_json: Mapped[dict[str, Any]] = mapped_column(JsonType, default=dict)


class InterventionRecord(UUIDPrimaryKeyMixin, SoftDeleteMixin, TimestampMixin, Base):
    __tablename__ = "intervention_records"

    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    project_id: Mapped[UUID] = mapped_column(ForeignKey("projects.id"), index=True)
    beneficiary_id: Mapped[UUID | None] = mapped_column(ForeignKey("beneficiaries.id"), index=True, nullable=True)
    task_id: Mapped[UUID | None] = mapped_column(ForeignKey("operational_tasks.id"), index=True, nullable=True)
    intervention_type: Mapped[str] = mapped_column(String(100), index=True)
    status: Mapped[str] = mapped_column(String(40), default="planned", index=True)
    planned_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    value_amount: Mapped[float | None] = mapped_column(Float, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)


class OperationalAsset(UUIDPrimaryKeyMixin, SoftDeleteMixin, TimestampMixin, Base):
    __tablename__ = "operational_assets"
    __table_args__ = (UniqueConstraint("organization_id", "asset_code"),)

    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    project_id: Mapped[UUID | None] = mapped_column(ForeignKey("projects.id"), index=True, nullable=True)
    assigned_to_user_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"), index=True, nullable=True)
    asset_code: Mapped[str] = mapped_column(String(100), nullable=False)
    asset_type: Mapped[str] = mapped_column(String(80), index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    status: Mapped[str] = mapped_column(String(40), default="available", index=True)
    region: Mapped[str | None] = mapped_column(String(160), index=True, nullable=True)
    metadata_json: Mapped[dict[str, Any]] = mapped_column(JsonType, default=dict)


class ProjectBudgetLine(UUIDPrimaryKeyMixin, SoftDeleteMixin, TimestampMixin, Base):
    __tablename__ = "project_budget_lines"

    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    project_id: Mapped[UUID] = mapped_column(ForeignKey("projects.id"), index=True)
    category: Mapped[str] = mapped_column(String(120), index=True)
    allocated_amount: Mapped[float] = mapped_column(Float, default=0)
    spent_amount: Mapped[float] = mapped_column(Float, default=0)
    currency: Mapped[str] = mapped_column(String(12), default="USD")
    reporting_code: Mapped[str | None] = mapped_column(String(80), nullable=True)


class KnowledgeDocument(UUIDPrimaryKeyMixin, SoftDeleteMixin, TimestampMixin, Base):
    __tablename__ = "knowledge_documents"

    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    project_id: Mapped[UUID | None] = mapped_column(ForeignKey("projects.id"), index=True, nullable=True)
    beneficiary_id: Mapped[UUID | None] = mapped_column(ForeignKey("beneficiaries.id"), index=True, nullable=True)
    title: Mapped[str] = mapped_column(String(240), nullable=False)
    document_type: Mapped[str] = mapped_column(String(80), index=True)
    storage_url: Mapped[str] = mapped_column(String(500), nullable=False)
    status: Mapped[str] = mapped_column(String(40), default="active", index=True)
    metadata_json: Mapped[dict[str, Any]] = mapped_column(JsonType, default=dict)


class OperationalEvent(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "operational_events"

    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    project_id: Mapped[UUID | None] = mapped_column(ForeignKey("projects.id"), index=True, nullable=True)
    beneficiary_id: Mapped[UUID | None] = mapped_column(ForeignKey("beneficiaries.id"), index=True, nullable=True)
    submission_id: Mapped[UUID | None] = mapped_column(ForeignKey("submissions.id"), index=True, nullable=True)
    actor_user_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"), index=True, nullable=True)
    event_type: Mapped[str] = mapped_column(String(100), index=True)
    source_module: Mapped[str] = mapped_column(String(80), index=True)
    status: Mapped[str] = mapped_column(String(40), default="processed", index=True)
    priority: Mapped[str] = mapped_column(String(40), default="normal", index=True)
    summary: Mapped[str] = mapped_column(String(320), nullable=False)
    payload_json: Mapped[dict[str, Any]] = mapped_column(JsonType, default=dict)
    effects_json: Mapped[list[dict[str, Any]]] = mapped_column(JsonType, default=list)


class OperationalLink(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "operational_links"
    __table_args__ = (UniqueConstraint("organization_id", "source_type", "source_id", "target_type", "target_id", "relationship_type"),)

    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    project_id: Mapped[UUID | None] = mapped_column(ForeignKey("projects.id"), index=True, nullable=True)
    source_type: Mapped[str] = mapped_column(String(80), index=True)
    source_id: Mapped[str] = mapped_column(String(160), index=True)
    target_type: Mapped[str] = mapped_column(String(80), index=True)
    target_id: Mapped[str] = mapped_column(String(160), index=True)
    relationship_type: Mapped[str] = mapped_column(String(100), index=True)
    strength: Mapped[float] = mapped_column(Float, default=1)
    metadata_json: Mapped[dict[str, Any]] = mapped_column(JsonType, default=dict)


class WorkflowQueueItem(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "workflow_queue_items"

    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    project_id: Mapped[UUID | None] = mapped_column(ForeignKey("projects.id"), index=True, nullable=True)
    beneficiary_id: Mapped[UUID | None] = mapped_column(ForeignKey("beneficiaries.id"), index=True, nullable=True)
    submission_id: Mapped[UUID | None] = mapped_column(ForeignKey("submissions.id"), index=True, nullable=True)
    assigned_to_user_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"), index=True, nullable=True)
    queue_type: Mapped[str] = mapped_column(String(80), index=True)
    trigger_event_type: Mapped[str] = mapped_column(String(100), index=True)
    status: Mapped[str] = mapped_column(String(40), default="open", index=True)
    priority: Mapped[str] = mapped_column(String(40), default="normal", index=True)
    title: Mapped[str] = mapped_column(String(240), nullable=False)
    next_action: Mapped[str] = mapped_column(String(240), nullable=False)
    due_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    context_json: Mapped[dict[str, Any]] = mapped_column(JsonType, default=dict)


class FieldWorkPlan(UUIDPrimaryKeyMixin, SoftDeleteMixin, TimestampMixin, Base):
    __tablename__ = "field_work_plans"

    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    created_by_user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    name: Mapped[str] = mapped_column(String(220), nullable=False)
    project: Mapped[str | None] = mapped_column(String(200), nullable=True)
    objectives: Mapped[str | None] = mapped_column(Text, nullable=True)
    locations_json: Mapped[list[str]] = mapped_column(JsonType, nullable=False, default=list)
    assigned_teams_json: Mapped[list[str]] = mapped_column(JsonType, nullable=False, default=list)
    deliverables_json: Mapped[list[str]] = mapped_column(JsonType, nullable=False, default=list)
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    progress: Mapped[int] = mapped_column(Integer, default=0)
    view: Mapped[str] = mapped_column(String(20), default="Timeline")


class OperationalTargetRecord(UUIDPrimaryKeyMixin, SoftDeleteMixin, TimestampMixin, Base):
    __tablename__ = "operational_targets"

    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    created_by_user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    indicator_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("monitoring_indicators.id"), index=True, nullable=True
    )
    name: Mapped[str] = mapped_column(String(220), nullable=False)
    target_type: Mapped[str] = mapped_column(String(20), default="Project", index=True)
    project: Mapped[str | None] = mapped_column(String(200), nullable=True)
    indicator: Mapped[str | None] = mapped_column(String(220), nullable=True)
    team: Mapped[str | None] = mapped_column(String(160), nullable=True)
    assigned_staff_json: Mapped[list[str]] = mapped_column(JsonType, nullable=False, default=list)
    target_value: Mapped[int] = mapped_column(Integer, default=0)
    achieved_value: Mapped[int] = mapped_column(Integer, default=0)
    deadline: Mapped[date | None] = mapped_column(Date, nullable=True)


class DonorReport(UUIDPrimaryKeyMixin, SoftDeleteMixin, TimestampMixin, Base):
    __tablename__ = "donor_reports"

    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    project_id: Mapped[UUID | None] = mapped_column(ForeignKey("projects.id"), index=True, nullable=True)
    survey_id: Mapped[UUID | None] = mapped_column(ForeignKey("surveys.id"), index=True, nullable=True)
    name: Mapped[str] = mapped_column(String(220), nullable=False)
    donor: Mapped[str | None] = mapped_column(String(160), nullable=True)
    report_type: Mapped[str] = mapped_column(String(80), default="indicator")
    period_start: Mapped[date | None] = mapped_column(Date, nullable=True)
    period_end: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(String(40), default="draft", index=True)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    export_formats: Mapped[list[str]] = mapped_column(JsonType, default=list)
    metrics_json: Mapped[dict[str, Any]] = mapped_column(JsonType, default=dict)
    generated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class ReportSchedule(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "report_schedules"

    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    report_id: Mapped[UUID] = mapped_column(ForeignKey("donor_reports.id"), index=True)
    frequency: Mapped[str] = mapped_column(String(20), default="weekly")
    hour: Mapped[int] = mapped_column(Integer, default=8)
    timezone: Mapped[str] = mapped_column(String(64), default="UTC")
    recipients: Mapped[list[str]] = mapped_column(JsonType, default=list)
    export_format: Mapped[str] = mapped_column(String(20), default="pdf")
    status: Mapped[str] = mapped_column(String(20), default="active", index=True)
    next_run_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    last_run_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_status: Mapped[str | None] = mapped_column(String(20), nullable=True)
    failure_log: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by_user_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True)


class OrganizationBranding(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "organization_branding"
    __table_args__ = (UniqueConstraint("organization_id"),)

    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    product_name: Mapped[str] = mapped_column(String(160), default="Atlas FieldOps")
    primary_color: Mapped[str] = mapped_column(String(20), default="#0f766e")
    logo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    custom_domain: Mapped[str | None] = mapped_column(String(240), nullable=True)


class OfflineSyncPolicy(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "offline_sync_policies"
    __table_args__ = (UniqueConstraint("organization_id"),)

    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    delta_sync_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    compression_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    max_photo_size_kb: Mapped[int] = mapped_column(Integer, default=480)
    retry_window_hours: Mapped[int] = mapped_column(Integer, default=72)
    conflict_strategy: Mapped[str] = mapped_column(String(80), default="server_review")


class DataImportJob(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "data_import_jobs"

    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    created_by_user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    dataset_type: Mapped[str] = mapped_column(String(80), index=True)
    source_name: Mapped[str] = mapped_column(String(240), nullable=False)
    source_format: Mapped[str] = mapped_column(String(40), index=True)
    status: Mapped[str] = mapped_column(String(40), default="draft", index=True)
    total_rows: Mapped[int] = mapped_column(Integer, default=0)
    valid_rows: Mapped[int] = mapped_column(Integer, default=0)
    error_rows: Mapped[int] = mapped_column(Integer, default=0)
    duplicate_rows: Mapped[int] = mapped_column(Integer, default=0)
    target_project_id: Mapped[UUID | None] = mapped_column(ForeignKey("projects.id"), index=True, nullable=True)
    target_mode: Mapped[str | None] = mapped_column(String(80), nullable=True)
    source_system: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    import_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    successful_records: Mapped[int] = mapped_column(Integer, default=0)
    failed_records: Mapped[int] = mapped_column(Integer, default=0)
    skipped_records: Mapped[int] = mapped_column(Integer, default=0)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    error_report_json: Mapped[dict[str, Any]] = mapped_column(JsonType, default=dict)
    confirmation_json: Mapped[dict[str, Any]] = mapped_column(JsonType, default=dict)
    mapping_json: Mapped[dict[str, Any]] = mapped_column(JsonType, default=dict)
    summary_json: Mapped[dict[str, Any]] = mapped_column(JsonType, default=dict)
    rollback_available: Mapped[bool] = mapped_column(Boolean, default=True)


class LegacyRecordLink(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "legacy_record_links"
    __table_args__ = (UniqueConstraint("organization_id", "source_system", "source_record_id", "target_type"),)

    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    import_job_id: Mapped[UUID | None] = mapped_column(ForeignKey("data_import_jobs.id"), index=True, nullable=True)
    source_system: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    source_record_id: Mapped[str] = mapped_column(String(180), nullable=False, index=True)
    source_project_id: Mapped[str | None] = mapped_column(String(180), nullable=True, index=True)
    source_form_id: Mapped[str | None] = mapped_column(String(180), nullable=True, index=True)
    source_submission_id: Mapped[str | None] = mapped_column(String(180), nullable=True, index=True)
    target_type: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    target_id: Mapped[str] = mapped_column(String(180), nullable=False, index=True)
    project_id: Mapped[UUID | None] = mapped_column(ForeignKey("projects.id"), index=True, nullable=True)
    metadata_json: Mapped[dict[str, Any]] = mapped_column(JsonType, default=dict)


class ImportRollbackLog(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "import_rollback_logs"

    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    import_job_id: Mapped[UUID] = mapped_column(ForeignKey("data_import_jobs.id"), index=True)
    requested_by_user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    rolled_back_records: Mapped[int] = mapped_column(Integer, default=0)
    skipped_records: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(40), default="completed", index=True)
    details_json: Mapped[dict[str, Any]] = mapped_column(JsonType, default=dict)


class SourceConnector(UUIDPrimaryKeyMixin, SoftDeleteMixin, TimestampMixin, Base):
    __tablename__ = "source_connectors"
    __table_args__ = (UniqueConstraint("organization_id", "connector_key"),)

    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    connector_key: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    label: Mapped[str] = mapped_column(String(160), nullable=False)
    status: Mapped[str] = mapped_column(String(40), default="placeholder", index=True)
    supported_formats_json: Mapped[list[str]] = mapped_column(JsonType, default=list)
    config_schema_json: Mapped[dict[str, Any]] = mapped_column(JsonType, default=dict)


class SourceConnection(UUIDPrimaryKeyMixin, SoftDeleteMixin, TimestampMixin, Base):
    __tablename__ = "source_connections"

    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    connector_id: Mapped[UUID | None] = mapped_column(ForeignKey("source_connectors.id"), index=True, nullable=True)
    connector_key: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    status: Mapped[str] = mapped_column(String(40), default="not_connected", index=True)
    last_tested_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    metadata_json: Mapped[dict[str, Any]] = mapped_column(JsonType, default=dict)


class DataImportIssue(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "data_import_issues"

    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    import_job_id: Mapped[UUID] = mapped_column(ForeignKey("data_import_jobs.id"), index=True)
    row_number: Mapped[int] = mapped_column(Integer, nullable=False)
    field_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    issue_type: Mapped[str] = mapped_column(String(80), index=True)
    severity: Mapped[str] = mapped_column(String(40), default="error", index=True)
    message: Mapped[str] = mapped_column(String(400), nullable=False)
    suggested_fix: Mapped[str | None] = mapped_column(String(400), nullable=True)


class DataImportRow(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "data_import_rows"
    __table_args__ = (UniqueConstraint("import_job_id", "row_number"),)

    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    import_job_id: Mapped[UUID] = mapped_column(ForeignKey("data_import_jobs.id"), index=True)
    row_number: Mapped[int] = mapped_column(Integer, nullable=False)
    row_data_json: Mapped[dict[str, Any]] = mapped_column(JsonType, default=dict)
    edited_data_json: Mapped[dict[str, Any]] = mapped_column(JsonType, default=dict)
    validation_status: Mapped[str] = mapped_column(String(40), default="valid", index=True)
    issue_count: Mapped[int] = mapped_column(Integer, default=0)
    version: Mapped[int] = mapped_column(Integer, default=1)


class DataMappingTemplate(UUIDPrimaryKeyMixin, SoftDeleteMixin, TimestampMixin, Base):
    __tablename__ = "data_mapping_templates"
    __table_args__ = (UniqueConstraint("organization_id", "name"),)

    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    name: Mapped[str] = mapped_column(String(180), nullable=False)
    dataset_type: Mapped[str] = mapped_column(String(80), index=True)
    mapping_json: Mapped[dict[str, Any]] = mapped_column(JsonType, default=dict)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)


class DataExportJob(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "data_export_jobs"

    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    requested_by_user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    dataset_type: Mapped[str] = mapped_column(String(80), index=True)
    export_format: Mapped[str] = mapped_column(String(40), index=True)
    status: Mapped[str] = mapped_column(String(40), default="queued", index=True)
    filtered_view_json: Mapped[dict[str, Any]] = mapped_column(JsonType, default=dict)
    download_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    scheduled: Mapped[bool] = mapped_column(Boolean, default=False)


class PublicCollectionLink(UUIDPrimaryKeyMixin, SoftDeleteMixin, TimestampMixin, Base):
    __tablename__ = "public_collection_links"
    __table_args__ = (UniqueConstraint("organization_id", "slug"),)

    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    form_id: Mapped[UUID] = mapped_column(ForeignKey("data_forms.id"), index=True)
    created_by_user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    slug: Mapped[str] = mapped_column(String(160), nullable=False)
    access_mode: Mapped[str] = mapped_column(String(40), default="public", index=True)
    status: Mapped[str] = mapped_column(String(40), default="active", index=True)
    title: Mapped[str] = mapped_column(String(220), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    require_authentication: Mapped[bool] = mapped_column(Boolean, default=False)
    allow_offline_web: Mapped[bool] = mapped_column(Boolean, default=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    allowed_domains: Mapped[list[str]] = mapped_column(JsonType, default=list)
    permission_json: Mapped[dict[str, Any]] = mapped_column(JsonType, default=dict)
    submission_count: Mapped[int] = mapped_column(Integer, default=0)


class MediaEvidence(UUIDPrimaryKeyMixin, SoftDeleteMixin, TimestampMixin, Base):
    __tablename__ = "media_evidence"

    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    submission_id: Mapped[UUID | None] = mapped_column(ForeignKey("submissions.id"), index=True, nullable=True)
    beneficiary_id: Mapped[UUID | None] = mapped_column(ForeignKey("beneficiaries.id"), index=True, nullable=True)
    form_id: Mapped[UUID | None] = mapped_column(ForeignKey("data_forms.id"), index=True, nullable=True)
    activity_id: Mapped[UUID | None] = mapped_column(ForeignKey("field_visit_requests.id"), index=True, nullable=True)
    uploaded_by_user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    media_type: Mapped[str] = mapped_column(String(40), index=True)
    file_name: Mapped[str] = mapped_column(String(240), nullable=False)
    storage_url: Mapped[str] = mapped_column(String(500), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(120), nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, default=0)
    review_status: Mapped[str] = mapped_column(String(40), default="pending_review", index=True)
    checksum: Mapped[str | None] = mapped_column(String(160), nullable=True)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    captured_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    metadata_json: Mapped[dict[str, Any]] = mapped_column(JsonType, default=dict)


class BulkEditBatch(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "bulk_edit_batches"

    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    edited_by_user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    dataset_type: Mapped[str] = mapped_column(String(80), index=True)
    status: Mapped[str] = mapped_column(String(40), default="draft", index=True)
    total_records: Mapped[int] = mapped_column(Integer, default=0)
    changed_records: Mapped[int] = mapped_column(Integer, default=0)
    conflict_count: Mapped[int] = mapped_column(Integer, default=0)
    change_set_json: Mapped[dict[str, Any]] = mapped_column(JsonType, default=dict)
    undo_available: Mapped[bool] = mapped_column(Boolean, default=True)
