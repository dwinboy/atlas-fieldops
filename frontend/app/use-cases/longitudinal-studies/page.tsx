import type { Metadata } from "next";

import { ComingSoonNotice, SimplePageHero } from "@/components/marketing/MarketingBlocks";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { marketingMetadata } from "@/lib/marketing/seo";

export const metadata: Metadata = marketingMetadata({
  title: "Longitudinal Studies",
  description: "Follow the same respondents and indicators across multiple data collection rounds.",
  path: "/use-cases/longitudinal-studies",
});

export default function LongitudinalStudiesPage() {
  return (
    <MarketingShell>
      <main>
        <SimplePageHero
          eyebrow="Use Cases"
          title="Longitudinal Studies"
          text="Follow the same respondents and indicators across multiple data rounds, with versioned forms and consistent identifiers."
        />
        <ComingSoonNotice backHref="/use-cases" backLabel="Back to Use Cases" />
      </main>
    </MarketingShell>
  );
}
