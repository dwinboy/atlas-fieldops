import { Check, Database, Palette, Plus, Settings2, Sparkles, Trash2, Type, Variable, Workflow } from "lucide-react";

import { ChoiceOptionsEditor } from "@/components/forms/ChoiceOptionsEditor";
import { ResponseTypeField } from "@/components/forms/ResponseTypeField";
import {
  isValidVariableName,
  labelPatchWithAutoVariable,
  normalizeVariableNameInput,
} from "@/components/forms/variableNaming";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import {
  fieldValidationCapabilities,
  logicValueInputForField,
  typeChangePatchForField,
  updateField,
  type DynamicForm,
  type FormField,
  type LogicRule,
} from "@/lib/forms";
import { cn } from "@/lib/utils";

export type RightPanelTab =
  | "field"
  | "validation"
  | "logic"
  | "calculation"
  | "appearance"
  | "advanced";

export function FieldPropertiesPanel({
  field,
  form,
  logicActionKind,
  logicConditionFieldId,
  logicConditionValue,
  onApplySmartSetup,
  onBindReference,
  onAddVisualLogicRule,
  onTabChange,
  onUpdateForm,
  setLogicActionKind,
  setLogicConditionFieldId,
  setLogicConditionValue,
  tab,
}: {
  field?: FormField;
  form?: DynamicForm;
  logicActionKind: LogicRule["kind"];
  logicConditionFieldId: string;
  logicConditionValue: string;
  onApplySmartSetup: (
    kind: "required" | "email" | "phone" | "gps" | "yes_no" | "skip_rule",
  ) => void;
  onAddVisualLogicRule: () => void;
  onBindReference: (field?: FormField) => void;
  onTabChange: (tab: RightPanelTab) => void;
  onUpdateForm: (form: DynamicForm) => void;
  setLogicActionKind: (kind: LogicRule["kind"]) => void;
  setLogicConditionFieldId: (fieldId: string) => void;
  setLogicConditionValue: (value: string) => void;
  tab: RightPanelTab;
}) {
  if (!form || !field) {
    return (
      <section className="rounded-lg border bg-surface-container-lowest p-4">
        <div className="flex items-center gap-2">
          <Settings2 aria-hidden="true" className="text-primary" size={17} />
          <h2 className="text-sm font-semibold">Properties</h2>
        </div>
        <div className="mt-4 rounded-lg border border-dashed bg-background/70 p-5 text-center text-sm text-muted-foreground">
          Select a question on the canvas to edit its label, variable,
          validation, logic, reference data, and appearance.
        </div>
      </section>
    );
  }

  const updateSelectedField = (patch: Partial<FormField>) =>
    onUpdateForm(updateField(form, field.id, patch));
  const updateValidation = (patch: Partial<NonNullable<FormField["validation"]>>) =>
    updateSelectedField({
      validation: {
        ...field.validation,
        ...patch,
      },
    });
  const siblingVariableNames = form.fields
    .filter((candidate) => candidate.id !== field.id)
    .map((candidate) => candidate.variableName)
    .filter((name): name is string => Boolean(name));
  const logicRules = field.logic ?? [];
  const validationCaps = fieldValidationCapabilities(field.type);
  const hasAnyValidationOption =
    validationCaps.numericRange ||
    validationCaps.decimals ||
    validationCaps.textLength ||
    validationCaps.pattern ||
    validationCaps.dateRange ||
    validationCaps.selections ||
    validationCaps.allowOther ||
    validationCaps.gpsAccuracy ||
    validationCaps.fileLimits ||
    validationCaps.uniqueness ||
    validationCaps.dontKnowRefused ||
    validationCaps.wholeNumberToggle;
  // The logic builder's answer-value control follows the picked condition question's response type.
  const resolvedConditionFieldId =
    logicConditionFieldId ||
    form.fields.find((candidate) => candidate.id !== field.id)?.id ||
    "";
  const logicConditionField = form.fields.find(
    (candidate) => candidate.id === resolvedConditionFieldId,
  );
  const logicValueControl = logicValueInputForField(logicConditionField);

  return (
    <section className="rounded-lg border bg-surface-container-lowest p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Settings2 aria-hidden="true" className="text-primary" size={17} />
            <h2 className="text-sm font-semibold">Properties</h2>
          </div>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {field.label}
          </p>
        </div>
        <Badge tone={field.required ? "warning" : "neutral"}>
          {field.required ? "Required" : "Optional"}
        </Badge>
      </div>

      <div className="mt-4 grid grid-cols-5 gap-1 rounded-md border bg-background p-1">
        {(
          [
            ["field", Settings2, "General"],
            ["validation", Check, "Validation"],
            ["logic", Workflow, "Logic"],
            ["advanced", Database, "Data"],
            ["appearance", Palette, "Appearance"],
          ] satisfies [RightPanelTab, typeof Type, string][]
        ).map(([nextTab, Icon, label]) => (
          <button
            aria-label={label}
            className={cn(
              "flex h-8 items-center justify-center rounded text-muted-foreground transition hover:bg-muted hover:text-foreground",
              tab === nextTab &&
                "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
            )}
            key={nextTab}
            onClick={() => onTabChange(nextTab)}
            title={label}
            type="button"
          >
            <Icon aria-hidden="true" size={15} />
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-md border bg-background p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold">Setup checklist</p>
          <Badge tone="accent">Selected</Badge>
        </div>
        <div className="mt-3 grid gap-2 text-xs">
          {[
            ["Label", field.label.trim().length > 0],
            [
              "Variable",
              isValidVariableName(field.variableName?.trim()),
            ],
            ["Choices", !field.options || field.options.length >= 2],
            [
              "Validation",
              Boolean(field.validation && Object.keys(field.validation).length),
            ],
            ["Logic", Boolean(field.logic?.length)],
          ].map(([label, done]) => (
            <div className="flex items-center gap-2" key={String(label)}>
              <span
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full border",
                  done
                    ? "border-success bg-success/10 text-success"
                    : "border-muted text-muted-foreground",
                )}
              >
                <Check aria-hidden="true" size={12} />
              </span>
              <span
                className={done ? "text-foreground" : "text-muted-foreground"}
              >
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {tab === "field" ? (
        <div className="mt-4 space-y-4">
          <ResponseTypeField
            currentType={field.type}
            onSelect={(type) =>
              updateSelectedField(typeChangePatchForField(field, type))
            }
          />
          <label className="block text-sm font-medium">
            Question label
            <Input
              className="mt-2"
              onChange={(event) =>
                updateSelectedField(
                  labelPatchWithAutoVariable(
                    field,
                    event.target.value,
                    siblingVariableNames,
                  ),
                )
              }
              value={field.label}
            />
          </label>
          <label className="block text-sm font-medium">
            Variable name
            <Input
              className="mt-2 font-mono"
              onChange={(event) =>
                updateSelectedField({ variableName: normalizeVariableNameInput(event.target.value) })
              }
              value={field.variableName ?? field.id}
            />
          </label>
          <label className="block text-sm font-medium">
            Help text
            <Input
              className="mt-2"
              onChange={(event) =>
                updateSelectedField({ hint: event.target.value })
              }
              placeholder="Explain what the enumerator should capture"
              value={field.hint ?? ""}
            />
          </label>
          <label className="block text-sm font-medium">
            Placeholder
            <Input
              className="mt-2"
              onChange={(event) =>
                updateSelectedField({
                  appearance: {
                    ...field.appearance,
                    placeholder: event.target.value,
                  },
                })
              }
              value={field.appearance?.placeholder ?? ""}
            />
          </label>
          <div className="grid gap-2">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                checked={field.required}
                className="h-4 w-4"
                onChange={(event) =>
                  updateSelectedField({ required: event.target.checked })
                }
                type="checkbox"
              />
              Required
            </label>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                checked={Boolean(
                  field.appearance?.helpText?.includes("[readonly]"),
                )}
                className="h-4 w-4"
                onChange={(event) =>
                  updateSelectedField({
                    appearance: {
                      ...field.appearance,
                      helpText: event.target.checked ? "[readonly]" : "",
                    },
                  })
                }
                type="checkbox"
              />
              Read only
            </label>
          </div>
          {field.options ? (
            <label className="block text-sm font-medium">
              Option list
              <ChoiceOptionsEditor
                key={`${field.id}-properties`}
                onChange={(options) =>
                  updateSelectedField({
                    options,
                  })
                }
                options={field.options}
              />
              <span className="mt-1 block text-xs font-normal text-muted-foreground">
                Press Enter to add another response option.
              </span>
            </label>
          ) : null}
        </div>
      ) : null}

      {tab === "validation" ? (
        <div className="mt-4 space-y-4">
          <p className="rounded-md border bg-background p-2 text-xs text-muted-foreground">
            Showing validations for a{" "}
            <span className="font-semibold">{field.type.replace("_", " ")}</span>{" "}
            answer. Change the question type to see different rules.
          </p>
          {validationCaps.numericRange ? (
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm font-medium">
                Minimum value
                <Input
                  className="mt-2"
                  onChange={(event) =>
                    updateValidation({
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
              <label className="text-sm font-medium">
                Maximum value
                <Input
                  className="mt-2"
                  onChange={(event) =>
                    updateValidation({
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
            </div>
          ) : null}
          {validationCaps.wholeNumberToggle ? (
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                checked={Boolean(field.validation?.integerOnly)}
                className="h-4 w-4"
                onChange={(event) =>
                  updateValidation({ integerOnly: event.target.checked || undefined })
                }
                type="checkbox"
              />
              Only whole numbers (no decimals)
            </label>
          ) : null}
          {validationCaps.decimals ? (
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm font-medium">
                Decimal places
                <Input
                  className="mt-2"
                  min={0}
                  onChange={(event) =>
                    updateValidation({
                      decimalPlaces:
                        event.target.value === ""
                          ? undefined
                          : Number(event.target.value),
                    })
                  }
                  type="number"
                  value={field.validation?.decimalPlaces ?? ""}
                />
              </label>
              <label className="text-sm font-medium">
                Unit (e.g. kg, ha, %)
                <Input
                  className="mt-2"
                  onChange={(event) =>
                    updateValidation({ unit: event.target.value || undefined })
                  }
                  value={field.validation?.unit ?? ""}
                />
              </label>
            </div>
          ) : null}
          {validationCaps.textLength ? (
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm font-medium">
                Minimum length
                <Input
                  className="mt-2"
                  onChange={(event) =>
                    updateValidation({
                      minLength:
                        event.target.value === ""
                          ? undefined
                          : Number(event.target.value),
                    })
                  }
                  type="number"
                  value={field.validation?.minLength ?? ""}
                />
              </label>
              <label className="text-sm font-medium">
                Maximum length
                <Input
                  className="mt-2"
                  onChange={(event) =>
                    updateValidation({
                      maxLength:
                        event.target.value === ""
                          ? undefined
                          : Number(event.target.value),
                    })
                  }
                  type="number"
                  value={field.validation?.maxLength ?? ""}
                />
              </label>
            </div>
          ) : null}
          {validationCaps.selections ? (
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm font-medium">
                Minimum selections
                <Input
                  className="mt-2"
                  onChange={(event) =>
                    updateValidation({
                      minSelections:
                        event.target.value === ""
                          ? undefined
                          : Number(event.target.value),
                    })
                  }
                  type="number"
                  value={field.validation?.minSelections ?? ""}
                />
              </label>
              <label className="text-sm font-medium">
                Maximum selections
                <Input
                  className="mt-2"
                  onChange={(event) =>
                    updateValidation({
                      maxSelections:
                        event.target.value === ""
                          ? undefined
                          : Number(event.target.value),
                    })
                  }
                  type="number"
                  value={field.validation?.maxSelections ?? ""}
                />
              </label>
            </div>
          ) : null}
          {validationCaps.allowOther ? (
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                checked={Boolean(field.validation?.allowOther)}
                className="h-4 w-4"
                onChange={(event) =>
                  updateValidation({ allowOther: event.target.checked || undefined })
                }
                type="checkbox"
              />
              Allow “Other (specify)” with a free-text box
            </label>
          ) : null}
          {validationCaps.dateRange ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm font-medium">
                  Earliest date
                  <Input
                    className="mt-2"
                    onChange={(event) =>
                      updateValidation({ minDate: event.target.value || undefined })
                    }
                    type="date"
                    value={field.validation?.minDate ?? ""}
                  />
                </label>
                <label className="text-sm font-medium">
                  Latest date
                  <Input
                    className="mt-2"
                    onChange={(event) =>
                      updateValidation({ maxDate: event.target.value || undefined })
                    }
                    type="date"
                    value={field.validation?.maxDate ?? ""}
                  />
                </label>
              </div>
              <div className="grid gap-2 rounded-md border bg-background p-3 text-sm">
                {(
                  [
                    ["blockFutureDates", "Block future dates"],
                    ["blockPastDates", "Block past dates"],
                    ["defaultToday", "Pre-fill today’s date when the question opens"],
                  ] as const
                ).map(([key, label]) => (
                  <label className="flex items-center gap-2 font-medium" key={key}>
                    <input
                      checked={Boolean(field.validation?.[key])}
                      className="h-4 w-4"
                      onChange={(event) =>
                        updateValidation({ [key]: event.target.checked || undefined })
                      }
                      type="checkbox"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </>
          ) : null}
          {validationCaps.pattern ? (
            <label className="block text-sm font-medium">
              Regex pattern
              <Input
                className="mt-2 font-mono"
                onChange={(event) =>
                  updateValidation({ pattern: event.target.value })
                }
                placeholder="^[A-Z0-9-]+$"
                value={field.validation?.pattern ?? ""}
              />
            </label>
          ) : null}
          {validationCaps.gpsAccuracy ? (
            <label className="block text-sm font-medium">
              Maximum GPS accuracy in meters
              <Input
                className="mt-2"
                onChange={(event) =>
                  updateValidation({
                    accuracyMax:
                      event.target.value === ""
                        ? undefined
                        : Number(event.target.value),
                  })
                }
                type="number"
                value={field.validation?.accuracyMax ?? ""}
              />
            </label>
          ) : null}
          {validationCaps.fileLimits ? (
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm font-medium">
                Max file size MB
                <Input
                  className="mt-2"
                  onChange={(event) =>
                    updateValidation({
                      maxFileSizeMb:
                        event.target.value === ""
                          ? undefined
                          : Number(event.target.value),
                    })
                  }
                  type="number"
                  value={field.validation?.maxFileSizeMb ?? ""}
                />
              </label>
              <label className="text-sm font-medium">
                Max attachments
                <Input
                  className="mt-2"
                  onChange={(event) =>
                    updateValidation({
                      maxAttachmentCount:
                        event.target.value === ""
                          ? undefined
                          : Number(event.target.value),
                    })
                  }
                  type="number"
                  value={field.validation?.maxAttachmentCount ?? ""}
                />
              </label>
              <label className="block text-sm font-medium sm:col-span-2">
                Allowed file types
                <Input
                  className="mt-2"
                  onChange={(event) =>
                    updateValidation({
                      allowedFileTypes: event.target.value || undefined,
                    })
                  }
                  placeholder="jpg,png,pdf"
                  value={field.validation?.allowedFileTypes ?? ""}
                />
              </label>
            </div>
          ) : null}
          {validationCaps.uniqueness ? (
            <div className="grid gap-2 rounded-md border bg-background p-3 text-sm">
              {(
                [
                  ["uniqueResponse", "Require a unique answer in this form"],
                  ["duplicateCheck", "Check this answer for duplicates"],
                ] as const
              ).map(([key, label]) => (
                <label className="flex items-center gap-2 font-medium" key={key}>
                  <input
                    checked={Boolean(field.validation?.[key])}
                    className="h-4 w-4"
                    onChange={(event) =>
                      updateValidation({ [key]: event.target.checked || undefined })
                    }
                    type="checkbox"
                  />
                  {label}
                </label>
              ))}
            </div>
          ) : null}
          {validationCaps.dontKnowRefused ? (
            <div className="grid gap-2 rounded-md border bg-background p-3 text-sm">
              {(
                [
                  ["allowDontKnow", "Allow “Don’t know” as a valid response"],
                  ["allowRefused", "Allow “Refused” as a valid response"],
                ] as const
              ).map(([key, label]) => (
                <label className="flex items-center gap-2 font-medium" key={key}>
                  <input
                    checked={Boolean(field.validation?.[key])}
                    className="h-4 w-4"
                    onChange={(event) =>
                      updateValidation({ [key]: event.target.checked || undefined })
                    }
                    type="checkbox"
                  />
                  {label}
                </label>
              ))}
            </div>
          ) : null}
          <label className="block text-sm font-medium">
            Custom validation message
            <Input
              className="mt-2"
              onChange={(event) =>
                updateValidation({
                  customMessage: event.target.value || undefined,
                })
              }
              placeholder="Explain the correction in plain language"
              value={field.validation?.customMessage ?? ""}
            />
          </label>
          <label className="block text-sm font-medium">
            Cross-field validation
            <Input
              className="mt-2 font-mono"
              onChange={(event) =>
                updateValidation({ expression: event.target.value })
              }
              placeholder="${end_date} >= ${start_date}"
              value={field.validation?.expression ?? ""}
            />
          </label>
          <div className="rounded-md border bg-background p-3">
            <p className="text-sm font-semibold">Validation preview</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {Object.keys(field.validation ?? {}).length
                ? "Rules will be checked before submission and surfaced in data quality review."
                : hasAnyValidationOption
                  ? "No validation rules configured for this question yet."
                  : "This question type has no extra validation rules — it only supports Required."}
            </p>
          </div>
        </div>
      ) : null}

      {tab === "logic" ? (
        <div className="mt-4 space-y-3">
          <div className="rounded-md border bg-primary/5 p-3">
            <div className="flex items-center gap-2">
              <Sparkles aria-hidden="true" className="text-primary" size={15} />
              <p className="text-sm font-semibold">Build logic as a sentence</p>
            </div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Choose a condition. Atlas converts it into a form logic rule.
            </p>
            <div className="mt-3 grid gap-2">
              <Select
                value={
                  logicActionKind === "hide" ||
                  logicActionKind === "required" ||
                  logicActionKind === "skip"
                    ? logicActionKind
                    : "show"
                }
                onChange={(event) =>
                  setLogicActionKind(event.target.value as LogicRule["kind"])
                }
              >
                <option value="show">Show this question when</option>
                <option value="hide">Hide this question when</option>
                <option value="required">Require this question when</option>
                <option value="skip">Skip to this question when</option>
              </Select>
              <Select
                value={
                  logicConditionFieldId ||
                  form.fields.find((candidate) => candidate.id !== field.id)
                    ?.id ||
                  ""
                }
                onChange={(event) =>
                  setLogicConditionFieldId(event.target.value)
                }
              >
                {form.fields
                  .filter((candidate) => candidate.id !== field.id)
                  .map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.label}
                    </option>
                  ))}
              </Select>
              {logicValueControl.kind === "select" ? (
                <Select
                  onChange={(event) => setLogicConditionValue(event.target.value)}
                  value={logicConditionValue}
                >
                  <option value="">Choose an answer…</option>
                  {(logicValueControl.options ?? []).map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </Select>
              ) : logicValueControl.kind === "boolean" ? (
                <Select
                  onChange={(event) => setLogicConditionValue(event.target.value)}
                  value={logicConditionValue}
                >
                  <option value="">Choose an answer…</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </Select>
              ) : (
                <Input
                  onChange={(event) => setLogicConditionValue(event.target.value)}
                  placeholder={
                    logicValueControl.kind === "number"
                      ? "Answer value, for example 18"
                      : logicValueControl.kind === "date"
                        ? ""
                        : "Answer value, for example Yes, Female, or High"
                  }
                  type={
                    logicValueControl.kind === "number"
                      ? "number"
                      : logicValueControl.kind === "date"
                        ? "date"
                        : logicValueControl.kind === "datetime"
                          ? "datetime-local"
                          : logicValueControl.kind === "time"
                            ? "time"
                            : "text"
                  }
                  value={logicConditionValue}
                />
              )}
              <Button
                disabled={
                  form.fields.filter((candidate) => candidate.id !== field.id)
                    .length === 0
                }
                onClick={onAddVisualLogicRule}
                type="button"
                variant="primary"
              >
                <Plus aria-hidden="true" />
                Add sentence logic
              </Button>
            </div>
          </div>
          <div className="rounded-md border bg-background p-3">
            <p className="text-sm font-semibold">Visual logic builder</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Configure IF answer conditions THEN show, require, skip, or load
              choices.
            </p>
          </div>
          {logicRules.map((rule) => (
            <div className="rounded-md border bg-background p-3" key={rule.id}>
              <div className="flex items-center justify-between gap-2">
                <Badge tone="accent">{rule.kind.replace("_", " ")}</Badge>
                <Button
                  aria-label={`Remove ${rule.kind} rule`}
                  onClick={() =>
                    updateSelectedField({
                      logic: logicRules.filter(
                        (candidate) => candidate.id !== rule.id,
                      ),
                    })
                  }
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </div>
              <div className="mt-3 grid gap-2">
                <Select
                  onChange={(event) =>
                    updateSelectedField({
                      logic: logicRules.map((candidate) =>
                        candidate.id === rule.id
                          ? {
                              ...candidate,
                              kind: event.target.value as LogicRule["kind"],
                            }
                          : candidate,
                      ),
                    })
                  }
                  value={rule.kind}
                >
                  <option value="show">Show If</option>
                  <option value="hide">Hide If</option>
                  <option value="required">Required If</option>
                  <option value="skip">Skip To</option>
                  <option value="dynamic_choices">Dynamic Choices</option>
                </Select>
                <Input
                  onChange={(event) =>
                    updateSelectedField({
                      logic: logicRules.map((candidate) =>
                        candidate.id === rule.id
                          ? { ...candidate, expression: event.target.value }
                          : candidate,
                      ),
                    })
                  }
                  placeholder="IF ${gender} = 'Female'"
                  value={rule.expression}
                />
                <Input
                  onChange={(event) =>
                    updateSelectedField({
                      logic: logicRules.map((candidate) =>
                        candidate.id === rule.id
                          ? { ...candidate, message: event.target.value }
                          : candidate,
                      ),
                    })
                  }
                  placeholder="THEN describe the action"
                  value={rule.message ?? ""}
                />
              </div>
            </div>
          ))}
          <div className="grid grid-cols-2 gap-2">
            {[
              ["show", "Show If"],
              ["required", "Required If"],
              ["skip", "Skip To"],
              ["dynamic_choices", "Dynamic Choices"],
            ].map(([kind, label]) => (
              <Button
                key={kind}
                onClick={() =>
                  updateSelectedField({
                    logic: [
                      ...logicRules,
                      {
                        id: `${field.id}-${kind}-${Date.now()}`,
                        kind: kind as LogicRule["kind"],
                        expression: "${answer} = 'Yes'",
                        message: String(label),
                      },
                    ],
                  })
                }
                type="button"
                variant="secondary"
              >
                <Plus aria-hidden="true" />
                {label}
              </Button>
            ))}
          </div>
        </div>
      ) : null}

      {tab === "advanced" ? (
        <div className="mt-4 space-y-4">
          <Button
            className="w-full"
            onClick={() => onBindReference(field)}
            type="button"
            variant="secondary"
          >
            <Database aria-hidden="true" />
            Bind reference list
          </Button>
          <label className="block text-sm font-medium">
            Indicator mapping
            <Input className="mt-2" placeholder="Example: household_income" />
          </label>
          <label className="block text-sm font-medium">
            Sensitive data classification
            <Select className="mt-2" defaultValue="internal">
              <option value="public">Public</option>
              <option value="internal">Internal</option>
              <option value="confidential">Confidential</option>
              <option value="restricted">Restricted</option>
              <option value="highly_sensitive">Highly Sensitive</option>
            </Select>
          </label>
          {field.repeat ? (
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm font-medium">
                Repeat min
                <Input
                  className="mt-2"
                  onChange={(event) =>
                    updateSelectedField({
                      repeat: {
                        ...field.repeat,
                        min:
                          event.target.value === ""
                            ? undefined
                            : Number(event.target.value),
                      },
                    })
                  }
                  type="number"
                  value={field.repeat.min ?? ""}
                />
              </label>
              <label className="text-sm font-medium">
                Repeat max
                <Input
                  className="mt-2"
                  onChange={(event) =>
                    updateSelectedField({
                      repeat: {
                        ...field.repeat,
                        max:
                          event.target.value === ""
                            ? undefined
                            : Number(event.target.value),
                      },
                    })
                  }
                  type="number"
                  value={field.repeat.max ?? ""}
                />
              </label>
            </div>
          ) : null}
        </div>
      ) : null}

      {tab === "appearance" ? (
        <div className="mt-4 space-y-4">
          <label className="block text-sm font-medium">
            Width
            <Select
              className="mt-2"
              onChange={(event) =>
                updateSelectedField({
                  appearance: {
                    ...field.appearance,
                    width: event.target.value as "full" | "half" | "third",
                  },
                })
              }
              value={field.appearance?.width ?? "full"}
            >
              <option value="full">Full width</option>
              <option value="half">Half width</option>
              <option value="third">One third</option>
            </Select>
          </label>
          <label className="block text-sm font-medium">
            Mobile display hint
            <Input
              className="mt-2"
              onChange={(event) =>
                updateSelectedField({
                  appearance: {
                    ...field.appearance,
                    helpText: event.target.value,
                  },
                })
              }
              value={field.appearance?.helpText ?? ""}
            />
          </label>
          {field.matrix ? (
            <div className="space-y-3">
              <label className="block text-sm font-medium">
                Matrix rows
                <Textarea
                  className="mt-2 min-h-20"
                  onChange={(event) =>
                    updateSelectedField({
                      matrix: {
                        rows: event.target.value.split("\n").filter(Boolean),
                        columns: field.matrix?.columns ?? [],
                        scoring: field.matrix?.scoring,
                      },
                    })
                  }
                  value={field.matrix.rows.join("\n")}
                />
              </label>
              <label className="block text-sm font-medium">
                Matrix columns
                <Textarea
                  className="mt-2 min-h-20"
                  onChange={(event) =>
                    updateSelectedField({
                      matrix: {
                        rows: field.matrix?.rows ?? [],
                        columns: event.target.value.split("\n").filter(Boolean),
                        scoring: field.matrix?.scoring,
                      },
                    })
                  }
                  value={field.matrix.columns.join("\n")}
                />
              </label>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-4 grid grid-cols-2 gap-2">
        {[
          ["required", "Require"],
          ["yes_no", "Yes / No"],
          ["gps", "GPS"],
          ["skip_rule", "Show rule"],
        ].map(([kind, label]) => (
          <Button
            key={kind}
            onClick={() =>
              onApplySmartSetup(
                kind as
                  | "required"
                  | "email"
                  | "phone"
                  | "gps"
                  | "yes_no"
                  | "skip_rule",
              )
            }
            size="sm"
            type="button"
            variant="secondary"
          >
            {label}
          </Button>
        ))}
      </div>
    </section>
  );
}
