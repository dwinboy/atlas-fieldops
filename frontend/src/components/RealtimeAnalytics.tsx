import { RadioTower } from "lucide-react";

import { analyticsSeries } from "@/lib/mockData";

export function RealtimeAnalytics() {
  const max = Math.max(...analyticsSeries.map((point) => point.submissions));

  return (
    <section aria-labelledby="analytics-title" className="space-y-6">
      <div>
        <h1 id="analytics-title" className="text-2xl font-semibold">
          Realtime analytics
        </h1>
        <p className="mt-1 text-sm text-slate-600">Live submission flow, validation progress, and operational lag.</p>
      </div>

      <section className="rounded border border-slate-200 bg-white p-5" aria-labelledby="stream-title">
        <div className="flex items-center gap-2">
          <RadioTower aria-hidden="true" className="text-teal-700" size={18} />
          <h2 id="stream-title" className="text-base font-semibold">
            Ingestion stream
          </h2>
        </div>
        <div className="mt-6 space-y-4">
          {analyticsSeries.map((point) => (
            <div key={point.label} className="grid gap-2 sm:grid-cols-[72px_1fr_96px] sm:items-center">
              <span className="text-sm text-slate-600">{point.label}</span>
              <div className="h-9 rounded bg-slate-100">
                <div
                  aria-label={`${point.submissions} submissions, ${point.validated} validated`}
                  className="h-9 rounded bg-teal-700"
                  role="img"
                  style={{ width: `${Math.max(8, (point.submissions / max) * 100)}%` }}
                />
              </div>
              <span className="text-sm font-medium">{point.submissions.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          ["P95 API latency", "182 ms"],
          ["Validation accuracy", "96.8%"],
          ["Kafka consumer lag", "1,245"]
        ].map(([label, value]) => (
          <article key={label} className="rounded border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-600">{label}</p>
            <p className="mt-3 text-2xl font-semibold">{value}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

