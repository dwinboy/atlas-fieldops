"use client";

import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import {
  ArrowRight,
  ChevronDown,
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

import { AtlasFieldOpsLogo } from "@/components/brand/AtlasFieldOpsLogo";
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
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-background shadow-sm">
      <AtlasFieldOpsLogo alt={`${name} logo`} size={34} />
    </div>
  );
}

function UserMenu({
  accountName,
  accountRole,
  accountScope,
  isSupportMode,
  onSignOut,
  theme,
  toggleTheme,
}: {
  accountName: string;
  accountRole: string;
  accountScope: string;
  isSupportMode: boolean;
  onSignOut: () => void;
  theme: "light" | "dark";
  toggleTheme: () => void;
}) {
  return (
    <DropdownMenuPrimitive.Root>
      <DropdownMenuPrimitive.Trigger asChild>
        <button
          aria-label="Account menu"
          className="flex h-9 items-center gap-1.5 rounded-lg border bg-background/80 px-1.5 shadow-line transition hover:bg-muted/60"
          type="button"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-[11px] font-semibold text-primary">
            {organizationInitials(accountName)}
          </span>
          <ChevronDown aria-hidden="true" className="hidden text-muted-foreground sm:block" size={14} />
        </button>
      </DropdownMenuPrimitive.Trigger>
      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          align="end"
          className="z-50 w-64 overflow-hidden rounded-xl border bg-panel p-1.5 shadow-elevated data-[state=open]:animate-in data-[state=closed]:animate-out"
          sideOffset={8}
        >
          <div className="px-2.5 py-2">
            <p className="truncate text-sm font-semibold">{accountName}</p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{accountScope}</p>
            <div className="mt-2">
              <Badge className="gap-1.5" tone={isSupportMode ? "warning" : "success"}>
                <RadioTower aria-hidden="true" size={13} />
                {isSupportMode ? "Support mode" : accountRole}
              </Badge>
            </div>
          </div>
          <DropdownMenuPrimitive.Separator className="my-1 h-px bg-border" />
          <DropdownMenuPrimitive.Item
            className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-foreground outline-none transition hover:bg-muted/65 [&_svg]:size-3.5 [&_svg]:shrink-0"
            onSelect={(event) => {
              event.preventDefault();
              toggleTheme();
            }}
          >
            {theme === "dark" ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
            {theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          </DropdownMenuPrimitive.Item>
          <DropdownMenuPrimitive.Separator className="my-1 h-px bg-border" />
          <DropdownMenuPrimitive.Item
            className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-danger outline-none transition hover:bg-danger/10 [&_svg]:size-3.5 [&_svg]:shrink-0"
            onSelect={(event) => {
              event.preventDefault();
              onSignOut();
            }}
          >
            <LogOut aria-hidden="true" />
            Sign out
          </DropdownMenuPrimitive.Item>
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
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
                    className={cn(
                      "min-w-0 truncate",
                      collapsedSidebar && "sr-only",
                    )}
                  >
                    {item.label}
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
      <aside className="sticky top-0 hidden h-screen min-h-0 border-r bg-panel/88 p-2.5 shadow-[8px_0_40px_-32px_rgba(15,23,42,0.45)] backdrop-blur-xl lg:flex lg:flex-col">
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
            <UserMenu
              accountName={accountName}
              accountRole={accountRole}
              accountScope={accountScope}
              isSupportMode={isSupportMode}
              onSignOut={onSignOut}
              theme={theme}
              toggleTheme={toggleTheme}
            />
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
