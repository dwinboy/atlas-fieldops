import { ArrowRight, CheckCircle2, GitPullRequestArrow, ShieldAlert, TimerReset } from "lucide-react";

import { ActivityTimeline } from "@/components/ActivityTimeline";
import { DataTable, type TableColumn } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusDot } from "@/components/ui/status-dot";

type WorkflowRow = {
  id: string;
  name: string;
  owner: string;
  status: "healthy" | "attention" | "blocked";
  sla: string;
  queue: number;
};

const workflows: WorkflowRow[] = [
  { id: "wf-1", name: "High-confidence auto approval", owner: "Validation Ops", status: "healthy", sla: "4m", queue: 1842 },
  { id: "wf-2", name: "Duplicate identity review", owner: "Risk", status: "attention", sla: "42m", queue: 128 },
  { id: "wf-3", name: "Regional supervisor approval", owner: "Field Ops", status: "healthy", sla: "2h", queue: 74 },
  { id: "wf-4", name: "Escalated fraud investigation", owner: "Trust", status: "blocked", sla: "6h", queue: 11 }
];

const columns: TableColumn<WorkflowRow>[] = [
  {
    key: "name",
    header: "Workflow",
    render: (row) => (
      <div>
        <p className="font-medium">{row.name}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{row.id}</p>
      </div>
    )
  },
  { key: "owner", header: "Owner", render: (row) => row.owner },
  {
    key: "status",
    header: "Status",
    render: (row) => (
      <Badge tone={row.status === "healthy" ? "success" : row.status === "attention" ? "warning" : "danger"}>
        {row.status}
      </Badge>
    )
  },
  { key: "sla", header: "SLA", render: (row) => row.sla },
  { key: "queue", header: "Queue", align: "right", render: (row) => row.queue.toLocaleString() }
];

export function WorkflowManagement() {
  return (
    <section aria-labelledby="workflows-title" className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Control plane</p>
          <h1 id="workflows-title" className="mt-2 text-2xl font-semibold tracking-tight">
            Workflow management
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            Route submissions through automated checks, human review, and policy-based approval chains.
          </p>
        </div>
        <Button variant="primary">
          <GitPullRequestArrow aria-hidden="true" />
          New workflow
        </Button>
      </div>

      <div className="grid gap-3 lg:grid-cols-4">
        {([
          ["Auto approved", "92.4%", CheckCircle2, "success" as const],
          ["Needs review", "2,145", ShieldAlert, "warning" as const],
          ["Median cycle", "8m 12s", TimerReset, "neutral" as const],
          ["Blocked", "11", ShieldAlert, "danger" as const]
        ] as const).map(([label, value, Icon, tone]) => (
          <article key={label as string} className="rounded-lg border bg-panel p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{label as string}</p>
              <Icon aria-hidden="true" className="text-muted-foreground" size={17} />
            </div>
            <p className="mt-3 text-2xl font-semibold tracking-tight">{value}</p>
            <Badge tone={tone} className="mt-3">
              <StatusDot tone={tone === "danger" ? "offline" : tone === "warning" ? "warning" : "online"} />
              Live policy
            </Badge>
          </article>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <DataTable columns={columns} emptyLabel="No workflows found" rows={workflows} searchLabel="Search workflows" title="Approval workflows" />
        <ActivityTimeline />
      </div>

      <section className="rounded-lg border bg-panel p-4" aria-labelledby="approval-path-title">
        <h2 id="approval-path-title" className="text-sm font-semibold">
          Approval path preview
        </h2>
        <div className="mt-4 grid gap-2 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-center">
          {["Capture", "AI validation", "Supervisor approval"].map((step, index) => (
            <div key={step} className="rounded-md border bg-background p-4">
              <p className="text-xs text-muted-foreground">Step {index + 1}</p>
              <p className="mt-1 text-sm font-medium">{step}</p>
            </div>
          )).flatMap((node, index, array) =>
            index < array.length - 1
              ? [node, <ArrowRight key={`arrow-${index}`} aria-hidden="true" className="hidden text-muted-foreground md:block" size={18} />]
              : [node]
          )}
        </div>
      </section>
    </section>
  );
}
