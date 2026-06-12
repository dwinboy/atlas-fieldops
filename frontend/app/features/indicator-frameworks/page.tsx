import type { Metadata } from "next";

import { ComingSoonNotice, SimplePageHero } from "@/components/marketing/MarketingBlocks";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { marketingMetadata } from "@/lib/marketing/seo";

export const metadata: Metadata = marketingMetadata({
  title: "Indicator Frameworks",
  description: "Link every submission to your results framework with logframes, baselines, targets, and disaggregation.",
  path: "/features/indicator-frameworks",
});

export default function IndicatorFrameworksPage() {
  return (
    <MarketingShell>
      <main>
        <SimplePageHero
          eyebrow="Features"
          title="Link every submission to your results framework"
          text="Manage logframes, baselines, targets, calculations, and disaggregation in one place."
        />
        <ComingSoonNotice backHref="/features" backLabel="Back to Features" />
      </main>
    </MarketingShell>
  );
}
