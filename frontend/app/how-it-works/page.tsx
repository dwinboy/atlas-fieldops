import type { Metadata } from "next";

import { CTASection, SimplePageHero } from "@/components/marketing/MarketingBlocks";
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
        <section className="px-4 pb-20 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-3">
            {[
              ["1. Configure the project", "Choose a sector pack or custom setup for agriculture, health, education, retail, logistics, audits, inspections, HR, or any operational context."],
              ["2. Build the instrument", "Create surveys, inspections, delivery confirmations, stock counts, training records, audits, or mobile checklists with validation and governance."],
              ["3. Assign field work", "Publish approved forms to the right field officers, supervisors, teams, locations, entities, stores, facilities, routes, or assets."],
              ["4. Collect online or offline", "The Android mobile app stores assigned forms, drafts, GPS, media, and sync queues so field teams can work in low-connectivity areas."],
              ["5. Review and clean", "Submitted data enters approval queues, data quality checks, duplicate review, GPS validation, and spreadsheet-style cleaning before it becomes official."],
              ["6. Report and act", "Approved data feeds dashboards, KPI tracking, maps, exports, client reports, donor reports, operational reviews, and supervisor action queues."],
            ].map(([title, text]) => (
              <article className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm" key={title}>
                <h2 className="text-lg font-semibold text-[#0c1f1b]">{title}</h2>
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
