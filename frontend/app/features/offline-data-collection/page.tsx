import type { Metadata } from "next";

import { ComingSoonNotice, SimplePageHero } from "@/components/marketing/MarketingBlocks";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { marketingMetadata } from "@/lib/marketing/seo";

export const metadata: Metadata = marketingMetadata({
  title: "Offline Data Collection",
  description: "Collect data anywhere and sync automatically when your team is back online, with GPS, media, and timestamps preserved.",
  path: "/features/offline-data-collection",
});

export default function OfflineDataCollectionPage() {
  return (
    <MarketingShell>
      <main>
        <SimplePageHero
          eyebrow="Features"
          title="Collect anywhere, sync when connected"
          text="Field teams keep working offline while GPS, media, and timestamps are preserved until sync."
        />
        <ComingSoonNotice backHref="/features" backLabel="Back to Features" />
      </main>
    </MarketingShell>
  );
}
