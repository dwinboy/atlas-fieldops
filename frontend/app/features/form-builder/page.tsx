import type { Metadata } from "next";

import { ComingSoonNotice, SimplePageHero } from "@/components/marketing/MarketingBlocks";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { marketingMetadata } from "@/lib/marketing/seo";

export const metadata: Metadata = marketingMetadata({
  title: "Form Builder",
  description: "Design mobile-ready survey forms backwards from your indicators with sections, logic, validation, and versioning.",
  path: "/features/form-builder",
});

export default function FormBuilderPage() {
  return (
    <MarketingShell>
      <main>
        <SimplePageHero
          eyebrow="Features"
          title="Design forms backwards from your indicators"
          text="Build mobile-ready forms with sections, repeat groups, logic, validation, and versioning."
        />
        <ComingSoonNotice backHref="/features" backLabel="Back to Features" />
      </main>
    </MarketingShell>
  );
}
