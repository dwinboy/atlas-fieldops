from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


class GovernancePolicyCreate(BaseModel):
    name: str = Field(min_length=2, max_length=180)
    policy_type: str = Field(min_length=2, max_length=80)
    lifecycle_state: Literal["draft", "reviewed", "approved", "published", "archived"] = "draft"
    enforcement_level: Literal["informational", "warning", "blocking"] = "warning"
    rules_json: dict[str, object] = Field(default_factory=dict)


class GovernancePolicyRead(BaseModel):
    id: UUID
    name: str
    policy_type: str
    lifecycle_state: str
    version: int
    enforcement_level: str
    rules_json: dict[str, object]
    approved_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class RetentionPolicyCreate(BaseModel):
    record_type: str = Field(min_length=2, max_length=80)
    retention_years: int = Field(default=5, ge=1, le=100)
    archive_after_days: int = Field(default=365, ge=30, le=36500)
    legal_hold: bool = False
    purge_allowed: bool = False
    anonymize_on_export: bool = True


class RetentionPolicyRead(BaseModel):
    id: UUID
    record_type: str
    retention_years: int
    archive_after_days: int
    legal_hold: bool
    purge_allowed: bool
    anonymize_on_export: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class ValidationRuleCreate(BaseModel):
    rule_code: str = Field(min_length=2, max_length=100)
    name: str = Field(min_length=2, max_length=200)
    target_entity: str = Field(min_length=2, max_length=80)
    severity: Literal["low", "medium", "high", "critical"] = "medium"
    expression: str = Field(default="", max_length=2000)


class ValidationRuleRead(BaseModel):
    id: UUID
    rule_code: str
    name: str
    target_entity: str
    severity: str
    expression: str
    version: int
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class DataVersionCreate(BaseModel):
    entity_type: str = Field(min_length=2, max_length=80)
    entity_id: str = Field(min_length=1, max_length=120)
    change_type: str = Field(default="update", max_length=60)
    previous_json: dict[str, object] = Field(default_factory=dict)
    current_json: dict[str, object] = Field(default_factory=dict)
    field_changes_json: dict[str, object] = Field(default_factory=dict)


class DataVersionRead(BaseModel):
    id: UUID
    entity_type: str
    entity_id: str
    version_number: int
    change_type: str
    field_changes_json: dict[str, object]
    rollback_available: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class ConsentRecordCreate(BaseModel):
    beneficiary_id: UUID | None = None
    subject_identifier: str = Field(min_length=1, max_length=160)
    consent_type: str = Field(min_length=2, max_length=80)
    status: Literal["granted", "withdrawn", "expired", "pending"] = "granted"
    evidence_url: str | None = Field(default=None, max_length=500)


class ConsentRecordRead(BaseModel):
    id: UUID
    beneficiary_id: UUID | None
    subject_identifier: str
    consent_type: str
    status: str
    captured_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class LineageEventCreate(BaseModel):
    source_type: str = Field(min_length=2, max_length=80)
    source_id: str = Field(min_length=1, max_length=120)
    target_type: str = Field(min_length=2, max_length=80)
    target_id: str = Field(min_length=1, max_length=120)
    transformation: str = Field(min_length=2, max_length=120)
    lineage_json: dict[str, object] = Field(default_factory=dict)


class LineageEventRead(BaseModel):
    id: UUID
    source_type: str
    source_id: str
    target_type: str
    target_id: str
    transformation: str
    lineage_json: dict[str, object]
    created_at: datetime

    model_config = {"from_attributes": True}


class ExportGovernanceRequest(BaseModel):
    dataset_type: str = Field(min_length=2, max_length=80)
    export_format: str = Field(min_length=2, max_length=40)
    anonymized: bool = True
    record_count: int = Field(default=0, ge=0)
    filters_json: dict[str, object] = Field(default_factory=dict)


class ExportLogRead(BaseModel):
    id: UUID
    dataset_type: str
    export_format: str
    status: str
    anonymized: bool
    record_count: int
    risk_score: float
    created_at: datetime

    model_config = {"from_attributes": True}


class MasterDataEntryCreate(BaseModel):
    category: str = Field(min_length=2, max_length=80)
    code: str = Field(min_length=1, max_length=120)
    label: str = Field(min_length=2, max_length=220)
    status: Literal["draft", "active", "archived"] = "active"
    order_index: int = 0
    language: str = Field(default="en", min_length=2, max_length=10)
    metadata_json: dict[str, object] = Field(default_factory=dict)


class MasterDataEntryRead(BaseModel):
    id: UUID
    category: str
    code: str
    label: str
    status: str
    version: int
    order_index: int
    language: str
    created_at: datetime

    model_config = {"from_attributes": True}


class GovernanceSummary(BaseModel):
    policies: int
    validation_rules: int
    retention_policies: int
    open_quality_signals: int
    audit_events: int
    lineage_events: int
    export_events: int
    consent_records: int
    compliance_score: float
    attention_items: list[str]
