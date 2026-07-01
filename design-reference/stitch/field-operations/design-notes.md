# Field Operations Design Notes

## Likely Screen

The `field-operations-dashboard` reference represents a mission-control dashboard for assignments, teams, live field activity, workflow steps, and GIS map access.

## Visual System

- Key colors: brand primary `#005232`, primary container `#006d44`, light emerald `#93ecb8`, secondary teal `#006a61`, cyan `#06B6D4`, error `#ba1a1a`, off-white `#FAFAF8`.
- Typography: Inter with bold command-center headings, tiny uppercase labels, compact table text.
- Layout: sticky top app bar, KPI card grid, main two-column dashboard with work plan/table on the left and live feed on the right.
- Cards: white rounded 2xl cards, subtle border `#E2E8F0`, low shadows, pale icon wells, hover lift.
- Tables: filtered schedule table with segmented status filter, compact rows, avatars/initials, progress bars, and status chips.
- Forms: assignment modal uses grouped fields, rounded inputs, emerald primary action, clear cancel/close affordance.
- Buttons: emerald filled primary, white or pale secondary, icon-leading labels.
- Navigation: left sidebar and segmented module tabs; active item uses strong emerald contrast.
- Shadows: `0 1px 2px` and soft larger shadows for panels.
- Border radius: mostly 12 to 24 px, with rounded full status chips.
- Responsive behavior: KPI cards stack, live feed moves below main content, controls wrap.
- UX patterns to replicate: live telemetry feed, assignment progress cards, field workflow visualizer, and map drawer should remain visually calm and operational.

## Warnings

Ignore Stitch mock teams, local alerts, fake map nodes, and local modal state. Preserve Atlas assignment APIs, field officer permissions, React Query data, status transitions, mobile sync behavior, and audit hooks.

