import { Activity, AlertTriangle, CheckCircle2, Clock } from "lucide-react";

import { dashboardMetrics } from "@/lib/mockData";

const icons = [Activity, Clock, CheckCircle2, AlertTriangle];

export function Dashboard() {
  return (
    <section aria-labelledby="dashboard-title" className="space-y-6">
      <div>
        <h1 id="dashboard-title" className="text-2xl font-semibold">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-slate-600">Collection throughput, validation state, and field operations.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {dashboardMetrics.map((metric, index) => {
          const Icon = icons[index] ?? Activity;
          return (
            <article key={metric.label} className="rounded border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-600">{metric.label}</p>
                <Icon aria-hidden="true" className="text-slate-500" size={18} />
              </div>
              <p className="mt-4 text-3xl font-semibold">{metric.value}</p>
              <p className="mt-2 text-sm text-slate-500">{metric.delta} vs previous window</p>
            </article>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <section className="rounded border border-slate-200 bg-white p-5" aria-labelledby="work-queue-title">
          <h2 id="work-queue-title" className="text-base font-semibold">
            Validation work queue
          </h2>
          <div className="mt-4 divide-y divide-slate-100">
            {["OCR confidence below threshold", "Duplicate identity candidate", "Supervisor approval required"].map(
              (item, index) => (
                <div key={item} className="flex items-center justify-between py-3 text-sm">
                  <span>{item}</span>
                  <span className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-600">{index + 2}h SLA</span>
                </div>
              )
            )}
          </div>
        </section>

        <section className="rounded border border-slate-200 bg-white p-5" aria-labelledby="sync-title">
          <h2 id="sync-title" className="text-base font-semibold">
            Offline sync health
          </h2>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded border border-slate-200 p-3">
              <dt className="text-slate-500">Pending</dt>
              <dd className="mt-2 text-xl font-semibold">812</dd>
            </div>
            <div className="rounded border border-slate-200 p-3">
              <dt className="text-slate-500">Failed</dt>
              <dd className="mt-2 text-xl font-semibold">37</dd>
            </div>
          </dl>
        </section>
      </div>
    </section>
  );
}

