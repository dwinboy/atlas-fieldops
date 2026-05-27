"use client";

import {
  BarChart3,
  Building2,
  ChevronLeft,
  ClipboardList,
  Command,
  GitPullRequestArrow,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  PanelLeftClose,
  ShieldCheck,
  Sun
} from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusDot } from "@/components/ui/status-dot";
import { cn } from "@/lib/utils";
import { useWorkspaceStore, type WorkspaceView } from "@/stores/workspace";

export type { WorkspaceView } from "@/stores/workspace";

type AppShellProps = {
  children: ReactNode;
  onSignOut: () => void;
  organizationLabel: string;
};

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "organizations", label: "Organizations", icon: Building2 },
  { id: "forms", label: "Forms", icon: ClipboardList },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "workflows", label: "Workflows", icon: GitPullRequestArrow }
] satisfies { id: WorkspaceView; label: string; icon: typeof LayoutDashboard }[];

export function AppShell({ children, onSignOut, organizationLabel }: AppShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const activeView = useWorkspaceStore((state) => state.activeView);
  const setActiveView = useWorkspaceStore((state) => state.setActiveView);
  const collapsedSidebar = useWorkspaceStore((state) => state.collapsedSidebar);
  const toggleSidebar = useWorkspaceStore((state) => state.toggleSidebar);
  const setCommandOpen = useWorkspaceStore((state) => state.setCommandOpen);
  const theme = useWorkspaceStore((state) => state.theme);
  const toggleTheme = useWorkspaceStore((state) => state.toggleTheme);

  const navigation = (
    <nav aria-label="Primary navigation" className="space-y-1.5">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = activeView === item.id;
        return (
          <button
            key={item.id}
            className={cn(
              "group flex h-9 w-full items-center gap-3 rounded-md px-2.5 text-left text-sm font-medium transition-all duration-150 ease-product",
              active
                ? "bg-primary/10 text-primary shadow-line"
                : "text-muted-foreground hover:bg-muted/65 hover:text-foreground",
              collapsedSidebar && "justify-center px-0"
            )}
            onClick={() => {
              setActiveView(item.id);
              setMobileNavOpen(false);
            }}
            type="button"
          >
            <Icon aria-hidden="true" size={18} />
            <span className={cn(collapsedSidebar && "sr-only")}>{item.label}</span>
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
      <aside className="hidden border-r bg-panel/95 p-3 backdrop-blur lg:block">
        <div className={cn("mb-5 flex items-center gap-3 px-1", collapsedSidebar && "justify-center")}>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-primary/10 text-primary">
            <ShieldCheck aria-hidden="true" size={20} />
          </div>
          <div className={cn("min-w-0", collapsedSidebar && "sr-only")}>
            <p className="text-sm font-semibold">Data Platform</p>
            <p className="truncate text-xs text-muted-foreground">{organizationLabel}</p>
          </div>
        </div>
        <button
          className={cn(
            "mb-4 flex h-9 w-full items-center gap-2 rounded-md border bg-background px-2.5 text-left text-xs text-muted-foreground shadow-line transition hover:text-foreground",
            collapsedSidebar && "justify-center px-0"
          )}
          onClick={() => setCommandOpen(true)}
          type="button"
        >
          <Command aria-hidden="true" size={15} />
          <span className={cn("min-w-0 flex-1 truncate", collapsedSidebar && "sr-only")}>Search or command</span>
          <kbd className={cn("rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]", collapsedSidebar && "sr-only")}>
            ⌘K
          </kbd>
        </button>
        {navigation}
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
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b bg-panel/92 px-3 backdrop-blur lg:px-5">
          <div className="flex items-center gap-3">
            <Button
              aria-label="Toggle navigation"
              size="icon"
              onClick={() => setMobileNavOpen((value) => !value)}
              type="button"
              variant="ghost"
            >
              <Menu aria-hidden="true" />
            </Button>
            <div>
              <p className="text-sm font-semibold tracking-normal">Operations workspace</p>
              <p className="hidden text-xs text-muted-foreground sm:block">{organizationLabel}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone="success" className="hidden gap-1.5 sm:inline-flex">
              <StatusDot tone="online" />
              Realtime
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

        <main className="mx-auto w-full max-w-[1480px] px-3 py-5 sm:px-5 lg:px-7">{children}</main>
      </div>
    </div>
  );
}
