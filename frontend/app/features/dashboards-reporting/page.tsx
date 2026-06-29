import type { Metadata } from "next";
import Image from "next/image";

import { FeatureDetailPage } from "@/components/marketing/MarketingBlocks";
import { MarketingShell } from "@/components/marketing/MarketingShell";
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
      <FeatureDetailPage
        content={dashboardsReportingContent}
        illustration={
          <div className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-[0_10px_40px_-12px_rgba(0,82,50,0.18)]">
            <Image
              alt="Atlas FieldOps analytics and KPI dashboards: floating glass shards with line charts, progress gauges, and heatmaps"
              className="h-auto w-full rounded-xl"
              width={1200}
              height={896}
              sizes="(max-width: 1024px) 100vw, 896px"
              src="/marketing/analytics-dashboard.jpg"
            />
          </div>
        }
      />
    </MarketingShell>
  );
}
