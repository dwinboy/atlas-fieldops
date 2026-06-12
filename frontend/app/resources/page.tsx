import type { Metadata } from "next";

import { CTASection, SimplePageHero } from "@/components/marketing/MarketingBlocks";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { resourceCards } from "@/lib/marketing/content";
import { marketingMetadata } from "@/lib/marketing/seo";

export const metadata: Metadata = marketingMetadata({
  title: "Resources",
  description: "Guides, templates, whitepapers, best practices, videos, and downloads for monitoring and evaluation, data collection, GIS mapping, data quality, and reporting teams.",
  path: "/resources",
});

export default function ResourcesPage() {
  return (
    <MarketingShell>
      <main>
        <SimplePageHero
          eyebrow="Resources"
          title="Practical resources for better field operations"
          text="Use guides, templates, and checklists to design stronger data collection, entity management, and reporting workflows."
        />
        <section className="mx-auto grid max-w-7xl gap-5 px-4 pb-20 sm:px-6 md:grid-cols-3 lg:px-8">
          {resourceCards.map((resource) => (
            <article className="rounded-xl border border-black/10 bg-white p-6 shadow-sm" key={resource.title}>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0d9488]">{resource.type}</p>
              <h2 className="mt-3 text-xl font-semibold">{resource.title}</h2>
              <p className="mt-2 text-sm leading-6 text-[#5b6a65]">{resource.text}</p>
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-[#5b6a65]">{resource.category}</p>
            </article>
          ))}
        </section>
        <CTASection />
      </main>
    </MarketingShell>
  );
}
