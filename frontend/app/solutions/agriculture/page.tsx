import type { Metadata } from "next";

import { CTASection, DataUseGraphic, OperatingFlowGraphic, SimplePageHero } from "@/components/marketing/MarketingBlocks";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { AgricultureGraphic } from "@/components/marketing/illustrations";
import { marketingMetadata } from "@/lib/marketing/seo";

export const metadata: Metadata = marketingMetadata({
  title: "Agriculture",
  description: "Track farmer registration, yields, and input distribution in the field with offline forms and GIS mapping.",
  path: "/solutions/agriculture",
});

export default function AgricultureSolutionPage() {
  return (
    <MarketingShell>
      <main>
        <SimplePageHero
          eyebrow="Solutions"
          title="Agriculture data collection software for farmer programs"
          text="Register farmers, map farms, verify input distribution, monitor yields, track training, manage cooperatives, and report agriculture KPIs with offline mobile collection."
        />
        <div className="mx-auto mb-16 max-w-4xl px-4 sm:px-6 lg:px-8">
          <AgricultureGraphic />
        </div>
        <section className="px-4 pb-20 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-3">
            {[
              ["Farmer and farm registries", "Create unique farmer records, household links, farm locations, crop profiles, phone numbers, legacy IDs, and GPS evidence."],
              ["Input and training verification", "Use mobile forms for seed delivery, fertilizer distribution, training attendance, extension visits, and proof-of-service records."],
              ["Yield and results reporting", "Connect approved monitoring forms to dashboards, yield trends, seasonal reports, maps, and agriculture KPI tracking."],
            ].map(([title, text]) => (
              <article className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm" key={title}>
                <h2 className="text-lg font-semibold">{title}</h2>
                <p className="mt-3 text-sm leading-6 text-[#5b6a65]">{text}</p>
              </article>
            ))}
          </div>
        </section>
        <OperatingFlowGraphic />
        <DataUseGraphic />
        <CTASection />
      </main>
    </MarketingShell>
  );
}
