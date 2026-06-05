# Atlas FieldOps Platform Information Architecture

**Before building or modifying any feature, check this architecture reference to ensure the feature is placed in the correct module, route, menu, and permission scope.**

This document is the permanent placement contract for Atlas FieldOps. It prevents duplicate modules, scattered pages, and unclear ownership as the product evolves into a professional Monitoring & Evaluation (M&E), data collection, GIS mapping, and program management platform.

## Product Hierarchy

Atlas FieldOps organizes operational work in this order:

```text
Organization
  -> Project
    -> Form
      -> Submission
        -> Indicators
          -> Reports
```

Forms are the field data collection instrument. Projects own the program context. Submissions are reviewed evidence. Indicators and reports are generated from approved, governed data.

## Super Admin / Platform Console

The Platform Console is a separate global Super Admin workspace. It is not part of the normal organization M&E app sidebar and must never be treated as an organization Administration screen.

**Warning:** Any platform-wide or tenant-wide feature must be placed under `/platform` and protected by Super Admin permissions. Organization-level administration belongs under `/administration`.

Purpose:

- Manage Atlas FieldOps as a SaaS platform.
- Manage organizations/tenants, global users, global role templates, feature flags, platform health, platform audit logs, security posture, integrations, backups, and global runtime settings.
- Support organizations through explicit Support Access Mode with visible banner, time limit readiness, reason, revocation readiness, and immutable audit logging.

Canonical routes:

- `/platform`
- `/platform/overview`
- `/platform/organizations`
- `/platform/users`
- `/platform/roles`
- `/platform/feature-flags`
- `/platform/system-health`
- `/platform/audit-logs`
- `/platform/security`
- `/platform/integrations`
- `/platform/backups`
- `/platform/settings`

Role boundaries:

- Super Admin / Platform Owner is global and can access `/platform` plus `/api/v1/platform/*`.
- System Admin is organization-level and cannot access `/platform` or platform APIs.
- M&E Manager, Data Manager, Supervisor, Field Officer, and Viewer/Donor cannot access `/platform` or platform APIs.
- If a Super Admin also belongs to an organization, login must default to `/platform`; organization troubleshooting must happen through Support Access Mode.

Security requirements:

- Backend authorization must require the `super_admin` role for every `/api/v1/platform/*` endpoint.
- Frontend hiding is not sufficient. Route guards and backend guards are both required.
- Dangerous actions such as organization suspension, support access, session revocation, backup restore, maintenance mode, security setting changes, and role template changes require confirmation and a reason.
- Platform audit logs are immutable and must include actor, timestamp, action, resource, organization/tenant if applicable, old/new values when relevant, IP/device where available, and reason for high-risk actions.
- Secrets must never be displayed or logged.

Future development checklist:

- Check this section before adding platform management features.
- Do not add platform-wide features under Administration, Governance, Users & Teams, or normal app dashboards.
- Add redirects from legacy Super Admin routes to the canonical `/platform/*` route.
- Keep support/impersonation explicit, time-bound, visible, revocable, and audited.

## Main Sidebar

The sidebar is grouped by business domain. Do not create new top-level sidebar items without updating this document and `frontend/src/config/navigation.ts`.

| Domain | Menu Item | Purpose |
| --- | --- | --- |
| Home | Dashboard | Manager landing page for active projects, forms, submissions, quality, field activity, indicators, alerts, approvals, and map summaries. |
| Operations | Projects | Create, manage, monitor, and configure programs/projects. |
| Operations | Forms | Create, publish, version, govern, and manage survey/data collection forms. |
| Operations | Field Operations | Manage assignments, supervisors, field officers, targets, work plans, and monitoring. |
| Operations | Submissions | View, review, approve, reject, return, archive, and manage collected records. |
| Analytics | Mapping | GIS maps, boundaries, GPS validation, coverage monitoring, and spatial analysis. |
| Analytics | Indicators | Indicator library, logframes, baselines, targets, results frameworks, and progress tracking. |
| Analytics | Reports | Standard reports, custom reports, dashboards, scheduled outputs, and exports. |
| Analytics | Data Quality | Duplicates, outliers, missing data, GPS issues, validation failures, quality rules, and risk alerts. |
| People | Users & Teams | Users, roles, teams, organizations, permissions, and activity logs. |
| Governance | Governance | Auditability, approvals, policies, retention, consent, compliance, and data stewardship. |
| System | Administration | System-wide configuration, reference data, location hierarchy, notifications, APIs, integrations, backups, and recovery. |

## Route Naming Rules

The production route model must use clean domain prefixes. The current web app is a single workspace under `/app`; new route work must migrate toward these canonical paths and preserve redirects from legacy workspace views.

### Platform Console

- `/platform`
- `/platform/overview`
- `/platform/organizations`
- `/platform/users`
- `/platform/roles`
- `/platform/feature-flags`
- `/platform/system-health`
- `/platform/audit-logs`
- `/platform/security`
- `/platform/integrations`
- `/platform/backups`
- `/platform/settings`

### Dashboard

- `/dashboard`

### Projects

- `/projects`
- `/projects/all`
- `/projects/active`
- `/projects/draft`
- `/projects/closed`
- `/projects/templates`
- `/projects/:projectId/overview`
- `/projects/:projectId/forms`
- `/projects/:projectId/indicators`
- `/projects/:projectId/locations`
- `/projects/:projectId/teams`
- `/projects/:projectId/assignments`
- `/projects/:projectId/submissions`
- `/projects/:projectId/reports`
- `/projects/:projectId/settings`
- `/projects/:projectId/audit-trail`

### Forms

- `/forms`
- `/forms/all`
- `/forms/draft`
- `/forms/published`
- `/forms/archived`
- `/forms/templates`
- `/forms/reference-data`
- `/forms/:formId/overview`
- `/forms/:formId/questions`
- `/forms/:formId/reference-data`
- `/forms/:formId/permissions`
- `/forms/:formId/workflow`
- `/forms/:formId/data-quality`
- `/forms/:formId/governance`
- `/forms/:formId/mapping-settings`
- `/forms/:formId/version-history`
- `/forms/:formId/audit-trail`

### Field Operations

- `/field-operations`
- `/field-operations/assignments`
- `/field-operations/field-officers`
- `/field-operations/supervisors`
- `/field-operations/work-plans`
- `/field-operations/targets`
- `/field-operations/field-monitoring`

### Submissions

- `/submissions`
- `/submissions/all`
- `/submissions/pending-review`
- `/submissions/approved`
- `/submissions/rejected`
- `/submissions/returned`
- `/submissions/archived`

### Mapping

- `/mapping`
- `/mapping/project-maps`
- `/mapping/submission-maps`
- `/mapping/beneficiary-maps`
- `/mapping/facility-maps`
- `/mapping/coverage-maps`
- `/mapping/indicator-maps`
- `/mapping/data-quality-maps`
- `/mapping/layers`
- `/mapping/boundaries`

### Indicators

- `/indicators`
- `/indicators/library`
- `/indicators/results-framework`
- `/indicators/logframes`
- `/indicators/targets`
- `/indicators/baselines`
- `/indicators/reports`

### Reports

- `/reports`
- `/reports/standard`
- `/reports/custom`
- `/reports/dashboards`
- `/reports/scheduled`
- `/reports/exports`

### Data Quality

- `/data-quality`
- `/data-quality/dashboard`
- `/data-quality/duplicates`
- `/data-quality/outliers`
- `/data-quality/gps-issues`
- `/data-quality/missing-data`
- `/data-quality/validation-failures`
- `/data-quality/risk-alerts`
- `/data-quality/rules`

### Users & Teams

- `/users-teams`
- `/users-teams/users`
- `/users-teams/roles`
- `/users-teams/teams`
- `/users-teams/organizations`
- `/users-teams/permissions`
- `/users-teams/activity-logs`

### Governance

- `/governance`
- `/governance/audit-trail`
- `/governance/policies`
- `/governance/approvals`
- `/governance/retention-rules`
- `/governance/consent-management`
- `/governance/compliance`
- `/governance/data-stewardship`

### Administration

- `/administration`
- `/administration/location-hierarchy`
- `/administration/reference-data`
- `/administration/notification-settings`
- `/administration/api-settings`
- `/administration/integrations`
- `/administration/system-settings`
- `/administration/backup-recovery`

## Folder Ownership

Feature-specific code belongs under `frontend/src/modules/<domain>/`. Shared UI belongs under `frontend/src/components/ui`, shared layout under `frontend/src/components/layout`, shared navigation under `frontend/src/components/navigation`, and reusable helpers under `frontend/src/lib`.

```text
frontend/src/
  app/
  modules/
    dashboard/
    projects/
    forms/
    field-operations/
    submissions/
    mapping/
    indicators/
    reports/
    data-quality/
    users-teams/
    governance/
    administration/
  components/
    layout/
    navigation/
    shared/
    ui/
  config/
    navigation.ts
    permissions.ts
    routes.ts
  lib/
  services/
  hooks/
  types/
```

## Existing Feature Classification

| Existing feature/component | Business domain | Canonical module |
| --- | --- | --- |
| `Dashboard` | Home | Dashboard |
| `ProgramManagement`, `SurveyManagement` | Operations | Projects |
| `DynamicForms`, `FormTemplateLibrary`, public collection form tools | Operations | Forms |
| `FieldOfficerOperations`, assignment and sync tools | Operations | Field Operations |
| `SubmissionReview` | Operations | Submissions |
| `GeospatialIntelligence` | Analytics | Mapping |
| `IndicatorTracking` | Analytics | Indicators |
| `ReportingCenter`, report/export views | Analytics | Reports |
| Data quality checks, validation flags, duplicate checks | Analytics | Data Quality |
| `OrganizationManagement`, `WorkforceGovernanceCenter` | People | Users & Teams |
| `GovernanceCommandCenter`, `WorkflowManagement`, audit/approval controls | Governance | Governance |
| `PlatformConsole`, tenant lifecycle, global users, platform feature flags, system health, platform audit/security, backups, platform settings | Platform | Platform Console |
| Global reference data, organization-level integrations, notifications, APIs | System | Administration |
| `ProductHelpCenter` | Shared support | Help content linked from shell, not a primary business module |

## Role Visibility Rules

Navigation visibility and route access must be controlled from `frontend/src/config/navigation.ts` and `frontend/src/config/permissions.ts`. Do not hide only in the UI; backend APIs must also enforce permissions.

| Role | Visible modules |
| --- | --- |
| Super Admin / Platform Owner | Platform Console only by default; organization work only through explicit Support Access Mode. |
| System Admin | Organization-level Dashboard, Projects, Forms, Field Operations, Submissions, Mapping, Indicators, Reports, Data Quality, Users & Teams, Governance, and Administration. No `/platform` access. |
| M&E Manager | Dashboard, Projects, Forms, Field Operations, Submissions, Mapping, Indicators, Reports, Data Quality, Users & Teams, Governance. |
| Data Manager | Forms, Submissions, Mapping, Indicators, Reports, Data Quality. |
| Supervisor | Dashboard, Field Operations, Submissions, Mapping, Data Quality for assigned teams/locations. |
| Field Officer | Assigned forms, assignments, field operations tasks, and own submissions only. |
| Viewer/Donor | Dashboard, Reports, Indicators, and aggregated Mapping only. |

## Boundary Rules

- Dashboard contains only summaries, alerts, queues, and quick actions. Detailed analysis belongs in Reports, Mapping, Indicators, or Data Quality.
- Reports contains formal outputs, scheduled reports, donor exports, report builders, and detailed dashboard artifacts.
- Data Quality contains issue detection, investigation, quality scoring, duplicate/outlier workflows, GPS issues, validation failures, and quality rules.
- Governance contains policies, audit trails, compliance, approval governance, consent, retention, data stewardship, and export controls.
- Platform Console contains SaaS platform ownership: organizations/tenants, global users, global role templates, feature flags, platform health, platform audit/security, platform-wide integrations, backups, and global runtime settings.
- Administration contains organization/system configuration inside the normal app: location hierarchy, reference data, notification settings, API settings, integrations, system settings, backups, and recovery. It must not contain tenant lifecycle or Super Admin support controls.
- Forms contains question design, form templates, validation, publishing, versioning, reference bindings, form-level permissions, workflow, data quality settings, and form governance.
- Projects contains project setup, donor/program details, project teams, project locations, project assignments, project submissions, project reports, and project-level settings.
- Mapping contains GIS visualization, boundaries, layers, GPS validation, coverage monitoring, and spatial analysis.
- Field Operations contains assignments, field teams, supervisors, targets, work plans, sync readiness, and field monitoring.
- Submissions contains collected records, review, approval, rejection, correction, and submission history.

## Form vs Project Settings

- Use form-level settings for permissions, workflow, reference data, data quality rules, mapping settings, version history, and audit trail tied to one form.
- Use project-level settings for project team assignment, locations, objectives, indicators, donor metadata, beneficiary scope, and project-wide reporting.
- Never allow orphan forms. A form must belong to a project context.
- Never allow orphan submissions. A submission must retain organization, project, form, enumerator, timestamp, and GPS metadata when applicable.

## Mapping and GIS Rules

- Live or interactive maps belong in Mapping.
- Static map snapshots inside donor outputs belong in Reports.
- Form-level GPS requirement, geofence requirement, and coordinate question settings belong in Forms / Mapping Settings.
- Project location scope and coverage targets belong in Projects / Locations.
- GPS mismatch and boundary validation issues belong in Data Quality.

## Future Agent Checklist

Before building or modifying a feature:

1. Read this document.
2. Identify the business domain and canonical route.
3. Check `frontend/src/config/navigation.ts` for an existing item before adding another one.
4. Check role visibility and permissions in `frontend/src/config/permissions.ts`.
5. Place feature-specific code under the correct `frontend/src/modules/<domain>/` folder.
6. Reuse shared UI from `frontend/src/components/ui`, `frontend/src/components/shared`, or existing module components.
7. Do not add hardcoded sidebar entries outside the central navigation config.
8. Do not create duplicate modules for the same business concept.
9. Add redirects when replacing legacy routes.
10. Add or update tests for route guards, visibility, and critical workflows.
11. Update product help content when the workflow changes.
12. Run linting, type checks, tests, and a browser smoke test before shipping.
