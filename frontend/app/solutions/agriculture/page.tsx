import type { Metadata } from "next";

import { ComingSoonNotice, SimplePageHero } from "@/components/marketing/MarketingBlocks";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { marketingMetadata } from "@/lib/marketing/seo";

export const metadata: Metadata = marketingMetadata({
  title: "Agriculture",
  description: "Track farmer registration, yields, and input distribution in the field with offline forms and GIS mapping.",
  path: "/solutions/agriculture",
});

export default function AgricultureSolutionPage() {
  return (
    <MarketingShell>
      <main>
        <SimplePageHero
          eyebrow="Solutions"
          title="Track farmer registration, yields, and input distribution"
          text="Register farmers, map farms, monitor yields, verify inputs, and report agriculture indicators."
        />
        <ComingSoonNotice backHref="/solutions" backLabel="Back to Solutions" />
      </main>
    </MarketingShell>
  );
}
