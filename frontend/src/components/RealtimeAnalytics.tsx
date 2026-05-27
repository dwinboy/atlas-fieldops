import { ArrowUpRight, RadioTower, Waves } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusDot } from "@/components/ui/status-dot";
import { analyticsSeries } from "@/lib/mockData";

export function RealtimeAnalytics() {
  const max = Math.max(...analyticsSeries.map((point) => point.submissions));

  return (
    <section aria-labelledby="analytics-title" className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Reports</p>
          <h1 id="analytics-title" className="mt-2 text-2xl font-semibold tracking-tight">
            Field progress reports
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            Track submission progress, data quality, and field activity as teams work.
          </p>
        </div>
        <Button>
          Explore data
          <ArrowUpRight aria-hidden="true" />
        </Button>
      </div>

      <section className="rounded-lg border bg-panel p-4" aria-labelledby="stream-title">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <RadioTower aria-hidden="true" className="text-primary" size={18} />
            <div>
              <h2 id="stream-title" className="text-sm font-semibold">
                Submissions over time
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">Submissions received every two hours</p>
            </div>
          </div>
          <Badge tone="success" className="gap-1.5">
            <StatusDot tone="online" />
            Healthy
          </Badge>
        </div>
        <div className="mt-6 space-y-4">
          {analyticsSeries.map((point) => (
            <div key={point.label} className="grid gap-2 sm:grid-cols-[72px_1fr_96px] sm:items-center">
              <span className="text-sm text-muted-foreground">{point.label}</span>
              <div className="h-8 rounded-md bg-muted">
                <div
                  aria-label={`${point.submissions} submissions, ${point.validated} validated`}
                  className="h-8 rounded-md bg-primary transition-all"
                  role="img"
                  style={{ width: `${Math.max(8, (point.submissions / max) * 100)}%` }}
                />
              </div>
              <span className="text-sm font-medium tabular-nums">{point.submissions.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-3 md:grid-cols-3">
        {[
          ["App response", "182 ms"],
          ["Clean submissions", "96.8%"],
          ["Waiting to process", "1,245"]
        ].map(([label, value]) => (
          <article key={label} className="rounded-lg border bg-panel p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{label}</p>
              <Waves aria-hidden="true" className="text-muted-foreground" size={16} />
            </div>
            <p className="mt-3 text-2xl font-semibold tracking-tight">{value}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
