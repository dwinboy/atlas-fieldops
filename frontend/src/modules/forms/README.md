# Forms Module

This module follows `docs/PLATFORM_INFORMATION_ARCHITECTURE.md`.

## Ownership

Forms owns the data collection instrument layer:

- form design, building, and versioning (`FormCreationWorkspace.tsx`)
- form lifecycle: draft, testing, published, archived (`FormsModule.tsx`)
- form templates and reference data bindings
- form-level analytics, governance readiness, and offline readiness
- collected data grid per form (uploads, review state, exports)

It does not own submission review workflows (Submissions), field assignment
execution (Field Operations), indicator definitions (Indicators), or
system-wide reference data (Administration).

## Files

- `FormsModule.tsx` — section router, form lists, status cards, analytics,
  governance dashboard, data grid workspace.
- `FormCreationWorkspace.tsx` — the canonical builder: setup → builder →
  controls → test → review → approve → publish lifecycle.
- `data.ts` — section config, detail tabs, preview data.
- `utils.ts` — status/quality tones and summaries (status colors delegate to
  `@/lib/statusTones`).

## Routes

- `/forms` (overview), `/forms/all`, `/forms/analytics`, `/forms/draft`,
  `/forms/published`, `/forms/archived`, `/forms/templates`,
  `/forms/reference-data`, `/forms/governance-dashboard`, `/forms/create`

## User Workflow

1. Start a form from blank, template, duplicate, or XLSForm import.
2. Build questions, configure controls (validation, workflow, governance,
   GPS, duplicates), and test in mobile preview.
3. Pass the publish readiness checklist and publish.
4. Assign the published form to field officers (hands off to Field
   Operations).
5. Monitor submissions, quality, and version history; create new versions or
   duplicate for the next round; archive retired forms for audit.

## Data Sources

- `GET/POST /api/v1/forms`, `GET /api/v1/forms/:id/schema`,
  `PATCH /api/v1/forms/:id`, form controls and publish endpoints.
- Preview mode uses typed local data from `data.ts` plus
  `useWorkspaceStore` local forms.
