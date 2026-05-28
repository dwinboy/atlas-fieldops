import type { Metadata } from "next";
import Link from "next/link";

import { CTASection, FeatureGrid, HeroMockup, IndustryGrid, SectionIntro, TrustedBy, TrustBand, WorkflowShowcase } from "@/components/marketing/MarketingBlocks";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { site } from "@/lib/marketing/content";

export const metadata: Metadata = {
  title: "Monitoring, Evaluation & Field Data Collection Platform",
  description: site.description
};

export default function HomePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: site.name,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web, Android, iOS",
    description: site.description,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD", availability: "https://schema.org/InStock" }
  };

  return (
    <MarketingShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main>
        <section className="relative overflow-hidden px-4 pb-20 pt-20 sm:px-6 lg:px-8">
          <div className="absolute inset-0 -z-10 bg-[url('https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1800&q=80')] bg-cover bg-center opacity-[0.16]" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#f7faf8]/70 via-[#f7faf8]/94 to-[#f7faf8]" />
          <div className="mx-auto max-w-5xl text-center">
            <p className="inline-flex rounded-full border border-[#0f766e]/20 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#0f766e]">
              Offline-ready operational intelligence
            </p>
            <h1 className="mt-6 text-5xl font-semibold tracking-tight text-[#10201c] md:text-7xl">
              Field data, M&E, and operations in one connected platform.
            </h1>
            <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-[#52615d]">
              Atlas FieldOps helps NGOs, governments, and development teams collect trusted field data, manage beneficiaries, monitor indicators, approve submissions, map coverage, and report impact.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link className="inline-flex h-11 items-center rounded-md bg-[#0f766e] px-5 text-sm font-semibold text-white shadow-lg transition hover:bg-[#115e59]" href="/contact">
                Request demo
              </Link>
              <Link className="inline-flex h-11 items-center rounded-md border border-black/10 bg-white px-5 text-sm font-semibold text-[#10201c] transition hover:bg-black/[0.03]" href="/features">
                Explore platform
              </Link>
            </div>
          </div>
          <HeroMockup />
        </section>
        <TrustedBy />
        <section className="py-20">
          <SectionIntro
            eyebrow="Platform"
            title="Built for mission-critical field operations"
            text="Replace disconnected spreadsheets, survey tools, approval queues, and reporting files with one workflow-aware operating system."
          />
          <FeatureGrid />
        </section>
        <WorkflowShowcase />
        <section className="bg-white py-20">
          <SectionIntro
            eyebrow="Use cases"
            title="Designed for the teams closest to the field"
            text="Support agriculture, health, humanitarian, education, and public sector programs with workflows that stay simple for field teams and rigorous for leaders."
          />
          <IndustryGrid />
        </section>
        <TrustBand />
        <CTASection />
      </main>
    </MarketingShell>
  );
}
