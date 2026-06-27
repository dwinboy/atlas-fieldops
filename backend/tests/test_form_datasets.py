from datetime import UTC, datetime
from uuid import uuid4

import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.models import Base, Organization, User
from app.models.collection import DataForm, DataFormVersion, Submission
from app.schemas.mobile import MobileFormVersionRead
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


@pytest.mark.asyncio
async def test_linked_records_index_exposes_other_form_submissions() -> None:
    factory = await _session()
    async with factory() as session:
        org_id = uuid4()
        user_id = uuid4()
        farm_form_id = uuid4()
        farm_version_id = uuid4()
        session.add(Organization(id=org_id, name="LR Org", slug="lr-org"))
        session.add(User(id=user_id, email="o@lr.org", full_name="O", password_hash="x"))
        session.add(
            DataForm(id=farm_form_id, organization_id=org_id, created_by_user_id=user_id, name="Farm", slug="farm", controls_json={})
        )
        session.add(
            DataFormVersion(id=farm_version_id, organization_id=org_id, form_id=farm_form_id, version=1, schema_json={})
        )
        now = datetime.now(UTC)
        session.add(
            Submission(
                id=uuid4(),
                organization_id=org_id,
                form_id=farm_form_id,
                form_version_id=farm_version_id,
                client_submission_id="farm-001",
                status="submitted",
                payload_json={"_mobile_responses": [{"variableName": "farm_name", "value": "Green Acres"}, {"variableName": "region", "value": "Ashanti"}]},
                device_id="dev-1",
                captured_at=now,
                submitted_at=now,
                sync_received_at=now,
                latitude=0.0,
                longitude=0.0,
                location_captured_at=now,
            )
        )
        await session.flush()

        # A visit form references the Farm form's records.
        version_reads = [
            MobileFormVersionRead(
                id=str(uuid4()),
                form_id=str(uuid4()),
                version=1,
                sections=[
                    {
                        "id": "s1",
                        "questions": [
                            {"id": "q1", "selection": {"source": "record", "recordSource": "form", "recordFormId": str(farm_form_id)}}
                        ],
                    }
                ],
            )
        ]
        records = await MobileService(session)._linked_records(org_id, version_reads)
        assert len(records) == 1
        assert records[0].id == "farm-001"
        assert records[0].form_id == str(farm_form_id)
        assert records[0].label == "Green Acres"
        assert records[0].data["region"] == "Ashanti"
