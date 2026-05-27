from uuid import uuid4

from pydantic import ValidationError

from app.core.permissions import Permission, permissions_for_roles
from app.models.operations import MonitoringIndicator
from app.schemas.operations import BeneficiaryCreate, CaseCreate, IndicatorCreate
from app.services.operations import indicator_progress


def test_me_permissions_are_role_scoped() -> None:
    admin_permissions = permissions_for_roles(["organization_admin"])
    officer_permissions = permissions_for_roles(["field_officer"])

    assert Permission.BENEFICIARY_MANAGE in admin_permissions
    assert Permission.PROGRAM_MANAGE in admin_permissions
    assert Permission.REPORT_MANAGE in admin_permissions
    assert Permission.BENEFICIARY_READ in officer_permissions
    assert Permission.REPORT_MANAGE not in officer_permissions


def test_beneficiary_requires_complete_location_pair() -> None:
    with_location = BeneficiaryCreate(
        beneficiary_uid="HH-001",
        beneficiary_type="household",
        display_name="Amina household",
        latitude=5.4,
        longitude=10.1,
    )

    assert with_location.latitude == 5.4

    with_bad_location = {
        "beneficiary_uid": "HH-002",
        "beneficiary_type": "household",
        "display_name": "Incomplete location",
        "latitude": 5.4,
    }
    try:
        BeneficiaryCreate.model_validate(with_bad_location)
    except ValidationError as exc:
        assert "latitude and longitude" in str(exc)
    else:  # pragma: no cover - defensive assertion
        raise AssertionError("expected location validation failure")


def test_indicator_progress_is_capped_and_readable() -> None:
    indicator = MonitoringIndicator(
        organization_id=uuid4(),
        code="AG.YIELD",
        name="Average crop yield",
        baseline_value=10,
        target_value=30,
        current_value=18,
    )

    assert indicator_progress(indicator) == 40
    indicator.current_value = 40
    assert indicator_progress(indicator) == 100


def test_indicator_and_case_payloads_use_plain_english_fields() -> None:
    indicator = IndicatorCreate(
        code="HEALTH.VACCINATION",
        name="Children vaccinated",
        reporting_frequency="quarterly",
        baseline_value=30,
        target_value=90,
        current_value=58,
    )
    case = CaseCreate(case_number="CASE-001", case_type="complaint", title="Follow up on missing support")

    assert indicator.name == "Children vaccinated"
    assert case.status == "open"
