import type { Metadata } from "next";

import {
  CTASection,
  DataUseGraphic,
  FeatureGrid,
  ModuleEcosystemGraphic,
  OperatingFlowGraphic,
  SectionIntro,
  SimplePageHero,
} from "@/components/marketing/MarketingBlocks";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { GisMapGraphic, PlatformArchitectureStack } from "@/components/marketing/illustrations";
import { pageFeatureIcons, platformFeatures } from "@/lib/marketing/content";
import { marketingMetadata } from "@/lib/marketing/seo";

export const metadata: Metadata = marketingMetadata({
  title: "Features for Field Data Collection, Operations, GIS, and Reporting",
  description: "Explore Atlas FieldOps features for project setup, sector packs, form builder, offline mobile data collection, assignments, submissions, GIS mapping, KPIs, reports, data quality, governance, and administration.",
  path: "/features",
});

export default function FeaturesPage() {
  return (
    <MarketingShell>
      <main>
        <SimplePageHero
          eyebrow="Features"
          title="A complete operating system for field data and operations teams"
          text="Atlas FieldOps connects every feature to the operational workflow: sector setup, forms, entities, field teams, approvals, maps, KPIs, analytics, reports, imports, and governance."
        />
        <FeatureGrid />
        <OperatingFlowGraphic />
        <ModuleEcosystemGraphic />
        <section className="bg-white py-20">
          <SectionIntro eyebrow="Capability map" title="Everything connects to trusted decisions" text="Each capability is designed to feed operations, quality control, reporting, and action." />
          <div className="mx-auto mt-12 grid max-w-7xl gap-4 px-4 sm:px-6 lg:grid-cols-3 lg:px-8">
            {["Advanced form builder", "Offline mobile sync", "Approval automation", "Geospatial intelligence", "AI data quality", "Governed reporting"].map((item, index) => {
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
        <section className="bg-white py-20">
          <SectionIntro
            eyebrow="Platform architecture"
            title="A layered stack from secure API to live intelligence"
            text="Security & API at the base, Projects & Forms in the middle, and Reports & Intelligence on top — submissions flow up through review into mapping and dashboards."
          />
          <div className="mx-auto mt-12 max-w-4xl px-4 sm:px-6 lg:px-8">
            <PlatformArchitectureStack />
          </div>
        </section>
        <section className="py-20">
          <SectionIntro
            eyebrow="GIS & mapping"
            title="See coverage, boundaries, and field activity on one map"
            text="Toggle farm boundaries, GPS points, village clusters, and satellite layers to turn spatial data into operational decisions."
          />
          <div className="mx-auto mt-12 max-w-4xl px-4 sm:px-6 lg:px-8">
            <GisMapGraphic />
          </div>
        </section>
        <DataUseGraphic />
        <CTASection />
      </main>
    </MarketingShell>
  );
}
