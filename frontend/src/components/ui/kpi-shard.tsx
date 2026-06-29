import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

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
  icon: LucideIcon;
  trend?: KpiShardTrend;
  onClick?: () => void;
  className?: string;
};

export function KpiShard({ label, value, detail, icon: Icon, trend, onClick, className }: KpiShardProps) {
  const interactive = typeof onClick === "function";
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-on-surface-variant">{label}</p>
        <Icon aria-hidden="true" className="shrink-0 text-primary" size={20} strokeWidth={1.5} />
      </div>
      <p className="mt-3 text-3xl font-bold tabular-nums tracking-tight text-on-surface">{value}</p>
      {trend ? (
        <p className="mt-2 flex items-center gap-1.5 text-xs">
          <span
            className={cn(
              "font-semibold tabular-nums",
              trend.direction === "down" ? "text-error" : trend.direction === "up" ? "text-primary" : "text-on-surface-variant",
            )}
          >
            {trend.value}
          </span>
          {detail ? <span className="text-on-surface-variant">{detail}</span> : null}
        </p>
      ) : detail ? (
        <p className="mt-2 line-clamp-2 text-xs leading-5 text-on-surface-variant">{detail}</p>
      ) : null}
    </>
  );

  const base =
    "flex flex-col rounded-xl border border-border-subtle bg-surface-container-lowest p-6 text-left shadow-[0_1px_3px_0_rgba(0,0,0,0.05)] transition-all duration-200 ease-in-out";

  if (interactive) {
    return (
      <button
        className={cn(base, "group hover:border-primary/40 hover:shadow-[0_8px_24px_-12px_rgba(0,82,50,0.25)]", className)}
        onClick={onClick}
        type="button"
      >
        {body}
      </button>
    );
  }
  return <div className={cn(base, className)}>{body}</div>;
}
