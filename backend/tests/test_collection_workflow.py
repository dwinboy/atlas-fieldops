from datetime import UTC, datetime
from uuid import uuid4

import pytest
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.permissions import Permission, permissions_for_roles
from app.models.base import Base
from app.models.collection import DataForm, DataFormVersion, Project, Survey
from app.models.collection import FieldOfficerProfile
from app.models.identity import Organization, User
from app.schemas.auth import CurrentPrincipal
from app.models.operations import Beneficiary
from app.schemas.collection import (
    DataFormCreate,
    FormDataImportConfirmRequest,
    FormDataImportRequest,
    FormControlsSettings,
    SubmissionCreate,
    SubmissionReviewAction,
    SurveyCreate,
    SurveyGovernanceSettings,
)
from app.schemas.mobile import MobileSubmissionUpload
from app.services.collection import SubmissionService, form_schema_compatibility, form_schema_to_xlsform
from app.services.form_engine import FormEngine
from app.services.mobile import MobileService


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
