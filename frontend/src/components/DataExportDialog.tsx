"use client";

import { useQuery } from "@tanstack/react-query";
import { Download, FileSpreadsheet, Globe, MapPin } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal, ModalBody, ModalFooter } from "@/components/ui/modal";
import {
  downloadFormExport,
  getFormExportCapabilities,
  type ExportFormatOption,
} from "@/lib/api";

const KIND_GROUPS: { kind: ExportFormatOption["kind"]; title: string; icon: typeof Download; blurb: string }[] = [
  { kind: "tabular", title: "Tables & data", icon: FileSpreadsheet, blurb: "Open in Excel, Google Sheets, or any data tool." },
  { kind: "spatial", title: "Maps & GIS", icon: Globe, blurb: "Use in QGIS, ArcGIS, Google Earth, or Mapbox." },
  { kind: "points", title: "GPS devices", icon: MapPin, blurb: "Load onto handheld GPS units." },
];

/** Data-aware export dialog: shows only the formats a form's data actually supports, with the
 * geospatial and GPS options unlocked when the submissions contain location or boundary data. */
export function DataExportDialog({
  token,
  formId,
  formName,
  open,
  onClose,
}: {
  token: string | null;
  formId: string | null;
  formName?: string;
  open: boolean;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [excludedColumns, setExcludedColumns] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  const capabilitiesQuery = useQuery({
    queryKey: ["form-export-capabilities", token, formId],
    queryFn: () => getFormExportCapabilities(token ?? "", formId ?? ""),
    enabled: Boolean(open && token && formId),
  });

  const capabilities = capabilitiesQuery.data;
  const formats = capabilities?.formats ?? [];

  const allColumns = capabilities?.columns ?? [];
  const includedColumns = allColumns.filter((column) => !excludedColumns.has(column));

  async function handleDownload() {
    if (!token || !formId || !selected) return;
    setDownloading(true);
    setError("");
    // Send the field list only when the user has narrowed it; otherwise export every column.
    const fields = includedColumns.length && includedColumns.length !== allColumns.length ? includedColumns : undefined;
    try {
      await downloadFormExport(token, formId, selected, statusFilter || undefined, fields);
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Export failed. Try again.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title="Export data"
      description="Choose a format based on the data this form collects. Geospatial formats appear only when submissions include GPS points or boundaries."
    >
      <ModalBody>
        {capabilitiesQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Checking what this form’s data supports…</p>
        ) : capabilitiesQuery.isError ? (
          <p className="text-sm text-danger">Could not load export options. Try again.</p>
        ) : capabilities ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Badge tone="neutral">{capabilities.record_count} submission{capabilities.record_count === 1 ? "" : "s"}</Badge>
              {capabilities.has_points ? <Badge tone="accent">GPS points</Badge> : null}
              {capabilities.has_polygons ? <Badge tone="accent">Boundaries</Badge> : null}
              {capabilities.has_media ? <Badge tone="accent">Media files</Badge> : null}
            </div>

            {capabilities.statuses.length > 1 ? (
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                Scope:
                <select
                  className="rounded-lg border bg-background px-2 py-1 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/35"
                  onChange={(event) => setStatusFilter(event.target.value)}
                  value={statusFilter}
                >
                  <option value="">All statuses</option>
                  {capabilities.statuses.map((status) => (
                    <option key={status} value={status}>
                      {status.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            {allColumns.length > 0 ? (
              <details className="rounded-xl border bg-background p-3">
                <summary className="cursor-pointer text-sm font-medium">
                  Columns ({includedColumns.length} of {allColumns.length})
                </summary>
                <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
                  {allColumns.map((column) => (
                    <label className="flex items-center gap-2 text-xs text-muted-foreground" key={column}>
                      <input
                        checked={!excludedColumns.has(column)}
                        onChange={(event) =>
                          setExcludedColumns((current) => {
                            const next = new Set(current);
                            if (event.target.checked) next.delete(column);
                            else next.add(column);
                            return next;
                          })
                        }
                        type="checkbox"
                      />
                      <span className="truncate" title={column}>{column}</span>
                    </label>
                  ))}
                </div>
              </details>
            ) : null}

            {KIND_GROUPS.map((group) => {
              const groupFormats = formats.filter((format) => format.kind === group.kind);
              if (groupFormats.length === 0) return null;
              const GroupIcon = group.icon;
              return (
                <section key={group.kind}>
                  <div className="flex items-center gap-2">
                    <GroupIcon aria-hidden className="text-primary" size={15} />
                    <h3 className="text-sm font-semibold">{group.title}</h3>
                    <span className="text-xs text-muted-foreground">— {group.blurb}</span>
                  </div>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {groupFormats.map((format) => {
                      const isSelected = selected === format.id;
                      return (
                        <button
                          aria-pressed={isSelected}
                          className={
                            "rounded-xl border p-3 text-left transition " +
                            (!format.available
                              ? "cursor-not-allowed border-dashed opacity-60"
                              : isSelected
                                ? "border-primary bg-primary/5"
                                : "hover:border-primary/40 hover:bg-muted")
                          }
                          disabled={!format.available}
                          key={format.id}
                          onClick={() => setSelected(format.id)}
                          type="button"
                        >
                          <p className="text-sm font-medium">{format.label}</p>
                          <p className="mt-1 text-xs leading-5 text-muted-foreground">
                            {format.available ? format.hint : format.reason}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </section>
              );
            })}
            {error ? <p className="text-sm text-danger">{error}</p> : null}
          </div>
        ) : null}
      </ModalBody>
      <ModalFooter>
        <span className="mr-auto text-xs text-muted-foreground">
          {formName ? `Exporting: ${formName}` : ""}
        </span>
        <Button onClick={onClose} variant="secondary" type="button">
          Cancel
        </Button>
        <Button disabled={!selected || downloading} onClick={handleDownload} type="button" variant="primary">
          <Download aria-hidden size={15} />
          {downloading ? "Preparing…" : "Download"}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
