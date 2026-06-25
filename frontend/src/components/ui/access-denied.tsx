import { ShieldAlert } from "lucide-react";

import type { ApiError } from "@/lib/api";

/** True when an error is a backend permission/authorization failure. */
export function isPermissionError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    (error as ApiError).status === 403
  );
}

/**
 * Inline panel shown in place of a list/section the current role can't view, so a
 * blocked area explains itself instead of looking empty or broken.
 */
export function AccessDenied({
  resource = "this information",
  detail,
}: {
  resource?: string;
  detail?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-warning/40 bg-warning/5 px-6 py-12 text-center">
      <span className="flex size-11 items-center justify-center rounded-full bg-warning/15 text-warning">
        <ShieldAlert aria-hidden="true" className="size-5" />
      </span>
      <div className="max-w-md space-y-1">
        <p className="text-sm font-semibold">You don&apos;t have permission to view {resource}</p>
        <p className="text-sm text-muted-foreground">
          {detail ??
            "Your current role doesn't include access to this. Ask your organization owner to grant the permission in Users & Teams → Roles."}
        </p>
      </div>
    </div>
  );
}
