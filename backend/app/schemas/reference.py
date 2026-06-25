from uuid import UUID

from pydantic import BaseModel, Field


class OptionItemRead(BaseModel):
    id: UUID
    set_key: str
    value: str
    label: str
    description: str = ""
    sort_order: int = 0
    is_active: bool = True
    is_system: bool = False
    metadata: dict[str, object] = Field(default_factory=dict)


class OptionSetRead(BaseModel):
    key: str
    label: str
    description: str = ""
    module: str = ""
    items: list[OptionItemRead] = Field(default_factory=list)


class OptionSetCatalogRead(BaseModel):
    sets: list[OptionSetRead] = Field(default_factory=list)


class OptionItemCreate(BaseModel):
    value: str = Field(min_length=1, max_length=120)
    label: str = Field(default="", max_length=200)
    description: str = Field(default="", max_length=500)
    metadata: dict[str, object] = Field(default_factory=dict)


class OptionItemUpdate(BaseModel):
    label: str | None = Field(default=None, max_length=200)
    description: str | None = Field(default=None, max_length=500)
    is_active: bool | None = None
    sort_order: int | None = Field(default=None, ge=0)
    metadata: dict[str, object] | None = None


class OptionItemReorder(BaseModel):
    # Item ids in the desired display order.
    item_ids: list[UUID] = Field(default_factory=list)
