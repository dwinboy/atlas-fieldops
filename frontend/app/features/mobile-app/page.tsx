import type { Metadata } from "next";

import { FeatureDetailPage } from "@/components/marketing/MarketingBlocks";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { mobileAppContent } from "@/lib/marketing/feature-content";
import { marketingMetadata } from "@/lib/marketing/seo";

export const metadata: Metadata = marketingMetadata({
  title: "Mobile Collector App",
  description:
    "An offline-first Android collector built for real field conditions — low-end devices, weak networks, GPS, media, and secure access.",
  path: "/features/mobile-app",
});

export default function Page() {
  return (
    <MarketingShell>
      <FeatureDetailPage content={mobileAppContent} />
    </MarketingShell>
  );
}
