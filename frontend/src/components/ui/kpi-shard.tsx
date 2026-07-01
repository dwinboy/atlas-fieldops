import type { LucideIcon } from "lucide-react";
import { isValidElement, type ReactNode } from "react";

import type { BadgeProps } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Intelligence Shard (KPI card) for the FieldOps Precision system — the single source of truth for
 * every module's "Pulse Row". 12px radius, 1px subtle border, 24px padding, calm large value, plain
 * emerald icon, optional trend (emerald up / crimson down). Renders as a button when `onClick` is
 * given (whole shard is the target), otherwise a static card. Presentational only — no data logic.
 */
export type KpiShardTrend = { value: string; direction: "up" | "down" | "flat" };

export type KpiShardProps = {
  label: string;
  value: ReactNode;
  detail?: string;
  /** Either a lucide-react icon component (rendered at size 20 / strokeWidth 1.5) or a ready node. */
  icon: LucideIcon | ReactNode;
  trend?: KpiShardTrend;
  onClick?: () => void;
  className?: string;
  tone?: BadgeProps["tone"];
};

export function KpiShard({ label, value, detail, icon: Icon, trend, onClick, className, tone = "neutral" }: KpiShardProps) {
  const interactive = typeof onClick === "function";
  const resolvedTone =
    trend?.direction === "down"
      ? "danger"
      : trend?.direction === "up"
        ? "success"
        : tone;
  const toneStyles: Record<string, { icon: string; ring: string; text: string }> = {
    accent: {
      icon: "bg-primary/10 text-primary",
      ring: "hover:border-primary/30",
      text: "text-primary",
    },
    collect: {
      icon: "bg-section-collect/10 text-section-collect",
      ring: "hover:border-section-collect/30",
      text: "text-section-collect",
    },
    danger: {
      icon: "bg-danger/10 text-danger",
      ring: "hover:border-danger/30",
      text: "text-danger",
    },
    info: {
      icon: "bg-info/10 text-info",
      ring: "hover:border-info/30",
      text: "text-info",
    },
    monitor: {
      icon: "bg-section-monitor/10 text-section-monitor",
      ring: "hover:border-section-monitor/30",
      text: "text-section-monitor",
    },
    neutral: {
      icon: "bg-muted text-muted-foreground",
      ring: "hover:border-primary/25",
      text: "text-muted-foreground",
    },
    success: {
      icon: "bg-success/10 text-success",
      ring: "hover:border-success/30",
      text: "text-success",
    },
    warning: {
      icon: "bg-warning/10 text-warning",
      ring: "hover:border-warning/30",
      text: "text-warning",
    },
  };
  const styles = toneStyles[resolvedTone ?? "neutral"] ?? toneStyles.neutral;
  // A pre-rendered node (e.g. <Foo />) is a valid element; a lucide component (forwardRef object)
  // is not, so isValidElement reliably distinguishes "already rendered" from "component to render".
  let iconNode: ReactNode;
  if (isValidElement(Icon)) {
    iconNode = (
      <span aria-hidden="true" className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl transition group-hover:scale-105 [&>svg]:size-5", styles.icon)}>
        {Icon}
      </span>
    );
  } else {
    const IconComponent = Icon as LucideIcon;
    iconNode = (
      <span aria-hidden="true" className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl transition group-hover:scale-105", styles.icon)}>
        <IconComponent aria-hidden="true" size={20} strokeWidth={1.8} />
      </span>
    );
  }
  const body = (
    <>
      <div className="flex items-center justify-between gap-3">
        {iconNode}
        <span className={cn("text-[10px] font-bold uppercase tracking-[0.18em]", styles.text)}>
          {trend?.value ?? "Live"}
        </span>
      </div>
      <div className="mt-5">
        <p className="text-2xl font-extrabold tracking-tight text-on-surface">{value}</p>
        <p className="mt-1 text-xs font-semibold text-on-surface-variant">{label}</p>
      </div>
      {detail ? (
        <p className="mt-3 line-clamp-2 text-xs font-medium leading-5 text-on-surface-variant">{detail}</p>
      ) : null}
      {trend ? (
        <div className={cn("mt-3 flex items-center gap-2 text-[11px] font-bold", styles.text)}>
          <span
            className={cn(
              "size-2 rounded-full",
              resolvedTone === "danger" ? "bg-red-500" : resolvedTone === "warning" ? "bg-amber-500" : "bg-emerald-500",
            )}
          />
          {trend.direction === "flat" ? "Stable" : trend.direction === "down" ? "Needs attention" : "Improving"}
        </div>
      ) : null}
    </>
  );

  const base =
    "group flex min-h-[116px] flex-col rounded-2xl border border-border-subtle bg-surface-container-lowest p-4 text-left shadow-card transition duration-200";

  if (interactive) {
    return (
      <button
        className={cn(base, "hover:-translate-y-0.5 hover:shadow-[0_22px_44px_-32px_rgba(12,31,27,0.72)]", styles.ring, className)}
        onClick={onClick}
        type="button"
      >
        {body}
      </button>
    );
  }
  return <div className={cn(base, styles.ring, className)}>{body}</div>;
}
