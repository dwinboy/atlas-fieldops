from datetime import UTC, datetime
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.option_sets import OPTION_SETS, default_items, is_known_option_set
from app.models.operations import TenantOptionItem
from app.repositories.reference import OptionItemRepository
from app.schemas.reference import (
    OptionItemCreate,
    OptionItemRead,
    OptionItemUpdate,
    OptionSetCatalogRead,
    OptionSetRead,
)


def _serialize(item: TenantOptionItem) -> OptionItemRead:
    return OptionItemRead(
        id=item.id,
        set_key=item.set_key,
        value=item.value,
        label=item.label,
        description=item.description,
        sort_order=item.sort_order,
        is_active=item.is_active,
        is_system=item.is_system,
        metadata=item.metadata_json or {},
    )


class ReferenceDataService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repository = OptionItemRepository(session)

    def _require_known(self, set_key: str) -> None:
        if not is_known_option_set(set_key):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Unknown option set: {set_key}")

    async def _ensure_seeded(self, organization_id: UUID, set_key: str) -> list[TenantOptionItem]:
        """Materialize the bundled defaults for a set the first time it is accessed."""
        existing = await self.repository.list_for_set(organization_id, set_key)
        if existing:
            return existing
        for index, (value, label) in enumerate(default_items(set_key)):
            self.repository.add(
                TenantOptionItem(
                    organization_id=organization_id,
                    set_key=set_key,
                    value=value,
                    label=label,
                    sort_order=index,
                    is_active=True,
                    is_system=True,
                    metadata_json={},
                )
            )
        await self.session.flush()
        return await self.repository.list_for_set(organization_id, set_key)

    async def get_set(self, organization_id: UUID, set_key: str) -> OptionSetRead:
        self._require_known(set_key)
        items = await self._ensure_seeded(organization_id, set_key)
        definition = OPTION_SETS[set_key]
        return OptionSetRead(
            key=definition.key,
            label=definition.label,
            description=definition.description,
            module=definition.module,
            items=[_serialize(item) for item in items],
        )

    async def get_catalog(self, organization_id: UUID) -> OptionSetCatalogRead:
        sets = [await self.get_set(organization_id, key) for key in OPTION_SETS]
        return OptionSetCatalogRead(sets=sets)

    async def create_item(self, organization_id: UUID, set_key: str, payload: OptionItemCreate) -> OptionItemRead:
        self._require_known(set_key)
        items = await self._ensure_seeded(organization_id, set_key)
        if any(item.value.strip().lower() == payload.value.strip().lower() for item in items):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An option with this value already exists.")
        next_order = max((item.sort_order for item in items), default=-1) + 1
        item = self.repository.add(
            TenantOptionItem(
                organization_id=organization_id,
                set_key=set_key,
                value=payload.value.strip(),
                label=(payload.label or payload.value).strip(),
                description=payload.description,
                sort_order=next_order,
                is_active=True,
                is_system=False,
                metadata_json=payload.metadata or {},
            )
        )
        await self.session.flush()
        return _serialize(item)

    async def update_item(self, organization_id: UUID, set_key: str, item_id: UUID, payload: OptionItemUpdate) -> OptionItemRead:
        self._require_known(set_key)
        item = await self.repository.get(organization_id, item_id)
        if item is None or item.set_key != set_key:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Option not found")
        if payload.label is not None:
            item.label = payload.label
        if payload.description is not None:
            item.description = payload.description
        if payload.is_active is not None:
            item.is_active = payload.is_active
        if payload.sort_order is not None:
            item.sort_order = payload.sort_order
        if payload.metadata is not None:
            item.metadata_json = payload.metadata
        await self.session.flush()
        return _serialize(item)

    async def delete_item(self, organization_id: UUID, set_key: str, item_id: UUID) -> None:
        self._require_known(set_key)
        item = await self.repository.get(organization_id, item_id)
        if item is None or item.set_key != set_key:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Option not found")
        if item.is_system:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Built-in options cannot be deleted — deactivate it instead so the set can still be reset.",
            )
        item.deleted_at = datetime.now(UTC)
        await self.session.flush()

    async def reorder(self, organization_id: UUID, set_key: str, item_ids: list[UUID]) -> OptionSetRead:
        self._require_known(set_key)
        items = await self._ensure_seeded(organization_id, set_key)
        order = {item_id: index for index, item_id in enumerate(item_ids)}
        for item in items:
            if item.id in order:
                item.sort_order = order[item.id]
        await self.session.flush()
        return await self.get_set(organization_id, set_key)

    async def reset(self, organization_id: UUID, set_key: str) -> OptionSetRead:
        """Restore a set to its bundled defaults: drop custom items, re-activate and
        re-order the system items to match the seed order."""
        self._require_known(set_key)
        items = await self._ensure_seeded(organization_id, set_key)
        seed_order = {value: index for index, (value, _label) in enumerate(default_items(set_key))}
        for item in items:
            if item.is_system:
                item.is_active = True
                item.sort_order = seed_order.get(item.value, item.sort_order)
            else:
                item.deleted_at = datetime.now(UTC)
        await self.session.flush()
        return await self.get_set(organization_id, set_key)
