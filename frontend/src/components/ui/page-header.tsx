import type { ReactNode } from "react";

import { HelpHint } from "@/components/ui/help-hint";
import { cn } from "@/lib/utils";

/**
 * Standard workspace page header: badges/eyebrow row, title (+ optional HelpHint), optional
 * description, primary actions on the right, and an optional tab/section row underneath.
 * One consistent chrome for every module so pages stop hand-rolling divergent header bands.
 * Presentational only — tabs and actions are passed in as already-wired nodes.
 */
export function PageHeader({
  actions,
  badges,
  className,
  description,
  help,
  tabs,
  title,
}: {
  actions?: ReactNode;
  badges?: ReactNode;
  className?: string;
  description?: string;
  /** Longer explanation shown behind a help hint next to the title. */
  help?: string;
  tabs?: ReactNode;
  title: string;
}) {
  return (
    <div className={cn("module-header rounded-2xl p-4 md:p-5", className)}>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          {badges ? <div className="flex flex-wrap items-center gap-2">{badges}</div> : null}
          <div className={cn("flex flex-wrap items-center gap-2", badges && "mt-2.5")}>
            <h1 className="text-2xl font-semibold tracking-tight text-on-surface">{title}</h1>
            {help ? (
              <HelpHint label={`About ${title}`} title={title}>
                {help}
              </HelpHint>
            ) : null}
          </div>
          {description ? (
            <p className="mt-1.5 max-w-3xl text-sm leading-6 text-on-surface-variant">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {tabs ? (
        <div className="mt-3 flex gap-1.5 overflow-x-auto product-scrollbar">{tabs}</div>
      ) : null}
    </div>
  );
}
