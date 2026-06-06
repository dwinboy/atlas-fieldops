# Startup Readiness Audit

This audit was prepared after inspecting the approved platform architecture, public website routes, workspace routes, Platform Console, Administration module, backend models, API routes, marketing lead capture, entity registry, imports/migration, and navigation configuration.

| Feature | Status | Evidence | Recommended Action |
| --- | --- | --- | --- |
| Multi-tenant organizations | Partial | Organization, membership, role, and tenant-owned models exist with `organization_id`; repositories and routes are largely tenant scoped. | Continue enforcing tenant filters in every new repository and add tests for cross-tenant isolation on new modules. |
| Organization self-onboarding | Partial | Public lead capture exists; `/signup` and `/create-organization` now collect onboarding intent. | Add secure automated provisioning workflow when email verification and account creation are ready. |
| Startup onboarding wizard | Partial | `/onboarding` now documents the setup path; dashboard has organization readiness guidance. | Convert onboarding into authenticated checklist state after provisioning. |
| Template library | Partial | Form templates and project templates exist; `/templates` now exposes public template discovery. | Add install analytics for dashboard and indicator templates when those libraries become database-backed. |
| Demo environment | Partial | `/demo` now explains safe sample workspace entry; seeded demo data exists in frontend/backend previews. | Add dedicated demo credentials and resettable seeded tenant if production trial access is enabled. |
| Public API foundation | Partial | `/administration/api-settings` and `AdministrationApiKey` exist with scopes and rate limits. | Add webhook delivery logs and API usage counters per organization. |
| Webhook framework | Missing | Integrations exist, but no first-class webhook subscription/delivery model was found. | Add webhook subscriptions under Administration API settings, with retries and audit logging. |
| Data migration system | Complete | Smart migration assistant, import batches, validation, duplicate detection, preview, project-level import, and source traceability exist. | Keep expanding parser coverage and background processing for large imports. |
| Donor portal | Partial | Viewer/Donor role exists and public `/donor` explains read-only access. | Add authenticated donor landing route backed by approved reports and aggregated maps. |
| White labeling | Partial | Organization-level system settings include platform name, organization name, logo URL, brand color, language, timezone, and security settings. | Apply branding dynamically across authenticated shell and public tenant links. |
| Usage tracking | Partial | Platform usage schema and platform usage API types track users, forms, submissions, beneficiaries, imports, exports, and audit events. | Add API usage and storage counters. |
| Subscription-ready architecture | Partial | Platform plan read types include plan, limits, enabled modules, and usage percent. | Persist plan model and enforce soft usage warnings before payment integration. |
| Organization settings | Complete | Administration System Settings exists and is now organization-admin accessible through `organization.manage`. | Keep dangerous settings confirmed and audited. |
| Integration framework | Partial | Integration and IntegrationConfig models exist with status, environment, owner, metadata, and secret reference. | Add connector-specific schemas for Power BI, Tableau, Google Sheets, DHIS2, Kobo, and ODK. |
| Lead capture system | Complete | `MarketingLead` and `/api/v1/public/leads` exist; contact, book-demo, signup, and onboarding pages reuse it. | Add CRM sync through integrations when required. |
| Public website SEO foundation | Complete | Public marketing pages, metadata, sitemap, robots, canonical URLs, and structured data helpers exist. | Add CMS integration when content volume grows. |
| Beneficiary 360 | Partial | Beneficiary registry, project beneficiary tab, entity-linked submissions, visits, cases, and data quality signals exist. | Enrich entity detail with indicators, assignments, map, history, and audit panels. |
| Follow-up scheduling | Partial | Operational tasks and intervention records exist. | Add workflow rules that create future tasks after baseline/training/review events. |
| Task management | Partial | `OperationalTask` model exists and Field Operations uses operational actions. | Add task inbox and task status transitions if not yet exposed in UI. |
| Communication foundation | Partial | Notification templates/rules and integration models exist. | Add delivery logs, channel health, and email/SMS provider implementations. |

## Immediate Fixes Applied

- Administration backend APIs now use `organization.manage` permission instead of incorrectly requiring `super_admin`, preserving Platform Console as the Super Admin-only workspace while allowing System Admins to manage organization settings.
- Administration section navigation now routes to canonical section URLs, so Settings and Imports & Migration open predictably from the UI.
- Imports & Migration has a clear sample-data test path, so users can test the smart migration assistant without first preparing a file.
- Public startup pages were added for `/demo`, `/signup`, `/create-organization`, `/onboarding`, `/donor`, and `/templates`, with sitemap inclusion and existing lead capture reuse.
