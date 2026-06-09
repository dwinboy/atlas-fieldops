import type { Metadata } from "next";

import { CTASection, SimplePageHero } from "@/components/marketing/MarketingBlocks";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { marketingMetadata } from "@/lib/marketing/seo";

export const metadata: Metadata = marketingMetadata({
  title: "Terms",
  description: "Atlas FieldOps terms overview for public website use, demo requests, customer platform access, acceptable use, and service agreements.",
  path: "/terms",
});

const sections = [
  ["Public website", "The public website provides product, education, marketing, and lead generation information."],
  ["Secure application", "Customer workspaces require authentication and are governed by role-based permissions and customer agreements."],
  ["Acceptable use", "Users must not misuse platform access, attempt unauthorized data access, or bypass security controls."],
  ["Commercial agreements", "Production deployments, support, data processing, and service levels are governed by signed customer agreements."],
];

export default function TermsPage() {
  return (
    <MarketingShell>
      <main>
        <SimplePageHero eyebrow="Terms" title="Terms for website and platform use" text="These terms explain the boundary between public marketing content and the secure Atlas FieldOps application workspace." />
        <section className="mx-auto max-w-4xl space-y-4 px-4 pb-20 sm:px-6 lg:px-8">
          {sections.map(([title, text]) => (
            <article className="rounded-xl border border-black/10 bg-white p-6 shadow-sm" key={title}>
              <h2 className="text-xl font-semibold">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-[#52615d]">{text}</p>
            </article>
          ))}
        </section>
        <CTASection />
      </main>
    </MarketingShell>
  );
}
