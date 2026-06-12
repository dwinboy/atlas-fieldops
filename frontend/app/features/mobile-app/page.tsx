import type { Metadata } from "next";

import { ComingSoonNotice, SimplePageHero } from "@/components/marketing/MarketingBlocks";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { marketingMetadata } from "@/lib/marketing/seo";

export const metadata: Metadata = marketingMetadata({
  title: "Mobile Collector App",
  description: "A mobile data collection app built for fieldwork on any device, online or offline.",
  path: "/features/mobile-app",
});

export default function MobileAppPage() {
  return (
    <MarketingShell>
      <main>
        <SimplePageHero
          eyebrow="Features"
          title="Built for fieldwork on any device"
          text="Field officers collect data on phones and tablets, online or offline, with the same forms and validation."
        />
        <ComingSoonNotice backHref="/features" backLabel="Back to Features" />
      </main>
    </MarketingShell>
  );
}
