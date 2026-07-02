"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useWorkspaceStore } from "@/stores/workspace";

export function NotificationCenter() {
  const toasts = useWorkspaceStore((state) => state.toasts);
  const dismissToast = useWorkspaceStore((state) => state.dismissToast);
  const toneLabel = {
    neutral: "Update",
    success: "Resolved",
    warning: "Attention",
    danger: "Blocked",
    accent: "Workspace"
  } as const;

  useEffect(() => {
    const timers = toasts.map((toast) => window.setTimeout(() => dismissToast(toast.id), 4200));
    return () => timers.forEach(window.clearTimeout);
  }, [dismissToast, toasts]);

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[calc(100vw-2rem)] max-w-xs flex-col gap-2">
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.2, 0.8, 0.2, 1] }}
            className="pointer-events-auto rounded-lg border bg-surface-container-lowest/95 p-3 shadow-elevated backdrop-blur-xl"
            role="status"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <Badge tone={toast.tone ?? "neutral"}>{toneLabel[toast.tone ?? "neutral"]}</Badge>
                <p className="mt-2 text-sm font-semibold leading-tight">{toast.title}</p>
                {toast.description ? <p className="mt-1 text-sm text-muted-foreground">{toast.description}</p> : null}
              </div>
              <Button aria-label="Dismiss notification" size="icon" variant="ghost" onClick={() => dismissToast(toast.id)}>
                <X aria-hidden="true" />
              </Button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
