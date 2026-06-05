from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class MarketingLeadCreate(BaseModel):
    name: str = Field(min_length=1, max_length=220)
    organization: str = Field(default="", max_length=220)
    country: str = Field(default="", max_length=120)
    email: EmailStr
    phone: str = Field(default="", max_length=80)
    organization_size: str = Field(default="", max_length=80)
    interest_area: str = Field(default="", max_length=160)
    source: str = Field(default="website", max_length=120)
    message: str = Field(default="", max_length=4000)
    metadata: dict[str, object] = Field(default_factory=dict)


class MarketingLeadRead(BaseModel):
    id: UUID
    name: str
    organization: str
    country: str
    email: EmailStr
    phone: str
    organization_size: str
    interest_area: str
    source: str
    message: str
    status: str
    created_at: datetime
