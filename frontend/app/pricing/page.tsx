import type { Metadata } from "next";

import { CTASection, PricingCards, SimplePageHero } from "@/components/marketing/MarketingBlocks";
import { MarketingShell } from "@/components/marketing/MarketingShell";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Custom pricing for NGO, government, and enterprise field operations teams."
};

export default function PricingPage() {
  return (
    <MarketingShell>
      <main>
        <SimplePageHero
          eyebrow="Pricing"
          title="Flexible pricing for serious programs"
          text="Pricing is shaped around scale, support needs, integrations, data volumes, and deployment model."
        />
        <PricingCards />
        <CTASection />
      </main>
    </MarketingShell>
  );
}
