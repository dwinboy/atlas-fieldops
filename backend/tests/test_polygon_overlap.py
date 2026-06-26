from datetime import UTC, datetime
from uuid import uuid4

import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.models.base import Base
from app.models.collection import DataForm, DataFormVersion, FieldOfficerProfile, Project, Survey
from app.models.identity import Organization, User
from app.schemas.auth import CurrentPrincipal
from app.schemas.mobile import MobileSubmissionUpload
from app.services.collection import SubmissionService
from app.services.geometry import find_overlaps, overlap_ratio, polygon_from_geojson
from app.services.mobile import MobileService

SQUARE_A = {
    "type": "Polygon",
    "coordinates": [[[0.0, 0.0], [0.0, 1.0], [1.0, 1.0], [1.0, 0.0], [0.0, 0.0]]],
    "properties": {"capturedAt": "2026-06-10T12:00:00.000Z", "vertexCount": 4},
}

SQUARE_B_OVERLAPPING = {
    "type": "Polygon",
    "coordinates": [[[0.5, 0.5], [0.5, 1.5], [1.5, 1.5], [1.5, 0.5], [0.5, 0.5]]],
    "properties": {"capturedAt": "2026-06-10T12:05:00.000Z", "vertexCount": 4},
}

SQUARE_C_DISJOINT = {
    "type": "Polygon",
    "coordinates": [[[2.0, 2.0], [2.0, 3.0], [3.0, 3.0], [3.0, 2.0], [2.0, 2.0]]],
    "properties": {"capturedAt": "2026-06-10T12:10:00.000Z", "vertexCount": 4},
}


def test_polygon_from_geojson_parses_valid_polygon() -> None:
    geometry = polygon_from_geojson(SQUARE_A)
    assert geometry is not None
    assert geometry.area == pytest.approx(1.0)


def test_polygon_from_geojson_rejects_non_polygon() -> None:
    assert polygon_from_geojson({"type": "Point", "coordinates": [0, 0]}) is None
    assert polygon_from_geojson({"type": "Polygon"}) is None
    assert polygon_from_geojson(None) is None
    assert polygon_from_geojson("not-a-polygon") is None


def test_overlap_ratio_for_overlapping_and_disjoint_squares() -> None:
    square_a = polygon_from_geojson(SQUARE_A)
    square_b = polygon_from_geojson(SQUARE_B_OVERLAPPING)
    square_c = polygon_from_geojson(SQUARE_C_DISJOINT)
    assert square_a is not None and square_b is not None and square_c is not None

    assert overlap_ratio(square_a, square_b) == pytest.approx(0.25)
    assert overlap_ratio(square_a, square_c) == 0.0


def test_find_overlaps_returns_only_intersecting_candidates() -> None:
    square_a = polygon_from_geojson(SQUARE_A)
    square_b = polygon_from_geojson(SQUARE_B_OVERLAPPING)
    square_c = polygon_from_geojson(SQUARE_C_DISJOINT)
    assert square_a is not None and square_b is not None and square_c is not None

    overlapping_id = uuid4()
    disjoint_id = uuid4()
    overlaps = find_overlaps(square_a, [(overlapping_id, square_b), (disjoint_id, square_c)])

    assert len(overlaps) == 1
    assert overlaps[0]["submissionId"] == str(overlapping_id)
    assert overlaps[0]["overlapRatio"] == pytest.approx(0.25)


def _principal_for(organization_id: object, user_id: object) -> CurrentPrincipal:
    return CurrentPrincipal(
        user_id=str(user_id),
        organization_id=str(organization_id),
        email="officer@example.org",
        full_name="Officer",
        organization_slug="spatial-org",
        organization_name="Spatial Org",
        roles=["field_officer"],
        permissions=["submission.create", "sync.mobile"],
        scope_type="own",
    )


async def _seed_boundary_form(session, *, overlap_check: bool = True, overlap_scope: str = "form") -> dict:
    """Create an org/project/survey/form with a single polygon question and return the ids."""
    ids = {key: uuid4() for key in (
        "organization_id", "manager_user_id", "officer_one_user_id", "officer_two_user_id",
        "project_id", "survey_id", "form_id", "version_id", "officer_one_id", "officer_two_id",
    )}
    now = datetime.now(UTC)
    polygon_field: dict = {"id": "q_boundary", "variable_name": "boundary", "type": "polygon", "label": "Farm boundary", "required": True}
    polygon_field["polygon"] = {"overlapCheck": overlap_check, "overlapScope": overlap_scope}
    session.add_all(
        [
            Organization(id=ids["organization_id"], name="Spatial Org", slug="spatial-org"),
            User(id=ids["manager_user_id"], email="manager2@example.org", full_name="Manager", password_hash="x"),
            User(id=ids["officer_one_user_id"], email="officer-a@example.org", full_name="Officer A", password_hash="x"),
            User(id=ids["officer_two_user_id"], email="officer-b@example.org", full_name="Officer B", password_hash="x"),
            FieldOfficerProfile(id=ids["officer_one_id"], organization_id=ids["organization_id"], user_id=ids["officer_one_user_id"], is_active=True),
            FieldOfficerProfile(id=ids["officer_two_id"], organization_id=ids["organization_id"], user_id=ids["officer_two_user_id"], is_active=True),
            Project(id=ids["project_id"], organization_id=ids["organization_id"], name="Spatial Project", slug="spatial-project", status="active"),
            Survey(
                id=ids["survey_id"], organization_id=ids["organization_id"], project_id=ids["project_id"],
                created_by_user_id=ids["manager_user_id"], owner_user_id=ids["manager_user_id"],
                title="Farm Boundary Mapping", code="SPT-MAP", survey_type="registration", status="active",
            ),
            DataForm(
                id=ids["form_id"], organization_id=ids["organization_id"], project_id=ids["project_id"], survey_id=ids["survey_id"],
                created_by_user_id=ids["manager_user_id"], name="Farm Boundary Survey", slug="farm-boundary-survey",
                status="published", current_version=1,
            ),
            DataFormVersion(
                id=ids["version_id"], organization_id=ids["organization_id"], form_id=ids["form_id"], version=1,
                schema_json={"sections": [{"id": "boundary", "title": "Boundary", "fields": [polygon_field]}]},
                offline_compatible=True, published_at=now,
            ),
        ]
    )
    await session.commit()
    ids["now"] = now
    return ids


def _boundary_upload(ids: dict, *, local_id: str, value: dict, entity_id: object | None = None) -> MobileSubmissionUpload:
    now = ids["now"]
    return MobileSubmissionUpload(
        local_id=local_id,
        project_id=str(ids["project_id"]),
        form_id=str(ids["form_id"]),
        form_version_id=str(ids["version_id"]),
        entity_id=str(entity_id) if entity_id else None,
        responses=[{"questionId": "q_boundary", "variableName": "boundary", "value": value, "updatedAt": now}],
        location={"latitude": 0.5, "longitude": 0.5, "accuracy": 8, "timestamp": now},
        device_id="android-test",
        app_version="1.0.0-test",
        created_at=now,
        submitted_at=now,
    )


async def _in_memory_session():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    return async_sessionmaker(engine, expire_on_commit=False)


async def test_overlap_check_disabled_skips_flagging() -> None:
    session_factory = await _in_memory_session()
    async with session_factory() as session:
        ids = await _seed_boundary_form(session, overlap_check=False)
        await MobileService(session).upload_submission(
            principal=_principal_for(ids["organization_id"], ids["officer_one_user_id"]),
            payload=_boundary_upload(ids, local_id="draft-001", value=SQUARE_A),
        )
        await MobileService(session).upload_submission(
            principal=_principal_for(ids["organization_id"], ids["officer_two_user_id"]),
            payload=_boundary_upload(ids, local_id="draft-002", value=SQUARE_B_OVERLAPPING),
        )
        await session.commit()

        submissions = await SubmissionService(session).list_submissions(
            organization_id=ids["organization_id"], status=None,
            actor_user_id=ids["manager_user_id"], scope_type="organization",
        )
        # Overlap checking is off for the field, so even overlapping boundaries are not flagged.
        assert all(submission.spatial_flags is None for submission in submissions)


async def test_same_entity_followup_is_not_flagged() -> None:
    session_factory = await _in_memory_session()
    async with session_factory() as session:
        ids = await _seed_boundary_form(session, overlap_check=True)
        shared_entity_id = uuid4()
        await MobileService(session).upload_submission(
            principal=_principal_for(ids["organization_id"], ids["officer_one_user_id"]),
            payload=_boundary_upload(ids, local_id="draft-001", value=SQUARE_A, entity_id=shared_entity_id),
        )
        await MobileService(session).upload_submission(
            principal=_principal_for(ids["organization_id"], ids["officer_one_user_id"]),
            payload=_boundary_upload(ids, local_id="draft-002", value=SQUARE_B_OVERLAPPING, entity_id=shared_entity_id),
        )
        await session.commit()

        submissions = await SubmissionService(session).list_submissions(
            organization_id=ids["organization_id"], status=None,
            actor_user_id=ids["manager_user_id"], scope_type="organization",
        )
        # A follow-up survey re-mapping the same entity's boundary must not flag itself.
        assert all(submission.spatial_flags is None for submission in submissions)


async def test_upload_submission_flags_overlapping_polygon_submissions() -> None:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        organization_id = uuid4()
        manager_user_id = uuid4()
        officer_one_user_id = uuid4()
        officer_two_user_id = uuid4()
        project_id = uuid4()
        survey_id = uuid4()
        form_id = uuid4()
        version_id = uuid4()
        officer_one_id = uuid4()
        officer_two_id = uuid4()
        now = datetime.now(UTC)
        session.add_all(
            [
                Organization(id=organization_id, name="Spatial Org", slug="spatial-org"),
                User(id=manager_user_id, email="manager@example.org", full_name="Manager", password_hash="x"),
                User(id=officer_one_user_id, email="officer-one@example.org", full_name="Officer One", password_hash="x"),
                User(id=officer_two_user_id, email="officer-two@example.org", full_name="Officer Two", password_hash="x"),
                FieldOfficerProfile(id=officer_one_id, organization_id=organization_id, user_id=officer_one_user_id, is_active=True),
                FieldOfficerProfile(id=officer_two_id, organization_id=organization_id, user_id=officer_two_user_id, is_active=True),
                Project(id=project_id, organization_id=organization_id, name="Spatial Project", slug="spatial-project", status="active"),
                Survey(
                    id=survey_id,
                    organization_id=organization_id,
                    project_id=project_id,
                    created_by_user_id=manager_user_id,
                    owner_user_id=manager_user_id,
                    title="Farm Boundary Mapping",
                    code="SPT-MAP",
                    survey_type="registration",
                    status="active",
                ),
                DataForm(
                    id=form_id,
                    organization_id=organization_id,
                    project_id=project_id,
                    survey_id=survey_id,
                    created_by_user_id=manager_user_id,
                    name="Farm Boundary Survey",
                    slug="farm-boundary-survey",
                    status="published",
                    current_version=1,
                ),
                DataFormVersion(
                    id=version_id,
                    organization_id=organization_id,
                    form_id=form_id,
                    version=1,
                    schema_json={
                        "sections": [
                            {
                                "id": "boundary",
                                "title": "Boundary",
                                "fields": [
                                    {"id": "q_boundary", "variable_name": "boundary", "type": "polygon", "label": "Farm boundary", "required": True},
                                ],
                            }
                        ]
                    },
                    offline_compatible=True,
                    published_at=now,
                ),
            ]
        )
        await session.commit()

        def principal_for(user_id: object) -> CurrentPrincipal:
            return CurrentPrincipal(
                user_id=str(user_id),
                organization_id=str(organization_id),
                email="officer@example.org",
                full_name="Officer",
                organization_slug="spatial-org",
                organization_name="Spatial Org",
                roles=["field_officer"],
                permissions=["submission.create", "sync.mobile"],
                scope_type="own",
            )

        first = await MobileService(session).upload_submission(
            principal=principal_for(officer_one_user_id),
            payload=MobileSubmissionUpload(
                local_id="mobile-draft-boundary-001",
                project_id=str(project_id),
                form_id=str(form_id),
                form_version_id=str(version_id),
                responses=[
                    {"questionId": "q_boundary", "variableName": "boundary", "value": SQUARE_A, "updatedAt": now},
                ],
                location={"latitude": 0.5, "longitude": 0.5, "accuracy": 8, "timestamp": now},
                device_id="android-test-1",
                app_version="1.0.0-test",
                created_at=now,
                submitted_at=now,
            ),
        )
        assert first.status == "synced"

        second = await MobileService(session).upload_submission(
            principal=principal_for(officer_two_user_id),
            payload=MobileSubmissionUpload(
                local_id="mobile-draft-boundary-002",
                project_id=str(project_id),
                form_id=str(form_id),
                form_version_id=str(version_id),
                responses=[
                    {"questionId": "q_boundary", "variableName": "boundary", "value": SQUARE_B_OVERLAPPING, "updatedAt": now},
                ],
                location={"latitude": 1.0, "longitude": 1.0, "accuracy": 8, "timestamp": now},
                device_id="android-test-2",
                app_version="1.0.0-test",
                created_at=now,
                submitted_at=now,
            ),
        )
        assert second.status == "synced"
        await session.commit()

        submissions = await SubmissionService(session).list_submissions(
            organization_id=organization_id,
            status=None,
            actor_user_id=manager_user_id,
            scope_type="organization",
        )
        by_server_id = {str(submission.id): submission for submission in submissions}
        first_submission = by_server_id[first.server_submission_id]
        second_submission = by_server_id[second.server_submission_id]

        first_flags = first_submission.spatial_flags
        second_flags = second_submission.spatial_flags
        assert first_flags is not None
        assert second_flags is not None
        assert first_flags["status"] == "pending_review"
        assert second_flags["status"] == "pending_review"

        second_overlaps = second_flags["polygonOverlaps"][0]["overlaps"]
        assert second_overlaps[0]["submissionId"] == first.server_submission_id
        assert second_overlaps[0]["overlapRatio"] == pytest.approx(0.25)

        first_overlaps = first_flags["polygonOverlaps"][0]["overlaps"]
        assert first_overlaps[0]["submissionId"] == second.server_submission_id
        assert first_overlaps[0]["overlapRatio"] == pytest.approx(0.25)

        issues = await SubmissionService(session).list_polygon_overlap_flags(
            organization_id=organization_id,
            form_id=form_id,
        )
        assert len(issues) == 2
        flagged_submission_ids = {issue.submission_id for issue in issues}
        assert flagged_submission_ids == {first.server_submission_id, second.server_submission_id}
        for issue in issues:
            assert issue.issue_type == "Polygon boundary overlap"
            assert issue.severity == "High"
            assert issue.validation_state == "Failed"
