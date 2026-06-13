import type { Metadata } from "next";
import Link from "next/link";

import { CTASection, SimplePageHero } from "@/components/marketing/MarketingBlocks";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { useCasePages } from "@/lib/marketing/content";
import { marketingMetadata } from "@/lib/marketing/seo";

export const metadata: Metadata = marketingMetadata({
  title: "Field Data Collection Use Cases for Every Sector",
  description: "Explore Atlas FieldOps use cases for surveys, inspections, stock counts, delivery proof, registration, entity tracking, needs assessments, health, education, agriculture, logistics, and humanitarian programs.",
  path: "/use-cases",
});

export default function UseCasesPage() {
  return (
    <MarketingShell>
      <main>
        <SimplePageHero
          eyebrow="Use cases"
          title="Field data collection workflows for real operations"
          text="Atlas FieldOps supports surveys, monitoring visits, entity tracking, inspections, inventory checks, delivery confirmation, needs assessments, agriculture programs, health work, education programs, and humanitarian operations."
        />
        <section className="mx-auto grid max-w-7xl gap-5 px-4 pb-20 sm:px-6 md:grid-cols-2 lg:grid-cols-3 lg:px-8">
          {useCasePages.map((useCase) => (
            <Link className="rounded-xl border border-black/10 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg" href={`/use-cases/${useCase.slug}`} key={useCase.slug}>
              <h2 className="text-xl font-semibold">{useCase.title}</h2>
              <p className="mt-2 text-sm leading-6 text-[#5b6a65]">{useCase.description}</p>
            </Link>
          ))}
        </section>
        <CTASection />
      </main>
    </MarketingShell>
  );
}
