import type { Metadata } from "next";

import { ArchitectureGraphic, CTASection, DataUseGraphic, OperatingFlowGraphic, SimplePageHero } from "@/components/marketing/MarketingBlocks";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { marketingMetadata } from "@/lib/marketing/seo";

export const metadata: Metadata = marketingMetadata({
  title: "How It Works",
  description: "How Atlas FieldOps connects sector setup, form building, offline mobile collection, approval workflows, data quality, KPI tracking, and reporting.",
  path: "/how-it-works",
});

export default function HowItWorksPage() {
  return (
    <MarketingShell>
      <main>
        <SimplePageHero
          eyebrow="Platform"
          title="From sector setup to trusted reports"
          text="Atlas FieldOps turns operational work into a connected data flow: configure the project context, build mobile-ready forms, collect offline, approve evidence, clean data, and report with confidence."
        />
        <OperatingFlowGraphic />
        <ArchitectureGraphic />
        <DataUseGraphic />
        <CTASection />
      </main>
    </MarketingShell>
  );
}
