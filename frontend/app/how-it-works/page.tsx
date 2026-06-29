import type { Metadata } from "next";

import { ArchitectureGraphic, CTASection, DataUseGraphic, OperatingFlowGraphic, SectionIntro, SimplePageHero } from "@/components/marketing/MarketingBlocks";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { WorkflowProcess } from "@/components/marketing/illustrations";
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
        <section className="py-16">
          <SectionIntro
            eyebrow="Workflow"
            title="From Create Form to Approval"
            text="Every record follows the same governed path: build the form, assign a field officer, collect offline, route to supervisor review, and finalize with an approval."
          />
          <div className="mx-auto mt-12 max-w-5xl px-4 sm:px-6 lg:px-8">
            <WorkflowProcess />
          </div>
        </section>
        <OperatingFlowGraphic />
        <ArchitectureGraphic />
        <DataUseGraphic />
        <CTASection />
      </main>
    </MarketingShell>
  );
}
