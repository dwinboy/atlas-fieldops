import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

export type CardProps = HTMLAttributes<HTMLElement> & {
  action?: ReactNode;
  title?: ReactNode;
};

export function Card({ action, children, className, title, ...props }: CardProps) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-border-subtle bg-surface-container-lowest p-5 shadow-card",
        className,
      )}
      {...props}
    >
      {title || action ? (
        <div className="mb-4 flex items-start justify-between gap-3">
          {title ? <h2 className="text-sm font-semibold text-on-surface">{title}</h2> : <span />}
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}
