import { Database } from "lucide-react";

import {
  fieldAppearanceWithTag,
  hasFieldTag,
} from "@/components/forms/fieldMetadata";
import { Button } from "@/components/ui/button";
import { HelpHint } from "@/components/ui/help-hint";
import { Input, Select } from "@/components/ui/input";
import { updateField, type DynamicForm, type FormField } from "@/lib/forms";

/** Data handling settings tab (default value, calculation, duplicate/unique, import mapping tags). */
export function DataSettingsPanel({
  field,
  form,
  onUpdateForm,
  onAddReferenceBinding,
}: {
  field: FormField;
  form: DynamicForm;
  onUpdateForm: (form: DynamicForm) => void;
  onAddReferenceBinding: (field: FormField) => void;
}) {
  return (
                            <section className="mt-4 rounded-lg border bg-panel p-4">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <Database
                                    aria-hidden="true"
                                    className="text-primary"
                                    size={16}
                                  />
                                  <h3 className="text-sm font-semibold">
                                    Data and reference
                                  </h3><HelpHint label="About this tab" title="Data and reference">Connect this question to shared datasets and exact-match presets so answers stay consistent across submissions.</HelpHint>
                                </div>
                                <Button
                                  onClick={() =>
                                    onAddReferenceBinding(field)
                                  }
                                  size="sm"
                                  type="button"
                                  variant="secondary"
                                >
                                  <Database aria-hidden="true" />
                                  Bind reference list
                                </Button>
                              </div>
                              <div className="mt-4 grid gap-3 lg:grid-cols-3">
                                <label className="text-sm font-semibold">
                                  Sensitive data
                                  <Select
                                    className="mt-2"
                                    onChange={(event) => {
                                      const current =
                                        field.appearance?.helpText ??
                                        "";
                                      const cleaned = current
                                        .replace("[internal]", "")
                                        .replace("[confidential]", "")
                                        .replace("[restricted]", "")
                                        .replace("[pii]", "")
                                        .trim();
                                      const next = event.target.value
                                        ? `${cleaned} [${event.target.value}]`.trim()
                                        : cleaned;
                                      onUpdateForm(
                                        updateField(
                                          form,
                                          field.id,
                                          {
                                            appearance: {
                                              ...field.appearance,
                                              helpText: next,
                                            },
                                          },
                                        ),
                                      );
                                    }}
                                    value={
                                      field.appearance?.helpText?.includes(
                                        "[pii]",
                                      )
                                        ? "pii"
                                        : field.appearance?.helpText?.includes(
                                              "[restricted]",
                                            )
                                          ? "restricted"
                                          : field.appearance?.helpText?.includes(
                                                "[confidential]",
                                              )
                                            ? "confidential"
                                            : field.appearance?.helpText?.includes(
                                                  "[internal]",
                                                )
                                              ? "internal"
                                              : ""
                                    }
                                  >
                                    <option value="">None</option>
                                    <option value="internal">Internal</option>
                                    <option value="confidential">
                                      Confidential
                                    </option>
                                    <option value="restricted">
                                      Restricted
                                    </option>
                                    <option value="pii">PII</option>
                                  </Select>
                                </label>
                                <label className="text-sm font-semibold">
                                  Display width
                                  <Select
                                    className="mt-2"
                                    onChange={(event) =>
                                      onUpdateForm(
                                        updateField(
                                          form,
                                          field.id,
                                          {
                                            appearance: {
                                              ...field.appearance,
                                              width: event.target.value as
                                                | "full"
                                                | "half"
                                                | "third",
                                            },
                                          },
                                        ),
                                      )
                                    }
                                    value={
                                      field.appearance?.width ?? "full"
                                    }
                                  >
                                    <option value="full">Full width</option>
                                    <option value="half">Half width</option>
                                    <option value="third">Third width</option>
                                  </Select>
                                </label>
                                <label className="flex min-h-10 items-end gap-3 text-sm font-semibold">
                                  <input
                                    checked={Boolean(
                                      field.appearance?.helpText?.includes(
                                        "[web-only]",
                                      ),
                                    )}
                                    className="mb-2 h-4 w-4"
                                    onChange={(event) => {
                                      const current =
                                        field.appearance?.helpText ??
                                        "";
                                      const next = event.target.checked
                                        ? `${current} [web-only]`.trim()
                                        : current
                                            .replace("[web-only]", "")
                                            .trim();
                                      onUpdateForm(
                                        updateField(
                                          form,
                                          field.id,
                                          {
                                            appearance: {
                                              ...field.appearance,
                                              helpText: next,
                                            },
                                          },
                                        ),
                                      );
                                    }}
                                    type="checkbox"
                                  />
                                  <span className="pb-1.5">
                                    Show on web only
                                  </span>
                                </label>
                              </div>
                              <div className="mt-4 grid gap-3 lg:grid-cols-3">
                                <label className="text-sm font-semibold">
                                  Indicator mapping
                                  <Input
                                    className="mt-2"
                                    onChange={(event) =>
                                      onUpdateForm(
                                        updateField(
                                          form,
                                          field.id,
                                          {
                                            appearance: {
                                              ...field.appearance,
                                              helpText:
                                                `${(field.appearance?.helpText ?? "").replace(/\[indicator:[^\]]+\]/g, "").trim()} ${event.target.value ? `[indicator:${event.target.value}]` : ""}`.trim(),
                                            },
                                          },
                                        ),
                                      )
                                    }
                                    placeholder="Indicator code or result ID"
                                    value={
                                      field.appearance?.helpText?.match(
                                        /\[indicator:([^\]]+)\]/,
                                      )?.[1] ?? ""
                                    }
                                  />
                                </label>
                                <label className="text-sm font-semibold">
                                  Data source
                                  <Select
                                    className="mt-2"
                                    onChange={(event) =>
                                      onUpdateForm(
                                        updateField(
                                          form,
                                          field.id,
                                          {
                                            appearance: {
                                              ...field.appearance,
                                              helpText:
                                                `${(field.appearance?.helpText ?? "").replace(/\[source:[^\]]+\]/g, "").trim()} ${event.target.value ? `[source:${event.target.value}]` : ""}`.trim(),
                                            },
                                          },
                                        ),
                                      )
                                    }
                                    value={
                                      field.appearance?.helpText?.match(
                                        /\[source:([^\]]+)\]/,
                                      )?.[1] ?? ""
                                    }
                                  >
                                    <option value="">Field entry</option>
                                    <option value="reference">
                                      Reference list
                                    </option>
                                    <option value="calculated">
                                      Calculated
                                    </option>
                                    <option value="system">System value</option>
                                  </Select>
                                </label>
                                <label className="flex min-h-10 items-end gap-3 text-sm font-semibold">
                                  <input
                                    checked={hasFieldTag(
                                      field,
                                      "mask-on-export",
                                    )}
                                    className="mb-2 h-4 w-4"
                                    onChange={(event) =>
                                      onUpdateForm(
                                        updateField(
                                          form,
                                          field.id,
                                          {
                                            appearance: fieldAppearanceWithTag(
                                              field,
                                              "mask-on-export",
                                              event.target.checked,
                                            ),
                                          },
                                        ),
                                      )
                                    }
                                    type="checkbox"
                                  />
                                  <span className="pb-1.5">Mask on export</span>
                                </label>
                              </div>
                              <div className="mt-4 rounded-md border bg-background p-3">
                                <label className="flex items-center gap-2 text-sm font-semibold">
                                  <input
                                    checked={Boolean(field.carryForward)}
                                    onChange={(event) =>
                                      onUpdateForm(
                                        updateField(form, field.id, {
                                          carryForward: event.target.checked
                                            ? { fromVariable: field.variableName ?? field.id }
                                            : undefined,
                                        }),
                                      )
                                    }
                                    type="checkbox"
                                  />
                                  Carry forward from last visit
                                  <HelpHint label="About carry-forward" title="Carry forward from last visit">
                                    When this form is collected again for the same beneficiary, pre-fill
                                    this answer from their most recent submission (still editable) and
                                    show the previously recorded value. Ideal for baseline → follow-up
                                    and routine monitoring, so officers confirm or update rather than
                                    re-enter.
                                  </HelpHint>
                                </label>
                                {field.carryForward ? (
                                  <label className="mt-2 block text-xs font-medium text-muted-foreground">
                                    Pre-fill from this question’s previous answer
                                    <Select
                                      className="mt-1"
                                      onChange={(event) =>
                                        onUpdateForm(
                                          updateField(form, field.id, {
                                            carryForward: { fromVariable: event.target.value },
                                          }),
                                        )
                                      }
                                      value={field.carryForward.fromVariable}
                                    >
                                      {form.fields
                                        .filter((candidate) => candidate.variableName)
                                        .map((candidate) => (
                                          <option key={candidate.id} value={candidate.variableName}>
                                            {candidate.label}
                                            {candidate.id === field.id ? " (this question)" : ""}
                                          </option>
                                        ))}
                                    </Select>
                                  </label>
                                ) : null}
                              </div>
                            </section>
  );
}
