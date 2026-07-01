# Claude Upgrade Instructions

Use the files under `design-reference/stitch/` as the visual source of truth for UI and UX upgrades.

## Required Rules

- Treat Stitch exports as design references only.
- Do not copy mock data.
- Do not copy generated business logic.
- Do not copy localStorage persistence from Stitch examples.
- Do not copy fake API calls or fake workflow outcomes.
- Do not import Stitch components into the Atlas FieldOps app.
- Do not replace existing modules.
- Do not create duplicate routes.
- Do not remove existing features.
- Do not touch backend or mobile unless the task explicitly asks for it.
- Preserve FastAPI integration, existing API clients, route structure, authentication, permissions, React Query logic, Zustand state, TypeScript types, forms, validation, workflows, and audit behavior.
- Only upgrade UI and UX in the relevant existing Next.js module.
- Aim for close visual similarity to the Stitch reference while keeping Atlas FieldOps functional and production-safe.

## Workflow

1. Read `docs/PLATFORM_INFORMATION_ARCHITECTURE.md`.
2. Read this folder's `IMPLEMENTATION-MAP.md`.
3. Open the relevant `design-notes.md`.
4. Inspect the matching production module under `frontend/src/modules/`.
5. Identify the smallest set of UI changes needed.
6. Refactor existing components instead of replacing them.
7. Use Tailwind CSS and existing Atlas UI primitives where possible.
8. Keep live data, preview data, permissions, mutations, route navigation, and error handling intact.
9. Run targeted lint and TypeScript checks.
10. Do not ship until the changed route builds and renders without console-breaking errors.

## Upgrade Priorities

- Keep user workflows obvious.
- Make dashboards feel like professional command centers.
- Make tables easier to scan.
- Make forms calmer and better grouped.
- Make primary actions clear.
- Make status, progress, ownership, and next actions visible.
- Keep responsive behavior clean on mobile and tablet.

## Common Mistakes To Avoid

- Replacing working Atlas logic with Stitch demo state.
- Introducing hardcoded users, projects, forms, submissions, or organizations.
- Breaking role-based access by hiding checks in UI only.
- Moving functionality to the wrong module.
- Adding mock maps, mock reports, or fake AI actions to production.
- Changing package dependencies only to support a design reference.

