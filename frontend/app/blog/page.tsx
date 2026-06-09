import type { Metadata } from "next";

import { CTASection, SimplePageHero } from "@/components/marketing/MarketingBlocks";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { blogPosts } from "@/lib/marketing/content";
import { marketingMetadata } from "@/lib/marketing/seo";

export const metadata: Metadata = marketingMetadata({
  title: "Blog",
  description: "Articles about monitoring and evaluation software, field data collection, GIS mapping, indicators, data quality, reporting, NGO management, government programs, and research methods.",
  path: "/blog",
});

export default function BlogPage() {
  return (
    <MarketingShell>
      <main>
        <SimplePageHero
          eyebrow="Blog"
          title="Ideas for connected M&E and field operations"
          text="Operational articles for teams improving data quality, offline workflows, geospatial monitoring, and reporting."
        />
        <section className="mx-auto grid max-w-7xl gap-5 px-4 pb-20 sm:px-6 md:grid-cols-3 lg:px-8">
          {blogPosts.map((post) => (
            <article className="rounded-xl border border-black/10 bg-white p-6 shadow-sm" key={post.title}>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0f766e]">{post.category}</p>
              <h2 className="mt-3 text-xl font-semibold">{post.title}</h2>
              <p className="mt-2 text-sm leading-6 text-[#52615d]">{post.excerpt}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {post.tags.map((tag) => <span className="rounded-full bg-[#0f766e]/10 px-2.5 py-1 text-xs font-semibold text-[#0f766e]" key={tag}>{tag}</span>)}
              </div>
            </article>
          ))}
        </section>
        <CTASection />
      </main>
    </MarketingShell>
  );
}
