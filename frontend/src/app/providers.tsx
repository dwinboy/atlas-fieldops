"use client";

import { QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { ApiError } from "@/lib/api";
import { useWorkspaceStore } from "@/stores/workspace";

// One clear, friendly message whenever the backend blocks a request for lack of
// permission — so a 403 is never a silent empty screen anywhere in the app.
let lastPermissionToastAt = 0;
function notifyPermissionDenied(): void {
  const now = Date.now();
  if (now - lastPermissionToastAt < 4000) return;
  lastPermissionToastAt = now;
  useWorkspaceStore.getState().pushToast({
    title: "You don't have permission",
    description:
      "Your role can't access this. Ask your organization owner to grant the permission in Users & Teams → Roles.",
    tone: "warning",
  });
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          onError: (error) => {
            if (error instanceof ApiError && error.status === 403) {
              notifyPermissionDenied();
            }
          },
        }),
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
