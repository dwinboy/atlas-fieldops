"use client";

import { ArrowRight, CheckCircle2, GitPullRequestArrow, Plus, ShieldAlert, TimerReset } from "lucide-react";
import { useMemo, useState } from "react";

import { ActivityTimeline } from "@/components/ActivityTimeline";
import { DataTable, type TableColumn } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusDot } from "@/components/ui/status-dot";
import { useWorkspaceStore } from "@/stores/workspace";

type WorkflowRow = {
  id: string;
  name: string;
  owner: string;
  status: "healthy" | "attention" | "blocked";
  sla: string;
  queue: number;
};

const starterWorkflows: WorkflowRow[] = [
  { id: "wf-1", name: "Good submissions can be approved quickly", owner: "Review team", status: "healthy", sla: "4m", queue: 1842 },
  { id: "wf-2", name: "Possible duplicates need review", owner: "Data quality", status: "attention", sla: "42m", queue: 128 },
  { id: "wf-3", name: "Regional supervisors approve exceptions", owner: "Field team", status: "healthy", sla: "2h", queue: 74 },
  { id: "wf-4", name: "High-risk cases need manager approval", owner: "Program team", status: "blocked", sla: "6h", queue: 11 }
];

export function WorkflowManagement({ token }: { token?: string | null }) {
  const isPreview = token === "preview-token";
  const [workflows, setWorkflows] = useState<WorkflowRow[]>(() => (isPreview ? starterWorkflows : []));
  const [selectedWorkflowId, setSelectedWorkflowId] = useState(() => (isPreview ? starterWorkflows[0]?.id ?? "" : ""));
  const [workflowResult, setWorkflowResult] = useState("");
  const pushToast = useWorkspaceStore((state) => state.pushToast);
  const selectedWorkflow = useMemo(
    () => workflows.find((workflow) => workflow.id === selectedWorkflowId) ?? workflows[0],
    [selectedWorkflowId, workflows]
  );
  const columns: TableColumn<WorkflowRow>[] = [
    {
      key: "name",
      header: "Workflow",
      value: (row) => `${row.name} ${row.id}`,
      render: (row) => (
        <button className="text-left" onClick={() => setSelectedWorkflowId(row.id)} type="button">
          <span className="block font-medium">{row.name}</span>
          <span className="mt-0.5 block text-xs text-muted-foreground">{row.id}</span>
        </button>
      )
    },
    { key: "owner", header: "Owner", value: (row) => row.owner, render: (row) => row.owner },
    {
      key: "status",
      header: "Status",
      value: (row) => row.status,
      render: (row) => (
        <Badge tone={row.status === "healthy" ? "success" : row.status === "attention" ? "warning" : "danger"}>
          {row.status === "healthy" ? "Healthy" : row.status === "attention" ? "Needs attention" : "Overdue"}
        </Badge>
      )
    },
    { key: "sla", header: "Target time", value: (row) => row.sla, render: (row) => row.sla },
    { key: "queue", header: "Waiting", align: "right", value: (row) => String(row.queue), render: (row) => row.queue.toLocaleString() }
  ];

  function createWorkflow() {
    const nextWorkflow: WorkflowRow = {
      id: `wf-${workflows.length + 1}`,
      name: "New supervisor review workflow",
      owner: "Program manager",
      status: "attention",
      sla: "1h",
      queue: 0
    };
    setWorkflows((current) => [nextWorkflow, ...current]);
    setSelectedWorkflowId(nextWorkflow.id);
    setWorkflowResult(`${nextWorkflow.name} was created as a draft owned by ${nextWorkflow.owner}. Configure conditions, owner, and SLA before routing live submissions.`);
    pushToast({
      title: "Workflow draft created",
      description: "A supervisor review workflow is ready to configure.",
      tone: "success"
    });
  }

  function markSelectedReady(): void {
    if (!selectedWorkflow) {
      return;
    }
    setWorkflows((current) =>
      current.map((workflow) =>
        workflow.id === selectedWorkflow.id
          ? { ...workflow, status: "healthy", queue: workflow.queue || 1 }
          : workflow
      )
    );
    setWorkflowResult(`${selectedWorkflow.name} is ready to test with sample submissions. It will route matching data to ${selectedWorkflow.owner.toLowerCase()} with a ${selectedWorkflow.sla} target time.`);
    pushToast({ title: "Workflow ready for review", description: `${selectedWorkflow.name} can now be tested with sample submissions.`, tone: "success" });
  }

  return (
    <section aria-labelledby="workflows-title" className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Approvals</p>
          <h1 id="workflows-title" className="mt-2 text-2xl font-semibold tracking-tight">
            Approval rules
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            Decide which submissions can move quickly and which ones need a supervisor or program manager.
          </p>
        </div>
        <Button onClick={createWorkflow} type="button" variant="primary">
          <Plus aria-hidden="true" />
          New workflow
        </Button>
      </div>

      <div className="grid gap-3 lg:grid-cols-4">
        {([
          ["Auto approved", isPreview ? "92.4%" : "0", CheckCircle2, "success" as const],
          ["Needs review", isPreview ? "2,145" : "0", ShieldAlert, "warning" as const],
          ["Typical review time", isPreview ? "8m 12s" : "Not started", TimerReset, "neutral" as const],
          ["Overdue", isPreview ? "11" : "0", ShieldAlert, "danger" as const]
        ] as const).map(([label, value, Icon, tone]) => (
          <article key={label as string} className="rounded-lg border bg-panel p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{label as string}</p>
              <Icon aria-hidden="true" className="text-muted-foreground" size={17} />
            </div>
            <p className="mt-3 text-2xl font-semibold tracking-tight">{value}</p>
            <Badge tone={tone} className="mt-3">
              <StatusDot tone={tone === "danger" ? "offline" : tone === "warning" ? "warning" : "online"} />
              Active rule
            </Badge>
          </article>
        ))}
      </div>

      {workflowResult ? (
        <section className="rounded-2xl border border-success/30 bg-success/10 p-4" aria-live="polite">
          <div className="flex items-start gap-3">
            <CheckCircle2 aria-hidden="true" className="mt-0.5 text-success" size={18} />
            <div>
              <h2 className="text-sm font-semibold">Workflow result</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{workflowResult}</p>
            </div>
          </div>
        </section>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <DataTable columns={columns} emptyLabel="No workflows found" rows={workflows} searchLabel="Search workflows" title="Approval workflows" />
        <aside className="rounded-lg border bg-panel p-4 shadow-line">
          <div className="mb-4 flex items-center gap-2">
            <GitPullRequestArrow aria-hidden="true" className="text-primary" size={18} />
            <div>
              <h2 className="text-sm font-semibold">Selected workflow</h2>
              <p className="mt-1 text-xs text-muted-foreground">Review the rule before it affects field data.</p>
            </div>
          </div>
          {selectedWorkflow ? (
            <div className="space-y-3">
              <div className="rounded-md border bg-background p-3">
                <p className="text-xs text-muted-foreground">Rule name</p>
                <p className="mt-1 text-sm font-semibold">{selectedWorkflow.name}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-md border bg-background p-3">
                  <p className="text-xs text-muted-foreground">Owner</p>
                  <p className="mt-1 font-medium">{selectedWorkflow.owner}</p>
                </div>
                <div className="rounded-md border bg-background p-3">
                  <p className="text-xs text-muted-foreground">Target time</p>
                  <p className="mt-1 font-medium">{selectedWorkflow.sla}</p>
                </div>
              </div>
              <div className="rounded-md border bg-background p-3">
                <p className="text-xs text-muted-foreground">When this rule runs</p>
                <p className="mt-1 text-sm leading-6">
                  Submissions matching this workflow are routed to {selectedWorkflow.owner.toLowerCase()} until the queue is cleared.
                </p>
              </div>
              <Button
                className="w-full"
                onClick={markSelectedReady}
                type="button"
                variant="secondary"
              >
                <CheckCircle2 aria-hidden="true" />
                Mark ready to test
              </Button>
            </div>
          ) : null}
        </aside>
      </div>

      {isPreview ? (
        <ActivityTimeline />
      ) : workflows.length ? null : (
        <section className="rounded-lg border bg-panel p-4 shadow-line">
          <h2 className="text-sm font-semibold">No approval activity yet</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            This organization has no live approval queues or workflow events yet. Create a workflow, connect it to forms, and collect submissions before review activity appears here.
          </p>
        </section>
      )}

      <section className="rounded-lg border bg-panel p-4" aria-labelledby="approval-path-title">
        <h2 id="approval-path-title" className="text-sm font-semibold">
          Approval path
        </h2>
        <div className="mt-4 grid gap-2 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-center">
          {["Collected in the field", "Data quality check", "Supervisor approval"].map((step, index) => (
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
