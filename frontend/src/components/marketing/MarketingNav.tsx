"use client";

import { ChevronDown, Menu, X } from "lucide-react";
import Link from "next/link";
import { Fragment, useEffect, useRef, useState } from "react";

import { AtlasFieldOpsLogo } from "@/components/brand/AtlasFieldOpsLogo";
import { Button } from "@/components/ui/button";
import { NAV_CONFIG, type NavMenu } from "@/lib/marketing/nav-config";
import { cn } from "@/lib/utils";

const OPEN_DELAY = 150;
const CLOSE_DELAY = 200;

export function MarketingNav() {
  const [openId, setOpenId] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileExpandedId, setMobileExpandedId] = useState<string | null>(null);

  const navRef = useRef<HTMLDivElement>(null);
  const triggerRefs = useRef<Record<string, HTMLElement | null>>({});
  const panelRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const openTimerRef = useRef<number | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  function clearTimers() {
    if (openTimerRef.current) {
      window.clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }

  function scheduleClose() {
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = window.setTimeout(() => setOpenId(null), CLOSE_DELAY);
  }

  function handleTriggerEnter(id: string) {
    clearTimers();
    if (openId === null) {
      openTimerRef.current = window.setTimeout(() => setOpenId(id), OPEN_DELAY);
    } else if (openId !== id) {
      setOpenId(id);
    }
  }

  function handleTriggerClick(id: string) {
    clearTimers();
    setOpenId((current) => (current === id ? null : id));
  }

  function handlePanelEnter() {
    clearTimers();
  }

  function handleTopKeyDown(event: React.KeyboardEvent, menu: NavMenu, index: number) {
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      const direction = event.key === "ArrowRight" ? 1 : -1;
      const next = (index + direction + NAV_CONFIG.length) % NAV_CONFIG.length;
      const nextMenu = NAV_CONFIG[next];
      triggerRefs.current[nextMenu.id]?.focus();
      return;
    }
    if (event.key === "ArrowDown" && menu.sections) {
      event.preventDefault();
      clearTimers();
      setOpenId(menu.id);
      requestAnimationFrame(() => {
        const panel = panelRefs.current[menu.id];
        panel?.querySelector<HTMLElement>("[data-nav-link]")?.focus();
      });
    }
  }

  function handlePanelKeyDown(event: React.KeyboardEvent, menuId: string) {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    const panel = panelRefs.current[menuId];
    if (!panel) return;
    const links = Array.from(panel.querySelectorAll<HTMLElement>("[data-nav-link]"));
    const currentIndex = links.indexOf(document.activeElement as HTMLElement);
    if (currentIndex === -1) return;
    event.preventDefault();
    const direction = event.key === "ArrowDown" ? 1 : -1;
    const next = (currentIndex + direction + links.length) % links.length;
    links[next]?.focus();
  }

  // Close on outside click
  useEffect(() => {
    if (!openId) return;
    function onPointerDown(event: PointerEvent) {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setOpenId(null);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [openId]);

  // Close on Escape, return focus to trigger
  useEffect(() => {
    if (!openId) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && openId) {
        const id = openId;
        setOpenId(null);
        triggerRefs.current[id]?.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [openId]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => clearTimers();
  }, []);

  // Mobile drawer: body scroll lock
  useEffect(() => {
    if (!mobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileOpen]);

  // Mobile drawer: focus management, Escape, focus trap
  useEffect(() => {
    if (mobileOpen) {
      closeButtonRef.current?.focus();
    }
    if (!mobileOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileOpen(false);
        hamburgerRef.current?.focus();
        return;
      }
      if (event.key === "Tab" && drawerRef.current) {
        const focusables = Array.from(
          drawerRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'),
        ).filter((element) => element.offsetParent !== null);
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  function closeMobile() {
    setMobileOpen(false);
  }

  return (
    <>
      {/* Desktop */}
      <div className="hidden lg:flex lg:items-center lg:gap-1" ref={navRef}>
        <nav aria-label="Primary" className="flex items-center gap-1">
          {NAV_CONFIG.map((menu, index) => {
            if (!menu.sections) {
              return (
                <Link
                  className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  href={menu.href ?? "/"}
                  key={menu.id}
                  ref={(element) => {
                    triggerRefs.current[menu.id] = element;
                  }}
                  onKeyDown={(event) => handleTopKeyDown(event, menu, index)}
                >
                  {menu.label}
                </Link>
              );
            }

            const isOpen = openId === menu.id;

            return (
              <Fragment key={menu.id}>
                <button
                  aria-controls={`mega-panel-${menu.id}`}
                  aria-expanded={isOpen}
                  aria-haspopup="true"
                  className={cn(
                    "flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    isOpen ? "text-primary" : "text-muted-foreground hover:text-foreground",
                  )}
                  onClick={() => handleTriggerClick(menu.id)}
                  onKeyDown={(event) => handleTopKeyDown(event, menu, index)}
                  onMouseEnter={() => handleTriggerEnter(menu.id)}
                  onMouseLeave={scheduleClose}
                  ref={(element) => {
                    triggerRefs.current[menu.id] = element;
                  }}
                  type="button"
                >
                  {menu.label}
                  <ChevronDown
                    aria-hidden="true"
                    className={cn("transition-transform duration-200", isOpen && "rotate-180")}
                    size={16}
                  />
                </button>
                <MegaPanel
                  isOpen={isOpen}
                  menu={menu}
                  onClose={() => setOpenId(null)}
                  onMouseEnter={handlePanelEnter}
                  onMouseLeave={scheduleClose}
                  onKeyDown={(event) => handlePanelKeyDown(event, menu.id)}
                  panelRef={(element) => {
                    panelRefs.current[menu.id] = element;
                  }}
                />
              </Fragment>
            );
          })}
        </nav>
        <div className="ml-2 flex items-center gap-2">
          <Link
            className="rounded-md px-2 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            href="/login"
          >
            Log In
          </Link>
          <Button asChild variant="primary">
            <Link href="/signup">Get Started</Link>
          </Button>
        </div>
      </div>

      {/* Mobile hamburger */}
      <button
        aria-controls="mobile-nav-drawer"
        aria-expanded={mobileOpen}
        aria-label="Open navigation"
        className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border bg-surface-container-lowest text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
        onClick={() => setMobileOpen(true)}
        ref={hamburgerRef}
        type="button"
      >
        <Menu aria-hidden="true" size={18} />
      </button>

      {/* Mobile drawer */}
      <div className={cn("fixed inset-0 z-50 lg:hidden", !mobileOpen && "pointer-events-none")}>
        <div
          aria-hidden="true"
          className={cn("absolute inset-0 bg-foreground/40 transition-opacity duration-200", mobileOpen ? "opacity-100" : "opacity-0")}
          onClick={closeMobile}
        />
        <div
          aria-label="Mobile navigation"
          aria-modal="true"
          className={cn(
            "absolute inset-y-0 right-0 flex w-[86vw] max-w-sm flex-col bg-background shadow-elevated transition-transform duration-200 ease-out motion-reduce:transition-none",
            mobileOpen ? "translate-x-0" : "translate-x-full",
          )}
          id="mobile-nav-drawer"
          ref={drawerRef}
          role="dialog"
        >
          <div className="flex items-center justify-between border-b border-border p-4">
            <span className="flex items-center gap-2 font-semibold text-foreground">
              <AtlasFieldOpsLogo size={44} />
              Atlas FieldOps
            </span>
            <button
              aria-label="Close navigation"
              className="rounded-md border border-border p-2 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={closeMobile}
              ref={closeButtonRef}
              type="button"
            >
              <X aria-hidden="true" size={18} />
            </button>
          </div>
          <nav aria-label="Mobile navigation" className="flex-1 overflow-y-auto p-4">
            <ul className="space-y-1">
              {NAV_CONFIG.map((menu) => {
                if (!menu.sections) {
                  return (
                    <li key={menu.id}>
                      <Link
                        className="block rounded-lg px-3 py-3 text-base font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        href={menu.href ?? "/"}
                        onClick={closeMobile}
                      >
                        {menu.label}
                      </Link>
                    </li>
                  );
                }

                const expanded = mobileExpandedId === menu.id;

                return (
                  <li key={menu.id}>
                    <button
                      aria-controls={`mobile-section-${menu.id}`}
                      aria-expanded={expanded}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-3 text-left text-base font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => setMobileExpandedId((current) => (current === menu.id ? null : menu.id))}
                      type="button"
                    >
                      {menu.label}
                      <ChevronDown
                        aria-hidden="true"
                        className={cn("transition-transform duration-200", expanded && "rotate-180")}
                        size={18}
                      />
                    </button>
                    <ul className={cn("space-y-0.5 pb-2 pl-3", expanded ? "block" : "hidden")} id={`mobile-section-${menu.id}`}>
                      {menu.sections.flatMap((section) => section.links).map((link) => (
                        <li key={link.href}>
                          <Link
                            className="block rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            href={link.href}
                            onClick={closeMobile}
                          >
                            {link.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </li>
                );
              })}
              <li className="mt-2 border-t border-border pt-2">
                <Link
                  className="block rounded-lg px-3 py-3 text-base font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  href="/login"
                  onClick={closeMobile}
                >
                  Log In
                </Link>
              </li>
            </ul>
          </nav>
          <div className="border-t border-border p-4">
            <Button asChild className="w-full" variant="primary">
              <Link href="/signup" onClick={closeMobile}>
                Get Started
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

function MegaPanel({
  isOpen,
  menu,
  onClose,
  onKeyDown,
  onMouseEnter,
  onMouseLeave,
  panelRef,
}: {
  isOpen: boolean;
  menu: NavMenu;
  onClose: () => void;
  onKeyDown: (event: React.KeyboardEvent) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  panelRef: (element: HTMLDivElement | null) => void;
}) {
  if (!menu.sections) return null;

  return (
    <div
      aria-hidden={!isOpen}
      className={cn(
        "absolute inset-x-0 top-full z-40 transition-all duration-200 ease-out motion-reduce:transition-none motion-reduce:transform-none",
        isOpen ? "visible translate-y-0 opacity-100" : "invisible -translate-y-2 opacity-0 pointer-events-none",
      )}
      id={`mega-panel-${menu.id}`}
      onKeyDown={onKeyDown}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      ref={panelRef}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-b-xl border border-t-[3px] border-border border-t-primary bg-surface-container-lowest shadow-elevated">
          <div
            className={cn(
              "grid gap-8 p-8 lg:gap-10 lg:p-10",
              menu.sections.length === 3 ? "lg:grid-cols-[repeat(3,1fr)_280px]" : "lg:grid-cols-[repeat(2,1fr)_280px]",
            )}
          >
            {menu.sections.map((section) => (
              <div key={section.heading}>
                <p className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                  {section.heading}
                </p>
                <ul className="mt-3 space-y-1">
                  {section.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        className="group block rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        data-nav-link
                        href={link.href}
                        onClick={onClose}
                        tabIndex={isOpen ? 0 : -1}
                      >
                        <p className="text-[14px] font-medium text-foreground transition-colors group-hover:text-primary">
                          {link.title}
                        </p>
                        <p className="mt-0.5 text-[13px] text-muted-foreground">{link.description}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {menu.ctaCard ? (
              <div className="rounded-xl border border-border bg-muted/40 p-5">
                <p className="text-heading-sm font-semibold text-foreground">{menu.ctaCard.heading}</p>
                <p className="mt-2 text-small text-muted-foreground">{menu.ctaCard.text}</p>
                <Button asChild className="mt-4 w-full" variant="primary">
                  <Link data-nav-link href={menu.ctaCard.cta.href} onClick={onClose} tabIndex={isOpen ? 0 : -1}>
                    {menu.ctaCard.cta.label}
                  </Link>
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
