# M&E Platform Expansion

## Product Direction

Atlas FieldOps is now shaped as an English-only monitoring, evaluation, and field operations platform for NGOs, governments, agriculture programs, health systems, education programs, and humanitarian teams.

The expansion keeps the product simple for non-technical teams while adding operational depth:

- Beneficiary registry for households, farmers, cooperatives, schools, clinics, and groups.
- Program and project tracking for donor-funded interventions.
- Indicator registry with baselines, targets, current values, formulas, and SDG mapping.
- Case management for complaints, referrals, corrections, escalations, and follow-ups.
- Geospatial coverage surfaces for villages, farm boundaries, supervisor routes, and offline map packs.
- Data quality signals for duplicate detection, suspicious GPS, impossible travel speed, and reused media.
- Donor reporting center for PDFs, Excel exports, logframes, map exports, and narrative summaries.
- Connectivity center for delta sync, compressed uploads, retry windows, SMS, and WhatsApp readiness.
- PWA manifest and service worker shell caching for installable, low-connectivity web access.

## Backend Additions

The `/api/v1/operations` API namespace contains the first M&E operations endpoints:

- `GET /summary`
- `GET|POST /programs`
- `GET|POST /beneficiaries`
- `GET|POST /indicators`
- `GET|POST /cases`
- `GET|POST /reports`

All routes use tenant-scoped permissions and the existing async FastAPI service/repository pattern.

## Database Additions

Migration `20260528_0003` adds:

- `beneficiaries`
- `monitoring_indicators`
- `case_records`
- `visit_records`
- `data_quality_signals`
- `donor_reports`
- `organization_branding`
- `offline_sync_policies`

The schema keeps `organization_id` on every operational table, includes indexing for common filters, and stores location columns for map and geospatial query evolution.

## UX Principles

The frontend intentionally avoids exposing implementation language. Users see “Programs,” “Beneficiaries,” “Indicators,” “Cases,” “Map,” “Reports,” and “Connectivity” rather than technical subsystem names.

The design favors readable tables, clear status badges, short descriptions, visible next actions, and offline confidence messaging.
