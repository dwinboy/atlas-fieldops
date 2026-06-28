import { Database, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { HelpHint } from "@/components/ui/help-hint";
import { Input } from "@/components/ui/input";
import { type FormControlsSettings } from "@/lib/api";
import { type DynamicForm, type FormField } from "@/lib/forms";
import { cn } from "@/lib/utils";

/** Form-level reference-data bindings tab (bind choice lists/categories to fields). */
export function ReferenceControlsPanel({
  form,
  controls,
  selectedField,
  onUpdateControls,
  choiceListCategories,
  onAddReferenceBinding,
  onSelectField,
}: {
  form: DynamicForm | undefined;
  controls: FormControlsSettings;
  selectedField: FormField | undefined;
  onUpdateControls: (updater: (controls: FormControlsSettings) => FormControlsSettings) => void;
  choiceListCategories: string[];
  onAddReferenceBinding: (field?: FormField) => void;
  onSelectField: (id: string) => void;
}) {
  return (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
              <section className="rounded-lg border bg-background p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold">
                      Reference data bindings
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Bind form questions to official lists and prevent
                      uncontrolled free text.
                    </p>
                  </div>
                  <Button
                    onClick={() => onAddReferenceBinding()}
                    size="sm"
                    type="button"
                    variant="primary"
                  >
                    <Database aria-hidden="true" />
                    Bind selected question
                  </Button>
                </div>
                <div className="mt-4 space-y-3">
                  {controls.reference_bindings.length ? (
                    controls.reference_bindings.map((binding) => (
                      <div
                        className="rounded-lg border bg-panel p-3"
                        key={binding.id}
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">
                              {binding.question_label}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {binding.source} · v{binding.version} ·{" "}
                              {binding.enforce_controlled_values
                                ? "controlled values enforced"
                                : "free text allowed"}
                            </p>
                          </div>
                          <Button
                            aria-label={`Remove reference binding for ${binding.question_label}`}
                            onClick={() =>
                              onUpdateControls((controls) => ({
                                ...controls,
                                reference_bindings:
                                  controls.reference_bindings.filter(
                                    (candidate) => candidate.id !== binding.id,
                                  ),
                              }))
                            }
                            size="icon"
                            type="button"
                            variant="ghost"
                          >
                            <Trash2 aria-hidden="true" />
                          </Button>
                        </div>
                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                          <label className="text-sm font-medium">
                            Reference list
                            <Input
                              className="mt-2"
                              list={`choice-list-categories-${binding.id}`}
                              onChange={(event) =>
                                onUpdateControls((controls) => ({
                                  ...controls,
                                  reference_bindings:
                                    controls.reference_bindings.map(
                                      (candidate) =>
                                        candidate.id === binding.id
                                          ? {
                                              ...candidate,
                                              reference_list_name:
                                                event.target.value,
                                              changed_since_publish: true,
                                            }
                                          : candidate,
                                    ),
                                }))
                              }
                              value={binding.reference_list_name}
                            />
                            <datalist id={`choice-list-categories-${binding.id}`}>
                              {choiceListCategories.map((category) => (
                                <option key={category} value={category} />
                              ))}
                            </datalist>
                          </label>
                          <label className="text-sm font-medium">
                            Parent list
                            <Input
                              className="mt-2"
                              onChange={(event) =>
                                onUpdateControls((controls) => ({
                                  ...controls,
                                  reference_bindings:
                                    controls.reference_bindings.map(
                                      (candidate) =>
                                        candidate.id === binding.id
                                          ? {
                                              ...candidate,
                                              parent_reference:
                                                event.target.value || null,
                                              changed_since_publish: true,
                                            }
                                          : candidate,
                                    ),
                                }))
                              }
                              placeholder="Example: Region"
                              value={binding.parent_reference ?? ""}
                            />
                          </label>
                        </div>
                        {binding.source === "existing" ? (
                          <div className="mt-3 grid gap-3 md:grid-cols-3">
                            <label className="flex items-center gap-2 text-sm font-medium">
                              <input
                                checked={binding.allow_inactive_values}
                                className="h-4 w-4 rounded border-input"
                                onChange={(event) =>
                                  onUpdateControls((controls) => ({
                                    ...controls,
                                    reference_bindings:
                                      controls.reference_bindings.map(
                                        (candidate) =>
                                          candidate.id === binding.id
                                            ? {
                                                ...candidate,
                                                allow_inactive_values:
                                                  event.target.checked,
                                                changed_since_publish: true,
                                              }
                                            : candidate,
                                      ),
                                  }))
                                }
                                type="checkbox"
                              />
                              Allow inactive values
                            </label>
                            <label className="text-sm font-medium">
                              Effective from
                              <Input
                                className="mt-2"
                                onChange={(event) =>
                                  onUpdateControls((controls) => ({
                                    ...controls,
                                    reference_bindings:
                                      controls.reference_bindings.map(
                                        (candidate) =>
                                          candidate.id === binding.id
                                            ? {
                                                ...candidate,
                                                effective_from:
                                                  event.target.value || null,
                                                changed_since_publish: true,
                                              }
                                            : candidate,
                                      ),
                                  }))
                                }
                                type="date"
                                value={binding.effective_from ?? ""}
                              />
                            </label>
                            <label className="text-sm font-medium">
                              Effective to
                              <Input
                                className="mt-2"
                                onChange={(event) =>
                                  onUpdateControls((controls) => ({
                                    ...controls,
                                    reference_bindings:
                                      controls.reference_bindings.map(
                                        (candidate) =>
                                          candidate.id === binding.id
                                            ? {
                                                ...candidate,
                                                effective_to:
                                                  event.target.value || null,
                                                changed_since_publish: true,
                                              }
                                            : candidate,
                                      ),
                                  }))
                                }
                                type="date"
                                value={binding.effective_to ?? ""}
                              />
                            </label>
                          </div>
                        ) : null}
                      </div>
                    ))
                  ) : (
                    <div className="rounded-lg border border-dashed bg-panel p-5 text-center">
                      <Database
                        aria-hidden="true"
                        className="mx-auto text-primary"
                      />
                      <div className="mt-3 flex items-center justify-center gap-2">
                        <p className="text-sm font-semibold">
                          No reference lists attached yet
                        </p>
                        <HelpHint
                          label="About reference lists"
                          title="No reference lists attached yet"
                        >
                          Select a district, community, school, facility,
                          entity, or donor-code question, then bind it to
                          an official list.
                        </HelpHint>
                      </div>
                    </div>
                  )}
                </div>
              </section>
              <aside className="rounded-lg border bg-panel p-4">
                <h3 className="text-sm font-semibold">Available questions</h3>
                <div className="mt-3 space-y-2">
                  {(form?.fields ?? []).slice(0, 12).map((field) => (
                    <button
                      className={cn(
                        "w-full rounded-md border bg-background p-2 text-left text-xs transition hover:border-primary/40 hover:bg-primary/5",
                        selectedField?.id === field.id &&
                          "border-primary/40 bg-primary/10",
                      )}
                      key={field.id}
                      onClick={() => {
                        onSelectField(field.id);
                        onAddReferenceBinding(field);
                      }}
                      type="button"
                    >
                      <span className="block font-semibold">{field.label}</span>
                      <span className="mt-1 block text-muted-foreground">
                        {field.type.replace("_", " ")}
                      </span>
                    </button>
                  ))}
                </div>
              </aside>
            </div>
  );
}
