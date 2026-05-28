# Enterprise Operations Integration

This milestone extends the operational ecosystem beyond data collection into business operations.

## Connected Domains

- Organizational units for departments, country offices, regional offices, and district teams.
- Workflow definitions for approval chains, correction cycles, escalations, and SLA tracking.
- Operational tasks for assignments, reminders, field activities, and supervisor follow-up.
- Intervention records linked to projects, beneficiaries, budgets, and reporting.
- Operational assets for devices, vehicles, inventory, tablets, and supplies.
- Project budget lines connected to interventions and donor reporting.
- Knowledge documents linked to projects, beneficiaries, workflows, and approvals.

## Event Behavior

Every enterprise record emits an operational event and fan-out effects:

- Organizational units refresh governance and RBAC scoping.
- Workflow definitions update approvals and SLA tracking.
- Tasks notify assignees and sync to field operations.
- Interventions update beneficiary history and reserve budget context.
- Assets update resource planning and custody tracking.
- Budgets refresh finance utilization and intervention planning.
- Documents become evidence in approvals and reporting.

## API Surface

- `POST /api/v1/operations/units`
- `POST /api/v1/operations/workflow-definitions`
- `POST /api/v1/operations/tasks`
- `POST /api/v1/operations/interventions`
- `POST /api/v1/operations/assets`
- `POST /api/v1/operations/budget-lines`
- `POST /api/v1/operations/documents`

These endpoints use the same tenant, RBAC, event, and workflow architecture as beneficiaries, projects, submissions, imports, and reports.
