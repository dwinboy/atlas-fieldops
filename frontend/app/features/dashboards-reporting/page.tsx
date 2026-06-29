import type { Metadata } from "next";

import { FeatureDetailPage } from "@/components/marketing/MarketingBlocks";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { AnalyticsShards } from "@/components/marketing/illustrations";
import { dashboardsReportingContent } from "@/lib/marketing/feature-content";
import { marketingMetadata } from "@/lib/marketing/seo";

export const metadata: Metadata = marketingMetadata({
  title: "Dashboards and Donor Reporting",
  description:
    "Turn approved field data into a manager's action queue, live dashboards, indicator progress, and donor-ready report packages.",
  path: "/features/dashboards-reporting",
});

export default function Page() {
  return (
    <MarketingShell>
      <FeatureDetailPage content={dashboardsReportingContent} illustration={<AnalyticsShards />} />
    </MarketingShell>
  );
}
