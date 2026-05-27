"use client";

import { BarChart3, Boxes, Building2, ClipboardList, Database, Files, GitPullRequestArrow, LayoutDashboard, Map, Search, ShieldCheck, UsersRound, Wifi } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { useWorkspaceStore, type WorkspaceView } from "@/stores/workspace";

const commands: { label: string; hint: string; view: WorkspaceView; group: string; icon: typeof LayoutDashboard }[] = [
  { label: "Open home", hint: "See today’s submissions, reviews, and sync status", view: "dashboard", group: "Daily work", icon: LayoutDashboard },
  { label: "Open ecosystem", hint: "See how projects, people, forms, reviews, and reports connect", view: "ecosystem", group: "Daily work", icon: Boxes },
  { label: "Manage data", hint: "Import, map, clean, edit, export, and sync datasets", view: "data", group: "Data", icon: Database },
  { label: "Open programs", hint: "Projects, donors, milestones, and coverage", view: "programs", group: "M&E", icon: Building2 },
  { label: "Find beneficiaries", hint: "Households, farmers, groups, and visit history", view: "beneficiaries", group: "M&E", icon: UsersRound },
  { label: "Track indicators", hint: "Baselines, targets, progress, and SDG mapping", view: "indicators", group: "M&E", icon: BarChart3 },
  { label: "Review submissions", hint: "Approve, reject, or request corrections", view: "submissions", group: "Review", icon: ShieldCheck },
  { label: "Browse templates", hint: "Start from ready-made forms for field operations", view: "templates", group: "Setup", icon: Files },
  { label: "Build forms", hint: "Add questions, rules, and offline-ready checks", view: "forms", group: "Setup", icon: ClipboardList },
  { label: "Manage field team", hint: "Invite officers and check sync status", view: "officers", group: "Field work", icon: UsersRound },
  { label: "Open cases", hint: "Complaints, referrals, corrections, and follow-ups", view: "cases", group: "Field work", icon: GitPullRequestArrow },
  { label: "Open map", hint: "Coverage, villages, farm boundaries, and weak areas", view: "map", group: "Map", icon: Map },
  { label: "Manage organization", hint: "Users, roles, and access", view: "organizations", group: "Admin", icon: Building2 },
  { label: "Open reports", hint: "Donor reports, exports, logframes, and summaries", view: "analytics", group: "Reports", icon: BarChart3 },
  { label: "Review approval rules", hint: "Correction paths, review steps, and overdue work", view: "workflows", group: "Approvals", icon: GitPullRequestArrow },
  { label: "Check connectivity", hint: "Offline sync, retries, SMS, and WhatsApp alerts", view: "connectivity", group: "Offline", icon: Wifi }
];

export function CommandPalette() {
  const commandOpen = useWorkspaceStore((state) => state.commandOpen);
  const setCommandOpen = useWorkspaceStore((state) => state.setCommandOpen);
  const setActiveView = useWorkspaceStore((state) => state.setActiveView);
  const pushToast = useWorkspaceStore((state) => state.pushToast);
  const [query, setQuery] = useState("");

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setCommandOpen]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return commands;
    }
    return commands.filter((command) => `${command.label} ${command.hint}`.toLowerCase().includes(normalized));
  }, [query]);

  return (
    <Modal
      description="Search pages and common actions."
      open={commandOpen}
      onOpenChange={setCommandOpen}
      title="Quick search"
    >
      <div className="border-b p-4">
        <label className="sr-only" htmlFor="command-search">
          Search commands
        </label>
        <div className="relative">
          <Search aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <Input
            id="command-search"
            className="pl-9"
            placeholder="Search pages and actions"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            autoFocus
          />
        </div>
      </div>
      <div className="max-h-[420px] overflow-y-auto p-2 product-scrollbar">
        {filtered.map((command) => {
          const Icon = command.icon;
          return (
          <button
            key={command.label}
            className="flex w-full items-center justify-between gap-4 rounded-md px-3 py-3 text-left transition-colors hover:bg-muted"
            onClick={() => {
              setActiveView(command.view);
              setCommandOpen(false);
              pushToast({ title: command.label, description: "Workspace updated", tone: "success" });
            }}
            type="button"
          >
            <span className="flex min-w-0 items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-panel">
                <Icon aria-hidden="true" size={15} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium">{command.label}</span>
                <span className="block truncate text-xs text-muted-foreground">{command.hint}</span>
              </span>
            </span>
            <Badge>{command.group}</Badge>
          </button>
          );
        })}
      </div>
      <div className="flex items-center justify-between border-t px-4 py-3 text-xs text-muted-foreground">
        <span>Type to find the next place to work</span>
        <Button size="sm" variant="ghost" onClick={() => setCommandOpen(false)}>
          Esc
        </Button>
      </div>
    </Modal>
  );
}
