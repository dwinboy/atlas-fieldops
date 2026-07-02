import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type EmptyStateAction = {
  label: string;
  onClick: () => void;
};

type EmptyStateProps = {
  action?: EmptyStateAction;
  children?: ReactNode;
  className?: string;
  description: string;
  icon?: LucideIcon;
  /** Optional centered isometric illustration (FieldOps Precision). Takes priority over `icon`. */
  illustration?: ReactNode;
  secondaryAction?: EmptyStateAction;
  title: string;
};

export function EmptyState({
  action,
  children,
  className,
  description,
  icon: Icon,
  illustration,
  secondaryAction,
  title,
}: EmptyStateProps) {
  return (
    <section
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-surface-container-lowest/60 px-6 py-10 text-center",
        className,
      )}
    >
      {illustration ? (
        <div className="mb-1">{illustration}</div>
      ) : Icon ? (
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary shadow-[0_0_0_8px_hsl(var(--primary)/0.05)]">
          <Icon aria-hidden="true" size={20} />
        </span>
      ) : null}
      <div className="max-w-md space-y-1">
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="text-[13px] leading-5 text-muted-foreground">{description}</p>
      </div>
      {action || secondaryAction ? (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {action ? (
            <Button onClick={action.onClick} size="sm" type="button">
              {action.label}
            </Button>
          ) : null}
          {secondaryAction ? (
            <Button
              onClick={secondaryAction.onClick}
              size="sm"
              type="button"
              variant="ghost"
            >
              {secondaryAction.label}
            </Button>
          ) : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
