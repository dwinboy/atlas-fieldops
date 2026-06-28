import { Plus, Trash2, Workflow } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HelpHint } from "@/components/ui/help-hint";
import { Input, Select } from "@/components/ui/input";
import {
  LOGIC_CONDITION_OPERATORS,
  updateField,
  type DynamicForm,
  type FormField,
  type LogicConditionOperator,
  type LogicRule,
} from "@/lib/forms";

/** Conditional logic settings tab: visual rule builder (action/condition) + advanced expression rules. */
export function LogicSettingsPanel({
  field,
  form,
  onUpdateForm,
  logicActionKind,
  setLogicActionKind,
  logicConditionFieldId,
  setLogicConditionFieldId,
  logicConditionValue,
  setLogicConditionValue,
  logicConditionValue2,
  setLogicConditionValue2,
  logicConditionOperator,
  setLogicConditionOperator,
  advancedLogicKind,
  setAdvancedLogicKind,
  advancedLogicExpression,
  setAdvancedLogicExpression,
  advancedLogicMessage,
  setAdvancedLogicMessage,
  onAddVisualLogicRule,
  onAddAdvancedLogicRule,
}: {
  field: FormField;
  form: DynamicForm;
  onUpdateForm: (form: DynamicForm) => void;
  logicActionKind: LogicRule["kind"];
  setLogicActionKind: (kind: LogicRule["kind"]) => void;
  logicConditionFieldId: string;
  setLogicConditionFieldId: (id: string) => void;
  logicConditionValue: string;
  setLogicConditionValue: (value: string) => void;
  logicConditionValue2: string;
  setLogicConditionValue2: (value: string) => void;
  logicConditionOperator: LogicConditionOperator;
  setLogicConditionOperator: (operator: LogicConditionOperator) => void;
  advancedLogicKind: LogicRule["kind"];
  setAdvancedLogicKind: (kind: LogicRule["kind"]) => void;
  advancedLogicExpression: string;
  setAdvancedLogicExpression: (value: string) => void;
  advancedLogicMessage: string;
  setAdvancedLogicMessage: (value: string) => void;
  onAddVisualLogicRule: () => void;
  onAddAdvancedLogicRule: () => void;
}) {
  return (
                            <section className="mt-4 rounded-lg border bg-panel p-4">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <Workflow
                                    aria-hidden="true"
                                    className="text-primary"
                                    size={16}
                                  />
                                  <h3 className="text-sm font-semibold">
                                    Logic
                                  </h3>
                                  <HelpHint label="About this tab" title="Logic">
                                    Show, hide, require, or skip this question based on earlier answers — build the rule
                                    as a sentence (IF a question = a value THEN …). Combine several conditions with
                                    {" "}<code>and</code> / <code>or</code> (e.g. <code>{"${gender} = 'Female' and ${age} > 18"}</code>).
                                    Rules run live on web and mobile.
                                  </HelpHint>
                                </div>
                                <Badge tone="neutral">
                                  {field.logic?.length ?? 0} rule
                                  {(field.logic?.length ?? 0) === 1
                                    ? ""
                                    : "s"}
                                </Badge>
                              </div>
                              {(() => {
                                const operatorSpec =
                                  LOGIC_CONDITION_OPERATORS.find(
                                    (item) => item.value === logicConditionOperator,
                                  ) ?? LOGIC_CONDITION_OPERATORS[0];
                                return (
                                  <div className="mt-3 grid gap-2 lg:grid-cols-[150px_minmax(0,1fr)_minmax(150px,200px)_minmax(0,1fr)_auto]">
                                    <Select
                                      value={
                                        logicActionKind === "hide" ||
                                        logicActionKind === "required" ||
                                        logicActionKind === "skip"
                                          ? logicActionKind
                                          : "show"
                                      }
                                      onChange={(event) =>
                                        setLogicActionKind(
                                          event.target.value as LogicRule["kind"],
                                        )
                                      }
                                    >
                                      <option value="show">Show when</option>
                                      <option value="hide">Hide when</option>
                                      <option value="required">Require when</option>
                                      <option value="skip">Skip to when</option>
                                    </Select>
                                    <Select
                                      value={
                                        logicConditionFieldId ||
                                        form.fields.find(
                                          (candidate) => candidate.id !== field.id,
                                        )?.id ||
                                        ""
                                      }
                                      onChange={(event) =>
                                        setLogicConditionFieldId(event.target.value)
                                      }
                                    >
                                      {form.fields
                                        .filter(
                                          (candidate) => candidate.id !== field.id,
                                        )
                                        .map((candidate) => (
                                          <option key={candidate.id} value={candidate.id}>
                                            {candidate.label}
                                          </option>
                                        ))}
                                    </Select>
                                    <Select
                                      value={logicConditionOperator}
                                      onChange={(event) =>
                                        setLogicConditionOperator(
                                          event.target.value as LogicConditionOperator,
                                        )
                                      }
                                    >
                                      {LOGIC_CONDITION_OPERATORS.map((item) => (
                                        <option key={item.value} value={item.value}>
                                          {item.label}
                                        </option>
                                      ))}
                                    </Select>
                                    {operatorSpec.needsValue ? (
                                      <div className="flex items-center gap-1">
                                        <Input
                                          onChange={(event) =>
                                            setLogicConditionValue(event.target.value)
                                          }
                                          placeholder={
                                            operatorSpec.valuePlaceholder ?? "Answer value"
                                          }
                                          value={logicConditionValue}
                                        />
                                        {operatorSpec.needsSecondValue ? (
                                          <>
                                            <span className="text-xs text-muted-foreground">
                                              and
                                            </span>
                                            <Input
                                              onChange={(event) =>
                                                setLogicConditionValue2(event.target.value)
                                              }
                                              placeholder="High"
                                              value={logicConditionValue2}
                                            />
                                          </>
                                        ) : null}
                                      </div>
                                    ) : (
                                      <div className="flex items-center text-xs text-muted-foreground">
                                        No value needed
                                      </div>
                                    )}
                                    <Button
                                      disabled={
                                        form.fields.filter(
                                          (candidate) => candidate.id !== field.id,
                                        ).length === 0
                                      }
                                      onClick={onAddVisualLogicRule}
                                      type="button"
                                      variant="primary"
                                    >
                                      <Plus aria-hidden="true" />
                                      Add logic
                                    </Button>
                                  </div>
                                );
                              })()}
                              <div className="mt-4 rounded-md border bg-background p-3">
                                <div className="flex items-center justify-between gap-2">
                                  <div>
                                    <p className="text-sm font-semibold">
                                      Advanced logic expression
                                    </p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                      Use field variables like {"${age}"} or{" "}
                                      {"${consent}"} to require exact responses,
                                      block invalid answers, calculate values,
                                      or control branching.
                                    </p>
                                  </div>
                                  <Badge tone="accent">Exact data</Badge>
                                </div>
                                <div className="mt-3 grid gap-2 lg:grid-cols-[180px_minmax(0,1fr)]">
                                  <Select
                                    value={advancedLogicKind}
                                    onChange={(event) =>
                                      setAdvancedLogicKind(
                                        event.target.value as LogicRule["kind"],
                                      )
                                    }
                                  >
                                    <option value="validation">
                                      Block invalid answer
                                    </option>
                                    <option value="show">Show question</option>
                                    <option value="hide">Hide question</option>
                                    <option value="required">
                                      Require answer
                                    </option>
                                    <option value="skip">Skip flow</option>
                                    <option value="calculation">
                                      Calculate value
                                    </option>
                                    <option value="default">
                                      Default value
                                    </option>
                                    <option value="dynamic_choices">
                                      Dynamic choices
                                    </option>
                                  </Select>
                                  <Input
                                    className="font-mono"
                                    onChange={(event) =>
                                      setAdvancedLogicExpression(
                                        event.target.value,
                                      )
                                    }
                                    placeholder="${age} >= 18 and ${consent} = 'Yes'"
                                    value={advancedLogicExpression}
                                  />
                                </div>
                                <div className="mt-2 grid gap-2 lg:grid-cols-[minmax(0,1fr)_auto]">
                                  <Input
                                    onChange={(event) =>
                                      setAdvancedLogicMessage(
                                        event.target.value,
                                      )
                                    }
                                    placeholder="Message shown when the rule fails or controls this question"
                                    value={advancedLogicMessage}
                                  />
                                  <Button
                                    onClick={onAddAdvancedLogicRule}
                                    type="button"
                                    variant="primary"
                                  >
                                    <Plus aria-hidden="true" />
                                    Add advanced rule
                                  </Button>
                                </div>
                                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                                  {[
                                    ["Consent gate", "${consent} = 'Yes'"],
                                    ["Adult only", "${age} >= 18"],
                                    [
                                      "Female 12-49",
                                      "${gender} = 'Female' and ${age} >= 12 and ${age} <= 49",
                                    ],
                                    ["Positive value", ". >= 0"],
                                    ["GPS required", "${gps_accuracy} <= 20"],
                                    [
                                      "Household members",
                                      "${household_size} > 0",
                                    ],
                                  ].map(([label, expression]) => (
                                    <button
                                      className="rounded-md border bg-panel px-2.5 py-2 text-left text-xs transition hover:border-primary/40 hover:bg-primary/10"
                                      key={label}
                                      onClick={() =>
                                        setAdvancedLogicExpression(expression)
                                      }
                                      type="button"
                                    >
                                      <span className="block font-semibold">
                                        {label}
                                      </span>
                                      <span className="mt-1 block truncate font-mono text-muted-foreground">
                                        {expression}
                                      </span>
                                    </button>
                                  ))}
                                </div>
                                <div className="mt-3">
                                  <div className="flex items-center gap-2">
                                    <p className="text-xs font-semibold">
                                      Calculation examples
                                    </p>
                                    <HelpHint label="About calculations" title="Calculations">
                                      Auto-compute a value from other answers. Functions:{" "}
                                      <code>sum, count, avg, min, max, round, abs, if, coalesce, concat, today, age, datediff</code>.
                                      Pick an example to insert it as a “Calculate value” rule, then edit the variables.
                                    </HelpHint>
                                  </div>
                                  <div className="mt-2 grid gap-2 sm:grid-cols-3">
                                    {(
                                      [
                                        ["Age from DOB", "age(${date_of_birth})"],
                                        ["Conditional score", "if(${score} >= 50, 'Pass', 'Fail')"],
                                        ["Total of items", "sum(${item_a}, ${item_b})"],
                                        ["Round to 1 dp", "round(${amount}, 1)"],
                                        ["Full name", "concat(${first_name}, ' ', ${last_name})"],
                                        ["Days since visit", "datediff(today(), ${last_visit})"],
                                      ] as [string, string][]
                                    ).map(([label, expression]) => (
                                      <button
                                        className="rounded-md border border-dashed bg-panel px-2.5 py-2 text-left text-xs transition hover:border-primary/40 hover:bg-primary/10"
                                        key={label}
                                        onClick={() => {
                                          setAdvancedLogicKind("calculation");
                                          setAdvancedLogicExpression(expression);
                                        }}
                                        type="button"
                                      >
                                        <span className="block font-semibold">{label}</span>
                                        <span className="mt-1 block truncate font-mono text-muted-foreground">
                                          {expression}
                                        </span>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                              {field.logic?.length ? (
                                <div className="mt-3 space-y-2">
                                  {field.logic.map((rule) => (
                                    <div
                                      className="flex items-start justify-between gap-3 rounded-md border bg-background px-3 py-2"
                                      key={rule.id}
                                    >
                                      <div>
                                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                                          {rule.kind.replace("_", " ")}
                                        </p>
                                        <p className="mt-1 font-mono text-xs text-foreground">
                                          {rule.expression}
                                        </p>
                                        {rule.message ? (
                                          <p className="mt-1 text-xs text-muted-foreground">
                                            {rule.message}
                                          </p>
                                        ) : null}
                                      </div>
                                      <Button
                                        aria-label="Remove logic rule"
                                        onClick={() =>
                                          onUpdateForm(
                                            updateField(
                                              form,
                                              field.id,
                                              {
                                                logic: (
                                                  field.logic ?? []
                                                ).filter(
                                                  (candidate) =>
                                                    candidate.id !== rule.id,
                                                ),
                                              },
                                            ),
                                          )
                                        }
                                        size="icon"
                                        type="button"
                                        variant="ghost"
                                      >
                                        <Trash2 aria-hidden="true" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              ) : null}
                            </section>
  );
}
