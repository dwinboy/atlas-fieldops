import type { Metadata } from "next";

import { CTASection, SimplePageHero } from "@/components/marketing/MarketingBlocks";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { marketingMetadata } from "@/lib/marketing/seo";

export const metadata: Metadata = marketingMetadata({
  title: "Monitoring & Evaluation",
  description: "Track activities, outputs, and outcomes against your results framework with Atlas FieldOps.",
  path: "/use-cases/monitoring-evaluation",
});

export default function MonitoringEvaluationPage() {
  return (
    <MarketingShell>
      <main>
        <SimplePageHero
          eyebrow="Use Cases"
          title="Monitoring and evaluation without disconnected spreadsheets"
          text="Plan projects, define indicators, collect field evidence, review submissions, monitor data quality, and report progress from one governed platform."
        />
        <section className="px-4 pb-20 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-3">
            {[
              ["Design the results flow", "Connect projects, forms, entities, indicators, targets, and reporting periods before field collection begins."],
              ["Collect trusted evidence", "Use offline mobile forms with GPS, media, validation, skip logic, reference data, and assigned field officers."],
              ["Approve before reporting", "Only approved submissions should feed official indicators, dashboards, donor reports, and management decisions."],
            ].map(([title, text]) => (
              <article className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm" key={title}>
                <h2 className="text-lg font-semibold">{title}</h2>
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
