import { Inbox, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Compact inline empty state for bento panels and sub-sections (FieldOps Precision). Distinct from
 * the full-page {@link EmptyState}: this is the small placeholder shown inside a card when a list or
 * widget has no data yet. Centered icon mark over a subtle dashed surface so an empty panel still
 * reads as designed rather than a bare text box. Presentational only.
 */
export type EmptyMiniProps = {
  label: string;
  icon?: LucideIcon;
  className?: string;
};

export function EmptyMini({ label, icon: Icon = Inbox, className }: EmptyMiniProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border-subtle bg-surface-container-lowest px-4 py-8 text-center",
        className,
      )}
    >
      <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon aria-hidden="true" size={18} strokeWidth={1.5} />
      </span>
      <p className="max-w-[42ch] text-[13px] leading-5 text-on-surface-variant">{label}</p>
    </div>
  );
}
