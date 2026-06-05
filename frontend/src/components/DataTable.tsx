"use client";

import { ArrowDownUp, Search, X } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type TableColumn<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  align?: "left" | "right";
  value?: (row: T) => string;
};

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
    columns.find((column) => column.value)?.key ?? null,
  );
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
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
      (column) => column.key === sortKey && column.value,
    );
    if (!sortedColumn) {
      return matchingRows;
    }
    return [...matchingRows].sort((left, right) => {
      const leftValue = sortedColumn.value?.(left) ?? "";
      const rightValue = sortedColumn.value?.(right) ?? "";
      return sortDirection === "asc"
        ? leftValue.localeCompare(rightValue)
        : rightValue.localeCompare(leftValue);
    });
  }, [columns, query, rows, sortDirection, sortKey]);

  return (
    <section
      className="surface-premium overflow-hidden rounded-2xl"
      aria-labelledby={`${title}-title`}
    >
      <div className="flex flex-col gap-2.5 border-b bg-muted/25 px-4 py-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 id={`${title}-title`} className="text-[13px] font-semibold">
            {title}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
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
              className="pl-9"
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
        {filteredRows.map((row, index) => (
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

      <div className="hidden overflow-x-auto product-scrollbar md:block">
        <table className="w-full min-w-[680px] text-left text-[13px]">
          <thead className="sticky top-0 bg-muted/45 text-muted-foreground shadow-line backdrop-blur">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className="px-3.5 py-2 font-medium">
                  {column.value ? (
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
            {filteredRows.map((row, index) => (
              <tr key={index} className="transition-colors hover:bg-muted/35">
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={
                      column.align === "right"
                        ? "px-3.5 py-2.5 text-right"
                        : "px-3.5 py-2.5"
                    }
                  >
                    {column.render(row)}
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
    </section>
  );
}
