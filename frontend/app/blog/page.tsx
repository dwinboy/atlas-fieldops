import type { Metadata } from "next";
import Link from "next/link";

import { CTASection, SimplePageHero } from "@/components/marketing/MarketingBlocks";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { blogPosts, site } from "@/lib/marketing/content";
import { breadcrumbSchema, JsonLd, marketingMetadata } from "@/lib/marketing/seo";

export const metadata: Metadata = marketingMetadata({
  title: "Field Data Collection, M&E, GIS, and Operations Blog",
  description: "Practical articles about field data collection software, offline mobile forms, monitoring and evaluation, GIS mapping, indicators, data quality, reporting, entity tracking, and operational workflows.",
  path: "/blog",
});

const topicClusters = [
  ["Field data collection", "Offline forms, mobile sync, GPS evidence, media capture, and field officer readiness."],
  ["Monitoring and evaluation", "Indicators, baselines, targets, reporting periods, entity tracking, and results management."],
  ["Data quality and governance", "Approval queues, duplicate detection, correction workflows, audit logs, and safe reporting."],
  ["GIS and operational coverage", "Project boundaries, submission maps, GPS validation, coverage gaps, and supervisor visibility."],
];

const editorialPromise = [
  "Written for program managers, data managers, supervisors, and operations teams.",
  "Focused on practical field workflows, not generic software theory.",
  "Built around approved data, traceability, offline collection, and real management decisions.",
];

export default function BlogPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: `${site.name} Blog`,
    url: `${site.url}/blog`,
    description: metadata.description,
    blogPost: blogPosts.map((post) => ({
      "@type": "BlogPosting",
      headline: post.title,
      description: post.excerpt,
      keywords: post.tags.join(", "),
    })),
  };

  return (
    <MarketingShell>
      <JsonLd data={jsonLd} />
      <JsonLd data={breadcrumbSchema([{ name: "Home", url: site.url }, { name: "Blog", url: `${site.url}/blog` }])} />
      <main>
        <SimplePageHero
          eyebrow="Blog"
          title="Field data collection insights for serious operations teams"
          text="Practical articles for organizations improving offline data collection, M&E workflows, entity tracking, GIS visibility, data quality, approvals, and governed reporting."
        />
        <section className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
          <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <article className="rounded-3xl border border-black/10 bg-[#0c1f1b] p-8 text-white shadow-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5eead4]">Editor&apos;s focus</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight">How organizations move from raw field data to trusted decisions</h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/70">
                Atlas FieldOps articles explain the operational details that make data collection reliable: form design, offline sync, assigned work, review queues, entity linkage, GPS evidence, and reporting readiness.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {["Forms", "Quality", "Reports"].map((label) => (
                  <span className="rounded-xl border border-white/12 bg-white/[0.08] px-4 py-3 text-sm font-semibold" key={label}>{label}</span>
                ))}
              </div>
            </article>
            <aside className="rounded-3xl border border-black/10 bg-white p-8 shadow-sm">
              <h2 className="text-xl font-semibold text-[#0c1f1b]">What readers learn</h2>
              <ul className="mt-5 space-y-3">
                {editorialPromise.map((item) => (
                  <li className="rounded-xl bg-[#f3f8f6] p-4 text-sm leading-6 text-[#5b6a65]" key={item}>{item}</li>
                ))}
              </ul>
              <Link className="mt-6 inline-flex text-sm font-semibold text-[#0d9488] transition hover:text-[#0c1f1b]" href="/documentation">
                Read the product guide
              </Link>
            </aside>
          </div>
        </section>
        <section className="mx-auto grid max-w-7xl gap-5 px-4 pb-16 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
          {topicClusters.map(([title, text]) => (
            <article className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm" key={title}>
              <h2 className="text-base font-semibold text-[#0c1f1b]">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-[#5b6a65]">{text}</p>
            </article>
          ))}
        </section>
        <section className="mx-auto grid max-w-7xl gap-5 px-4 pb-20 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
          {blogPosts.map((post) => (
            <article className="rounded-xl border border-black/10 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg" key={post.title}>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0d9488]">{post.category}</p>
              <h2 className="mt-3 text-xl font-semibold">{post.title}</h2>
              <p className="mt-2 text-sm leading-6 text-[#5b6a65]">{post.excerpt}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {post.tags.map((tag) => <span className="rounded-full bg-[#0d9488]/10 px-2.5 py-1 text-xs font-semibold text-[#0d9488]" key={tag}>{tag}</span>)}
              </div>
            </article>
          ))}
        </section>
        <CTASection />
      </main>
    </MarketingShell>
  );
}
