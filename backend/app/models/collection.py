from datetime import UTC, date, datetime
from typing import Any
from uuid import UUID

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from app.models.base import Base, SoftDeleteMixin, TimestampMixin, UUIDPrimaryKeyMixin

JsonType = JSON().with_variant(JSONB, "postgresql")


class Project(UUIDPrimaryKeyMixin, SoftDeleteMixin, TimestampMixin, Base):
    __tablename__ = "projects"
    __table_args__ = (UniqueConstraint("organization_id", "slug"),)

    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    slug: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    program_type: Mapped[str | None] = mapped_column(String(120), nullable=True)
    category: Mapped[str | None] = mapped_column(String(120), nullable=True)
    donor: Mapped[str | None] = mapped_column(String(160), nullable=True)
    implementing_organization: Mapped[str | None] = mapped_column(String(200), nullable=True)
    country: Mapped[str | None] = mapped_column(String(120), nullable=True)
    region: Mapped[str | None] = mapped_column(String(160), nullable=True)
    district: Mapped[str | None] = mapped_column(String(160), nullable=True)
    community: Mapped[str | None] = mapped_column(String(180), nullable=True)
    owner: Mapped[str | None] = mapped_column(String(200), nullable=True)
    status: Mapped[str] = mapped_column(String(40), default="draft", index=True)
    start_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    end_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    settings_json: Mapped[dict[str, Any]] = mapped_column(JsonType, nullable=False, default=dict)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_imported: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    source_system: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    source_record_id: Mapped[str | None] = mapped_column(String(180), nullable=True, index=True)
    source_project_id: Mapped[str | None] = mapped_column(String(180), nullable=True, index=True)
    import_batch_id: Mapped[UUID | None] = mapped_column(ForeignKey("data_import_jobs.id"), index=True, nullable=True)
    imported_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    imported_by_user_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"), index=True, nullable=True)


class FieldOfficerProfile(UUIDPrimaryKeyMixin, SoftDeleteMixin, TimestampMixin, Base):
    __tablename__ = "field_officer_profiles"
    __table_args__ = (UniqueConstraint("organization_id", "user_id"),)

    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    employee_code: Mapped[str | None] = mapped_column(String(80), nullable=True)
    phone_number: Mapped[str | None] = mapped_column(String(40), nullable=True)
    home_region: Mapped[str | None] = mapped_column(String(160), nullable=True)
    supervisor_user_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"), index=True, nullable=True)
    last_sync_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    last_longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    device_id: Mapped[str | None] = mapped_column(String(160), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    user = relationship("User", foreign_keys=[user_id])
    supervisor = relationship("User", foreign_keys=[supervisor_user_id])


class OfficerAssignment(UUIDPrimaryKeyMixin, SoftDeleteMixin, TimestampMixin, Base):
    __tablename__ = "officer_assignments"
    __table_args__ = (UniqueConstraint("organization_id", "officer_id", "project_id", "form_id"),)

    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    officer_id: Mapped[UUID] = mapped_column(ForeignKey("field_officer_profiles.id"), index=True)
    project_id: Mapped[UUID] = mapped_column(ForeignKey("projects.id"), index=True)
    form_id: Mapped[UUID | None] = mapped_column(ForeignKey("data_forms.id"), index=True, nullable=True)
    region: Mapped[str | None] = mapped_column(String(160), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class FieldWorkAssignment(UUIDPrimaryKeyMixin, SoftDeleteMixin, TimestampMixin, Base):
    __tablename__ = "field_work_assignments"

    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    project_id: Mapped[UUID] = mapped_column(ForeignKey("projects.id"), index=True)
    form_id: Mapped[UUID | None] = mapped_column(ForeignKey("data_forms.id"), index=True, nullable=True)
    created_by_user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    supervisor_user_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"), index=True, nullable=True)
    name: Mapped[str] = mapped_column(String(220), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    assignment_type: Mapped[str] = mapped_column(String(80), default="Form only")
    officer_ids_json: Mapped[list[str]] = mapped_column(JsonType, nullable=False, default=list)
    assigned_entity_ids_json: Mapped[list[str]] = mapped_column(JsonType, nullable=False, default=list)
    location: Mapped[str | None] = mapped_column(String(240), nullable=True)
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    target_count: Mapped[int] = mapped_column(Integer, default=0)
    completed_count: Mapped[int] = mapped_column(Integer, default=0)
    priority: Mapped[str] = mapped_column(String(20), default="Normal", index=True)
    status: Mapped[str] = mapped_column(String(30), default="Assigned", index=True)


class Survey(UUIDPrimaryKeyMixin, SoftDeleteMixin, TimestampMixin, Base):
    __tablename__ = "surveys"
    __table_args__ = (UniqueConstraint("organization_id", "code"),)

    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    project_id: Mapped[UUID] = mapped_column(ForeignKey("projects.id"), index=True)
    created_by_user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    owner_user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    manager_user_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"), index=True, nullable=True)
    title: Mapped[str] = mapped_column(String(220), nullable=False)
    code: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    survey_type: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(40), default="draft", index=True)
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    geographic_scope: Mapped[str | None] = mapped_column(String(240), nullable=True)
    target_population: Mapped[str | None] = mapped_column(String(240), nullable=True)
    indicator_ids_json: Mapped[list[str]] = mapped_column(JsonType, nullable=False, default=list)
    governance_json: Mapped[dict[str, Any]] = mapped_column(JsonType, nullable=False, default=dict)
    custom_type_label: Mapped[str | None] = mapped_column(String(120), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class SurveyTeamMember(UUIDPrimaryKeyMixin, SoftDeleteMixin, TimestampMixin, Base):
    __tablename__ = "survey_team_members"
    __table_args__ = (UniqueConstraint("organization_id", "survey_id", "user_id", "survey_role"),)

    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    survey_id: Mapped[UUID] = mapped_column(ForeignKey("surveys.id"), index=True)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    survey_role: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class FormTemplate(UUIDPrimaryKeyMixin, SoftDeleteMixin, TimestampMixin, Base):
    __tablename__ = "form_templates"
    __table_args__ = (UniqueConstraint("slug", "version"),)

    organization_id: Mapped[UUID | None] = mapped_column(ForeignKey("organizations.id"), index=True, nullable=True)
    created_by_user_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"), index=True, nullable=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    slug: Mapped[str] = mapped_column(String(140), nullable=False)
    category: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    version: Mapped[int] = mapped_column(Integer, default=1)
    schema_json: Mapped[dict[str, Any]] = mapped_column(JsonType, nullable=False)
    tags_json: Mapped[list[str]] = mapped_column(JsonType, nullable=False, default=list)
    recommended_for_json: Mapped[list[str]] = mapped_column(JsonType, nullable=False, default=list)
    estimated_minutes: Mapped[int] = mapped_column(Integer, default=12)
    field_count: Mapped[int] = mapped_column(Integer, default=0)
    repeat_group_count: Mapped[int] = mapped_column(Integer, default=0)
    has_gps: Mapped[bool] = mapped_column(Boolean, default=True)
    has_media: Mapped[bool] = mapped_column(Boolean, default=False)
    offline_compatible: Mapped[bool] = mapped_column(Boolean, default=True)
    popularity_score: Mapped[int] = mapped_column(Integer, default=0, index=True)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class FormTemplateUsage(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "form_template_usage"

    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    template_id: Mapped[UUID | None] = mapped_column(ForeignKey("form_templates.id"), index=True, nullable=True)
    template_slug: Mapped[str] = mapped_column(String(140), nullable=False, index=True)
    actor_user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    created_form_id: Mapped[UUID | None] = mapped_column(ForeignKey("data_forms.id"), index=True, nullable=True)
    action: Mapped[str] = mapped_column(String(40), default="duplicated", index=True)
    metadata_json: Mapped[dict[str, Any]] = mapped_column(JsonType, nullable=False, default=dict)


class DataForm(UUIDPrimaryKeyMixin, SoftDeleteMixin, TimestampMixin, Base):
    __tablename__ = "data_forms"
    __table_args__ = (UniqueConstraint("organization_id", "slug"),)

    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    project_id: Mapped[UUID | None] = mapped_column(ForeignKey("projects.id"), index=True, nullable=True)
    survey_id: Mapped[UUID | None] = mapped_column(ForeignKey("surveys.id"), index=True, nullable=True)
    created_by_user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    slug: Mapped[str] = mapped_column(String(140), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(40), default="draft", index=True)
    current_version: Mapped[int] = mapped_column(Integer, default=1)
    controls_json: Mapped[dict[str, Any]] = mapped_column(JsonType, nullable=False, default=dict)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_imported: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    source_system: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    source_record_id: Mapped[str | None] = mapped_column(String(180), nullable=True, index=True)
    source_project_id: Mapped[str | None] = mapped_column(String(180), nullable=True, index=True)
    source_form_id: Mapped[str | None] = mapped_column(String(180), nullable=True, index=True)
    import_batch_id: Mapped[UUID | None] = mapped_column(ForeignKey("data_import_jobs.id"), index=True, nullable=True)
    imported_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    imported_by_user_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"), index=True, nullable=True)
    form_type: Mapped[str | None] = mapped_column(String(40), nullable=True)


class DataFormVersion(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "data_form_versions"
    __table_args__ = (UniqueConstraint("form_id", "version"),)

    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    form_id: Mapped[UUID] = mapped_column(ForeignKey("data_forms.id"), index=True)
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    schema_json: Mapped[dict[str, Any]] = mapped_column(JsonType, nullable=False)
    offline_compatible: Mapped[bool] = mapped_column(Boolean, default=True)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    published_by_user_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"), index=True, nullable=True)
    is_imported: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    source_system: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    source_record_id: Mapped[str | None] = mapped_column(String(180), nullable=True, index=True)
    source_form_id: Mapped[str | None] = mapped_column(String(180), nullable=True, index=True)
    import_batch_id: Mapped[UUID | None] = mapped_column(ForeignKey("data_import_jobs.id"), index=True, nullable=True)
    imported_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    imported_by_user_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"), index=True, nullable=True)


class Submission(UUIDPrimaryKeyMixin, SoftDeleteMixin, TimestampMixin, Base):
    __tablename__ = "submissions"
    __table_args__ = (UniqueConstraint("organization_id", "client_submission_id"),)

    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    project_id: Mapped[UUID | None] = mapped_column(ForeignKey("projects.id"), index=True, nullable=True)
    survey_id: Mapped[UUID | None] = mapped_column(ForeignKey("surveys.id"), index=True, nullable=True)
    form_id: Mapped[UUID] = mapped_column(ForeignKey("data_forms.id"), index=True)
    form_version_id: Mapped[UUID] = mapped_column(ForeignKey("data_form_versions.id"), index=True)
    entity_id: Mapped[UUID | None] = mapped_column(ForeignKey("beneficiaries.id"), index=True, nullable=True)
    entity_type: Mapped[str | None] = mapped_column(String(80), index=True, nullable=True)
    assignment_id: Mapped[UUID | None] = mapped_column(ForeignKey("officer_assignments.id"), index=True, nullable=True)
    supervisor_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"), index=True, nullable=True)
    frequency_period: Mapped[str | None] = mapped_column(String(80), index=True, nullable=True)
    event_id: Mapped[str | None] = mapped_column(String(160), index=True, nullable=True)
    field_officer_id: Mapped[UUID | None] = mapped_column(ForeignKey("field_officer_profiles.id"), index=True, nullable=True)
    client_submission_id: Mapped[str] = mapped_column(String(160), nullable=False)
    server_sequence: Mapped[int] = mapped_column(Integer, default=1)
    status: Mapped[str] = mapped_column(String(40), default="submitted", index=True)
    payload_json: Mapped[dict[str, Any]] = mapped_column(JsonType, nullable=False)
    device_id: Mapped[str] = mapped_column(String(160), nullable=False)
    captured_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    sync_received_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    offline_created: Mapped[bool] = mapped_column(Boolean, default=False)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    altitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    accuracy: Mapped[float | None] = mapped_column(Float, nullable=True)
    location_captured_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    is_imported: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    source_system: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    source_record_id: Mapped[str | None] = mapped_column(String(180), nullable=True, index=True)
    source_project_id: Mapped[str | None] = mapped_column(String(180), nullable=True, index=True)
    source_form_id: Mapped[str | None] = mapped_column(String(180), nullable=True, index=True)
    source_submission_id: Mapped[str | None] = mapped_column(String(180), nullable=True, index=True)
    import_batch_id: Mapped[UUID | None] = mapped_column(ForeignKey("data_import_jobs.id"), index=True, nullable=True)
    imported_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    imported_by_user_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"), index=True, nullable=True)
    reviewed_by_user_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"), index=True, nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    review_comments: Mapped[str | None] = mapped_column(Text, nullable=True)
    approved_by_user_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"), index=True, nullable=True)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class SubmissionEntityLink(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "submission_entity_links"
    __table_args__ = (UniqueConstraint("submission_id", "beneficiary_id", "link_type"),)

    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    project_id: Mapped[UUID | None] = mapped_column(ForeignKey("projects.id"), index=True, nullable=True)
    submission_id: Mapped[UUID] = mapped_column(ForeignKey("submissions.id"), index=True)
    beneficiary_id: Mapped[UUID] = mapped_column(ForeignKey("beneficiaries.id"), index=True)
    link_type: Mapped[str] = mapped_column(String(60), default="participant", index=True)
    source: Mapped[str] = mapped_column(String(80), default="approved_submission")
    source_field: Mapped[str | None] = mapped_column(String(160), nullable=True)


class SubmissionVersion(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "submission_versions"
    __table_args__ = (UniqueConstraint("submission_id", "version"),)

    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    submission_id: Mapped[UUID] = mapped_column(ForeignKey("submissions.id"), index=True)
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(40), nullable=False)
    payload_json: Mapped[dict[str, Any]] = mapped_column(JsonType, nullable=False)
    changed_by_user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    change_reason: Mapped[str | None] = mapped_column(Text, nullable=True)


class SubmissionStatusHistory(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "submission_status_history"

    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    submission_id: Mapped[UUID] = mapped_column(ForeignKey("submissions.id"), index=True)
    from_status: Mapped[str | None] = mapped_column(String(40), nullable=True)
    to_status: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    actor_user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)


class MobileSyncBatch(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "mobile_sync_batches"
    __table_args__ = (UniqueConstraint("organization_id", "device_id", "client_batch_id"),)

    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    field_officer_id: Mapped[UUID] = mapped_column(ForeignKey("field_officer_profiles.id"), index=True)
    device_id: Mapped[str] = mapped_column(String(160), nullable=False, index=True)
    client_batch_id: Mapped[str] = mapped_column(String(160), nullable=False)
    status: Mapped[str] = mapped_column(String(40), default="processed")
    processed_count: Mapped[int] = mapped_column(Integer, default=0)
    conflict_count: Mapped[int] = mapped_column(Integer, default=0)


class MobileNotification(UUIDPrimaryKeyMixin, SoftDeleteMixin, TimestampMixin, Base):
    __tablename__ = "mobile_notifications"

    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    title: Mapped[str] = mapped_column(String(180), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    event_type: Mapped[str] = mapped_column(String(80), index=True)
    resource_type: Mapped[str | None] = mapped_column(String(80), nullable=True, index=True)
    resource_id: Mapped[UUID | None] = mapped_column(index=True, nullable=True)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_by_server_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))


class SubmissionRepeatRow(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "submission_repeat_rows"

    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    submission_id: Mapped[UUID] = mapped_column(ForeignKey("submissions.id"), index=True)
    parent_submission_key: Mapped[str] = mapped_column(String(160), nullable=False)
    field_id: Mapped[str] = mapped_column(String(160), nullable=False)
    row_index: Mapped[int] = mapped_column(Integer, nullable=False)
    row_json: Mapped[dict[str, Any]] = mapped_column(JsonType, nullable=False)
