import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Command-board KPI card (the Field Operations treatment, shared): tone-tinted icon well
 * top-left, a small "Live" caps tag top-right in the same tone, then an extrabold value over
 * a compact label. Use inside a module's command-board panel so every module's overview
 * reads like the same mission-control system. Presentational only.
 */
export type CommandMetricTone = "danger" | "neutral" | "success" | "warning";

const toneStyles: Record<CommandMetricTone, { icon: string; ring: string; text: string }> = {
  danger: {
    icon: "bg-danger/10 text-danger",
    ring: "hover:border-danger/30",
    text: "text-danger",
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

export function CommandMetricCard({
  icon,
  label,
  onClick,
  tag = "Live",
  tone = "neutral",
  value,
}: {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  /** Small caps tag in the top-right corner (defaults to "Live"). */
  tag?: string;
  tone?: CommandMetricTone;
  value: string | number;
}) {
  const styles = toneStyles[tone];
  const cardClassName = cn(
    "group min-h-[116px] rounded-2xl border border-border-subtle bg-surface-container-lowest p-4 text-left shadow-card transition duration-200",
    "hover:-translate-y-0.5 hover:shadow-card-hover",
    styles.ring,
    onClick ? "cursor-pointer" : "",
  );
  const content = (
    <>
      <div className="flex items-center justify-between gap-3">
        <span className={cn("flex size-10 items-center justify-center rounded-xl transition group-hover:scale-105", styles.icon)}>
          {icon}
        </span>
        <span className={cn("text-[10px] font-bold uppercase tracking-[0.18em]", styles.text)}>
          {tag}
        </span>
      </div>
      <div className="mt-5">
        <p className="text-2xl font-extrabold tabular-nums tracking-tight text-on-surface">{value}</p>
        <p className="mt-1 text-xs font-semibold text-on-surface-variant">{label}</p>
      </div>
    </>
  );

  if (onClick) {
    return (
      <button className={cardClassName} onClick={onClick} type="button">
        {content}
      </button>
    );
  }

  return <div className={cardClassName}>{content}</div>;
}
