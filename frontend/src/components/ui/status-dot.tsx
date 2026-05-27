import { cn } from "@/lib/utils";

type StatusTone = "online" | "syncing" | "warning" | "offline";

const toneClass: Record<StatusTone, string> = {
  online: "bg-success",
  syncing: "bg-primary",
  warning: "bg-warning",
  offline: "bg-danger"
};

export function StatusDot({ className, tone }: { className?: string; tone: StatusTone }) {
  return (
    <span className={cn("relative inline-flex h-2.5 w-2.5", className)} aria-hidden="true">
      <span className={cn("absolute inline-flex h-full w-full rounded-full opacity-35", toneClass[tone])} />
      <span className={cn("relative inline-flex h-2.5 w-2.5 rounded-full", toneClass[tone])} />
    </span>
  );
}

