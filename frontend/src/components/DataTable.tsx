"use client";

import { ArrowDownUp, Columns3, Filter, Search } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
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
  title
}: {
  columns: TableColumn<T>[];
  emptyLabel: string;
  rows: T[];
  searchLabel: string;
  title: string;
}) {
  const [query, setQuery] = useState("");
  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return rows;
    }

    return rows.filter((row) =>
      columns.some((column) => {
        const value = column.value?.(row);
        return value?.toLowerCase().includes(normalizedQuery);
      })
    );
  }, [columns, query, rows]);

  return (
    <section className="overflow-hidden rounded-lg border bg-panel" aria-labelledby={`${title}-title`}>
      <div className="flex flex-col gap-3 border-b px-4 py-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 id={`${title}-title`} className="text-sm font-semibold">
            {title}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {filteredRows.length} of {rows.length} records in current view
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="relative min-w-64">
            <span className="sr-only">{searchLabel}</span>
            <Search aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={15} />
            <Input className="pl-9" placeholder={searchLabel} value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
          <Button size="sm" variant="secondary">
            <Filter aria-hidden="true" />
            Filters
          </Button>
          <Button aria-label="Configure visible columns" size="icon" variant="secondary">
            <Columns3 aria-hidden="true" />
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto product-scrollbar">
        <table className="w-full min-w-[720px] text-left text-[13px]">
          <thead className="bg-muted/55 text-muted-foreground">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className="px-4 py-2.5 font-medium">
                  <span className={column.align === "right" ? "flex justify-end gap-1.5" : "flex items-center gap-1.5"}>
                    {column.header}
                    {column.value ? <ArrowDownUp aria-hidden="true" size={12} /> : null}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredRows.map((row, index) => (
              <tr key={index} className="transition-colors hover:bg-muted/35">
                {columns.map((column) => (
                  <td key={column.key} className={column.align === "right" ? "px-4 py-3 text-right" : "px-4 py-3"}>
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
            {filteredRows.length === 0 ? (
              <tr>
                <td className="px-4 py-10 text-center text-muted-foreground" colSpan={columns.length}>
                  <Badge>{query ? "No matching records" : emptyLabel}</Badge>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
