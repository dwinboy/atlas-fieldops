"use client";

import { useEffect } from "react";

import { useWorkspaceStore } from "@/stores/workspace";

/**
 * Marks the current view as already having its own back / close affordance.
 * While `active` is true the global header back button is suppressed so we
 * never show two back buttons on the same window.
 */
export function useContextualBack(active = true): void {
  const register = useWorkspaceStore((state) => state.registerContextualBack);
  const unregister = useWorkspaceStore((state) => state.unregisterContextualBack);

  useEffect(() => {
    if (!active) return;
    register();
    return unregister;
  }, [active, register, unregister]);
}
