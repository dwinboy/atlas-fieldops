from uuid import uuid4

import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.models import Base, Organization, User
from app.models.collection import DataForm
from app.services.collection import FormService
from app.services.mobile import MobileService


async def _session():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    return async_sessionmaker(engine, expire_on_commit=False)


@pytest.mark.asyncio
async def test_form_dataset_upload_creates_cascading_reference_list() -> None:
    factory = await _session()
    async with factory() as session:
        org_id = uuid4()
        user_id = uuid4()
        form_id = uuid4()
        session.add(Organization(id=org_id, name="DS Org", slug="ds-org"))
        session.add(User(id=user_id, email="o@ds.org", full_name="O", password_hash="x"))
        session.add(
            DataForm(
                id=form_id,
                organization_id=org_id,
                created_by_user_id=user_id,
                name="Farm Visit",
                slug="farm-visit",
                controls_json={},
            )
        )
        await session.flush()

        csv = b"district,region,code\nKumasi,Ashanti,KMA\nTema,Greater Accra,TMA\n"
        result = await FormService(session).upload_form_dataset(
            organization_id=org_id,
            form_id=form_id,
            actor_user_id=user_id,
            filename="districts.csv",
            content=csv,
            value_column="code",
            display_column="district",
            parent_column="region",
        )
        await session.flush()

        assert result["columns"] == ["district", "region", "code"]
        assert result["row_count"] == 2
        assert result["value_column"] == "code"

        # The dataset syncs to mobile as a reference list carrying parentCode + the full row in `data`.
        lists = await MobileService(session)._reference_lists(org_id)
        dataset = next(item for item in lists if item.slug == result["slug"])
        values = dataset.values
        assert len(values) == 2
        kumasi = next(value for value in values if value["code"] == "KMA")
        assert kumasi["label"] == "Kumasi"
        assert kumasi["parentCode"] == "Ashanti"
        assert kumasi["data"]["region"] == "Ashanti"

        # Listing returns the dataset for the builder's dataset picker.
        datasets = await FormService(session).list_form_datasets(organization_id=org_id, form_id=form_id)
        assert datasets and datasets[0]["columns"] == ["district", "region", "code"]
