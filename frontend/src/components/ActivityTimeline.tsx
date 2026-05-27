import { CheckCircle2, Clock3, GitBranch, ShieldAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";

const events = [
  {
    icon: CheckCircle2,
    title: "OCR validation passed",
    detail: "1,842 records cleared automated review",
    time: "2m ago",
    tone: "success" as const
  },
  {
    icon: ShieldAlert,
    title: "Policy exception opened",
    detail: "Duplicate ID confidence reached 91%",
    time: "11m ago",
    tone: "warning" as const
  },
  {
    icon: GitBranch,
    title: "Approval route changed",
    detail: "High-risk submissions now require regional manager",
    time: "32m ago",
    tone: "neutral" as const
  },
  {
    icon: Clock3,
    title: "Sync backlog decreasing",
    detail: "Mobile queue drain time is now 4.2 minutes",
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
          <p className="mt-1 text-xs text-muted-foreground">Operational changes and review events</p>
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

