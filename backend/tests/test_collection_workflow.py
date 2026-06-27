from datetime import UTC, datetime, timedelta
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
from app.models.operations import (
    Beneficiary,
    DataQualitySignal,
    EntityAttribute,
    EntityAttributeValue,
    EntityCategory,
    MonitoringIndicator,
)
from app.schemas.collection import (
    DataFormCreate,
    DeviceMetadata,
    EntityFrequencyValidationRequest,
    FormDataImportConfirmRequest,
    FormDataImportRequest,
    FormDataImportReturnRequest,
    FormControlsSettings,
    LocationCapture,
    ImportCleaningBulkUpdateRequest,
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
    validate_submission_payload,
)
from app.schemas.operations import (
    BeneficiaryUpdate,
    BeneficiaryProfileUpdateProposalReview,
    FieldVisitCheckIn,
    FieldVisitRequestCreate,
    FieldVisitRequestReview,
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


def test_form_schema_normalizes_sector_starter_aliases_and_consent() -> None:
    payload = DataFormCreate.model_validate(
        {
            "project_id": uuid4(),
            "survey_id": uuid4(),
            "name": "Starter aliases",
            "slug": "starter-aliases",
            "schema": {
                "sections": [
                    {
                        "id": "main",
                        "title": "Main",
                        "fields": [
                            {"id": "consent", "type": "consent", "label": "Consent captured", "required": True},
                            {"id": "entity_name", "type": "short_text", "label": "Entity name"},
                            {"id": "notes", "type": "long_text", "label": "Notes"},
                            {"id": "photo", "type": "image_upload", "label": "Photo"},
                        ],
                    }
                ]
            },
        }
    )

    assert [field.type for field in payload.form_schema.sections[0].fields] == [
        "consent",
        "text",
        "textarea",
        "photo",
    ]


def test_form_controls_accept_legacy_profile_update_labels() -> None:
    controls = FormControlsSettings.model_validate(
        {
            "entity_controls": {
                "profile_update_mode": "Require review for name, phone, village, and GPS changes",
            }
        }
    )

    assert controls.entity_controls.profile_update_mode == "with_supervisor_approval"


def test_form_schema_accepts_operational_lifecycle_form_types() -> None:
    for form_type in [
        "registration",
        "baseline",
        "monitoring",
        "attendance",
        "distribution",
        "assessment",
        "complaint",
        "endline",
        "follow_up",
        "case_update",
        "custom",
    ]:
        payload = DataFormCreate.model_validate(
            {
                "project_id": uuid4(),
                "survey_id": uuid4(),
                "name": f"{form_type} form",
                "slug": f"{form_type.replace('_', '-')}-form",
                "form_type": form_type,
                "schema": {
                    "sections": [
                        {
                            "id": "main",
                            "title": "Main",
                            "fields": [{"id": "name", "type": "text", "label": "Name"}],
                        }
                    ]
                },
            }
        )

        assert payload.form_type == form_type


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


def test_form_schema_rejects_unsupported_repeat_child_types() -> None:
    with pytest.raises(ValidationError, match="Unsupported field type"):
        DataFormCreate.model_validate(
            {
                "project_id": uuid4(),
                "survey_id": uuid4(),
                "name": "Bad roster",
                "slug": "bad-roster",
                "schema": {
                    "sections": [
                        {
                            "id": "main",
                            "title": "Main",
                            "fields": [
                                {
                                    "id": "household_members",
                                    "type": "repeat_group",
                                    "label": "Household members",
                                    "children": [{"id": "unsafe", "type": "unsafe_plugin", "label": "Unsafe"}],
                                }
                            ],
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
                                "id": "consent",
                                "type": "consent",
                                "label": "Consent captured",
                                "required": True,
                                "validation": {"blockIfFalse": True, "message": "Consent is required before continuing."},
                            },
                            {
                                "id": "crop_status",
                                "type": "select",
                                "label": "Crop status",
                                "required": True,
                                "options": [{"label": "Healthy", "value": "healthy"}, {"label": "Needs support", "value": "needs_support"}],
                            },
                            {"id": "site", "type": "gps", "label": "Site", "required": True, "validation": {"accuracyMax": 20}},
                            {"id": "proof", "type": "photo", "label": "Proof photo"},
                            {
                                "id": "household_members",
                                "type": "repeat_group",
                                "label": "Household members",
                                "children": [
                                    {
                                        "id": "member_status",
                                        "variable_name": "member_status",
                                        "type": "select",
                                        "label": "Member status",
                                        "required": True,
                                        "options": [{"label": "Present", "value": "present"}, {"label": "Absent", "value": "absent"}],
                                    },
                                    {"id": "member_location", "variable_name": "member_location", "type": "gps", "label": "Member location"},
                                    {"id": "member_photo", "variable_name": "member_photo", "type": "photo", "label": "Member photo"},
                                ],
                            },
                        ],
                    }
                ]
            },
        }
    ).form_schema

    workbook = form_schema_to_xlsform(form_id=form_id, form_name="Farm monitoring", version=1, schema=schema)
    compatibility = form_schema_compatibility(form_id=form_id, version=1, schema=schema)

    assert workbook.settings.form_title == "Farm monitoring"
    assert "acknowledge" in {row.type for row in workbook.survey}
    assert "select_one crop_status" in {row.type for row in workbook.survey}
    assert "begin_repeat" in {row.type for row in workbook.survey}
    assert workbook.survey[[row.name for row in workbook.survey].index("member_status")].type == "select_one member_status"
    assert workbook.survey[[row.name for row in workbook.survey].index("member_location")].type == "geopoint"
    assert workbook.survey[[row.name for row in workbook.survey].index("member_photo")].type == "image"
    assert {choice.name for choice in workbook.choices} == {"healthy", "needs_support", "present", "absent"}
    assert compatibility.xlsform_ready is True
    assert compatibility.web_form_ready is True
    assert compatibility.has_gps is True
    assert compatibility.media_field_count == 2


def test_form_schema_compatibility_warns_for_barcode_manual_web_entry() -> None:
    form_id = uuid4()
    schema = DataFormCreate.model_validate(
        {
            "project_id": uuid4(),
            "survey_id": uuid4(),
            "name": "Retail stock check",
            "slug": "retail-stock-check",
            "schema": {
                "sections": [
                    {
                        "id": "main",
                        "title": "Main",
                        "fields": [
                            {"id": "sku", "type": "barcode", "label": "SKU Barcode"},
                            {"id": "shelf_qr", "type": "qr", "label": "Shelf QR"},
                        ],
                    }
                ]
            },
        }
    ).form_schema

    compatibility = form_schema_compatibility(form_id=form_id, version=1, schema=schema)

    assert compatibility.web_form_ready is True
    assert (
        "Barcode and QR questions can still be collected on web with manual entry when camera scanning is unavailable."
        in compatibility.warnings
    )


def test_validate_submission_payload_blocks_false_consent() -> None:
    schema = DataFormCreate.model_validate(
        {
            "project_id": uuid4(),
            "survey_id": uuid4(),
            "name": "Consent check",
            "slug": "consent-check",
            "schema": {
                "sections": [
                    {
                        "id": "main",
                        "title": "Main",
                        "fields": [
                            {
                                "id": "consent",
                                "type": "consent",
                                "label": "Consent captured",
                                "required": True,
                                "validation": {"blockIfFalse": True, "message": "Consent is required before continuing."},
                            }
                        ],
                    }
                ]
            },
        }
    ).form_schema

    issues = validate_submission_payload(schema=schema, payload={"consent": False}, location_accuracy=None)

    assert issues == ["Consent is required before continuing."]


def test_validate_submission_payload_checks_repeat_group_child_rows() -> None:
    schema = DataFormCreate.model_validate(
        {
            "project_id": uuid4(),
            "survey_id": uuid4(),
            "name": "Household roster",
            "slug": "household-roster",
            "schema": {
                "sections": [
                    {
                        "id": "main",
                        "title": "Main",
                        "fields": [
                            {
                                "id": "household_members",
                                "variable_name": "household_members",
                                "type": "repeat_group",
                                "label": "Household Members",
                                "children": [
                                    {
                                        "id": "member_name",
                                        "variable_name": "member_name",
                                        "type": "text",
                                        "label": "Member Name",
                                        "required": True,
                                    },
                                    {
                                        "id": "member_age",
                                        "variable_name": "member_age",
                                        "type": "number",
                                        "label": "Member Age",
                                        "validation": {"min": 0, "max": 120},
                                    },
                                    {
                                        "id": "member_status",
                                        "variable_name": "member_status",
                                        "type": "select",
                                        "label": "Member Status",
                                        "options": [{"label": "Present", "value": "present"}],
                                    },
                                ],
                            }
                        ],
                    }
                ]
            },
        }
    ).form_schema

    issues = validate_submission_payload(
        schema=schema,
        payload={"household_members": [{"member_name": "", "member_age": "not-a-number", "member_status": "away"}]},
        location_accuracy=None,
    )

    assert issues == [
        "Household Members row 1: Member Name is required.",
        "Household Members row 1: Member Age must be a valid number.",
        "Household Members row 1: Member Status must use one of the approved option values.",
    ]


def test_validate_submission_payload_checks_repeat_group_limits() -> None:
    schema = DataFormCreate.model_validate(
        {
            "project_id": uuid4(),
            "survey_id": uuid4(),
            "name": "Household roster limits",
            "slug": "household-roster-limits",
            "schema": {
                "sections": [
                    {
                        "id": "main",
                        "title": "Main",
                        "fields": [
                            {
                                "id": "household_members",
                                "variable_name": "household_members",
                                "type": "repeat_group",
                                "label": "Household Members",
                                "repeat": {"min": 1, "max": 2},
                                "children": [{"id": "member_name", "type": "text", "label": "Member Name"}],
                            }
                        ],
                    }
                ]
            },
        }
    ).form_schema

    too_few = validate_submission_payload(schema=schema, payload={"household_members": []}, location_accuracy=None)
    too_many = validate_submission_payload(
        schema=schema,
        payload={"household_members": [{"member_name": "A"}, {"member_name": "B"}, {"member_name": "C"}]},
        location_accuracy=None,
    )

    assert too_few == ["Household Members needs at least 1 row(s)."]
    assert too_many == ["Household Members allows at most 2 row(s)."]


def test_validate_submission_payload_checks_required_matrix_rows_and_choices() -> None:
    schema = DataFormCreate.model_validate(
        {
            "project_id": uuid4(),
            "survey_id": uuid4(),
            "name": "Facility matrix",
            "slug": "facility-matrix",
            "schema": {
                "sections": [
                    {
                        "id": "main",
                        "title": "Main",
                        "fields": [
                            {
                                "id": "service_matrix",
                                "type": "matrix_single",
                                "label": "Service Matrix",
                                "required": True,
                                "matrix": {"rows": ["Cleanliness", "Availability"], "columns": ["Good", "Poor"]},
                            }
                        ],
                    }
                ]
            },
        }
    ).form_schema

    issues = validate_submission_payload(
        schema=schema,
        payload={"service_matrix": {"Cleanliness": "Average"}},
        location_accuracy=None,
    )

    assert issues == [
        "Service Matrix row Cleanliness must use approved matrix choices.",
        "Service Matrix row Availability is required.",
    ]


def test_validate_submission_payload_checks_grid_rows_and_choices() -> None:
    schema = DataFormCreate.model_validate(
        {
            "project_id": uuid4(),
            "survey_id": uuid4(),
            "name": "Facility grid",
            "slug": "facility-grid",
            "schema": {
                "sections": [
                    {
                        "id": "main",
                        "title": "Main",
                        "fields": [
                            {
                                "id": "service_grid",
                                "type": "grid",
                                "label": "Service Grid",
                                "required": True,
                                "matrix": {"rows": ["Power", "Water"], "columns": ["Available", "Missing"]},
                            }
                        ],
                    }
                ]
            },
        }
    ).form_schema

    issues = validate_submission_payload(
        schema=schema,
        payload={"service_grid": {"Power": "Broken"}},
        location_accuracy=None,
    )

    assert issues == [
        "Service Grid row Power must use approved matrix choices.",
        "Service Grid row Water is required.",
    ]


def test_validate_submission_payload_applies_date_rules_only_when_configured() -> None:
    schema = DataFormCreate.model_validate(
        {
            "project_id": uuid4(),
            "survey_id": uuid4(),
            "name": "Date checks",
            "slug": "date-checks",
            "schema": {
                "sections": [
                    {
                        "id": "main",
                        "title": "Main",
                        "fields": [
                            {"id": "planned_visit", "type": "date", "label": "Planned Visit Date"},
                            {
                                "id": "interview_date",
                                "type": "date",
                                "label": "Interview Date",
                                "validation": {"blockFutureDates": True},
                            },
                            {
                                "id": "activity_date",
                                "type": "date",
                                "label": "Activity Date",
                                "validation": {"minDate": "2026-01-01", "maxDate": "2026-12-31"},
                            },
                        ],
                    }
                ]
            },
        }
    ).form_schema

    issues = validate_submission_payload(
        schema=schema,
        payload={"planned_visit": "2099-01-01", "interview_date": "2099-01-01", "activity_date": "2027-01-01"},
        location_accuracy=None,
    )

    assert issues == [
        "Interview Date cannot be in the future.",
        "Activity Date must be on or before 2026-12-31.",
    ]


def test_validate_submission_payload_checks_integer_only_numbers() -> None:
    schema = DataFormCreate.model_validate(
        {
            "project_id": uuid4(),
            "survey_id": uuid4(),
            "name": "Stock count",
            "slug": "stock-count",
            "schema": {
                "sections": [
                    {
                        "id": "main",
                        "title": "Main",
                        "fields": [
                            {
                                "id": "stock_count",
                                "type": "number",
                                "label": "Stock Count",
                                "validation": {"integerOnly": True, "min": 0},
                            }
                        ],
                    }
                ]
            },
        }
    ).form_schema

    issues = validate_submission_payload(schema=schema, payload={"stock_count": "2.5"}, location_accuracy=None)

    assert issues == ["Stock Count must be a whole number."]


def test_validate_submission_payload_checks_time_format() -> None:
    schema = DataFormCreate.model_validate(
        {
            "project_id": uuid4(),
            "survey_id": uuid4(),
            "name": "Visit time",
            "slug": "visit-time",
            "schema": {
                "sections": [
                    {
                        "id": "main",
                        "title": "Main",
                        "fields": [
                            {
                                "id": "visit_time",
                                "type": "time",
                                "label": "Visit Time",
                            }
                        ],
                    }
                ]
            },
        }
    ).form_schema

    issues = validate_submission_payload(schema=schema, payload={"visit_time": "25:75"}, location_accuracy=None)

    assert issues == ["Visit Time must use 24-hour time such as 14:30."]


def test_validate_submission_payload_checks_ranking_duplicates() -> None:
    schema = DataFormCreate.model_validate(
        {
            "project_id": uuid4(),
            "survey_id": uuid4(),
            "name": "Priority ranking",
            "slug": "priority-ranking",
            "schema": {
                "sections": [
                    {
                        "id": "main",
                        "title": "Main",
                        "fields": [
                            {
                                "id": "priorities",
                                "type": "ranking",
                                "label": "Priority Ranking",
                                "options": [
                                    {"label": "Water", "value": "water"},
                                    {"label": "Roads", "value": "roads"},
                                ],
                            }
                        ],
                    }
                ]
            },
        }
    ).form_schema

    issues = validate_submission_payload(
        schema=schema,
        payload={"priorities": ["water", "water", "power"]},
        location_accuracy=None,
    )

    assert issues == [
        "Priority Ranking includes values outside the approved option list.",
        "Priority Ranking can rank each option only once.",
    ]


def test_validate_submission_payload_checks_media_rules() -> None:
    schema = DataFormCreate.model_validate(
        {
            "project_id": uuid4(),
            "survey_id": uuid4(),
            "name": "Media checks",
            "slug": "media-checks",
            "schema": {
                "sections": [
                    {
                        "id": "main",
                        "title": "Main",
                        "fields": [
                            {
                                "id": "proof",
                                "type": "photo",
                                "label": "Proof Photo",
                                "validation": {
                                    "allowedFileTypes": "jpg,png",
                                    "maxFileSizeMb": 1,
                                    "maxAttachmentCount": 1,
                                },
                            }
                        ],
                    }
                ]
            },
        }
    ).form_schema

    issues = validate_submission_payload(
        schema=schema,
        payload={"proof": [{"fileName": "proof.pdf", "mimeType": "application/pdf", "size": 2 * 1024 * 1024}, {"fileName": "extra.jpg"}]},
        location_accuracy=None,
    )

    assert issues == [
        "Proof Photo allows at most 1 attachment(s).",
        "Proof Photo file size must be 1 MB or smaller.",
        "Proof Photo file type is not allowed.",
    ]


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

        # Attribution must surface human names, not raw UUIDs: who uploaded the
        # row and who cleaned/approved it.
        listed = await service.list_submissions(organization_id=organization_id)
        imported_row = next(row for row in listed if row.id == submission_id)
        assert imported_row.imported_by_name == "Manager"
        assert imported_row.reviewed_by_name == "Manager"
        assert imported_row.approved_by_name == "Manager"

        # The recorded status timeline must surface the actor's name, not a UUID.
        timeline = await service.history(organization_id=organization_id, submission_id=submission_id)
        assert timeline, "status history should be recorded"
        assert timeline[-1].to_status == "approved"
        assert timeline[-1].actor_name == "Manager"


@pytest.mark.asyncio
async def test_cleaned_imported_form_row_can_be_confirmed_and_used() -> None:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        organization_id = uuid4()
        actor_user_id = uuid4()
        project_id = uuid4()
        form_id = uuid4()
        version_id = uuid4()
        session.add_all(
            [
                Organization(id=organization_id, name="Clean Org", slug="clean-org"),
                User(id=actor_user_id, email="manager@example.org", full_name="Manager", password_hash="x"),
                Project(id=project_id, organization_id=organization_id, name="Clean Project", slug="clean-project", status="active"),
                DataForm(
                    id=form_id,
                    organization_id=organization_id,
                    project_id=project_id,
                    created_by_user_id=actor_user_id,
                    name="Entity Registration",
                    slug="entity-registration",
                    status="published",
                    current_version=1,
                    controls_json={
                        "entity_controls": {
                            "linked_to_entity": True,
                            "entity_type": "Farmer",
                            "creates_new_entity": True,
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
                rows=[{"phone": "677000009"}],
                source_name="dirty.csv",
                source_system="Form spreadsheet upload",
                import_reason="Backfill registration data",
            ),
        )
        submission_id = imported.submissions[0].id
        assert imported.imported_rows == 1
        assert imported.warning_count >= 1

        staged_rows = await service.list_import_cleaning_rows(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
        )
        assert staged_rows[0].ready_to_confirm is False
        assert "farmer_name" in staged_rows[0].missing_field_keys

        cleaned = await service.bulk_update_import_cleaning_rows(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            payload=ImportCleaningBulkUpdateRequest(
                rows=[{"submission_id": submission_id, "responses": {"farmer_name": "Cleaned Farmer", "phone": "677000009"}}],
                reason="Filled missing farmer name from source file.",
            ),
        )
        assert cleaned.updated_rows == 1
        assert cleaned.rows[0].ready_to_confirm is True

        confirmed = await service.confirm_imported_form_rows(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            form_id=form_id,
            payload=FormDataImportConfirmRequest(submission_ids=[submission_id], comment="Cleaned and ready"),
        )
        await session.commit()

        beneficiary = (await session.execute(select(Beneficiary))).scalar_one()
        assert confirmed.confirmed_rows == 1
        assert beneficiary.display_name == "Cleaned Farmer"
        assert beneficiary.phone_number == "677000009"
        assert beneficiary.profile_json["sourceSubmissionId"] == str(submission_id)


@pytest.mark.asyncio
async def test_confirmed_import_links_existing_beneficiary_by_uploaded_code() -> None:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        organization_id = uuid4()
        actor_user_id = uuid4()
        project_id = uuid4()
        form_id = uuid4()
        version_id = uuid4()
        existing_beneficiary_id = uuid4()
        session.add_all(
            [
                Organization(id=organization_id, name="Link Org", slug="link-org"),
                User(id=actor_user_id, email="link-manager@example.org", full_name="Link Manager", password_hash="x"),
                Project(id=project_id, organization_id=organization_id, name="Link Project", slug="link-project", status="active"),
                DataForm(
                    id=form_id,
                    organization_id=organization_id,
                    project_id=project_id,
                    created_by_user_id=actor_user_id,
                    name="Farmer Monitoring",
                    slug="farmer-monitoring",
                    status="published",
                    current_version=1,
                    controls_json={
                        "entity_controls": {
                            "linked_to_entity": True,
                            "entity_type": "Farmer",
                            "updates_existing_entity": True,
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
                                    {"id": "beneficiary_code", "variable_name": "beneficiary_code", "type": "text", "label": "Beneficiary Code", "required": True},
                                    {"id": "farmer_name", "variable_name": "farmer_name", "type": "text", "label": "Farmer Name", "required": True},
                                    {"id": "phone", "variable_name": "phone", "type": "phone", "label": "Phone"},
                                ],
                            }
                        ]
                    },
                    offline_compatible=True,
                    published_at=datetime.now(UTC),
                ),
                Beneficiary(
                    id=existing_beneficiary_id,
                    organization_id=organization_id,
                    project_id=project_id,
                    beneficiary_uid="FRM-2026-000001",
                    beneficiary_type="Farmer",
                    display_name="Amina Farmer",
                    phone_number="677000001",
                    enrollment_status="active",
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
                rows=[
                    {
                        "beneficiary_code": "FRM-2026-000001",
                        "farmer_name": "Amina Farmer",
                        "phone": "677000001",
                    }
                ],
                source_name="monitoring.csv",
                source_system="Form spreadsheet upload",
                import_reason="Monitoring backfill",
            ),
        )
        submission_id = imported.submissions[0].id

        confirmed = await service.confirm_imported_form_rows(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            form_id=form_id,
            payload=FormDataImportConfirmRequest(submission_ids=[submission_id], comment="Ready"),
        )
        await session.commit()

        beneficiaries = (
            await session.execute(
                select(Beneficiary).where(Beneficiary.organization_id == organization_id)
            )
        ).scalars().all()
        submission = (
            await session.execute(select(Submission).where(Submission.id == submission_id))
        ).scalar_one()

        assert confirmed.confirmed_rows == 1
        assert len(beneficiaries) == 1
        assert submission.entity_id == existing_beneficiary_id
        assert submission.payload_json["_beneficiary_processing"]["action"] == "linked"
        assert submission.payload_json["_beneficiary_processing"]["beneficiary_uid"] == "FRM-2026-000001"
    await engine.dispose()


@pytest.mark.asyncio
async def test_import_form_rows_parses_repeat_and_matrix_json_cells() -> None:
    env = await _seed_dedup_environment({"entity_controls": {}})
    session: object = env["session"]
    async with session:
        version = await session.scalar(select(DataFormVersion).where(DataFormVersion.form_id == env["form_id"]))
        assert version is not None
        schema_json = dict(version.schema_json)
        sections = list(schema_json["sections"])
        section = dict(sections[0])
        fields = list(section["fields"])
        fields.append(
            {
                "id": "service_matrix",
                "variable_name": "service_matrix",
                "type": "matrix_single",
                "label": "Service Matrix",
                "matrix": {"rows": ["Cleanliness"], "columns": ["Good", "Poor"]},
            }
        )
        section["fields"] = fields
        sections[0] = section
        schema_json["sections"] = sections
        version.schema_json = schema_json
        await session.commit()

        service = SubmissionService(session)
        imported = await service.import_form_rows(
            organization_id=env["organization_id"],
            actor_user_id=env["manager_user_id"],
            form_id=env["form_id"],
            payload=FormDataImportRequest(
                rows=[
                    {
                        "farmer_name": "Import Complex Farmer",
                        "household_members": '[{"member_name":"Imported Member","age":14}]',
                        "service_matrix": '{"Cleanliness":"Good"}',
                    }
                ],
                source_name="complex.csv",
                source_system="Form spreadsheet upload",
                import_reason="Backfill complex form data",
            ),
        )
        submission_id = imported.submissions[0].id
        submission = await session.get(Submission, submission_id)
        assert submission is not None

        assert submission.payload_json["household_members"] == [{"member_name": "Imported Member", "age": 14}]
        assert submission.payload_json["service_matrix"] == {"Cleanliness": "Good"}


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
                                    {"id": "q_name", "variable_name": "entity_name", "type": "text", "label": "Farmer Name", "required": True},
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
                    {"questionId": "q_name", "variableName": "entity_name", "value": "Mobile Farmer", "updatedAt": now},
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
        assert submission.source_system == "Mobile"
        assert submission.payload_json["entity_name"] == "Mobile Farmer"
        assert submission.payload_json["q_name"] == "Mobile Farmer"
        assert submission.payload_json["_mobile_responses"][0]["questionId"] == "q_name"
        assert submission.offline_created is True
        assert submission.field_officer_id == officer_id
        assert submission.source_system == "Mobile"
        assert submission.source_submission_id == "mobile-draft-001"

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
        refreshed_submission = await session.get(Submission, submission.id)
        assert refreshed_submission is not None
        assert refreshed_submission.entity_id == beneficiary.id


@pytest.mark.asyncio
async def test_registration_without_recognized_name_still_creates_entity_and_flags_it() -> None:
    """A registration form approved without a recognizable name field must still produce a
    findable entity (auto-named) and raise a visible data-quality signal — never a silent
    no-op that leaves the submission with a blank Entity ID."""
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
                Organization(id=organization_id, name="No Name Org", slug="no-name-org"),
                User(id=field_user_id, email="field2@example.org", full_name="Field Officer", password_hash="x"),
                User(id=manager_user_id, email="manager2@example.org", full_name="Manager", password_hash="x"),
                FieldOfficerProfile(id=officer_id, organization_id=organization_id, user_id=field_user_id, is_active=True),
                Project(id=project_id, organization_id=organization_id, name="No Name Project", slug="no-name-project", status="active"),
                Survey(
                    id=survey_id,
                    organization_id=organization_id,
                    project_id=project_id,
                    created_by_user_id=manager_user_id,
                    owner_user_id=manager_user_id,
                    title="Reg",
                    code="REG",
                    survey_type="registration",
                    status="active",
                ),
                DataForm(
                    id=form_id,
                    organization_id=organization_id,
                    project_id=project_id,
                    survey_id=survey_id,
                    created_by_user_id=manager_user_id,
                    name="Asset Registration",
                    slug="asset-registration",
                    status="published",
                    current_version=1,
                    controls_json={
                        "entity_controls": {
                            "linked_to_entity": True,
                            "entity_type": "Asset",
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
                                "id": "details",
                                "title": "Details",
                                "fields": [
                                    {"id": "q_obs", "variable_name": "observation", "type": "text", "label": "Observation"},
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
            email="field2@example.org",
            full_name="Field Officer",
            organization_slug="no-name-org",
            organization_name="No Name Org",
            roles=["field_officer"],
            permissions=["submission.create", "sync.mobile"],
            scope_type="own",
        )
        uploaded = await MobileService(session).upload_submission(
            principal=principal,
            payload=MobileSubmissionUpload(
                local_id="mobile-noname-001",
                project_id=str(project_id),
                form_id=str(form_id),
                form_version_id=str(version_id),
                entity_type="Asset",
                responses=[
                    {"questionId": "q_obs", "variableName": "observation", "value": "Pump in good condition", "updatedAt": now},
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
            organization_id=organization_id, status=None, actor_user_id=field_user_id, scope_type="own"
        )
        submission = submissions[0]
        await SubmissionService(session).review_submission(
            organization_id=organization_id,
            actor_user_id=manager_user_id,
            submission_id=submission.id,
            payload=SubmissionReviewAction(action="approve", comment="Approved"),
        )
        await session.commit()

        # Entity is still created and linked (no silent no-op).
        beneficiary = (await session.execute(select(Beneficiary))).scalar_one()
        assert beneficiary.beneficiary_uid != ""
        assert "Unnamed Asset" in beneficiary.display_name
        refreshed = await session.get(Submission, submission.id)
        assert refreshed is not None and refreshed.entity_id == beneficiary.id
        assert refreshed.payload_json["_beneficiary_processing"]["name_autogenerated"] is True
        # And a visible signal tells the manager to fix the name mapping.
        signal = (
            await session.execute(select(DataQualitySignal).where(DataQualitySignal.signal_type == "entity_name_missing"))
        ).scalar_one()
        assert signal.beneficiary_id == beneficiary.id


@pytest.mark.asyncio
async def test_registration_resolves_name_from_beneficiary_field_tag_not_just_heuristic() -> None:
    """When the builder tags the name question with [beneficiary-field:full_name] (the form
    propagation fix), the entity is named from the explicit mapping even though the field's
    variable name ('client_name') is not one the heuristic recognizes — so the created
    entity carries the real submitted name, not an auto-generated placeholder."""
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
                Organization(id=organization_id, name="Tag Org", slug="tag-org"),
                User(id=field_user_id, email="field3@example.org", full_name="Field Officer", password_hash="x"),
                User(id=manager_user_id, email="manager3@example.org", full_name="Manager", password_hash="x"),
                FieldOfficerProfile(id=officer_id, organization_id=organization_id, user_id=field_user_id, is_active=True),
                Project(id=project_id, organization_id=organization_id, name="Tag Project", slug="tag-project", status="active"),
                Survey(
                    id=survey_id,
                    organization_id=organization_id,
                    project_id=project_id,
                    created_by_user_id=manager_user_id,
                    owner_user_id=manager_user_id,
                    title="Reg",
                    code="REG3",
                    survey_type="registration",
                    status="active",
                ),
                DataForm(
                    id=form_id,
                    organization_id=organization_id,
                    project_id=project_id,
                    survey_id=survey_id,
                    created_by_user_id=manager_user_id,
                    name="Member Registration",
                    slug="member-registration",
                    status="published",
                    current_version=1,
                    controls_json={
                        "entity_controls": {
                            "linked_to_entity": True,
                            "entity_type": "Member",
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
                                    {
                                        "id": "q_name",
                                        "variable_name": "client_name",
                                        "type": "text",
                                        "label": "Member name",
                                        "appearance": {"helpText": "[profile-impact:updates_profile] [beneficiary-field:full_name]"},
                                    },
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
            email="field3@example.org",
            full_name="Field Officer",
            organization_slug="tag-org",
            organization_name="Tag Org",
            roles=["field_officer"],
            permissions=["submission.create", "sync.mobile"],
            scope_type="own",
        )
        await MobileService(session).upload_submission(
            principal=principal,
            payload=MobileSubmissionUpload(
                local_id="mobile-tag-001",
                project_id=str(project_id),
                form_id=str(form_id),
                form_version_id=str(version_id),
                entity_type="Member",
                responses=[
                    {"questionId": "q_name", "variableName": "client_name", "value": "Awa Ndip", "updatedAt": now},
                ],
                location={"latitude": 5.9, "longitude": 10.1, "accuracy": 8, "timestamp": now},
                device_id="android-test",
                app_version="1.0.0-test",
                created_at=now,
                submitted_at=now,
            ),
        )
        submissions = await SubmissionService(session).list_submissions(
            organization_id=organization_id, status=None, actor_user_id=field_user_id, scope_type="own"
        )
        submission = submissions[0]
        await SubmissionService(session).review_submission(
            organization_id=organization_id,
            actor_user_id=manager_user_id,
            submission_id=submission.id,
            payload=SubmissionReviewAction(action="approve", comment="Approved"),
        )
        await session.commit()

        beneficiary = (await session.execute(select(Beneficiary))).scalar_one()
        assert beneficiary.display_name == "Awa Ndip"
        assert "Unnamed" not in beneficiary.display_name
        refreshed = await session.get(Submission, submission.id)
        assert refreshed is not None and refreshed.entity_id == beneficiary.id


@pytest.mark.asyncio
async def test_non_person_registration_names_entity_from_typed_name_field() -> None:
    """A non-person registration (a Facility) whose name field is 'facility_name' — not a
    person name the old heuristic recognized, and with no explicit mapping — is still named
    from that field rather than auto-named, thanks to the broadened name resolution."""
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
                Organization(id=organization_id, name="Facility Org", slug="facility-org"),
                User(id=field_user_id, email="field4@example.org", full_name="Field Officer", password_hash="x"),
                User(id=manager_user_id, email="manager4@example.org", full_name="Manager", password_hash="x"),
                FieldOfficerProfile(id=officer_id, organization_id=organization_id, user_id=field_user_id, is_active=True),
                Project(id=project_id, organization_id=organization_id, name="Facility Project", slug="facility-project", status="active"),
                Survey(
                    id=survey_id,
                    organization_id=organization_id,
                    project_id=project_id,
                    created_by_user_id=manager_user_id,
                    owner_user_id=manager_user_id,
                    title="Facility Reg",
                    code="FAC-REG",
                    survey_type="registration",
                    status="active",
                ),
                DataForm(
                    id=form_id,
                    organization_id=organization_id,
                    project_id=project_id,
                    survey_id=survey_id,
                    created_by_user_id=manager_user_id,
                    name="Facility Registration",
                    slug="facility-registration",
                    status="published",
                    current_version=1,
                    controls_json={
                        "entity_controls": {
                            "linked_to_entity": True,
                            "entity_type": "Facility",
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
                                "id": "details",
                                "title": "Details",
                                "fields": [
                                    {"id": "q_fname", "variable_name": "facility_name", "type": "text", "label": "Facility name"},
                                    {"id": "q_type", "variable_name": "facility_kind", "type": "text", "label": "Kind"},
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
            email="field4@example.org",
            full_name="Field Officer",
            organization_slug="facility-org",
            organization_name="Facility Org",
            roles=["field_officer"],
            permissions=["submission.create", "sync.mobile"],
            scope_type="own",
        )
        await MobileService(session).upload_submission(
            principal=principal,
            payload=MobileSubmissionUpload(
                local_id="mobile-fac-001",
                project_id=str(project_id),
                form_id=str(form_id),
                form_version_id=str(version_id),
                entity_type="Facility",
                responses=[
                    {"questionId": "q_fname", "variableName": "facility_name", "value": "Bonaberi Health Center", "updatedAt": now},
                    {"questionId": "q_type", "variableName": "facility_kind", "value": "Clinic", "updatedAt": now},
                ],
                location={"latitude": 5.9, "longitude": 10.1, "accuracy": 8, "timestamp": now},
                device_id="android-test",
                app_version="1.0.0-test",
                created_at=now,
                submitted_at=now,
            ),
        )
        submissions = await SubmissionService(session).list_submissions(
            organization_id=organization_id, status=None, actor_user_id=field_user_id, scope_type="own"
        )
        submission = submissions[0]
        await SubmissionService(session).review_submission(
            organization_id=organization_id,
            actor_user_id=manager_user_id,
            submission_id=submission.id,
            payload=SubmissionReviewAction(action="approve", comment="Approved"),
        )
        await session.commit()

        beneficiary = (await session.execute(select(Beneficiary))).scalar_one()
        assert beneficiary.display_name == "Bonaberi Health Center"
        assert "Unnamed" not in beneficiary.display_name
        assert beneficiary.beneficiary_type == "Facility"
        assert beneficiary.beneficiary_uid.startswith("FAC-")


@pytest.mark.asyncio
async def test_question_mapped_to_identity_field_dedups_without_form_level_config() -> None:
    """Mapping a question to an identity field (National ID) makes it a duplicate key with
    no form-level unique_fields config: a second registration with the same National ID
    links to the existing entity instead of creating a duplicate."""
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
                Organization(id=organization_id, name="Dedup Org", slug="dedup-org"),
                User(id=field_user_id, email="field5@example.org", full_name="Field Officer", password_hash="x"),
                User(id=manager_user_id, email="manager5@example.org", full_name="Manager", password_hash="x"),
                FieldOfficerProfile(id=officer_id, organization_id=organization_id, user_id=field_user_id, is_active=True),
                Project(id=project_id, organization_id=organization_id, name="Dedup Project", slug="dedup-project", status="active"),
                Survey(
                    id=survey_id,
                    organization_id=organization_id,
                    project_id=project_id,
                    created_by_user_id=manager_user_id,
                    owner_user_id=manager_user_id,
                    title="Reg",
                    code="DEDUP",
                    survey_type="registration",
                    status="active",
                ),
                DataForm(
                    id=form_id,
                    organization_id=organization_id,
                    project_id=project_id,
                    survey_id=survey_id,
                    created_by_user_id=manager_user_id,
                    name="Member Registration",
                    slug="dedup-member-registration",
                    status="published",
                    current_version=1,
                    # No form-level unique_fields/matching_fields configured.
                    controls_json={
                        "entity_controls": {
                            "linked_to_entity": True,
                            "entity_type": "Member",
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
                                    {"id": "q_name", "variable_name": "entity_name", "type": "text", "label": "Name"},
                                    {
                                        "id": "q_nid",
                                        "variable_name": "national_id",
                                        "type": "text",
                                        "label": "National ID",
                                        "appearance": {"helpText": "[profile-impact:updates_profile] [beneficiary-field:national_id]"},
                                    },
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
            email="field5@example.org",
            full_name="Field Officer",
            organization_slug="dedup-org",
            organization_name="Dedup Org",
            roles=["field_officer"],
            permissions=["submission.create", "sync.mobile"],
            scope_type="own",
        )

        async def register(local_id: str, name: str) -> None:
            await MobileService(session).upload_submission(
                principal=principal,
                payload=MobileSubmissionUpload(
                    local_id=local_id,
                    project_id=str(project_id),
                    form_id=str(form_id),
                    form_version_id=str(version_id),
                    entity_type="Member",
                    responses=[
                        {"questionId": "q_name", "variableName": "entity_name", "value": name, "updatedAt": now},
                        {"questionId": "q_nid", "variableName": "national_id", "value": "ID-100", "updatedAt": now},
                    ],
                    location={"latitude": 5.9, "longitude": 10.1, "accuracy": 8, "timestamp": now},
                    device_id="android-test",
                    app_version="1.0.0-test",
                    created_at=now,
                    submitted_at=now,
                ),
            )

        await register("dedup-1", "Awa Ndip")
        await register("dedup-2", "Awa N.")  # same National ID, slightly different name
        await session.commit()

        all_subs = await SubmissionService(session).list_submissions(
            organization_id=organization_id, status=None, actor_user_id=field_user_id, scope_type="own"
        )
        for submission in all_subs:
            await SubmissionService(session).review_submission(
                organization_id=organization_id,
                actor_user_id=manager_user_id,
                submission_id=submission.id,
                payload=SubmissionReviewAction(action="approve", comment="Approved"),
            )
        await session.commit()

        # The shared National ID collapses both registrations onto one entity.
        beneficiaries = (await session.execute(select(Beneficiary))).scalars().all()
        assert len(beneficiaries) == 1
        entity_ids = {
            (await session.get(Submission, submission.id)).entity_id for submission in all_subs
        }
        assert entity_ids == {beneficiaries[0].id}


@pytest.mark.asyncio
async def test_mobile_follow_up_submission_requires_existing_entity_before_sync() -> None:
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
                Organization(id=organization_id, name="Follow Up Org", slug="follow-up-org"),
                User(id=field_user_id, email="field@example.org", full_name="Field Officer", password_hash="x"),
                User(id=manager_user_id, email="manager@example.org", full_name="Manager", password_hash="x"),
                FieldOfficerProfile(id=officer_id, organization_id=organization_id, user_id=field_user_id, is_active=True),
                Project(id=project_id, organization_id=organization_id, name="Follow Up Project", slug="follow-up-project", status="active"),
                Survey(
                    id=survey_id,
                    organization_id=organization_id,
                    project_id=project_id,
                    created_by_user_id=manager_user_id,
                    owner_user_id=manager_user_id,
                    title="Follow Up Survey",
                    code="FOLLOW-1",
                    survey_type="follow_up",
                    status="active",
                ),
                DataForm(
                    id=form_id,
                    organization_id=organization_id,
                    project_id=project_id,
                    survey_id=survey_id,
                    created_by_user_id=manager_user_id,
                    name="Farmer Follow Up",
                    slug="farmer-follow-up",
                    status="published",
                    current_version=1,
                    controls_json={
                        "entity_controls": {
                            "linked_to_entity": True,
                            "entity_type": "Farmer",
                            "creates_new_entity": False,
                            "requires_existing_entity": True,
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
                                "id": "visit",
                                "title": "Visit",
                                "fields": [
                                    {"id": "q_visit_notes", "variable_name": "visit_notes", "type": "text", "label": "Visit notes", "required": True},
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
            organization_slug="follow-up-org",
            organization_name="Follow Up Org",
            roles=["field_officer"],
            permissions=["submission.create", "sync.mobile"],
            scope_type="own",
        )
        with pytest.raises(ValueError, match="Select an existing farmer before syncing this submission."):
            await MobileService(session).upload_submission(
                principal=principal,
                payload=MobileSubmissionUpload(
                    local_id="mobile-follow-up-001",
                    project_id=str(project_id),
                    form_id=str(form_id),
                    form_version_id=str(version_id),
                    entity_type="Farmer",
                    responses=[
                        {"questionId": "q_visit_notes", "variableName": "visit_notes", "value": "Visited the farmer", "updatedAt": now},
                    ],
                    location={"latitude": 5.9, "longitude": 10.1, "accuracy": 8, "timestamp": now},
                    device_id="android-test",
                    app_version="1.0.0-test",
                    created_at=now,
                    submitted_at=now,
                ),
            )


@pytest.mark.asyncio
async def test_mobile_returned_submission_can_be_corrected_and_resubmitted() -> None:
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
                Organization(id=organization_id, name="Correction Org", slug="correction-org"),
                User(id=field_user_id, email="field@example.org", full_name="Field Officer", password_hash="x"),
                User(id=manager_user_id, email="manager@example.org", full_name="Manager", password_hash="x"),
                FieldOfficerProfile(id=officer_id, organization_id=organization_id, user_id=field_user_id, is_active=True),
                Project(id=project_id, organization_id=organization_id, name="Correction Project", slug="correction-project", status="active"),
                Survey(
                    id=survey_id,
                    organization_id=organization_id,
                    project_id=project_id,
                    created_by_user_id=manager_user_id,
                    owner_user_id=manager_user_id,
                    title="Correction Registration",
                    code="COR-REG",
                    survey_type="registration",
                    status="active",
                ),
                DataForm(
                    id=form_id,
                    organization_id=organization_id,
                    project_id=project_id,
                    survey_id=survey_id,
                    created_by_user_id=manager_user_id,
                    name="Correction Farmer Registration",
                    slug="correction-farmer-registration",
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
                                    {"id": "q_name", "variable_name": "entity_name", "type": "text", "label": "Farmer Name", "required": True},
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
            organization_slug="correction-org",
            organization_name="Correction Org",
            roles=["field_officer"],
            permissions=["submission.create", "sync.mobile"],
            scope_type="own",
        )
        first_upload = await MobileService(session).upload_submission(
            principal=principal,
            payload=MobileSubmissionUpload(
                local_id="mobile-correction-001",
                project_id=str(project_id),
                form_id=str(form_id),
                form_version_id=str(version_id),
                entity_type="Farmer",
                responses=[
                    {"questionId": "q_name", "variableName": "entity_name", "value": "Correction Farmer", "updatedAt": now},
                    {"questionId": "q_phone", "variableName": "phone", "value": "677000100", "updatedAt": now},
                    {"questionId": "q_village", "variableName": "village", "value": "Bafut", "updatedAt": now},
                ],
                location={"latitude": 5.9, "longitude": 10.1, "accuracy": 8, "timestamp": now},
                device_id="android-correction-test",
                app_version="1.0.0-test",
                created_at=now,
                submitted_at=now,
            ),
        )
        assert first_upload.status == "synced"

        submission = (await session.execute(select(Submission).where(Submission.client_submission_id == "mobile-correction-001"))).scalar_one()
        submission_id = submission.id
        await SubmissionService(session).review_submission(
            organization_id=organization_id,
            actor_user_id=manager_user_id,
            submission_id=submission.id,
            payload=SubmissionReviewAction(action="request_correction", comment="Fix the phone number before approval."),
        )
        await session.commit()

        returned = await MobileService(session).returned_submissions(principal)
        assert len(returned) == 1
        assert returned[0].id == "mobile-correction-001"
        assert returned[0].review_comments == "Fix the phone number before approval."

        corrected_at = now + timedelta(minutes=15)
        second_upload = await MobileService(session).upload_submission(
            principal=principal,
            payload=MobileSubmissionUpload(
                local_id="mobile-correction-001",
                project_id=str(project_id),
                form_id=str(form_id),
                form_version_id=str(version_id),
                entity_type="Farmer",
                responses=[
                    {"questionId": "q_name", "variableName": "entity_name", "value": "Correction Farmer", "updatedAt": corrected_at},
                    {"questionId": "q_phone", "variableName": "phone", "value": "677000200", "updatedAt": corrected_at},
                    {"questionId": "q_village", "variableName": "village", "value": "Bafut", "updatedAt": corrected_at},
                ],
                location={"latitude": 5.9005, "longitude": 10.1005, "accuracy": 6, "timestamp": corrected_at},
                device_id="android-correction-test",
                app_version="1.0.0-test",
                created_at=corrected_at,
                submitted_at=corrected_at,
            ),
        )
        assert second_upload.status == "synced"
        assert second_upload.server_submission_id == str(submission_id)

        refreshed = await session.get(Submission, submission_id)
        assert refreshed is not None
        assert refreshed.status == "resubmitted"
        assert refreshed.payload_json["phone"] == "677000200"
        assert refreshed.review_comments == "Fix the phone number before approval."

        await SubmissionService(session).review_submission(
            organization_id=organization_id,
            actor_user_id=manager_user_id,
            submission_id=submission_id,
            payload=SubmissionReviewAction(action="approve", comment="Corrected and approved."),
        )
        await session.commit()

        beneficiary = (await session.execute(select(Beneficiary))).scalar_one()
        assert beneficiary.display_name == "Correction Farmer"
        assert beneficiary.phone_number == "677000200"

        approved_submission = await session.get(Submission, submission_id)
        assert approved_submission is not None
        assert approved_submission.status == "approved"
        assert approved_submission.entity_id == beneficiary.id


async def _seed_dedup_environment(
    controls_json: dict[str, object], *, unique_variables: set[str] | None = None
) -> dict[str, object]:
    unique_variables = unique_variables or set()

    def _field(field_id: str, variable: str, field_type: str, label: str, **extra: object) -> dict[str, object]:
        field: dict[str, object] = {"id": field_id, "variable_name": variable, "type": field_type, "label": label, **extra}
        if variable in unique_variables:
            field["validation"] = {"uniqueResponse": True}
        return field

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
                                _field("q_name", "farmer_name", "text", "Farmer Name", required=True),
                                _field("q_phone", "phone", "phone", "Phone"),
                                _field("q_village", "village", "text", "Village"),
                                _field("q_district", "district", "text", "District"),
                                _field("household_members", "household_members", "repeat_group", "Household Members"),
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
async def test_create_submission_flags_unique_response_duplicates() -> None:
    env = await _seed_dedup_environment({}, unique_variables={"phone"})
    session: object = env["session"]
    async with session:
        service = SubmissionService(session)
        first = await service.create_submission(
            organization_id=env["organization_id"],
            actor_user_id=env["field_user_id"],
            payload=_dedup_submission_payload(
                env, client_submission_id="uniq-001", payload={"farmer_name": "Amina", "phone": "677000111"}
            ),
        )
        await session.commit()
        assert first.payload_json.get("_quality_status") != "needs_review"

        # A second submission reusing the same phone (a unique-flagged field) is flagged for review.
        flagged = await service.create_submission(
            organization_id=env["organization_id"],
            actor_user_id=env["field_user_id"],
            payload=_dedup_submission_payload(
                env, client_submission_id="uniq-002", payload={"farmer_name": "Bola", "phone": "677000111"}
            ),
        )
        await session.commit()
        signals = flagged.payload_json.get("_duplicate_field_signals")
        assert isinstance(signals, list) and len(signals) == 1
        assert signals[0]["field"] == "phone"
        assert signals[0]["matched_client_submission_id"] == "uniq-001"
        assert flagged.payload_json.get("_quality_status") == "needs_review"
        assert flagged.payload_json.get("_review_required") is True
        assert any("already recorded" in str(issue) for issue in flagged.payload_json.get("_validation_issues", []))

        # A distinct phone is accepted cleanly.
        clean = await service.create_submission(
            organization_id=env["organization_id"],
            actor_user_id=env["field_user_id"],
            payload=_dedup_submission_payload(
                env, client_submission_id="uniq-003", payload={"farmer_name": "Cira", "phone": "677000222"}
            ),
        )
        await session.commit()
        assert "_duplicate_field_signals" not in clean.payload_json


@pytest.mark.asyncio
async def test_create_submission_derives_month_frequency_period_when_missing() -> None:
    env = await _seed_dedup_environment({"entity_controls": {"submission_frequency": "monthly"}})
    session: object = env["session"]
    async with session:
        beneficiary = Beneficiary(
            id=uuid4(),
            organization_id=env["organization_id"],
            project_id=env["project_id"],
            beneficiary_uid="FRM-FREQ3",
            beneficiary_type="Farmer",
            display_name="Monthly Farmer",
        )
        session.add(beneficiary)
        await session.commit()

        service = SubmissionService(session)
        first_payload = _dedup_submission_payload(
            env,
            client_submission_id="freq-month-001",
            payload={"farmer_name": "Monthly Farmer"},
            entity_id=beneficiary.id,
        )
        first_payload = first_payload.model_copy(
            update={
                "submitted_at": datetime(2026, 6, 4, 10, 0, tzinfo=UTC),
                "captured_at": datetime(2026, 6, 4, 9, 55, tzinfo=UTC),
            }
        )
        first = await service.create_submission(
            organization_id=env["organization_id"],
            actor_user_id=env["field_user_id"],
            payload=first_payload,
        )
        await session.commit()
        assert first.frequency_period == "2026-06"

        second_payload = _dedup_submission_payload(
            env,
            client_submission_id="freq-month-002",
            payload={"farmer_name": "Monthly Farmer"},
            entity_id=beneficiary.id,
        )
        second_payload = second_payload.model_copy(
            update={
                "submitted_at": datetime(2026, 6, 18, 15, 0, tzinfo=UTC),
                "captured_at": datetime(2026, 6, 18, 14, 45, tzinfo=UTC),
            }
        )
        with pytest.raises(CollectionConflictError):
            await service.create_submission(
                organization_id=env["organization_id"],
                actor_user_id=env["field_user_id"],
                payload=second_payload,
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
async def test_web_follow_up_submission_requires_existing_entity_without_explicit_anonymous_flag() -> None:
    env = await _seed_dedup_environment(
        {
            "entity_controls": {
                "linked_to_entity": True,
                "entity_type": "Farmer",
                "creates_new_entity": False,
                "requires_existing_entity": True,
            }
        }
    )
    session: object = env["session"]
    async with session:
        service = SubmissionService(session)
        with pytest.raises(CollectionConflictError, match="Select an existing farmer before submitting this form."):
            await service.create_submission(
                organization_id=env["organization_id"],
                actor_user_id=env["field_user_id"],
                payload=_dedup_submission_payload(
                    env,
                    client_submission_id="followup-missing-entity-001",
                    payload={"farmer_name": "Needs existing entity"},
                ),
            )


@pytest.mark.asyncio
async def test_existing_or_new_submission_without_entity_is_allowed_for_web_submission_flow() -> None:
    env = await _seed_dedup_environment(
        {
            "entity_controls": {
                "linked_to_entity": True,
                "entity_type": "Farmer",
                "creates_new_entity": True,
                "updates_existing_entity": True,
                "requires_existing_entity": False,
                "allows_anonymous": False,
            }
        }
    )
    session: object = env["session"]
    async with session:
        service = SubmissionService(session)
        submission = await service.create_submission(
            organization_id=env["organization_id"],
            actor_user_id=env["field_user_id"],
            payload=_dedup_submission_payload(
                env,
                client_submission_id="existing-or-new-web-001",
                payload={"farmer_name": "Mixed Workflow Person", "village": "Bafut"},
            ),
        )
        await session.commit()

        assert submission.entity_id is None
        assert submission.status == "submitted"


@pytest.mark.asyncio
async def test_approved_follow_up_submission_updates_existing_beneficiary_state() -> None:
    env = await _seed_dedup_environment(
        {
            "entity_controls": {
                "linked_to_entity": True,
                "entity_type": "Farmer",
                "creates_new_entity": False,
                "requires_existing_entity": True,
            }
        }
    )
    session: object = env["session"]
    async with session:
        existing_beneficiary = Beneficiary(
            id=uuid4(),
            organization_id=env["organization_id"],
            project_id=env["project_id"],
            beneficiary_uid="FRM-LINK1",
            beneficiary_type="Farmer",
            display_name="Follow Up Farmer",
            phone_number="+237677000300",
            profile_json={"source": "seed"},
        )
        session.add(existing_beneficiary)
        await session.commit()

        service = SubmissionService(session)
        submission = await service.create_submission(
            organization_id=env["organization_id"],
            actor_user_id=env["field_user_id"],
            payload=_dedup_submission_payload(
                env,
                client_submission_id="followup-linked-001",
                payload={"farmer_name": "Follow Up Farmer", "phone": "+237677000300", "district": "Mezam"},
                entity_id=existing_beneficiary.id,
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

        updated = await session.get(Beneficiary, existing_beneficiary.id)
        assert updated is not None
        assert updated.id == existing_beneficiary.id
        assert updated.last_visit_at == submission.submitted_at
        assert updated.district == "Mezam"
        assert updated.profile_json["lastApprovedSubmissionId"] == str(submission.id)
        assert updated.profile_json["lastApprovedFormId"] == str(env["form_id"])
        assert updated.profile_json["fieldLineage"]["district"]["sourceSubmissionId"] == str(submission.id)


@pytest.mark.asyncio
async def test_submission_approval_creates_mobile_notification_with_submission_reference() -> None:
    env = await _seed_dedup_environment({"entity_controls": {}})
    session: object = env["session"]
    async with session:
        service = SubmissionService(session)
        submission = await service.create_submission(
            organization_id=env["organization_id"],
            actor_user_id=env["field_user_id"],
            payload=_dedup_submission_payload(
                env,
                client_submission_id="notify-approved-001",
                payload={"farmer_name": "Notify Farmer", "phone": "677000555"},
            ),
        )
        await session.commit()

        await service.review_submission(
            organization_id=env["organization_id"],
            actor_user_id=env["manager_user_id"],
            submission_id=submission.id,
            payload=SubmissionReviewAction(action="approve", comment="Approved for mobile follow-up."),
        )
        await session.commit()

        principal = CurrentPrincipal(
            user_id=str(env["field_user_id"]),
            organization_id=str(env["organization_id"]),
            email="field@example.org",
            full_name="Field Officer",
            organization_slug="dedup-org",
            organization_name="Dedup Org",
            roles=["field_officer"],
            permissions=["sync.mobile"],
            scope_type="own",
        )
        notifications = await MobileService(session).notifications(principal)

        assert notifications
        assert notifications[0].title == "Submission approved"
        assert notifications[0].event_type == "submission.approved"
        assert notifications[0].resource_type == "submission"
        assert notifications[0].resource_id == str(submission.id)


@pytest.mark.asyncio
async def test_approved_submission_persists_entity_attribute_values() -> None:
    env = await _seed_dedup_environment(
        {
            "entity_controls": {
                "linked_to_entity": True,
                "entity_type": "Farmer",
                "creates_new_entity": True,
                "requires_existing_entity": False,
            }
        }
    )
    session: object = env["session"]
    async with session:
        category_id = uuid4()
        attribute_id = uuid4()
        session.add_all(
            [
                EntityCategory(
                    id=category_id,
                    organization_id=env["organization_id"],
                    project_id=env["project_id"],
                    name="Farmer",
                    slug="farmer",
                ),
                EntityAttribute(
                    id=attribute_id,
                    organization_id=env["organization_id"],
                    category_id=category_id,
                    label="Plot Code",
                    field_key="plot_code",
                    field_type="text",
                ),
            ]
        )
        form = await session.get(DataForm, env["form_id"])
        assert form is not None
        form.controls_json = {
            "entity_controls": {
                **form.controls_json["entity_controls"],
                "entity_category_id": str(category_id),
            }
        }
        await session.commit()

        service = SubmissionService(session)
        submission = await service.create_submission(
            organization_id=env["organization_id"],
            actor_user_id=env["field_user_id"],
            payload=_dedup_submission_payload(
                env,
                client_submission_id="attr-001",
                payload={"farmer_name": "Attribute Farmer", "plot_code": "PLOT-9"},
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

        value = (await session.execute(select(EntityAttributeValue))).scalar_one()
        assert value.entity_id == submission.entity_id
        assert value.attribute_id == attribute_id
        assert value.source_submission_id == submission.id
        assert value.value_json["value"] == "PLOT-9"
        assert value.value_json["sourceClientSubmissionId"] == "attr-001"


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
async def test_create_submission_with_repeat_group_variable_name_persists_repeat_rows() -> None:
    env = await _seed_dedup_environment({"entity_controls": {}})
    session: object = env["session"]
    async with session:
        version = await session.scalar(select(DataFormVersion).where(DataFormVersion.form_id == env["form_id"]))
        assert version is not None
        schema_json = dict(version.schema_json)
        sections = list(schema_json["sections"])
        section = dict(sections[0])
        fields = list(section["fields"])
        repeat_field = dict(fields[-1])
        repeat_field["id"] = "q_household_members"
        repeat_field["variable_name"] = "household_members"
        fields[-1] = repeat_field
        section["fields"] = fields
        sections[0] = section
        schema_json["sections"] = sections
        version.schema_json = schema_json
        await session.commit()

        service = SubmissionService(session)
        submission = await service.create_submission(
            organization_id=env["organization_id"],
            actor_user_id=env["field_user_id"],
            payload=_dedup_submission_payload(
                env,
                client_submission_id="repeat-variable-001",
                payload={
                    "farmer_name": "Variable Household Head",
                    "household_members": [{"member_name": "Member One", "age": 12}],
                },
            ),
        )
        await session.commit()

        rows = await service.list_repeat_rows(
            organization_id=env["organization_id"],
            submission_id=submission.id,
        )
        assert len(rows) == 1
        assert rows[0].field_id == "q_household_members"
        assert rows[0].row_json == {"member_name": "Member One", "age": 12}


@pytest.mark.asyncio
async def test_mobile_submission_upload_persists_repeat_group_rows() -> None:
    env = await _seed_dedup_environment({"entity_controls": {}})
    session: object = env["session"]
    async with session:
        version = await session.scalar(select(DataFormVersion).where(DataFormVersion.form_id == env["form_id"]))
        assert version is not None
        schema_json = dict(version.schema_json)
        sections = list(schema_json["sections"])
        section = dict(sections[0])
        fields = list(section["fields"])
        repeat_field = dict(fields[-1])
        repeat_field["id"] = "q_household_members"
        repeat_field["variable_name"] = "household_members"
        fields[-1] = repeat_field
        section["fields"] = fields
        sections[0] = section
        schema_json["sections"] = sections
        version.schema_json = schema_json
        await session.commit()

        principal = CurrentPrincipal(
            user_id=str(env["field_user_id"]),
            organization_id=str(env["organization_id"]),
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
                local_id="mobile-repeat-001",
                project_id=str(env["project_id"]),
                form_id=str(env["form_id"]),
                form_version_id=str(version.id),
                entity_type="Farmer",
                responses=[
                    {"questionId": "q_name", "variableName": "farmer_name", "value": "Repeat Farmer", "updatedAt": env["now"]},
                    {
                        "questionId": "q_household_members",
                        "variableName": "household_members",
                        "value": [{"member_name": "Mobile Member", "age": 9}],
                        "updatedAt": env["now"],
                    },
                ],
                location={"latitude": 5.9, "longitude": 10.1, "accuracy": 8, "timestamp": env["now"]},
                device_id="android-repeat-test",
                app_version="1.0.0-test",
                created_at=env["now"],
                submitted_at=env["now"],
            ),
        )
        assert uploaded.status == "synced"

        submission = await session.get(Submission, UUID(uploaded.server_submission_id))
        assert submission is not None
        assert submission.payload_json["q_household_members"] == [{"member_name": "Mobile Member", "age": 9}]
        assert submission.payload_json["household_members"] == [{"member_name": "Mobile Member", "age": 9}]

        rows = await SubmissionService(session).list_repeat_rows(
            organization_id=env["organization_id"],
            submission_id=submission.id,
        )
        assert len(rows) == 1
        assert rows[0].field_id == "q_household_members"
        assert rows[0].row_json == {"member_name": "Mobile Member", "age": 9}


@pytest.mark.asyncio
async def test_repeat_group_child_controls_create_data_quality_signals() -> None:
    env = await _seed_dedup_environment({"entity_controls": {}})
    session: object = env["session"]
    async with session:
        version = await session.scalar(select(DataFormVersion).where(DataFormVersion.form_id == env["form_id"]))
        assert version is not None
        schema_json = dict(version.schema_json)
        sections = list(schema_json["sections"])
        section = dict(sections[0])
        fields = list(section["fields"])
        repeat_field = dict(fields[-1])
        repeat_field["children"] = [
            {
                "id": "member_photo",
                "variable_name": "member_photo",
                "type": "photo",
                "label": "Member Photo",
                "appearance": {"helpText": "[photo-evidence]"},
            },
            {
                "id": "member_consent",
                "variable_name": "member_consent",
                "type": "consent",
                "label": "Member Consent",
                "appearance": {"helpText": "[consent-required]"},
            },
            {
                "id": "member_id",
                "variable_name": "member_id",
                "type": "text",
                "label": "Member ID",
                "appearance": {"helpText": "[sensitivity:pii]"},
            },
        ]
        fields[-1] = repeat_field
        section["fields"] = fields
        sections[0] = section
        schema_json["sections"] = sections
        version.schema_json = schema_json
        await session.commit()

        service = SubmissionService(session)
        submission = await service.create_submission(
            organization_id=env["organization_id"],
            actor_user_id=env["field_user_id"],
            payload=_dedup_submission_payload(
                env,
                client_submission_id="repeat-quality-001",
                payload={
                    "farmer_name": "Quality Household Head",
                    "household_members": [{"member_photo": "", "member_consent": "", "member_id": "ID-001"}],
                },
            ),
        )
        await session.commit()

        signals = (
            await session.execute(
                select(DataQualitySignal.signal_type, DataQualitySignal.evidence_json).where(
                    DataQualitySignal.submission_id == submission.id
                )
            )
        ).all()

        assert {signal_type for signal_type, _ in signals} >= {
            "photo_evidence_missing",
            "consent_missing",
            "privacy_masking_missing",
        }
        labels = {evidence["label"] for _, evidence in signals if "label" in evidence}
        assert "Household Members row 1: Member Photo" in labels
        assert "Household Members row 1: Member Consent" in labels
        assert "Household Members row 1: Member ID" in labels


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
async def test_field_officer_visit_request_syncs_for_supervisor_approval_and_check_in() -> None:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        organization_id = uuid4()
        field_user_id = uuid4()
        supervisor_user_id = uuid4()
        project_id = uuid4()
        officer_id = uuid4()
        start_at = datetime(2026, 6, 20, 8, 0, tzinfo=UTC)
        end_at = datetime(2026, 6, 20, 12, 0, tzinfo=UTC)
        session.add_all(
            [
                Organization(id=organization_id, name="Visit Org", slug="visit-org"),
                User(id=field_user_id, email="visit-field@example.org", full_name="Visit Field", password_hash="x"),
                User(id=supervisor_user_id, email="visit-supervisor@example.org", full_name="Visit Supervisor", password_hash="x"),
                FieldOfficerProfile(
                    id=officer_id,
                    organization_id=organization_id,
                    user_id=field_user_id,
                    supervisor_user_id=supervisor_user_id,
                    is_active=True,
                ),
                Project(id=project_id, organization_id=organization_id, name="Visit Project", slug="visit-project", status="active"),
            ]
        )
        await session.flush()

        service = OperationsService(session)
        requested = await service.create_field_visit_request(
            organization_id=organization_id,
            actor_user_id=field_user_id,
            payload=FieldVisitRequestCreate(
                project_id=project_id,
                title="Visit Store A",
                activity_scope="project",
                purpose="Verify inventory count and speak with store manager.",
                location_name="Store A",
                latitude=5.9,
                longitude=10.1,
                requested_start_at=start_at,
                requested_end_at=end_at,
            ),
        )
        assert requested.status == "pending"
        assert requested.supervisor_user_id == supervisor_user_id

        supervisor_queue = await service.list_field_visit_requests(
            organization_id=organization_id,
            actor_user_id=supervisor_user_id,
            actor_roles=["district_supervisor"],
        )
        assert [visit.id for visit in supervisor_queue] == [requested.id]

        approved = await service.review_field_visit_request(
            organization_id=organization_id,
            actor_user_id=supervisor_user_id,
            visit_request_id=requested.id,
            payload=FieldVisitRequestReview(action="approve", comment="Approved for morning visit."),
            actor_roles=["district_supervisor"],
        )
        assert approved.status == "approved"
        assert approved.reviewed_by_user_id == supervisor_user_id

        checked_in = await service.check_in_field_visit_request(
            organization_id=organization_id,
            actor_user_id=field_user_id,
            visit_request_id=requested.id,
            payload=FieldVisitCheckIn(latitude=5.9002, longitude=10.1002, accuracy=12, timestamp=start_at),
        )
        assert checked_in.status == "checked_in"
        assert checked_in.verification_status == "verified"
        assert checked_in.check_in_latitude == 5.9002
        assert checked_in.distance_from_planned_meters is not None

        audit_result = await session.execute(
            select(AuditLog).where(
                AuditLog.organization_id == organization_id,
                AuditLog.resource_type == "field_visit_request",
            )
        )
        assert [log.action for log in audit_result.scalars()] == [
            "field_visit.request_submitted",
            "field_visit.request_approved",
            "field_visit.checked_in",
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


@pytest.mark.asyncio
async def test_beneficiary_update_corrects_profile_with_audited_reason() -> None:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        organization_id = uuid4()
        actor_user_id = uuid4()
        session.add_all(
            [
                Organization(id=organization_id, name="Registry Org", slug="registry-org"),
                User(id=actor_user_id, email="registry-manager@example.org", full_name="Registry Manager", password_hash="x"),
            ]
        )
        beneficiary = Beneficiary(
            organization_id=organization_id,
            beneficiary_uid="FRM-2026-000001",
            beneficiary_type="Farmer",
            display_name="Amadou Bello",
            phone_number="+237 600 000 001",
            region="Northwest",
            enrollment_status="active",
        )
        session.add(beneficiary)
        await session.flush()

        service = OperationsService(session)
        updated = await service.update_beneficiary(
            organization_id,
            beneficiary.id,
            BeneficiaryUpdate(
                reason="Household relocated after verification visit",
                phone_number="+237 600 000 099",
                region="West",
                enrollment_status="moved",
            ),
            actor_user_id,
        )
        assert updated.phone_number == "+237 600 000 099"
        assert updated.region == "West"
        assert updated.enrollment_status == "moved"
        assert updated.beneficiary_uid == "FRM-2026-000001"
        assert updated.display_name == "Amadou Bello"

        with pytest.raises(ValidationError):
            BeneficiaryUpdate(reason="Bad status", enrollment_status="vanished")

        with pytest.raises(LookupError):
            await service.update_beneficiary(
                organization_id,
                uuid4(),
                BeneficiaryUpdate(reason="Missing entity", region="West"),
                actor_user_id,
            )

        audit_result = await session.execute(
            select(AuditLog).where(
                AuditLog.organization_id == organization_id,
                AuditLog.resource_type == "beneficiary",
            )
        )
        logs = list(audit_result.scalars())
        assert [log.action for log in logs] == ["beneficiary.updated"]
        assert "Household relocated" in logs[0].metadata_json
        assert "enrollment_status" in logs[0].metadata_json


@pytest.mark.asyncio
async def test_profile_update_proposal_review_applies_lineage_and_resolves_signal() -> None:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        organization_id = uuid4()
        actor_user_id = uuid4()
        submission_id = uuid4()
        form_id = uuid4()
        officer_id = uuid4()
        now = datetime.now(UTC)
        session.add_all(
            [
                Organization(id=organization_id, name="Proposal Org", slug="proposal-org"),
                User(id=actor_user_id, email="proposal-manager@example.org", full_name="Proposal Manager", password_hash="x"),
            ]
        )
        beneficiary = Beneficiary(
            organization_id=organization_id,
            project_id=uuid4(),
            beneficiary_uid="FRM-2026-000010",
            beneficiary_type="Farmer",
            display_name="Alice Nfor",
            phone_number="+237 600 000 010",
            profile_json={
                "profileUpdateProposals": [
                    {
                        "submissionId": str(submission_id),
                        "clientSubmissionId": "mob-followup-001",
                        "status": "pending_review",
                        "changes": {
                            "phone_number": {
                                "current": "+237 600 000 010",
                                "proposed": "+237 600 000 099",
                            }
                        },
                    }
                ]
            },
        )
        session.add(beneficiary)
        await session.flush()

        session.add(
            Submission(
                id=submission_id,
                organization_id=organization_id,
                project_id=beneficiary.project_id,
                form_id=form_id,
                form_version_id=uuid4(),
                field_officer_id=officer_id,
                entity_id=beneficiary.id,
                client_submission_id="mob-followup-001",
                status="approved",
                payload_json={"phone_number": "+237 600 000 099"},
                device_id="android-test",
                captured_at=now,
                submitted_at=now,
                approved_at=now,
                sync_received_at=now,
                latitude=5.96,
                longitude=10.16,
                location_captured_at=now,
            )
        )
        session.add(
            DataQualitySignal(
                organization_id=organization_id,
                submission_id=submission_id,
                beneficiary_id=beneficiary.id,
                signal_type="profile_conflict",
                severity="medium",
                confidence=0.88,
                summary="Submitted phone conflicts with official profile.",
                status="open",
                evidence_json={"statusHistory": []},
            )
        )
        await session.commit()

        service = OperationsService(session)
        updated = await service.review_beneficiary_profile_update_proposal(
            organization_id,
            beneficiary.id,
            BeneficiaryProfileUpdateProposalReview(
                submission_id=submission_id,
                action="approve",
                comment="Verified during follow-up review.",
            ),
            actor_user_id,
        )
        await session.commit()

        assert updated.phone_number == "+237 600 000 099"
        lineage = updated.profile_json["fieldLineage"]["phone_number"]
        assert lineage["sourceSubmissionId"] == str(submission_id)
        assert lineage["sourceClientSubmissionId"] == "mob-followup-001"

        proposal = updated.profile_json["profileUpdateProposals"][0]
        assert proposal["status"] == "approved"
        assert proposal["reviewComment"] == "Verified during follow-up review."
        assert proposal["appliedFields"] == ["phone_number"]

        signal = (await session.execute(select(DataQualitySignal))).scalar_one()
        assert signal.status == "resolved"
        assert signal.evidence_json["statusHistory"][-1]["proposalAction"] == "approve"

        audit_result = await session.execute(
            select(AuditLog).where(
                AuditLog.organization_id == organization_id,
                AuditLog.resource_type == "beneficiary",
            )
        )
        logs = list(audit_result.scalars())
        assert [log.action for log in logs] == ["beneficiary.profile_update_proposal_approved"]


@pytest.mark.asyncio
async def test_profile_update_proposal_reject_keeps_official_value_and_resolves_signal() -> None:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        organization_id = uuid4()
        actor_user_id = uuid4()
        submission_id = uuid4()
        form_id = uuid4()
        officer_id = uuid4()
        now = datetime.now(UTC)
        session.add_all(
            [
                Organization(id=organization_id, name="Proposal Reject Org", slug="proposal-reject-org"),
                User(id=actor_user_id, email="proposal-reviewer@example.org", full_name="Proposal Reviewer", password_hash="x"),
            ]
        )
        beneficiary = Beneficiary(
            organization_id=organization_id,
            project_id=uuid4(),
            beneficiary_uid="FRM-2026-000011",
            beneficiary_type="Farmer",
            display_name="Binta Taku",
            phone_number="+237 600 000 011",
            profile_json={
                "profileUpdateProposals": [
                    {
                        "submissionId": str(submission_id),
                        "clientSubmissionId": "mob-followup-002",
                        "status": "pending_review",
                        "changes": {
                            "phone_number": {
                                "current": "+237 600 000 011",
                                "proposed": "+237 600 000 199",
                            }
                        },
                    }
                ]
            },
        )
        session.add(beneficiary)
        await session.flush()

        session.add(
            Submission(
                id=submission_id,
                organization_id=organization_id,
                project_id=beneficiary.project_id,
                form_id=form_id,
                form_version_id=uuid4(),
                field_officer_id=officer_id,
                entity_id=beneficiary.id,
                client_submission_id="mob-followup-002",
                status="approved",
                payload_json={"phone_number": "+237 600 000 199"},
                device_id="android-test",
                captured_at=now,
                submitted_at=now,
                approved_at=now,
                sync_received_at=now,
                latitude=5.96,
                longitude=10.16,
                location_captured_at=now,
            )
        )
        session.add(
            DataQualitySignal(
                organization_id=organization_id,
                submission_id=submission_id,
                beneficiary_id=beneficiary.id,
                signal_type="profile_conflict",
                severity="medium",
                confidence=0.82,
                summary="Submitted phone conflicts with official profile.",
                status="open",
                evidence_json={"statusHistory": []},
            )
        )
        await session.commit()

        service = OperationsService(session)
        updated = await service.review_beneficiary_profile_update_proposal(
            organization_id,
            beneficiary.id,
            BeneficiaryProfileUpdateProposalReview(
                submission_id=submission_id,
                action="reject",
                comment="Rejected after confirming the official contact number is still valid.",
            ),
            actor_user_id,
        )
        await session.commit()

        assert updated.phone_number == "+237 600 000 011"
        proposal = updated.profile_json["profileUpdateProposals"][0]
        assert proposal["status"] == "rejected"
        assert proposal["reviewComment"] == "Rejected after confirming the official contact number is still valid."
        assert "appliedFields" not in proposal

        signal = (await session.execute(select(DataQualitySignal))).scalar_one()
        assert signal.status == "resolved"
        assert signal.evidence_json["statusHistory"][-1]["proposalAction"] == "reject"

        audit_result = await session.execute(
            select(AuditLog).where(
                AuditLog.organization_id == organization_id,
                AuditLog.resource_type == "beneficiary",
            )
        )
        logs = list(audit_result.scalars())
        assert [log.action for log in logs] == ["beneficiary.profile_update_proposal_rejected"]


@pytest.mark.asyncio
async def test_import_form_rows_rejected_for_draft_form() -> None:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        organization_id = uuid4()
        actor_user_id = uuid4()
        form_id = uuid4()
        session.add_all(
            [
                Organization(id=organization_id, name="Draft Org", slug="draft-org"),
                User(id=actor_user_id, email="owner@example.org", full_name="Owner", password_hash="x"),
                DataForm(
                    id=form_id,
                    organization_id=organization_id,
                    created_by_user_id=actor_user_id,
                    name="Unpublished Survey",
                    slug="unpublished-survey",
                    status="draft",
                    current_version=1,
                ),
            ]
        )
        await session.commit()

        service = SubmissionService(session)
        # Draft forms must not accept uploaded data — only published forms can.
        with pytest.raises(InvalidWorkflowTransitionError):
            await service.import_form_rows(
                organization_id=organization_id,
                actor_user_id=actor_user_id,
                form_id=form_id,
                payload=FormDataImportRequest(
                    rows=[{"farmer_name": "Should Fail"}],
                    source_name="draft.csv",
                    source_system="Form spreadsheet upload",
                    import_reason="Should be rejected",
                ),
            )
    await engine.dispose()


@pytest.mark.asyncio
async def test_return_imported_form_rows_sends_staged_rows_back_to_source() -> None:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        organization_id = uuid4()
        actor_user_id = uuid4()
        form_id = uuid4()
        version_id = uuid4()
        session.add_all(
            [
                Organization(id=organization_id, name="Return Org", slug="return-org"),
                User(id=actor_user_id, email="manager@example.org", full_name="Manager", password_hash="x"),
                DataForm(
                    id=form_id,
                    organization_id=organization_id,
                    created_by_user_id=actor_user_id,
                    name="Survey",
                    slug="survey",
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
                                "id": "s",
                                "title": "S",
                                "fields": [
                                    {"id": "full_name", "variable_name": "full_name", "type": "text", "label": "Full Name", "required": True},
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
                rows=[{"full_name": "Needs Fixing"}],
                source_name="x.csv",
                source_system="Form spreadsheet upload",
                import_reason="t",
            ),
        )
        await session.commit()
        submission_id = imported.submissions[0].id

        result = await service.return_imported_form_rows(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            form_id=form_id,
            payload=FormDataImportReturnRequest(submission_ids=[submission_id], comment="Fix the name field"),
        )
        await session.commit()

        assert result.returned_rows == 1
        assert result.skipped_rows == 0
        listed = await service.list_submissions(organization_id=organization_id)
        row = next(item for item in listed if item.id == submission_id)
        assert row.status == "correction_requested"
        assert row.payload_json["_quality_status"] == "returned_to_source"
        assert row.payload_json["_returned_to_source_comment"] == "Fix the name field"
    await engine.dispose()


@pytest.mark.asyncio
async def test_import_form_rows_flags_possible_duplicates() -> None:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        organization_id = uuid4()
        actor_user_id = uuid4()
        form_id = uuid4()
        version_id = uuid4()
        session.add_all(
            [
                Organization(id=organization_id, name="Dup Org", slug="dup-org"),
                User(id=actor_user_id, email="m@example.org", full_name="Manager", password_hash="x"),
                DataForm(
                    id=form_id,
                    organization_id=organization_id,
                    created_by_user_id=actor_user_id,
                    name="Registry",
                    slug="registry",
                    status="published",
                    current_version=1,
                    controls_json={"governance": {"duplicate_detection_fields": ["full_name"]}},
                ),
                DataFormVersion(
                    id=version_id,
                    organization_id=organization_id,
                    form_id=form_id,
                    version=1,
                    schema_json={
                        "sections": [
                            {
                                "id": "s",
                                "title": "S",
                                "fields": [
                                    {"id": "full_name", "variable_name": "full_name", "type": "text", "label": "Full Name", "required": True},
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
                rows=[{"full_name": "Amina Bello"}, {"full_name": "Amina Bello"}],
                source_name="dups.csv",
                source_system="Form spreadsheet upload",
                import_reason="t",
            ),
        )
        await session.commit()

        # The second identical row is flagged as a possible duplicate of the first.
        assert any(issue.issue_type == "possible_duplicate" for issue in imported.issues)
        listed = await service.list_submissions(organization_id=organization_id)
        flagged = [row for row in listed if row.payload_json.get("_duplicate_submission_signal")]
        assert len(flagged) == 1
        assert flagged[0].payload_json["_quality_status"] == "needs_review"
    await engine.dispose()


def test_collect_repeat_entries_flattens_nested_repeats() -> None:
    from app.schemas.collection import FormField
    from app.services.collection import _collect_repeat_entries

    members = FormField(
        id="members",
        type="repeat_group",
        label="Members",
        variable_name="members",
        children=[
            FormField(id="m_name", type="text", label="Name", variable_name="m_name"),
            FormField(
                id="visits",
                type="repeat_group",
                label="Visits",
                variable_name="visits",
                children=[FormField(id="v_date", type="date", label="Date", variable_name="v_date")],
            ),
        ],
    )
    payload = {
        "members": [
            {"m_name": "Ama", "visits": [{"v_date": "2026-01-01"}, {"v_date": "2026-02-01"}]},
            {"m_name": "Kofi", "visits": []},
        ]
    }
    entries = _collect_repeat_entries([members], payload, "sub-1")

    member_rows = [e for e in entries if e["field_id"] == "members"]
    visit_rows = [e for e in entries if e["field_id"] == "visits"]
    assert len(member_rows) == 2
    assert {e["parent_submission_key"] for e in member_rows} == {"sub-1"}
    # Nested visit rows hang off the first member's chained key.
    assert len(visit_rows) == 2
    assert all(e["parent_submission_key"] == "sub-1:members:0" for e in visit_rows)
    assert {e["row_index"] for e in visit_rows} == {0, 1}


def test_form_schema_preserves_builder_field_config() -> None:
    """Logic, selection, subform, lookup, gps, and media config must survive a save round-trip —
    pydantic must not drop builder-authored keys (regression for silent feature loss)."""
    from app.schemas.collection import FormSchema

    raw = {
        "sections": [
            {
                "id": "s1",
                "title": "S1",
                "fields": [
                    {
                        "id": "q1",
                        "type": "select",
                        "label": "Q1",
                        "variable_name": "q1",
                        "logic": [{"id": "r1", "kind": "show", "expression": "IF ${x} = 'y'"}],
                        "selection": {"source": "record", "recordSource": "form", "recordFormId": "f2"},
                        "subform": {"mode": "embed"},
                        "lookup": {"source": "entities"},
                        "gps": {"latitude": True},
                    }
                ],
            }
        ]
    }
    field = FormSchema(**raw).model_dump(mode="json")["sections"][0]["fields"][0]
    for key in ("logic", "selection", "subform", "lookup", "gps"):
        assert key in field, f"{key} was dropped on save"
