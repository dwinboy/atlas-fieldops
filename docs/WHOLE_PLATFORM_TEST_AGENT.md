# Whole Platform Test Agent

This document defines the Atlas FieldOps whole-application test agent and the release-testing system it must follow.

Use it whenever we need to test the platform end to end, validate production readiness, or prove that a workflow is truly working beyond isolated module demos.

Before executing a sweep, read:

- `/Users/edwin/Documents/Codex/Projects/Atlas-FieldOps/docs/PLATFORM_INFORMATION_ARCHITECTURE.md`
- relevant module README files under `frontend/src/modules/`

## Mission

The Whole Platform Test Agent exists to answer one question:

**Can a real organization use Atlas FieldOps successfully from setup to decision-making without hitting broken workflows, confusing UI, bad permissions, or invalid data movement?**

This agent does not stop at unit tests. It tests:

- backend behavior
- frontend behavior
- mobile readiness
- role permissions
- UI clarity
- UX friction
- data integrity
- auditability
- cross-module linkage

## No-Untested Rule

Do not leave any major module or workflow in an undefined state.

Every release sweep must classify each area as exactly one of:

- `PASS`
- `FAIL`
- `BLOCKED`
- `NOT APPLICABLE`

If an area is `BLOCKED` or `NOT APPLICABLE`, record why.

No ship decision is valid while a critical area is left unclassified.

## Live Data Rule

Use live non-preview flows for any test that claims a workflow really works.

Preview mode is acceptable only for:

- visual sanity checks
- empty-state checks
- layout checks
- sample dashboard or report rendering

Preview mode is not enough for sign-off on:

- authentication
- permissions
- saving settings
- project creation
- form publishing
- submissions
- approvals
- entity updates
- imports
- reporting accuracy
- audit logging

## Core Test Lanes

Every full sweep must cover all of these lanes:

1. `Static checks`
2. `Automated tests`
3. `Browser workflow tests`
4. `Role and permission tests`
5. `Data integrity tests`
6. `UI and UX review`
7. `Error-state and recovery tests`
8. `Mobile API readiness tests`
9. `Cross-module regression checks`

## Automated Baseline

Run these first so obvious regressions fail fast.

### Backend

```bash
cd backend
pip install -e ".[dev]"
ruff check app tests alembic
mypy app
DATABASE_URL=postgresql+asyncpg://ci:ci@localhost:5432/ci alembic upgrade head --sql
pytest
```

### Frontend

```bash
cd frontend
npm install
npm run lint
npm test -- --run
npm run build
npm run build-storybook
```

### Mobile

```bash
cd mobile
npm install
npm run typecheck
```

If any baseline check fails, record the failure before moving to deeper UX review.

## Required Role Matrix

Test the platform with these roles whenever the module supports them:

- Super Admin
- Organization Admin / System Admin
- Project Manager
- M&E Manager
- Data Manager
- Supervisor
- Field Officer
- Viewer / Donor

For each role, verify:

- allowed routes
- forbidden routes
- sidebar visibility
- action button visibility
- backend-enforced authorization
- organization/project/location isolation

## Cross-Sector Scenario Matrix

Because Atlas FieldOps is sector-agnostic, full sweeps must not only test M&E language.

Run at least these scenarios:

1. `Agriculture / M&E`
   - Organization creates a farmer productivity project.
   - Project uses entity-linked forms, approval workflow, metrics, and beneficiary history.

2. `Retail / Inventory`
   - Organization creates a stock monitoring project.
   - Project uses products, stores, suppliers, stock counts, and inventory forms.

3. `Health / Facility Monitoring`
   - Organization creates a health facility assessment project.
   - Project uses facilities, service records, GPS evidence, and compliance review.

4. `Custom Sector`
   - Organization creates a custom project pack.
   - Project defines custom entity categories, custom forms, and custom terminology.

If a sweep only tests one sector, the report must say so clearly.

## End-to-End Business Flows

The Whole Platform Test Agent must run these flows, not just open pages.

### Flow 1: Organization Setup

1. Create or open an organization.
2. Verify organization settings.
3. Verify branding, timezone, language, and feature controls.
4. Create users and assign roles.
5. Verify team hierarchy and permissions.

### Flow 2: Project Setup

1. Create a project.
2. Select a sector pack or custom setup.
3. Configure locations.
4. Configure entity categories.
5. Configure teams and governance.
6. Activate the project.

### Flow 3: Form Lifecycle

1. Create a form.
2. Configure setup and controls.
3. Build questions.
4. Validate responses, logic, and mappings.
5. Review readiness.
6. Publish.
7. Assign to field staff.

### Flow 4: Submission Lifecycle

1. Load assigned work.
2. Submit a draft or completed record.
3. Review the submission.
4. Return, reject, and approve at least one sample each.
5. Confirm workflow status changes everywhere they should appear.

### Flow 5: Entity / Beneficiary Lifecycle

1. Approve a registration or creation form.
2. Confirm one entity record is created with a readable code.
3. Submit a follow-up form for the same entity.
4. Confirm linking updates the same profile instead of creating duplicates.
5. Confirm timeline, records, and lineage update correctly.

### Flow 6: Import And Cleaning Lifecycle

1. Upload data to a published form only.
2. Review mapping, validation, and missing-field guidance.
3. Open the cleaning screen.
4. Edit rows and confirm changes.
5. Finalize import.
6. Confirm imported data appears in submissions, entities, and reporting where expected.

### Flow 7: Reporting And Mapping Lifecycle

1. Open dashboards, reports, and maps.
2. Apply filters.
3. Confirm figures match approved data.
4. Confirm deep links open the correct detail screens.
5. Confirm exports and popups obey permissions.

## UI And UX Review Standard

For every major screen, verify:

- page title is visible
- page description or context is clear
- primary action is obvious
- empty state exists
- loading state exists
- error state exists
- filters work
- search works
- tables scroll horizontally and vertically when needed
- dropdowns work with mouse and keyboard
- tabs and deep links work
- no overlapping layout exists
- no dead buttons exist
- next step is obvious to a first-time user

## Module Coverage Matrix

Every full sweep must mark each row with a result.

| Module | What Must Be Tested | Minimum Evidence |
| --- | --- | --- |
| Public Website | marketing routes, SEO pages, contact/demo/signup flows, responsive layout | route list + screenshots + any broken links |
| Authentication | login, logout, session persistence, wrong-password behavior, protected redirects | API response + route behavior |
| Platform Console | organizations, quotas, feature flags, health, security, backups, audit | role check + save check |
| Organizations / Users & Teams | org creation, memberships, stacked roles, teams, role edits, permission inheritance | created user + access result |
| Projects | wizard, sector pack, locations, entity config, governance, activation, overview stats | created project + saved settings |
| Forms | create, controls, builder, review, approval, publish, versions, templates, data grid | form lifecycle evidence |
| Submissions | filters, review actions, status updates, approval chain, source labels, bulk actions | created submission + review actions |
| Entities / Beneficiaries | creation, linking, duplicate prevention, lineage, timeline, records tabs | one linked entity history |
| Field Operations | assignments, officer profiles, work plans, targets, field monitoring | assignment record + visibility |
| Mapping | layers, filters, boundaries, popups, exports, permissions, map workspace UX | visible layer evidence |
| Indicators / Metrics | definitions, baselines, targets, mappings, live values, progress views | indicator linked to data |
| Reports / Dashboards | report builder, custom reports, dashboards, filters, exports, permissions | rendered report/dashboard |
| Data Quality | duplicates, missing data, reconciliation, issue drill-down | issue open -> source link |
| Governance | audit trail, approvals, policy surfaces, retention or compliance views | audit event evidence |
| Administration | system settings, imports, integrations, notifications, API settings | save + load confirmation |
| Mobile API Readiness | bootstrap payload, assignments, forms, entities, notifications, sync endpoints | endpoint response evidence |

## Data Integrity Assertions

Every full sweep must confirm:

- approved data appears in the correct project
- approved data is visible in submissions
- approved data updates linked entity records when configured
- duplicate prevention works before new records are created
- returned data preserves correction history
- reports and dashboards use governed data, not raw drafts unless explicitly designed
- project, organization, and role boundaries prevent data leakage

## Error And Recovery Scenarios

The test agent must intentionally hit failure paths:

- invalid login
- forbidden route access
- missing required fields
- duplicate entity candidate
- returned submission correction
- rejected submission with reason
- import row validation issue
- failed media upload
- empty dashboard/report/map state
- missing GPS or low-accuracy GPS warning

## Browser Test Method

Use real browser interaction, not only code reading.

For each workflow:

1. open the route
2. click the real controls
3. fill the form with realistic data
4. confirm the API result if possible
5. confirm the data appears in downstream modules
6. verify layout, labels, spacing, and clarity
7. record the result

## Evidence Format

Use this structure for every module or flow tested:

```text
Area:
Role:
Route:
Scenario:
Expected:
Actual:
Result: PASS | FAIL | BLOCKED | NOT APPLICABLE
Evidence:
Follow-up:
```

## Severity Rules

- `Critical` - production blocker, data loss, broken auth, broken isolation, broken submission or approval flow
- `High` - major workflow broken, misleading status, wrong data linking, broken permissions, broken publish path
- `Medium` - workflow works but is confusing, inefficient, or visually broken
- `Low` - polish, content, spacing, or minor clarity issue

Critical and High issues block release sign-off.

## Release Sign-Off Gates

Do not call the platform production-ready unless all of these are true:

- automated baseline passes
- major routes load
- role matrix is verified
- one end-to-end business flow succeeds from setup to reporting
- one entity-linked flow succeeds from submission to approved record linkage
- one import-clean-finalize flow succeeds
- reports, dashboards, and mapping reflect governed data correctly
- no critical or high issue remains open

## Recommended Execution Order

1. Architecture and route review
2. Automated baseline
3. Authentication and permissions
4. Organization and users
5. Project setup
6. Form lifecycle
7. Submission lifecycle
8. Entity lifecycle
9. Imports and cleaning
10. Field operations
11. Mapping
12. Indicators
13. Reports and dashboards
14. Governance and audit
15. Mobile API readiness
16. Regression sweep

## Practical Rule For Future Agents

If time is limited, reduce depth only after recording what was skipped.

Do not say "tested the platform" unless the report shows:

- what was tested
- what role was used
- what route was used
- what data was created or changed
- what passed
- what failed
- what remains blocked

That is the minimum bar for a trustworthy Atlas FieldOps release test.
