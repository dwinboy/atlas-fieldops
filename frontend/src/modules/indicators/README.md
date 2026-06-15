# Indicators Module

Indicators owns metrics, KPIs, baselines, targets, result structures, formulas, disaggregation, and progress tracking.

## Routes

- `/indicators` opens the overview.
- `/indicators/library` opens the metric library.
- `/indicators/targets` opens target management.
- `/indicators/baselines` opens baseline management.
- `/indicators/reports` opens metric reporting handoff.
- `/indicators/results-framework` opens the live results framework.
- `/indicators/logframes` opens the live logframe view.

The module syncs its active tab with the browser route. When adding a new section, update `indicatorSections` in `data.ts` and the route sync helper in `IndicatorsModule.tsx`.

## Live Behavior

- The metric library loads indicators from the backend in authenticated mode and preview data in preview mode.
- Targets and baselines expose row actions for updating values through the existing metric edit flow.
- Preview targets, baselines, results-framework levels, and logframes can add draft rows so users can understand the workflow without hitting dead controls.
- Results Framework is derived from live indicators grouped by project and result area.
- Logframes are derived from live indicators, baselines, targets, data sources, and assumptions.

## Boundaries

- Indicators defines metrics and progress logic.
- Forms owns question design and form-level data dictionary settings.
- Submissions owns raw collected evidence and approval status.
- Reports owns formal report outputs, exports, schedules, and dashboard packages.
