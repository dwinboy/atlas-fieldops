import type { Metadata } from "next";
import Image from "next/image";

import { ArchitectureGraphic, CTASection, DataUseGraphic, OperatingFlowGraphic, SectionIntro, SimplePageHero } from "@/components/marketing/MarketingBlocks";
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
        <section className="py-16">
          <SectionIntro
            eyebrow="Workflow"
            title="From Create Form to Approval"
            text="Every record follows the same governed path: build the form, assign a field officer, collect offline, route to supervisor review, and finalize with an approval."
          />
          <div className="mx-auto mt-12 max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-[0_10px_40px_-12px_rgba(0,82,50,0.18)]">
              <Image
                alt="Atlas FieldOps workflow process: Create Form, Assign Officer, Collect Data, Supervisor Review, and Approval"
                className="h-auto w-full rounded-xl"
                width={1376}
                height={768}
                sizes="(max-width: 1024px) 100vw, 960px"
                src="/marketing/how-it-works-workflow.png"
              />
            </div>
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
