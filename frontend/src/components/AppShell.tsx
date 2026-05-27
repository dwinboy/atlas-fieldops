"use client";

import { BarChart3, Building2, ClipboardList, LayoutDashboard, LogOut, Menu, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";

import { Button } from "@/components/Button";

export type WorkspaceView = "dashboard" | "organizations" | "forms" | "analytics";

type AppShellProps = {
  activeView: WorkspaceView;
  children: ReactNode;
  onSignOut: () => void;
  onViewChange: (view: WorkspaceView) => void;
  organizationLabel: string;
};

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "organizations", label: "Organizations", icon: Building2 },
  { id: "forms", label: "Forms", icon: ClipboardList },
  { id: "analytics", label: "Analytics", icon: BarChart3 }
] satisfies { id: WorkspaceView; label: string; icon: typeof LayoutDashboard }[];

export function AppShell({ activeView, children, onSignOut, onViewChange, organizationLabel }: AppShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const navigation = (
    <nav aria-label="Primary navigation" className="space-y-1">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = activeView === item.id;
        return (
          <button
            key={item.id}
            className={`flex h-10 w-full items-center gap-3 rounded px-3 text-left text-sm font-medium ${
              active ? "bg-teal-50 text-teal-900" : "text-slate-700 hover:bg-slate-100"
            }`}
            onClick={() => {
              onViewChange(item.id);
              setMobileNavOpen(false);
            }}
            type="button"
          >
            <Icon aria-hidden="true" size={18} />
            {item.label}
          </button>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="hidden border-r border-slate-200 bg-white p-4 lg:block">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded border border-teal-200 bg-teal-50 text-teal-800">
            <ShieldCheck aria-hidden="true" size={20} />
          </div>
          <div>
            <p className="text-sm font-semibold">Data Platform</p>
            <p className="text-xs text-slate-500">{organizationLabel}</p>
          </div>
        </div>
        {navigation}
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <Button
              aria-label="Toggle navigation"
              className="w-10 px-0 lg:hidden"
              icon={<Menu aria-hidden="true" size={18} />}
              onClick={() => setMobileNavOpen((value) => !value)}
              type="button"
              variant="ghost"
            >
              <span className="sr-only">Menu</span>
            </Button>
            <div>
              <p className="text-sm font-semibold">Operations workspace</p>
              <p className="text-xs text-slate-500">{organizationLabel}</p>
            </div>
          </div>
          <Button icon={<LogOut aria-hidden="true" size={18} />} onClick={onSignOut} type="button" variant="ghost">
            Sign out
          </Button>
        </header>

        {mobileNavOpen ? <div className="border-b border-slate-200 bg-white p-3 lg:hidden">{navigation}</div> : null}

        <main className="px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

