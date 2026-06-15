from uuid import uuid4

import pytest
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.models.base import Base
from app.models.identity import Organization, User
from app.schemas.operations import CustomDashboardCreate, CustomDashboardUpdate, DashboardWidget
from app.services.operations import OperationsService


@pytest.mark.asyncio
async def test_custom_dashboard_create_list_get_update_and_delete() -> None:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        organization_id = uuid4()
        actor_user_id = uuid4()
        session.add_all(
            [
                Organization(id=organization_id, name="Dash Org", slug="dash-org"),
                User(id=actor_user_id, email="builder@example.org", full_name="Builder", password_hash="x"),
            ]
        )
        await session.commit()

        service = OperationsService(session)
        payload = CustomDashboardCreate(
            name="Field Operations Overview",
            description="Key indicators and submission health",
            dashboard_type="Field Operations Dashboard",
            visibility="Managers",
            status="draft",
            widgets=[
                DashboardWidget(
                    id="w1",
                    type="kpi",
                    title="Submissions approved",
                    data_source="submissions",
                    metric="approved",
                    width=1,
                ),
                DashboardWidget(
                    id="w2",
                    type="bar_chart",
                    title="Indicator progress",
                    data_source="indicators",
                    width=2,
                ),
            ],
        )

        created = await service.create_dashboard(organization_id, actor_user_id, payload)
        assert created.name == "Field Operations Overview"
        assert created.status == "draft"
        assert created.created_by_user_id == actor_user_id
        assert len(created.widgets) == 2
        assert created.widgets[0].id == "w1"

        listed = await service.list_dashboards(organization_id)
        assert len(listed) == 1
        assert listed[0].id == created.id

        fetched = await service.get_dashboard(organization_id, created.id)
        assert fetched.id == created.id

        updated = await service.update_dashboard(
            organization_id,
            created.id,
            CustomDashboardUpdate(
                name="Field Operations Overview (Updated)",
                status="active",
                widgets=[
                    DashboardWidget(
                        id="w1",
                        type="kpi",
                        title="Submissions approved",
                        data_source="submissions",
                        metric="approved",
                        width=1,
                    )
                ],
            ),
        )
        assert updated.name == "Field Operations Overview (Updated)"
        assert updated.status == "active"
        assert len(updated.widgets) == 1

        await service.delete_dashboard(organization_id, created.id)
        assert await service.list_dashboards(organization_id) == []

        with pytest.raises(ValueError):
            await service.get_dashboard(organization_id, created.id)
    await engine.dispose()


def test_dashboard_widget_rejects_unsupported_type_and_data_source() -> None:
    with pytest.raises(ValidationError):
        DashboardWidget(id="w1", type="unsupported", title="Bad widget", data_source="submissions")

    with pytest.raises(ValidationError):
        DashboardWidget(id="w1", type="kpi", title="Bad widget", data_source="unsupported")


def test_custom_dashboard_create_rejects_unsupported_dashboard_type() -> None:
    with pytest.raises(ValidationError):
        CustomDashboardCreate(name="Bad Dashboard", dashboard_type="Unsupported Dashboard")
