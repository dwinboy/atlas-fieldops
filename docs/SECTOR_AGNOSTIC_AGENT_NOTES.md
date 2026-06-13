# Sector-Agnostic Implementation Notes

Atlas FieldOps now presents projects, forms, entities, metrics, imports, and mobile workflows in sector-agnostic language.

## Current Intent

- The product must support many sectors, not only traditional M&E.
- Predefined sector packs come before `custom`.
- `custom` remains available for organizations with their own terminology, entities, workflows, and reporting model.
- M&E concepts such as beneficiaries, indicators, baselines, endlines, and donor reporting are optional product concepts, not mandatory defaults.

## Important Compatibility Rule

Do not rename legacy backend model/API fields such as `beneficiary_uid`, `beneficiary_id`, `MonitoringIndicator`, or `/beneficiaries` only for wording cleanup.

Those names are compatibility contracts used by:

- backend APIs
- frontend API clients
- mobile sync
- submissions
- imports
- reports
- existing production data

The user-facing UI should say `Entity`, `Record`, `Metric`, or sector-specific terms, while internal names may remain legacy until a planned migration exists.

## What Already Adapts

- Sector packs define terminology, entity types, starter forms, metric templates, workflows, validation rules, data quality rules, mobile guidance, and report templates.
- Form creation uses sector-aware form types, control language, defaults, and optional governance settings.
- Project setup supports multiple sector types and custom entity categories.
- Entity registration no longer defaults to farmer/beneficiary wording.
- Mobile screens use entity/record wording and category-aware labels.
- Import analysis generates sector-aware entity IDs and sector-neutral match suggestions.

## Safe Future Work

Future agents may improve sector depth by:

- adding richer templates per sector
- making form-builder controls read more from installed sector packs
- expanding sector-specific validation recommendations
- adding sector-specific dashboard/report layouts
- improving terminology in remaining UI copy

Future agents should avoid:

- database renames without migrations and compatibility layers
- breaking mobile sync contracts
- removing beneficiary/indicator support, because M&E users still need it
- making M&E-only rules mandatory for all sectors

## Practical Rule

If a legacy internal name does not affect functionality or confuse users, keep it. Prefer UI terminology and documentation updates over risky schema/API churn.
