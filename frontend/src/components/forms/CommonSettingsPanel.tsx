import { ArrowDown, ArrowUp, Copy, Settings2, Trash2 } from "lucide-react";

import {
  fieldAppearanceWithTag,
  hasFieldTag,
} from "@/components/forms/fieldMetadata";
import { ResponseTypeField } from "@/components/forms/ResponseTypeField";
import {
  labelPatchWithAutoVariable,
  normalizeVariableNameInput,
} from "@/components/forms/variableNaming";
import { Button } from "@/components/ui/button";
import { HelpHint } from "@/components/ui/help-hint";
import { Input, Select } from "@/components/ui/input";
import { duplicateField, typeChangePatchForField, updateField, type DynamicForm, type FormField } from "@/lib/forms";

/** Common (basics) settings tab: response-type picker, label/variable, required, position controls. */
export function CommonSettingsPanel({
  field,
  form,
  onUpdateForm,
  onMoveField,
  onDeleteQuestion,
}: {
  field: FormField;
  form: DynamicForm;
  onUpdateForm: (form: DynamicForm) => void;
  onMoveField: (fieldId: string, direction: -1 | 1) => void;
  onDeleteQuestion: (fieldId: string) => void;
}) {
  return (
                            <section className="mt-4 rounded-lg border bg-panel p-4">
                              <div className="flex flex-wrap items-center gap-2">
                                <Settings2
                                  aria-hidden="true"
                                  className="text-primary"
                                  size={16}
                                />
                                <h3 className="text-sm font-semibold">
                                  Common settings
                                </h3>
                                <HelpHint label="About this tab" title="Basics">
                                  The essentials for every question: its response type, the wording officers see, the
                                  variable used in data exports/logic, whether it’s mandatory, and where it sits.
                                </HelpHint>
                              </div>
                              <div className="mt-4">
                                <ResponseTypeField
                                  currentType={field.type}
                                  onSelect={(type) =>
                                    onUpdateForm(
                                      updateField(
                                        form,
                                        field.id,
                                        typeChangePatchForField(field, type),
                                      ),
                                    )
                                  }
                                />
                              </div>
                              <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_1fr]">
                                <label className="block text-sm font-semibold">
                                  <span className="inline-flex items-center gap-1">
                                    Question label
                                    <HelpHint label="About piping answers" title="Pipe in earlier answers">
                                      Insert an earlier answer into this question by typing its variable in{" "}
                                      <code>{"${ }"}</code> — e.g. <code>{"How old is ${respondent_name}?"}</code>.
                                      Inside a repeat group it shows that row’s own answer. Works in the label and hint.
                                    </HelpHint>
                                  </span>
                                  <Input
                                    className="mt-2"
                                    onChange={(event) => {
                                      const siblingVariableNames =
                                        form.fields
                                          .filter(
                                            (candidate) =>
                                              candidate.id !== field.id,
                                          )
                                          .map((candidate) => candidate.variableName)
                                          .filter((name): name is string =>
                                            Boolean(name),
                                          );
                                      onUpdateForm(
                                        updateField(
                                          form,
                                          field.id,
                                          labelPatchWithAutoVariable(
                                            field,
                                            event.target.value,
                                            siblingVariableNames,
                                          ),
                                        ),
                                      );
                                    }}
                                    placeholder="Question shown to field officers"
                                    value={field.label}
                                  />
                                </label>
                                <label className="block text-sm font-semibold">
                                  <span className="inline-flex items-center gap-1.5">
                                    Variable name
                                    <HelpHint label="About variable name" title="Variable name">
                                      The stable code for this answer used in exports, calculations, logic, and reference
                                      filters. Auto-generated from the label; lowercase letters, numbers, and underscores.
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
                                            variableName: normalizeVariableNameInput(event.target.value),
                                          },
                                        ),
                                      )
                                    }
                                    value={
                                      field.variableName ??
                                      field.id
                                    }
                                  />
                                </label>

                                <div className="grid content-end gap-3 sm:grid-cols-2">
                                  <label className="flex min-h-10 items-center gap-3 text-sm font-semibold">
                                    <input
                                      checked={field.required}
                                      className="h-4 w-4"
                                      onChange={(event) =>
                                        onUpdateForm(
                                          updateField(
                                            form,
                                            field.id,
                                            {
                                              required: event.target.checked,
                                            },
                                          ),
                                        )
                                      }
                                      type="checkbox"
                                    />
                                    Mandatory
                                  </label>
                                  <label className="flex min-h-10 items-center gap-3 text-sm font-semibold">
                                    <input
                                      checked={hasFieldTag(
                                        field,
                                        "completion-rate",
                                      )}
                                      className="h-4 w-4"
                                      onChange={(event) =>
                                        onUpdateForm(
                                          updateField(
                                            form,
                                            field.id,
                                            {
                                              appearance: {
                                                ...fieldAppearanceWithTag(
                                                  field,
                                                  "completion-rate",
                                                  event.target.checked,
                                                ),
                                              },
                                            },
                                          ),
                                        )
                                      }
                                      type="checkbox"
                                    />
                                    Required for completion rate
                                  </label>
                                  <label className="flex min-h-10 items-center gap-3 text-sm font-semibold">
                                    <input
                                      checked={hasFieldTag(
                                        field,
                                        "readonly",
                                      )}
                                      className="h-4 w-4"
                                      onChange={(event) =>
                                        onUpdateForm(
                                          updateField(
                                            form,
                                            field.id,
                                            {
                                              appearance: {
                                                ...fieldAppearanceWithTag(
                                                  field,
                                                  "readonly",
                                                  event.target.checked,
                                                ),
                                              },
                                            },
                                          ),
                                        )
                                      }
                                      type="checkbox"
                                    />
                                    Readonly
                                  </label>
                                </div>
                              </div>
                              <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_1fr]">
                                <label className="block text-sm font-semibold">
                                  <span className="inline-flex items-center gap-1.5">
                                    Help text
                                    <HelpHint label="About help text" title="Help text">
                                      Shown under the question to guide the field officer. Use plain language; keep it short.
                                    </HelpHint>
                                  </span>
                                  <Input
                                    className="mt-2"
                                    onChange={(event) =>
                                      onUpdateForm(
                                        updateField(form, field.id, { hint: event.target.value }),
                                      )
                                    }
                                    placeholder="Optional guidance for field officers"
                                    value={field.hint ?? ""}
                                  />
                                </label>
                                <label className="block text-sm font-semibold">
                                  <span className="inline-flex items-center gap-1.5">
                                    Placeholder
                                    <HelpHint label="About placeholder" title="Placeholder">
                                      Faint example text inside the answer box before anything is typed (e.g. “e.g. 25”).
                                    </HelpHint>
                                  </span>
                                  <Input
                                    className="mt-2"
                                    onChange={(event) =>
                                      onUpdateForm(
                                        updateField(form, field.id, {
                                          appearance: { ...field.appearance, placeholder: event.target.value },
                                        }),
                                      )
                                    }
                                    placeholder="Answer hint"
                                    value={field.appearance?.placeholder ?? ""}
                                  />
                                </label>
                              </div>
                              {![
                                "subform",
                                "repeat_group",
                                "matrix_single",
                                "matrix_multi",
                                "grid",
                                "article",
                                "auto_id",
                                "hidden",
                                "calculated",
                                "lookup",
                              ].includes(field.type) ? (
                                <label className="mt-4 block text-sm font-semibold">
                                  <span className="inline-flex items-center gap-1.5">
                                    Default value
                                    <HelpHint label="About default value" title="Default value">
                                      Pre-fills the answer when the officer opens the question; they can still change it.
                                      Leave blank for no default.
                                    </HelpHint>
                                  </span>
                                  {field.options?.length ? (
                                    <Select
                                      className="mt-2"
                                      onChange={(event) =>
                                        onUpdateForm(
                                          updateField(form, field.id, {
                                            defaultValue: event.target.value || undefined,
                                          }),
                                        )
                                      }
                                      value={String(field.defaultValue ?? "")}
                                    >
                                      <option value="">No default</option>
                                      {field.options.map((option) => (
                                        <option key={option} value={option}>
                                          {option}
                                        </option>
                                      ))}
                                    </Select>
                                  ) : (
                                    <Input
                                      className="mt-2"
                                      onChange={(event) =>
                                        onUpdateForm(
                                          updateField(form, field.id, {
                                            defaultValue: event.target.value || undefined,
                                          }),
                                        )
                                      }
                                      placeholder="Pre-filled answer (optional)"
                                      value={String(field.defaultValue ?? "")}
                                    />
                                  )}
                                </label>
                              ) : null}
                              <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
                                <label className="text-sm font-semibold">
                                  Section
                                  <Select
                                    className="mt-2"
                                    onChange={(event) =>
                                      onUpdateForm(
                                        updateField(
                                          form,
                                          field.id,
                                          {
                                            pageId:
                                              form.sections.find(
                                                (section) =>
                                                  section.id ===
                                                  event.target.value,
                                              )?.pageId ?? field.pageId,
                                            sectionId: event.target.value,
                                          },
                                        ),
                                      )
                                    }
                                    value={field.sectionId}
                                  >
                                    {form.sections.map((section) => (
                                      <option
                                        key={section.id}
                                        value={section.id}
                                      >
                                        {section.title}
                                      </option>
                                    ))}
                                  </Select>
                                </label>
                                <div className="flex flex-wrap items-end gap-1.5">
                                  <Button
                                    aria-label="Move selected question up"
                                    disabled={
                                      form.fields.findIndex(
                                        (candidate) =>
                                          candidate.id === field.id,
                                      ) === 0
                                    }
                                    onClick={() =>
                                      onMoveField(field.id, -1)
                                    }
                                    size="sm"
                                    type="button"
                                    variant="secondary"
                                  >
                                    <ArrowUp aria-hidden="true" />
                                    Up
                                  </Button>
                                  <Button
                                    aria-label="Move selected question down"
                                    disabled={
                                      form.fields.findIndex(
                                        (candidate) =>
                                          candidate.id === field.id,
                                      ) ===
                                      form.fields.length - 1
                                    }
                                    onClick={() =>
                                      onMoveField(field.id, 1)
                                    }
                                    size="sm"
                                    type="button"
                                    variant="secondary"
                                  >
                                    <ArrowDown aria-hidden="true" />
                                    Down
                                  </Button>
                                  <Button
                                    onClick={() =>
                                      onUpdateForm(
                                        duplicateField(
                                          form,
                                          field.id,
                                        ),
                                      )
                                    }
                                    size="sm"
                                    type="button"
                                    variant="secondary"
                                  >
                                    <Copy aria-hidden="true" />
                                    Duplicate
                                  </Button>
                                  <Button
                                    onClick={() =>
                                      onDeleteQuestion(field.id)
                                    }
                                    size="sm"
                                    type="button"
                                    variant="danger"
                                  >
                                    <Trash2 aria-hidden="true" />
                                    Delete
                                  </Button>
                                </div>
                              </div>
                            </section>
  );
}
