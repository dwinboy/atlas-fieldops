"use client";

import {
  BarChart3,
  Boxes,
  Building2,
  ChevronLeft,
  ClipboardList,
  Command,
  Database,
  Files,
  GitPullRequestArrow,
  LayoutDashboard,
  LogOut,
  Map,
  Menu,
  Moon,
  PanelLeftClose,
  RadioTower,
  ShieldCheck,
  Sun,
  UsersRound,
  Wifi
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
  principal?: CurrentPrincipal | null;
};

const navItems = [
  { id: "dashboard", label: "Home", hint: "Today’s work", icon: LayoutDashboard },
  { id: "ecosystem", label: "Ecosystem", hint: "Connected work", icon: Boxes },
  { id: "enterprise", label: "Operations", hint: "Governance & assets", icon: Building2 },
  { id: "data", label: "Data", hint: "Import & export", icon: Database },
  { id: "programs", label: "Programs", hint: "Projects & donors", icon: Building2 },
  { id: "beneficiaries", label: "Beneficiaries", hint: "People & households", icon: UsersRound },
  { id: "indicators", label: "Indicators", hint: "Targets & results", icon: BarChart3 },
  { id: "submissions", label: "Review", hint: "Approve data", icon: ShieldCheck },
  { id: "templates", label: "Templates", hint: "Start faster", icon: Files },
  { id: "forms", label: "Forms", hint: "Build surveys", icon: ClipboardList },
  { id: "officers", label: "Field team", hint: "People & sync", icon: UsersRound },
  { id: "cases", label: "Cases", hint: "Follow-ups", icon: GitPullRequestArrow },
  { id: "map", label: "Map", hint: "Coverage", icon: Map },
  { id: "organizations", label: "Organization", hint: "Team & roles", icon: Building2 },
  { id: "analytics", label: "Reports", hint: "Donors & exports", icon: BarChart3 },
  { id: "workflows", label: "Approvals", hint: "Rules", icon: GitPullRequestArrow },
  { id: "connectivity", label: "Connectivity", hint: "Offline & alerts", icon: Wifi }
] satisfies { id: WorkspaceView; label: string; hint: string; icon: typeof LayoutDashboard }[];

export function AppShell({ children, onSignOut, organizationLabel, principal }: AppShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const activeView = useWorkspaceStore((state) => state.activeView);
  const setActiveView = useWorkspaceStore((state) => state.setActiveView);
  const collapsedSidebar = useWorkspaceStore((state) => state.collapsedSidebar);
  const toggleSidebar = useWorkspaceStore((state) => state.toggleSidebar);
  const setCommandOpen = useWorkspaceStore((state) => state.setCommandOpen);
  const theme = useWorkspaceStore((state) => state.theme);
  const toggleTheme = useWorkspaceStore((state) => state.toggleTheme);

  const allowedViews = principal?.menu_views?.length ? new Set(principal.menu_views) : null;
  const visibleNavItems = allowedViews ? navItems.filter((item) => allowedViews.has(item.id)) : navItems;

  const navigation = (
    <nav aria-label="Primary navigation" className="space-y-1.5">
      {visibleNavItems.map((item) => {
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
              collapsedSidebar && "justify-center px-0"
            )}
            onClick={() => {
              setActiveView(item.id);
              setMobileNavOpen(false);
            }}
            type="button"
          >
            <Icon aria-hidden="true" size={18} />
            <span className={cn("min-w-0", collapsedSidebar && "sr-only")}>
              <span className="block truncate">{item.label}</span>
              <span className="block truncate text-[11px] font-normal text-muted-foreground group-hover:text-muted-foreground">
                {item.hint}
              </span>
            </span>
          </button>
        );
      })}
    </nav>
  );

  return (
    <div
      className={cn(
        "min-h-screen bg-background text-foreground lg:grid",
        collapsedSidebar ? "lg:grid-cols-[76px_1fr]" : "lg:grid-cols-[264px_1fr]"
      )}
    >
      <aside className="relative sticky top-0 hidden h-screen overflow-hidden border-r bg-panel/88 p-3 shadow-[8px_0_40px_-32px_rgba(15,23,42,0.45)] backdrop-blur-xl lg:block">
        <div className={cn("mb-5 flex items-center gap-3 px-1", collapsedSidebar && "justify-center")}>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-primary/10 text-primary shadow-sm">
            <ShieldCheck aria-hidden="true" size={20} />
          </div>
          <div className={cn("min-w-0", collapsedSidebar && "sr-only")}>
            <p className="text-sm font-semibold">Atlas FieldOps</p>
            <p className="truncate text-xs text-muted-foreground">{organizationLabel}</p>
          </div>
        </div>
        <button
          className={cn(
            "mb-4 flex h-10 w-full items-center gap-2 rounded-xl border bg-background/80 px-2.5 text-left text-xs text-muted-foreground shadow-line transition hover:bg-muted/35 hover:text-foreground",
            collapsedSidebar && "justify-center px-0"
          )}
          onClick={() => setCommandOpen(true)}
          type="button"
        >
          <Command aria-hidden="true" size={15} />
          <span className={cn("min-w-0 flex-1 truncate", collapsedSidebar && "sr-only")}>Search</span>
          <kbd className={cn("rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]", collapsedSidebar && "sr-only")}>
            ⌘K
          </kbd>
        </button>
        <div className={cn("mb-4 rounded-xl border bg-background/80 p-3 shadow-sm", collapsedSidebar && "hidden")}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Today</span>
            <StatusDot tone="online" />
          </div>
          <p className="mt-2 text-sm font-semibold">128.4k submissions saved</p>
          <p className="mt-1 text-xs text-muted-foreground">812 waiting to sync · 37 need retry</p>
        </div>
        <div className="max-h-[calc(100vh-220px)] overflow-y-auto pb-16 pr-1 product-scrollbar">
          {navigation}
        </div>
        <div className="absolute bottom-3 left-3 right-3 space-y-2">
          <button
            className={cn(
              "flex h-9 w-full items-center gap-2 rounded-md px-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground",
              collapsedSidebar && "justify-center px-0"
            )}
            onClick={toggleSidebar}
            type="button"
          >
            {collapsedSidebar ? <ChevronLeft aria-hidden="true" size={17} /> : <PanelLeftClose aria-hidden="true" size={17} />}
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
          <div>
            <p className="text-sm font-semibold tracking-normal">Field data workspace</p>
            <p className="hidden text-xs text-muted-foreground sm:block">
                {organizationLabel} · {principal?.scope_type ? `${principal.scope_type.replace("_", " ")} scoped access` : "Forms, teams, reviews, and reports"}
            </p>
          </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone="success" className="hidden gap-1.5 sm:inline-flex">
              <RadioTower aria-hidden="true" size={13} />
              {principal?.roles?.[0]?.replaceAll("_", " ") ?? "Online"}
            </Badge>
            <Button aria-label="Open command palette" size="icon" variant="ghost" onClick={() => setCommandOpen(true)}>
              <Command aria-hidden="true" />
            </Button>
            <Button aria-label="Toggle theme" size="icon" variant="ghost" onClick={toggleTheme}>
              {theme === "dark" ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
            </Button>
            <Button onClick={onSignOut} type="button" variant="ghost">
              <LogOut aria-hidden="true" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </header>

        {mobileNavOpen ? <div className="border-b bg-panel p-3 lg:hidden">{navigation}</div> : null}

        <main className="mx-auto w-full max-w-[1480px] px-3 py-6 sm:px-5 lg:px-7">{children}</main>
      </div>
    </div>
  );
}
