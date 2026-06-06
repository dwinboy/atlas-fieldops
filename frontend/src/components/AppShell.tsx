"use client";

import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Command,
  LogOut,
  Menu,
  Moon,
  PanelLeftClose,
  RadioTower,
  Sun,
} from "lucide-react";
import type { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HelpHint } from "@/components/ui/help-hint";
import {
  getBreadcrumbsForView,
  getNavigationItemByView,
  getVisibleNavigationItems,
  getVisibleNavigationSections,
  viewGuidance,
  type ViewTone,
} from "@/config/navigation";
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

const viewToneStyles: Record<
  ViewTone,
  {
    badge: ViewTone;
    header: string;
    icon: string;
    navActive: string;
    navIcon: string;
    navRail: string;
  }
> = {
  daily: {
    badge: "daily",
    header: "border-section-daily/20 bg-section-daily/12",
    icon: "border border-section-daily/20 bg-section-daily/12 text-section-daily",
    navActive: "bg-section-daily/12 text-section-daily shadow-line",
    navIcon: "bg-section-daily/12 text-section-daily",
    navRail: "bg-section-daily",
  },
  collect: {
    badge: "collect",
    header: "border-section-collect/20 bg-section-collect/12",
    icon: "border border-section-collect/20 bg-section-collect/12 text-section-collect",
    navActive: "bg-section-collect/12 text-section-collect shadow-line",
    navIcon: "bg-section-collect/12 text-section-collect",
    navRail: "bg-section-collect",
  },
  monitor: {
    badge: "monitor",
    header: "border-section-monitor/20 bg-section-monitor/12",
    icon: "border border-section-monitor/20 bg-section-monitor/12 text-section-monitor",
    navActive: "bg-section-monitor/12 text-section-monitor shadow-line",
    navIcon: "bg-section-monitor/12 text-section-monitor",
    navRail: "bg-section-monitor",
  },
  operate: {
    badge: "operate",
    header: "border-section-operate/20 bg-section-operate/12",
    icon: "border border-section-operate/20 bg-section-operate/12 text-section-operate",
    navActive: "bg-section-operate/12 text-section-operate shadow-line",
    navIcon: "bg-section-operate/12 text-section-operate",
    navRail: "bg-section-operate",
  },
  admin: {
    badge: "admin",
    header: "border-section-admin/20 bg-section-admin/12",
    icon: "border border-section-admin/20 bg-section-admin/12 text-section-admin",
    navActive: "bg-section-admin/12 text-section-admin shadow-line",
    navIcon: "bg-section-admin/12 text-section-admin",
    navRail: "bg-section-admin",
  },
  support: {
    badge: "support",
    header: "border-section-support/20 bg-section-support/12",
    icon: "border border-section-support/20 bg-section-support/12 text-section-support",
    navActive: "bg-section-support/12 text-section-support shadow-line",
    navIcon: "bg-section-support/12 text-section-support",
    navRail: "bg-section-support",
  },
  platform: {
    badge: "platform",
    header: "border-section-platform/20 bg-section-platform/12",
    icon: "border border-section-platform/20 bg-section-platform/12 text-section-platform",
    navActive: "bg-section-platform/12 text-section-platform shadow-line",
    navIcon: "bg-section-platform/12 text-section-platform",
    navRail: "bg-section-platform",
  },
  governance: {
    badge: "governance",
    header: "border-section-governance/20 bg-section-governance/12",
    icon: "border border-section-governance/20 bg-section-governance/12 text-section-governance",
    navActive: "bg-section-governance/12 text-section-governance shadow-line",
    navIcon: "bg-section-governance/12 text-section-governance",
    navRail: "bg-section-governance",
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
  const router = useRouter();
  const pathname = usePathname();
  const activeView = useWorkspaceStore((state) => state.activeView);
  const setActiveView = useWorkspaceStore((state) => state.setActiveView);
  const collapsedSidebar = useWorkspaceStore((state) => state.collapsedSidebar);
  const toggleSidebar = useWorkspaceStore((state) => state.toggleSidebar);
  const setSidebarCollapsed = useWorkspaceStore(
    (state) => state.setSidebarCollapsed,
  );
  const setCommandOpen = useWorkspaceStore((state) => state.setCommandOpen);
  const lastActionResult = useWorkspaceStore((state) => state.lastActionResult);
  const theme = useWorkspaceStore((state) => state.theme);
  const toggleTheme = useWorkspaceStore((state) => state.toggleTheme);

  const isSupportMode = principal?.support_mode ?? false;
  const visibleNavSections = getVisibleNavigationSections(principal);
  const visibleNavItems = getVisibleNavigationItems(principal);
  const activeItem = (getNavigationItemByView(activeView) ??
    visibleNavItems.find((item) => !item.hiddenFromSidebar) ??
    getNavigationItemByView("dashboard"))!;
  const activeBreadcrumbs = getBreadcrumbsForView(activeItem.id);
  const activeTone = viewToneStyles[activeItem.tone];
  const ActiveIcon = activeItem.icon;
  const guidance = viewGuidance[activeView];
  const nextItem =
    guidance.next && visibleNavItems.some((item) => item.id === guidance.next)
      ? getNavigationItemByView(guidance.next)
      : null;
  const nextActionItem = nextItem?.id === activeView ? null : nextItem;
  const headerQuickLinks = (activeItem.children ?? []).slice(0, 4);
  const accountName =
    principal?.full_name?.trim() || principal?.email || "Signed-in user";
  const accountRole =
    principal?.roles?.[0]?.replaceAll("_", " ") ?? "Active account";
  const accountScope = principal?.scope_type
    ? `${principal.scope_type.replace("_", " ")} access`
    : "Workspace access";
  const focusedEditorRoute = pathname?.replace(/\/+$/, "") === "/forms/create";

  const navigation = (
    <nav aria-label="Primary navigation" className="space-y-1">
      {visibleNavSections.map((group) => {
        return (
          <div className="space-y-1" key={group.label}>
            <p
              className={cn(
                "px-2 pt-2.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground",
                collapsedSidebar && "sr-only",
              )}
            >
              {group.label}
            </p>
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = activeView === item.id;
              const tone = viewToneStyles[item.tone];
              return (
                <button
                  key={item.id}
                  className={cn(
                    "group relative flex h-9 w-full items-center gap-2.5 rounded-lg px-2 text-left text-[13px] font-medium transition-all duration-200 ease-product",
                    active
                      ? tone.navActive
                      : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                    collapsedSidebar && "justify-center px-0",
                  )}
                  onClick={() => {
                    setActiveView(item.id);
                    router.push(item.route);
                    setMobileNavOpen(false);
                  }}
                  type="button"
                >
                  {active ? (
                    <span
                      aria-hidden="true"
                      className={cn(
                        "absolute left-0 top-2 h-5 w-1 rounded-r-full",
                        tone.navRail,
                        collapsedSidebar && "left-1",
                      )}
                    />
                  ) : null}
                  <span
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors",
                      active
                        ? tone.navIcon
                        : "bg-muted/50 text-muted-foreground group-hover:bg-background group-hover:text-foreground",
                    )}
                  >
                    <Icon aria-hidden="true" size={15} />
                  </span>
                  <span
                    className={cn("min-w-0", collapsedSidebar && "sr-only")}
                  >
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span className="block truncate">{item.label}</span>
                      <HelpHint
                        label={`About ${item.label}`}
                        title={item.label}
                      >
                        {item.hint}
                      </HelpHint>
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
        "min-h-screen max-w-full overflow-x-hidden bg-background text-foreground lg:grid",
        collapsedSidebar
          ? "lg:grid-cols-[68px_1fr]"
          : "lg:grid-cols-[248px_1fr]",
      )}
    >
      <aside
        className="sticky top-0 hidden h-screen min-h-0 border-r bg-panel/88 p-2.5 shadow-[8px_0_40px_-32px_rgba(15,23,42,0.45)] backdrop-blur-xl lg:flex lg:flex-col"
        onMouseEnter={() => {
          if (collapsedSidebar) setSidebarCollapsed(false);
        }}
      >
        <div className="shrink-0">
          <div
            className={cn(
              "mb-4 flex items-center gap-2.5 px-1",
              collapsedSidebar && "justify-center",
            )}
          >
            <OrganizationMark
              logoUrl={organizationLogoUrl}
              name={organizationLabel}
            />
            <div className={cn("min-w-0", collapsedSidebar && "sr-only")}>
              <p className="truncate text-[13px] font-semibold">
                {organizationLabel}
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                {organizationSlug ?? "Atlas FieldOps"}
              </p>
            </div>
          </div>
          <button
            className={cn(
              "mb-3 flex h-8 w-full items-center gap-2 rounded-lg border bg-background/80 px-2 text-left text-[11px] text-muted-foreground shadow-line transition hover:bg-muted/35 hover:text-foreground",
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
              "mb-3 rounded-lg border bg-background/80 p-2.5 shadow-sm",
              collapsedSidebar && "hidden",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Today
              </span>
              <StatusDot tone="online" />
            </div>
            <p className="mt-1.5 text-[13px] font-semibold">Workspace ready</p>
            <div className="mt-1">
              <HelpHint
                label="About workspace navigation"
                title="Workspace ready"
              >
                Navigation follows the M&E architecture: projects, forms,
                fieldwork, quality, reports, governance, and system controls.
              </HelpHint>
            </div>
          </div>
          <div
            className={cn(
              "mb-3 rounded-lg border bg-background/80 p-2.5 shadow-sm",
              collapsedSidebar && "hidden",
            )}
          >
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-[11px] font-semibold text-primary">
                {organizationInitials(accountName)}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Signed in as
                </p>
                <p className="truncate text-[13px] font-semibold text-foreground">
                  {accountName}
                </p>
              </div>
            </div>
            <p className="mt-1.5 truncate text-[11px] capitalize text-muted-foreground">
              {accountRole} · {accountScope}
            </p>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto pr-1 product-scrollbar">
          {navigation}
        </div>
        <div className="mt-3 shrink-0 border-t pt-3">
          <button
            className={cn(
              "flex h-8 w-full items-center gap-2 rounded-md px-2 text-[13px] text-muted-foreground hover:bg-muted hover:text-foreground",
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

      <div className="min-w-0 max-w-full overflow-x-hidden">
        <header className="sticky top-0 z-20 flex h-14 max-w-full items-center justify-between gap-2 overflow-hidden border-b bg-panel/88 px-3 shadow-sm backdrop-blur-xl lg:px-4">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
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
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <div className="lg:hidden">
                <OrganizationMark
                  logoUrl={organizationLogoUrl}
                  name={organizationLabel}
                />
              </div>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold tracking-normal">
                  {organizationLabel}
                </p>
                <p className="truncate text-xs text-muted-foreground md:hidden">
                  Signed in as {accountName}
                </p>
                <div className="hidden items-center gap-1.5 md:flex">
                  {organizationSlug ? (
                    <span className="truncate text-xs text-muted-foreground">
                      {organizationSlug}
                    </span>
                  ) : null}
                  <HelpHint
                    label="About workspace scope"
                    title="Workspace scope"
                  >
                    {principal?.scope_type
                      ? `${principal.scope_type.replace("_", " ")} scoped access`
                      : "Forms, teams, reviews, and reports"}
                  </HelpHint>
                </div>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <Badge
              tone={isSupportMode ? "warning" : "success"}
              className="hidden gap-1.5 sm:inline-flex"
            >
              <RadioTower aria-hidden="true" size={13} />
              {isSupportMode ? "Support mode" : accountRole}
            </Badge>
            <div className="hidden min-w-0 max-w-[260px] items-center gap-2 rounded-lg border bg-background/80 px-2 py-1 shadow-line md:flex">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-[11px] font-semibold text-primary">
                {organizationInitials(accountName)}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Signed in as
                </p>
                <p className="truncate text-[13px] font-semibold text-foreground">
                  {accountName}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {accountScope}
                </p>
              </div>
            </div>
            <Button
              aria-label="Open command palette"
              className="sm:hidden"
              size="icon"
              variant="ghost"
              onClick={() => setCommandOpen(true)}
            >
              <Command aria-hidden="true" />
            </Button>
            <Button
              aria-label="Open command center"
              className="hidden gap-2 sm:inline-flex"
              onClick={() => setCommandOpen(true)}
              type="button"
              variant="secondary"
            >
              <Command aria-hidden="true" />
              <span>Command center</span>
              <kbd className="rounded border bg-background/80 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                ⌘K
              </kbd>
            </Button>
            <Button
              aria-label="Toggle theme"
              className="hidden sm:inline-flex"
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

        {!focusedEditorRoute ? (
          <section
            className={cn(
              "sticky top-14 z-10 border-b px-3 py-2 shadow-sm backdrop-blur-xl sm:px-4 lg:px-5",
              activeTone.header,
            )}
          >
            <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-2">
              <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <span className={cn("section-icon h-8 w-8", activeTone.icon)}>
                    <ActiveIcon aria-hidden="true" size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <nav
                        aria-label="Breadcrumb"
                        className="flex min-w-0 flex-wrap items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground"
                      >
                        {activeBreadcrumbs.map((breadcrumb, index) => (
                          <span
                            className="inline-flex items-center gap-1"
                            key={`${breadcrumb.label}-${index}`}
                          >
                            {index ? (
                              <ChevronRight aria-hidden="true" size={12} />
                            ) : null}
                            {breadcrumb.label}
                          </span>
                        ))}
                      </nav>
                      <Badge tone={activeTone.badge}>{activeItem.route}</Badge>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <h1 className="text-lg font-semibold tracking-tight">
                        {activeItem.label}
                      </h1>
                      <HelpHint
                        label={`About ${activeItem.label}`}
                        title={activeItem.label}
                      >
                        {guidance.outcome}
                      </HelpHint>
                      <Badge tone={activeTone.badge}>{guidance.step}</Badge>
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                  <span className="inline-flex h-7 items-center gap-1.5 rounded-lg border bg-background/75 px-2 text-[10px] font-medium text-muted-foreground shadow-line">
                    <CheckCircle2
                      aria-hidden="true"
                      className="text-success"
                      size={13}
                    />
                    Workspace healthy
                  </span>
                  <Button
                    onClick={() => setCommandOpen(true)}
                    type="button"
                    variant="secondary"
                  >
                    <Command aria-hidden="true" />
                    Search actions
                  </Button>
                  {nextActionItem ? (
                    <Button
                      onClick={() => {
                        setActiveView(nextActionItem.id);
                        router.push(nextActionItem.route);
                      }}
                      type="button"
                      variant="primary"
                    >
                      {guidance.nextLabel ?? nextActionItem.label}
                      <ArrowRight aria-hidden="true" />
                    </Button>
                  ) : null}
                </div>
              </div>
              {headerQuickLinks.length ? (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 product-scrollbar">
                  <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Quick links
                  </span>
                  {headerQuickLinks.map((child) => (
                    <span
                      className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-lg border bg-background/70 px-2 text-[11px] font-medium text-muted-foreground shadow-line"
                      key={child.route}
                    >
                      <a
                        className="transition hover:text-primary"
                        href={child.route}
                      >
                        {child.label}
                      </a>
                      <HelpHint
                        label={`About ${child.label}`}
                        title={child.label}
                      >
                        {child.description}
                      </HelpHint>
                    </span>
                  ))}
                </div>
              ) : null}
              {lastActionResult ? (
                <section
                  className="rounded-lg border border-success/30 bg-success/10 px-2.5 py-1.5"
                  aria-live="polite"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-semibold">Last action</p>
                    <HelpHint label="About last action" title="Last action">
                      {lastActionResult}
                    </HelpHint>
                  </div>
                </section>
              ) : null}
            </div>
          </section>
        ) : null}

        <main className="mx-auto w-full max-w-[1480px] overflow-x-hidden px-3 py-3 sm:px-4 lg:px-5">
          {children}
        </main>
      </div>
    </div>
  );
}
