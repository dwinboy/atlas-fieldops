import { ArrowUpRight, BarChart3, CheckCircle2, RadioTower, Waves } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusDot } from "@/components/ui/status-dot";
import { analyticsSeries } from "@/lib/mockData";

export function RealtimeAnalytics() {
  const [showExplorer, setShowExplorer] = useState(false);
  const [analyticsResult, setAnalyticsResult] = useState("");
  const max = Math.max(...analyticsSeries.map((point) => point.submissions));
  const totalSubmissions = analyticsSeries.reduce((total, point) => total + point.submissions, 0);
  const totalValidated = analyticsSeries.reduce((total, point) => total + point.validated, 0);
  const validationRate = Math.round((totalValidated / totalSubmissions) * 1000) / 10;
  const busiestWindow = analyticsSeries.reduce((highest, point) => (point.submissions > highest.submissions ? point : highest), analyticsSeries[0]);

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
        <Button
          aria-expanded={showExplorer}
          aria-controls="analytics-explorer"
          onClick={() => {
            setShowExplorer((current) => !current);
            setAnalyticsResult(
              "Data explorer opened. Use the totals, validation rate, and peak activity window to explain what changed before exporting donor or management reports."
            );
          }}
        >
          Explore data
          <ArrowUpRight aria-hidden="true" />
        </Button>
      </div>

      {analyticsResult ? (
        <section className="rounded-lg border border-success/30 bg-success/10 p-4" aria-live="polite">
          <div className="flex items-start gap-3">
            <CheckCircle2 aria-hidden="true" className="mt-0.5 text-success" size={18} />
            <div>
              <h2 className="text-sm font-semibold">Analytics result</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{analyticsResult}</p>
            </div>
          </div>
        </section>
      ) : null}

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
            <button
              key={point.label}
              className="grid gap-2 rounded-md p-2 text-left transition hover:bg-primary/5 sm:grid-cols-[72px_1fr_96px] sm:items-center"
              onClick={() =>
                setAnalyticsResult(
                  `${point.label}: ${point.submissions.toLocaleString()} submissions received and ${point.validated.toLocaleString()} validated. Review this window if validation is lower than expected or if field activity does not match the work plan.`
                )
              }
              type="button"
            >
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
            </button>
          ))}
        </div>
      </section>

      <div className="grid gap-3 md:grid-cols-3">
        {[
          ["App response", "182 ms"],
          ["Clean submissions", `${validationRate}%`],
          ["Waiting to process", "1,245"]
        ].map(([label, value]) => (
          <button
            key={label}
            className="rounded-lg border bg-panel p-4 text-left transition hover:border-primary/30 hover:bg-primary/5"
            onClick={() =>
              setAnalyticsResult(
                `${label}: ${value}. Use this operational signal to decide whether reports are ready, whether queues need processing, or whether supervisors should review field activity.`
              )
            }
            type="button"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{label}</p>
              <Waves aria-hidden="true" className="text-muted-foreground" size={16} />
            </div>
            <p className="mt-3 text-2xl font-semibold tracking-tight">{value}</p>
          </button>
        ))}
      </div>

      {showExplorer ? (
        <section id="analytics-explorer" className="grid gap-4 rounded-lg border bg-panel p-4 lg:grid-cols-[1fr_320px]" aria-labelledby="analytics-explorer-title">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 aria-hidden="true" className="text-primary" size={18} />
              <h2 id="analytics-explorer-title" className="text-sm font-semibold">
                Data explorer
              </h2>
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Use this view to explain what changed during the day before exporting reports or sending tasks back to field teams.
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {[
                ["Total submissions", totalSubmissions.toLocaleString()],
                ["Validated records", totalValidated.toLocaleString()],
                ["Peak activity", busiestWindow.label]
              ].map(([label, value]) => (
                <div key={label} className="rounded-md border bg-background p-3">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
                  <p className="mt-2 text-lg font-semibold">{value}</p>
                </div>
              ))}
            </div>
          </div>
          <aside className="rounded-md border bg-background p-3">
            <h3 className="text-sm font-semibold">Recommended checks</h3>
            <div className="mt-3 space-y-3">
              {[
                "Review low-validation time windows before approving reports.",
                "Compare peak collection periods with supervisor schedules.",
                "Export the clean dataset after the waiting queue is processed."
              ].map((item) => (
                <div key={item} className="flex gap-2 text-sm leading-6">
                  <CheckCircle2 aria-hidden="true" className="mt-0.5 shrink-0 text-success" size={16} />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </aside>
        </section>
      ) : null}
    </section>
  );
}
