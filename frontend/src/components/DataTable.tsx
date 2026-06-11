"use client";

import { ArrowDownUp, ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
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

export function DataTable<T>({
  columns,
  emptyLabel,
  rows,
  searchLabel,
  title,
}: {
  columns: TableColumn<T>[];
  emptyLabel: string;
  rows: T[];
  searchLabel: string;
  title: string;
}) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(
    columns.find((column) => column.value || column.sortValue)?.key ?? null,
  );
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(0);
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

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pagedRows = useMemo(
    () => filteredRows.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE),
    [filteredRows, safePage],
  );

  useEffect(() => {
    setPage(0);
  }, [query, sortKey, sortDirection]);

  return (
    <section
      className="surface-premium overflow-hidden rounded-xl"
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
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="relative w-full sm:min-w-64">
            <span className="sr-only">{searchLabel}</span>
            <Search
              aria-hidden="true"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              size={15}
            />
            <Input
              className="h-8 pl-9 text-xs"
              placeholder={searchLabel}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          {query ? (
            <Button size="sm" variant="secondary" onClick={() => setQuery("")}>
              <X aria-hidden="true" />
              Clear
            </Button>
          ) : null}
        </div>
      </div>

      <div className="divide-y md:hidden">
        {pagedRows.map((row, index) => (
          <article className="space-y-3 px-4 py-4" key={index}>
            {columns.map((column) => (
              <div className="grid gap-1" key={column.key}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {column.header}
                </p>
                <div className="min-w-0 break-words text-sm text-foreground">
                  {column.render(row)}
                </div>
              </div>
            ))}
          </article>
        ))}
        {filteredRows.length === 0 ? (
          <div className="px-4 py-10 text-center text-muted-foreground">
            <div className="mx-auto max-w-sm rounded-2xl border border-dashed bg-muted/20 p-5">
              <p className="font-medium text-foreground">
                {query ? "No matches found" : emptyLabel}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {query
                  ? "Try a different search term or clear the search."
                  : "New records will appear here when they are available."}
              </p>
            </div>
          </div>
        ) : null}
      </div>

      <div className="hidden max-h-[68vh] overflow-auto product-scrollbar md:block">
        <table className="w-full min-w-[920px] text-left text-xs">
          <thead className="sticky top-0 z-20 bg-muted/45 text-muted-foreground shadow-line backdrop-blur">
            <tr>
              {columns.map((column, columnIndex) => (
                <th
                  key={column.key}
                  className={cn(
                    "whitespace-nowrap px-2.5 py-2 font-semibold",
                    columnIndex === 0 &&
                      "sticky left-0 z-10 border-r border-border/60 bg-muted/45 backdrop-blur",
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
          <tbody className="divide-y">
            {pagedRows.map((row, index) => (
              <tr key={index} className="group transition-colors hover:bg-muted/35">
                {columns.map((column, columnIndex) => (
                  <td
                    key={column.key}
                    className={cn(
                      "max-w-72 px-2.5 py-2 align-top",
                      column.align === "right" && "text-right tabular-nums",
                      columnIndex === 0 &&
                        "sticky left-0 z-[5] border-r border-border/60 bg-panel transition-colors group-hover:bg-muted/35",
                    )}
                  >
                    <div className="min-w-0 truncate" title={column.value?.(row)}>
                      {column.render(row)}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
            {filteredRows.length === 0 ? (
              <tr>
                <td
                  className="px-4 py-12 text-center text-muted-foreground"
                  colSpan={columns.length}
                >
                  <div className="mx-auto max-w-sm rounded-2xl border border-dashed bg-muted/20 p-5">
                    <p className="font-medium text-foreground">
                      {query ? "No matches found" : emptyLabel}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {query
                        ? "Try a different search term or clear the search."
                        : "New records will appear here when they are available."}
                    </p>
                  </div>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {filteredRows.length > PAGE_SIZE ? (
        <div className="flex flex-col gap-2 border-t bg-muted/15 px-3 py-2.5 text-[11px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            Showing {safePage * PAGE_SIZE + 1}–
            {Math.min((safePage + 1) * PAGE_SIZE, filteredRows.length)} of{" "}
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
  );
}
