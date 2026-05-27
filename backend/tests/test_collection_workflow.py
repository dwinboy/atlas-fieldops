from datetime import UTC, datetime
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.core.permissions import Permission, permissions_for_roles
from app.schemas.collection import DataFormCreate, SubmissionCreate, SubmissionReviewAction


def test_enterprise_roles_have_collection_permissions() -> None:
    admin_permissions = permissions_for_roles(["organization_admin"])
    officer_permissions = permissions_for_roles(["field_officer"])

    assert Permission.FORM_MANAGE in admin_permissions
    assert Permission.OFFICER_MANAGE in admin_permissions
    assert Permission.SUBMISSION_REVIEW in admin_permissions
    assert Permission.SYNC_MOBILE in officer_permissions
    assert Permission.SUBMISSION_REVIEW not in officer_permissions


def test_form_schema_accepts_offline_supported_field_types() -> None:
    payload = DataFormCreate.model_validate(
        {
            "name": "Farmer onboarding",
            "slug": "farmer-onboarding",
            "publish": True,
            "schema": {
                "default_language": "en",
                "languages": ["en", "fr"],
                "sections": [
                    {
                        "id": "identity",
                        "title": {"en": "Identity"},
                        "fields": [
                            {"id": "name", "type": "text", "label": {"en": "Name"}, "required": True},
                            {"id": "farm_gps", "type": "gps", "label": {"en": "Farm GPS"}, "required": True},
                            {"id": "signature", "type": "signature", "label": {"en": "Signature"}},
                        ],
                    }
                ],
            },
        }
    )

    assert payload.form_schema.sections[0].fields[1].type == "gps"
    assert payload.publish is True


def test_form_schema_rejects_unsupported_field_types() -> None:
    with pytest.raises(ValidationError, match="Unsupported field type"):
        DataFormCreate.model_validate(
            {
                "name": "Bad form",
                "slug": "bad-form",
                "schema": {
                    "sections": [
                        {
                            "id": "main",
                            "title": {"en": "Main"},
                            "fields": [{"id": "custom", "type": "unsafe_plugin", "label": {"en": "Custom"}}],
                        }
                    ]
                },
            }
        )


def test_submission_requires_server_enforced_gps_and_device_metadata() -> None:
    now = datetime.now(UTC)
    submission = SubmissionCreate(
        client_submission_id="device-001-0001",
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
    assert submission.location.latitude == 5.9631


def test_submission_review_actions_are_limited_to_workflow_events() -> None:
    assert SubmissionReviewAction(action="request_correction", comment="Photo is missing").action == "request_correction"

    with pytest.raises(ValidationError):
        SubmissionReviewAction(action="delete", comment="Nope")
