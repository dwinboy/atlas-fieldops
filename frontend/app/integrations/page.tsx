import type { Metadata } from "next";

import { CTASection, SimplePageHero } from "@/components/marketing/MarketingBlocks";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { marketingMetadata } from "@/lib/marketing/seo";

export const metadata: Metadata = marketingMetadata({
  title: "Integrations",
  description: "Connect Atlas FieldOps to analytics, storage, reporting, identity, GIS, mobile workflows, and operational systems through integration-ready data architecture.",
  path: "/integrations",
});

export default function IntegrationsPage() {
  return (
    <MarketingShell>
      <main>
        <SimplePageHero
          eyebrow="Platform"
          title="Integration-ready field operations data"
          text="Atlas FieldOps is designed to move clean, approved field data into the systems your organization already trusts: BI tools, data warehouses, GIS platforms, CRM systems, reporting workflows, and operational dashboards."
        />
        <section className="px-4 pb-20 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[
              ["Data exports", "Export approved submissions, entities, KPI results, data quality issues, and project records with permissioned, logged access."],
              ["API-ready architecture", "Public APIs are versioned under /api/v1 so integrations can safely consume projects, forms, submissions, reports, and operational data."],
              ["BI and analytics", "Prepare clean datasets for Power BI, Tableau, Looker, spreadsheets, and internal analytics pipelines."],
              ["GIS and mapping", "Use GPS evidence, boundaries, route checks, field locations, facilities, stores, assets, and coverage layers in mapping workflows."],
              ["Mobile sync", "The Android app synchronizes assignments, forms, entities, drafts, submissions, media, device status, and activity logs."],
              ["Governed connections", "Integration activity belongs in Administration with permissions, audit logs, export governance, and future webhook controls."],
            ].map(([title, text]) => (
              <article className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm" key={title}>
                <h2 className="text-lg font-semibold text-[#0c1f1b]">{title}</h2>
                <p className="mt-3 text-sm leading-6 text-[#5b6a65]">{text}</p>
              </article>
            ))}
          </div>
        </section>
        <CTASection />
      </main>
    </MarketingShell>
  );
}
