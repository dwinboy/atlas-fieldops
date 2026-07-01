# Stitch Implementation Map

These Stitch exports are visual references only. They are not production code and must not be imported into Atlas FieldOps routes.

| Stitch folder | Source ZIP | Likely Atlas module | Frontend files to inspect | Visual patterns to copy | Warnings |
| --- | --- | --- | --- | --- | --- |
| `projects/source/atlas-fieldops/` | `atlas-fieldops.zip` | Projects, project repository, operational dashboard | `frontend/src/modules/projects/ProjectsModule.tsx`, `frontend/src/modules/projects/data.ts`, `frontend/src/modules/projects/utils.ts` | Project cards, KPI grid, search/filter toolbar, grid/list toggle, detail side panel, new project modal, report modal styling | Ignore mock projects, fake activity logs, generated reports, and local state. Preserve project wizard, sector packs, APIs, permissions, and backend data. |
| `field-operations/source/field-operations-dashboard/` | `field-operations-dashboard.zip` | Field Operations | `frontend/src/modules/field-operations/FieldOperationsModule.tsx`, `frontend/src/modules/field-operations/data.ts`, `frontend/src/modules/field-operations/utils.ts` | Command header, compact KPI cards, segmented filters, team schedule table, live feed, workflow visualizer, map drawer | Ignore fake teams, fake GIS nodes, alert mocks, and modal-only assignment behavior. Preserve assignment APIs, mobile delivery, permissions, status actions, and audit trail. |
| `submissions/source/fieldintel-pro/` | `fieldintel-pro.zip` | Submissions review and data operations | `frontend/src/modules/submissions/SubmissionsModule.tsx`, `frontend/src/modules/submissions/data.ts`, `frontend/src/modules/submissions/utils.ts` | KPI review blocks, filter bar, dense submission list, selected record detail panel, bulk approve/return actions, export/report buttons | Ignore localStorage persistence, fake approval logic, mock records, and generated report modal business logic. Preserve backend review workflow, source tracking, entity linkage, and permissions. |
| `users-and-teams/source/fieldops-mission-control/` | `fieldops-mission-control.zip` | Users and Teams | `frontend/src/modules/users-teams/UsersTeamsModule.tsx`, `frontend/src/modules/users-teams/data.ts`, `frontend/src/modules/users-teams/utils.ts` | Stats grid, organization directory, hierarchy panel, invite hub, integrity panel, notification/top bar style | Ignore mock user arrays, fake notifications, generated team counts, and local modal state. Preserve user APIs, roles, permissions, account security, and organization isolation. |
| `forms/source/fieldops-precision-intelligence/` | `fieldops-precision-intelligence.zip` | Forms and Form Builder workflow | `frontend/src/modules/forms/FormsModule.tsx`, `frontend/src/modules/forms/FormCreationWorkspace.tsx`, `frontend/src/modules/forms/data.ts`, `frontend/src/modules/forms/utils.ts` | Form repository cards, KPI cards, form workspace, builder modal shell, governance panel, tabs and filters | Ignore localStorage forms, fake submissions, generated audit logs, and mock form lifecycle. Preserve the existing builder, controls, readiness, publish/versioning, assignments, and backend integration. |

## Shared Visual Patterns

- Use Atlas emerald as the primary brand color: `#005232`.
- Use deep command surfaces for important headers: `#0C1F1B`.
- Use off-white page canvas: `#FAFAF8`.
- Use white cards with subtle emerald-tinted borders and soft shadows.
- Use rounded 16 to 24 px panels and rounded-full status chips.
- Use compact uppercase metadata labels with generous but not oversized spacing.
- Keep tables dense, readable, searchable, filterable, and row-action friendly.
- Keep forms grouped and calm; avoid long unstructured walls of settings.
- Prefer icon-leading buttons for operational actions.

## Module Boundaries

Do not create new top-level modules from these references. Upgrade the existing module that owns the workflow according to `docs/PLATFORM_INFORMATION_ARCHITECTURE.md`.

