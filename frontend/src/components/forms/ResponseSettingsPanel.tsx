import { Database } from "lucide-react";

import { ChoiceOptionsEditor } from "@/components/forms/ChoiceOptionsEditor";
import {
  fieldAppearanceWithTag,
  hasFieldTag,
} from "@/components/forms/fieldMetadata";
import type { FocusSettingsTab } from "@/components/forms/focusSettingsTabs";
import { persistedFormToLocal } from "@/components/forms/persistedFormToLocal";
import { SubformConfigurator } from "@/components/forms/SubformConfigurator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HelpHint } from "@/components/ui/help-hint";
import { Input, Select } from "@/components/ui/input";
import { type DataFormRead, type FormDatasetSummary } from "@/lib/api";
import {
  exportedOptions,
  fieldSupportsSelection,
  fieldTypeHasCapability,
  updateField,
  type DynamicForm,
  type FormField,
} from "@/lib/forms";

/** Response-configuration tab: per-type answer options/units, subform setup, and data-source pointer. */
export function ResponseSettingsPanel({
  field,
  form,
  onUpdateForm,
  otherForms,
  datasets,
  onUpdateValidation,
  onTabChange,
}: {
  field: FormField;
  form: DynamicForm;
  onUpdateForm: (form: DynamicForm) => void;
  otherForms: DataFormRead[];
  datasets: FormDatasetSummary[];
  onUpdateValidation: (patch: Partial<NonNullable<FormField["validation"]>>) => void;
  onTabChange: (tab: FocusSettingsTab) => void;
}) {
  // Matrix/grid rows can be typed, or pulled live from another question, a dataset, or linked records.
  // The row source reuses the question's `selection` (matrix doesn't otherwise use it).
  const matrixRowSource = field.selection?.source ?? "static";
  const setMatrixRowSource = (source: string) => {
    const base = source === "static" ? undefined
      : source === "question" ? { source: "question" as const, fromQuestionVariable: field.selection?.fromQuestionVariable }
      : source === "dataset" ? { source: "dataset" as const, datasetId: field.selection?.datasetId, displayColumn: field.selection?.displayColumn }
      : { source: "record" as const, recordSource: "form" as const, recordFormId: field.selection?.recordFormId, displayColumn: field.selection?.displayColumn };
    onUpdateForm(updateField(form, field.id, { selection: base }));
  };
  const updateMatrixSelection = (patch: Partial<NonNullable<FormField["selection"]>>) =>
    onUpdateForm(updateField(form, field.id, { selection: { ...(field.selection ?? { source: "static" }), ...patch } }));
  const matrixSourceColumns =
    field.selection?.source === "dataset"
      ? datasets.find((dataset) => dataset.slug === field.selection?.datasetId)?.columns ?? []
      : [];
  return (
                            <section className="mt-4 rounded-lg border bg-surface-container-lowest p-4">
                              <div className="flex items-center justify-between gap-2">
                                <h3 className="text-sm font-semibold">
                                  Response configuration
                                </h3><HelpHint label="About this tab" title="Response configuration">How the answer is captured for this response type — its options or data source, and any per-type behaviour.</HelpHint>
                                <Badge tone="neutral">
                                  {field.type.replace("_", " ")}
                                </Badge>
                              </div>
                              {field.type === "subform" ? (
                                <div className="mt-4">
                                  <SubformConfigurator
                                    field={field}
                                    forms={otherForms
                                      .filter((source) => source.id !== form.id)
                                      .map((source) => ({ id: source.id, name: source.name }))}
                                    loadFields={(formId) => {
                                      const src = otherForms.find((source) => source.id === formId);
                                      if (!src) return [];
                                      return persistedFormToLocal(src).fields.map(function clone(child): FormField {
                                        return {
                                          ...child,
                                          id: `${child.id}-sf-${Math.random().toString(36).slice(2, 6)}`,
                                          children: child.children?.map(clone),
                                        };
                                      });
                                    }}
                                    onChange={(patch) =>
                                      onUpdateForm(updateField(form, field.id, patch))
                                    }
                                    siblings={form.fields.filter((item) => item.id !== field.id)}
                                  />
                                </div>
                              ) : null}
                              {field.type === "subform" ? null : field.selection &&
                                field.selection.source !== "static" ? (
                                <div className="mt-4 rounded-md border border-primary/30 bg-primary/5 p-3 text-xs">
                                  <p className="text-sm font-semibold">
                                    {field.selection.source === "dataset"
                                      ? `Answers come from the dataset “${field.selection.datasetId || "(pick one)"}”.`
                                      : field.selection.source === "question"
                                        ? "Answers come from another question’s answers."
                                        : field.selection.recordSource === "form"
                                          ? "Answers come from records in another form."
                                          : "Answers come from registered records (entities)."}
                                  </p>
                                  <p className="mt-1 text-muted-foreground">
                                    The manual option list isn’t used. Set up the source, columns, and filters on the{" "}
                                    <span className="font-semibold">Reference</span> tab.
                                  </p>
                                </div>
                              ) : [
                                "select",
                                "dropdown",
                                "multiselect",
                                "radio",
                                "checkbox",
                                "ranking",
                                "likert",
                              ].includes(field.type) ||
                              field.options ? (
                                <>
                                  {fieldSupportsSelection(field.type) &&
                                  (!field.selection ||
                                    field.selection.source === "static") ? (
                                    <div className="mt-4 flex flex-col gap-2 rounded-md border border-primary/30 bg-primary/5 p-3 sm:flex-row sm:items-center sm:justify-between">
                                      <p className="text-xs text-muted-foreground">
                                        This is a fixed list typed below. To pull answers from{" "}
                                        <span className="font-semibold">another form</span>, a dataset, or
                                        saved records, set the source on the Reference tab.
                                      </p>
                                      <Button
                                        className="shrink-0"
                                        onClick={() => onTabChange("reference")}
                                        size="sm"
                                        type="button"
                                        variant="secondary"
                                      >
                                        <Database aria-hidden="true" className="mr-1" size={14} />
                                        Choose a data source
                                      </Button>
                                    </div>
                                  ) : null}
                                  <label className="mt-4 block text-sm font-semibold">
                                    {field.type === "measurement"
                                      ? "Units of measure"
                                      : "Options"}
                                    <ChoiceOptionsEditor
                                      key={field.id}
                                      onChange={(options) =>
                                        onUpdateForm(
                                          updateField(
                                            form,
                                            field.id,
                                            {
                                              options,
                                            },
                                          ),
                                        )
                                      }
                                      onValuesChange={
                                        field.type === "measurement"
                                          ? undefined
                                          : (optionValues) =>
                                              onUpdateForm(
                                                updateField(form, field.id, { optionValues }),
                                              )
                                      }
                                      options={field.options ?? []}
                                      values={field.type === "measurement" ? undefined : field.optionValues}
                                    />
                                    <span className="mt-1 block text-xs font-normal text-muted-foreground">
                                      {field.type === "measurement"
                                        ? "List the units a field officer can pick (e.g. kg, g, lb). The first one is selected by default."
                                        : "Press Enter to add the next response. Paste multiple lines to create many options at once. These values are used by web and mobile collection."}
                                    </span>
                                  </label>
                                  {fieldTypeHasCapability(field.type, "multiSelect") &&
                                  (field.options?.length ?? 0) > 0 ? (
                                    <div className="mt-4 rounded-md border bg-background p-3">
                                      <span className="inline-flex items-center gap-1.5 text-sm font-semibold">
                                        Exclusive options
                                        <HelpHint label="About exclusive options" title="Exclusive options">
                                          Mark answers like “None of the above” or “Prefer not to
                                          say”. When the officer picks an exclusive option it clears
                                          the others, and picking any other answer clears it — so the
                                          data never mixes “none” with real selections.
                                        </HelpHint>
                                      </span>
                                      <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                                        {exportedOptions(field.options ?? [], field.optionValues).map(
                                          (option) => {
                                            const exclusive =
                                              field.exclusiveOptionValues?.includes(option.value) ??
                                              false;
                                            return (
                                              <label
                                                className="flex items-center gap-2 text-sm"
                                                key={option.value}
                                              >
                                                <input
                                                  checked={exclusive}
                                                  className="h-4 w-4"
                                                  onChange={(event) => {
                                                    const current =
                                                      field.exclusiveOptionValues ?? [];
                                                    const next = event.target.checked
                                                      ? [...current, option.value]
                                                      : current.filter((v) => v !== option.value);
                                                    onUpdateForm(
                                                      updateField(form, field.id, {
                                                        exclusiveOptionValues: next.length
                                                          ? next
                                                          : undefined,
                                                      }),
                                                    );
                                                  }}
                                                  type="checkbox"
                                                />
                                                {option.label}
                                              </label>
                                            );
                                          },
                                        )}
                                      </div>
                                    </div>
                                  ) : null}
                                </>
                              ) : (
                                <div className="mt-4 rounded-md border bg-background p-3 text-xs text-muted-foreground">
                                  This response type does not need a manual
                                  option list. Use Validation, Logic, Data, and
                                  Advanced for the rest of its behavior.
                                </div>
                              )}
                              {["matrix_single", "matrix_multi", "grid"].includes(field.type) ? (
                                <div className="mt-4 space-y-4">
                                  <label className="block text-sm font-semibold">
                                    <span className="inline-flex items-center gap-1.5">
                                      Rows come from
                                      <HelpHint label="About matrix rows source" title="Where the rows come from">
                                        Rows are the things being rated (one row per item). Type them yourself, or pull
                                        them in automatically from another question’s answers, a shared dataset, or
                                        records collected by another form — so the officer rates exactly what applies.
                                      </HelpHint>
                                    </span>
                                    <Select
                                      className="mt-2"
                                      onChange={(event) => setMatrixRowSource(event.target.value)}
                                      value={matrixRowSource}
                                    >
                                      <option value="static">Type the rows myself</option>
                                      <option value="question">One per another question’s answer</option>
                                      <option value="dataset">One per dataset entry</option>
                                      <option value="record">One per record from another form</option>
                                    </Select>
                                  </label>
                                  <div className="grid gap-4 lg:grid-cols-2">
                                    <div className="space-y-2">
                                      {matrixRowSource === "static" ? (
                                        <label className="block text-sm font-semibold">
                                          Rows
                                          <ChoiceOptionsEditor
                                            key={`${field.id}-rows`}
                                            onChange={(rows) =>
                                              onUpdateForm(
                                                updateField(form, field.id, {
                                                  matrix: { rows, columns: field.matrix?.columns ?? [], scoring: field.matrix?.scoring },
                                                }),
                                              )
                                            }
                                            options={field.matrix?.rows ?? []}
                                          />
                                        </label>
                                      ) : matrixRowSource === "question" ? (
                                        <label className="block text-sm font-semibold">
                                          <span className="inline-flex items-center gap-1.5">
                                            Take rows from
                                            <HelpHint label="About the source question" title="Source question">
                                              One row is created for each answer the officer gave to this question (e.g.
                                              each crop they selected, or each member added in a repeat group).
                                            </HelpHint>
                                          </span>
                                          <Select
                                            className="mt-2"
                                            onChange={(event) => updateMatrixSelection({ fromQuestionVariable: event.target.value || undefined })}
                                            value={field.selection?.fromQuestionVariable ?? ""}
                                          >
                                            <option value="">Choose a question…</option>
                                            {form.fields
                                              .filter((candidate) => candidate.id !== field.id)
                                              .map((candidate) => (
                                                <option key={candidate.id} value={candidate.variableName ?? candidate.id}>
                                                  {candidate.label}
                                                </option>
                                              ))}
                                          </Select>
                                        </label>
                                      ) : matrixRowSource === "dataset" ? (
                                        <>
                                          <label className="block text-sm font-semibold">
                                            <span className="inline-flex items-center gap-1.5">
                                              Dataset
                                              <HelpHint label="About the dataset" title="Dataset rows">
                                                One row is created for each entry in the chosen dataset.
                                              </HelpHint>
                                            </span>
                                            <Select
                                              className="mt-2"
                                              onChange={(event) => updateMatrixSelection({ datasetId: event.target.value || undefined })}
                                              value={field.selection?.datasetId ?? ""}
                                            >
                                              <option value="">Choose a dataset…</option>
                                              {datasets.map((dataset) => (
                                                <option key={dataset.slug} value={dataset.slug}>
                                                  {dataset.name}
                                                  {dataset.row_count !== undefined ? ` · ${dataset.row_count} rows` : ""}
                                                </option>
                                              ))}
                                            </Select>
                                          </label>
                                          {matrixSourceColumns.length ? (
                                            <label className="block text-sm font-semibold">
                                              Row label column
                                              <Select
                                                className="mt-2"
                                                onChange={(event) => updateMatrixSelection({ displayColumn: event.target.value || undefined })}
                                                value={field.selection?.displayColumn ?? ""}
                                              >
                                                <option value="">Auto (first column)</option>
                                                {matrixSourceColumns.map((column) => (
                                                  <option key={column} value={column}>
                                                    {column}
                                                  </option>
                                                ))}
                                              </Select>
                                            </label>
                                          ) : null}
                                        </>
                                      ) : (
                                        <label className="block text-sm font-semibold">
                                          <span className="inline-flex items-center gap-1.5">
                                            Source form
                                            <HelpHint label="About the source form" title="Records as rows">
                                              One row is created for each record collected by the chosen form.
                                            </HelpHint>
                                          </span>
                                          <Select
                                            className="mt-2"
                                            onChange={(event) => updateMatrixSelection({ recordFormId: event.target.value || undefined })}
                                            value={field.selection?.recordFormId ?? ""}
                                          >
                                            <option value="">{otherForms.length ? "Choose a form…" : "No other forms yet"}</option>
                                            {otherForms
                                              .filter((candidate) => candidate.id !== form.id)
                                              .map((candidate) => (
                                                <option key={candidate.id} value={candidate.id}>
                                                  {candidate.name}
                                                </option>
                                              ))}
                                          </Select>
                                        </label>
                                      )}
                                    </div>
                                    <label className="block text-sm font-semibold">
                                      <span className="inline-flex items-center gap-1.5">
                                        Columns
                                        <HelpHint label="About matrix columns" title="Columns">
                                          The shared answer choices applied across every row (e.g. Poor → Excellent).
                                        </HelpHint>
                                      </span>
                                      <ChoiceOptionsEditor
                                        key={`${field.id}-cols`}
                                        onChange={(columns) =>
                                          onUpdateForm(
                                            updateField(form, field.id, {
                                              matrix: { rows: field.matrix?.rows ?? [], columns, scoring: field.matrix?.scoring },
                                            }),
                                          )
                                        }
                                        options={field.matrix?.columns ?? []}
                                      />
                                    </label>
                                  </div>
                                </div>
                              ) : null}
                              {field.type === "repeat_group" ? (
                                <div className="mt-4 space-y-4">
                                  <label className="block text-sm font-semibold">
                                    <span className="inline-flex items-center gap-1.5">
                                      Rows come from
                                      <HelpHint label="About repeat rows source" title="Where the rows come from">
                                        Add rows manually, or create one row automatically for each
                                        answer to another question (e.g. each crop the farmer picked),
                                        each row of a dataset, or each record from another form — so
                                        the officer fills in details for exactly the right items.
                                      </HelpHint>
                                    </span>
                                    <Select
                                      className="mt-2"
                                      onChange={(event) => setMatrixRowSource(event.target.value)}
                                      value={matrixRowSource}
                                    >
                                      <option value="static">Officer adds rows manually</option>
                                      <option value="question">One per another question’s answer</option>
                                      <option value="dataset">One per dataset entry</option>
                                      <option value="record">One per record from another form</option>
                                    </Select>
                                  </label>
                                  {matrixRowSource === "question" ? (
                                    <label className="block text-sm font-semibold">
                                      Source question
                                      <Select
                                        className="mt-2"
                                        onChange={(event) => updateMatrixSelection({ fromQuestionVariable: event.target.value || undefined })}
                                        value={field.selection?.fromQuestionVariable ?? ""}
                                      >
                                        <option value="">Choose a question…</option>
                                        {form.fields
                                          .filter((candidate) => candidate.id !== field.id && candidate.variableName)
                                          .map((candidate) => (
                                            <option key={candidate.id} value={candidate.variableName}>
                                              {candidate.label}
                                            </option>
                                          ))}
                                      </Select>
                                    </label>
                                  ) : matrixRowSource === "dataset" ? (
                                    <label className="block text-sm font-semibold">
                                      Dataset
                                      <Select
                                        className="mt-2"
                                        onChange={(event) => updateMatrixSelection({ datasetId: event.target.value || undefined })}
                                        value={field.selection?.datasetId ?? ""}
                                      >
                                        <option value="">{datasets.length ? "Choose a dataset…" : "No datasets uploaded yet"}</option>
                                        {datasets.map((dataset) => (
                                          <option key={dataset.slug} value={dataset.slug}>
                                            {dataset.name}
                                          </option>
                                        ))}
                                      </Select>
                                    </label>
                                  ) : matrixRowSource === "record" ? (
                                    <label className="block text-sm font-semibold">
                                      Source form
                                      <Select
                                        className="mt-2"
                                        onChange={(event) => updateMatrixSelection({ recordFormId: event.target.value || undefined })}
                                        value={field.selection?.recordFormId ?? ""}
                                      >
                                        <option value="">{otherForms.length ? "Choose a form…" : "No other forms yet"}</option>
                                        {otherForms
                                          .filter((candidate) => candidate.id !== form.id)
                                          .map((candidate) => (
                                            <option key={candidate.id} value={candidate.id}>
                                              {candidate.name}
                                            </option>
                                          ))}
                                      </Select>
                                    </label>
                                  ) : null}
                                  {matrixRowSource !== "static" && (field.children?.length ?? 0) > 0 ? (
                                    <label className="block text-sm font-semibold">
                                      <span className="inline-flex items-center gap-1.5">
                                        Pre-fill which question with each item?
                                        <HelpHint label="About the pre-filled question" title="Pre-filled question">
                                          The chosen repeat question is filled in automatically with
                                          each source item (e.g. the crop name), and the officer
                                          completes the rest of that row.
                                        </HelpHint>
                                      </span>
                                      <Select
                                        className="mt-2"
                                        onChange={(event) => updateMatrixSelection({ seedChildVariable: event.target.value || undefined })}
                                        value={field.selection?.seedChildVariable ?? ""}
                                      >
                                        <option value="">First question (default)</option>
                                        {(field.children ?? [])
                                          .filter((child) => child.variableName)
                                          .map((child) => (
                                            <option key={child.id} value={child.variableName}>
                                              {child.label}
                                            </option>
                                          ))}
                                      </Select>
                                    </label>
                                  ) : null}
                                </div>
                              ) : null}
                              {["number", "decimal", "currency", "rating", "nps", "slider", "percentage", "counter", "measurement"].includes(field.type) ? (
                                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                  <label className="text-sm font-semibold">
                                    Minimum
                                    <Input
                                      className="mt-2"
                                      onChange={(event) =>
                                        onUpdateValidation({ min: event.target.value === "" ? undefined : Number(event.target.value) })
                                      }
                                      type="number"
                                      value={field.validation?.min ?? ""}
                                    />
                                  </label>
                                  <label className="text-sm font-semibold">
                                    Maximum
                                    <Input
                                      className="mt-2"
                                      onChange={(event) =>
                                        onUpdateValidation({ max: event.target.value === "" ? undefined : Number(event.target.value) })
                                      }
                                      type="number"
                                      value={field.validation?.max ?? ""}
                                    />
                                  </label>
                                  {field.type === "slider" ? (
                                    <label className="text-sm font-semibold">
                                      <span className="inline-flex items-center gap-1.5">
                                        Step
                                        <HelpHint label="About slider step" title="Step">
                                          How far the slider moves per notch (e.g. 1, 5, or 0.5). Smaller steps allow finer answers.
                                        </HelpHint>
                                      </span>
                                      <Input
                                        className="mt-2"
                                        min={0}
                                        onChange={(event) =>
                                          onUpdateValidation({ step: event.target.value === "" ? undefined : Number(event.target.value) })
                                        }
                                        type="number"
                                        value={field.validation?.step ?? ""}
                                      />
                                    </label>
                                  ) : null}
                                  {["decimal", "currency"].includes(field.type) ? (
                                    <>
                                      <label className="text-sm font-semibold">
                                        Decimal places
                                        <Input
                                          className="mt-2"
                                          min={0}
                                          onChange={(event) =>
                                            onUpdateValidation({ decimalPlaces: event.target.value === "" ? undefined : Number(event.target.value) })
                                          }
                                          type="number"
                                          value={field.validation?.decimalPlaces ?? ""}
                                        />
                                      </label>
                                      <label className="text-sm font-semibold">
                                        Unit
                                        <Input
                                          className="mt-2"
                                          onChange={(event) => onUpdateValidation({ unit: event.target.value || undefined })}
                                          placeholder="kg, ha, %"
                                          value={field.validation?.unit ?? ""}
                                        />
                                      </label>
                                    </>
                                  ) : null}
                                </div>
                              ) : null}
                              {["text", "textarea"].includes(field.type) ? (
                                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                  <label className="text-sm font-semibold">
                                    Minimum length
                                    <Input
                                      className="mt-2"
                                      onChange={(event) =>
                                        onUpdateValidation({ minLength: event.target.value === "" ? undefined : Number(event.target.value) })
                                      }
                                      type="number"
                                      value={field.validation?.minLength ?? ""}
                                    />
                                  </label>
                                  <label className="text-sm font-semibold">
                                    Maximum length
                                    <Input
                                      className="mt-2"
                                      onChange={(event) =>
                                        onUpdateValidation({ maxLength: event.target.value === "" ? undefined : Number(event.target.value) })
                                      }
                                      type="number"
                                      value={field.validation?.maxLength ?? ""}
                                    />
                                  </label>
                                </div>
                              ) : null}
                              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                                {[
                                  ["allow-other", "Allow Other option"],
                                  ["searchable", "Searchable choices"],
                                  ["randomize-options", "Randomize choices"],
                                ].map(([tag, label]) => (
                                  <label
                                    className="flex items-center gap-2 text-sm font-semibold"
                                    key={tag}
                                  >
                                    <input
                                      checked={hasFieldTag(field, tag)}
                                      className="h-4 w-4"
                                      onChange={(event) =>
                                        onUpdateForm(
                                          updateField(
                                            form,
                                            field.id,
                                            {
                                              appearance:
                                                fieldAppearanceWithTag(
                                                  field,
                                                  tag,
                                                  event.target.checked,
                                                ),
                                            },
                                          ),
                                        )
                                      }
                                      type="checkbox"
                                    />
                                    {label}
                                  </label>
                                ))}
                              </div>
                            </section>
  );
}
