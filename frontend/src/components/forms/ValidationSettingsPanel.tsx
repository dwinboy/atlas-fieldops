import { Check } from "lucide-react";

import { CrossFieldRuleBuilder } from "@/components/forms/CrossFieldRuleBuilder";
import {
  fieldAppearanceWithTag,
  hasFieldTag,
} from "@/components/forms/fieldMetadata";
import { Badge } from "@/components/ui/badge";
import { HelpHint } from "@/components/ui/help-hint";
import { Input } from "@/components/ui/input";
import { fieldValidationCapabilities, updateField, type DynamicForm, type FormField } from "@/lib/forms";

/** Validation settings tab: warn-vs-block, value/length/date rules, choice limits, cross-field rules. */
export function ValidationSettingsPanel({
  field,
  form,
  onUpdateForm,
  onUpdateValidation,
}: {
  field: FormField;
  form: DynamicForm;
  onUpdateForm: (form: DynamicForm) => void;
  onUpdateValidation: (patch: Partial<NonNullable<FormField["validation"]>>) => void;
}) {
  return (
                            <section className="mt-4 rounded-lg border bg-panel p-4">
                              <div className="flex items-center gap-2">
                                <Check
                                  aria-hidden="true"
                                  className="text-primary"
                                  size={16}
                                />
                                <h3 className="text-sm font-semibold">
                                  Validation
                                </h3><HelpHint label="About this tab" title="Validation">Rules that protect data quality before submission. Only the rules that fit this response type are shown.</HelpHint>
                              </div>
                              <p className="mt-4 rounded-md border bg-background p-2 text-xs text-muted-foreground">
                                Showing validations for a{" "}
                                <span className="font-semibold">
                                  {field.type.replace("_", " ")}
                                </span>{" "}
                                answer.
                              </p>
                              <label className="mt-3 flex items-center gap-2 text-sm font-semibold">
                                <input
                                  checked={Boolean(field.validation?.warnOnly)}
                                  className="h-4 w-4"
                                  onChange={(event) => onUpdateValidation({ warnOnly: event.target.checked || undefined })}
                                  type="checkbox"
                                />
                                <span className="inline-flex items-center gap-1.5">
                                  Warn instead of block
                                  <HelpHint label="About warn vs block" title="Warn instead of block">
                                    These rules become advisory — the officer sees a warning but can still submit. Use for
                                    “unusual but possible” values; leave off for rules that must be enforced.
                                  </HelpHint>
                                </span>
                              </label>
                              <div className="mt-3 grid gap-3 lg:grid-cols-4">
                                {fieldValidationCapabilities(field.type)
                                  .numericRange ? (
                                  <>
                                    <label className="text-sm font-semibold">
                                      Minimum value
                                      <Input
                                        className="mt-2"
                                        onChange={(event) =>
                                          onUpdateValidation({
                                            min:
                                              event.target.value === ""
                                                ? undefined
                                                : Number(event.target.value),
                                          })
                                        }
                                        type="number"
                                        value={field.validation?.min ?? ""}
                                      />
                                    </label>
                                    <label className="text-sm font-semibold">
                                      Maximum value
                                      <Input
                                        className="mt-2"
                                        onChange={(event) =>
                                          onUpdateValidation({
                                            max:
                                              event.target.value === ""
                                                ? undefined
                                                : Number(event.target.value),
                                          })
                                        }
                                        type="number"
                                        value={field.validation?.max ?? ""}
                                      />
                                    </label>
                                  </>
                                ) : null}
                                {fieldValidationCapabilities(field.type)
                                  .textLength ? (
                                  <>
                                    <label className="text-sm font-semibold">
                                      Minimum length
                                      <Input
                                        className="mt-2"
                                        onChange={(event) =>
                                          onUpdateValidation({
                                            minLength:
                                              event.target.value === ""
                                                ? undefined
                                                : Number(event.target.value),
                                          })
                                        }
                                        type="number"
                                        value={
                                          field.validation?.minLength ?? ""
                                        }
                                      />
                                    </label>
                                    <label className="text-sm font-semibold">
                                      Maximum length
                                      <Input
                                        className="mt-2"
                                        onChange={(event) =>
                                          onUpdateValidation({
                                            maxLength:
                                              event.target.value === ""
                                                ? undefined
                                                : Number(event.target.value),
                                          })
                                        }
                                        type="number"
                                        value={
                                          field.validation?.maxLength ?? ""
                                        }
                                      />
                                    </label>
                                  </>
                                ) : null}
                                {fieldValidationCapabilities(field.type)
                                  .dateRange ? (
                                  <>
                                    <label className="text-sm font-semibold">
                                      Earliest date
                                      <Input
                                        className="mt-2"
                                        onChange={(event) =>
                                          onUpdateValidation({
                                            minDate:
                                              event.target.value || undefined,
                                          })
                                        }
                                        type="date"
                                        value={
                                          field.validation?.minDate ?? ""
                                        }
                                      />
                                    </label>
                                    <label className="text-sm font-semibold">
                                      Latest date
                                      <Input
                                        className="mt-2"
                                        onChange={(event) =>
                                          onUpdateValidation({
                                            maxDate:
                                              event.target.value || undefined,
                                          })
                                        }
                                        type="date"
                                        value={
                                          field.validation?.maxDate ?? ""
                                        }
                                      />
                                    </label>
                                  </>
                                ) : null}
                              </div>
                              {["multiselect", "checkbox"].includes(field.type) ? (
                                <div className="mt-3 grid gap-3 lg:grid-cols-2">
                                  <label className="text-sm font-semibold">
                                    Minimum selections
                                    <Input
                                      className="mt-2"
                                      onChange={(event) =>
                                        onUpdateValidation({
                                          minSelections: event.target.value === "" ? undefined : Number(event.target.value),
                                        })
                                      }
                                      type="number"
                                      value={field.validation?.minSelections ?? ""}
                                    />
                                  </label>
                                  <label className="text-sm font-semibold">
                                    Maximum selections
                                    <Input
                                      className="mt-2"
                                      onChange={(event) =>
                                        onUpdateValidation({
                                          maxSelections: event.target.value === "" ? undefined : Number(event.target.value),
                                        })
                                      }
                                      type="number"
                                      value={field.validation?.maxSelections ?? ""}
                                    />
                                  </label>
                                </div>
                              ) : null}
                              {["number", "decimal", "currency"].includes(field.type) ? (
                                <div className="mt-3 grid gap-3 lg:grid-cols-2">
                                  <label className="text-sm font-semibold">
                                    Decimal places
                                    <Input
                                      className="mt-2"
                                      onChange={(event) =>
                                        onUpdateValidation({
                                          decimalPlaces: event.target.value === "" ? undefined : Number(event.target.value),
                                        })
                                      }
                                      type="number"
                                      value={field.validation?.decimalPlaces ?? ""}
                                    />
                                  </label>
                                  <label className="text-sm font-semibold">
                                    Unit (e.g. kg, ha, %)
                                    <Input
                                      className="mt-2"
                                      onChange={(event) =>
                                        onUpdateValidation({ unit: event.target.value || undefined })
                                      }
                                      value={field.validation?.unit ?? ""}
                                    />
                                  </label>
                                </div>
                              ) : null}
                              {["select", "dropdown", "radio", "multiselect", "checkbox"].includes(field.type) ? (
                                <label className="mt-3 flex items-center gap-2 text-sm font-semibold">
                                  <input
                                    checked={field.validation?.allowOther ?? false}
                                    onChange={(event) =>
                                      onUpdateValidation({ allowOther: event.target.checked || undefined })
                                    }
                                    type="checkbox"
                                  />
                                  Allow “Other (specify)” with a free-text box
                                </label>
                              ) : null}
                              {["date", "datetime"].includes(field.type) ? (
                                <label className="mt-3 flex items-center gap-2 text-sm font-semibold">
                                  <input
                                    checked={field.validation?.defaultToday ?? false}
                                    onChange={(event) =>
                                      onUpdateValidation({ defaultToday: event.target.checked || undefined })
                                    }
                                    type="checkbox"
                                  />
                                  Pre-fill today’s date when the question opens
                                </label>
                              ) : null}
                              <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                                {fieldValidationCapabilities(field.type)
                                  .pattern ? (
                                  <label className="text-sm font-semibold">
                                    Regex pattern
                                    <Input
                                      className="mt-2 font-mono"
                                      onChange={(event) =>
                                        onUpdateValidation({
                                          pattern: event.target.value,
                                        })
                                      }
                                      placeholder="^[A-Z0-9-]+$"
                                      value={
                                        field.validation?.pattern ?? ""
                                      }
                                    />
                                  </label>
                                ) : null}
                                <CrossFieldRuleBuilder
                                  onApply={(expression) =>
                                    onUpdateValidation({ expression })
                                  }
                                  siblings={form.fields
                                    .filter((item) => item.id !== field.id)
                                    .map((item) => ({ value: item.variableName ?? item.id, label: item.label }))}
                                  thisVariable={field.variableName ?? field.id}
                                />
                                <label className="text-sm font-semibold">
                                  <span className="inline-flex items-center gap-1.5">
                                    Custom validation expression
                                    <HelpHint label="About custom expressions" title="Custom validation expression">
                                      Advanced rule using variables, e.g. <code>{"${age} >= 18"}</code> or
                                      <code>{" ${end_date} >= ${start_date}"}</code>. The builder above fills this for you.
                                    </HelpHint>
                                  </span>
                                  <Input
                                    className="mt-2 font-mono"
                                    onChange={(event) =>
                                      onUpdateForm(
                                        updateField(
                                          form,
                                          field.id,
                                          {
                                            validation: {
                                              ...field.validation,
                                              expression: event.target.value,
                                            },
                                          },
                                        ),
                                      )
                                    }
                                    placeholder="${age} >= 18"
                                    value={
                                      field.validation?.expression ?? ""
                                    }
                                  />
                                </label>
                                <label className="text-sm font-semibold">
                                  Custom validation message
                                  <Input
                                    className="mt-2"
                                    onChange={(event) =>
                                      onUpdateValidation({
                                        customMessage:
                                          event.target.value || undefined,
                                      })
                                    }
                                    placeholder="Explain the correction in plain language"
                                    value={
                                      field.validation
                                        ?.customMessage ?? ""
                                    }
                                  />
                                </label>
                              </div>
                              <div className="mt-3 grid gap-2 rounded-md border bg-background p-3 sm:grid-cols-2">
                                {(() => {
                                  const caps = fieldValidationCapabilities(
                                    field.type,
                                  );
                                  const toggles: Array<[string, string]> = [];
                                  if (caps.wholeNumberToggle)
                                    toggles.push(["integerOnly", "Whole number only"]);
                                  if (caps.dateRange)
                                    toggles.push(
                                      ["blockFutureDates", "Block future dates"],
                                      ["blockPastDates", "Block past dates"],
                                    );
                                  if (caps.uniqueness)
                                    toggles.push(
                                      ["uniqueResponse", "Require a unique answer"],
                                      ["duplicateCheck", "Check this answer for duplicates"],
                                    );
                                  if (caps.dontKnowRefused)
                                    toggles.push(
                                      ["allowDontKnow", "Allow “Don’t know”"],
                                      ["allowRefused", "Allow “Refused”"],
                                    );
                                  return toggles;
                                })().map(([key, label]) => (
                                  <label
                                    className="flex items-center gap-2 text-sm font-semibold"
                                    key={key}
                                  >
                                    <input
                                      checked={Boolean(
                                        field.validation?.[
                                          key as keyof NonNullable<
                                            FormField["validation"]
                                          >
                                        ],
                                      )}
                                      className="h-4 w-4"
                                      onChange={(event) =>
                                        onUpdateValidation({
                                          [key]:
                                            event.target.checked || undefined,
                                        } as Partial<
                                          NonNullable<FormField["validation"]>
                                        >)
                                      }
                                      type="checkbox"
                                    />
                                    {label}
                                  </label>
                                ))}
                              </div>
                              {fieldValidationCapabilities(field.type).uniqueness &&
                              (field.validation?.uniqueResponse || field.validation?.duplicateCheck) ? (
                                <p className="mt-2 text-xs text-muted-foreground">
                                  When this answer repeats a value already submitted for this form, the new
                                  submission is flagged for supervisor review (the officer is not blocked, so
                                  offline data is never lost). Best for IDs like national ID or phone number.
                                </p>
                              ) : null}
                              <div className="mt-4 rounded-md border bg-background p-3">
                                <div className="flex items-center justify-between gap-2">
                                  <div>
                                    <p className="text-sm font-semibold">
                                      Exact data presets
                                    </p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                      Apply common rules that stop wrong entries
                                      before field officers submit the form.
                                    </p>
                                  </div>
                                  <Badge tone="success">Recommended</Badge>
                                </div>
                                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                                  {[
                                    {
                                      label: "Phone format",
                                      patch: {
                                        pattern: "^\\\\+?[0-9 ()-]{7,20}$",
                                      },
                                    },
                                    {
                                      label: "Email format",
                                      patch: {
                                        pattern:
                                          "^[^\\\\s@]+@[^\\\\s@]+\\\\.[^\\\\s@]+$",
                                      },
                                    },
                                    {
                                      label: "ID code",
                                      patch: {
                                        minLength: 3,
                                        maxLength: 30,
                                        pattern: "^[A-Z0-9-]+$",
                                      },
                                    },
                                    {
                                      label: "Positive number",
                                      patch: { min: 0 },
                                    },
                                    {
                                      label: "Age 0-120",
                                      patch: { min: 0, max: 120 },
                                    },
                                    {
                                      label: "Required choice",
                                      patch: {
                                        expression: ". != ''",
                                      },
                                    },
                                    {
                                      label: "GPS <= 20m",
                                      patch: { accuracyMax: 20 },
                                    },
                                    {
                                      label: "No future date",
                                      patch: {
                                        blockFutureDates: true,
                                        expression: ". <= today()",
                                      },
                                    },
                                  ].map(({ label, patch }) => (
                                    <button
                                      className="rounded-md border bg-panel px-2.5 py-2 text-left text-xs transition hover:border-primary/40 hover:bg-primary/10"
                                      key={label}
                                      onClick={() =>
                                        onUpdateForm(
                                          updateField(
                                            form,
                                            field.id,
                                            {
                                              validation: {
                                                ...field.validation,
                                                ...patch,
                                              },
                                            },
                                          ),
                                        )
                                      }
                                      type="button"
                                    >
                                      <span className="font-semibold">
                                        {label}
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                              {[
                                "text",
                                "textarea",
                                "phone",
                                "email",
                                "url",
                              ].includes(field.type) ? (
                                <div className="mt-4 grid gap-3 rounded-md border bg-background p-3 sm:grid-cols-3">
                                  {[
                                    ["uppercase", "Force uppercase"],
                                    ["trim-spaces", "Trim spaces"],
                                    ["unique-value", "Must be unique"],
                                  ].map(([tag, label]) => (
                                    <label
                                      className="flex items-center gap-2 text-sm font-semibold"
                                      key={tag}
                                    >
                                      <input
                                        checked={hasFieldTag(
                                          field,
                                          tag,
                                        )}
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
                              ) : null}
                              {[
                                "number",
                                "decimal",
                                "currency",
                                "rating",
                                "nps",
                              ].includes(field.type) ? (
                                <div className="mt-4 grid gap-3 rounded-md border bg-background p-3 sm:grid-cols-3">
                                  {[
                                    ["integer-only", "Whole number only"],
                                    ["no-negative", "No negative values"],
                                    ["outlier-flag", "Flag outliers"],
                                  ].map(([tag, label]) => (
                                    <label
                                      className="flex items-center gap-2 text-sm font-semibold"
                                      key={tag}
                                    >
                                      <input
                                        checked={hasFieldTag(
                                          field,
                                          tag,
                                        )}
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
                                                validation:
                                                  tag === "integer-only" &&
                                                  event.target.checked
                                                    ? {
                                                        ...field.validation,
                                                        integerOnly: true,
                                                      }
                                                    : tag === "no-negative" &&
                                                  event.target.checked
                                                    ? {
                                                        ...field.validation,
                                                        min: 0,
                                                      }
                                                    : field.validation,
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
                              ) : null}
                              {[
                                "photo",
                                "image",
                                "signature",
                                "audio",
                                "video",
                                "file",
                              ].includes(field.type) ? (
                                <div className="mt-4 grid gap-3 rounded-md border bg-background p-3 sm:grid-cols-3">
                                  <label className="text-sm font-semibold">
                                    Max file size MB
                                    <Input
                                      className="mt-2"
                                      onChange={(event) =>
                                        onUpdateValidation({
                                          maxFileSizeMb:
                                            event.target.value === ""
                                              ? undefined
                                              : Number(event.target.value),
                                        })
                                      }
                                      type="number"
                                      value={
                                        field.validation
                                          ?.maxFileSizeMb ?? ""
                                      }
                                    />
                                  </label>
                                  <label className="text-sm font-semibold">
                                    Max attachments
                                    <Input
                                      className="mt-2"
                                      onChange={(event) =>
                                        onUpdateValidation({
                                          maxAttachmentCount:
                                            event.target.value === ""
                                              ? undefined
                                              : Number(event.target.value),
                                        })
                                      }
                                      type="number"
                                      value={
                                        field.validation
                                          ?.maxAttachmentCount ?? ""
                                      }
                                    />
                                  </label>
                                  <label className="text-sm font-semibold">
                                    Allowed file types
                                    <Input
                                      className="mt-2"
                                      onChange={(event) =>
                                        onUpdateValidation({
                                          allowedFileTypes:
                                            event.target.value || undefined,
                                        })
                                      }
                                      placeholder="jpg,png,pdf"
                                      value={
                                        field.validation
                                          ?.allowedFileTypes ?? ""
                                      }
                                    />
                                  </label>
                                </div>
                              ) : null}
                            </section>
  );
}
