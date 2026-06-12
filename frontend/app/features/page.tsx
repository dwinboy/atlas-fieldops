import type { Metadata } from "next";

import { CTASection, FeatureGrid, SectionIntro, SimplePageHero, WorkflowShowcase } from "@/components/marketing/MarketingBlocks";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { pageFeatureIcons, platformFeatures } from "@/lib/marketing/content";
import { marketingMetadata } from "@/lib/marketing/seo";

export const metadata: Metadata = marketingMetadata({
  title: "Features",
  description: "Explore project management, form builder, offline data collection, field operations, submissions, GIS mapping, indicators, reports, data quality, governance, and administration.",
  path: "/features",
});

export default function FeaturesPage() {
  return (
    <MarketingShell>
      <main>
        <SimplePageHero
          eyebrow="Features"
          title="A complete operating system for field data and M&E teams"
          text="Atlas FieldOps connects every feature to the operational workflow: forms, entities, field teams, approvals, maps, indicators, analytics, and reports."
        />
        <FeatureGrid />
        <section className="bg-white py-20">
          <SectionIntro eyebrow="Capability map" title="Everything connects to trusted decisions" text="Each capability is designed to feed operations, quality control, reporting, and action." />
          <div className="mx-auto mt-12 grid max-w-7xl gap-4 px-4 sm:px-6 lg:grid-cols-3 lg:px-8">
            {["Advanced form builder", "Offline mobile sync", "Approval automation", "Geospatial intelligence", "AI data quality", "Donor reporting"].map((item, index) => {
              const Icon = pageFeatureIcons[index];
              return (
                <article className="rounded-xl border border-black/10 bg-[#fafaf8] p-6" key={item}>
                  <Icon className="text-[#0d9488]" size={22} />
                  <h2 className="mt-4 text-lg font-semibold">{item}</h2>
                  <p className="mt-2 text-sm leading-6 text-[#5b6a65]">{platformFeatures[index % platformFeatures.length].text}</p>
                </article>
              );
            })}
          </div>
        </section>
        <WorkflowShowcase />
        <CTASection />
      </main>
    </MarketingShell>
  );
}
