import type { Metadata } from "next";

import { ComingSoonNotice, SimplePageHero } from "@/components/marketing/MarketingBlocks";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { marketingMetadata } from "@/lib/marketing/seo";

export const metadata: Metadata = marketingMetadata({
  title: "Impact Evaluations",
  description: "Attribute results to your program with rigorous, structured evidence.",
  path: "/use-cases/impact-evaluations",
});

export default function ImpactEvaluationsPage() {
  return (
    <MarketingShell>
      <main>
        <SimplePageHero
          eyebrow="Use Cases"
          title="Impact Evaluations"
          text="Attribute results to your program with rigorous, structured evidence collected across treatment and comparison groups."
        />
        <ComingSoonNotice backHref="/use-cases" backLabel="Back to Use Cases" />
      </main>
    </MarketingShell>
  );
}
