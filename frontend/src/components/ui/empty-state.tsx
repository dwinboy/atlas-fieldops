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
  secondaryAction?: EmptyStateAction;
  title: string;
};

export function EmptyState({
  action,
  children,
  className,
  description,
  icon: Icon,
  secondaryAction,
  title,
}: EmptyStateProps) {
  return (
    <section
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-panel/60 px-6 py-10 text-center",
        className,
      )}
    >
      {Icon ? (
        <span className="flex h-11 w-11 items-center justify-center rounded-xl border bg-panel text-muted-foreground">
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
