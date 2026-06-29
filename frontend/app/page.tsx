import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import {
  ArchitectureGraphic,
  CTASection,
  DataUseGraphic,
  FeatureGrid,
  HeroMockup,
  IndustryGrid,
  ModuleEcosystemGraphic,
  OperatingFlowGraphic,
  SectionIntro,
  SectorAdaptabilityShowcase,
  TrustedBy,
  TrustBand,
} from "@/components/marketing/MarketingBlocks";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { site } from "@/lib/marketing/content";
import { breadcrumbSchema, JsonLd, marketingMetadata } from "@/lib/marketing/seo";

export const metadata: Metadata = marketingMetadata({
  title: "Field Data Collection Software for Every Sector",
  description: site.description,
  path: "/",
});

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
      <JsonLd data={jsonLd} />
      <JsonLd data={breadcrumbSchema([{ name: "Home", url: site.url }])} />
      <main>
        <section className="relative overflow-hidden px-4 pb-4 pt-8 sm:px-6 lg:px-8">
          <Image
            alt="African field operations team collecting data"
            className="absolute inset-0 -z-10 object-cover opacity-[0.15]"
            fill
            priority
            sizes="100vw"
            src="/marketing/field-operations-hero.png"
          />
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#fafaf8]/70 via-[#fafaf8]/94 to-[#fafaf8]" />
          <div className="mx-auto max-w-5xl text-center">
            <p className="inline-flex rounded-full border border-[#0d9488]/20 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#0d9488]">
              Offline-ready data collection for every sector
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[#0c1f1b] md:text-6xl md:leading-[0.98]">
              Field data collection software for every sector and every workflow.
            </h1>
            <p className="mx-auto mt-4 max-w-3xl text-base leading-7 text-[#5b6a65] md:text-lg md:leading-8">
              Atlas FieldOps helps organizations in agriculture, health, education, retail, logistics, inventory, audits, HR, government, and humanitarian work collect trusted mobile data, manage entities, approve submissions, map coverage, track KPIs, and report with confidence.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
              <Link className="inline-flex h-11 items-center rounded-md bg-[#0d9488] px-5 text-sm font-semibold text-white shadow-lg transition hover:bg-[#0b7a70]" href="/book-demo">
                Book demo
              </Link>
              <Link className="inline-flex h-11 items-center rounded-md border-2 border-[#0c1f1b]/15 bg-white px-5 text-sm font-semibold text-[#0c1f1b] transition hover:border-[#0d9488]/40 hover:text-[#0d9488]" href="/signup">
                Start free trial
              </Link>
              <Link className="group inline-flex h-11 items-center gap-1.5 px-2 text-sm font-semibold text-[#0d9488] transition hover:text-[#0b7a70]" href="/features">
                Explore platform
                <ArrowRight className="transition group-hover:translate-x-0.5" size={16} />
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
            text="Replace disconnected spreadsheets, survey tools, inspection sheets, approval queues, inventory files, and reporting packs with one workflow-aware operating system."
          />
          <FeatureGrid />
        </section>
        <ModuleEcosystemGraphic />
        <OperatingFlowGraphic />
        <ArchitectureGraphic />
        <section className="bg-white py-20">
          <SectionIntro
            eyebrow="Use cases"
            title="Designed for the teams closest to the field"
            text="Support agriculture, health, humanitarian, education, retail, inventory, logistics, audits, inspections, HR, and public sector programs with workflows that stay simple for field teams and rigorous for leaders."
          />
          <IndustryGrid />
        </section>
        <SectorAdaptabilityShowcase />
        <DataUseGraphic />
        <TrustBand />
        <CTASection />
      </main>
    </MarketingShell>
  );
}
