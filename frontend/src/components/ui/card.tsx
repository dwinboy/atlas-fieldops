import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

export type CardProps = HTMLAttributes<HTMLElement> & {
  action?: ReactNode;
  title?: ReactNode;
};

export function Card({ action, children, className, title, ...props }: CardProps) {
  return (
    <section className={cn("rounded-xl border bg-panel p-3.5 shadow-line", className)} {...props}>
      {title || action ? (
        <div className="mb-4 flex items-start justify-between gap-3">
          {title ? <h2 className="text-sm font-semibold">{title}</h2> : <span />}
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}
