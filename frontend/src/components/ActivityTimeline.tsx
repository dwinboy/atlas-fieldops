import { CheckCircle2, Clock3, GitBranch, ShieldAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";

const events = [
  {
    icon: CheckCircle2,
    title: "Data quality check passed",
    detail: "1,842 submissions are ready for review",
    time: "2m ago",
    tone: "success" as const
  },
  {
    icon: ShieldAlert,
    title: "Possible duplicate found",
    detail: "One ID may already exist in this project",
    time: "11m ago",
    tone: "warning" as const
  },
  {
    icon: GitBranch,
    title: "Approval rule updated",
    detail: "High-risk submissions now go to a regional manager",
    time: "32m ago",
    tone: "neutral" as const
  },
  {
    icon: Clock3,
    title: "Offline uploads improving",
    detail: "Most phones are syncing again within 4.2 minutes",
    time: "48m ago",
    tone: "success" as const
  }
];

export function ActivityTimeline() {
  return (
    <section className="rounded-lg border bg-panel p-4" aria-labelledby="activity-title">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 id="activity-title" className="text-sm font-semibold">
            Activity
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">Recent review, sync, and quality updates</p>
        </div>
        <Badge tone="accent">Live</Badge>
      </div>
      <ol className="space-y-1">
        {events.map((event) => {
          const Icon = event.icon;
          return (
            <li key={event.title} className="grid grid-cols-[28px_1fr_auto] gap-3 rounded-md px-2 py-3 hover:bg-muted/40">
              <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-md border bg-background">
                <Icon aria-hidden="true" size={14} />
              </span>
              <span>
                <span className="block text-sm font-medium">{event.title}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{event.detail}</span>
              </span>
              <span className="text-xs text-muted-foreground">{event.time}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
