import { RefreshCw, WifiOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Inline error state for failed data queries. Renders in place of a list/board so a fetch
 * failure is never mistaken for an empty dataset ("No records yet" when the API is down is a
 * trust hazard). Says what failed and offers a one-click retry wired to the query's refetch.
 */
export function QueryErrorState({
  className,
  onRetry,
  resource,
  retrying = false,
}: {
  className?: string;
  onRetry: () => void;
  /** What failed to load, e.g. "submissions", "forms", "field officers". */
  resource: string;
  retrying?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-2xl border border-warning/30 bg-warning/5 px-6 py-10 text-center",
        className,
      )}
      role="alert"
    >
      <span className="flex size-11 items-center justify-center rounded-full bg-warning/15 text-warning">
        <WifiOff aria-hidden="true" className="size-5" />
      </span>
      <div className="max-w-md space-y-1">
        <p className="text-sm font-semibold text-on-surface">
          Couldn&apos;t load {resource}
        </p>
        <p className="text-sm text-muted-foreground">
          The request failed — this is a connection or server problem, not an empty
          workspace. Your data is unchanged.
        </p>
      </div>
      <Button disabled={retrying} onClick={onRetry} size="sm" variant="secondary">
        <RefreshCw aria-hidden="true" className={retrying ? "animate-spin" : undefined} />
        {retrying ? "Retrying…" : "Retry"}
      </Button>
    </div>
  );
}
