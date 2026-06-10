"use client";

import { ArrowDownUp, ChevronLeft, ChevronRight, Columns3, Search, X } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type TableColumn<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  align?: "left" | "right";
  value?: (row: T) => string;
  defaultHidden?: boolean;
};

const PAGE_SIZES = [25, 50, 100] as const;

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
    columns.find((c) => c.value)?.key ?? null,
  );
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [pageSize, setPageSize] = useState<number>(25);
  const [page, setPage] = useState(1);
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(
    () => new Set(columns.filter((c) => c.defaultHidden).map((c) => c.key)),
  );
  const [columnsOpen, setColumnsOpen] = useState(false);

  const visibleColumns = useMemo(
    () => columns.filter((c) => !hiddenColumns.has(c.key)),
    [columns, hiddenColumns],
  );

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matched = q
      ? rows.filter((row) =>
          columns.some((c) => c.value?.(row)?.toLowerCase().includes(q)),
        )
      : rows;
    const sortCol = columns.find((c) => c.key === sortKey && c.value);
    if (!sortCol) return matched;
    return [...matched].sort((a, b) => {
      const av = sortCol.value?.(a) ?? "";
      const bv = sortCol.value?.(b) ?? "";
      return sortDirection === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }, [columns, query, rows, sortDirection, sortKey]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pageRows = filteredRows.slice(pageStart, pageStart + pageSize);

  function toggleColumn(key: string) {
    setHiddenColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
    setPage(1);
  }

  function handleQuery(v: string) {
    setQuery(v);
    setPage(1);
  }

  return (
    <section className="surface-premium overflow-hidden rounded-xl" aria-labelledby={`${title}-title`}>
      {/* Toolbar */}
      <div className="flex flex-col gap-2 border-b bg-muted/25 px-3 py-2.5 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 id={`${title}-title`} className="text-xs font-semibold">{title}</h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {filteredRows.length === rows.length
              ? `${rows.length.toLocaleString()} records`
              : `${filteredRows.length.toLocaleString()} of ${rows.length.toLocaleString()}`}
            {totalPages > 1 ? ` · Page ${safePage} of ${totalPages}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="relative min-w-48 flex-1">
            <span className="sr-only">{searchLabel}</span>
            <Search
              aria-hidden="true"
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
              size={14}
            />
            <Input
              className="h-8 pl-8 text-xs"
              placeholder={searchLabel}
              value={query}
              onChange={(e) => handleQuery(e.target.value)}
            />
          </label>
          {query ? (
            <Button size="sm" variant="secondary" onClick={() => handleQuery("")}>
              <X aria-hidden="true" />
              Clear
            </Button>
          ) : null}
          {/* Column visibility */}
          <div className="relative">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setColumnsOpen((v) => !v)}
              aria-expanded={columnsOpen}
              aria-label="Toggle column visibility"
            >
              <Columns3 aria-hidden="true" />
              Columns
              {hiddenColumns.size > 0 ? (
                <span className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                  {hiddenColumns.size}
                </span>
              ) : null}
            </Button>
            {columnsOpen ? (
              <div className="absolute right-0 top-full z-30 mt-1.5 w-48 rounded-xl border bg-panel shadow-elevated">
                <div className="border-b px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Visible columns
                  </p>
                </div>
                <ul className="max-h-64 overflow-y-auto p-1 product-scrollbar">
                  {columns.map((col) => (
                    <li key={col.key}>
                      <button
                        type="button"
                        onClick={() => toggleColumn(col.key)}
                        className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs hover:bg-muted/60"
                      >
                        <span
                          className={cn(
                            "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                            hiddenColumns.has(col.key)
                              ? "border-border bg-transparent"
                              : "border-primary bg-primary",
                          )}
                          aria-hidden="true"
                        >
                          {!hiddenColumns.has(col.key) ? (
                            <svg viewBox="0 0 10 8" className="h-2.5 w-2.5 text-primary-foreground" fill="none" stroke="currentColor" strokeWidth="1.8">
                              <polyline points="1,4 4,7 9,1" />
                            </svg>
                          ) : null}
                        </span>
                        <span className="truncate">{col.header}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="divide-y md:hidden">
        {pageRows.map((row, index) => (
          <article className="space-y-3 px-4 py-4" key={index}>
            {visibleColumns.map((col) => (
              <div className="grid gap-0.5" key={col.key}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {col.header}
                </p>
                <div className="min-w-0 break-words text-sm text-foreground">
                  {col.render(row)}
                </div>
              </div>
            ))}
          </article>
        ))}
        {pageRows.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <div className="mx-auto max-w-sm rounded-2xl border border-dashed bg-muted/20 p-6">
              <p className="font-medium text-foreground">{query ? "No matches found" : emptyLabel}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {query ? "Try a different search term or clear the search." : "New records will appear here when they are available."}
              </p>
            </div>
          </div>
        ) : null}
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto product-scrollbar md:block">
        <table className="w-full min-w-[720px] text-left text-xs">
          <thead className="sticky top-0 bg-muted/45 text-muted-foreground shadow-line backdrop-blur">
            <tr>
              {visibleColumns.map((col) => (
                <th key={col.key} className="whitespace-nowrap px-3 py-2 font-semibold">
                  {col.value ? (
                    <button
                      type="button"
                      onClick={() => handleSort(col.key)}
                      className={cn(
                        "flex items-center gap-1.5 rounded-md px-1 py-0.5 transition hover:bg-muted hover:text-foreground",
                        col.align === "right" && "ml-auto justify-end",
                      )}
                    >
                      {col.header}
                      <ArrowDownUp
                        aria-hidden="true"
                        size={11}
                        className={sortKey === col.key ? "text-primary" : "opacity-50"}
                      />
                    </button>
                  ) : (
                    <span className={cn("flex items-center", col.align === "right" && "justify-end")}>
                      {col.header}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {pageRows.map((row, index) => (
              <tr key={index} className="transition-colors hover:bg-muted/35">
                {visibleColumns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      "max-w-72 px-3 py-2 align-top",
                      col.align === "right" && "text-right",
                    )}
                  >
                    <div className="min-w-0 truncate">{col.render(row)}</div>
                  </td>
                ))}
              </tr>
            ))}
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length} className="px-4 py-12">
                  <div className="mx-auto max-w-sm rounded-2xl border border-dashed bg-muted/20 p-6 text-center">
                    <p className="font-medium text-foreground">{query ? "No matches found" : emptyLabel}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {query ? "Try a different search term or clear the search." : "New records will appear here when they are available."}
                    </p>
                  </div>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {filteredRows.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/20 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground">Rows per page</span>
            <Select
              value={String(pageSize)}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
            >
              {PAGE_SIZES.map((s) => (
                <option key={s} value={String(s)}>{s}</option>
              ))}
            </Select>
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => p - 1)}
              aria-label="Previous page"
            >
              <ChevronLeft aria-hidden="true" />
            </Button>
            {getPaginationRange(safePage, totalPages).map((item, i) =>
              item === "…" ? (
                <span key={`ellipsis-${i}`} className="px-1 text-[11px] text-muted-foreground">…</span>
              ) : (
                <button
                  key={item}
                  type="button"
                  onClick={() => setPage(item as number)}
                  className={cn(
                    "flex h-7 min-w-7 items-center justify-center rounded-lg px-1.5 text-[11px] font-medium transition-colors",
                    safePage === item
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                  aria-current={safePage === item ? "page" : undefined}
                >
                  {item}
                </button>
              ),
            )}
            <Button
              size="icon"
              variant="ghost"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              aria-label="Next page"
            >
              <ChevronRight aria-hidden="true" />
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function getPaginationRange(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "…", total];
  if (current >= total - 3) return [1, "…", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "…", current - 1, current, current + 1, "…", total];
}
