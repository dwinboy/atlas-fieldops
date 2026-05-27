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


class MonitoringIndicator(UUIDPrimaryKeyMixin, SoftDeleteMixin, TimestampMixin, Base):
    __tablename__ = "monitoring_indicators"
    __table_args__ = (UniqueConstraint("organization_id", "code"),)

    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    project_id: Mapped[UUID | None] = mapped_column(ForeignKey("projects.id"), index=True, nullable=True)
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
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


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


class DonorReport(UUIDPrimaryKeyMixin, SoftDeleteMixin, TimestampMixin, Base):
    __tablename__ = "donor_reports"

    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    project_id: Mapped[UUID | None] = mapped_column(ForeignKey("projects.id"), index=True, nullable=True)
    name: Mapped[str] = mapped_column(String(220), nullable=False)
    donor: Mapped[str | None] = mapped_column(String(160), nullable=True)
    report_type: Mapped[str] = mapped_column(String(80), default="indicator")
    period_start: Mapped[date | None] = mapped_column(Date, nullable=True)
    period_end: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(String(40), default="draft", index=True)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    export_formats: Mapped[list[str]] = mapped_column(JsonType, default=list)


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
    mapping_json: Mapped[dict[str, Any]] = mapped_column(JsonType, default=dict)
    summary_json: Mapped[dict[str, Any]] = mapped_column(JsonType, default=dict)
    rollback_available: Mapped[bool] = mapped_column(Boolean, default=True)


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
