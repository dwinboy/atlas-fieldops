# Atlas FieldOps Web Modules

Feature-specific frontend work belongs in these business modules:

- `dashboard` - executive and manager landing summaries
- `projects` - project/program setup, teams, locations, assignments, reports
- `forms` - builder, templates, governance, permissions, workflow, publishing
- `field-operations` - assignments, officers, supervisors, work plans, targets
- `submissions` - collected records, review, correction, approval, archive
- `mapping` - GIS, GPS, coverage, layers, boundaries, spatial validation
- `indicators` - indicator library, logframes, baselines, targets, progress
- `reports` - standard reports, custom reports, exports, scheduled outputs
- `data-quality` - duplicates, outliers, missing data, validation, risk alerts
- `users-teams` - users, roles, teams, organizations, permissions, activity
- `governance` - audit, policy, approvals, retention, consent, compliance
- `administration` - system settings, reference data, APIs, integrations, backups

Before adding or moving a page, read `docs/PLATFORM_INFORMATION_ARCHITECTURE.md` and update `frontend/src/config/navigation.ts` when route or sidebar behavior changes.

Module-specific implementation notes:

- `indicators/README.md` - metric routes, live results framework, logframes, baselines, and targets.
- `mapping/README.md` - live GIS sections, source-record inspection, facility classification, and spatial exports.
- `reports/README.md` - live reports, custom previews, dashboard sources, scheduling readiness, and export governance.
