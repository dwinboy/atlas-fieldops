import type { Metadata } from "next";

import { FeatureDetailPage } from "@/components/marketing/MarketingBlocks";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { indicatorFrameworksContent } from "@/lib/marketing/feature-content";
import { marketingMetadata } from "@/lib/marketing/seo";

export const metadata: Metadata = marketingMetadata({
  title: "Indicator Frameworks and Results Tracking",
  description:
    "Define indicators with baselines, targets, and formulas, and let approved field data compute achievement automatically.",
  path: "/features/indicator-frameworks",
});

export default function Page() {
  return (
    <MarketingShell>
      <FeatureDetailPage content={indicatorFrameworksContent} />
    </MarketingShell>
  );
}
