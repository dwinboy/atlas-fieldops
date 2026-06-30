"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { ApiError } from "@/lib/api";

// Permission feedback for background reads is handled at the section level (AccessDenied / empty
// states), not globally: many pages prefetch several resources, so a single role without one of
// them would otherwise trip a global "no permission" toast on every navigation. Read 403s now
// degrade quietly to the section's own empty/denied state; explicit actions (mutations) still
// surface their own error toasts via their per-mutation handlers.
export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: (failureCount, error) => {
              // Never retry permission failures — the answer won't change.
              if (error instanceof ApiError && (error.status === 403 || error.status === 401)) {
                return false;
              }
              return failureCount < 1;
            },
            staleTime: 30_000
          }
        }
      })
  );

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, []);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
