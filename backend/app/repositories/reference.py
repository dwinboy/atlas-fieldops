from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.operations import TenantOptionItem


class OptionItemRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_for_set(self, organization_id: UUID, set_key: str) -> list[TenantOptionItem]:
        result = await self.session.execute(
            select(TenantOptionItem)
            .where(
                TenantOptionItem.organization_id == organization_id,
                TenantOptionItem.set_key == set_key,
                TenantOptionItem.deleted_at.is_(None),
            )
            .order_by(TenantOptionItem.sort_order, TenantOptionItem.label)
        )
        return list(result.scalars().all())

    async def list_for_organization(self, organization_id: UUID) -> list[TenantOptionItem]:
        result = await self.session.execute(
            select(TenantOptionItem)
            .where(
                TenantOptionItem.organization_id == organization_id,
                TenantOptionItem.deleted_at.is_(None),
            )
            .order_by(TenantOptionItem.set_key, TenantOptionItem.sort_order, TenantOptionItem.label)
        )
        return list(result.scalars().all())

    async def get(self, organization_id: UUID, item_id: UUID) -> TenantOptionItem | None:
        result = await self.session.execute(
            select(TenantOptionItem).where(
                TenantOptionItem.organization_id == organization_id,
                TenantOptionItem.id == item_id,
                TenantOptionItem.deleted_at.is_(None),
            )
        )
        return result.scalar_one_or_none()

    def add(self, item: TenantOptionItem) -> TenantOptionItem:
        self.session.add(item)
        return item
