# Workspace UX Changelog

Companion to `docs/ux-audit.md`. Each phase shipped as its own commit; the app builds, lints,
and passes the full test suite (318 frontend / 247 backend) after every phase. No backend, API,
auth, permission, routing, React Query, or Zustand behavior was changed.

## Phase 1 — Tokens & primitives (commit: "UX Phase 1")
- **What:** Purged the last legacy `bg-panel` / `shadow-line` surfaces from every shared
  component so 100% of the workspace renders from the token layer (surface scale, border-subtle,
  on-surface, brand emerald #005232). Added `tabular-nums` at the DataTable level. Built three
  missing primitives: `ui/drawer.tsx` (right-side review panel, full-screen < md),
  `ui/page-header.tsx`, `ui/filter-bar.tsx` (+`FilterField`).
- **Why:** The audit's top finding — token *existence* was solved earlier, token *enforcement*
  wasn't; numbers wobbled on sort; three patterns were hand-rolled divergently per module.
- **Follow-ups:** Migrate module header bands to `PageHeader` and the three bespoke filter grids
  to `FilterBar` opportunistically during future touches (both are drop-in).

## Phase 2 — Global shell (commit: "UX Phase 2")
- **What:** Permanent **project switcher** in the topbar — shows the current project (from
  `/projects/:id/*` routes), lists projects for one-click jumps, links to the repository.
  Navigation-only (no global data filter) and gated on `projects.view`. Topbar slimmed 56 → 52px.
- **Why:** Everything anchors to a project; context switching previously required re-navigating
  the Projects module.
- **Decision recorded:** Nav group labels kept as-is per `PLATFORM_INFORMATION_ARCHITECTURE.md`;
  regrouping (Forms → "Build") deliberately not done without an IA decision.

## Phase 3 — Submissions review UX (commit: "UX Phase 3")
- **What:** Keyboard-driven review in the detail view — `j`/`k` step through the *filtered*
  queue, `a` approves, `r` opens the reject dialog; disabled while typing / dialog open;
  permission-gated; reuses the existing review handlers 1:1. A queue-position bar shows
  "Record N of M" plus the shortcut legend. **Saved views**: name the current filter set,
  restore/delete via chips (localStorage, per browser — no backend contract change).
- **Why:** The workhorse screen; reviewers previously lost queue context on every record and
  rebuilt the same filters daily.
- **Follow-ups:** True side-by-side split view (list + drawer) using the new Drawer primitive is
  staged but not wired — needs a data-rich environment to validate ergonomics before replacing
  the current detail workspace. Bulk actions remain inline (floating action bar deferred).

## Phase 4 — States & motion (commit: "UX Phase 4")
- **What:** `DataTable` gained a `loading` prop rendering layout-matched skeleton rows
  (`aria-busy`, both breakpoints) instead of flashing the empty state mid-load; wired into
  Submissions + Projects tables. Removed hover translate lifts from all Button variants —
  hover is now color/shadow only.
- **Why:** Empty-state flash read as "no data" during fetch; per-button bounce was the loudest
  motion in an otherwise quiet UI.
- **Follow-ups:** Adopt `loading` on remaining module tables as they're touched; a few
  `hover:-translate-y-0.5` card lifts remain on dashboard quick-action cards (intentional for
  now — they're navigation cards, not controls).

## Phase 5 — Accessibility & QA (this commit)
- **What:** Live probe across Dashboard, Submissions, Projects, Forms: **0 unnamed buttons**
  (all icon-only controls carry `aria-label`). Global `:focus-visible` rings and
  `prefers-reduced-motion` were already token-based and respected. Dialogs are Radix-managed.
- **Deferred / manual review:** per-instance AA contrast spot-checks on `muted`-tinted chips;
  dark-mode pass over the new token values (references were light-only); tablet review-flow
  walkthrough with real submission data.

## Standing constraints honored
Backend, mobile, DB, migrations, API contracts, auth, permissions, routes, workflows, React
Query fetching, and Zustand behavior untouched. No new dependencies. No mock data introduced.
