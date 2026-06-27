"""Lock the backend field-type registry to the behaviour it replaced, proving zero drift."""

import re
from pathlib import Path

import pytest

from app.field_types import (
    SUPPORTED_FIELD_TYPES,
    field_behavior_tags,
    mobile_input_mode,
    mobile_runtime_type,
)


def _frontend_field_types() -> set[str]:
    """Read the authoring `FieldType` union from the frontend so the cross-layer contract test can
    detect drift between the two registries. Returns an empty set if the frontend isn't present
    (e.g. backend-only checkout) so the guard never fails the build spuriously."""
    root = Path(__file__).resolve()
    forms_ts = next(
        (
            candidate
            for parent in root.parents
            if (candidate := parent / "frontend" / "src" / "lib" / "forms.ts").exists()
        ),
        None,
    )
    if forms_ts is None:
        return set()
    text = forms_ts.read_text(encoding="utf-8")
    match = re.search(r"export type FieldType =(.*?);", text, flags=re.DOTALL)
    if match is None:
        return set()
    return set(re.findall(r'"([a-z_]+)"', match.group(1)))

# The exact offline-safe allowlist that lived inline in FormSchema.ensure_offline_safe_fields before
# it was derived from the registry. If the registry diverges from this, the test fails on purpose.
_PREVIOUS_ALLOWLIST = {
    "text", "textarea", "number", "decimal", "currency", "phone", "email", "url", "password",
    "select", "dropdown", "multiselect", "radio", "checkbox", "consent", "ranking", "likert",
    "matrix_single", "matrix_multi", "nps", "rating", "gps", "geolocation", "map", "geofence",
    "polygon", "photo", "image", "signature", "barcode", "qr", "audio", "video", "file", "date",
    "time", "datetime", "hidden", "repeat_group", "repeatable_group", "calculated", "grid", "lookup",
    "subform", "auto_id", "month", "day_of_week", "path", "pdf", "scan_document", "fingerprint",
    "article", "user_select", "org_select", "percentage", "yes_no", "counter", "date_range",
    "measurement", "constant_sum", "slider",
}

# The runtime mapping exactly as it was in the inline _mobile_question_type dict.
_PREVIOUS_RUNTIME = {
    "text": "Text", "textarea": "LongText", "number": "Number", "decimal": "Decimal",
    "currency": "Currency", "date": "Date", "time": "Time", "datetime": "DateTime",
    "select": "SingleSelect", "radio": "SingleSelect", "dropdown": "Dropdown",
    "multiselect": "MultiSelect", "checkbox": "MultiSelect", "likert": "SingleSelect", "gps": "GPS",
    "geolocation": "GPS", "map": "GPS", "geofence": "GPS", "photo": "Photo", "image": "Photo",
    "audio": "Audio", "video": "Video", "file": "FileUpload", "signature": "Signature",
    "barcode": "Barcode", "qr": "QRCode", "consent": "Consent", "calculated": "CalculatedField",
    "repeat_group": "RepeatGroup", "repeatable_group": "RepeatGroup", "subform": "RepeatGroup",
    "matrix_single": "Matrix", "matrix_multi": "Matrix", "grid": "Matrix", "ranking": "Ranking",
    "nps": "Nps", "rating": "Rating", "hidden": "Hidden", "polygon": "Polygon", "path": "Polygon",
    "lookup": "Lookup", "user_select": "Lookup", "org_select": "Lookup", "auto_id": "Text",
    "month": "Date", "day_of_week": "SingleSelect", "pdf": "FileUpload", "scan_document": "FileUpload",
    "fingerprint": "Text", "article": "Text", "percentage": "Number", "counter": "Number",
    "yes_no": "SingleSelect", "date_range": "Text", "measurement": "Text", "constant_sum": "Text",
    "slider": "Number",
}


def test_supported_field_types_match_previous_allowlist() -> None:
    assert set(SUPPORTED_FIELD_TYPES) == _PREVIOUS_ALLOWLIST


def test_runtime_type_mapping_unchanged() -> None:
    for raw_type, runtime in _PREVIOUS_RUNTIME.items():
        assert mobile_runtime_type(raw_type) == runtime, raw_type
    # Unknown / text-family types without an explicit runtime fall back to Text, as before.
    assert mobile_runtime_type("phone") == "Text"
    assert mobile_runtime_type("not_a_type") == "Text"


def test_input_mode_mapping_unchanged() -> None:
    assert mobile_input_mode("phone") == "phone"
    assert mobile_input_mode("email") == "email"
    assert mobile_input_mode("url") == "url"
    assert mobile_input_mode("text") is None
    assert mobile_input_mode("number") is None


def test_backend_allowlist_covers_every_frontend_field_type() -> None:
    """Cross-layer contract: every authoring response type the builder can produce must be accepted
    by the backend's offline-safe allowlist, or submissions for it would be rejected on ingest."""
    frontend_types = _frontend_field_types()
    if not frontend_types:
        pytest.skip("frontend forms.ts not available in this checkout")
    missing = frontend_types - set(SUPPORTED_FIELD_TYPES)
    assert not missing, f"Frontend field types missing from backend allowlist: {sorted(missing)}"


def test_behavior_tags_are_type_driven() -> None:
    assert field_behavior_tags("counter") == ["counter"]
    assert field_behavior_tags("slider") == ["slider"]
    assert field_behavior_tags("measurement") == ["measurement"]
    assert field_behavior_tags("constant_sum") == ["constant-sum"]
    assert field_behavior_tags("date_range") == ["date-range"]
    assert field_behavior_tags("article") == ["display-note"]
    assert field_behavior_tags("auto_id") == ["auto-id"]
    assert field_behavior_tags("text") == []
