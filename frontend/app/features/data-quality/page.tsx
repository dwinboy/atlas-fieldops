import type { Metadata } from "next";

import { ComingSoonNotice, SimplePageHero } from "@/components/marketing/MarketingBlocks";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { marketingMetadata } from "@/lib/marketing/seo";

export const metadata: Metadata = marketingMetadata({
  title: "Data Quality Tools",
  description: "Catch duplicates, outliers, missing data, and validation failures with versioning and audit trails built in.",
  path: "/features/data-quality",
});

export default function DataQualityPage() {
  return (
    <MarketingShell>
      <main>
        <SimplePageHero
          eyebrow="Features"
          title="Validation, versioning, and audit trails"
          text="Catch duplicates, outliers, missing data, and GPS issues before they reach your reports."
        />
        <ComingSoonNotice backHref="/features" backLabel="Back to Features" />
      </main>
    </MarketingShell>
  );
}
