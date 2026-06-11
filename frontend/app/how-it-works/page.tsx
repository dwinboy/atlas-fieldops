import type { Metadata } from "next";

import { ComingSoonNotice, SimplePageHero } from "@/components/marketing/MarketingBlocks";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { marketingMetadata } from "@/lib/marketing/seo";

export const metadata: Metadata = marketingMetadata({
  title: "How It Works",
  description: "From form design to indicator reporting: how Atlas FieldOps connects every step of the M&E data lifecycle.",
  path: "/how-it-works",
});

export default function HowItWorksPage() {
  return (
    <MarketingShell>
      <main>
        <SimplePageHero
          eyebrow="Platform"
          title="From form design to indicator reporting"
          text="Atlas FieldOps connects form design, field collection, review, and reporting into a single workflow."
        />
        <ComingSoonNotice backHref="/features" backLabel="Back to Product Overview" />
      </main>
    </MarketingShell>
  );
}
