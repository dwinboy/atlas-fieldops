from datetime import UTC, datetime
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.core.permissions import Permission, permissions_for_roles
from app.schemas.collection import (
    DataFormCreate,
    FormControlsSettings,
    SubmissionCreate,
    SubmissionReviewAction,
    SurveyCreate,
    SurveyGovernanceSettings,
)
from app.services.collection import form_schema_compatibility, form_schema_to_xlsform
from app.services.form_engine import FormEngine


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
