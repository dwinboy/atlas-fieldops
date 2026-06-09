from typing import Literal
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class OrganizationCreate(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    slug: str = Field(min_length=2, max_length=120, pattern=r"^[a-z0-9-]+$")
    owner_email: EmailStr | None = None
    owner_full_name: str | None = Field(default=None, min_length=2, max_length=200)
    owner_password: str | None = Field(default=None, min_length=12)


class OrganizationRead(BaseModel):
    id: UUID
    name: str
    slug: str
    is_active: bool
    owner_email: EmailStr | None = None
    temporary_password: str | None = None

    model_config = {"from_attributes": True}


class PlatformOrganizationRead(BaseModel):
    id: UUID
    name: str
    slug: str
    is_active: bool
    user_count: int = 0
    owner_email: EmailStr | None = None

    model_config = {"from_attributes": True}


class OrganizationStatusUpdate(BaseModel):
    is_active: bool
    reason: str | None = Field(default=None, min_length=3, max_length=1000)


class SupportSessionCreate(BaseModel):
    reason: str | None = Field(default=None, min_length=3, max_length=1000)


class OrganizationContextRead(BaseModel):
    organization_id: UUID
    name: str
    slug: str
    roles: list[str]
    logo_url: str | None = None


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=12)
    full_name: str = Field(min_length=2, max_length=200)
    role_name: str = Field(default="field_officer", min_length=2, max_length=100)
    scope_type: Literal["global", "organization", "country", "region", "district", "field_team", "project", "own"] | None = None
    geography_ids: list[str] = Field(default_factory=list)
    project_ids: list[str] = Field(default_factory=list)


class UserRoleAssignmentRead(BaseModel):
    id: UUID
    role_id: UUID
    role_name: str
    role_label: str
    scope_type: str
    geography_id: str | None = None
    project_id: str | None = None
    organization_unit_id: UUID | None = None
    team_id: UUID | None = None
    assigned_by_user_id: UUID | None = None
    starts_at: datetime | None = None
    expires_at: datetime | None = None
    is_active: bool = True
    reason: str | None = None


class UserRoleAssignmentCreate(BaseModel):
    role_name: str = Field(min_length=2, max_length=100)
    scope_type: Literal["global", "organization", "country", "region", "district", "field_team", "project", "own"] | None = None
    geography_id: str | None = Field(default=None, max_length=120)
    project_id: str | None = Field(default=None, max_length=36)
    organization_unit_id: UUID | None = None
    team_id: UUID | None = None
    reason: str | None = Field(default=None, max_length=500)


class UserRoleAssignmentUpdate(BaseModel):
    role_name: str | None = Field(default=None, min_length=2, max_length=100)
    scope_type: Literal["global", "organization", "country", "region", "district", "field_team", "project", "own"] | None = None
    geography_id: str | None = Field(default=None, max_length=120)
    project_id: str | None = Field(default=None, max_length=36)
    organization_unit_id: UUID | None = None
    team_id: UUID | None = None
    is_active: bool | None = None
    reason: str | None = Field(default=None, max_length=500)


class UserRead(BaseModel):
    id: UUID
    email: EmailStr
    full_name: str
    is_active: bool
    role_name: str | None = None
    scope_type: str | None = None
    geography_id: str | None = None
    project_id: str | None = None
    organization_unit_id: UUID | None = None
    login_slug: str | None = None
    temporary_password: str | None = None
    role_assignments: list[UserRoleAssignmentRead] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class UserImportIssue(BaseModel):
    row_number: int
    email: str | None = None
    message: str


class UserImportResponse(BaseModel):
    created_count: int
    skipped_count: int
    error_count: int
    users: list[UserRead] = Field(default_factory=list)
    issues: list[UserImportIssue] = Field(default_factory=list)


class UserUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=200)
    role_name: str | None = Field(default=None, min_length=2, max_length=100)
    scope_type: Literal["global", "organization", "country", "region", "district", "field_team", "project", "own"] | None = None
    geography_id: str | None = Field(default=None, max_length=120)
    project_id: str | None = Field(default=None, max_length=36)
    organization_unit_id: UUID | None = None
    is_active: bool | None = None


class PasswordResetRead(BaseModel):
    user_id: UUID
    temporary_password: str


class RoleCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    label: str = Field(default="", max_length=160)
    description: str = Field(default="", max_length=500)
    scope_type: Literal["global", "organization", "country", "region", "district", "field_team", "project", "own"] = "organization"
    permissions: list[str] = Field(default_factory=list)


class RoleRead(BaseModel):
    id: UUID
    organization_id: UUID
    name: str
    label: str = ""
    description: str = ""
    scope_type: str = "organization"
    is_system: bool = False
    permissions: list[str]


class PermissionCatalogItem(BaseModel):
    key: str
    label: str
    group: str


class RoleCatalogItem(BaseModel):
    name: str
    label: str
    description: str
    scope_type: str
    architecture_group: str = "Custom"
    common_usage: str = ""
    permissions: list[str]
    workflow_actions: list[str]
    menu_views: list[str]


class AccessCatalogRead(BaseModel):
    roles: list[RoleCatalogItem]
    permissions: list[PermissionCatalogItem]
    scope_types: list[str]
    workflow_actions: list[str]


class OrganizationUnitRead(BaseModel):
    id: UUID
    organization_id: UUID
    parent_unit_id: UUID | None
    name: str
    code: str
    unit_type: str
    region: str | None

    model_config = {"from_attributes": True}
