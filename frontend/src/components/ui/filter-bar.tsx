import { SlidersHorizontal } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Standard labeled filter bar for list/table views: a responsive grid of labeled controls
 * with a right-aligned "Clear filters" action on its own row (so date pickers and buttons
 * never collide). Wrap each control in <FilterField label="…"> and pass hasActiveFilters +
 * onClear from the owning module — the bar holds no filter state of its own.
 */
export function FilterBar({
  children,
  className,
  columnsClassName = "grid-cols-2 md:grid-cols-3 xl:grid-cols-6",
  hasActiveFilters,
  onClear,
}: {
  children: ReactNode;
  className?: string;
  /** Tailwind grid-cols classes controlling the filter grid at each breakpoint. */
  columnsClassName?: string;
  hasActiveFilters: boolean;
  onClear: () => void;
}) {
  return (
    <div
      className={cn(
        "space-y-3 rounded-2xl border border-border-subtle bg-surface-container-lowest p-4 shadow-card",
        className,
      )}
    >
      <div className={cn("grid gap-3", columnsClassName)}>{children}</div>
      <div className="flex justify-end">
        <Button disabled={!hasActiveFilters} onClick={onClear} variant="ghost">
          <SlidersHorizontal aria-hidden="true" />
          Clear filters
        </Button>
      </div>
    </div>
  );
}

/** A labeled slot in the FilterBar grid. */
export function FilterField({
  children,
  className,
  label,
}: {
  children: ReactNode;
  className?: string;
  label: string;
}) {
  return (
    <label className={cn("grid gap-1.5 text-xs font-medium text-on-surface-variant", className)}>
      <span>{label}</span>
      {children}
    </label>
  );
}
