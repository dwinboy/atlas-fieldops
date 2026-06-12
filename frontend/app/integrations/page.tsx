import type { Metadata } from "next";

import { ComingSoonNotice, SimplePageHero } from "@/components/marketing/MarketingBlocks";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { marketingMetadata } from "@/lib/marketing/seo";

export const metadata: Metadata = marketingMetadata({
  title: "Integrations",
  description: "Connect Atlas FieldOps to the tools your team already uses for storage, analytics, and reporting.",
  path: "/integrations",
});

export default function IntegrationsPage() {
  return (
    <MarketingShell>
      <main>
        <SimplePageHero
          eyebrow="Platform"
          title="Connect your data to the tools you already use"
          text="Sync submissions, indicators, and reports with the systems your team relies on."
        />
        <ComingSoonNotice backHref="/features" backLabel="Back to Product Overview" />
      </main>
    </MarketingShell>
  );
}
