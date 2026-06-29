import type { Metadata } from "next";
import Link from "next/link";

import { CTASection, IndustryGrid, SectionIntro, SectorAdaptabilityShowcase, SimplePageHero } from "@/components/marketing/MarketingBlocks";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { solutionPages } from "@/lib/marketing/content";
import { marketingMetadata } from "@/lib/marketing/seo";

export const metadata: Metadata = marketingMetadata({
  title: "Solutions by Sector for Field Data Collection and Operations",
  description: "Sector-adaptive data collection software for NGOs, governments, agriculture, health, education, retail, inventory, logistics, manufacturing, audits, HR, research, and custom operations.",
  path: "/solutions",
});

export default function SolutionsPage() {
  return (
    <MarketingShell>
      <main>
        <SimplePageHero
          eyebrow="Solutions"
          title="Purpose-built workflows for every field operation"
          text="Support sector-specific operations while keeping one shared platform for form building, mobile collection, data quality, approvals, maps, analytics, reports, and governance."
        />
        <IndustryGrid />
        <SectorAdaptabilityShowcase />
        <section className="py-20">
          <SectionIntro eyebrow="Industries" title="Operational value by sector" text="Every solution connects field activity to program decisions and reporting." />
          <div className="mx-auto mt-12 grid max-w-7xl gap-4 px-4 sm:px-6 md:grid-cols-2 lg:grid-cols-3 lg:px-8">
            {solutionPages.map((solution) => (
              <Link className="rounded-xl border border-black/10 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg" href={`/solutions/${solution.slug}`} key={solution.slug}>
                <h2 className="text-lg font-semibold">{solution.audience}</h2>
                <p className="mt-2 text-sm leading-6 text-[#5b6a65]">{solution.description}</p>
              </Link>
            ))}
          </div>
        </section>
        <CTASection />
      </main>
    </MarketingShell>
  );
}
