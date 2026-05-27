from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class OrganizationCreate(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    slug: str = Field(min_length=2, max_length=120, pattern=r"^[a-z0-9-]+$")


class OrganizationRead(BaseModel):
    id: UUID
    name: str
    slug: str
    is_active: bool

    model_config = {"from_attributes": True}


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=12)
    full_name: str = Field(min_length=2, max_length=200)
    role_name: str = Field(default="collector", min_length=2, max_length=100)


class UserRead(BaseModel):
    id: UUID
    email: EmailStr
    full_name: str
    is_active: bool

    model_config = {"from_attributes": True}


class RoleCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    permissions: list[str] = Field(default_factory=list)


class RoleRead(BaseModel):
    id: UUID
    organization_id: UUID
    name: str
    permissions: list[str]

