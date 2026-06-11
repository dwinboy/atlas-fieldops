import type { Metadata } from "next";

import { ComingSoonNotice, SimplePageHero } from "@/components/marketing/MarketingBlocks";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { marketingMetadata } from "@/lib/marketing/seo";

export const metadata: Metadata = marketingMetadata({
  title: "Baseline & Endline Surveys",
  description: "Measure change with comparable data collected before and after implementation.",
  path: "/use-cases/baseline-endline-surveys",
});

export default function BaselineEndlineSurveysPage() {
  return (
    <MarketingShell>
      <main>
        <SimplePageHero
          eyebrow="Use Cases"
          title="Baseline & Endline Surveys"
          text="Measure change with comparable data collected before and after implementation, linked to the same indicators and locations."
        />
        <ComingSoonNotice backHref="/use-cases" backLabel="Back to Use Cases" />
      </main>
    </MarketingShell>
  );
}
