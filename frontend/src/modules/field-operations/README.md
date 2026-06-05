# Field Operations Module

This module follows `docs/PLATFORM_INFORMATION_ARCHITECTURE.md`.

## Ownership

Field Operations owns the operational execution layer:

- assignments
- field officer monitoring
- supervisor monitoring
- work plans
- operational targets
- field monitoring

It does not own form design, submission review, GIS analysis, reports, governance policies, or system administration.

## Routes

The approved routes are:

- `/field-operations`
- `/field-operations/assignments`
- `/field-operations/field-officers`
- `/field-operations/supervisors`
- `/field-operations/work-plans`
- `/field-operations/targets`
- `/field-operations/field-monitoring`

The current workspace shell renders these sections inside `/app` while preserving the canonical route labels in the UI.

## User Workflow

1. Create or review assignments.
2. Confirm assigned field officers and supervisors.
3. Review work plans and operational targets.
4. Monitor daily collection, sync health, GPS evidence, overdue work, and quality alerts.
5. Open Mapping for GIS analysis or Submissions for record review.

## Data Sources

The module uses live backend data where endpoints already exist:

- `GET /api/v1/field-officers`
- `POST /api/v1/field-officers`
- `POST /api/v1/field-officers/import`
- `GET /api/v1/operations/summary`

Assignment, supervisor, work plan, target, and monitoring records use typed local operational data until dedicated backend endpoints are added. Future backend work should keep these under Field Operations ownership and send audit events to Governance.
