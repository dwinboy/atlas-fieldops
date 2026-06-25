from pydantic import ValidationError

from app.schemas.administration import BackupJobCreate, FeatureFlagUpsert, LocationCreate, RecoveryJobCreate
from app.schemas.organization_governance import TeamCreate, TeamUpdate, WorkforceProfileUpdate
from app.services.administration import api_key_material, slugify


def test_administration_slugify_creates_stable_keys() -> None:
    assert slugify("Facility Types") == "facility-types"
    assert slugify("  API & Integration Settings  ") == "api-integration-settings"


def test_api_key_material_never_exposes_hash_as_prefix() -> None:
    secret, prefix, digest = api_key_material()

    assert secret.startswith("afops_")
    assert secret.startswith(prefix)
    assert len(prefix) == 16
    assert digest != secret
    assert len(digest) == 64


def test_location_payload_validates_coordinates_and_normalizes_code() -> None:
    payload = LocationCreate(name="Cameroon", code=" cmr ", latitude=5.3, longitude=10.1)

    assert payload.code == "CMR"

    try:
        LocationCreate(name="Bad latitude", code="BAD", latitude=500)
    except ValidationError as exc:
        assert "less than or equal to 90" in str(exc)
    else:  # pragma: no cover - defensive assertion
        raise AssertionError("expected invalid latitude validation failure")


def test_feature_flag_rollout_must_be_valid_percentage() -> None:
    enabled = FeatureFlagUpsert(flag_key="mapping", label="Mapping", enabled=True, rollout_percentage=50)

    assert enabled.rollout_percentage == 50

    try:
        FeatureFlagUpsert(flag_key="mapping", label="Mapping", rollout_percentage=200)
    except ValidationError as exc:
        assert "less than or equal to 100" in str(exc)
    else:  # pragma: no cover - defensive assertion
        raise AssertionError("expected rollout validation failure")


def test_team_payload_normalizes_codes_for_governance_workflows() -> None:
    payload = TeamCreate(name="North West Team", code=" TEAM NORTH WEST ")
    updated = TeamUpdate(code="TEAM-NW")

    assert payload.code == "team-north-west"
    assert updated.code == "team-nw"


def test_backup_and_recovery_payloads_protect_high_risk_operations() -> None:
    backup = BackupJobCreate(backup_type="Database Backup", retention_days=90)
    recovery = RecoveryJobCreate(reason="Restore is required for disaster recovery testing.")

    assert backup.retention_days == 90
    assert recovery.reason.startswith("Restore")

    try:
        RecoveryJobCreate(reason="too short")
    except ValidationError as exc:
        assert "String should have at least 10 characters" in str(exc)
    else:  # pragma: no cover - defensive assertion
        raise AssertionError("expected restore reason validation failure")


def test_workforce_profile_update_accepts_supervisor_and_team_changes() -> None:
    payload = WorkforceProfileUpdate(job_title="District Supervisor", team_id=None, supervisor_user_id=None)

    assert payload.job_title == "District Supervisor"
