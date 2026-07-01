# Submissions Design Notes

## Likely Screen

The `fieldintel-pro` reference appears to represent an enterprise submissions review and audit dashboard. It includes KPI blocks, filter bar, paginated records, detail panel, approve/return actions, exports, and report modal.

## Visual System

- Key colors: emerald `#005232`, teal `#006a61`, cyan `#06B6D4`, dark emerald `#0C1F1B`, off-white `#FAFAF8`, red `#ba1a1a`, soft purple `#A855F7`.
- Typography: Inter-like sans, bold KPI labels, mono-like IDs, compact metadata.
- Layout: sidebar, top header, KPI strip, filter bar, split record list and detail panel.
- Cards: white panels on pale green background, rounded 2xl, low shadows, light borders.
- Tables/lists: dense submission rows with checkboxes, status chips, officer info, pagination, bulk actions, and selected-row emphasis.
- Forms: review dialogs and report modal should use grouped inputs and clear primary actions.
- Buttons: approve/check actions use success color, return/reject use warning or red, export/report buttons are secondary with icons.
- Navigation: left nav plus top utility search and status controls.
- Shadows: restrained SaaS panel shadows.
- Border radius: 12 to 20 px cards, rounded status badges.
- Responsive behavior: detail panel should collapse under the list on smaller screens.
- UX patterns to replicate: supervisor can scan pending records, select records, open details, approve or return without losing context.

## Warnings

Ignore Stitch localStorage, generated counters, fake approve logic, mock records, and fake report creation. Preserve Atlas backend review endpoints, source tracking, beneficiary/entity linkage, permissions, and audit trail.

