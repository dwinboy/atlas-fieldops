# Reports Module

Reports owns standard reports, custom report views, dashboard sources, schedules, exports, and formal output packages.

## Routes

- `/reports` opens the overview.
- `/reports/standard` opens the report library.
- `/reports/custom` opens the custom report builder.
- `/reports/dashboards` opens dashboard source management.
- `/reports/scheduled` opens scheduled report readiness and schedules.
- `/reports/exports` opens export center.

The module syncs its active section with the browser route. Section tabs and internal report actions keep the URL aligned.

## Live Behavior

- Standard Reports load backend report records and can generate metrics from approved data.
- Custom Reports preview matching live reports from the selected data source.
- Custom Reports can export setup, export preview rows, and prepare a share package from selected fields, filters, data source, and visualization.
- Dashboards are derived from report categories and visualization-ready report records.
- Scheduled Reports shows existing schedules and a readiness table for reports that can be scheduled.
- Exports are derived from report readiness and link back to the source report.
- Preview dashboard, schedule, and export actions create draft rows so users can see the workflow without leaving the page.
- Export rows allow users to open the source report or export computed CSV data when governance permits.

## Boundaries

- Reports consumes approved data from Projects, Forms, Submissions, Indicators, Mapping, Data Quality, and Field Operations.
- Reports does not own raw data correction, metric definitions, GIS validation, or form design.
- Governance remains responsible for export permission, audit, retention, and compliance rules.
