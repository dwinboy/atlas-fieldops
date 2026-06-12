from datetime import UTC, datetime
from uuid import UUID, uuid4

import pytest
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.permissions import Permission, permissions_for_roles
from app.models.base import Base
from app.models.collection import DataForm, DataFormVersion, Project, Submission, Survey
from app.models.collection import FieldOfficerProfile
from app.models.identity import Organization, User
from app.repositories.collection import FormRepository
from app.schemas.auth import CurrentPrincipal
from app.models.operations import Beneficiary, DataQualitySignal, MonitoringIndicator
from app.schemas.collection import (
    DataFormCreate,
    DeviceMetadata,
    EntityFrequencyValidationRequest,
    FormDataImportConfirmRequest,
    FormDataImportRequest,
    FormControlsSettings,
    LocationCapture,
    SubmissionCreate,
    SubmissionResponsesUpdate,
    SubmissionReviewAction,
    SurveyCreate,
    SurveyGovernanceSettings,
)
from app.models.audit import AuditLog
from app.schemas.collection import (
    FieldWorkAssignmentCreate,
    FieldWorkAssignmentStatusUpdate,
    FieldWorkAssignmentUpdate,
)
from app.schemas.mobile import MobileSubmissionUpload
from app.services.collection import (
    CollectionConflictError,
    FieldOfficerService,
    InvalidWorkflowTransitionError,
    SubmissionService,
    form_schema_compatibility,
    form_schema_to_xlsform,
)
from app.schemas.operations import (
    FieldWorkPlanCreate,
    FieldWorkPlanUpdate,
    IndicatorUpdate,
    OperationalTargetCreate,
    OperationalTargetUpdate,
)
from app.services.form_engine import FormEngine
from app.services.mobile import MobileService
from app.services.operations import FieldPlanningService, OperationsService


def test_enterprise_roles_have_collection_permissions() -> None:
    admin_permissions = permissions_for_roles(["organization_admin"])
    officer_permissions = permissions_for_roles(["field_officer"])

    assert Permission.FORM_MANAGE in admin_permissions
    assert Permission.OFFICER_MANAGE in admin_permissions
    assert Permission.SUBMISSION_REVIEW in admin_permissions
    assert Permission.SYNC_MOBILE in officer_permissions
    assert Permission.SUBMISSION_REVIEW not in officer_permissions


def test_form_schema_accepts_offline_supported_field_types() -> None:
    project_id = uuid4()
    survey_id = uuid4()
    payload = DataFormCreate.model_validate(
        {
            "project_id": project_id,
            "survey_id": survey_id,
            "name": "Farmer onboarding",
            "slug": "farmer-onboarding",
            "publish": True,
            "schema": {
                "sections": [
                    {
                        "id": "identity",
                        "title": "Identity",
                        "fields": [
                            {"id": "name", "type": "text", "label": "Name", "required": True},
                            {"id": "farm_gps", "type": "gps", "label": "Farm GPS", "required": True},
                            {"id": "signature", "type": "signature", "label": "Signature"},
                            {"id": "website", "type": "url", "label": "Website"},
                            {"id": "service_rating", "type": "rating", "label": "Service rating"},
                            {"id": "risk_matrix", "type": "matrix_single", "label": "Risk matrix"},
                            {"id": "zone", "type": "geofence", "label": "Approved zone", "validation": {"accuracyMax": 20}},
                        ],
                    }
                ],
            },
        }
    )

    assert payload.form_schema.sections[0].fields[1].type == "gps"
    assert payload.form_schema.sections[0].fields[-1].type == "geofence"
    assert payload.project_id == project_id
    assert payload.survey_id == survey_id
    assert payload.publish is True


def test_form_schema_rejects_unsupported_field_types() -> None:
    with pytest.raises(ValidationError, match="Unsupported field type"):
        DataFormCreate.model_validate(
            {
                "project_id": uuid4(),
                "survey_id": uuid4(),
                "name": "Bad form",
                "slug": "bad-form",
                "schema": {
                    "sections": [
                        {
                            "id": "main",
                            "title": "Main",
                            "fields": [{"id": "custom", "type": "unsafe_plugin", "label": "Custom"}],
                        }
                    ]
                },
            }
        )


def test_submission_requires_server_enforced_gps_and_device_metadata() -> None:
    now = datetime.now(UTC)
    project_id = uuid4()
    survey_id = uuid4()
    submission = SubmissionCreate(
        client_submission_id="device-001-0001",
        project_id=project_id,
        survey_id=survey_id,
        form_id=uuid4(),
        form_version=1,
        payload={"farmer_name": "Amina"},
        captured_at=now,
        submitted_at=now,
        offline_created=True,
        device={"device_id": "android-7781", "platform": "android"},
        location={"latitude": 5.9631, "longitude": 10.1591, "accuracy": 8.4, "timestamp": now},
    )

    assert submission.device.device_id == "android-7781"
    assert submission.project_id == project_id
    assert submission.survey_id == survey_id
    assert submission.location.latitude == 5.9631


@pytest.mark.asyncio
async def test_custom_entity_type_generates_readable_code_prefix() -> None:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        service = SubmissionService(session)
        water_prefix, _, _, _ = await service._beneficiary_uid_format_parts(
            organization_id=uuid4(),
            entity_type="Water Point",
            project_id=None,
        )
        case_prefix, _, _, _ = await service._beneficiary_uid_format_parts(
            organization_id=uuid4(),
            entity_type="GBV Case",
            project_id=None,
        )

    assert water_prefix == "WAT"
    assert case_prefix == "GBV"


def test_survey_payload_enforces_project_context_and_supported_types() -> None:
    project_id = uuid4()
    payload = SurveyCreate(
        project_id=project_id,
        title="Baseline Survey",
        code="BASELINE-2026",
        survey_type="baseline",
        target_population="Smallholder farmers",
    )

    assert payload.project_id == project_id
    assert payload.survey_type == "baseline"

    with pytest.raises(ValidationError, match="custom_type_label"):
        SurveyCreate(project_id=project_id, title="Special Survey", code="SPECIAL", survey_type="custom")


def test_survey_governance_defaults_control_visibility_review_and_uploads() -> None:
    governance = SurveyGovernanceSettings()

    assert "survey_manager" in governance.data_visibility_roles
    assert "data_quality_officer" in governance.review_roles
    assert "data_quality_officer" in governance.approval_roles
    assert "enumerator" not in governance.approval_roles
    assert "survey_manager" in governance.upload_roles
    assert governance.synced_submission_default_status == "submitted"
    assert governance.uploaded_submission_default_status == "under_review"
    assert governance.review_required is True
    assert governance.lock_after_approval is True


def test_form_controls_defaults_cover_reference_permissions_workflow_quality_and_audit() -> None:
    controls = FormControlsSettings()

    assert controls.governance.require_gps_capture is True
    assert controls.governance.approval_workflow == "standard"
    assert controls.audit.immutable is True
    assert controls.versioning.editing_published_creates_draft is True
    assert controls.workflow_stages[0].name == "Submitted"
    assert any(rule.subject_name == "M&E Manager" and "manage_form_controls" in rule.permissions for rule in controls.permission_rules)
    assert any(rule.severity == "critical" and rule.blocking for rule in controls.data_quality_rules)


def test_form_controls_reject_unsupported_permissions() -> None:
    with pytest.raises(ValidationError, match="Unsupported permissions"):
        FormControlsSettings(
            permission_rules=[
                {
                    "subject_name": "Unsafe reviewer",
                    "permissions": ["view_form", "delete_platform"],
                }
            ],
        )


@pytest.mark.asyncio
async def test_editing_published_form_keeps_active_version_until_publish() -> None:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        organization_id = uuid4()
        actor_user_id = uuid4()
        project_id = uuid4()
        survey_id = uuid4()
        session.add_all(
            [
                Organization(id=organization_id, name="Version Org", slug="version-org"),
                User(id=actor_user_id, email="manager-version@example.org", full_name="Manager", password_hash="x"),
                Project(id=project_id, organization_id=organization_id, name="Version Project", slug="version-project", status="active"),
                Survey(
                    id=survey_id,
                    organization_id=organization_id,
                    project_id=project_id,
                    created_by_user_id=actor_user_id,
                    owner_user_id=actor_user_id,
                    title="Version Survey",
                    code="VERSION",
                    survey_type="monitoring",
                    status="active",
                ),
            ]
        )
        await session.flush()

        forms = FormRepository(session)
        form, published_version = await forms.create(
            organization_id=organization_id,
            project_id=project_id,
            survey_id=survey_id,
            created_by_user_id=actor_user_id,
            name="Published form",
            slug="published-form",
            description="Live version",
            schema_json={"sections": [{"id": "main", "title": "Main", "fields": [{"id": "q1", "type": "text", "label": "Name"}]}]},
            publish=True,
        )
        assert form.status == "published"
        assert form.current_version == 1
        assert published_version.published_at is not None

        form, draft_version = await forms.save_schema_revision(
            form=form,
            actor_user_id=actor_user_id,
            name="Published form draft",
            description="Draft edit",
            schema_json={"sections": [{"id": "main", "title": "Main", "fields": [{"id": "q2", "type": "number", "label": "Age"}]}]},
            publish=False,
        )
        assert form.status == "published"
        assert form.current_version == 1
        assert draft_version.version == 2
        assert draft_version.published_at is None
        assert (await forms.get_current_version(organization_id=organization_id, form_id=form.id)).id == published_version.id

        form, promoted_version = await forms.save_schema_revision(
            form=form,
            actor_user_id=actor_user_id,
            name="Published form v2",
            description="Published edit",
            schema_json={"sections": [{"id": "main", "title": "Main", "fields": [{"id": "q2", "type": "number", "label": "Age"}]}]},
            publish=True,
        )
        assert form.status == "published"
        assert form.current_version == 2
        assert promoted_version.id == draft_version.id
        assert promoted_version.published_at is not None
        assert (await forms.get_current_version(organization_id=organization_id, form_id=form.id)).id == draft_version.id


def test_submission_review_actions_are_limited_to_workflow_events() -> None:
    assert SubmissionReviewAction(action="request_correction", comment="Photo is missing").action == "request_correction"

    with pytest.raises(ValidationError):
        SubmissionReviewAction(action="delete", comment="Nope")


def test_form_engine_validates_schema_and_submission_payloads() -> None:
    schema = DataFormCreate.model_validate(
        {
            "project_id": uuid4(),
            "survey_id": uuid4(),
            "name": "Inspection",
            "slug": "inspection",
            "schema": {
                "sections": [
                    {
                        "id": "main",
                        "title": "Main",
                        "fields": [
                            {"id": "score", "type": "number", "label": "Score", "required": True, "validation": {"min": 0, "max": 10}},
                            {"id": "site", "type": "gps", "label": "Site", "required": True, "validation": {"accuracyMax": 20}},
                        ],
                    }
                ]
            },
        }
    ).form_schema

    engine = FormEngine()

    assert engine.validate_schema(schema) == []
    issues = engine.validate_submission(schema, {"score": 14, "site": {"accuracy": 35}})

    assert {issue.field_id for issue in issues} == {"score", "site"}


def test_form_engine_evaluates_xlsform_style_relevance_subset() -> None:
    engine = FormEngine()

    assert engine.evaluate_relevance("${visit_type} = 'field_visit'", {"visit_type": "field_visit"})
    assert not engine.evaluate_relevance("${visit_type} = 'field_visit'", {"visit_type": "phone"})
    assert engine.evaluate_relevance("${consent} != 'no'", {"consent": "yes"})


def test_form_schema_exports_xlsform_and_collection_compatibility() -> None:
    form_id = uuid4()
    schema = DataFormCreate.model_validate(
        {
            "project_id": uuid4(),
            "survey_id": uuid4(),
            "name": "Farm monitoring",
            "slug": "farm-monitoring",
            "schema": {
                "sections": [
                    {
                        "id": "main",
                        "title": "Main",
                        "fields": [
                            {
                                "id": "crop_status",
                                "type": "select",
                                "label": "Crop status",
                                "required": True,
                                "options": [{"label": "Healthy", "value": "healthy"}, {"label": "Needs support", "value": "needs_support"}],
                            },
                            {"id": "site", "type": "gps", "label": "Site", "required": True, "validation": {"accuracyMax": 20}},
                            {"id": "proof", "type": "photo", "label": "Proof photo"},
                        ],
                    }
                ]
            },
        }
    ).form_schema

    workbook = form_schema_to_xlsform(form_id=form_id, form_name="Farm monitoring", version=1, schema=schema)
    compatibility = form_schema_compatibility(form_id=form_id, version=1, schema=schema)

    assert workbook.settings.form_title == "Farm monitoring"
    assert "select_one crop_status" in {row.type for row in workbook.survey}
    assert {choice.name for choice in workbook.choices} == {"healthy", "needs_support"}
    assert compatibility.xlsform_ready is True
    assert compatibility.has_gps is True
    assert compatibility.media_field_count == 1


@pytest.mark.asyncio
async def test_confirmed_imported_form_row_creates_linked_beneficiary() -> None:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        organization_id = uuid4()
        actor_user_id = uuid4()
        project_id = uuid4()
        survey_id = uuid4()
        form_id = uuid4()
        version_id = uuid4()
        session.add_all(
            [
                Organization(id=organization_id, name="Test Org", slug="test-org"),
                User(id=actor_user_id, email="manager@example.org", full_name="Manager", password_hash="x"),
                Project(id=project_id, organization_id=organization_id, name="Farmer Project", slug="farmer-project", status="active"),
                Survey(
                    id=survey_id,
                    organization_id=organization_id,
                    project_id=project_id,
                    created_by_user_id=actor_user_id,
                    owner_user_id=actor_user_id,
                    title="Registration",
                    code="REG-1",
                    survey_type="registration",
                    status="active",
                ),
                DataForm(
                    id=form_id,
                    organization_id=organization_id,
                    project_id=project_id,
                    survey_id=survey_id,
                    created_by_user_id=actor_user_id,
                    name="Farmer Registration",
                    slug="farmer-registration",
                    status="published",
                    current_version=1,
                    controls_json={
                        "entity_controls": {
                            "linked_to_entity": True,
                            "entity_type": "Farmer",
                            "creates_new_entity": True,
                            "updates_existing_entity": False,
                            "requires_existing_entity": False,
                        }
                    },
                ),
                DataFormVersion(
                    id=version_id,
                    organization_id=organization_id,
                    form_id=form_id,
                    version=1,
                    schema_json={
                        "sections": [
                            {
                                "id": "identity",
                                "title": "Identity",
                                "fields": [
                                    {"id": "farmer_name", "variable_name": "farmer_name", "type": "text", "label": "Farmer Name", "required": True},
                                    {"id": "phone", "variable_name": "phone", "type": "phone", "label": "Phone"},
                                    {"id": "village", "variable_name": "village", "type": "text", "label": "Village"},
                                ],
                            }
                        ]
                    },
                    offline_compatible=True,
                    published_at=datetime.now(UTC),
                ),
            ]
        )
        await session.commit()

        service = SubmissionService(session)
        imported = await service.import_form_rows(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            form_id=form_id,
            payload=FormDataImportRequest(
                rows=[{"farmer_name": "Amina Farmer", "phone": "677000001", "village": "Bamenda"}],
                source_name="farmers.csv",
                source_system="Form spreadsheet upload",
                import_reason="Test upload",
            ),
        )
        assert imported.imported_rows == 1
        submission_id = imported.submissions[0].id

        confirmed = await service.confirm_imported_form_rows(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            form_id=form_id,
            payload=FormDataImportConfirmRequest(submission_ids=[submission_id], comment="Cleaned"),
        )
        await session.commit()

        beneficiary = (await session.execute(select(Beneficiary))).scalar_one()
        assert confirmed.confirmed_rows == 1
        assert beneficiary.beneficiary_uid.startswith("FRM-")
        assert beneficiary.display_name == "Amina Farmer"
        assert beneficiary.project_id == project_id
        assert beneficiary.profile_json["sourceSubmissionId"] == str(submission_id)


@pytest.mark.asyncio
async def test_mobile_synced_submission_is_visible_and_creates_beneficiary_after_approval() -> None:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        organization_id = uuid4()
        field_user_id = uuid4()
        manager_user_id = uuid4()
        project_id = uuid4()
        survey_id = uuid4()
        form_id = uuid4()
        version_id = uuid4()
        officer_id = uuid4()
        now = datetime.now(UTC)
        session.add_all(
            [
                Organization(id=organization_id, name="Mobile Org", slug="mobile-org"),
                User(id=field_user_id, email="field@example.org", full_name="Field Officer", password_hash="x"),
                User(id=manager_user_id, email="manager@example.org", full_name="Manager", password_hash="x"),
                FieldOfficerProfile(id=officer_id, organization_id=organization_id, user_id=field_user_id, is_active=True),
                Project(id=project_id, organization_id=organization_id, name="Mobile Project", slug="mobile-project", status="active"),
                Survey(
                    id=survey_id,
                    organization_id=organization_id,
                    project_id=project_id,
                    created_by_user_id=manager_user_id,
                    owner_user_id=manager_user_id,
                    title="Mobile Registration",
                    code="MOB-REG",
                    survey_type="registration",
                    status="active",
                ),
                DataForm(
                    id=form_id,
                    organization_id=organization_id,
                    project_id=project_id,
                    survey_id=survey_id,
                    created_by_user_id=manager_user_id,
                    name="Mobile Farmer Registration",
                    slug="mobile-farmer-registration",
                    status="published",
                    current_version=1,
                    controls_json={
                        "entity_controls": {
                            "linked_to_entity": True,
                            "entity_type": "Farmer",
                            "creates_new_entity": True,
                            "requires_existing_entity": False,
                        }
                    },
                ),
                DataFormVersion(
                    id=version_id,
                    organization_id=organization_id,
                    form_id=form_id,
                    version=1,
                    schema_json={
                        "sections": [
                            {
                                "id": "identity",
                                "title": "Identity",
                                "fields": [
                                    {"id": "q_name", "variable_name": "farmer_name", "type": "text", "label": "Farmer Name", "required": True},
                                    {"id": "q_phone", "variable_name": "phone", "type": "phone", "label": "Phone"},
                                    {"id": "q_village", "variable_name": "village", "type": "text", "label": "Village"},
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

        principal = CurrentPrincipal(
            user_id=str(field_user_id),
            organization_id=str(organization_id),
            email="field@example.org",
            full_name="Field Officer",
            organization_slug="mobile-org",
            organization_name="Mobile Org",
            roles=["field_officer"],
            permissions=["submission.create", "sync.mobile"],
            scope_type="own",
        )
        uploaded = await MobileService(session).upload_submission(
            principal=principal,
            payload=MobileSubmissionUpload(
                local_id="mobile-draft-001",
                project_id=str(project_id),
                form_id=str(form_id),
                form_version_id=str(version_id),
                entity_type="Farmer",
                responses=[
                    {"questionId": "q_name", "variableName": "farmer_name", "value": "Mobile Farmer", "updatedAt": now},
                    {"questionId": "q_phone", "variableName": "phone", "value": "677000002", "updatedAt": now},
                    {"questionId": "q_village", "variableName": "village", "value": "Bafut", "updatedAt": now},
                ],
                location={"latitude": 5.9, "longitude": 10.1, "accuracy": 8, "timestamp": now},
                device_id="android-test",
                app_version="1.0.0-test",
                created_at=now,
                submitted_at=now,
            ),
        )
        assert uploaded.status == "synced"

        submissions = await SubmissionService(session).list_submissions(
            organization_id=organization_id,
            status=None,
            actor_user_id=field_user_id,
            scope_type="own",
        )
        assert len(submissions) == 1
        submission = submissions[0]
        assert submission.payload_json["farmer_name"] == "Mobile Farmer"
        assert submission.payload_json["_mobile_responses"][0]["questionId"] == "q_name"
        assert submission.offline_created is True
        assert submission.field_officer_id == officer_id

        await SubmissionService(session).review_submission(
            organization_id=organization_id,
            actor_user_id=manager_user_id,
            submission_id=submission.id,
            payload=SubmissionReviewAction(action="approve", comment="Approved mobile record"),
        )
        await session.commit()

        beneficiary = (await session.execute(select(Beneficiary))).scalar_one()
        assert beneficiary.beneficiary_uid.startswith("FRM-")
        assert beneficiary.display_name == "Mobile Farmer"
        assert beneficiary.project_id == project_id


async def _seed_dedup_environment(controls_json: dict[str, object]) -> dict[str, object]:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    session = session_factory()

    organization_id = uuid4()
    field_user_id = uuid4()
    manager_user_id = uuid4()
    project_id = uuid4()
    survey_id = uuid4()
    form_id = uuid4()
    version_id = uuid4()
    officer_id = uuid4()
    now = datetime.now(UTC)
    suffix = organization_id.hex[:10]
    session.add_all(
        [
            Organization(id=organization_id, name="Dedup Org", slug=f"dedup-org-{suffix}"),
            User(id=field_user_id, email=f"field-{suffix}@example.org", full_name="Field Officer", password_hash="x"),
            User(id=manager_user_id, email=f"manager-{suffix}@example.org", full_name="Manager", password_hash="x"),
            FieldOfficerProfile(id=officer_id, organization_id=organization_id, user_id=field_user_id, is_active=True),
            Project(id=project_id, organization_id=organization_id, name="Dedup Project", slug=f"dedup-project-{suffix}", status="active"),
            Survey(
                id=survey_id,
                organization_id=organization_id,
                project_id=project_id,
                created_by_user_id=manager_user_id,
                owner_user_id=manager_user_id,
                title="Dedup Registration",
                code=f"DEDUP-{suffix}",
                survey_type="registration",
                status="active",
            ),
            DataForm(
                id=form_id,
                organization_id=organization_id,
                project_id=project_id,
                survey_id=survey_id,
                created_by_user_id=manager_user_id,
                name="Dedup Farmer Registration",
                slug=f"dedup-farmer-registration-{suffix}",
                status="published",
                current_version=1,
                controls_json=controls_json,
            ),
            DataFormVersion(
                id=version_id,
                organization_id=organization_id,
                form_id=form_id,
                version=1,
                schema_json={
                    "sections": [
                        {
                            "id": "identity",
                            "title": "Identity",
                            "fields": [
                                {"id": "q_name", "variable_name": "farmer_name", "type": "text", "label": "Farmer Name", "required": True},
                                {"id": "q_phone", "variable_name": "phone", "type": "phone", "label": "Phone"},
                                {"id": "q_village", "variable_name": "village", "type": "text", "label": "Village"},
                                {"id": "q_district", "variable_name": "district", "type": "text", "label": "District"},
                                {"id": "household_members", "variable_name": "household_members", "type": "repeat_group", "label": "Household Members"},
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
    return {
        "session": session,
        "organization_id": organization_id,
        "field_user_id": field_user_id,
        "manager_user_id": manager_user_id,
        "project_id": project_id,
        "survey_id": survey_id,
        "form_id": form_id,
        "now": now,
    }


def _dedup_submission_payload(
    env: dict[str, object],
    *,
    client_submission_id: str,
    payload: dict[str, object],
    entity_id=None,
) -> SubmissionCreate:
    now = env["now"]
    return SubmissionCreate(
        client_submission_id=client_submission_id,
        project_id=env["project_id"],
        survey_id=env["survey_id"],
        form_id=env["form_id"],
        form_version=1,
        entity_id=entity_id,
        payload=payload,
        captured_at=now,
        submitted_at=now,
        offline_created=False,
        device=DeviceMetadata(device_id="device-test-001", platform="android"),
        location=LocationCapture(latitude=5.9, longitude=10.1, accuracy=8.0, timestamp=now),
    )


@pytest.mark.asyncio
async def test_validate_entity_frequency_blocks_repeat_submission_for_entity() -> None:
    env = await _seed_dedup_environment({"entity_controls": {"submission_frequency": "once_ever"}})
    session: object = env["session"]
    async with session:
        beneficiary = Beneficiary(
            id=uuid4(),
            organization_id=env["organization_id"],
            project_id=env["project_id"],
            beneficiary_uid="FRM-FREQ1",
            beneficiary_type="Farmer",
            display_name="Existing Farmer",
        )
        session.add(beneficiary)
        await session.commit()

        service = SubmissionService(session)
        submission = await service.create_submission(
            organization_id=env["organization_id"],
            actor_user_id=env["field_user_id"],
            payload=_dedup_submission_payload(
                env, client_submission_id="freq-001", payload={"farmer_name": "Existing Farmer"}, entity_id=beneficiary.id
            ),
        )
        await session.commit()

        unlimited_check = await service.validate_entity_frequency(
            organization_id=env["organization_id"],
            payload=EntityFrequencyValidationRequest(
                form_id=env["form_id"], entity_id=beneficiary.id, project_id=env["project_id"], frequency_rule="unlimited"
            ),
        )
        assert unlimited_check.allowed is True

        blocked_check = await service.validate_entity_frequency(
            organization_id=env["organization_id"],
            payload=EntityFrequencyValidationRequest(
                form_id=env["form_id"], entity_id=beneficiary.id, project_id=env["project_id"], frequency_rule="once_ever"
            ),
        )
        assert blocked_check.allowed is False
        assert blocked_check.decision == "blocked"
        assert blocked_check.existing_submission_id == submission.id

        other_entity_check = await service.validate_entity_frequency(
            organization_id=env["organization_id"],
            payload=EntityFrequencyValidationRequest(
                form_id=env["form_id"], entity_id=uuid4(), project_id=env["project_id"], frequency_rule="once_ever"
            ),
        )
        assert other_entity_check.allowed is True


@pytest.mark.asyncio
async def test_create_submission_enforces_once_ever_frequency() -> None:
    env = await _seed_dedup_environment({"entity_controls": {"submission_frequency": "once_ever"}})
    session: object = env["session"]
    async with session:
        beneficiary = Beneficiary(
            id=uuid4(),
            organization_id=env["organization_id"],
            project_id=env["project_id"],
            beneficiary_uid="FRM-FREQ2",
            beneficiary_type="Farmer",
            display_name="Repeat Farmer",
        )
        session.add(beneficiary)
        await session.commit()

        service = SubmissionService(session)
        await service.create_submission(
            organization_id=env["organization_id"],
            actor_user_id=env["field_user_id"],
            payload=_dedup_submission_payload(
                env, client_submission_id="freq-100", payload={"farmer_name": "Repeat Farmer"}, entity_id=beneficiary.id
            ),
        )
        await session.commit()

        with pytest.raises(CollectionConflictError):
            await service.create_submission(
                organization_id=env["organization_id"],
                actor_user_id=env["field_user_id"],
                payload=_dedup_submission_payload(
                    env, client_submission_id="freq-101", payload={"farmer_name": "Repeat Farmer"}, entity_id=beneficiary.id
                ),
            )


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("duplicate_action", "expected_queue", "expected_audit_action"),
    [
        ("warn", "data_quality", "beneficiary.duplicate_flagged_warning"),
        ("review", "review", "beneficiary.duplicate_flagged_for_review"),
    ],
)
async def test_duplicate_action_creates_beneficiary_with_quality_signal(
    duplicate_action: str, expected_queue: str, expected_audit_action: str
) -> None:
    env = await _seed_dedup_environment(
        {
            "entity_controls": {
                "linked_to_entity": True,
                "entity_type": "Farmer",
                "creates_new_entity": True,
                "requires_existing_entity": False,
                "duplicate_action": duplicate_action,
                "duplicate_threshold": 40,
            }
        }
    )
    session: object = env["session"]
    async with session:
        existing_beneficiary = Beneficiary(
            id=uuid4(),
            organization_id=env["organization_id"],
            project_id=env["project_id"],
            beneficiary_uid="FRM-DUP1",
            beneficiary_type="Farmer",
            display_name="Jane Doe",
            community="Kumbo",
        )
        session.add(existing_beneficiary)
        await session.commit()

        service = SubmissionService(session)
        submission = await service.create_submission(
            organization_id=env["organization_id"],
            actor_user_id=env["field_user_id"],
            payload=_dedup_submission_payload(
                env,
                client_submission_id="dup-001",
                payload={"farmer_name": "Jane Doe", "village": "Bafut", "phone": "677000111"},
            ),
        )
        await session.commit()

        await service.review_submission(
            organization_id=env["organization_id"],
            actor_user_id=env["manager_user_id"],
            submission_id=submission.id,
            payload=SubmissionReviewAction(action="approve", comment="Approved"),
        )
        await session.commit()

        beneficiaries = (await session.execute(select(Beneficiary))).scalars().all()
        assert len(beneficiaries) == 2
        new_beneficiary = next(b for b in beneficiaries if b.id != existing_beneficiary.id)
        assert new_beneficiary.display_name == "Jane Doe"

        processing = submission.payload_json["_beneficiary_processing"]
        assert processing["action"] == "created"
        assert processing["duplicate_warning"]["duplicate_score"] == 45
        assert processing["duplicate_warning"]["duplicate_action"] == duplicate_action

        signal = (await session.execute(select(DataQualitySignal))).scalar_one()
        assert signal.signal_type == "possible_duplicate_entity"
        assert signal.evidence_json["recommended_queue"] == expected_queue


@pytest.mark.asyncio
async def test_duplicate_threshold_override_routes_low_score_match_to_reconciliation() -> None:
    env = await _seed_dedup_environment(
        {
            "entity_controls": {
                "linked_to_entity": True,
                "entity_type": "Farmer",
                "creates_new_entity": True,
                "requires_existing_entity": False,
                "duplicate_threshold": 40,
            }
        }
    )
    session: object = env["session"]
    async with session:
        existing_beneficiary = Beneficiary(
            id=uuid4(),
            organization_id=env["organization_id"],
            project_id=env["project_id"],
            beneficiary_uid="FRM-DUP2",
            beneficiary_type="Farmer",
            display_name="John Smith",
            community="Kumbo",
        )
        session.add(existing_beneficiary)
        await session.commit()

        service = SubmissionService(session)
        submission = await service.create_submission(
            organization_id=env["organization_id"],
            actor_user_id=env["field_user_id"],
            payload=_dedup_submission_payload(
                env, client_submission_id="dup-100", payload={"farmer_name": "John Smith", "village": "Bafut"}
            ),
        )
        await session.commit()

        await service.review_submission(
            organization_id=env["organization_id"],
            actor_user_id=env["manager_user_id"],
            submission_id=submission.id,
            payload=SubmissionReviewAction(action="approve", comment="Approved"),
        )
        await session.commit()

        beneficiaries = (await session.execute(select(Beneficiary))).scalars().all()
        assert len(beneficiaries) == 1

        processing = submission.payload_json["_beneficiary_processing"]
        assert processing["status"] == "reconciliation_required"
        assert processing["duplicate_score"] == 45

        signal = (await session.execute(select(DataQualitySignal))).scalar_one()
        assert signal.evidence_json["recommended_queue"] == "reconciliation"


@pytest.mark.asyncio
async def test_unique_fields_links_existing_beneficiary_via_custom_field() -> None:
    env = await _seed_dedup_environment(
        {
            "entity_controls": {
                "linked_to_entity": True,
                "entity_type": "Farmer",
                "creates_new_entity": True,
                "requires_existing_entity": False,
                "unique_fields": ["district"],
            }
        }
    )
    session: object = env["session"]
    async with session:
        existing_beneficiary = Beneficiary(
            id=uuid4(),
            organization_id=env["organization_id"],
            project_id=env["project_id"],
            beneficiary_uid="FRM-UNIQ1",
            beneficiary_type="Farmer",
            display_name="Existing Person",
            district="Mezam",
        )
        session.add(existing_beneficiary)
        await session.commit()

        service = SubmissionService(session)
        submission = await service.create_submission(
            organization_id=env["organization_id"],
            actor_user_id=env["field_user_id"],
            payload=_dedup_submission_payload(
                env, client_submission_id="uniq-001", payload={"farmer_name": "New Person", "district": "Mezam"}
            ),
        )
        await session.commit()

        await service.review_submission(
            organization_id=env["organization_id"],
            actor_user_id=env["manager_user_id"],
            submission_id=submission.id,
            payload=SubmissionReviewAction(action="approve", comment="Approved"),
        )
        await session.commit()

        beneficiaries = (await session.execute(select(Beneficiary))).scalars().all()
        assert len(beneficiaries) == 1

        processing = submission.payload_json["_beneficiary_processing"]
        assert processing["action"] == "linked"
        assert processing["beneficiary_id"] == str(existing_beneficiary.id)
        assert submission.entity_id == existing_beneficiary.id


@pytest.mark.asyncio
async def test_review_submission_archive_transition_locks_approved_submission() -> None:
    env = await _seed_dedup_environment({"entity_controls": {}})
    session: object = env["session"]
    async with session:
        service = SubmissionService(session)
        submission = await service.create_submission(
            organization_id=env["organization_id"],
            actor_user_id=env["field_user_id"],
            payload=_dedup_submission_payload(
                env, client_submission_id="archive-001", payload={"farmer_name": "Archive Person", "phone": "677000111"}
            ),
        )
        await session.commit()

        approved = await service.review_submission(
            organization_id=env["organization_id"],
            actor_user_id=env["manager_user_id"],
            submission_id=submission.id,
            payload=SubmissionReviewAction(action="approve", comment="Looks good"),
        )
        await session.commit()
        assert approved.status == "approved"
        assert approved.approved_by_user_id == env["manager_user_id"]
        assert approved.approved_at is not None
        assert approved.reviewed_by_user_id == env["manager_user_id"]
        assert approved.review_comments == "Looks good"

        archived = await service.review_submission(
            organization_id=env["organization_id"],
            actor_user_id=env["manager_user_id"],
            submission_id=submission.id,
            payload=SubmissionReviewAction(action="archive", comment="Cycle closed"),
        )
        await session.commit()
        assert archived.status == "archived"

        with pytest.raises(InvalidWorkflowTransitionError):
            await service.review_submission(
                organization_id=env["organization_id"],
                actor_user_id=env["manager_user_id"],
                submission_id=submission.id,
                payload=SubmissionReviewAction(action="approve", comment="Reopen attempt"),
            )


@pytest.mark.asyncio
async def test_update_responses_on_approved_submission_creates_correction_log_entry() -> None:
    env = await _seed_dedup_environment({"entity_controls": {}})
    session: object = env["session"]
    async with session:
        service = SubmissionService(session)
        submission = await service.create_submission(
            organization_id=env["organization_id"],
            actor_user_id=env["field_user_id"],
            payload=_dedup_submission_payload(
                env, client_submission_id="correction-001", payload={"farmer_name": "Original Name", "phone": "677000222"}
            ),
        )
        await session.commit()

        await service.review_submission(
            organization_id=env["organization_id"],
            actor_user_id=env["manager_user_id"],
            submission_id=submission.id,
            payload=SubmissionReviewAction(action="approve", comment="Approved"),
        )
        await session.commit()

        await service.update_responses(
            organization_id=env["organization_id"],
            actor_user_id=env["manager_user_id"],
            submission_id=submission.id,
            payload=SubmissionResponsesUpdate(
                responses={"farmer_name": "Corrected Name", "phone": "677000222"},
                reason="Spelling correction from supervisor visit",
            ),
        )
        await session.commit()

        corrections = await service.list_corrections(
            organization_id=env["organization_id"],
            submission_id=submission.id,
        )
        assert len(corrections) == 1
        entry = corrections[0]
        assert entry.submission_id == submission.id
        assert entry.submission_key == "correction-001"
        assert entry.corrected_field == "farmer_name"
        assert entry.old_value == "Original Name"
        assert entry.new_value == "Corrected Name"
        assert entry.reason == "Spelling correction from supervisor visit"
        assert entry.change_type == "change_request"
        assert entry.corrected_by == env["manager_user_id"]


@pytest.mark.asyncio
async def test_create_submission_with_repeat_group_persists_repeat_rows() -> None:
    env = await _seed_dedup_environment({"entity_controls": {}})
    session: object = env["session"]
    async with session:
        service = SubmissionService(session)
        submission = await service.create_submission(
            organization_id=env["organization_id"],
            actor_user_id=env["field_user_id"],
            payload=_dedup_submission_payload(
                env,
                client_submission_id="repeat-001",
                payload={
                    "farmer_name": "Household Head",
                    "household_members": [
                        {"member_name": "Member One", "age": 12},
                        {"member_name": "Member Two", "age": 34},
                    ],
                },
            ),
        )
        await session.commit()

        rows = await service.list_repeat_rows(
            organization_id=env["organization_id"],
            submission_id=submission.id,
        )
        assert [row.row_index for row in rows] == [0, 1]
        assert rows[0].field_id == "household_members"
        assert rows[0].parent_submission_key == "repeat-001"
        assert rows[0].row_json == {"member_name": "Member One", "age": 12}
        assert rows[1].row_json == {"member_name": "Member Two", "age": 34}


@pytest.mark.asyncio
async def test_field_work_assignment_lifecycle_with_audit_trail() -> None:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        organization_id = uuid4()
        actor_user_id = uuid4()
        officer_user_id = uuid4()
        project_id = uuid4()
        survey_id = uuid4()
        officer_profile_id = uuid4()
        session.add_all(
            [
                Organization(id=organization_id, name="Assignment Org", slug="assignment-org"),
                User(id=actor_user_id, email="manager-assignments@example.org", full_name="Manager", password_hash="x"),
                User(id=officer_user_id, email="officer-assignments@example.org", full_name="Officer", password_hash="x"),
                Project(id=project_id, organization_id=organization_id, name="Assignment Project", slug="assignment-project", status="active"),
                Survey(
                    id=survey_id,
                    organization_id=organization_id,
                    project_id=project_id,
                    created_by_user_id=actor_user_id,
                    owner_user_id=actor_user_id,
                    title="Assignment Survey",
                    code="ASSIGN",
                    survey_type="monitoring",
                    status="active",
                ),
                FieldOfficerProfile(
                    id=officer_profile_id,
                    organization_id=organization_id,
                    user_id=officer_user_id,
                    is_active=True,
                ),
            ]
        )
        await session.flush()

        forms = FormRepository(session)
        form, form_version = await forms.create(
            organization_id=organization_id,
            project_id=project_id,
            survey_id=survey_id,
            created_by_user_id=actor_user_id,
            name="Assignment form",
            slug="assignment-form",
            description=None,
            schema_json={"sections": [{"id": "main", "title": "Main", "fields": [{"id": "q1", "type": "text", "label": "Name"}]}]},
            publish=True,
        )

        service = FieldOfficerService(session)
        created = await service.create_work_assignment(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            payload=FieldWorkAssignmentCreate(
                project_id=project_id,
                form_id=form.id,
                name="Household registration sweep",
                officer_ids=[officer_profile_id],
                target_count=120,
                priority="High",
            ),
        )
        assert created.status == "Assigned"
        assert created.officer_ids == [officer_profile_id]

        updated = await service.update_work_assignment(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            assignment_id=created.id,
            payload=FieldWorkAssignmentUpdate(completed_count=45, location="Mezam"),
        )
        assert updated.completed_count == 45
        assert updated.status == "Assigned"

        in_progress = await service.set_work_assignment_status(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            assignment_id=created.id,
            payload=FieldWorkAssignmentStatusUpdate(status="In Progress"),
        )
        assert in_progress.status == "In Progress"

        completed = await service.set_work_assignment_status(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            assignment_id=created.id,
            payload=FieldWorkAssignmentStatusUpdate(status="Completed", reason="Target reached"),
        )
        assert completed.status == "Completed"

        with pytest.raises(ValueError):
            await service.set_work_assignment_status(
                organization_id=organization_id,
                actor_user_id=actor_user_id,
                assignment_id=created.id,
                payload=FieldWorkAssignmentStatusUpdate(status="Assigned"),
            )

        def build_submission(client_id: str, *, status: str, officer_id: UUID) -> Submission:
            now = datetime.now(UTC)
            return Submission(
                organization_id=organization_id,
                project_id=project_id,
                form_id=form.id,
                form_version_id=form_version.id,
                field_officer_id=officer_id,
                client_submission_id=client_id,
                status=status,
                payload_json={"q1": "Answer"},
                device_id="android-test",
                captured_at=now,
                submitted_at=now,
                sync_received_at=now,
                latitude=5.96,
                longitude=10.16,
                location_captured_at=now,
            )

        other_officer_profile_id = uuid4()
        session.add(
            FieldOfficerProfile(
                id=other_officer_profile_id,
                organization_id=organization_id,
                user_id=actor_user_id,
                is_active=True,
            )
        )
        session.add_all(
            [
                build_submission("sub-counted", status="approved", officer_id=officer_profile_id),
                build_submission("sub-rejected", status="rejected", officer_id=officer_profile_id),
                build_submission("sub-other-officer", status="approved", officer_id=other_officer_profile_id),
            ]
        )
        await session.flush()

        overdue = await service.create_work_assignment(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            payload=FieldWorkAssignmentCreate(
                project_id=project_id,
                name="Past deadline sweep",
                officer_ids=[officer_profile_id],
                end_date=datetime.now(UTC).date().replace(year=datetime.now(UTC).year - 1),
            ),
        )

        listed = await service.list_work_assignments(organization_id)
        listed_by_id = {item.id: item for item in listed}
        assert set(listed_by_id) == {created.id, overdue.id}
        # Live count: only non-rejected submissions by assigned officers are counted.
        assert listed_by_id[created.id].completed_count == 1
        # Past end_date with an active status is surfaced as Overdue without persisting it.
        assert listed_by_id[overdue.id].status == "Overdue"
        assert listed_by_id[created.id].status == "Completed"

        audit_result = await session.execute(
            select(AuditLog).where(
                AuditLog.organization_id == organization_id,
                AuditLog.resource_type == "field_work_assignment",
            )
        )
        actions = sorted(log.action for log in audit_result.scalars())
        assert actions == [
            "field_work_assignment.created",
            "field_work_assignment.created",
            "field_work_assignment.status_changed",
            "field_work_assignment.status_changed",
            "field_work_assignment.updated",
        ]


@pytest.mark.asyncio
async def test_work_plans_and_targets_persist_with_audit() -> None:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        organization_id = uuid4()
        actor_user_id = uuid4()
        session.add_all(
            [
                Organization(id=organization_id, name="Planning Org", slug="planning-org"),
                User(id=actor_user_id, email="planner@example.org", full_name="Planner", password_hash="x"),
            ]
        )
        await session.flush()

        service = FieldPlanningService(session)
        plan = await service.create_work_plan(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            payload=FieldWorkPlanCreate(
                name="Week 24 collection plan",
                project="Agricultural Resilience Program",
                locations=["Mezam", "Wouri"],
                assigned_teams=["Survey Team A"],
                deliverables=["120 farmer registrations"],
                view="Timeline",
            ),
        )
        assert plan.progress == 0

        updated_plan = await service.update_work_plan(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            work_plan_id=plan.id,
            payload=FieldWorkPlanUpdate(progress=40),
        )
        assert updated_plan.progress == 40
        assert [item.id for item in await service.list_work_plans(organization_id)] == [plan.id]

        target = await service.create_target(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            payload=OperationalTargetCreate(
                name="120 farmer households",
                target_type="Weekly",
                indicator="Households Registered",
                team="Survey Team A",
                target_value=120,
            ),
        )
        assert target.achieved_value == 0

        updated_target = await service.update_target(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            target_id=target.id,
            payload=OperationalTargetUpdate(achieved_value=86),
        )
        assert updated_target.achieved_value == 86
        assert [item.id for item in await service.list_targets(organization_id)] == [target.id]

        with pytest.raises(LookupError):
            await service.update_target(
                organization_id=organization_id,
                actor_user_id=actor_user_id,
                target_id=uuid4(),
                payload=OperationalTargetUpdate(achieved_value=1),
            )

        indicator = MonitoringIndicator(
            organization_id=organization_id,
            code="HH.REG",
            name="Households Registered",
            current_value=86,
            target_value=120,
        )
        session.add(indicator)
        await session.flush()

        linked = await service.create_target(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            payload=OperationalTargetCreate(
                name="Linked household target",
                target_type="Project",
                indicator_id=indicator.id,
                target_value=120,
            ),
        )
        assert linked.indicator == "Households Registered"
        assert linked.achieved_source == "indicator"
        assert linked.achieved_value == 86

        listed_targets = {item.id: item for item in await service.list_targets(organization_id)}
        assert listed_targets[linked.id].achieved_value == 86
        assert listed_targets[linked.id].achieved_source == "indicator"
        assert listed_targets[target.id].achieved_source == "manual"

        with pytest.raises(LookupError):
            await service.create_target(
                organization_id=organization_id,
                actor_user_id=actor_user_id,
                payload=OperationalTargetCreate(name="Bad link", indicator_id=uuid4()),
            )

        audit_result = await session.execute(
            select(AuditLog).where(AuditLog.organization_id == organization_id)
        )
        actions = sorted(log.action for log in audit_result.scalars())
        assert actions == [
            "field_work_plan.created",
            "field_work_plan.updated",
            "operational_target.created",
            "operational_target.created",
            "operational_target.updated",
        ]


@pytest.mark.asyncio
async def test_indicator_update_revises_values_and_audits() -> None:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        organization_id = uuid4()
        actor_user_id = uuid4()
        session.add_all(
            [
                Organization(id=organization_id, name="Indicator Org", slug="indicator-org"),
                User(id=actor_user_id, email="me-manager@example.org", full_name="ME Manager", password_hash="x"),
            ]
        )
        indicator = MonitoringIndicator(
            organization_id=organization_id,
            code="WASH.ACCESS",
            name="Households with water access",
            baseline_value=10,
            target_value=100,
            current_value=25,
        )
        session.add(indicator)
        await session.flush()

        service = OperationsService(session)
        updated = await service.update_indicator(
            organization_id,
            indicator.id,
            IndicatorUpdate(target_value=150, name="Households with safe water access"),
            actor_user_id,
        )
        assert updated.target_value == 150
        assert updated.name == "Households with safe water access"
        assert updated.code == "WASH.ACCESS"
        assert updated.baseline_value == 10

        with pytest.raises(LookupError):
            await service.update_indicator(
                organization_id, uuid4(), IndicatorUpdate(target_value=1), actor_user_id
            )

        audit_result = await session.execute(
            select(AuditLog).where(
                AuditLog.organization_id == organization_id,
                AuditLog.resource_type == "indicator",
            )
        )
        logs = list(audit_result.scalars())
        assert [log.action for log in logs] == ["indicator.updated"]
        assert "target_value" in logs[0].metadata_json
