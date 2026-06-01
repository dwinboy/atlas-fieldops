import { Activity, AlertTriangle, ArrowUpRight, CheckCircle2, Clock, FileText, Gauge, HelpCircle, Plus, ShieldCheck, UploadCloud, UserPlus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { ActivityTimeline } from "@/components/ActivityTimeline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusDot } from "@/components/ui/status-dot";
import { dashboardMetrics } from "@/lib/mockData";
import { getOperationsSummary } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useWorkspaceStore, type WorkspaceView } from "@/stores/workspace";

const icons = [Activity, Clock, CheckCircle2, AlertTriangle];

type DashboardProps = {
  token: string | null;
};

export function Dashboard({ token }: DashboardProps) {
  const [dashboardResult, setDashboardResult] = useState("");
  const setActiveView = useWorkspaceStore((state) => state.setActiveView);
  const setLastActionResult = useWorkspaceStore((state) => state.setLastActionResult);
  const pushToast = useWorkspaceStore((state) => state.pushToast);
  const summaryQuery = useQuery({
    queryKey: ["operations-summary", token],
    queryFn: () => getOperationsSummary(token ?? ""),
    enabled: Boolean(token && token !== "preview-token")
  });
  const summaryMetrics = summaryQuery.data
    ? [
        { label: "Beneficiaries", value: summaryQuery.data.beneficiaries.toLocaleString(), delta: "live", tone: "good" as const },
        { label: "Active programs", value: summaryQuery.data.active_programs.toLocaleString(), delta: "live", tone: "good" as const },
        { label: "Indicators", value: summaryQuery.data.indicators.toLocaleString(), delta: "live", tone: "good" as const },
        { label: "Open cases", value: summaryQuery.data.open_cases.toLocaleString(), delta: "needs review", tone: summaryQuery.data.open_cases ? "warn" as const : "good" as const }
      ]
    : dashboardMetrics;
  const quickActions: { label: string; hint: string; result: string; view: WorkspaceView; icon: typeof Plus }[] = [
    { label: "Create form", hint: "Start from a template or blank form", result: "Opening templates. Pick a proven form, then customize labels, rules, and offline behavior before publishing.", view: "templates", icon: Plus },
    { label: "Review submissions", hint: "Approve, reject, or request corrections", result: "Opening the review queue. Start with submissions under review, add a reviewer comment, then approve or request corrections.", view: "submissions", icon: ShieldCheck },
    { label: "Invite officer", hint: "Add someone to the field team", result: "Opening field teams. Invite an officer, assign their region, and check sync/device status after they start collecting.", view: "officers", icon: UserPlus },
    { label: "Import data", hint: "Upload spreadsheets and fix issues", result: "Opening data tools. Upload a file, save mappings, fix validation issues, and apply clean records to the registry.", view: "data", icon: UploadCloud },
    { label: "Read help guide", hint: "Learn how to use the platform", result: "Opening the help guide. Use the beginner walkthroughs to understand forms, collection, review, data, reports, and admin workflows.", view: "help", icon: HelpCircle }
  ];

  function openView(action: { label: string; result: string; view: WorkspaceView }): void {
    setDashboardResult(action.result);
    setLastActionResult(action.result);
    pushToast({ title: action.label, description: action.result, tone: "success" });
    setActiveView(action.view);
  }

  function handleAttention(item: string, view: WorkspaceView, result: string): void {
    setDashboardResult(result);
    setLastActionResult(result);
    pushToast({ title: item, description: result, tone: "warning" });
    setActiveView(view);
  }

  return (
    <section aria-labelledby="dashboard-title" className="space-y-6">
      <div className="surface-premium rounded-2xl p-5 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Today</p>
            <h1 id="dashboard-title" className="mt-2 text-3xl font-semibold tracking-tight">
              What needs attention now
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
              A simple daily view for pending reviews, offline sync, data quality, and field team activity.
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() =>
              handleAttention(
                "Review queue",
                "submissions",
                "Opening the review queue so you can approve clean records, request corrections, or reject poor submissions."
              )
            }
            type="button"
          >
            Review queue
            <ArrowUpRight aria-hidden="true" />
          </Button>
        </div>
      </div>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5" aria-label="Quick actions">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.label}
              className="group rounded-2xl border bg-panel p-4 text-left shadow-line transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/5 hover:shadow-elevated"
              onClick={() => openView(action)}
              type="button"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl border bg-background text-primary shadow-sm">
                  <Icon aria-hidden="true" size={17} />
                </span>
                <span>
                  <span className="block text-sm font-semibold">{action.label}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{action.hint}</span>
                </span>
              </div>
            </button>
          );
        })}
      </section>

      {dashboardResult ? (
        <section className="rounded-2xl border border-success/30 bg-success/10 p-4" aria-live="polite">
          <div className="flex items-start gap-3">
            <CheckCircle2 aria-hidden="true" className="mt-0.5 text-success" size={18} />
            <div>
              <h2 className="text-sm font-semibold">Dashboard result</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{dashboardResult}</p>
            </div>
          </div>
        </section>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {summaryMetrics.map((metric, index) => {
          const Icon = icons[index] ?? Activity;
          return (
            <article key={metric.label} className="surface-premium rounded-2xl p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-elevated">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{metric.label}</p>
                <Icon aria-hidden="true" className="text-muted-foreground" size={17} />
              </div>
              <p className="mt-3 text-2xl font-semibold tracking-tight">{metric.value}</p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full",
                    metric.tone === "good" ? "bg-success" : metric.tone === "warn" ? "bg-warning" : "bg-muted-foreground"
                  )}
                  style={{ width: `${[84, 62, 74, 28][index] ?? 50}%` }}
                />
              </div>
              <div className="mt-3 flex items-center justify-between">
                <Badge tone={metric.tone === "good" ? "success" : metric.tone === "warn" ? "warning" : "neutral"}>
                  {metric.delta}
                </Badge>
                <span className="text-xs text-muted-foreground">vs previous window</span>
              </div>
            </article>
          );
        })}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <section className="surface-premium rounded-2xl p-5" aria-labelledby="throughput-title">
          <div className="flex items-center justify-between">
            <div>
              <h2 id="throughput-title" className="text-sm font-semibold">
                Submissions received
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">Saved submissions by time of day</p>
            </div>
            <Badge tone="accent" className="gap-1.5">
              <StatusDot tone="syncing" />
              Updating
            </Badge>
          </div>
          <div className="mt-5 grid h-64 grid-cols-12 items-end gap-2">
            {[38, 45, 51, 58, 64, 72, 78, 82, 76, 88, 92, 96].map((height, index) => (
              <div key={index} className="flex h-full items-end">
                <div
                  className="w-full rounded-t-lg bg-primary/85 transition-all hover:bg-primary"
                  style={{ height: `${height}%` }}
                  aria-label={`${height}% of today’s expected submissions`}
                  role="img"
                />
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-3 border-t pt-4 sm:grid-cols-3">
            {[
              ["App response", "182 ms"],
              ["Clean submissions", "96.8%"],
              ["Review wait", "4.2 min"]
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-1 text-sm font-semibold">{value}</p>
              </div>
            ))}
          </div>
        </section>
        <ActivityTimeline />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="surface-premium rounded-2xl p-5" aria-labelledby="work-queue-title">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="work-queue-title" className="text-sm font-semibold">
              Needs attention
            </h2>
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                handleAttention(
                  "Review",
                  "submissions",
                  "Opening submissions that need attention. Use reviewer notes so field teams understand every correction."
                )
              }
              type="button"
            >
              Review
              <ArrowUpRight aria-hidden="true" />
            </Button>
          </div>
          <div className="divide-y">
            {([
              ["Answers need a closer look", "1,216 submissions", "Open review queue", "warning" as const, "submissions" as WorkspaceView, "Opening submissions needing closer review. Check payload, GPS, evidence, and reviewer comments before approving."],
              ["Possible duplicate records", "128 submissions", "Check duplicates", "danger" as const, "data" as WorkspaceView, "Opening data tools so duplicate records can be checked, mapped, and resolved before registry updates."],
              ["Waiting for supervisor approval", "74 submissions", "Follow up today", "neutral" as const, "workflows" as WorkspaceView, "Opening approval rules so supervisor queues, escalation steps, and target review times can be checked."]
            ] as const).map(([item, count, sla, tone, view, result]) => (
              <button
                key={item}
                className="grid w-full grid-cols-[1fr_auto] gap-4 py-3 text-left text-sm transition hover:bg-muted/35"
                onClick={() => handleAttention(item, view, result)}
                type="button"
              >
                <div>
                  <p className="font-medium">{item}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{count}</p>
                </div>
                <Badge tone={tone}>{sla}</Badge>
              </button>
            ))}
          </div>
        </section>

        <section className="surface-premium rounded-2xl p-5" aria-labelledby="sync-title">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 id="sync-title" className="text-sm font-semibold">
                Offline data
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">Data saved on phones and waiting to upload</p>
            </div>
            <Gauge aria-hidden="true" className="text-muted-foreground" size={17} />
          </div>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border bg-background/80 p-3">
              <dt className="text-muted-foreground">Waiting to sync</dt>
              <dd className="mt-2 text-xl font-semibold">812</dd>
              <Skeleton className="mt-3 h-1.5 w-4/5" />
            </div>
            <div className="rounded-xl border bg-background/80 p-3">
              <dt className="text-muted-foreground">Need retry</dt>
              <dd className="mt-2 text-xl font-semibold">37</dd>
              <Skeleton className="mt-3 h-1.5 w-1/3" />
            </div>
          </dl>
          <div className="mt-4 rounded-xl border border-warning/25 bg-warning/10 p-3 text-sm">
            <div className="flex items-start gap-2">
              <FileText aria-hidden="true" className="mt-0.5 text-warning" size={16} />
              <p className="leading-6 text-muted-foreground">
                Data is saved locally on devices first. Failed uploads stay in the retry queue until connectivity improves.
              </p>
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}
