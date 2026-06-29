"""Single source of truth for response-type behaviour on the backend.

This mirrors the frontend ``FIELD_TYPE_REGISTRY``: every authoring field type is declared once here,
together with how the web→mobile compiler should treat it — the runtime question type the app
renders, the soft-keyboard input mode, and any behaviour tags the app branches on. The set of keys
is also the offline-safe allowlist that the form schema validates against, so supporting a new field
type is a one-line change in this table rather than edits scattered across the compiler and schema.

This module is intentionally dependency-free (a leaf module) so both ``app.schemas`` and
``app.services`` can import it without risking a circular import.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class FieldTypeSpec:
    """How the backend compiler treats one authoring field type.

    - ``runtime``     the ``MobileQuestionType`` the app renders (its execution vocabulary).
    - ``input_mode``  the soft-keyboard hint for text-like inputs (``phone``/``email``/``url``).
    - ``tags``        behaviour tags carried in ``metadataTags`` so the app renders the right control
                      without the backend inventing a new runtime type for every authoring variant.
    """

    runtime: str = "Text"
    input_mode: str | None = None
    tags: tuple[str, ...] = ()


# Keyed by the authoring field type (lower-case). Keep this aligned with the frontend
# FIELD_TYPE_REGISTRY in `frontend/src/lib/forms.ts`.
FIELD_TYPE_SPECS: dict[str, FieldTypeSpec] = {
    # Text family — render as text; phone/email/url carry a keyboard hint.
    "text": FieldTypeSpec(runtime="Text"),
    "textarea": FieldTypeSpec(runtime="LongText"),
    "phone": FieldTypeSpec(runtime="Text", input_mode="phone"),
    "email": FieldTypeSpec(runtime="Text", input_mode="email"),
    "url": FieldTypeSpec(runtime="Text", input_mode="url"),
    "password": FieldTypeSpec(runtime="Text"),
    # Numeric family.
    "number": FieldTypeSpec(runtime="Number"),
    "decimal": FieldTypeSpec(runtime="Decimal"),
    "currency": FieldTypeSpec(runtime="Currency"),
    "nps": FieldTypeSpec(runtime="Nps"),
    "rating": FieldTypeSpec(runtime="Rating"),
    "percentage": FieldTypeSpec(runtime="Number"),
    "counter": FieldTypeSpec(runtime="Number", tags=("counter",)),
    "slider": FieldTypeSpec(runtime="Number", tags=("slider",)),
    "measurement": FieldTypeSpec(runtime="Text", tags=("measurement",)),
    "constant_sum": FieldTypeSpec(runtime="Text", tags=("constant-sum",)),
    "range": FieldTypeSpec(runtime="Text", tags=("numeric-range",)),
    "duration": FieldTypeSpec(runtime="Number", tags=("duration",)),
    "tags": FieldTypeSpec(runtime="MultiSelect", tags=("tag-list",)),
    "timestamp": FieldTypeSpec(runtime="DateTime", tags=("auto-timestamp",)),
    # Choice family.
    "select": FieldTypeSpec(runtime="SingleSelect"),
    "radio": FieldTypeSpec(runtime="SingleSelect"),
    "dropdown": FieldTypeSpec(runtime="Dropdown"),
    "multiselect": FieldTypeSpec(runtime="MultiSelect"),
    "checkbox": FieldTypeSpec(runtime="MultiSelect"),
    "likert": FieldTypeSpec(runtime="SingleSelect"),
    "ranking": FieldTypeSpec(runtime="Ranking"),
    "yes_no": FieldTypeSpec(runtime="SingleSelect"),
    "consent": FieldTypeSpec(runtime="Consent"),
    # Grids / matrices.
    "matrix_single": FieldTypeSpec(runtime="Matrix"),
    "matrix_multi": FieldTypeSpec(runtime="Matrix"),
    "grid": FieldTypeSpec(runtime="Matrix"),
    # Location & geometry.
    "gps": FieldTypeSpec(runtime="GPS"),
    "geolocation": FieldTypeSpec(runtime="GPS"),
    "map": FieldTypeSpec(runtime="GPS"),
    "geofence": FieldTypeSpec(runtime="GPS"),
    "polygon": FieldTypeSpec(runtime="Polygon"),
    "path": FieldTypeSpec(runtime="Polygon"),
    # Media.
    "photo": FieldTypeSpec(runtime="Photo"),
    "image": FieldTypeSpec(runtime="Photo"),
    "signature": FieldTypeSpec(runtime="Signature"),
    "audio": FieldTypeSpec(runtime="Audio"),
    "video": FieldTypeSpec(runtime="Video"),
    "file": FieldTypeSpec(runtime="FileUpload"),
    "pdf": FieldTypeSpec(runtime="FileUpload"),
    "scan_document": FieldTypeSpec(runtime="FileUpload"),
    "barcode": FieldTypeSpec(runtime="Barcode"),
    "qr": FieldTypeSpec(runtime="QRCode"),
    "fingerprint": FieldTypeSpec(runtime="Text"),
    # Date / time.
    "date": FieldTypeSpec(runtime="Date"),
    "time": FieldTypeSpec(runtime="Time"),
    "datetime": FieldTypeSpec(runtime="DateTime"),
    "month": FieldTypeSpec(runtime="Date"),
    "day_of_week": FieldTypeSpec(runtime="SingleSelect"),
    "date_range": FieldTypeSpec(runtime="Text", tags=("date-range",)),
    # Structural / composition.
    "repeat_group": FieldTypeSpec(runtime="RepeatGroup"),
    "repeatable_group": FieldTypeSpec(runtime="RepeatGroup"),
    "subform": FieldTypeSpec(runtime="RepeatGroup"),
    # Lookups.
    "lookup": FieldTypeSpec(runtime="Lookup"),
    "user_select": FieldTypeSpec(runtime="Lookup"),
    "org_select": FieldTypeSpec(runtime="Lookup"),
    # Derived / system / display-only.
    "calculated": FieldTypeSpec(runtime="CalculatedField"),
    "hidden": FieldTypeSpec(runtime="Hidden"),
    "auto_id": FieldTypeSpec(runtime="Text", tags=("auto-id",)),
    "article": FieldTypeSpec(runtime="Text", tags=("display-note",)),
}


# The offline-safe allowlist the form schema validates submissions/forms against.
SUPPORTED_FIELD_TYPES: frozenset[str] = frozenset(FIELD_TYPE_SPECS)

_DEFAULT_SPEC = FieldTypeSpec()


def field_type_spec(raw_type: str) -> FieldTypeSpec:
    return FIELD_TYPE_SPECS.get((raw_type or "").lower(), _DEFAULT_SPEC)


def mobile_runtime_type(raw_type: str) -> str:
    """The ``MobileQuestionType`` the app renders for an authoring field type (defaults to Text)."""
    return field_type_spec(raw_type).runtime


def mobile_input_mode(raw_type: str) -> str | None:
    """The soft-keyboard hint for a field type, or None when the platform default applies."""
    return field_type_spec(raw_type).input_mode


def field_behavior_tags(raw_type: str) -> list[str]:
    """The type-driven behaviour tags carried in ``metadataTags`` for an authoring field type."""
    return list(field_type_spec(raw_type).tags)
