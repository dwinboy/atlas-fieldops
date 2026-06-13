import type { Metadata } from "next";

import { FeatureDetailPage } from "@/components/marketing/MarketingBlocks";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { dataQualityContent } from "@/lib/marketing/feature-content";
import { marketingMetadata } from "@/lib/marketing/seo";

export const metadata: Metadata = marketingMetadata({
  title: "Data Quality Tools",
  description:
    "Flag duplicates, outliers, GPS issues, and missing data, with review workflows, bulk resolution, and an immutable audit trail.",
  path: "/features/data-quality",
});

export default function Page() {
  return (
    <MarketingShell>
      <FeatureDetailPage content={dataQualityContent} />
    </MarketingShell>
  );
}
