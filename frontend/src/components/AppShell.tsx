"use client";

import {
  ArrowRight,
  BarChart3,
  Boxes,
  Building2,
  ChevronLeft,
  ClipboardList,
  Command,
  Database,
  Fingerprint,
  Files,
  GitPullRequestArrow,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Map,
  Menu,
  Moon,
  PanelLeftClose,
  Shield,
  RadioTower,
  ShieldCheck,
  Sun,
  UsersRound,
  Wifi,
} from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusDot } from "@/components/ui/status-dot";
import { cn } from "@/lib/utils";
import { useWorkspaceStore, type WorkspaceView } from "@/stores/workspace";
import type { CurrentPrincipal } from "@/lib/api";

export type { WorkspaceView } from "@/stores/workspace";

type AppShellProps = {
  children: ReactNode;
  onSignOut: () => void;
  organizationLabel: string;
  organizationLogoUrl?: string | null;
  organizationSlug?: string;
  principal?: CurrentPrincipal | null;
};

type NavItem = {
  id: WorkspaceView;
  label: string;
  hint: string;
  icon: typeof LayoutDashboard;
};
type ViewGuidance = {
  step: string;
  outcome: string;
  next?: WorkspaceView;
  nextLabel?: string;
};

const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: "Platform",
    items: [
      {
        id: "platform",
        label: "Platform console",
        hint: "Organizations & support",
        icon: Shield,
      },
    ],
  },
  {
    label: "Daily work",
    items: [
      {
        id: "dashboard",
        label: "Today",
        hint: "What needs action",
        icon: LayoutDashboard,
      },
      {
        id: "submissions",
        label: "Review queue",
        hint: "Approve data",
        icon: ShieldCheck,
      },
      {
        id: "connectivity",
        label: "Sync health",
        hint: "Offline & retry",
        icon: Wifi,
      },
    ],
  },
  {
    label: "Collect data",
    items: [
      {
        id: "templates",
        label: "Templates",
        hint: "Start faster",
        icon: Files,
      },
      {
        id: "forms",
        label: "Form builder",
        hint: "Surveys & logic",
        icon: ClipboardList,
      },
      {
        id: "beneficiaries",
        label: "Beneficiaries",
        hint: "People & households",
        icon: UsersRound,
      },
      {
        id: "officers",
        label: "Field teams",
        hint: "People & assignments",
        icon: UsersRound,
      },
    ],
  },
  {
    label: "Plan & monitor",
    items: [
      {
        id: "programs",
        label: "Projects",
        hint: "Programs & donors",
        icon: Building2,
      },
      {
        id: "indicators",
        label: "Indicators",
        hint: "Targets & results",
        icon: BarChart3,
      },
      { id: "map", label: "Map", hint: "Coverage & GPS", icon: Map },
      {
        id: "analytics",
        label: "Reports",
        hint: "Exports & donors",
        icon: BarChart3,
      },
    ],
  },
  {
    label: "Operate",
    items: [
      {
        id: "ecosystem",
        label: "Ecosystem",
        hint: "Connected work",
        icon: Boxes,
      },
      {
        id: "enterprise",
        label: "Operations",
        hint: "Assets & budgets",
        icon: Building2,
      },
      {
        id: "cases",
        label: "Cases",
        hint: "Follow-ups",
        icon: GitPullRequestArrow,
      },
      {
        id: "data",
        label: "Data tools",
        hint: "Import & edit",
        icon: Database,
      },
      {
        id: "workforce",
        label: "Workforce",
        hint: "Teams & access",
        icon: UsersRound,
      },
      {
        id: "governance",
        label: "Governance",
        hint: "Audit & quality",
        icon: Fingerprint,
      },
    ],
  },
  {
    label: "Admin",
    items: [
      {
        id: "organizations",
        label: "Team & access",
        hint: "Roles & regions",
        icon: Building2,
      },
      {
        id: "workflows",
        label: "Approvals",
        hint: "Rules & escalation",
        icon: GitPullRequestArrow,
      },
    ],
  },
  {
    label: "Support",
    items: [
      {
        id: "help",
        label: "Help guide",
        hint: "How to use Atlas",
        icon: HelpCircle,
      },
    ],
  },
];

const navItems: NavItem[] = navGroups.flatMap((group) => group.items);

const viewGuidance: Record<WorkspaceView, ViewGuidance> = {
  platform: {
    step: "Operate platform",
    outcome:
      "Manage organizations, support sessions, tenant status, setup health, and platform-only operator tools.",
    next: "help",
    nextLabel: "Read guidance",
  },
  dashboard: {
    step: "Start here",
    outcome:
      "Use this daily summary to decide what needs review, sync attention, or team follow-up.",
    next: "submissions",
    nextLabel: "Review data",
  },
  ecosystem: {
    step: "Understand the system",
    outcome:
      "See how projects, forms, people, submissions, cases, and reports connect before changing workflows.",
    next: "programs",
    nextLabel: "Open projects",
  },
  enterprise: {
    step: "Operate at scale",
    outcome:
      "Coordinate assets, budgets, documents, and operational accountability across field programs.",
    next: "governance",
    nextLabel: "Check governance",
  },
  governance: {
    step: "Protect data",
    outcome:
      "Create rules for auditability, retention, validation, consent, exports, and lineage.",
    next: "data",
    nextLabel: "Review data tools",
  },
  workforce: {
    step: "Control access",
    outcome:
      "Manage teams, departments, delegations, approvals, and workforce access requests.",
    next: "organizations",
    nextLabel: "Manage users",
  },
  data: {
    step: "Prepare datasets",
    outcome:
      "Import, clean, map, edit, export, and share operational data with fewer manual spreadsheet steps.",
    next: "forms",
    nextLabel: "Build forms",
  },
  programs: {
    step: "Plan delivery",
    outcome:
      "Set up programs, donors, regions, milestones, and reporting structures for field execution.",
    next: "indicators",
    nextLabel: "Track indicators",
  },
  beneficiaries: {
    step: "Manage records",
    outcome:
      "Keep beneficiary, household, farmer, group, and visit records organized and traceable.",
    next: "submissions",
    nextLabel: "Review submissions",
  },
  indicators: {
    step: "Measure results",
    outcome:
      "Track baselines, targets, formulas, progress, and report-ready performance data.",
    next: "analytics",
    nextLabel: "Open reports",
  },
  cases: {
    step: "Resolve follow-up",
    outcome:
      "Manage complaints, referrals, corrections, incidents, and escalations through closure.",
    next: "workflows",
    nextLabel: "Review approvals",
  },
  map: {
    step: "Verify coverage",
    outcome:
      "Use GPS evidence and coverage layers to understand where field work is happening.",
    next: "connectivity",
    nextLabel: "Check sync health",
  },
  organizations: {
    step: "Administer access",
    outcome:
      "Manage users, roles, regions, organization profile, permissions, and assignment routes.",
    next: "workforce",
    nextLabel: "Open workforce",
  },
  officers: {
    step: "Enable field teams",
    outcome:
      "Invite officers, monitor devices, check sync health, and understand recent field activity.",
    next: "forms",
    nextLabel: "Assign forms",
  },
  forms: {
    step: "Design collection",
    outcome:
      "Create mobile-ready forms with clear labels, validation, media evidence, and offline behavior.",
    next: "submissions",
    nextLabel: "Review collected data",
  },
  submissions: {
    step: "Validate evidence",
    outcome:
      "Approve clean submissions, reject poor data, or request corrections with a clear audit trail.",
    next: "analytics",
    nextLabel: "Report results",
  },
  templates: {
    step: "Start faster",
    outcome:
      "Choose a professional template, customize questions, and publish a form for field teams.",
    next: "forms",
    nextLabel: "Customize form",
  },
  analytics: {
    step: "Communicate results",
    outcome:
      "Create report-ready views, exports, summaries, and donor-facing operational evidence.",
    next: "help",
    nextLabel: "Read guidance",
  },
  workflows: {
    step: "Standardize approvals",
    outcome:
      "Define correction paths, review rules, escalation steps, and operational accountability.",
    next: "submissions",
    nextLabel: "Open review queue",
  },
  connectivity: {
    step: "Keep offline work safe",
    outcome:
      "Monitor sync queues, retries, weak connections, and field-device upload status.",
    next: "officers",
    nextLabel: "Check officers",
  },
  help: {
    step: "Learn the platform",
    outcome:
      "Use beginner-friendly guidance to understand every major Atlas FieldOps workflow.",
    next: "templates",
    nextLabel: "Start with templates",
  },
};

function organizationInitials(name: string): string {
  const words = name
    .replace(/[^a-zA-Z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length) return "OF";
  return words
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");
}

function OrganizationMark({
  name,
  logoUrl,
}: {
  name: string;
  logoUrl?: string | null;
}) {
  if (logoUrl) {
    return (
      <div
        aria-label={`${name} logo`}
        className="h-10 w-10 shrink-0 rounded-xl border bg-background bg-cover bg-center shadow-sm"
        role="img"
        style={{ backgroundImage: `url("${logoUrl}")` }}
      />
    );
  }
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-sm font-semibold text-primary shadow-sm">
      {organizationInitials(name)}
    </div>
  );
}

export function AppShell({
  children,
  onSignOut,
  organizationLabel,
  organizationLogoUrl,
  organizationSlug,
  principal,
}: AppShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const activeView = useWorkspaceStore((state) => state.activeView);
  const setActiveView = useWorkspaceStore((state) => state.setActiveView);
  const collapsedSidebar = useWorkspaceStore((state) => state.collapsedSidebar);
  const toggleSidebar = useWorkspaceStore((state) => state.toggleSidebar);
  const setCommandOpen = useWorkspaceStore((state) => state.setCommandOpen);
  const lastActionResult = useWorkspaceStore((state) => state.lastActionResult);
  const theme = useWorkspaceStore((state) => state.theme);
  const toggleTheme = useWorkspaceStore((state) => state.toggleTheme);

  const allowedViews = principal?.menu_views?.length
    ? new Set(principal.menu_views)
    : null;
  const isSupportMode = principal?.support_mode ?? false;
  const isPlatformAdmin = principal?.platform_admin ?? false;
  const platformConsoleMode = isPlatformAdmin && !isSupportMode;
  const visibleNavItems = platformConsoleMode
    ? navItems.filter((item) => item.id === "platform" || item.id === "help")
    : allowedViews
      ? navItems.filter(
          (item) => item.id === "help" || allowedViews.has(item.id),
        )
      : navItems.filter((item) => item.id !== "platform" || isPlatformAdmin);
  const activeItem =
    navItems.find((item) => item.id === activeView) ?? navItems[0];
  const activeGroup = navGroups.find((group) =>
    group.items.some((item) => item.id === activeView),
  );
  const guidance = viewGuidance[activeView];
  const nextItem =
    guidance.next && visibleNavItems.some((item) => item.id === guidance.next)
      ? navItems.find((item) => item.id === guidance.next)
      : null;
  const accountName =
    principal?.full_name?.trim() || principal?.email || "Signed-in user";
  const accountRole =
    principal?.roles?.[0]?.replaceAll("_", " ") ?? "Active account";
  const accountScope = principal?.scope_type
    ? `${principal.scope_type.replace("_", " ")} access`
    : "Workspace access";

  const navigation = (
    <nav aria-label="Primary navigation" className="space-y-1.5">
      {navGroups.map((group) => {
        const groupItems = visibleNavItems.filter((item) =>
          group.items.some((groupItem) => groupItem.id === item.id),
        );
        if (!groupItems.length) return null;
        return (
          <div className="space-y-1.5" key={group.label}>
            <p
              className={cn(
                "px-2.5 pt-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground",
                collapsedSidebar && "sr-only",
              )}
            >
              {group.label}
            </p>
            {groupItems.map((item) => {
              const Icon = item.icon;
              const active = activeView === item.id;
              return (
                <button
                  key={item.id}
                  className={cn(
                    "group flex h-11 w-full items-center gap-3 rounded-lg px-2.5 text-left text-sm font-medium transition-all duration-200 ease-product",
                    active
                      ? "bg-primary/10 text-primary shadow-line"
                      : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                    collapsedSidebar && "justify-center px-0",
                  )}
                  onClick={() => {
                    setActiveView(item.id);
                    setMobileNavOpen(false);
                  }}
                  type="button"
                >
                  <Icon aria-hidden="true" size={18} />
                  <span
                    className={cn("min-w-0", collapsedSidebar && "sr-only")}
                  >
                    <span className="block truncate">{item.label}</span>
                    <span className="block truncate text-[11px] font-normal text-muted-foreground group-hover:text-muted-foreground">
                      {item.hint}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        );
      })}
    </nav>
  );

  return (
    <div
      className={cn(
        "min-h-screen bg-background text-foreground lg:grid",
        collapsedSidebar
          ? "lg:grid-cols-[76px_1fr]"
          : "lg:grid-cols-[264px_1fr]",
      )}
    >
      <aside className="sticky top-0 hidden h-screen min-h-0 border-r bg-panel/88 p-3 shadow-[8px_0_40px_-32px_rgba(15,23,42,0.45)] backdrop-blur-xl lg:flex lg:flex-col">
        <div className="shrink-0">
          <div
            className={cn(
              "mb-5 flex items-center gap-3 px-1",
              collapsedSidebar && "justify-center",
            )}
          >
            <OrganizationMark
              logoUrl={organizationLogoUrl}
              name={organizationLabel}
            />
            <div className={cn("min-w-0", collapsedSidebar && "sr-only")}>
              <p className="truncate text-sm font-semibold">
                {organizationLabel}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {organizationSlug ?? "Atlas FieldOps"}
              </p>
            </div>
          </div>
          <button
            className={cn(
              "mb-4 flex h-10 w-full items-center gap-2 rounded-xl border bg-background/80 px-2.5 text-left text-xs text-muted-foreground shadow-line transition hover:bg-muted/35 hover:text-foreground",
              collapsedSidebar && "justify-center px-0",
            )}
            onClick={() => setCommandOpen(true)}
            type="button"
          >
            <Command aria-hidden="true" size={15} />
            <span
              className={cn(
                "min-w-0 flex-1 truncate",
                collapsedSidebar && "sr-only",
              )}
            >
              Search
            </span>
            <kbd
              className={cn(
                "rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]",
                collapsedSidebar && "sr-only",
              )}
            >
              ⌘K
            </kbd>
          </button>
          <div
            className={cn(
              "mb-4 rounded-xl border bg-background/80 p-3 shadow-sm",
              collapsedSidebar && "hidden",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Today
              </span>
              <StatusDot tone="online" />
            </div>
            <p className="mt-2 text-sm font-semibold">Workspace ready</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Create forms, import data, or invite teams to begin.
            </p>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto pr-1 product-scrollbar">
          {navigation}
        </div>
        <div className="mt-3 shrink-0 border-t pt-3">
          <button
            className={cn(
              "flex h-9 w-full items-center gap-2 rounded-md px-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground",
              collapsedSidebar && "justify-center px-0",
            )}
            onClick={toggleSidebar}
            type="button"
          >
            {collapsedSidebar ? (
              <ChevronLeft aria-hidden="true" size={17} />
            ) : (
              <PanelLeftClose aria-hidden="true" size={17} />
            )}
            <span className={cn(collapsedSidebar && "sr-only")}>Collapse</span>
          </button>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-panel/88 px-3 shadow-sm backdrop-blur-xl lg:px-5">
          <div className="flex items-center gap-3">
            <Button
              aria-label="Toggle navigation"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileNavOpen((value) => !value)}
              type="button"
              variant="ghost"
            >
              <Menu aria-hidden="true" />
            </Button>
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="lg:hidden">
                <OrganizationMark
                  logoUrl={organizationLogoUrl}
                  name={organizationLabel}
                />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold tracking-normal">
                  {organizationLabel}
                </p>
                <p className="truncate text-xs text-muted-foreground md:hidden">
                  {accountName} · {accountRole}
                </p>
                <p className="hidden text-xs text-muted-foreground md:block">
                  {organizationSlug ? `${organizationSlug} · ` : ""}
                  {principal?.scope_type
                    ? `${principal.scope_type.replace("_", " ")} scoped access`
                    : "Forms, teams, reviews, and reports"}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              tone={isSupportMode ? "warning" : "success"}
              className="hidden gap-1.5 sm:inline-flex"
            >
              <RadioTower aria-hidden="true" size={13} />
              {isSupportMode ? "Support mode" : accountRole}
            </Badge>
            <div className="hidden min-w-0 max-w-[240px] items-center gap-2 rounded-lg border bg-background/80 px-2.5 py-1.5 shadow-line md:flex">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-semibold text-primary">
                {organizationInitials(accountName)}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-foreground">
                  {accountName}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {accountScope}
                </p>
              </div>
            </div>
            <Button
              aria-label="Open command palette"
              size="icon"
              variant="ghost"
              onClick={() => setCommandOpen(true)}
            >
              <Command aria-hidden="true" />
            </Button>
            <Button
              aria-label="Help guide"
              onClick={() => setActiveView("help")}
              type="button"
              variant="ghost"
            >
              <HelpCircle aria-hidden="true" />
              <span className="hidden sm:inline">Help guide</span>
            </Button>
            <Button
              aria-label="Toggle theme"
              size="icon"
              variant="ghost"
              onClick={toggleTheme}
            >
              {theme === "dark" ? (
                <Sun aria-hidden="true" />
              ) : (
                <Moon aria-hidden="true" />
              )}
            </Button>
            <Button
              aria-label="Sign out"
              onClick={onSignOut}
              type="button"
              variant="ghost"
            >
              <LogOut aria-hidden="true" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </header>

        {mobileNavOpen ? (
          <div className="border-b bg-panel p-3 lg:hidden">{navigation}</div>
        ) : null}

        <section className="border-b bg-background/80 px-3 py-4 sm:px-5 lg:px-7">
          <div className="mx-auto w-full max-w-[1480px] space-y-3">
            <div className="flex flex-col gap-3 rounded-xl border bg-panel/86 p-4 shadow-line md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {activeGroup?.label ?? "Workspace"} / {activeItem.label}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-semibold tracking-tight">
                    {activeItem.label}
                  </h1>
                  <Badge tone="accent">{guidance.step}</Badge>
                </div>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
                  {guidance.outcome}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Button
                  onClick={() => setCommandOpen(true)}
                  type="button"
                  variant="secondary"
                >
                  <Command aria-hidden="true" />
                  Search actions
                </Button>
                {nextItem ? (
                  <Button
                    onClick={() => setActiveView(nextItem.id)}
                    type="button"
                    variant="primary"
                  >
                    {guidance.nextLabel ?? nextItem.label}
                    <ArrowRight aria-hidden="true" />
                  </Button>
                ) : null}
              </div>
            </div>
            {lastActionResult ? (
              <section
                className="rounded-xl border border-success/30 bg-success/10 p-3"
                aria-live="polite"
              >
                <p className="text-sm font-semibold">Last action</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {lastActionResult}
                </p>
              </section>
            ) : null}
          </div>
        </section>

        <main className="mx-auto w-full max-w-[1480px] px-3 py-6 sm:px-5 lg:px-7">
          {children}
        </main>
      </div>
    </div>
  );
}
