import { getHealth } from "@/lib/api";

export default async function DashboardPage() {
  let status = "unavailable";
  try {
    const health = await getHealth();
    status = health.status;
  } catch {
    status = "offline";
  }

  return (
    <main className="min-h-screen px-6 py-8">
      <section className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal">Data Operations</h1>
            <p className="mt-1 text-sm text-slate-600">Tenant collection, validation, and analytics workspace</p>
          </div>
          <span className="rounded border border-slate-300 px-3 py-1 text-sm">API {status}</span>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["Submissions", "0", "Awaiting ingestion"],
            ["Validation Queue", "0", "OCR and review"],
            ["Active Tenants", "0", "Provisioned organizations"]
          ].map(([label, value, detail]) => (
            <article key={label} className="rounded border border-slate-200 bg-white p-5">
              <p className="text-sm text-slate-600">{label}</p>
              <p className="mt-3 text-3xl font-semibold">{value}</p>
              <p className="mt-2 text-sm text-slate-500">{detail}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

