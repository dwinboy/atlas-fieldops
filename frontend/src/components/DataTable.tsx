"use client";

import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { ArrowDownUp, ChevronLeft, ChevronRight, Inbox, Maximize2, Minimize2, MoreVertical, Search, SearchX, X } from "lucide-react";
import type { ReactNode } from "react";
import { isValidElement, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";
import { ActionMenu } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type TableColumn<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  align?: "left" | "right";
  sortValue?: (row: T) => string | number;
  value?: (row: T) => string;
};

const PAGE_SIZE = 25;
const FULLSCREEN_PAGE_SIZE = 100;

export type TableEmptyAction = {
  label: string;
  onClick: () => void;
};

export type TableSelection<T> = {
  isSelectable?: (row: T) => boolean;
  isSelected: (row: T) => boolean;
  onToggle: (row: T, checked: boolean) => void;
  onToggleAll: (rows: T[], checked: boolean) => void;
};

function isActionsColumn<T>(column: TableColumn<T>) {
  return column.key.toLowerCase() === "actions" || column.header.toLowerCase() === "actions";
}

function containsActionMenu(node: ReactNode): boolean {
  if (Array.isArray(node)) return node.some(containsActionMenu);
  if (!isValidElement<{ children?: ReactNode }>(node)) return false;
  if (node.type === ActionMenu) return true;
  return containsActionMenu(node.props.children);
}

function hasVisibleActionContent(node: ReactNode): boolean {
  if (node === null || node === undefined || typeof node === "boolean") return false;
  if (Array.isArray(node)) return node.some(hasVisibleActionContent);
  if (typeof node === "string") return node.trim().length > 0;
  return true;
}

function TableActionDropdown({ children }: { children: ReactNode }) {
  if (!hasVisibleActionContent(children)) return null;
  if (containsActionMenu(children)) return children;
  return (
    <DropdownMenuPrimitive.Root>
      <DropdownMenuPrimitive.Trigger asChild>
        <Button
          aria-label="Open row actions"
          className="h-8 w-8 px-0"
          onClick={(event) => event.stopPropagation()}
          size="icon"
          title="Open row actions"
          variant="ghost"
        >
          <MoreVertical aria-hidden="true" />
        </Button>
      </DropdownMenuPrimitive.Trigger>
      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          align="end"
          className="z-50 min-w-[190px] overflow-hidden rounded-xl border bg-panel p-1 shadow-elevated data-[state=open]:animate-in data-[state=closed]:animate-out"
          onClick={(event) => event.stopPropagation()}
          sideOffset={6}
        >
          <div className="flex min-w-44 flex-col gap-1 [&>div]:flex [&>div]:flex-col [&>div]:items-stretch [&>div]:gap-1 [&_button]:w-full [&_button]:justify-start">
            {children}
          </div>
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  );
}

export function DataTable<T>({
  columns,
  emptyAction,
  emptyDescription,
  emptyLabel,
  rows,
  searchLabel,
  selection,
  title,
}: {
  columns: TableColumn<T>[];
  emptyAction?: TableEmptyAction;
  emptyDescription?: string;
  emptyLabel: string;
  rows: T[];
  searchLabel: string;
  selection?: TableSelection<T>;
  title: string;
}) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(
    columns.find((column) => column.value || column.sortValue)?.key ?? null,
  );
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(0);
  const [activeRowIndex, setActiveRowIndex] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!isFullscreen) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsFullscreen(false);
    };
    window.addEventListener("keydown", handleKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [isFullscreen]);
  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const matchingRows = normalizedQuery
      ? rows.filter((row) =>
          columns.some((column) => {
            const value = column.value?.(row);
            return value?.toLowerCase().includes(normalizedQuery);
          }),
        )
      : rows;
    const sortedColumn = columns.find(
      (column) => column.key === sortKey && (column.value || column.sortValue),
    );
    if (!sortedColumn) {
      return matchingRows;
    }
    const getSortValue = sortedColumn.sortValue ?? sortedColumn.value;
    return [...matchingRows].sort((left, right) => {
      const leftValue = getSortValue?.(left) ?? "";
      const rightValue = getSortValue?.(right) ?? "";
      const comparison =
        typeof leftValue === "number" && typeof rightValue === "number"
          ? leftValue - rightValue
          : String(leftValue).localeCompare(String(rightValue));
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [columns, query, rows, sortDirection, sortKey]);

  // Load more rows per page in full screen so the larger canvas is filled with
  // data instead of capping at the compact page size and forcing pagination.
  const pageSize = isFullscreen ? FULLSCREEN_PAGE_SIZE : PAGE_SIZE;
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const pagedRows = useMemo(
    () => filteredRows.slice(safePage * pageSize, safePage * pageSize + pageSize),
    [filteredRows, pageSize, safePage],
  );

  useEffect(() => {
    setPage(0);
  }, [query, sortKey, sortDirection]);

  useEffect(() => {
    setActiveRowIndex(null);
  }, [query, safePage, sortDirection, sortKey]);

  const selectablePagedRows = selection
    ? pagedRows.filter((row) => selection.isSelectable?.(row) ?? true)
    : [];
  const allPagedSelected =
    selectablePagedRows.length > 0 &&
    selectablePagedRows.every((row) => selection?.isSelected(row));
  const smartTableMinWidth = Math.max(
    920,
    columns.reduce((width, column) => width + (isActionsColumn(column) ? 92 : 180), selection ? 44 : 0),
  );

  const renderCellContent = (column: TableColumn<T>, row: T) => {
    const rendered = column.render(row);
    return isActionsColumn(column) ? <TableActionDropdown>{rendered}</TableActionDropdown> : rendered;
  };

  const EmptyIcon = query ? SearchX : Inbox;
  const emptyContent = (
    <div className="mx-auto flex max-w-sm flex-col items-center gap-3 rounded-2xl border border-dashed border-border-subtle bg-surface-container-lowest p-6 text-center">
      <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
        <EmptyIcon aria-hidden="true" size={20} strokeWidth={1.5} />
      </span>
      <div className="space-y-1">
        <p className="font-medium text-foreground">
          {query ? "No matches found" : emptyLabel}
        </p>
        <p className="text-sm text-muted-foreground">
          {query
            ? "Try a different search term or clear the search."
            : emptyDescription ??
              "New records will appear here when they are available."}
        </p>
      </div>
      {!query && emptyAction ? (
        <Button
          className="mt-1"
          onClick={emptyAction.onClick}
          size="sm"
          type="button"
        >
          {emptyAction.label}
        </Button>
      ) : null}
    </div>
  );

  const content = (
    <>
      {isFullscreen ? (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-40 bg-foreground/30 backdrop-blur-sm"
          onClick={() => setIsFullscreen(false)}
        />
      ) : null}
      <section
        className={cn(
          "surface-premium overflow-hidden rounded-xl",
          isFullscreen && "fixed inset-2 z-50 flex flex-col sm:inset-4",
        )}
        aria-labelledby={`${title}-title`}
      >
      <div className="flex flex-col gap-2 border-b bg-muted/25 px-3 py-2.5 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 id={`${title}-title`} className="text-xs font-semibold">
            {title}
          </h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Showing {filteredRows.length} of {rows.length}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="relative w-full sm:min-w-64">
            <span className="sr-only">{searchLabel}</span>
            <Search
              aria-hidden="true"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              size={15}
            />
            <Input
              className={cn("h-8 pl-9 text-xs", query && "pr-8")}
              placeholder={searchLabel}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            {query ? (
              <button
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35"
                onClick={() => setQuery("")}
                type="button"
              >
                <X aria-hidden="true" size={14} />
              </button>
            ) : null}
          </label>
          <Button
            aria-label={isFullscreen ? "Exit full screen" : "Open full screen"}
            className="h-8 w-8 shrink-0 px-0"
            onClick={() => setIsFullscreen((value) => !value)}
            size="sm"
            title={isFullscreen ? "Exit full screen" : "Open full screen"}
            variant="secondary"
          >
            {isFullscreen ? <Minimize2 aria-hidden="true" /> : <Maximize2 aria-hidden="true" />}
          </Button>
        </div>
      </div>

      <div className={cn("divide-y md:hidden", isFullscreen && "min-h-0 flex-1 overflow-y-auto product-scrollbar")}>
        {pagedRows.map((row, index) => {
          const rowIndex = safePage * pageSize + index;
          const active = activeRowIndex === rowIndex;
          return (
          <article
            data-selected={active ? "true" : undefined}
            className={cn(
              "space-y-3 px-4 py-4 transition-colors",
              active && "bg-primary/10 ring-1 ring-inset ring-primary/25",
            )}
            key={index}
            onClick={() => setActiveRowIndex(rowIndex)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setActiveRowIndex(rowIndex);
              }
            }}
            tabIndex={0}
          >
            {selection && (selection.isSelectable?.(row) ?? true) ? (
              <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <input
                  checked={selection.isSelected(row)}
                  onChange={(event) => selection.onToggle(row, event.target.checked)}
                  type="checkbox"
                />
                Select record
              </label>
            ) : null}
            {columns.map((column) => (
              <div className="grid gap-1" key={column.key}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {column.header}
                </p>
                <div
                  className={cn(
                    "min-w-0 break-words text-sm text-foreground",
                    isActionsColumn(column) && "flex justify-start",
                  )}
                >
                  {renderCellContent(column, row)}
                </div>
              </div>
            ))}
          </article>
          );
        })}
        {filteredRows.length === 0 ? (
          <div className="px-4 py-10 text-center text-muted-foreground">
            {emptyContent}
          </div>
        ) : null}
      </div>

      {filteredRows.length === 0 ? (
        <div className="hidden px-4 py-12 md:block">{emptyContent}</div>
      ) : (
      <div
        className={cn(
          "hidden overflow-x-auto overflow-y-auto overscroll-contain product-scrollbar md:block",
          isFullscreen ? "min-h-0 flex-1" : "max-h-[68vh]",
        )}
      >
        <table className="w-full border-separate border-spacing-0 text-left text-xs" style={{ minWidth: smartTableMinWidth }}>
          <thead className="sticky top-0 z-20 bg-muted text-muted-foreground shadow-[0_1px_0_hsl(var(--border)),0_8px_12px_-12px_rgba(13,38,28,0.35)]">
            <tr>
              {selection ? (
                <th className="sticky left-0 z-20 w-10 border-b border-r border-border/60 bg-muted px-2.5 py-2">
                  <input
                    aria-label="Select all rows on this page"
                    checked={allPagedSelected}
                    disabled={!selectablePagedRows.length}
                    onChange={(event) =>
                      selection.onToggleAll(selectablePagedRows, event.target.checked)
                    }
                    type="checkbox"
                  />
                </th>
              ) : null}
              {columns.map((column, columnIndex) => (
                <th
                  key={column.key}
                  className={cn(
                    "whitespace-nowrap border-b border-r border-border/60 bg-muted px-2.5 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground",
                    isActionsColumn(column) && "w-16 px-1.5 text-center",
                    columnIndex === 0 &&
                      !selection &&
                      "sticky left-0 z-20 shadow-[8px_0_12px_-10px_rgba(13,38,28,0.22)]",
                    columnIndex === columns.length - 1 &&
                      columns.length > 1 &&
                      "sticky right-0 z-20 border-l border-border/60 shadow-[-8px_0_12px_-10px_rgba(13,38,28,0.22)]",
                  )}
                >
                  {column.value || column.sortValue ? (
                    <button
                      className={
                        column.align === "right"
                        ? "ml-auto flex justify-end gap-1.5 rounded-md px-1 py-0.5 transition hover:bg-muted hover:text-foreground"
                          : "flex items-center gap-1.5 rounded-md px-1 py-0.5 transition hover:bg-muted hover:text-foreground"
                      }
                      onClick={() => {
                        if (sortKey === column.key) {
                          setSortDirection((value) =>
                            value === "asc" ? "desc" : "asc",
                          );
                          return;
                        }
                        setSortKey(column.key);
                        setSortDirection("asc");
                      }}
                      type="button"
                    >
                      {column.header}
                      <ArrowDownUp aria-hidden="true" size={12} />
                    </button>
                  ) : (
                    <span
                      className={
                        column.align === "right"
                          ? "flex justify-end"
                          : isActionsColumn(column)
                            ? "flex justify-center"
                          : "flex items-center"
                      }
                    >
                      {column.header}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pagedRows.map((row, index) => {
              const rowIndex = safePage * pageSize + index;
              const active = activeRowIndex === rowIndex;
              return (
              <tr
                aria-selected={active}
                className={cn(
                  "group cursor-pointer transition-colors hover:bg-muted/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                  active && "bg-primary/10 shadow-[inset_3px_0_0_hsl(var(--primary))]",
                )}
                key={index}
                onClick={() => setActiveRowIndex(rowIndex)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setActiveRowIndex(rowIndex);
                  }
                }}
                tabIndex={0}
              >
                {selection ? (
                  <td className="w-10 border-b border-r border-border/60 px-2.5 py-2 align-top">
                    {(selection.isSelectable?.(row) ?? true) ? (
                      <input
                        aria-label="Select row"
                        checked={selection.isSelected(row)}
                        onChange={(event) => selection.onToggle(row, event.target.checked)}
                        type="checkbox"
                      />
                    ) : null}
                  </td>
                ) : null}
                {columns.map((column, columnIndex) => (
                  <td
                    key={column.key}
                    className={cn(
                      "max-w-72 border-b border-r border-border/60 px-2.5 py-2 align-top",
                      isActionsColumn(column) && "w-16 max-w-16 px-1.5 text-center",
                      column.align === "right" && "text-right tabular-nums",
                      columnIndex === 0 &&
                        !selection &&
                        cn(
                          "sticky left-0 z-[5] border-r border-border/60 bg-panel shadow-[8px_0_12px_-10px_rgba(13,38,28,0.16)] transition-colors group-hover:bg-muted/35",
                          active && "bg-primary/10",
                        ),
                      columnIndex === columns.length - 1 &&
                        columns.length > 1 &&
                        cn(
                          "sticky right-0 z-[5] border-l border-border/60 bg-panel shadow-[-8px_0_12px_-10px_rgba(13,38,28,0.16)] transition-colors group-hover:bg-muted/35",
                          active && "bg-primary/10",
                        ),
                    )}
                  >
                    <div
                      className={cn(
                        "min-w-0 truncate",
                        isActionsColumn(column) && "flex justify-center",
                      )}
                      title={column.value?.(row)}
                    >
                      {renderCellContent(column, row)}
                    </div>
                  </td>
                ))}
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      )}

      {filteredRows.length > pageSize ? (
        <div className="flex flex-col gap-2 border-t bg-muted/15 px-3 py-2.5 text-[11px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            Showing {safePage * pageSize + 1}–
            {Math.min((safePage + 1) * pageSize, filteredRows.length)} of{" "}
            {filteredRows.length}
          </p>
          <div className="flex items-center gap-1.5">
            <Button
              disabled={safePage === 0}
              onClick={() => setPage((value) => Math.max(0, value - 1))}
              size="sm"
              variant="secondary"
            >
              <ChevronLeft aria-hidden="true" />
              Previous
            </Button>
            <span className="px-1 font-medium text-foreground">
              Page {safePage + 1} of {pageCount}
            </span>
            <Button
              disabled={safePage >= pageCount - 1}
              onClick={() => setPage((value) => Math.min(pageCount - 1, value + 1))}
              size="sm"
              variant="secondary"
            >
              Next
              <ChevronRight aria-hidden="true" />
            </Button>
          </div>
        </div>
      ) : null}
      </section>
    </>
  );

  // When fullscreen, portal to <body> so the fixed overlay escapes any ancestor
  // with a CSS transform (e.g. the page transition wrapper), which would
  // otherwise trap `position: fixed` and shrink the view to a few rows.
  return isFullscreen && typeof document !== "undefined"
    ? createPortal(content, document.body)
    : content;
}
