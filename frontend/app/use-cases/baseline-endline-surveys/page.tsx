import type { Metadata } from "next";

import { CTASection, SimplePageHero } from "@/components/marketing/MarketingBlocks";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { marketingMetadata } from "@/lib/marketing/seo";

export const metadata: Metadata = marketingMetadata({
  title: "Baseline & Endline Surveys",
  description: "Measure change with comparable data collected before and after implementation.",
  path: "/use-cases/baseline-endline-surveys",
});

export default function BaselineEndlineSurveysPage() {
  return (
    <MarketingShell>
      <main>
        <SimplePageHero
          eyebrow="Use Cases"
          title="Baseline and endline surveys that stay comparable"
          text="Create versioned instruments, collect clean baseline values, return later with matching endline questions, and compare approved data across locations, entities, groups, or cohorts."
        />
        <section className="px-4 pb-20 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-3">
            {[
              ["Version-safe forms", "Build baseline and endline instruments with stable variable names, data dictionaries, validation rules, and controlled options."],
              ["Entity continuity", "Link responses to the same farmers, households, schools, facilities, stores, assets, or participants instead of double counting records."],
              ["Analysis-ready data", "Approved submissions become clean datasets for change analysis, KPI progress, exports, dashboards, and final reports."],
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
