import type { Metadata } from "next";

import { CTASection, IndustryGrid, SectionIntro, SimplePageHero } from "@/components/marketing/MarketingBlocks";
import { MarketingShell } from "@/components/marketing/MarketingShell";

export const metadata: Metadata = {
  title: "Solutions for NGOs, Governments, Agriculture, Health & Humanitarian Teams",
  description: "Industry solutions for agriculture monitoring, health outreach, NGO programs, government delivery, humanitarian response, and education programs."
};

const solutions = [
  ["Agriculture", "Farmer registration, farm mapping, crop monitoring, input distribution, yield assessment, and extension visits."],
  ["Health", "Patient registration, vaccination tracking, nutrition screening, facility inspection, and community outreach."],
  ["NGOs", "Beneficiary management, program monitoring, donor reports, field officer performance, and case follow-ups."],
  ["Governments", "Public service monitoring, regional delivery, citizen feedback, infrastructure inspection, and executive dashboards."],
  ["Humanitarian organizations", "Needs assessments, food distribution, cash transfers, protection cases, and complaint workflows."],
  ["Education programs", "School inspections, attendance tracking, feeding monitoring, teacher evaluation, and infrastructure checks."]
];

export default function SolutionsPage() {
  return (
    <MarketingShell>
      <main>
        <SimplePageHero
          eyebrow="Solutions"
          title="Purpose-built workflows for complex field programs"
          text="Support sector-specific operations while keeping one shared platform for data quality, approvals, maps, analytics, and reporting."
        />
        <IndustryGrid />
        <section className="py-20">
          <SectionIntro eyebrow="Industries" title="Operational value by sector" text="Every solution connects field activity to program decisions and reporting." />
          <div className="mx-auto mt-12 grid max-w-7xl gap-4 px-4 sm:px-6 md:grid-cols-2 lg:grid-cols-3 lg:px-8">
            {solutions.map(([title, text]) => (
              <article className="rounded-xl border border-black/10 bg-white p-6 shadow-sm" key={title}>
                <h2 className="text-lg font-semibold">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-[#52615d]">{text}</p>
              </article>
            ))}
          </div>
        </section>
        <CTASection />
      </main>
    </MarketingShell>
  );
}
