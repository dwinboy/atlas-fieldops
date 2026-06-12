import type { Metadata } from "next";

import { CTASection, SimplePageHero } from "@/components/marketing/MarketingBlocks";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { caseStudies } from "@/lib/marketing/content";
import { marketingMetadata } from "@/lib/marketing/seo";

export const metadata: Metadata = marketingMetadata({
  title: "Case Studies",
  description: "Case studies showing how organizations use Atlas FieldOps for monitoring, evaluation, offline data collection, GIS mapping, entity tracking, and donor reporting.",
  path: "/case-studies",
});

export default function CaseStudiesPage() {
  return (
    <MarketingShell>
      <main>
        <SimplePageHero
          eyebrow="Case studies"
          title="Operational impact from connected workflows"
          text="Examples of how organizations can use connected data collection, approvals, maps, and reports to improve field programs."
        />
        <section className="mx-auto grid max-w-7xl gap-5 px-4 pb-20 sm:px-6 md:grid-cols-3 lg:px-8">
          {caseStudies.map((study) => (
            <article className="rounded-xl border border-black/10 bg-white p-6 shadow-sm" key={study.title}>
              <p className="text-3xl font-semibold text-[#0d9488]">{study.result}</p>
              <h2 className="mt-5 text-xl font-semibold">{study.title}</h2>
              <p className="mt-2 text-sm leading-6 text-[#5b6a65]">{study.text}</p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-[#5b6a65]">
                <span>{study.sector}</span>
                <span>·</span>
                <span>{study.country}</span>
                <span>·</span>
                <span>{study.organizationType}</span>
              </div>
            </article>
          ))}
        </section>
        <CTASection />
      </main>
    </MarketingShell>
  );
}
