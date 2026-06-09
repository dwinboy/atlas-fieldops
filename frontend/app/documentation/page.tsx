import type { Metadata } from "next";

import { CTASection, SimplePageHero } from "@/components/marketing/MarketingBlocks";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { documentationCategories } from "@/lib/marketing/content";
import { marketingMetadata } from "@/lib/marketing/seo";

export const metadata: Metadata = marketingMetadata({
  title: "Product Documentation",
  description: "Atlas FieldOps documentation for getting started, projects, forms, field operations, submissions, mapping, indicators, reports, data quality, governance, administration, and API workflows.",
  path: "/documentation",
});

export default function DocumentationPage() {
  return (
    <MarketingShell>
      <main>
        <SimplePageHero eyebrow="Documentation" title="Product documentation for M&E and field operations teams" text="A CMS-ready documentation hub for administrators, M&E managers, data managers, supervisors, and technical teams." />
        <section className="mx-auto grid max-w-7xl gap-4 px-4 pb-20 sm:px-6 md:grid-cols-2 lg:grid-cols-3 lg:px-8">
          {documentationCategories.map((category) => (
            <article className="rounded-xl border border-black/10 bg-white p-6 shadow-sm" key={category.name}>
              <h2 className="text-lg font-semibold">{category.name}</h2>
              <p className="mt-2 text-sm leading-6 text-[#52615d]">{category.description}</p>
              <ul className="mt-4 space-y-1.5">
                {category.topics.map((topic) => (
                  <li className="flex items-center gap-2 text-xs text-[#52615d]" key={topic}>
                    <span className="h-1 w-1 rounded-full bg-[#0f766e]" />
                    {topic}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </section>
        <CTASection />
      </main>
    </MarketingShell>
  );
}
