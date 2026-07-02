# Atlas FieldOps — Workspace UX Audit (Phase 0)

Benchmark bar: Linear / Notion / Retool / Mapbox Studio — quiet surfaces, precise typography,
dense-but-breathable data views, zero visual noise. Scope: the authenticated workspace only.

---

## 1. Workspace map

**Global shell** (`src/components/AppShell.tsx`): collapsible sidebar (full ↔ icon rail with
hover-expand, state persisted in Zustand), sticky topbar (h-14) with breadcrumbs, global back,
⌘K command center (`CommandPalette.tsx`), notifications, user menu. Nav is permission-gated
(`src/config/navigation.ts`, owner-managed RBAC).

**Authenticated routes** (~90, `src/config/routes.ts`) grouped by module:

| Module | Routes | Production file |
| --- | --- | --- |
| Dashboard | `/app`, `/dashboard` | `components/Dashboard.tsx` (role-aware: command / field / viewer) |
| Projects | `/projects{,/active,/draft,/closed,/templates,/all}` | `modules/projects/ProjectsModule.tsx` |
| Forms & builder | `/forms/*` (7) | `modules/forms/FormsModule.tsx`, `FormCreationWorkspace.tsx` |
| Field Operations | `/field-operations/*` (9) | `modules/field-operations/FieldOperationsModule.tsx` |
| Submissions | `/submissions/*` (7) | `modules/submissions/SubmissionsModule.tsx` |
| Entities | `/beneficiaries/*` (3) | `modules/beneficiaries/BeneficiariesModule.tsx` |
| Mapping / GIS | `/mapping/*` (11) | `modules/mapping/MappingModule.tsx` |
| Metrics & Results | `/indicators/*` (8) | `modules/indicators/IndicatorsModule.tsx` |
| Reports | `/reports/*` (6) | `modules/reports/ReportsModule.tsx`, `DashboardBuilder.tsx`, `DashboardWidgets.tsx` |
| Data Quality | `/data-quality/*` (9) | `modules/data-quality/DataQualityModule.tsx` |
| Users & Teams | `/users-teams/*` (7) | `modules/users-teams/UsersTeamsModule.tsx` |
| Governance | `/governance/*` (8) | `modules/governance/GovernanceModule.tsx` |
| Administration | `/administration/*` (17) | `modules/administration/*` |

## 2. Stack inventory

| Concern | Implementation | Assessment |
| --- | --- | --- |
| Components | Custom shadcn-style (`ui/`): cva variants, Radix dialog/dropdown/slot, tailwind-merge; Storybook 8 present | Solid foundation; reuse, don't replace |
| CSS / tokens | Tailwind 3.4 + HSL CSS-var tokens in `globals.css`; Stitch/M3 token layer (surface scale, on-surface, border-subtle, brand #005232) added recently; dark mode variants exist | Token layer now good; enforcement incomplete (see 3A) |
| Icons | lucide-react only | ✅ single set; sizes vary 14–20px, mostly consistent |
| Charts | Recharts | Single lib ✅; theme not tokenized per-chart everywhere |
| Maps | Leaflet + react-leaflet | ✅ |
| Table | Custom `DataTable.tsx` — sortable, searchable, paginated, fullscreen, selection, mobile cards, sticky header | Good; **not virtualized** (paginated instead), no column-visibility control, no saved views |
| Forms | Custom labeled inputs (`ui/input.tsx`) | No form lib; fine |
| Motion | framer-motion; `prefers-reduced-motion` respected in globals ✅ | Some hover `-translate-y` lifts exceed the "quiet" bar |
| State/data | Zustand + TanStack Query | Untouchable per constraints ✅ |
| Type scale | Tailwind `fontSize`: micro 11 / small 13 / body 14 / heading-sm 16 / heading-lg 20 / display 28 | **Matches the brief's scale**; unevenly adopted |
| A11y | Global `:focus-visible` rule ✅; Storybook a11y addon | Focus rings good; aria coverage uneven in dense modules |

## 3. Findings (ranked)

### A. Global shell & tokens — highest leverage

1. **Token enforcement incomplete.** The token layer is right, but modules still mix legacy
   (`bg-panel`, `bg-background/50`, `bg-muted/30`) with token classes, plus raw rgba shadows and
   arbitrary px values. Consequence: subtle surface mismatches between sibling panels.
2. **No permanent project switcher.** Everything anchors to a project, but project context lives
   only inside the Projects module. Brief requires a persistent switcher in shell.
3. **`tabular-nums` not systematic** (~15 usages). KPI values have it; table cells and counts
   largely don't — numbers wobble on sort/update.
4. **Spacing rhythm inconsistent**: `p-3` / `p-3.5` / `p-4` / `p-5` / `p-6` coexist on peer
   panels; gaps mix `gap-2/3/4/6`. Reads as drift, not intent.
5. **Nav grouping** is HOME / OPERATIONS / ANALYTICS / PEOPLE / GOVERNANCE / SYSTEM — close to
   the brief's Operate/Build/Analyze/Govern but Forms sits in Operations (brief: "Build") and
   labels differ. Renaming is cheap; moving items conflicts with the IA doc — needs a decision.
6. Topbar is h-14 (56px) vs. brief's ~52px; breadcrumbs + search + user menu all present. Minor.

### B. High-traffic screens

**Submissions (workhorse — biggest gap vs. brief)**
- No **split-view review**: opening a record replaces the list (tabbed detail view) instead of
  list-left + detail-right. Reviewers lose queue context on every open.
- No **saved views**; filter bar (recently rebuilt, labeled) doesn't persist.
- No reviewer **keyboard shortcuts** (j/k navigate, a approve, r return).
- Bulk actions exist but as inline controls, not a floating multi-select action bar.
- Status pills ✅ (semantic tones). Rows ~40px ✅.

**Dashboard / Projects**
- Role-aware dashboard (command/field/viewer) ✅ recently shipped; KPI shards have big tabular
  values ✅. Command center section is long — hierarchy could tighten (one primary message per band).
- Project list: table exists with health/status ✅; project home mixes stat rows + panels but
  activity feed and quick actions are spread out rather than a compact cockpit row.

**Forms list/builder**
- Builder is a 7-step lifecycle workspace (Setup→…→Publish) with autosave indicator ✅ — different
  paradigm from the brief's three-pane palette/canvas/settings, but functional and recently
  polished. Recommend: keep paradigm (constraint 6: code wins on behavior), improve visual
  grouping, drag handles, and validation/logic badges on fields.
- No undo/redo surface; version label exists.

**Reports/Dashboards**: consistent card chrome now ✅; export actions inside panels rather than
PageHeader; chart palette not fully tokenized.

### C. Everything else

- **Mapping**: KPI + bento layout ✅, but map is boxed in a panel, not full-bleed with floating
  layer/filter panel + legend; inspector is below-map rather than side overlay.
- **Data Quality**: has issue-type sections and signals; triage queue doesn't mirror Submissions
  patterns 1:1 (different row/pill treatments); jump-to-submission exists in places.
- **Metrics & Results**: KPI shards ✅; indicator table lacks inline disaggregation expansion;
  no sparklines/delta-vs-baseline on KPI cards (no time-series endpoints for some — flagged).
- **Governance/Administration**: recently gated + restyled ✅; settings forms are grouped but not
  single-column max-640 with left sub-nav everywhere; audit trail is a table, not a timeline;
  IDs not monospace consistently.
- **States**: empty states now systematic (EmptyState/EmptyMini) ✅; skeletons exist on Dashboard
  but not on most module tables; error states are toast-only in places (no inline retry).
- **Missing UI primitives vs. brief**: PageHeader (each module hand-rolls its header band),
  FilterBar (3 modules hand-roll it after recent fixes), StatusPill (Badge covers it),
  Combobox/DatePicker (native date inputs used), Drawer (Modal only), Breadcrumbs (in shell ✅),
  Tooltip (HelpHint covers it), Toast ✅, Skeleton ✅.

### Accessibility gaps
- Focus rings global ✅; but several icon-only buttons lack `aria-label`s; DataTable rows are
  keyboard-focusable ✅; dialogs use Radix ✅. Contrast: `text-muted-foreground` on `bg-muted/30`
  chips is borderline in places — verify AA per-instance during module passes.

## 4. Ranked plan (proposed)

| Phase | Work | Key deliverables |
| --- | --- | --- |
| 1 | Tokens & primitives consolidation | Purge remaining `bg-panel`/raw-hex/off-scale spacing from all modules; systematize `tabular-nums` (DataTable cells, KPI values, counts); build **PageHeader** and **FilterBar** primitives and migrate the hand-rolled instances; extract **StatusPill** alias over Badge; add **Drawer** (Radix dialog side-panel variant) |
| 2 | Global shell | Slim topbar to 52px; permanent **project switcher** (topbar); nav group label alignment (pending your call on Forms→"Build"); collapse behavior verified <1280px |
| 3 | Submissions split-view review | List + right detail Drawer (approve/return/reject in-context), saved views (localStorage per user), keyboard shortcuts j/k/a/r, floating bulk-action bar |
| 3b | Projects cockpit + Dashboard tightening | Compact stat row, activity feed, quick actions band |
| 3c | Mapping full-bleed | Full-bleed map on map routes, floating layer/filter panel, side inspector |
| 3d | Forms builder polish | Section grouping, drag handles, validation/logic badges, autosave/version surface |
| 3e | Data Quality triage parity, Metrics disaggregation rows, Governance timeline + settings layout | |
| 4 | States & polish | Skeletons on all module tables; inline error+retry states; motion audit (kill decorative lifts); toast verb consistency |
| 5 | A11y & responsive QA | aria-label sweep, AA contrast verification, <1280 sidebar & <1024 table behavior, tablet review flow; `/docs/ux-changelog.md` per phase |

**Decisions needed from you** (flagged, not assumed):
1. Nav regrouping: rename groups only, or also move Forms/Entities into a "Build" group (deviates from `PLATFORM_INFORMATION_ARCHITECTURE.md`)?
2. Submissions split-view: right panel (persistent) vs. Drawer (overlay)? Recommend Drawer ≥1024px→full-screen below.
3. Virtualization: current DataTable is paginated, not virtualized. Adding react-window is a new dep (constraint 5). Recommend deferring unless real datasets exceed ~1k rows per page-load.
4. KPI sparklines need time-series endpoints that don't exist for several metrics — backend is out of scope, so sparklines land only where data already exists (submission history).

*Ranking rationale: (A) shell/tokens multiply across every screen; (B) Submissions is the daily
workhorse and furthest from the bar; (C) the rest inherit the system.*
