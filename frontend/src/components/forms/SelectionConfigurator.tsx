import { FileDown, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { HelpHint } from "@/components/ui/help-hint";
import { Input, Select } from "@/components/ui/input";
import { type FormDatasetSummary } from "@/lib/api";
import { type FormField, type SelectionAutofill, type SelectionFilter } from "@/lib/forms";
import { cn } from "@/lib/utils";

/**
 * Configures where a selectable question's answers come from. The `source` is the parent choice:
 * Static options (the field's own list), From dataset (a reference list / uploaded spreadsheet with
 * display/value/search columns + filters + cascade), or Linked records (live entities or another
 * form's submissions, with relationship filters). Writes the unified `field.selection`.
 */
/** Plain-language description of a selection config, so a builder understands exactly what the
 * officer will see without reading the JSON. */
function describeSelection(
  selection: NonNullable<FormField["selection"]>,
  labelFor: (variable: string) => string,
  forms: { id: string; name: string }[],
): string {
  if (selection.source === "static") return "Officers pick from the fixed options list.";
  const parts: string[] = [];
  if (selection.source === "question") {
    parts.push(
      `Options come from the answers to “${selection.fromQuestionVariable ? labelFor(selection.fromQuestionVariable) : "(pick a question)"}”`,
    );
    if (selection.allowMultiple) parts.push("multiple can be selected");
    return `${parts.join(", ")}.`;
  }
  if (selection.source === "dataset") {
    parts.push(`Shows rows from dataset “${selection.datasetId || "(none)"}”`);
    if (selection.displayColumn) parts.push(`displaying ${selection.displayColumn}`);
  } else {
    const formName = forms.find((form) => form.id === selection.recordFormId)?.name;
    parts.push(
      selection.recordSource === "form"
        ? `Shows records from form “${formName || selection.recordFormId || "(pick a form)"}”`
        : `Shows registered records${selection.entityType ? ` of type “${selection.entityType}”` : ""}`,
    );
  }
  if (selection.cascadeFromVariable) parts.push(`children of “${labelFor(selection.cascadeFromVariable)}”`);
  const filters = selection.filters ?? [];
  if (filters.length) {
    const joined = filters
      .map((filter) =>
        `${filter.column} ${filter.op.replace("_", " ")}${
          filter.op === "empty" || filter.op === "not_empty"
            ? ""
            : ` ${filter.fromVariable ? `answer of “${labelFor(filter.fromVariable)}”` : filter.value ?? ""}`
        }`.trim(),
      )
      .join(selection.filterMatch === "any" ? " OR " : " AND ");
    parts.push(`where ${joined}`);
  }
  const autofill = selection.autofill ?? [];
  if (autofill.length) {
    parts.push(`and fills ${autofill.map((map) => `${labelFor(map.toVariable)}`).join(", ")} automatically`);
  }
  return `${parts.join(", ")}.`;
}

function selectionWarnings(
  selection: NonNullable<FormField["selection"]>,
  siblings: FormField[],
): string[] {
  if (selection.source === "static") return [];
  const warnings: string[] = [];
  const variableExists = (variable: string) =>
    siblings.some((sibling) => (sibling.variableName ?? sibling.id) === variable);
  if (selection.source === "dataset" && !selection.datasetId) {
    warnings.push("Choose or upload a dataset.");
  }
  if (selection.source === "record" && selection.recordSource === "form" && !selection.recordFormId) {
    warnings.push("Pick the source form to reference.");
  }
  if (selection.source === "question" && !selection.fromQuestionVariable) {
    warnings.push("Pick the question whose answers become options.");
  }
  if (selection.cascadeFromVariable && !variableExists(selection.cascadeFromVariable)) {
    warnings.push("The cascade question no longer exists.");
  }
  for (const filter of selection.filters ?? []) {
    if (filter.fromVariable && !variableExists(filter.fromVariable)) {
      warnings.push(`Filter “${filter.column}” points to a question that no longer exists.`);
    }
  }
  for (const map of selection.autofill ?? []) {
    if (map.toVariable && !variableExists(map.toVariable)) {
      warnings.push(`Auto-fill target “${map.toVariable}” no longer exists.`);
    }
  }
  return warnings;
}

const SELECTION_OPS: { value: SelectionFilter["op"]; label: string }[] = [
  { value: "eq", label: "equals" },
  { value: "neq", label: "not equals" },
  { value: "in", label: "in list" },
  { value: "contains", label: "contains" },
  { value: "starts_with", label: "starts with" },
  { value: "gt", label: "greater than" },
  { value: "lt", label: "less than" },
  { value: "gte", label: "at least (≥)" },
  { value: "lte", label: "at most (≤)" },
  { value: "between", label: "between" },
  { value: "empty", label: "is empty" },
  { value: "not_empty", label: "is set" },
];

/** Renders a column picker when the dataset's columns are known, falling back to a free-text box
 * (e.g. a not-yet-uploaded list) so builders never have to guess column names when we know them. */
function ColumnField({
  label,
  columns,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  columns: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="text-sm font-semibold">
      {label}
      {columns.length ? (
        <Select className="mt-2" onChange={(event) => onChange(event.target.value)} value={value}>
          <option value="">Choose a column…</option>
          {columns.map((column) => (
            <option key={column} value={column}>
              {column}
            </option>
          ))}
        </Select>
      ) : (
        <Input
          className="mt-2"
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          value={value}
        />
      )}
    </label>
  );
}

/**
 * Configures an embedded sub-survey: pick a source form, then snapshot its questions into this
 * field's children so they're collected as a repeatable group in one offline workflow.
 */

export function SelectionConfigurator({
  field,
  siblings,
  forms = [],
  availableDatasets = [],
  resolveFormFields,
  onChange,
  onUploadDataset,
  onRenameDataset,
  onReplaceDataset,
  onDeleteDataset,
}: {
  field: FormField;
  siblings: FormField[];
  forms?: { id: string; name: string }[];
  availableDatasets?: FormDatasetSummary[];
  resolveFormFields?: (formId: string) => { variable: string; label: string }[];
  onChange: (selection: FormField["selection"]) => void;
  onUploadDataset?: (file: File) => Promise<FormDatasetSummary>;
  onRenameDataset?: (slug: string, name: string) => Promise<void>;
  onReplaceDataset?: (slug: string, file: File) => Promise<FormDatasetSummary>;
  onDeleteDataset?: (slug: string) => Promise<void>;
}) {
  const selection = field.selection ?? { source: "static" as const };
  const [uploadState, setUploadState] = useState<{ busy: boolean; message: string }>({ busy: false, message: "" });
  const [manageState, setManageState] = useState<{ busy: boolean; message: string }>({ busy: false, message: "" });
  const [renameDraft, setRenameDraft] = useState("");
  const update = (patch: Partial<NonNullable<FormField["selection"]>>) =>
    onChange({ ...selection, ...patch });
  const autofill = selection.autofill ?? [];
  const updateAutofill = (index: number, patch: Partial<SelectionAutofill>) =>
    update({ autofill: autofill.map((map, i) => (i === index ? { ...map, ...patch } : map)) });
  const [preview, setPreview] = useState<FormDatasetSummary | null>(null);
  const selectedDataset = availableDatasets.find((dataset) => dataset.slug === selection.datasetId);
  const datasetColumns = (preview && preview.slug === selection.datasetId ? preview.columns : selectedDataset?.columns) ?? [];
  const sampleRows = preview && preview.slug === selection.datasetId ? preview.sample ?? [] : [];
  // Columns the config relies on; warn if the chosen dataset doesn't actually contain them.
  const referencedColumns = Array.from(
    new Set(
      [
        selection.displayColumn,
        selection.valueColumn,
        ...(selection.searchColumns ?? []),
        ...(selection.filters ?? []).map((filter) => filter.column),
        ...(selection.autofill ?? []).map((map) => map.fromColumn),
        selection.cascadeFromVariable ? undefined : undefined,
      ].filter((column): column is string => Boolean(column)),
    ),
  );
  const missingColumns = datasetColumns.length
    ? referencedColumns.filter((column) => !datasetColumns.includes(column))
    : [];
  const [dataMode, setDataMode] = useState<"reuse" | "upload">(
    availableDatasets.length ? "reuse" : "upload",
  );

  function downloadTemplate() {
    const headers = Array.from(
      new Set(
        [
          selection.displayColumn || "label",
          selection.valueColumn || "code",
          ...(selection.searchColumns ?? []),
          ...(selection.filters ?? []).map((filter) => filter.column),
          ...(selection.autofill ?? []).map((map) => map.fromColumn),
        ].filter(Boolean),
      ),
    );
    const csv = `${headers.join(",")}\n`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${field.variableName || "dataset"}-template.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleUpload(file: File) {
    if (!onUploadDataset) return;
    setUploadState({ busy: true, message: `Uploading ${file.name}…` });
    try {
      const summary = await onUploadDataset(file);
      setPreview(summary);
      // Keep the builder's pre-chosen columns if the file actually has them; otherwise default.
      const keep = (column: string | undefined, fallback: string | undefined) =>
        column && summary.columns.includes(column) ? column : fallback;
      onChange({
        ...selection,
        source: "dataset",
        datasetId: summary.slug,
        displayColumn: keep(selection.displayColumn, summary.display_column ?? summary.columns[0]),
        valueColumn: keep(selection.valueColumn, summary.value_column ?? summary.columns[0]),
        searchColumns: (selection.searchColumns ?? []).filter((c) => summary.columns.includes(c)).length
          ? selection.searchColumns
          : summary.columns,
      });
      setUploadState({ busy: false, message: `Loaded ${summary.row_count ?? "?"} row(s).` });
    } catch (error) {
      setUploadState({ busy: false, message: error instanceof Error ? error.message : "Upload failed." });
    }
  }
  const filters = selection.filters ?? [];
  const updateFilter = (index: number, patch: Partial<SelectionFilter>) =>
    update({ filters: filters.map((filter, i) => (i === index ? { ...filter, ...patch } : filter)) });
  const siblingOptions = siblings.map((sibling) => ({
    value: sibling.variableName ?? sibling.id,
    label: sibling.label,
  }));

  const modes: { key: NonNullable<FormField["selection"]>["source"]; label: string; hint: string }[] = [
    { key: "static", label: "Static options", hint: "A fixed list you type on the Response tab" },
    { key: "dataset", label: "From dataset", hint: "A reference list or uploaded CSV/Excel" },
    { key: "record", label: "Linked records", hint: "Load responses from another survey or entities" },
    { key: "question", label: "From a question", hint: "Options from an answer already in this form" },
  ];
  const sourceFormFields =
    selection.source === "record" && selection.recordSource === "form" && selection.recordFormId && resolveFormFields
      ? resolveFormFields(selection.recordFormId)
      : [];
  // Column suggestions for filter inputs: dataset columns, or the source form's fields for records.
  const filterColumnSuggestions =
    selection.source === "record" && selection.recordSource === "form"
      ? sourceFormFields.map((sourceField) => sourceField.variable)
      : datasetColumns;
  const filterColumnsListId = `filter-cols-${field.id}`;
  // When options come from another question, that question's repeat-group children become the
  // selectable display/value fields (rows are objects keyed by child variable name).
  const questionSourceColumns =
    selection.source === "question" && selection.fromQuestionVariable
      ? (siblings.find(
          (sibling) => (sibling.variableName ?? sibling.id) === selection.fromQuestionVariable,
        )?.children ?? []
        ).map((child) => ({ variable: child.variableName ?? child.id, label: child.label }))
      : [];
  const toggleLoadColumn = (variable: string) => {
    const current = new Set(selection.loadColumns ?? []);
    if (current.has(variable)) current.delete(variable);
    else current.add(variable);
    update({ loadColumns: Array.from(current) });
  };

  const labelFor = (variable: string) =>
    siblings.find((sibling) => (sibling.variableName ?? sibling.id) === variable)?.label ?? variable;
  const summary = describeSelection(selection, labelFor, forms);
  const warnings = selectionWarnings(selection, siblings);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-semibold">1 · Where do the answers come from?</p>
        <p className="mb-2 mt-0.5 text-xs text-muted-foreground">
          Pick the source of this question’s choices.
        </p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {modes.map((mode) => {
          const active = selection.source === mode.key;
          return (
            <button
              className={cn(
                "rounded-md border p-3 text-left transition hover:border-primary",
                active ? "border-primary bg-primary/5" : "bg-background",
              )}
              key={mode.key}
              onClick={() => update({ source: mode.key })}
              type="button"
            >
              <span className="block text-sm font-semibold">{mode.label}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">{mode.hint}</span>
            </button>
          );
        })}
        </div>
      </div>

      {selection.source === "static" ? (
        <p className="rounded-md border bg-background p-3 text-xs text-muted-foreground">
          This question uses the manual options list edited on the Response tab. Switch to
          “From dataset” or “Linked records” to pull answers from shared data.
        </p>
      ) : null}

      {selection.source === "dataset" ? (
        <div className="space-y-5">
          {/* Step 2 — get the data first, so the column choices below are real, not guessed. */}
          <div>
            <p className="text-sm font-semibold">2 · Add your data</p>
            <p className="mb-2 mt-0.5 text-xs text-muted-foreground">
              Reuse a dataset that already exists, or upload your own spreadsheet.
            </p>

            {/* Two clear paths: reuse vs upload. */}
            <div className="inline-flex rounded-md border bg-panel p-0.5 text-sm">
              {(
                [
                  ["reuse", "Reuse existing"],
                  ["upload", "Upload new"],
                ] as const
              ).map(([key, label]) => (
                <button
                  className={cn(
                    "rounded px-3 py-1.5 font-semibold transition",
                    dataMode === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                  key={key}
                  onClick={() => setDataMode(key)}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>

            {dataMode === "reuse" ? (
              <>
              <label className="mt-3 block text-sm font-semibold">
                Choose a dataset
                <Select
                  className="mt-2"
                  onChange={(event) => {
                    const picked = availableDatasets.find((dataset) => dataset.slug === event.target.value);
                    setManageState({ busy: false, message: "" });
                    update({
                      datasetId: event.target.value || undefined,
                      displayColumn: picked?.columns[0] ?? selection.displayColumn,
                      valueColumn: picked?.columns[1] ?? picked?.columns[0] ?? selection.valueColumn,
                      searchColumns: picked?.columns.length ? picked.columns : selection.searchColumns,
                    });
                  }}
                  value={selection.datasetId ?? ""}
                >
                  <option value="">Select a dataset…</option>
                  {availableDatasets.map((dataset) => (
                    <option key={dataset.slug} value={dataset.slug}>
                      {dataset.name}
                      {dataset.kind ? ` · ${dataset.kind}` : ""}
                      {dataset.row_count !== undefined ? ` · ${dataset.row_count} rows` : ""}
                    </option>
                  ))}
                </Select>
                {availableDatasets.length === 0 ? (
                  <span className="mt-1 block text-xs font-normal text-muted-foreground">
                    No datasets yet — switch to <span className="font-semibold">Upload new</span> to create one.
                  </span>
                ) : null}
              </label>
              {selectedDataset &&
              selectedDataset.scope === "form" &&
              (onRenameDataset || onReplaceDataset || onDeleteDataset) ? (
                <div className="mt-2 space-y-2 rounded-md border bg-background p-2.5">
                  <p className="text-xs font-semibold text-muted-foreground">
                    Manage “{selectedDataset.name}”
                  </p>
                  {manageState.message ? (
                    <p className="text-xs text-muted-foreground">{manageState.message}</p>
                  ) : null}
                  <div className="flex flex-wrap items-center gap-2">
                    {onRenameDataset ? (
                      <>
                        <Input
                          className="h-8 max-w-[200px] text-xs"
                          onChange={(event) => setRenameDraft(event.target.value)}
                          placeholder="New name"
                          value={renameDraft}
                        />
                        <Button
                          disabled={manageState.busy || !renameDraft.trim()}
                          onClick={async () => {
                            setManageState({ busy: true, message: "Renaming…" });
                            try {
                              await onRenameDataset(selectedDataset.slug, renameDraft.trim());
                              setRenameDraft("");
                              setManageState({ busy: false, message: "Renamed." });
                            } catch (error) {
                              setManageState({ busy: false, message: error instanceof Error ? error.message : "Rename failed." });
                            }
                          }}
                          size="sm"
                          type="button"
                          variant="secondary"
                        >
                          Rename
                        </Button>
                      </>
                    ) : null}
                    {onReplaceDataset ? (
                      <label className="inline-flex cursor-pointer items-center rounded-md border bg-panel px-2.5 py-1.5 text-xs font-semibold hover:border-primary">
                        Replace data
                        <input
                          accept=".csv,.xlsx,.xls,.json"
                          className="hidden"
                          onChange={async (event) => {
                            const file = event.target.files?.[0];
                            event.target.value = "";
                            if (!file) return;
                            setManageState({ busy: true, message: `Replacing with ${file.name}…` });
                            try {
                              const summary = await onReplaceDataset(selectedDataset.slug, file);
                              setManageState({
                                busy: false,
                                message: `Updated to ${summary.row_count ?? "?"} rows${summary.version ? ` (v${summary.version})` : ""}. Bound questions keep working.`,
                              });
                            } catch (error) {
                              setManageState({ busy: false, message: error instanceof Error ? error.message : "Replace failed." });
                            }
                          }}
                          type="file"
                        />
                      </label>
                    ) : null}
                    {onDeleteDataset ? (
                      <Button
                        disabled={manageState.busy}
                        onClick={async () => {
                          if (!window.confirm(`Delete “${selectedDataset.name}”? Questions bound to it will lose their data source.`)) return;
                          setManageState({ busy: true, message: "Deleting…" });
                          try {
                            await onDeleteDataset(selectedDataset.slug);
                            update({ datasetId: undefined });
                            setManageState({ busy: false, message: "Deleted." });
                          } catch (error) {
                            setManageState({ busy: false, message: error instanceof Error ? error.message : "Delete failed." });
                          }
                        }}
                        size="sm"
                        type="button"
                        variant="ghost"
                      >
                        Delete
                      </Button>
                    ) : null}
                  </div>
                </div>
              ) : null}
              </>
            ) : (
              <div className="mt-3 rounded-md border border-dashed bg-background p-3">
                <p className="text-sm font-semibold">Upload a spreadsheet (CSV, Excel, or JSON)</p>
                <ol className="mt-1 list-inside list-decimal space-y-0.5 text-xs text-muted-foreground">
                  <li><span className="font-semibold">Download the template</span> — its columns match what you set below.</li>
                  <li>Fill it with your rows.</li>
                  <li>Choose the file — it becomes a searchable, offline dataset for this form.</li>
                </ol>
                <div className="mt-2">
                  <Button onClick={downloadTemplate} size="sm" type="button" variant="ghost">
                    <FileDown aria-hidden="true" /> Download template
                  </Button>
                </div>
                {onUploadDataset ? (
                  <input
                    accept=".csv,.xlsx,.xls,.json"
                    className="mt-2 block w-full text-xs"
                    disabled={uploadState.busy}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void handleUpload(file);
                    }}
                    type="file"
                  />
                ) : (
                  <p className="mt-2 text-xs text-warning">Save the form first to upload datasets.</p>
                )}
                {uploadState.message ? (
                  <p className="mt-2 text-xs font-semibold text-primary">{uploadState.message}</p>
                ) : null}
              </div>
            )}

            {/* Preview so the builder confirms the data matches their intent. */}
            {sampleRows.length ? (
              <div className="mt-3 overflow-x-auto rounded-md border bg-background">
                <p className="border-b px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                  Preview · first {sampleRows.length} row(s)
                </p>
                <table className="w-full text-left text-xs">
                  <thead className="bg-panel text-muted-foreground">
                    <tr>
                      {datasetColumns.map((column) => (
                        <th className="px-3 py-1.5 font-semibold" key={column}>{column}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sampleRows.map((row, index) => (
                      <tr className="border-t" key={index}>
                        {datasetColumns.map((column) => (
                          <td className="px-3 py-1.5" key={column}>{String(row[column] ?? "")}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>

          {/* Step 3 — only meaningful once columns are known. */}
          {datasetColumns.length || selection.datasetId ? (
            <div>
              <p className="text-sm font-semibold">3 · Map the columns</p>
              <p className="mb-2 mt-0.5 text-xs text-muted-foreground">
                Tell the app which column to show the officer, which to store, and which to search.
              </p>
              <div className="grid gap-3 lg:grid-cols-2">
                <ColumnField
                  columns={datasetColumns}
                  label="Show officers (display)"
                  onChange={(value) => update({ displayColumn: value || undefined })}
                  placeholder="e.g. district name"
                  value={selection.displayColumn ?? ""}
                />
                <ColumnField
                  columns={datasetColumns}
                  label="Store this (value)"
                  onChange={(value) => update({ valueColumn: value || undefined })}
                  placeholder="e.g. district code"
                  value={selection.valueColumn ?? ""}
                />
                <label className="text-sm font-semibold lg:col-span-2">
                  Also searchable by (optional)
                  <Input
                    className="mt-2"
                    onChange={(event) =>
                      update({
                        searchColumns: event.target.value
                          ? event.target.value.split(",").map((column) => column.trim()).filter(Boolean)
                          : undefined,
                      })
                    }
                    placeholder={datasetColumns.length ? datasetColumns.join(", ") : "comma-separated columns"}
                    value={(selection.searchColumns ?? []).join(", ")}
                  />
                </label>
              </div>
              {missingColumns.length ? (
                <p className="mt-2 rounded-md border border-warning/40 bg-warning/10 p-2 text-xs text-warning">
                  This dataset has no column named {missingColumns.map((c) => `“${c}”`).join(", ")}. Pick an existing
                  column above, or re-upload a file that includes it.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {selection.source === "record" ? (
        <div className="grid gap-3 lg:grid-cols-2">
          <label className="text-sm font-semibold">
            Record source
            <Select
              className="mt-2"
              onChange={(event) => update({ recordSource: event.target.value as "entity" | "form" })}
              value={selection.recordSource ?? "entity"}
            >
              <option value="entity">Registered records (entities)</option>
              <option value="form">Records from another form</option>
            </Select>
          </label>
          {selection.recordSource === "form" ? (
            <label className="text-sm font-semibold">
              Source form
              <Select
                className="mt-2"
                disabled={forms.length === 0}
                onChange={(event) => update({ recordFormId: event.target.value || undefined })}
                value={selection.recordFormId ?? ""}
              >
                <option value="">{forms.length ? "Choose a form…" : "No other forms yet"}</option>
                {forms.map((form) => (
                  <option key={form.id} value={form.id}>
                    {form.name}
                  </option>
                ))}
              </Select>
              <span className="mt-1 block text-xs font-normal text-muted-foreground">
                Officers will search and pick records collected by this form.
              </span>
            </label>
          ) : (
            <label className="text-sm font-semibold">
              Entity type (optional)
              <Input
                className="mt-2"
                onChange={(event) => update({ entityType: event.target.value || undefined })}
                placeholder="household, farm, facility…"
                value={selection.entityType ?? ""}
              />
            </label>
          )}
          {selection.recordSource === "form" ? (
            <div className="lg:col-span-2">
              <p className="text-sm font-semibold">Questions to ask (fields to load)</p>
              <p className="mb-2 mt-0.5 text-xs text-muted-foreground">
                Pick which of the source survey’s answers to show and load into this form. A field with
                the same variable name here is filled automatically.
              </p>
              {sourceFormFields.length ? (
                <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto rounded-md border bg-panel p-2">
                  {sourceFormFields.map((sourceField) => {
                    const active = (selection.loadColumns ?? []).includes(sourceField.variable);
                    return (
                      <button
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-xs transition",
                          active ? "border-primary bg-primary/10 text-primary" : "bg-background",
                        )}
                        key={sourceField.variable}
                        onClick={() => toggleLoadColumn(sourceField.variable)}
                        type="button"
                      >
                        {sourceField.label}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Pick a source form to choose its fields.</p>
              )}
            </div>
          ) : null}
          {selection.recordSource === "form" && sourceFormFields.length ? (
            <div className="grid gap-3 lg:col-span-2 lg:grid-cols-2">
              <label className="text-sm font-semibold">
                <span className="inline-flex items-center gap-1.5">
                  Display field
                  <HelpHint label="About the display field" title="Display field">
                    Which answer from the source form the officer sees when searching and picking a
                    record. Leave on “Auto” to use the record’s first answer.
                  </HelpHint>
                </span>
                <Select
                  className="mt-2"
                  onChange={(event) => update({ displayColumn: event.target.value || undefined })}
                  value={selection.displayColumn ?? ""}
                >
                  <option value="">Auto (first answer)</option>
                  {sourceFormFields.map((sourceField) => (
                    <option key={sourceField.variable} value={sourceField.variable}>
                      {sourceField.label}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="text-sm font-semibold">
                <span className="inline-flex items-center gap-1.5">
                  Value saved
                  <HelpHint label="About the saved value" title="Value saved">
                    What gets stored as this question’s answer when a record is picked. Choose a stable
                    key (e.g. national ID, household ID) so exports and reports are meaningful. Default
                    stores the source record’s reference.
                  </HelpHint>
                </span>
                <Select
                  className="mt-2"
                  onChange={(event) => update({ valueColumn: event.target.value || undefined })}
                  value={selection.valueColumn ?? ""}
                >
                  <option value="">Record reference (default)</option>
                  {sourceFormFields.map((sourceField) => (
                    <option key={sourceField.variable} value={sourceField.variable}>
                      {sourceField.label}
                    </option>
                  ))}
                </Select>
              </label>
            </div>
          ) : null}
          {["multiselect", "checkbox"].includes(field.type) ? (
            <p className="rounded-md border border-primary/30 bg-primary/5 p-2 text-xs text-primary lg:col-span-2">
              This is a multi-select response type — officers can pick several records automatically.
            </p>
          ) : null}
          <div className="grid gap-2 lg:col-span-2 lg:grid-cols-2">
            {(
              [
                ...(["multiselect", "checkbox"].includes(field.type)
                  ? []
                  : [
                      [
                        "allowMultiple",
                        "Allow multiple responses at once",
                        "The officer can pick several records for this one question (multi-select) instead of just one.",
                      ] as const,
                    ]),
                [
                  "allowReuse",
                  "Allow a record to be reused",
                  "A record can be chosen again even if it was already used in another submission of this form. Turn off to hide records already used on this device.",
                ],
                [
                  "allowAddNew",
                  "Allow new records to be added",
                  "If the record isn’t in the list, the officer can type a new value to add it as the answer.",
                ],
                [
                  "confirmResponses",
                  "Confirm responses before saving",
                  "After the officer taps a record, ask them to confirm the choice before it’s saved — guards against mis-taps.",
                ],
                [
                  "showOnlyVerified",
                  "Show only verified responses",
                  "Only records whose source submission is approved/verified appear in the list.",
                ],
              ] as const
            ).map(([key, label, help]) => (
              <label className="flex items-center gap-2 text-sm font-medium" key={key}>
                <input
                  checked={key === "allowReuse" ? selection.allowReuse !== false : Boolean(selection[key])}
                  className="h-4 w-4"
                  onChange={(event) =>
                    key === "allowReuse"
                      ? update({ allowReuse: event.target.checked })
                      : update({ [key]: event.target.checked || undefined })
                  }
                  type="checkbox"
                />
                <span className="inline-flex items-center gap-1.5">
                  {label}
                  <HelpHint label={`About ${label}`} title={label}>
                    {help}
                  </HelpHint>
                </span>
              </label>
            ))}
          </div>
          <label className="text-sm font-semibold lg:col-span-2">
            <span className="inline-flex items-center gap-1.5">
              Minimum age of response (days)
              <HelpHint label="About minimum age" title="Minimum age of response">
                Only show records at least this many days old (based on when they were collected). Leave blank for no limit —
                useful when answers should “settle” before being referenced.
              </HelpHint>
            </span>
            <Input
              className="mt-2"
              min={0}
              onChange={(event) =>
                update({ minimumAgeDays: event.target.value === "" ? undefined : Number(event.target.value) })
              }
              placeholder="Number of days old the response should be"
              type="number"
              value={selection.minimumAgeDays ?? ""}
            />
          </label>
        </div>
      ) : null}

      {selection.source === "question" ? (
        <div className="grid gap-3 lg:grid-cols-2">
          <label className="text-sm font-semibold">
            Take options from question
            <Select
              className="mt-2"
              onChange={(event) => update({ fromQuestionVariable: event.target.value || undefined })}
              value={selection.fromQuestionVariable ?? ""}
            >
              <option value="">Choose a question…</option>
              {siblingOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <span className="mt-1 block text-xs font-normal text-muted-foreground">
              Officers choose from the answers given to that question (e.g. the farms added in a repeat group).
            </span>
          </label>
          {questionSourceColumns.length ? (
            <>
              <label className="text-sm font-semibold">
                <span className="inline-flex items-center gap-1.5">
                  Display field
                  <HelpHint label="About the display field" title="Display field">
                    For grouped answers (e.g. repeat-group rows), which child answer the officer sees.
                    Leave on “Auto” to use the row’s own label.
                  </HelpHint>
                </span>
                <Select
                  className="mt-2"
                  onChange={(event) => update({ displayColumn: event.target.value || undefined })}
                  value={selection.displayColumn ?? ""}
                >
                  <option value="">Auto</option>
                  {questionSourceColumns.map((column) => (
                    <option key={column.variable} value={column.variable}>
                      {column.label}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="text-sm font-semibold">
                <span className="inline-flex items-center gap-1.5">
                  Value saved
                  <HelpHint label="About the saved value" title="Value saved">
                    Which child answer is stored when a row is picked. Default stores the row’s value.
                  </HelpHint>
                </span>
                <Select
                  className="mt-2"
                  onChange={(event) => update({ valueColumn: event.target.value || undefined })}
                  value={selection.valueColumn ?? ""}
                >
                  <option value="">Row value (default)</option>
                  {questionSourceColumns.map((column) => (
                    <option key={column.variable} value={column.variable}>
                      {column.label}
                    </option>
                  ))}
                </Select>
              </label>
            </>
          ) : (
            <ColumnField
              columns={[]}
              label="Display column (for grouped answers)"
              onChange={(value) => update({ displayColumn: value || undefined })}
              placeholder="e.g. farm_name (optional)"
              value={selection.displayColumn ?? ""}
            />
          )}
          <label className="flex items-center gap-2 text-sm font-medium lg:col-span-2">
            <input
              checked={Boolean(selection.allowMultiple)}
              className="h-4 w-4"
              onChange={(event) => update({ allowMultiple: event.target.checked || undefined })}
              type="checkbox"
            />
            Allow multiple to be selected at once
          </label>
        </div>
      ) : null}

      {selection.source !== "static" && selection.source !== "question" ? (
        <div className="space-y-3">
          <div>
            <p className="text-sm font-semibold">4 · Narrow &amp; relate (optional)</p>
            <p className="mb-2 mt-0.5 text-xs text-muted-foreground">
              Limit which options show, and link this question to an earlier answer.
            </p>
            <label className="block text-sm font-semibold">
              Show only children of (cascade)
              <Select
                className="mt-2"
                onChange={(event) => update({ cascadeFromVariable: event.target.value || undefined })}
                value={selection.cascadeFromVariable ?? ""}
              >
                <option value="">No parent — show all</option>
                {siblingOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </label>
          </div>
          <div className="rounded-md border bg-background p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold">Filters</span>
            <div className="flex items-center gap-2">
              {filters.length > 1 ? (
                <Select
                  className="h-8 py-0 text-xs"
                  onChange={(event) => update({ filterMatch: event.target.value as "all" | "any" })}
                  value={selection.filterMatch ?? "all"}
                >
                  <option value="all">Match all (AND)</option>
                  <option value="any">Match any (OR)</option>
                </Select>
              ) : null}
              <Button
                onClick={() => update({ filters: [...filters, { column: "", op: "eq", value: "" }] })}
                size="sm"
                type="button"
                variant="secondary"
              >
                <Plus aria-hidden="true" /> Add filter
              </Button>
            </div>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Narrow the options. Use “from answer” to make a filter depend on another question
            (the basis for parent-child relational lookups).
          </p>
          <div className="mt-3 space-y-2">
            {filterColumnSuggestions.length ? (
              <datalist id={filterColumnsListId}>
                {filterColumnSuggestions.map((column) => (
                  <option key={column} value={column} />
                ))}
              </datalist>
            ) : null}
            {filters.length === 0 ? (
              <p className="text-xs text-muted-foreground">No filters — all records are shown.</p>
            ) : null}
            {filters.map((filter, index) => {
              const noValue = filter.op === "empty" || filter.op === "not_empty";
              return (
                <div className="grid items-center gap-2 lg:grid-cols-[1fr_auto_1fr_auto]" key={index}>
                  <Input
                    list={filterColumnSuggestions.length ? filterColumnsListId : undefined}
                    onChange={(event) => updateFilter(index, { column: event.target.value })}
                    placeholder="column (e.g. parent, region)"
                    value={filter.column}
                  />
                  <Select
                    onChange={(event) => updateFilter(index, { op: event.target.value as SelectionFilter["op"] })}
                    value={filter.op}
                  >
                    {SELECTION_OPS.map((op) => (
                      <option key={op.value} value={op.value}>
                        {op.label}
                      </option>
                    ))}
                  </Select>
                  {noValue ? (
                    <span className="text-xs text-muted-foreground">(no value needed)</span>
                  ) : filter.fromVariable ? (
                    <Select
                      onChange={(event) => updateFilter(index, { fromVariable: event.target.value })}
                      value={filter.fromVariable}
                    >
                      {siblingOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                  ) : (
                    <div className="flex items-center gap-1">
                      <Input
                        onChange={(event) => updateFilter(index, { value: event.target.value })}
                        placeholder="value"
                        value={filter.value ?? ""}
                      />
                      {filter.op === "between" ? (
                        <Input
                          onChange={(event) => updateFilter(index, { value2: event.target.value })}
                          placeholder="and"
                          value={filter.value2 ?? ""}
                        />
                      ) : null}
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    {noValue ? null : (
                      <Button
                        onClick={() =>
                          updateFilter(index, filter.fromVariable
                            ? { fromVariable: undefined, value: "" }
                            : { fromVariable: siblingOptions[0]?.value ?? "", value: undefined })
                        }
                        size="sm"
                        type="button"
                        variant="ghost"
                      >
                        {filter.fromVariable ? "static" : "from answer"}
                      </Button>
                    )}
                    <Button
                      aria-label="Remove filter"
                      onClick={() => update({ filters: filters.filter((_, i) => i !== index) })}
                      size="icon"
                      type="button"
                      variant="ghost"
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          </div>
        </div>
      ) : null}

      {selection.source !== "static" ? (
        <div className="rounded-md border bg-background p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold">
              5 · Auto-fill other questions (optional)
              <HelpHint label="About auto-fill" title="Auto-fill">
                When a record is chosen, copy its columns into other questions — e.g. pick a household and fill its district.
              </HelpHint>
            </span>
            <Button
              onClick={() => update({ autofill: [...autofill, { fromColumn: "", toVariable: siblingOptions[0]?.value ?? "" }] })}
              size="sm"
              type="button"
              variant="secondary"
            >
              <Plus aria-hidden="true" /> Add mapping
            </Button>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            When a record is chosen, copy its columns into other questions — e.g. pick a household and
            fill its district automatically.
          </p>
          <div className="mt-3 space-y-2">
            {autofill.length === 0 ? (
              <p className="text-xs text-muted-foreground">No auto-fill — only this question is set.</p>
            ) : null}
            {autofill.map((map, index) => (
              <div className="grid items-center gap-2 lg:grid-cols-[1fr_auto_1fr_auto]" key={index}>
                <Input
                  onChange={(event) => updateAutofill(index, { fromColumn: event.target.value })}
                  placeholder="from column (e.g. district)"
                  value={map.fromColumn}
                />
                <span className="text-center text-xs text-muted-foreground">→</span>
                <Select
                  onChange={(event) => updateAutofill(index, { toVariable: event.target.value })}
                  value={map.toVariable}
                >
                  {siblingOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
                <div className="flex items-center gap-1">
                  <Button
                    onClick={() => updateAutofill(index, { overwrite: !map.overwrite })}
                    size="sm"
                    title={map.overwrite ? "Overwrites existing answers" : "Only fills empty answers"}
                    type="button"
                    variant="ghost"
                  >
                    {map.overwrite ? "overwrite" : "if empty"}
                  </Button>
                  <Button
                    aria-label="Remove mapping"
                    onClick={() => update({ autofill: autofill.filter((_, i) => i !== index) })}
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {selection.source !== "static" ? (
        <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
          <p className="text-xs font-semibold text-primary">In plain language</p>
          <p className="mt-1 text-sm">{summary}</p>
          {warnings.length ? (
            <ul className="mt-2 list-inside list-disc text-xs text-warning">
              {warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
