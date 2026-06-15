from uuid import uuid4

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.models.base import Base
from app.models.identity import Organization, User
from app.models.operations import DonorReport
from app.schemas.operations import ReportScheduleCreate
from app.services.operations import OperationsService


@pytest.mark.asyncio
async def test_report_schedule_create_run_pause_and_delete() -> None:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        organization_id = uuid4()
        actor_user_id = uuid4()
        report_id = uuid4()
        session.add_all(
            [
                Organization(id=organization_id, name="Sched Org", slug="sched-org"),
                User(id=actor_user_id, email="manager@example.org", full_name="Manager", password_hash="x"),
                DonorReport(
                    id=report_id,
                    organization_id=organization_id,
                    name="Quarterly Donor Report",
                    report_type="indicator",
                    status="draft",
                ),
            ]
        )
        await session.commit()

        service = OperationsService(session)
        schedule = await service.create_report_schedule(
            organization_id,
            actor_user_id,
            ReportScheduleCreate(report_id=report_id, frequency="weekly", hour=9, recipients=["donor@example.org"]),
        )
        assert schedule.status == "active"
        assert schedule.report_name == "Quarterly Donor Report"
        assert schedule.recipients == ["donor@example.org"]
        assert schedule.next_run_at is not None

        listed = await service.list_report_schedules(organization_id)
        assert len(listed) == 1

        # Running the delivery now generates the linked report and stamps the run.
        ran = await service.run_report_schedule_now(organization_id, actor_user_id, schedule.id)
        assert ran.last_status == "delivered"
        assert ran.last_run_at is not None

        report = (await session.execute(select(DonorReport).where(DonorReport.id == report_id))).scalar_one()
        assert report.status == "ready"
        assert report.generated_at is not None

        paused = await service.set_report_schedule_status(organization_id, schedule.id, "paused")
        assert paused.status == "paused"

        await service.delete_report_schedule(organization_id, schedule.id)
        assert await service.list_report_schedules(organization_id) == []
    await engine.dispose()


@pytest.mark.asyncio
async def test_report_schedule_rejects_unknown_report() -> None:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        organization_id = uuid4()
        session.add(Organization(id=organization_id, name="Org", slug="org"))
        await session.commit()

        service = OperationsService(session)
        with pytest.raises(ValueError):
            await service.create_report_schedule(
                organization_id,
                uuid4(),
                ReportScheduleCreate(report_id=uuid4(), frequency="daily", hour=8),
            )
    await engine.dispose()
