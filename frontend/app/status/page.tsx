import type { Metadata } from "next";

import { SimplePageHero } from "@/components/marketing/MarketingBlocks";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { marketingMetadata } from "@/lib/marketing/seo";

export const metadata: Metadata = marketingMetadata({
  title: "System Status",
  description: "Atlas FieldOps public status page for API, database, integrations, mobile sync, background jobs, and incident transparency.",
  path: "/status",
});

const services = ["API", "Database", "Mobile sync", "Integrations", "Background jobs", "Email notifications"];

export default function StatusPage() {
  return (
    <MarketingShell>
      <main>
        <SimplePageHero eyebrow="Status" title="Platform transparency and service readiness" text="A public status architecture for uptime, incidents, integrations, and operational transparency." />
        <section className="mx-auto max-w-5xl px-4 pb-20 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4 border-b pb-4">
              <h2 className="text-xl font-semibold">Current status</h2>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">Operational</span>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {services.map((service) => (
                <div className="flex items-center justify-between rounded-lg border border-black/10 bg-[#f7faf8] p-4" key={service}>
                  <span className="font-medium">{service}</span>
                  <span className="text-sm font-semibold text-emerald-700">Healthy</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </MarketingShell>
  );
}
