"use client";

import { Search, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { useWorkspaceStore, type WorkspaceView } from "@/stores/workspace";

const commands: { label: string; hint: string; view: WorkspaceView; group: string }[] = [
  { label: "Open dashboard", hint: "Review executive operations", view: "dashboard", group: "Navigate" },
  { label: "Manage organizations", hint: "Tenants, users, and roles", view: "organizations", group: "Navigate" },
  { label: "Build forms", hint: "Schema design and publishing", view: "forms", group: "Navigate" },
  { label: "View analytics", hint: "Realtime throughput and lag", view: "analytics", group: "Navigate" },
  { label: "Review workflows", hint: "Approvals and escalations", view: "workflows", group: "Navigate" }
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
      description="Search navigation and operational commands."
      open={commandOpen}
      onOpenChange={setCommandOpen}
      title="Command palette"
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
            placeholder="Search commands, workflows, and views"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            autoFocus
          />
        </div>
      </div>
      <div className="max-h-[420px] overflow-y-auto p-2 product-scrollbar">
        {filtered.map((command) => (
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
                <Sparkles aria-hidden="true" size={15} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium">{command.label}</span>
                <span className="block truncate text-xs text-muted-foreground">{command.hint}</span>
              </span>
            </span>
            <Badge>{command.group}</Badge>
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between border-t px-4 py-3 text-xs text-muted-foreground">
        <span>Press Enter to run selected action</span>
        <Button size="sm" variant="ghost" onClick={() => setCommandOpen(false)}>
          Esc
        </Button>
      </div>
    </Modal>
  );
}

