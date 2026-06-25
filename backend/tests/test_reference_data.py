from uuid import uuid4

import pytest
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.models import Base, Organization
from app.schemas.reference import OptionItemCreate, OptionItemUpdate
from app.services.reference import ReferenceDataService


async def _session():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    return factory


@pytest.mark.asyncio
async def test_option_set_seeds_defaults_then_supports_owner_edits() -> None:
    factory = await _session()
    async with factory() as session:
        org_id = uuid4()
        session.add(Organization(id=org_id, name="Ref Org", slug="ref-org"))
        await session.flush()
        service = ReferenceDataService(session)

        # First read seeds the bundled defaults (and they are all system + active).
        project_types = await service.get_set(org_id, "project.type")
        assert len(project_types.items) >= 20
        assert all(item.is_system for item in project_types.items)
        assert "Agriculture" in {item.value for item in project_types.items}

        # Owner adds a custom option...
        created = await service.create_item(org_id, "project.type", OptionItemCreate(value="Fisheries"))
        assert created.value == "Fisheries" and created.is_system is False
        # ...duplicate value is rejected...
        with pytest.raises(HTTPException) as dup:
            await service.create_item(org_id, "project.type", OptionItemCreate(value="fisheries"))
        assert dup.value.status_code == 409

        # ...and deactivates a built-in (which cannot be hard-deleted).
        ag = next(i for i in project_types.items if i.value == "Agriculture")
        await service.update_item(org_id, "project.type", ag.id, OptionItemUpdate(is_active=False))
        with pytest.raises(HTTPException) as del_system:
            await service.delete_item(org_id, "project.type", ag.id)
        assert del_system.value.status_code == 400

        # Reset restores defaults: built-ins re-activated, custom items dropped.
        after_reset = await service.reset(org_id, "project.type")
        values = {item.value for item in after_reset.items}
        assert "Fisheries" not in values
        assert all(item.is_active for item in after_reset.items if item.value == "Agriculture")


@pytest.mark.asyncio
async def test_unknown_option_set_is_rejected() -> None:
    factory = await _session()
    async with factory() as session:
        org_id = uuid4()
        session.add(Organization(id=org_id, name="Ref Org", slug="ref-org-2"))
        await session.flush()
        with pytest.raises(HTTPException) as exc:
            await ReferenceDataService(session).get_set(org_id, "not.a.real.set")
        assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_catalog_covers_every_registered_set() -> None:
    from app.core.option_sets import OPTION_SETS

    factory = await _session()
    async with factory() as session:
        org_id = uuid4()
        session.add(Organization(id=org_id, name="Ref Org", slug="ref-org-3"))
        await session.flush()
        catalog = await ReferenceDataService(session).get_catalog(org_id)
        assert {s.key for s in catalog.sets} == set(OPTION_SETS)
