# Forms Design Notes

## Likely Screen

The `fieldops-precision-intelligence` reference represents form management, form workspace, form builder modal, submission activity, and governance panel.

## Visual System

- Key colors: emerald `#005232`, primary hover `#004026`, teal `#006a61`, purple `#2f2ebf`, off-white `#FAFAF8`, dark emerald `#0C1F1B`, pale green surfaces `#e1f2eb`, error red `#ba1a1a`.
- Typography: Inter, strong form titles, compact repository tabs, clear field labels.
- Layout: sidebar, header/search, KPI cards, form repository cards, form workspace, governance panel, builder modal.
- Cards: rounded form cards with status, sector, submission counts, trend micro-visuals, and quick actions.
- Tables/lists: form repository tabs for all/published/drafts, filter controls, submission/audit lists.
- Forms: builder modal and workspace should use grouped controls, clear validation, and low-clutter panel hierarchy.
- Buttons: emerald primary for create/publish, neutral secondary for reset/filter/view, danger only for destructive actions.
- Navigation: left sidebar plus header search; active Forms tab is visually prominent.
- Shadows: light panel shadows and focus rings.
- Border radius: 12 to 24 px; inputs have rounded 12 px and emerald focus ring.
- Responsive behavior: repository cards stack; builder workspace remains usable with scrollable panels.
- UX patterns to replicate: form managers should quickly see status, governance readiness, sector, submissions, and next action without losing the existing builder behavior.

## Warnings

Ignore Stitch localStorage, fake form creation, fake submissions, generated audit logs, and mock sector filters. Preserve Atlas form lifecycle, builder structure, controls, readiness engine, publish/versioning, assignment delivery, and backend APIs.

