import type { Metadata } from "next";

import { CTASection, SimplePageHero } from "@/components/marketing/MarketingBlocks";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { resourceCards } from "@/lib/marketing/content";

export const metadata: Metadata = {
  title: "Resources",
  description: "Guides, checklists, templates, and implementation resources for M&E and field operations teams."
};

export default function ResourcesPage() {
  return (
    <MarketingShell>
      <main>
        <SimplePageHero
          eyebrow="Resources"
          title="Practical resources for better field operations"
          text="Use guides, templates, and checklists to design stronger data collection, beneficiary management, and reporting workflows."
        />
        <section className="mx-auto grid max-w-7xl gap-5 px-4 pb-20 sm:px-6 md:grid-cols-3 lg:px-8">
          {resourceCards.map((resource) => (
            <article className="rounded-xl border border-black/10 bg-white p-6 shadow-sm" key={resource.title}>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0f766e]">{resource.type}</p>
              <h2 className="mt-3 text-xl font-semibold">{resource.title}</h2>
              <p className="mt-2 text-sm leading-6 text-[#52615d]">{resource.text}</p>
            </article>
          ))}
        </section>
        <CTASection />
      </main>
    </MarketingShell>
  );
}
