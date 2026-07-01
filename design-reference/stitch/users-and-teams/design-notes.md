# Users And Teams Design Notes

## Likely Screen

The `fieldops-mission-control` reference represents organization personnel, permissions, team hierarchy, invites, and data integrity controls.

## Visual System

- Key colors: emerald `#005232`, emerald container `#006d44`, teal `#006a61`, cyan `#06B6D4`, dark emerald `#0C1F1B`, off-white `#FAFAF8`.
- Typography: Inter, strong section labels, compact role/status metadata.
- Layout: sidebar, top bar, stats grid, organization directory, team hierarchy, invite hub, integrity panel.
- Cards: white and pale-green command cards, rounded 16 to 24 px, subtle borders, status chips.
- Tables/lists: personnel directory with avatars or initials, role badges, team labels, online/offline status, row actions.
- Forms: invite user and create team modals with straightforward fields and clear validation.
- Buttons: emerald primary for create/invite, secondary for audit/log actions, icon-leading labels.
- Navigation: left mission-control sidebar and top notification/search controls.
- Shadows: soft operational dashboard shadows.
- Border radius: 12 to 24 px, rounded avatar and status treatments.
- Responsive behavior: stats and directory collapse vertically; modal forms remain centered and scrollable.
- UX patterns to replicate: organization owner should understand where to manage users, roles, permissions, teams, invites, and hierarchy from one workspace.

## Warnings

Ignore Stitch mock users, fake notifications, generated team counts, and local modal-only behavior. Preserve Atlas user APIs, role assignments, permissions, organization isolation, hierarchy rules, and account security flows.

