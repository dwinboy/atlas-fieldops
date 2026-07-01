# Projects Design Notes

## Likely Screen

The `atlas-fieldops` reference appears to represent a project repository and operational dashboard for managing initiatives. It includes project cards, KPI grid, detail panel, new project dialog, report modal, filters, search, and grid/list toggles.

## Visual System

- Key colors: deep emerald `#005232`, emerald container `#006d44`, dark command surface `#0C1F1B`, off-white `#FAFAF8`, pale green surfaces `#e7f7f1`, cyan accent `#06B6D4`, purple accent `#A855F7`, error red `#ba1a1a`.
- Typography: Inter-style enterprise UI, strong bold titles, compact uppercase metadata, readable body text.
- Layout: left sidebar, top header, KPI band, project repository grid/list, right-side or modal detail panels.
- Cards: rounded 16 to 24 px, white or pale-green surfaces, subtle borders, low shadows, strong hover states.
- Tables/lists: compact rows, status chips, filters, search, and density suitable for operational scanning.
- Forms: modal-based project creation with grouped fields, clear primary action, dark or emerald call-to-action buttons.
- Buttons: primary emerald filled, secondary pale surface, icon plus text for operational actions.
- Navigation: sidebar plus top utility bar; active state uses emerald or white-on-dark contrast.
- Shadows: soft, low-opacity shadows rather than heavy elevation.
- Responsive behavior: grid should collapse into stacked cards, with filters wrapping cleanly.
- UX patterns to replicate: project cards should expose status, lead, location, KPIs, and quick actions without hiding important context.

## Warnings

Ignore Stitch mock projects, local state, generated reports, fake activity logs, and any fake API behavior. Preserve Atlas project creation, sector packs, permissions, and backend data contracts.

