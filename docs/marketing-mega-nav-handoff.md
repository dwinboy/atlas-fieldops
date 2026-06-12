# Marketing Mega Menu Navigation — Handoff

## Status: implemented and verified (tsc/eslint/dev-server/SSR), not yet checked in a real browser

This documents the SurveyCTO-style mega menu added to the public marketing
site (`frontend/app/**` marketing routes, shell in
`frontend/src/components/marketing/MarketingShell.tsx`). The full plan that
was approved before implementation is preserved at
`/Users/edwin/.claude/plans/functional-fluttering-hinton.md` and has the
complete spec/rationale — this file summarizes what landed and what's left.

## What changed

### New files

- `frontend/src/lib/marketing/nav-config.ts` — `NavLinkItem`, `NavSection`,
  `NavCta`, `NavMenu` types + `NAV_CONFIG: NavMenu[]`. This is the single
  source of truth for the nav: Product (3 sections + CTA), Solutions (2
  sections + CTA), Pricing (direct link), Resources (2 sections + CTA). Edit
  this file to change menu content — no JSX changes needed.
- `frontend/src/components/marketing/MarketingNav.tsx` — `"use client"`
  component rendered inside `MarketingShell`'s header. Implements:
  - Desktop mega panels with hover-intent open (150ms) / close (200ms) via
    `window.setTimeout`, instant panel-swap when moving between already-open
    triggers, click-to-toggle, outside-click close (`pointerdown` on
    `navRef`), Escape-to-close with focus returned to the trigger, and
    arrow-key navigation (`ArrowLeft`/`ArrowRight` across top-level triggers,
    `ArrowDown`/`ArrowUp` across `[data-nav-link]` items inside an open panel).
  - Panels are always present in the SSR'd DOM (`aria-hidden` +
    `tabIndex={-1}` when closed) so all links are crawlable for SEO even
    though they're visually hidden.
  - Mobile: hamburger → full-screen drawer, accordion sections (one open at a
    time), body-scroll lock, focus trap + Escape-to-close-and-return-focus.
  - All new UI uses the green/stone CSS-variable tokens from the Phase 1
    design system (`bg-panel`, `border-border`, `text-foreground`,
    `text-muted-foreground`, `bg-primary`, `text-primary`,
    `text-primary-foreground`, `bg-muted`, `ring-ring`, `text-heading-sm`,
    `text-small`) — zero hardcoded hex.
- 13 new placeholder routes (real pages, not `#` links), each
  `MarketingShell` + `marketingMetadata` + `SimplePageHero` +
  `ComingSoonNotice`:
  - `/how-it-works`, `/integrations`
  - `/features/form-builder`, `/features/offline-data-collection`,
    `/features/indicator-frameworks`, `/features/data-quality`,
    `/features/dashboards-reporting`, `/features/mobile-app`
  - `/solutions/agriculture` (static route shadowing `solutions/[slug]`)
  - `/use-cases/monitoring-evaluation`, `/use-cases/baseline-endline-surveys`,
    `/use-cases/impact-evaluations`, `/use-cases/longitudinal-studies`
    (static routes shadowing `use-cases/[slug]`)

  The shadowing pattern was confirmed working: Next.js resolves the static
  route over the dynamic `[slug]` sibling, and both the static page and the
  dynamic page for other slugs (e.g. `/solutions/health`) compile and serve
  correctly.

### Edited files

- `frontend/src/components/marketing/MarketingBlocks.tsx` — added
  `ComingSoonNotice({ backHref, backLabel })`, a small centered card used by
  all 13 placeholder pages. **Deliberately** uses the existing marketing
  hardcoded-hex palette (`border-black/10 bg-white`, `text-[#0d9488]`,
  `text-[#5b6a65]`, `text-[#0c1f1b]`) to stay visually consistent with the
  ~26 untouched marketing pages and the `/status` page style — this is a
  scope decision from the plan, not an inconsistency to "fix".
- `frontend/src/components/marketing/MarketingShell.tsx` — header rewritten:
  swapped the old inline link-row nav + ad-hoc mobile drawer for a single
  `<MarketingNav />`; header chrome (logo badge, wordmark, background/border)
  token-aligned to `bg-background/90`, `text-foreground`, `border-border`,
  `bg-primary`/`text-primary-foreground`; header is now `relative` so mega
  panels (`absolute inset-x-0 top-full`) position against it; added a
  scroll-triggered shadow (`scrollY > 4`). **The outer page wrapper
  (`bg-[#fafaf8] text-[#0c1f1b]`) and the entire dark footer band were left
  untouched** — out of scope per the plan.
- `frontend/src/lib/marketing/content.ts` — removed the now-unused
  `navItems` export (only the old nav consumed it).

## Verification done

- `cd frontend && npx tsc --noEmit -p tsconfig.json` — clean.
- `npx eslint` on all new/edited files above — clean.
- Dev server (`npm run dev`, log was at `/tmp/dev-app.log`) compiled every
  route cleanly with no warnings/errors.
- All 19 relevant routes (existing nav targets + 13 new placeholders)
  returned HTTP 200 (checked via `node -e` + `fetch`, since `curl` is not
  available in this shell).
- SSR HTML for `/` was checked and contains all expected mega-menu `href`s
  (e.g. `/features/form-builder`, `/use-cases/longitudinal-studies`,
  `/solutions/agriculture`, etc.) confirming links are crawlable even with
  panels visually closed.

## Not yet verified (needs a real browser)

No browser automation was available, so the following are implemented per
spec but only checked by code review / SSR output, not live interaction:

- Hover-intent open/close timing and the instant panel-swap between
  Product ↔ Solutions ↔ Resources.
- Click-to-toggle, outside-click close, Escape close + focus return.
- Arrow-key navigation across triggers and within an open panel.
- Chevron rotation on open/close.
- Scroll-shadow appearance on the header.
- Mobile drawer at narrow viewports: accordion (one section open at a time),
  body-scroll lock, focus trap, Escape behavior, "Get Started" pinned to the
  bottom.
- `prefers-reduced-motion` behavior (transitions are disabled via
  `motion-reduce:*` classes but not visually confirmed).

## Branch context — do not confuse with unrelated in-flight work

This branch (`codex/public-website-seo-leads`) has a large amount of other
work in progress from other sessions/agents that is **unrelated to this mega
menu task** and was not touched here:

- Backend: `backend/app/api/v1/routes/{forms,governance,organization_governance,submissions}.py`,
  `backend/app/models/{collection,governance}.py`,
  `backend/app/repositories/{collection,governance,organization_governance}.py`,
  `backend/app/schemas/{collection,governance,organization_governance}.py`,
  `backend/app/services/{collection,governance,mobile,organization_governance}.py`,
  `backend/tests/test_collection_workflow.py`, and a new alembic migration
  `backend/alembic/versions/20260610_0029_surveycto_alignment.py`.
- Mobile: GPS capture/preview, duplicate/frequency rule services, draft
  submission service, entity-select and form-fill screens.
- Frontend app modules (dashboard/forms/governance/mapping/reports/etc. under
  `frontend/src/modules/**`), `AppShell.tsx`, `Dashboard.tsx`, `DataTable.tsx`,
  new `ui/card.tsx`, `ui/dropdown-menu.tsx`, `ui/user-link.tsx`, and a new
  `LeafletMap.tsx`.
- Many marketing page files (`app/about`, `app/blog`, `app/pricing`, etc.)
  also show as modified — most of those edits pre-date this mega-nav work
  (from earlier SEO-focused passes on this branch) and are separate from the
  nav/placeholder-route changes listed above.

None of the above was changed as part of this task. If picking up from here,
treat only the files listed in "What changed" as part of the mega menu work.

## Reference

- Approved plan with full spec/rationale:
  `/Users/edwin/.claude/plans/functional-fluttering-hinton.md`
