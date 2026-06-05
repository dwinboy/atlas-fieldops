"use client";

import { HelpCircle } from "lucide-react";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

type HelpHintProps = {
  children: ReactNode;
  className?: string;
  label?: string;
  title?: string;
};

export function HelpHint({
  children,
  className,
  label = "More information",
  title,
}: HelpHintProps) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const wrapperRef = useRef<HTMLSpanElement>(null);
  function toggleHelp(event: ReactMouseEvent<HTMLSpanElement> | ReactKeyboardEvent<HTMLSpanElement>) {
    event.preventDefault();
    event.stopPropagation();
    setOpen((current) => !current);
  }

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <span className={cn("relative inline-flex align-middle", className)} ref={wrapperRef}>
      <span
        aria-controls={id}
        aria-expanded={open}
        aria-label={label}
        className="inline-flex h-6 w-6 items-center justify-center rounded-full border bg-background text-muted-foreground shadow-line transition hover:border-primary/30 hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35"
        onClick={toggleHelp}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            toggleHelp(event);
          }
        }}
        role="button"
        tabIndex={0}
      >
        <HelpCircle aria-hidden="true" size={14} />
      </span>
      {open ? (
        <span
          className="absolute left-1/2 top-8 z-40 block w-72 -translate-x-1/2 rounded-xl border bg-panel p-3 text-left shadow-elevated sm:left-auto sm:right-0 sm:translate-x-0"
          id={id}
          role="dialog"
        >
          {title ? <span className="block text-sm font-semibold text-foreground">{title}</span> : null}
          <span className={cn("block text-xs leading-5 text-muted-foreground", title ? "mt-1" : "")}>
            {children}
          </span>
        </span>
      ) : null}
    </span>
  );
}
