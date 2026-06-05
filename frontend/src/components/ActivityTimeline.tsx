"use client";

import { ArrowUpRight, CheckCircle2, Clock3, Filter, GitBranch, ShieldAlert } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useWorkspaceStore, type WorkspaceView } from "@/stores/workspace";

type ActivityTone = "success" | "warning" | "neutral";
type ActivityFilter = "all" | ActivityTone;
type ActivityEvent = {
  icon: LucideIcon;
  title: string;
  detail: string;
  time: string;
  tone: ActivityTone;
  view: WorkspaceView;
  actionLabel: string;
  nextStep: string;
};

const events: ActivityEvent[] = [
  {
    icon: CheckCircle2,
    title: "Data quality check passed",
    detail: "1,842 submissions are ready for review",
    time: "2m ago",
    tone: "success",
    view: "submissions",
    actionLabel: "Review clean data",
    nextStep: "Open the review queue, approve the clean submissions first, and leave reviewer notes for anything that needs correction."
  },
  {
    icon: ShieldAlert,
    title: "Possible duplicate found",
    detail: "One ID may already exist in this project",
    time: "11m ago",
    tone: "warning",
    view: "data",
    actionLabel: "Resolve duplicate event",
    nextStep: "Open data tools, compare the suspected duplicate records, and decide whether to merge, correct, or reject the new record."
  },
  {
    icon: GitBranch,
    title: "Approval rule updated",
    detail: "High-risk submissions now go to a regional manager",
    time: "32m ago",
    tone: "neutral",
    view: "workflows",
    actionLabel: "Open approvals",
    nextStep: "Open approvals and confirm the regional manager route, escalation rule, and expected response time before teams use it."
  },
  {
    icon: Clock3,
    title: "Offline uploads improving",
    detail: "Most phones are syncing again within 4.2 minutes",
    time: "48m ago",
    tone: "success",
    view: "connectivity",
    actionLabel: "Check sync health",
    nextStep: "Open sync health to confirm retry queues, weak-network devices, and compressed upload settings before sending field teams back out."
  }
];

export function ActivityTimeline() {
  const [filter, setFilter] = useState<ActivityFilter>("all");
  const [selectedEvent, setSelectedEvent] = useState<ActivityEvent>(events[0]);
  const setActiveView = useWorkspaceStore((state) => state.setActiveView);
  const setLastActionResult = useWorkspaceStore((state) => state.setLastActionResult);
  const pushToast = useWorkspaceStore((state) => state.pushToast);
  const filteredEvents = useMemo(() => events.filter((event) => filter === "all" || event.tone === filter), [filter]);
  const filterOptions: { label: string; value: ActivityFilter }[] = [
    { label: "All", value: "all" },
    { label: "Resolved", value: "success" },
    { label: "Attention", value: "warning" },
    { label: "Updates", value: "neutral" }
  ];

  function openEvent(event: ActivityEvent): void {
    setSelectedEvent(event);
    setLastActionResult(event.nextStep);
    pushToast({ title: event.title, description: event.nextStep, tone: event.tone });
    setActiveView(event.view);
  }

  return (
    <section className="surface-premium rounded-2xl p-5" aria-labelledby="activity-title">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 id="activity-title" className="text-sm font-semibold">
            Activity
          </h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">Recent review, sync, and quality updates with clear next actions.</p>
        </div>
        <Badge tone="accent" className="w-fit gap-1.5">
          <Filter aria-hidden="true" size={12} />
          Live
        </Badge>
      </div>
      <div className="mb-4 flex flex-wrap gap-2" aria-label="Filter activity">
        {filterOptions.map((option) => (
          <button
            key={option.value}
            className={cn(
              "rounded-full border px-2.5 py-1 text-xs font-medium transition",
              filter === option.value ? "border-primary/30 bg-primary/10 text-primary" : "bg-background text-muted-foreground hover:bg-muted"
            )}
            onClick={() => setFilter(option.value)}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>
      <ol className="space-y-1">
        {filteredEvents.map((event) => {
          const Icon = event.icon;
          const active = selectedEvent.title === event.title;
          return (
            <li key={event.title}>
              <button
                className={cn(
                  "grid w-full grid-cols-[28px_1fr_auto] gap-3 rounded-xl px-2 py-3 text-left transition-colors hover:bg-muted/40",
                  active && "bg-primary/5 ring-1 ring-primary/20"
                )}
                onClick={() => setSelectedEvent(event)}
                type="button"
              >
                <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-lg border bg-background/80 shadow-sm">
                  <Icon aria-hidden="true" size={14} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{event.title}</span>
                  <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{event.detail}</span>
                </span>
                <span className="text-xs text-muted-foreground">{event.time}</span>
              </button>
            </li>
          );
        })}
      </ol>
      <section className="mt-4 rounded-xl border bg-background/80 p-3" aria-live="polite">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Badge tone={selectedEvent.tone}>{selectedEvent.tone === "success" ? "Resolved" : selectedEvent.tone === "warning" ? "Attention" : "Update"}</Badge>
            <h3 className="mt-2 text-sm font-semibold">{selectedEvent.title}</h3>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{selectedEvent.nextStep}</p>
          </div>
        </div>
        <Button className="mt-3 w-full justify-center" onClick={() => openEvent(selectedEvent)} type="button" variant="secondary">
          {selectedEvent.actionLabel}
          <ArrowUpRight aria-hidden="true" />
        </Button>
      </section>
    </section>
  );
}
