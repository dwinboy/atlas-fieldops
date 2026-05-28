import type { Metadata } from "next";

import { CTASection, SimplePageHero } from "@/components/marketing/MarketingBlocks";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { caseStudies } from "@/lib/marketing/content";

export const metadata: Metadata = {
  title: "Case Studies",
  description: "Implementation stories and operational impact examples for NGO, agriculture, health, humanitarian, and government programs."
};

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
              <p className="text-3xl font-semibold text-[#0f766e]">{study.result}</p>
              <h2 className="mt-5 text-xl font-semibold">{study.title}</h2>
              <p className="mt-2 text-sm leading-6 text-[#52615d]">{study.text}</p>
            </article>
          ))}
        </section>
        <CTASection />
      </main>
    </MarketingShell>
  );
}
