"use client";

import { HelpCircle, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { getVisibleNavigationItems } from "@/config/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import type { CurrentPrincipal } from "@/lib/api";
import { useWorkspaceStore } from "@/stores/workspace";

export function commandPaletteEmptyStateHelpRoute(): string {
  return "/app/help";
}

export function CommandPalette({ principal }: { principal?: CurrentPrincipal | null }) {
  const router = useRouter();
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
    const visibleCommands = getVisibleNavigationItems(principal);
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return visibleCommands;
    }
    return visibleCommands.filter((command) => `${command.label} ${command.hint} ${command.description} ${command.domain} ${(command.keywords ?? []).join(" ")}`.toLowerCase().includes(normalized));
  }, [principal, query]);

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
              const result = `${command.label}. ${command.description}`;
              setActiveView(command.id);
              router.push(command.route);
              setLastActionResult(result);
              setCommandOpen(false);
              pushToast({ title: command.label, description: result, tone: "success" });
            }}
            type="button"
          >
            <span className="flex min-w-0 items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-surface-container-lowest">
                <Icon aria-hidden="true" size={15} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium">{command.label}</span>
                <span className="block truncate text-xs text-muted-foreground">{command.hint}</span>
              </span>
            </span>
            <Badge>{command.domain}</Badge>
          </button>
          );
        }) : (
          <div className="rounded-lg border bg-surface-container-lowest p-5 text-center">
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
                router.push(commandPaletteEmptyStateHelpRoute());
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
