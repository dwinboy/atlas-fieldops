"use client";

import { BarChart3, Building2, ClipboardList, GitPullRequestArrow, LayoutDashboard, Search, ShieldCheck, UsersRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { useWorkspaceStore, type WorkspaceView } from "@/stores/workspace";

const commands: { label: string; hint: string; view: WorkspaceView; group: string; icon: typeof LayoutDashboard }[] = [
  { label: "Open home", hint: "See today’s submissions, reviews, and sync status", view: "dashboard", group: "Daily work", icon: LayoutDashboard },
  { label: "Review submissions", hint: "Approve, reject, or request corrections", view: "submissions", group: "Review", icon: ShieldCheck },
  { label: "Build forms", hint: "Add questions, rules, and offline-ready checks", view: "forms", group: "Setup", icon: ClipboardList },
  { label: "Manage field team", hint: "Invite officers and check sync status", view: "officers", group: "Field work", icon: UsersRound },
  { label: "Manage organization", hint: "Users, roles, and access", view: "organizations", group: "Admin", icon: Building2 },
  { label: "Open reports", hint: "Track submissions, data quality, and field progress", view: "analytics", group: "Reports", icon: BarChart3 },
  { label: "Review approval rules", hint: "Correction paths, review steps, and overdue work", view: "workflows", group: "Approvals", icon: GitPullRequestArrow }
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
