"use client";

import { HelpCircle } from "lucide-react";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

type HelpHintProps = {
  children: ReactNode;
  className?: string;
  label?: string;
  title?: string;
};

const POPOVER_WIDTH = 288;
const VIEWPORT_GAP = 12;

export function HelpHint({
  children,
  className,
  label = "More information",
  title,
}: HelpHintProps) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const [popoverStyle, setPopoverStyle] = useState<CSSProperties>({});

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

  useEffect(() => {
    if (!open) return;

    function updatePosition(): void {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const width = Math.min(POPOVER_WIDTH, window.innerWidth - VIEWPORT_GAP * 2);
      const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_GAP;
      const spaceAbove = rect.top - VIEWPORT_GAP;
      const openUp = spaceBelow < 140 && spaceAbove > spaceBelow;

      let left = rect.right - width;
      left = Math.min(Math.max(left, VIEWPORT_GAP), window.innerWidth - width - VIEWPORT_GAP);

      setPopoverStyle({
        bottom: openUp ? window.innerHeight - rect.top + 8 : undefined,
        left,
        maxHeight: Math.max(96, (openUp ? spaceAbove : spaceBelow) - 8),
        position: "fixed",
        top: openUp ? undefined : rect.bottom + 8,
        width,
        zIndex: 1000,
      });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
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
        ref={triggerRef}
        role="button"
        tabIndex={0}
      >
        <HelpCircle aria-hidden="true" size={14} />
      </span>
      {open && typeof document !== "undefined"
        ? createPortal(
            <span
              className="block overflow-y-auto rounded-xl border bg-surface-container-lowest p-3 text-left shadow-elevated product-scrollbar"
              id={id}
              role="dialog"
              style={popoverStyle}
            >
              {title ? <span className="block text-sm font-semibold text-foreground">{title}</span> : null}
              <span className={cn("block text-xs leading-5 text-muted-foreground", title ? "mt-1" : "")}>
                {children}
              </span>
            </span>,
            document.body,
          )
        : null}
    </span>
  );
}
