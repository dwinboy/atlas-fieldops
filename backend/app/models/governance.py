from datetime import datetime
from typing import Any
from uuid import UUID

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, SoftDeleteMixin, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.operations import JsonType


class GovernancePolicy(UUIDPrimaryKeyMixin, SoftDeleteMixin, TimestampMixin, Base):
    __tablename__ = "governance_policies"
    __table_args__ = (UniqueConstraint("organization_id", "policy_type", "version"),)

    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    name: Mapped[str] = mapped_column(String(180), nullable=False)
    policy_type: Mapped[str] = mapped_column(String(80), index=True)
    lifecycle_state: Mapped[str] = mapped_column(String(40), default="draft", index=True)
    version: Mapped[int] = mapped_column(Integer, default=1)
    enforcement_level: Mapped[str] = mapped_column(String(40), default="warning", index=True)
    rules_json: Mapped[dict[str, Any]] = mapped_column(JsonType, default=dict)
    approved_by_user_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class RetentionPolicy(UUIDPrimaryKeyMixin, SoftDeleteMixin, TimestampMixin, Base):
    __tablename__ = "retention_policies"
    __table_args__ = (UniqueConstraint("organization_id", "record_type"),)

    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    record_type: Mapped[str] = mapped_column(String(80), index=True)
    retention_years: Mapped[int] = mapped_column(Integer, default=5)
    archive_after_days: Mapped[int] = mapped_column(Integer, default=365)
    legal_hold: Mapped[bool] = mapped_column(Boolean, default=False)
    purge_allowed: Mapped[bool] = mapped_column(Boolean, default=False)
    anonymize_on_export: Mapped[bool] = mapped_column(Boolean, default=True)


class ValidationRule(UUIDPrimaryKeyMixin, SoftDeleteMixin, TimestampMixin, Base):
    __tablename__ = "validation_rules"
    __table_args__ = (UniqueConstraint("organization_id", "rule_code", "version"),)

    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    rule_code: Mapped[str] = mapped_column(String(100), index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    target_entity: Mapped[str] = mapped_column(String(80), index=True)
    severity: Mapped[str] = mapped_column(String(40), default="medium", index=True)
    expression: Mapped[str] = mapped_column(Text, default="")
    version: Mapped[int] = mapped_column(Integer, default=1)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class DataVersion(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "data_versions"

    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    entity_type: Mapped[str] = mapped_column(String(80), index=True)
    entity_id: Mapped[str] = mapped_column(String(120), index=True)
    version_number: Mapped[int] = mapped_column(Integer, nullable=False)
    changed_by_user_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    change_type: Mapped[str] = mapped_column(String(60), index=True)
    previous_json: Mapped[dict[str, Any]] = mapped_column(JsonType, default=dict)
    current_json: Mapped[dict[str, Any]] = mapped_column(JsonType, default=dict)
    field_changes_json: Mapped[dict[str, Any]] = mapped_column(JsonType, default=dict)
    rollback_available: Mapped[bool] = mapped_column(Boolean, default=True)


class LineageEvent(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "lineage_tracking"

    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    source_type: Mapped[str] = mapped_column(String(80), index=True)
    source_id: Mapped[str] = mapped_column(String(120), index=True)
    target_type: Mapped[str] = mapped_column(String(80), index=True)
    target_id: Mapped[str] = mapped_column(String(120), index=True)
    transformation: Mapped[str] = mapped_column(String(120), index=True)
    actor_user_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    lineage_json: Mapped[dict[str, Any]] = mapped_column(JsonType, default=dict)


class ConsentRecord(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "consent_records"

    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    beneficiary_id: Mapped[UUID | None] = mapped_column(ForeignKey("beneficiaries.id"), nullable=True, index=True)
    subject_identifier: Mapped[str] = mapped_column(String(160), index=True)
    consent_type: Mapped[str] = mapped_column(String(80), index=True)
    status: Mapped[str] = mapped_column(String(40), default="granted", index=True)
    captured_by_user_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    captured_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    evidence_url: Mapped[str | None] = mapped_column(String(500), nullable=True)


class DataAccessLog(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "data_access_logs"

    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    actor_user_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    access_type: Mapped[str] = mapped_column(String(80), index=True)
    resource_type: Mapped[str] = mapped_column(String(80), index=True)
    resource_id: Mapped[str] = mapped_column(String(120), index=True)
    purpose: Mapped[str] = mapped_column(String(180), default="operational")
    allowed: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    metadata_json: Mapped[dict[str, Any]] = mapped_column(JsonType, default=dict)


class ExportLog(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "export_logs"

    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    requested_by_user_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    dataset_type: Mapped[str] = mapped_column(String(80), index=True)
    export_format: Mapped[str] = mapped_column(String(40), index=True)
    status: Mapped[str] = mapped_column(String(40), default="queued", index=True)
    anonymized: Mapped[bool] = mapped_column(Boolean, default=True)
    record_count: Mapped[int] = mapped_column(Integer, default=0)
    risk_score: Mapped[float] = mapped_column(Float, default=0)
    filters_json: Mapped[dict[str, Any]] = mapped_column(JsonType, default=dict)


class MasterDataEntry(UUIDPrimaryKeyMixin, SoftDeleteMixin, TimestampMixin, Base):
    __tablename__ = "master_data_tables"
    __table_args__ = (UniqueConstraint("organization_id", "category", "code", "version"),)

    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    category: Mapped[str] = mapped_column(String(80), index=True)
    code: Mapped[str] = mapped_column(String(120), index=True)
    label: Mapped[str] = mapped_column(String(220), nullable=False)
    status: Mapped[str] = mapped_column(String(40), default="active", index=True)
    version: Mapped[int] = mapped_column(Integer, default=1)
    approved_by_user_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    metadata_json: Mapped[dict[str, Any]] = mapped_column(JsonType, default=dict)
