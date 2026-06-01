"use client";

import { BarChart3, Boxes, Building2, ClipboardList, Database, Files, Fingerprint, GitPullRequestArrow, HelpCircle, LayoutDashboard, Map, Search, ShieldCheck, UsersRound, Wifi, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { useWorkspaceStore, type WorkspaceView } from "@/stores/workspace";

const commands: { label: string; hint: string; view: WorkspaceView; group: string; icon: typeof LayoutDashboard; keywords: string[] }[] = [
  { label: "Open home", hint: "See today’s submissions, reviews, and sync status", view: "dashboard", group: "Daily work", icon: LayoutDashboard, keywords: ["today", "home", "dashboard", "tasks"] },
  { label: "Open ecosystem", hint: "See how projects, people, forms, reviews, and reports connect", view: "ecosystem", group: "Daily work", icon: Boxes, keywords: ["overview", "connections", "platform"] },
  { label: "Open enterprise operations", hint: "Manage governance, workflows, assets, budgets, and documents", view: "enterprise", group: "Daily work", icon: Building2, keywords: ["operations", "assets", "budget"] },
  { label: "Open governance", hint: "Audit, retention, validation, lineage, consent, and export controls", view: "governance", group: "Daily work", icon: Fingerprint, keywords: ["audit", "privacy", "policy", "quality"] },
  { label: "Open workforce governance", hint: "Departments, teams, delegations, access requests, and role simulation", view: "workforce", group: "Admin", icon: UsersRound, keywords: ["staff", "teams", "departments", "permissions"] },
  { label: "Manage data", hint: "Import, map, clean, edit, export, and sync datasets", view: "data", group: "Data", icon: Database, keywords: ["spreadsheet", "excel", "csv", "migration", "kobo", "odk"] },
  { label: "Open programs", hint: "Projects, donors, milestones, and coverage", view: "programs", group: "M&E", icon: Building2, keywords: ["project", "program", "donor"] },
  { label: "Find beneficiaries", hint: "Households, farmers, groups, and visit history", view: "beneficiaries", group: "M&E", icon: UsersRound, keywords: ["people", "households", "farmers", "registry"] },
  { label: "Track indicators", hint: "Baselines, targets, progress, and SDG mapping", view: "indicators", group: "M&E", icon: BarChart3, keywords: ["kpi", "targets", "results", "logframe"] },
  { label: "Review submissions", hint: "Approve, reject, or request corrections", view: "submissions", group: "Review", icon: ShieldCheck, keywords: ["review", "approve", "corrections", "responses"] },
  { label: "Browse templates", hint: "Start from ready-made forms for field operations", view: "templates", group: "Setup", icon: Files, keywords: ["template", "survey", "questionnaire", "start"] },
  { label: "Build forms", hint: "Add questions, rules, and offline-ready checks", view: "forms", group: "Setup", icon: ClipboardList, keywords: ["form", "survey", "question", "drag", "xlsform"] },
  { label: "Manage field team", hint: "Invite officers and check sync status", view: "officers", group: "Field work", icon: UsersRound, keywords: ["officers", "enumerators", "collectors", "devices"] },
  { label: "Open cases", hint: "Complaints, referrals, corrections, and follow-ups", view: "cases", group: "Field work", icon: GitPullRequestArrow, keywords: ["case", "complaint", "referral", "incident"] },
  { label: "Open map", hint: "Coverage, villages, farm boundaries, and weak areas", view: "map", group: "Map", icon: Map, keywords: ["gps", "geo", "location", "coverage"] },
  { label: "Manage organization", hint: "Users, roles, and access", view: "organizations", group: "Admin", icon: Building2, keywords: ["admin", "users", "roles", "organization"] },
  { label: "Open reports", hint: "Donor reports, exports, logframes, and summaries", view: "analytics", group: "Reports", icon: BarChart3, keywords: ["report", "donor", "summary", "analytics"] },
  { label: "Review approval rules", hint: "Correction paths, review steps, and overdue work", view: "workflows", group: "Approvals", icon: GitPullRequestArrow, keywords: ["approval", "workflow", "rules", "sla"] },
  { label: "Check connectivity", hint: "Offline sync, retries, SMS, and WhatsApp alerts", view: "connectivity", group: "Offline", icon: Wifi, keywords: ["offline", "sync", "retry", "network"] },
  { label: "Open help guide", hint: "Learn how to use Atlas FieldOps step by step", view: "help", group: "Support", icon: HelpCircle, keywords: ["help", "guide", "documentation", "how to"] }
];

export function CommandPalette() {
  const commandOpen = useWorkspaceStore((state) => state.commandOpen);
  const setCommandOpen = useWorkspaceStore((state) => state.setCommandOpen);
  const setActiveView = useWorkspaceStore((state) => state.setActiveView);
  const setLastActionResult = useWorkspaceStore((state) => state.setLastActionResult);
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
    return commands.filter((command) => `${command.label} ${command.hint} ${command.group} ${command.keywords.join(" ")}`.toLowerCase().includes(normalized));
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
            className="pl-9 pr-10"
            placeholder="Search pages and actions"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            autoFocus
          />
          {query ? (
            <button
              aria-label="Clear command search"
              className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={() => setQuery("")}
              type="button"
            >
              <X aria-hidden="true" size={14} />
            </button>
          ) : null}
        </div>
      </div>
      <div className="max-h-[420px] overflow-y-auto p-2 product-scrollbar">
        {filtered.length ? filtered.map((command) => {
          const Icon = command.icon;
          return (
          <button
            key={command.label}
            className="flex w-full items-center justify-between gap-4 rounded-md px-3 py-3 text-left transition-colors hover:bg-muted"
            onClick={() => {
              const result = `${command.label}. ${command.hint}. Use this workspace to continue the related Atlas FieldOps task with the right forms, reviews, data, or controls.`;
              setActiveView(command.view);
              setLastActionResult(result);
              setCommandOpen(false);
              pushToast({ title: command.label, description: result, tone: "success" });
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
        }) : (
          <div className="rounded-lg border bg-panel p-5 text-center">
            <Search aria-hidden="true" className="mx-auto text-muted-foreground" size={22} />
            <h3 className="mt-3 text-sm font-semibold">No matching action</h3>
            <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-muted-foreground">
              Try words like survey, offline, reports, people, GPS, import, or approval.
            </p>
            <Button
              className="mt-4"
              size="sm"
              type="button"
              variant="secondary"
              onClick={() => {
                const result = "Opening the help guide. Start with the beginner workflow that matches your task, then follow the steps and next actions.";
                setActiveView("help");
                setLastActionResult(result);
                setCommandOpen(false);
                setQuery("");
                pushToast({ title: "Open help guide", description: result, tone: "success" });
              }}
            >
              <HelpCircle aria-hidden="true" />
              Open help guide
            </Button>
          </div>
        )}
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
