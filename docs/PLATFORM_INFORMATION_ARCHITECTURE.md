# Atlas FieldOps Platform Information Architecture

**Before building or modifying any feature, check this architecture reference to ensure the feature is placed in the correct module, route, menu, and permission scope.**

This document is the permanent placement contract for Atlas FieldOps. It prevents duplicate modules, scattered pages, and unclear ownership as the product evolves into a professional Monitoring & Evaluation (M&E), data collection, GIS mapping, and program management platform.

## Product Hierarchy

Atlas FieldOps organizes operational work in this order:

```text
Organization
  -> Project
    -> Beneficiary / Entity
      -> Form
        -> Submission
          -> Indicators
            -> Reports
```

Forms are the field data collection instrument. Projects own the program context. Beneficiaries/entities are the longitudinal M&E anchor. Submissions are reviewed evidence. Indicators and reports are generated from approved, governed data.

## Public Website & SEO Architecture

Atlas FieldOps has a dual-platform architecture:

- Public Website: search-engine friendly, publicly accessible, marketing focused, lead generation focused, and educational.
- Secure Application Workspace: authenticated operational workspace for projects, forms, field operations, submissions, mapping, indicators, reports, data quality, users, governance, and administration.
- Platform Console: authenticated Super Admin workspace under `/platform`.

**Rule:** Any page intended for search engines, marketing, education, or lead generation must be placed under the Public Website architecture. Operational application pages must remain outside public indexing.

Public website routes:

- `/`
- `/features`
- `/demo`
- `/signup`
- `/create-organization`
- `/onboarding`
- `/donor`
- `/templates`
- `/solutions`
- `/solutions/ngos`
- `/solutions/government`
- `/solutions/donors`
- `/solutions/research`
- `/solutions/health`
- `/solutions/education`
- `/use-cases`
- `/use-cases/:slug`
- `/pricing`
- `/about`
- `/contact`
- `/book-demo`
- `/resources`
- `/blog`
- `/case-studies`
- `/security`
- `/privacy`
- `/terms`
- `/help`
- `/documentation`
- `/status`
- `/careers`

Secure routes must be noindexed and excluded from `sitemap.xml`:

- `/login`
- `/app`
- `/dashboard`
- `/projects`
- `/forms`
- `/field-operations`
- `/submissions`
- `/mapping`
- `/indicators`
- `/reports`
- `/data-quality`
- `/users-teams`
- `/governance`
- `/administration`
- `/platform`
- `/api`

SEO rules:

- Public pages must define a meta title, meta description, canonical URL, Open Graph tags, and Twitter card metadata.
- Public routes belong in `sitemap.xml`; secure routes must not.
- `robots.txt` must allow public pages and disallow secure application, platform console, and API routes.
- Use structured data where useful: SoftwareApplication on homepage, Breadcrumb schema on landing pages, and FAQ schema on help/solution/use-case pages.
- Primary keyword groups include monitoring and evaluation software, M&E platform, data collection software, offline data collection app, survey management platform, field data collection software, GIS mapping software, indicator tracking software, program management software, donor reporting software, NGO monitoring platform, government monitoring platform, impact measurement platform, results framework software, data quality management platform, and beneficiary management platform.

Content architecture:

- CMS-ready content types include blog posts, case studies, documentation articles, resources/downloads, landing pages, authors, categories, and tags.
- Public content source files live under `frontend/src/lib/marketing/` until a headless CMS is connected.
- Public layouts use `MarketingShell`; application layouts use the authenticated workspace shell; platform console uses the dedicated Super Admin console shell.

Lead generation architecture:

- Lead sources include contact form, book demo, resource downloads, newsletter, and careers.
- Leads are stored through `/api/v1/public/leads` with name, organization, country, email, phone, organization size, interest area, source, message, and metadata.
- Future CRM integration should consume the dedicated marketing lead model and must not mix with tenant user accounts or application submissions.

## Startup Readiness Features

Atlas FieldOps must operate as a multi-tenant SaaS platform, not only as a single-organization M&E application. Startup-readiness features must reuse the approved Public Website, Secure Application Workspace, Platform Console, Administration, Reports, Data Quality, Beneficiaries, and Projects boundaries.

**Rule:** Do not create duplicate startup modules. Growth, onboarding, templates, API access, integrations, subscription readiness, donor access, and usage tracking must extend the existing domain that owns the concept.

Startup feature ownership:

| Startup Capability | Status Classification Rule | Approved Owner / Route |
| --- | --- | --- |
| Multi-tenant organizations | Complete only when tenant-owned data has `organization_id`, backend scopes, and route guards. | Platform Console `/platform/organizations` plus tenant-scoped repositories. |
| Organization self-onboarding | Complete only when public signup captures an organization request and secure creation provisions an organization and first admin. | Public `/signup`, `/create-organization`, `/onboarding`; provisioning remains Platform Console or approved backend onboarding API. |
| Startup onboarding wizard | Complete only when new organizations can follow project, import, form, beneficiary, team, and collection setup steps. | Public `/onboarding` for education; authenticated guided setup belongs in Dashboard / Administration. |
| Template library | Complete only when project, form, dashboard, and indicator templates can be discovered and installed without duplicating builders. | Public `/templates`; operational templates remain `/projects/templates`, `/forms/templates`, Reports, and Indicators. |
| Demo environment | Complete only when prospects can explore safe sample projects, forms, beneficiaries, submissions, reports, and dashboards without customer data. | Public `/demo` and seeded non-customer demo data. |
| Public API foundation | Complete only when API keys, scopes, rate limits, audit logs, and versioned OpenAPI endpoints exist. | Administration `/administration/api-settings`; APIs remain under `/api/v1/*`. |
| Webhook framework | Complete only when event subscriptions, retry status, delivery audit, and secret-safe configuration exist. | Administration `/administration/integrations` and `/administration/api-settings`. |
| Data migration system | Complete only when import batches, smart assistant, validation, duplicate review, rollback readiness, and audit events exist. | `/administration/imports-migration` and `/projects/:projectId/data-import`. |
| Donor portal | Complete only when donor users have read-only access to approved dashboards, reports, indicators, and aggregated maps. | Public `/donor` for product education; authenticated donor access uses Reports, Indicators, Mapping, and Viewer/Donor permissions. |
| White labeling | Complete only when logo, brand color, platform name, timezone, language, and public-link settings are tenant-scoped. | Administration `/administration/system-settings`. |
| Usage tracking | Complete only when users, projects, forms, submissions, storage, imports, exports, and API usage are measurable per organization. | Platform Console `/platform/organizations`, `/platform/system-health`, and `/platform/settings`. |
| Subscription readiness | Complete only when plan, status, limits, enabled modules, and usage percentage are tracked without requiring payment processing. | Platform Console organization plans and feature flags. |
| Organization settings | Complete only when tenant branding, localization, timezone, security, defaults, and feature toggles are managed by System Admins. | Administration `/administration/system-settings`. |
| Integration framework | Complete only when connector metadata, health, status, environment, test actions, and secret references exist. | Administration `/administration/integrations`; platform-wide providers belong in `/platform/integrations`. |
| Lead capture system | Complete only when public contact, book-demo, signup, and resource forms store leads separately from tenant users. | Public website and `/api/v1/public/leads`. |
| Public website SEO foundation | Complete only when public pages have metadata, sitemap inclusion, robots rules, and structured data where useful. | Public Website routes and `frontend/app/sitemap.ts`. |
| Beneficiary 360 | Complete only when profiles show profile, forms/records, visits, trainings, distributions, indicators, submissions, map, history, and audit. | Beneficiaries `/beneficiaries/:entityId` and project tab `/projects/:projectId/beneficiaries`. |
| Follow-up scheduling | Complete only when workflows can create future operational tasks from baseline, training, review, or quality events. | Field Operations / operational tasks. |
| Task management | Complete only when lightweight tasks have owner, due date, status, priority, beneficiary/project context, and auditability. | Field Operations / operational tasks, not a new top-level module. |
| Communication foundation | Complete only when notification templates, rules, channels, recipients, and integration-ready providers exist. | Administration `/administration/notification-settings` and `/administration/integrations`. |

## Sector Pack Architecture

Atlas FieldOps supports many industries through sector packs, not through separate products or duplicated modules. A sector pack is a configuration layer installed during project setup that recommends terminology, entity types, editable form instruments, question metadata, indicator definitions, dashboard widgets, report packages, validation rules, data quality rules, governance defaults, and mobile guidance.

Canonical owner:

- Project setup owns sector selection and stores the selected sector in project settings.
- Forms owns the form templates and question-level controls suggested by the sector.
- Indicators owns indicator templates, baselines, targets, formulas, and disaggregation.
- Reports owns sector-specific report packages and donor outputs.
- Data Quality owns sector-specific duplicate, GPS, validation, outlier, and consistency rules.
- Field Operations and Mobile own sector-specific field guidance, assignment behavior, offline expectations, and evidence capture.

Project setup may install sector starter forms, indicator templates, and report packages. Installed assets must be editable drafts until the responsible M&E manager reviews project-specific wording, mappings, validation rules, approval workflow, and donor reporting requirements.

Sector packs include:

- Form definitions with sections, question labels, variable names, definitions, sensitivity levels, validation rules, beneficiary profile mappings, indicator hints, GPS/consent controls, and mobile guidance.
- Indicator definitions with units, reporting frequency, baseline/target expectations, disaggregation, source-of-truth rules, and approved-data requirements.
- Report definitions with standard sections for executive summary, indicator progress, beneficiary/entity coverage, GPS evidence, data quality, risks, corrective actions, annexes, and export formats.
- Manager controls that identify which pack elements can be customized inside the project workspace.

Sector Pack Manager:

- Lives in Project Settings, because customization is project-specific.
- Allows authorized managers to customize terminology, entity types, form template names, indicators, validation rules, data quality checks, dashboard widgets, report templates, and mobile field guidance.
- Saves changes to `project.settings_json` so project setup, form installation, mobile sync, reports, and dashboards read one shared configuration.
- Does not create industry-specific modules or duplicate form, indicator, beneficiary, assignment, submission, report, governance, or mobile systems.
- Installed forms and reports remain draft/editable until project governance approves them.

Initial supported packs:

- Agriculture and Farmer Programs
- Health and Community Systems
- Education and School Monitoring
- WASH and Infrastructure Monitoring
- Humanitarian Response and Protection
- Custom Sector

## Dynamic Entity Category Architecture

Projects must track any sector record type through configuration, not through hardcoded tables. Entity categories represent the type of record a project manages, such as Farmer, Household, School, Health Facility, Water Point, Business, Asset, Case Record, Road, Partner, or a custom organization-defined type.

Core rules:

- Use `EntityCategory`, `EntityAttribute`, `EntityAttributeValue`, and the existing entity/beneficiary registry for flexible records.
- Do not add sector-specific tables such as `schools`, `farmers`, `clinics`, or `water_points`.
- Project Settings owns category activation, custom category creation, category attributes, category status/workflow metadata, colors, icons, and code examples.
- Forms may link to a project entity category and may create, update, or require existing records according to form controls.
- Mobile sync must download assigned entity categories and use them when displaying forms, assignments, entity selection, duplicate warnings, and submission context.
- Approved submissions create or update official entity records only through the governed entity processing flow.
- Generated entity codes should use the project code format when configured; otherwise derive a readable prefix from the entity category name.

Rules:

- Do not create separate top-level modules for each industry.
- Sector packs must remain editable by M&E managers because donor requirements, local terminology, project designs, locations, and reporting rules differ.
- Sector packs may suggest templates and controls, but official reporting still depends on approved submissions, governed indicators, beneficiary/entity linkage, data quality review, and audit history.
- Custom sectors must use the same project, form, entity registry, assignment, submission, indicator, report, governance, and mobile sync architecture.

Implementation guidance:

- Public startup pages explain and capture demand. Secure operational work stays in authenticated modules.
- Super Admin manages SaaS-wide tenants, plans, feature flags, platform audit, platform integrations, health, and backups under `/platform`.
- System Admin manages organization settings, APIs, integrations, notifications, imports, backups, and reference data under `/administration`.
- Donor users are organization/project-scoped read-only users. Do not expose donor data through public pages.
- Subscription and billing architecture may exist before payment processing, but payment providers must be added through the Integration framework and audited.
- All startup features must preserve tenant isolation, role-based access, audit logging, and noindex rules for secure routes.

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
| Operations | Beneficiaries | Search, import, assign, deduplicate, and track farmers, households, facilities, schools, groups, and other project entities over time. |
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
- `/projects/:projectId/beneficiaries`
- `/projects/:projectId/data-import`
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
- `/forms/:formId/data`
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

Form publishing rule:

- A form may be saved as draft while incomplete, but it must pass Field Readiness / Publish Controls before it can be published or assigned to field officers.
- The form lifecycle is Draft -> Testing -> Review -> Approved -> Published, with Suspended and Archived for operational control. Direct Draft -> Published should be blocked unless an explicit bypass permission is implemented and audited.
- Publish readiness must verify form information, project linkage, entity rules, entity profile mappings, frequency rules, duplicate prevention, question validation, logic, structure, reference data, GPS, media, consent, data quality, workflow, reviewer roles, permissions, assignment rules, offline settings, risk classification, version number, and change summary.
- Advanced M&E instrument metadata belongs in Forms controls, not in a duplicate module. This includes form objective, business purpose, result area, linked outcome/output, indicator mappings, form-level data dictionary, question dependencies, profile impact rules, tracking series, survey waves, seasonal rules, sampling metadata, event settings, related forms, trigger rules, localization, accessibility, and AI-ready metadata.
- Indicator mappings stored on a form must remain traceable from question -> variable -> indicator component -> approved submission -> beneficiary/project -> report.
- Publishing creates or updates an immutable published version; editing a published form must create a new draft/version and must not silently overwrite historical form versions or submissions.
- Field-submitted data from published forms must enter the submission review workflow. Approval, return, rejection, and correction decisions belong to authorized reviewers, not automatic publish logic.

Form operations rule:

- Advanced form operations belong inside the Forms module, not in duplicate analytics or automation modules. This includes form analytics, question analytics, form usage analytics, template library, related form chains, longitudinal tracking series, trigger-based form rules, form relationships, version comparison, translation management, offline package readiness, and the form governance dashboard.
- Organization-level form analytics may summarize completion, approval, rejection/correction, GPS/media compliance, source split, mobile usage, uploaded records, and data quality using existing form and submission records.
- Per-form operations views must drill into question performance, usage, relationship chains, tracking series, trigger rules, translations, offline readiness, comparison, version history, and audit trail while preserving the canonical form builder as the only question-design surface.
- Trigger-based form rules should start as simple governed rules tied to approved form events, assignments, tasks, alerts, or follow-up forms. They must write audit events when activated and must not silently change approved data.
- Translation management must support one multilingual form instrument with language entries and completeness tracking; do not duplicate forms per language.
- Offline readiness must report mobile package compatibility, estimated download size, reference data needs, GPS/media permissions, unsupported question types, and large-form warnings before field deployment.

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

### Beneficiaries / Entities

- `/beneficiaries`
- `/beneficiaries/import`
- `/beneficiaries/duplicates`
- `/beneficiaries/:entityId`

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
- `/administration/imports-migration`

## Data Migration, Import, And Project Continuity

Atlas FieldOps must support organizations that started M&E work in KoboToolbox, ODK, SurveyCTO, Excel, Google Forms, DHIS2, CommCare, Google Sheets, or custom databases and need to continue that same project inside Atlas FieldOps.

Placement:

- Organization-wide import governance, source connectors, batch history, rollback readiness, and reusable mapping rules belong under `/administration/imports-migration`.
- Project-level continuity imports belong under `/projects/:projectId/data-import`.
- Beneficiary-only registry imports may also be initiated from `/beneficiaries/import`, but must use the shared import batch, duplicate detection, validation, and audit architecture.

Import wizard rules:

- The required smart migration assistant flow is: upload/select source, analyze data, show import readiness score, map fields, match locations, match entities/beneficiaries, review duplicates, review validation issues, preview import, confirm with reason, review results, and generate a post-import quality report.
- Phase 1 sources are file-based: CSV, Excel, JSON, XLSForm, GeoJSON, KML, and shapefile metadata-ready support.
- Phase 2 connectors are architecture-ready placeholders: KoboToolbox, ODK Central, SurveyCTO, CommCare, DHIS2, Google Sheets, and API imports.
- Imports must create an import batch with status, total records, successful records, failed records, skipped records, imported by, imported at, reason, validation issues, and error-report readiness.
- Errors block import. Warnings require explicit confirmation.
- Imports must show create, update, skip, warning, and error counts before confirmation.
- Imports must never overwrite automatically. Updates require before/after preview, explicit confirmation, a reason, source traceability, and Governance audit logging.
- Rollback must be audit-safe. Do not hard-delete imported records silently if they may have been edited or used after import.

Field mapping and validation:

- Source columns must be mapped to approved platform targets such as `Entity.FullName`, `Location.District`, `FormQuestion.variable_name`, `Indicator.Code`, or `Submission.Payload`.
- The field mapping tool should suggest mappings, show required fields, show data types, and support transformations such as split/combine names, date conversion, phone normalization, yes/no conversion, reference value mapping, whitespace trimming, and location standardization.
- Validation must check required fields, data types, reference data, locations, duplicates, entity links, form/question mappings, submission frequency, and GPS.
- Legacy questions or fields without platform matches should default to preserved legacy fields so historical records are not lost.
- Missing beneficiary/entity IDs should generate human-readable platform IDs while storing nullable legacy IDs and the import batch ID.

Smart problem detection:

- The import system must calculate an Import Readiness Score from 0-100 using required fields, duplicate rate, valid locations, valid dates, valid GPS, mapping completeness, entity matching confidence, indicator matching confidence, errors, and warnings.
- Readiness categories are: 90-100 Ready to Import, 70-89 Needs Review, 50-69 High Risk, and below 50 Not Ready.
- The assistant must detect duplicate beneficiaries using normalized phone numbers, national ID, household ID, name similarity, name plus date of birth, name plus village, and GPS proximity where available.
- The assistant must detect location name mismatches and offer accept match, choose different location, create new location, or skip records.
- Historical submissions without beneficiary links must go through entity matching before import and may be linked, used to create a new beneficiary, left unlinked, or sent for review.
- Indicator imports and submission fields should receive deterministic suggested matches first, with AI-assist-ready architecture for future mapping recommendations.
- Bad date formats should be detected, confirmed, and normalized to ISO format internally.
- Missing GPS in historical records should create warnings, not automatic blocking errors, unless project governance requires GPS.
- Large imports must be background-job ready with progress tracking, resumable draft imports, and row-level error reports.
- After import, the system must generate an import quality report with batch ID, source system, imported by, date, created/updated/skipped counts, errors, warnings, duplicate candidates, location issues, unlinked submissions, and a data quality score.

Source traceability:

- Imported records must keep legacy source information where appropriate: `isImported`, `sourceSystem`, `sourceRecordId`, source project/form/submission IDs, import batch ID, imported at, and imported by.
- Legacy record links must preserve source-to-platform relationships for audit, reporting, and future mobile sync.
- Imported historical submissions must be marked as imported source data, not newly collected web/mobile data.

Mobile-ready continuity:

- Imported entities, forms, published form versions, reference data, locations, duplicate rules, prefill data, and historical summaries must remain compatible with future offline-first mobile sync APIs.
- Do not build mobile screens in the web app. Provide clean backend/API extension points for later mobile download, upload, and conflict resolution.

Governance and Data Quality:

- Import actions must write Governance audit events: batch created, file uploaded, mapping changed, validation run, duplicate detected, import confirmed, import completed, import failed, rollback requested, and record updated by import.
- Duplicate checks must integrate with Data Quality. Do not create a competing duplicate-review system outside Data Quality.

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
    beneficiaries/
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
| Beneficiary, farmer, household, facility, school, training participant, village, or custom entity registry | Operations | Beneficiaries |
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
| System Admin | Organization-level Dashboard, Projects, Forms, Field Operations, Submissions, Beneficiaries, Mapping, Indicators, Reports, Data Quality, Users & Teams, Governance, and Administration. No `/platform` access. |
| M&E Manager | Dashboard, Projects, Forms, Field Operations, Submissions, Beneficiaries, Mapping, Indicators, Reports, Data Quality, Users & Teams, Governance. |
| Data Manager | Forms, Submissions, Beneficiaries, Mapping, Indicators, Reports, Data Quality. |
| Supervisor | Dashboard, Field Operations, Submissions, Beneficiaries, Mapping, Data Quality for assigned teams/locations. |
| Field Officer | Assigned forms, assignments, assigned beneficiaries/entities, field operations tasks, and own submissions only. |
| Viewer/Donor | Dashboard, Reports, Indicators, and aggregated Mapping only. |

## Boundary Rules

- Dashboard contains only summaries, alerts, queues, and quick actions. Detailed analysis belongs in Reports, Mapping, Indicators, or Data Quality.
- Reports contains formal outputs, scheduled reports, donor exports, report builders, and detailed dashboard artifacts.
- Data Quality contains issue detection, investigation, quality scoring, duplicate/outlier workflows, GPS issues, validation failures, and quality rules.
- Governance contains policies, audit trails, compliance, approval governance, consent, retention, data stewardship, and export controls.
- Platform Console contains SaaS platform ownership: organizations/tenants, global users, global role templates, feature flags, platform health, platform audit/security, platform-wide integrations, backups, and global runtime settings.
- Administration contains organization/system configuration inside the normal app: location hierarchy, reference data, notification settings, API settings, integrations, system settings, backups, and recovery. It must not contain tenant lifecycle or Super Admin support controls.
- Forms contains question design, form templates, validation, publishing, versioning, reference bindings, form-level permissions, workflow, data quality settings, and form governance.
- Projects contains project setup, donor/program details, project teams, project locations, beneficiary scope, project assignments, project submissions, project reports, and project-level settings.
- Beneficiaries contains the central registry for farmers, households, beneficiaries, facilities, schools, villages, groups, training participants, health workers, and custom entities. It owns profile records, project enrollment, duplicate prevention, longitudinal history, entity assignment, and entity-level audit history.
- Mapping contains GIS visualization, boundaries, layers, GPS validation, coverage monitoring, and spatial analysis.
- Field Operations contains assignments, field teams, supervisors, targets, work plans, sync readiness, and field monitoring.
- Submissions contains collected records, review, approval, rejection, correction, and submission history.

## Form vs Project Settings

- Use form-level settings for permissions, workflow, reference data, data quality rules, mapping settings, version history, and audit trail tied to one form.
- Use project-level settings for project team assignment, locations, objectives, indicators, donor metadata, beneficiary scope, and project-wide reporting.
- Never allow orphan forms. A form must belong to a project context.
- Never allow orphan beneficiaries/entities. A beneficiary/entity must be enrolled in a project at creation or import time.
- Never allow orphan submissions. A submission must retain organization, project, form, enumerator, timestamp, and GPS metadata when applicable.

## Entity-Centric Data Collection

**Rule:** Forms collect records, but beneficiaries/entities are the anchor for longitudinal M&E tracking.

**Project linkage rule:** Every beneficiary/entity must be linked to a project, and every data collection form must be linked to a project before it can be built, published, assigned, or pushed to mobile.

**Allowed beneficiary creation paths:** Beneficiaries/entities may only enter the platform through a project-scoped import in the web application or through a project-linked registration form completed by a field officer and synced from mobile. Do not add a separate free-form manual beneficiary registration workflow.

Purpose:

- Register each farmer, household, beneficiary, facility, school, village, group, training participant, health worker, or custom entity once.
- Link many forms and submissions to the same entity over time: registration, baseline, monitoring visits, training attendance, distributions, endline, follow-up, and case history.
- Prevent duplicate farmers/beneficiaries and reduce repeated profile data entry.
- Prepare the backend contract for a future offline-first mobile app without building mobile screens now.

Canonical ownership:

- Beneficiaries owns entity profile, entity ID, project enrollment, duplicate checks, merge workflow, entity assignment, profile history, and entity audit events.
- Projects exposes `/projects/:projectId/beneficiaries` as the project-specific entity scope and coverage view.
- Forms owns form-level entity controls: whether a form creates, updates, requires, or allows anonymous entity records; duplicate controls; frequency rules; and prefill mappings.
- Submissions owns collected records and must support nullable `entity_id`, `entity_type`, `frequency_period`, and `event_id` so older non-entity submissions remain valid.
- Field officer submissions must enter the review queue as submitted evidence. Validation, duplicate, GPS, and data-quality checks may flag issues and recommend review attention, but they must not automatically approve, reject, or discard submitted data. Authorized reviewers decide whether to approve, reject, return for correction, override, or archive.
- Data Quality owns duplicate resolution, investigations, merge reason, quality issue lifecycle, and confirmed duplicate signals.
- Governance owns immutable audit visibility for entity creation, profile change, duplicate override, merge, frequency block, prefill rule change, and entity-linked submission events.

Entity registry requirements:

- Entity IDs must be unique and human-readable, such as `FRM-2026-000001`, `HH-2026-000001`, `BEN-2026-000001`, and `FAC-2026-000001`.
- Supported entity types include Farmer, Household, Beneficiary, Facility, School, Village, Group, Training Participant, Health Worker, and Custom Entity.
- Status values include Active, Inactive, Deceased, Moved, Duplicate, and Archived.
- Registration must run duplicate checks before save and show possible matches when phone, national ID, household ID, name/date of birth, name/village, or GPS proximity indicates risk.
- Duplicate creation must never be silent. Users must use the existing record, cancel, send for supervisor review, or continue only with a reason and sufficient permission.
- Web imports must require a target project before beneficiary rows can be applied. If legacy data has no project field, the selected target project becomes the project enrollment.
- Mobile-created beneficiaries must come from a published, project-linked form whose entity controls allow creating the entity type.

Entity-linked form behavior:

- Registration forms may create a new entity and should usually be once ever per entity.
- Baseline and endline forms require an existing entity and should usually be once per project per entity.
- Monitoring forms require an existing entity and may be once per month, once per quarter, once per season, or unlimited depending on the form settings.
- Training attendance and distribution forms may be once per event or once per distribution cycle.
- Entity-linked submissions must start with Search Existing Entity unless the form explicitly allows anonymous submissions.

Submission frequency rules:

- Frequency validation must run on the frontend for user guidance and on the backend as final authority.
- Supported rules include once ever per entity, once per project per entity, once per year, once per season, once per quarter, once per month, once per event, and unlimited repeat submissions.
- Frequency blocks and overrides must write immutable governance audit events and may create Data Quality issues.

Prefill engine:

- Forms can prefill question values from entity profile fields such as farmer name, gender, phone, village, household ID, GPS, and date of birth.
- Prefilled fields may be read-only, editable, editable with reason, editable only by supervisor, or configured to update the profile after submission.
- Profile updates from submissions require audit logging and may require supervisor approval when sensitive fields change.

Mobile-ready architecture placeholders:

- Future mobile apps should consume assigned projects, assigned entities, assigned forms, published form versions, reference data, locations, duplicate rules, frequency rules, prefill data, returned submissions, and sync-ready upload APIs.
- Required API contracts include assigned entities, assigned forms, sync package, prefill data, duplicate rule package, frequency rule package, submission upload package, and sync conflict responses.
- Do not create mobile screens in the web app. Web work should expose typed backend/data contracts that can later be consumed by offline-first mobile sync.

## M&E Data Governance and Cleaning

Purpose:

- Protect approved results, preserve source traceability, and make data cleaning visible before records feed indicators, reports, dashboards, and donor outputs.
- Keep data correction, beneficiary profile updates, duplicate reconciliation, export logging, and lineage inside the existing Governance, Data Quality, Submissions, and Beneficiaries ownership boundaries.

Rules:

- Each form question should carry a data dictionary entry: variable name, response type, definition, allowed values, indicator mapping, sensitivity level, and source-of-truth role.
- Submission lifecycle is `draft -> submitted -> under_review -> approved -> returned -> rejected -> archived`. Field officer and mobile submissions must not be approved automatically.
- Approved submissions are locked. Corrections to approved records must create a change request with reason, old values, new values, actor, timestamp, and affected fields instead of silently overwriting the approved record.
- Every answer edit before approval must create change history. Store old value, new value, actor, timestamp, reason, and source submission context in Governance data version records.
- Approved beneficiary-linked submissions may create beneficiary records, link submissions to beneficiaries, append beneficiary timeline events, and record lineage from form/question/submission to beneficiary fields.
- Sensitive beneficiary profile changes such as name, phone, village, GPS, national ID, or household ID must create a profile conflict/reconciliation signal unless the governing workflow explicitly allows automatic update.
- Data Quality owns cleaning queues for missing values, duplicates, outliers, invalid GPS, inconsistent answers, and profile conflicts. Backend signals should be exposed to the Data Quality module rather than hidden inside form or submission screens.
- Excel-style form data views must show row-level source, status, quality flags, and imported-vs-field-submitted provenance.
- Exportable operational data must call export governance before download where practical, logging dataset type, format, filters, record count, requester, risk score, and anonymization state.
- Row-level access remains mandatory. APIs must enforce organization scope first, then project, location, team, role, assignment, and donor/viewer aggregation rules as the endpoint supports them.
- Data retention and archiving rules belong in Governance. Reports and dashboards must not bypass retention, anonymization, legal hold, or export restrictions.
- Quarterly or formal donor reporting should use frozen report snapshots so later corrections do not silently change historical reported results.

## Mobile App Architecture

Purpose:

- The mobile app is an Android-friendly, offline-first field extension of Atlas FieldOps.
- Mobile is for field data collection, assigned beneficiaries/entities, assigned forms, supervisor-ready correction workflows, local drafts, attachments, audit events, and sync.
- Mobile is not a second administration, governance, reports, mapping analytics, or platform console experience.

Ownership and placement:

- Mobile code lives under `mobile/`.
- Shared mobile-safe TypeScript contracts live under `shared/types/`.
- Mobile backend contracts are exposed under `/api/v1/mobile/*`.
- Mobile must consume API/data contracts and must not depend on web UI logic, web routes, or browser-only state.

Required mobile contracts:

- User, Organization, Project, Assignment, Entity/Beneficiary, Location, Form, Form Version, Question, Reference Data, Submission, Submission Draft, Attachment, Notification, Sync Queue Item, and Audit Event.
- Offline-capable records must include `localId`, `serverId`, `syncStatus`, `createdAt`, `updatedAt`, `lastSyncedAt`, nullable `deviceId`, nullable `conflictStatus`, and nullable `deletedAt`.

Required mobile API namespace:

- `GET /api/v1/mobile/bootstrap`
- `POST /api/v1/mobile/devices/register`
- `GET /api/v1/mobile/version-policy`
- `GET /api/v1/mobile/projects`
- `GET /api/v1/mobile/assignments`
- `GET /api/v1/mobile/forms`
- `GET /api/v1/mobile/form-versions`
- `GET /api/v1/mobile/entities`
- `GET /api/v1/mobile/locations`
- `GET /api/v1/mobile/reference-data`
- `GET /api/v1/mobile/returned-submissions`
- `GET /api/v1/mobile/notifications`
- `GET /api/v1/mobile/sync`
- `POST /api/v1/mobile/submissions`
- `POST /api/v1/mobile/attachments`
- `POST /api/v1/mobile/audit-events`
- `POST /api/v1/mobile/sync`

Mobile pilot administration:

- Organization-level mobile deployment controls belong in Administration, not Platform Console, because they manage an organization field rollout.
- The canonical route is the `/administration/mobile` hub with Devices, Versions, Pilots, Monitoring, Feedback, and Testing tabs. Legacy routes `/administration/mobile-devices`, `/administration/mobile-devices/:deviceId`, `/administration/mobile-versions`, `/administration/mobile-pilots`, `/administration/mobile-monitoring`, `/administration/mobile-monitoring/crashes`, `/administration/mobile-feedback`, and `/administration/mobile-testing` remain valid and resolve to the matching hub tab.
- Mobile device records track device ID, device name, user, organization, Android version, app version, registration date, last sync, last login, status, remote logout readiness, and future remote wipe readiness.
- Version management must define current production version, staging version, minimum supported version, optional update state, mandatory update state, and release notes.
- Pilot records must track pilot name, project, dates, devices, field officers, supervisors, status, submissions, sync failures, crashes, issues, and feedback.
- Crash reports, diagnostics, feedback, and field test records must never contain sensitive form answers.

Offline-first rules:

- Draft submissions must be saved locally before sync.
- Every offline action that changes server state must create a sync queue item.
- Mobile duplicate checks are advisory; backend duplicate and frequency checks remain the final authority.
- Mobile audit events must queue locally and sync to Governance Audit Trail.
- Tokens must be stored in secure device storage when the concrete mobile runtime is connected. Passwords must never be stored.

Entity-linked mobile collection:

- The canonical field flow is Assignment -> Select Entity -> Select Form -> Load Prefilled Data -> Complete Form -> Save Draft -> Queue Submission -> Sync.
- Entity-linked mobile submissions must preserve project, assignment, form, form version, entity, frequency period, event, GPS, attachment, and audit metadata.
- Anonymous submissions are allowed only when the published form version explicitly allows anonymous collection.

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
