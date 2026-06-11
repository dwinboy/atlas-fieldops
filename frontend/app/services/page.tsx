import type { Metadata } from "next";

import { CTASection, SimplePageHero } from "@/components/marketing/MarketingBlocks";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { marketingMetadata } from "@/lib/marketing/seo";

export const metadata: Metadata = marketingMetadata({
  title: "Implementation Services",
  description: "Enterprise implementation, onboarding, workflow customization, integrations, training, analytics consulting, security review, and operational support for Atlas FieldOps.",
  path: "/services",
});

const services = [
  "Implementation support",
  "Custom deployment",
  "Training and onboarding",
  "Workflow customization",
  "Integrations",
  "Analytics consulting",
  "Operational support",
  "Security and governance review"
];

export default function ServicesPage() {
  return (
    <MarketingShell>
      <main>
        <SimplePageHero
          eyebrow="Services"
          title="Expert support for high-stakes field operations"
          text="From system design to training and integrations, our services help organizations launch confident, scalable, and measurable operations."
        />
        <section className="pb-20">
          <div className="mx-auto grid max-w-7xl gap-4 px-4 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
            {services.map((service) => (
              <article className="rounded-xl border border-black/10 bg-white p-6 shadow-sm" key={service}>
                <h2 className="text-lg font-semibold">{service}</h2>
                <p className="mt-2 text-sm leading-6 text-[#5b6a65]">
                  Structured delivery for enterprise teams that need dependable workflows, clean data, and adoption across field teams.
                </p>
              </article>
            ))}
          </div>
        </section>
        <CTASection />
      </main>
    </MarketingShell>
  );
}
