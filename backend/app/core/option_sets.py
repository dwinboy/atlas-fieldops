"""Tenant-managed reference data ("option sets").

Each option set is a named, owner-editable list (e.g. project types, entity types). The
defaults below mirror what used to be hardcoded in the frontend, so an organization that
never customizes sees exactly the same choices it always had — the values are seeded into
``tenant_option_items`` on first use and can then be reordered, renamed, deactivated,
extended, or reset by an owner.

Keep ``value`` stable: it is what gets stored on records. ``label`` is display-only and
safe to change. To preserve existing stored data, the seed ``value`` equals its ``label``.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class OptionSetDefinition:
    key: str
    label: str
    description: str
    module: str
    # Seed items, in display order. Each is (value, label).
    defaults: tuple[tuple[str, str], ...]


def _same(*values: str) -> tuple[tuple[str, str], ...]:
    """Seed where the stored value and the display label are identical."""
    return tuple((value, value) for value in values)


OPTION_SETS: dict[str, OptionSetDefinition] = {
    "project.type": OptionSetDefinition(
        key="project.type",
        label="Project types",
        description="Programme/project categories offered when creating a project.",
        module="Projects",
        defaults=_same(
            "Agriculture",
            "Asset Management",
            "Audits",
            "Health",
            "Education",
            "Evaluation",
            "Government",
            "HR",
            "Humanitarian",
            "Inspections",
            "Inventory Management",
            "Livelihood",
            "Logistics",
            "Manufacturing",
            "Monitoring",
            "Protection",
            "Registration",
            "Research",
            "Retail",
            "Sales",
            "WASH",
            "Custom",
        ),
    ),
    "project.entity_type": OptionSetDefinition(
        key="project.entity_type",
        label="Entity types",
        description="Kinds of entity a project can register (farmers, households, facilities…).",
        module="Projects / Entities",
        defaults=_same(
            "Asset",
            "Audit Item",
            "Customer",
            "Employee",
            "Farmer",
            "Household",
            "Beneficiary",
            "Inspection Site",
            "Product",
            "Production Batch",
            "School",
            "Shipment",
            "Stock Item",
            "Facility",
            "Village",
            "Group",
            "Health Worker",
            "Custom Entity",
        ),
    ),
    "project.frequency": OptionSetDefinition(
        key="project.frequency",
        label="Collection frequency",
        description="How often a project collects data.",
        module="Projects",
        defaults=_same(
            "Monthly",
            "Quarterly",
            "Semi-annual",
            "Annual",
            "Seasonal",
            "Event-based",
        ),
    ),
    "duplicate.field": OptionSetDefinition(
        key="duplicate.field",
        label="Duplicate-detection fields",
        description="Fields used to detect duplicate entities during import and registration.",
        module="Projects / Data Quality",
        defaults=_same(
            "External ID",
            "Code / SKU",
            "Phone",
            "National ID",
            "Household ID",
            "Name + Location",
            "Name + Village",
            "Name + Date of Birth",
            "Serial Number",
            "GPS",
        ),
    ),
    "submission.source": OptionSetDefinition(
        key="submission.source",
        label="Submission sources",
        description="Where a submission originated.",
        module="Submissions",
        defaults=_same(
            "Field Submitted",
            "Mobile",
            "Web Entry",
            "Uploaded",
            "Imported",
        ),
    ),
}


def is_known_option_set(set_key: str) -> bool:
    return set_key in OPTION_SETS


def default_items(set_key: str) -> list[tuple[str, str]]:
    """(value, label) seed pairs for a set, or empty if the key is unknown."""
    definition = OPTION_SETS.get(set_key)
    return list(definition.defaults) if definition else []
