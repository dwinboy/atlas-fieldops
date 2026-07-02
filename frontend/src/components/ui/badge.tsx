import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold leading-none shadow-sm",
  {
    variants: {
      tone: {
        neutral: "border-border/90 bg-surface-container-lowest text-muted-foreground",
        success: "border-success/25 bg-success/12 text-success",
        warning: "border-warning/25 bg-warning/12 text-warning",
        danger: "border-danger/25 bg-danger/12 text-danger",
        info: "border-info/25 bg-info/12 text-info",
        accent: "border-primary/25 bg-primary/12 text-primary",
        daily: "border-section-daily/20 bg-section-daily/12 text-section-daily",
        collect:
          "border-section-collect/20 bg-section-collect/12 text-section-collect",
        monitor:
          "border-section-monitor/20 bg-section-monitor/12 text-section-monitor",
        operate:
          "border-section-operate/20 bg-section-operate/12 text-section-operate",
        admin: "border-section-admin/20 bg-section-admin/12 text-section-admin",
        support:
          "border-section-support/20 bg-section-support/12 text-section-support",
        platform:
          "border-section-platform/20 bg-section-platform/12 text-section-platform",
        governance:
          "border-section-governance/20 bg-section-governance/12 text-section-governance",
      },
    },
    defaultVariants: {
      tone: "neutral",
    },
  },
);

export type BadgeProps = HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof badgeVariants>;

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
