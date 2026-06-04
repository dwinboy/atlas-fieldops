import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium leading-none shadow-sm",
  {
    variants: {
      tone: {
        neutral: "border-border bg-muted text-muted-foreground",
        success: "border-success/25 bg-success/10 text-success",
        warning: "border-warning/25 bg-warning/10 text-warning",
        danger: "border-danger/25 bg-danger/10 text-danger",
        accent: "border-primary/25 bg-primary/10 text-primary",
        daily: "border-section-daily/20 bg-section-daily/10 text-section-daily",
        collect:
          "border-section-collect/20 bg-section-collect/10 text-section-collect",
        monitor:
          "border-section-monitor/20 bg-section-monitor/10 text-section-monitor",
        operate:
          "border-section-operate/20 bg-section-operate/10 text-section-operate",
        admin: "border-section-admin/20 bg-section-admin/10 text-section-admin",
        support:
          "border-section-support/20 bg-section-support/10 text-section-support",
        platform:
          "border-section-platform/20 bg-section-platform/10 text-section-platform",
        governance:
          "border-section-governance/20 bg-section-governance/10 text-section-governance",
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
