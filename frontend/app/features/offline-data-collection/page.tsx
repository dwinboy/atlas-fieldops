import type { Metadata } from "next";

import { FeatureDetailPage } from "@/components/marketing/MarketingBlocks";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { OfflineSyncGraphic } from "@/components/marketing/illustrations";
import { offlineDataCollectionContent } from "@/lib/marketing/feature-content";
import { marketingMetadata } from "@/lib/marketing/seo";

export const metadata: Metadata = marketingMetadata({
  title: "Offline Data Collection",
  description:
    "Capture field data fully offline on Android — forms, GPS, photos, consent — and sync safely when a connection returns, with no lost work.",
  path: "/features/offline-data-collection",
});

export default function Page() {
  return (
    <MarketingShell>
      <FeatureDetailPage content={offlineDataCollectionContent} illustration={<OfflineSyncGraphic />} />
    </MarketingShell>
  );
}
