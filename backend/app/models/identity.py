from datetime import datetime
from typing import Any
from uuid import UUID

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, SoftDeleteMixin, TimestampMixin, UUIDPrimaryKeyMixin

JsonType = JSON().with_variant(JSONB, "postgresql")


class Organization(UUIDPrimaryKeyMixin, SoftDeleteMixin, TimestampMixin, Base):
    __tablename__ = "organizations"

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    slug: Mapped[str] = mapped_column(String(120), unique=True, nullable=False, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class User(UUIDPrimaryKeyMixin, SoftDeleteMixin, TimestampMixin, Base):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(320), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(200), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_imported: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    source_system: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    source_record_id: Mapped[str | None] = mapped_column(String(180), nullable=True, index=True)
    import_batch_id: Mapped[UUID | None] = mapped_column(ForeignKey("data_import_jobs.id"), index=True, nullable=True)
    imported_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    imported_by_user_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"), index=True, nullable=True)


class Role(UUIDPrimaryKeyMixin, SoftDeleteMixin, TimestampMixin, Base):
    __tablename__ = "roles"
    __table_args__ = (UniqueConstraint("organization_id", "name"),)

    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    label: Mapped[str] = mapped_column(String(160), default="")
    description: Mapped[str] = mapped_column(String(500), default="")
    scope_type: Mapped[str] = mapped_column(String(40), default="organization")
    is_system: Mapped[bool] = mapped_column(Boolean, default=False)
    permissions: Mapped[str] = mapped_column(String(2000), default="")


class Membership(UUIDPrimaryKeyMixin, SoftDeleteMixin, TimestampMixin, Base):
    __tablename__ = "memberships"
    __table_args__ = (UniqueConstraint("organization_id", "user_id"),)

    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    role_id: Mapped[UUID] = mapped_column(ForeignKey("roles.id"), index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    organization: Mapped[Organization] = relationship()
    user: Mapped[User] = relationship()
    role: Mapped[Role] = relationship()


class UserAccessGrant(UUIDPrimaryKeyMixin, SoftDeleteMixin, TimestampMixin, Base):
    __tablename__ = "user_access_grants"

    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    scope_type: Mapped[str] = mapped_column(String(40), nullable=False)
    geography_id: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    project_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    organization_unit_id: Mapped[UUID | None] = mapped_column(ForeignKey("organizational_units.id"), nullable=True, index=True)


class UserRoleAssignment(UUIDPrimaryKeyMixin, SoftDeleteMixin, TimestampMixin, Base):
    __tablename__ = "user_role_assignments"

    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    role_id: Mapped[UUID] = mapped_column(ForeignKey("roles.id"), index=True)
    scope_type: Mapped[str] = mapped_column(String(40), nullable=False)
    geography_id: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    project_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    organization_unit_id: Mapped[UUID | None] = mapped_column(ForeignKey("organizational_units.id"), nullable=True, index=True)
    team_id: Mapped[UUID | None] = mapped_column(ForeignKey("organizational_units.id"), nullable=True, index=True)
    assigned_by_user_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    starts_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    reason: Mapped[str | None] = mapped_column(String(500), nullable=True)

    role: Mapped[Role] = relationship()


class UserOperationalProfile(UUIDPrimaryKeyMixin, SoftDeleteMixin, TimestampMixin, Base):
    __tablename__ = "user_operational_profiles"
    __table_args__ = (UniqueConstraint("organization_id", "user_id", "profile_type"),)

    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    profile_type: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    display_name: Mapped[str] = mapped_column(String(160), default="")
    status: Mapped[str] = mapped_column(String(40), default="active", index=True)
    supervisor_user_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    primary_project_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    primary_geography_id: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    primary_team_id: Mapped[UUID | None] = mapped_column(ForeignKey("organizational_units.id"), nullable=True, index=True)
    responsibilities_json: Mapped[list[str]] = mapped_column(JsonType, default=list)
    metrics_json: Mapped[dict[str, Any]] = mapped_column(JsonType, default=dict)
    metadata_json: Mapped[dict[str, Any]] = mapped_column(JsonType, default=dict)
    last_activity_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped[User] = relationship(foreign_keys=[user_id])
    supervisor: Mapped[User | None] = relationship(foreign_keys=[supervisor_user_id])


class WorkflowPermission(UUIDPrimaryKeyMixin, SoftDeleteMixin, TimestampMixin, Base):
    __tablename__ = "workflow_permissions"

    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"), index=True)
    role_id: Mapped[UUID] = mapped_column(ForeignKey("roles.id"), index=True)
    workflow_type: Mapped[str] = mapped_column(String(80), nullable=False)
    action: Mapped[str] = mapped_column(String(80), nullable=False)
    required_scope_type: Mapped[str] = mapped_column(String(40), default="organization")
    conditions_json: Mapped[str] = mapped_column(Text, default="{}")
