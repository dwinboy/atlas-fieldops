import { Activity, AlertTriangle, ArrowUpRight, CheckCircle2, Clock, Gauge } from "lucide-react";

import { ActivityTimeline } from "@/components/ActivityTimeline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusDot } from "@/components/ui/status-dot";
import { dashboardMetrics } from "@/lib/mockData";
import { cn } from "@/lib/utils";

const icons = [Activity, Clock, CheckCircle2, AlertTriangle];

export function Dashboard() {
  return (
    <section aria-labelledby="dashboard-title" className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Operations</p>
          <h1 id="dashboard-title" className="mt-2 text-2xl font-semibold tracking-tight">
            Live command center
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            Realtime operational posture across ingestion, validation, field sync, and tenant activity.
          </p>
        </div>
        <Button variant="primary">
          Executive report
          <ArrowUpRight aria-hidden="true" />
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {dashboardMetrics.map((metric, index) => {
          const Icon = icons[index] ?? Activity;
          return (
            <article key={metric.label} className="rounded-lg border bg-panel p-4 shadow-line transition-colors hover:bg-muted/20">
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
        <section className="rounded-lg border bg-panel p-4" aria-labelledby="throughput-title">
          <div className="flex items-center justify-between">
            <div>
              <h2 id="throughput-title" className="text-sm font-semibold">
                Throughput
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">Submissions accepted and validated</p>
            </div>
            <Badge tone="accent" className="gap-1.5">
              <StatusDot tone="syncing" />
              Streaming
            </Badge>
          </div>
          <div className="mt-5 grid h-64 grid-cols-12 items-end gap-2">
            {[38, 45, 51, 58, 64, 72, 78, 82, 76, 88, 92, 96].map((height, index) => (
              <div key={index} className="flex h-full items-end">
                <div
                  className="w-full rounded-t-md bg-primary/85 transition-all hover:bg-primary"
                  style={{ height: `${height}%` }}
                  aria-label={`${height}% throughput`}
                  role="img"
                />
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-3 border-t pt-4 sm:grid-cols-3">
            {[
              ["P95 latency", "182 ms"],
              ["Validation accuracy", "96.8%"],
              ["Queue drain", "4.2 min"]
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
        <section className="rounded-lg border bg-panel p-4" aria-labelledby="work-queue-title">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="work-queue-title" className="text-sm font-semibold">
              Work queue
            </h2>
            <Button size="sm" variant="ghost">
              Triage
              <ArrowUpRight aria-hidden="true" />
            </Button>
          </div>
          <div className="divide-y">
            {([
              ["OCR confidence below threshold", "1,216 records", "2h SLA", "warning" as const],
              ["Duplicate identity candidate", "128 records", "45m SLA", "danger" as const],
              ["Supervisor approval required", "74 records", "4h SLA", "neutral" as const]
            ] as const).map(([item, count, sla, tone]) => (
              <div key={item} className="grid grid-cols-[1fr_auto] gap-4 py-3 text-sm">
                <div>
                  <p className="font-medium">{item}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{count}</p>
                </div>
                <Badge tone={tone}>{sla}</Badge>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border bg-panel p-4" aria-labelledby="sync-title">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 id="sync-title" className="text-sm font-semibold">
                Offline sync
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">Mobile edge reliability</p>
            </div>
            <Gauge aria-hidden="true" className="text-muted-foreground" size={17} />
          </div>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-md border bg-background p-3">
              <dt className="text-muted-foreground">Pending</dt>
              <dd className="mt-2 text-xl font-semibold">812</dd>
              <Skeleton className="mt-3 h-1.5 w-4/5" />
            </div>
            <div className="rounded-md border bg-background p-3">
              <dt className="text-muted-foreground">Failed</dt>
              <dd className="mt-2 text-xl font-semibold">37</dd>
              <Skeleton className="mt-3 h-1.5 w-1/3" />
            </div>
          </dl>
        </section>
      </div>
    </section>
  );
}
