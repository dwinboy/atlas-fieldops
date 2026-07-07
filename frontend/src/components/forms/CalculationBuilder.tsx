import { Calculator } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import {
  buildCalculationExpression,
  calculationPatchForField,
  type CalculationOperation,
  type DynamicForm,
  type FieldType,
  type FormField,
} from "@/lib/forms";

const calculationOperations: {
  description: string;
  label: string;
  minSources: number;
  value: CalculationOperation;
}[] = [
  {
    value: "sum",
    label: "Add totals",
    description: "Add two or more numeric questions.",
    minSources: 1,
  },
  {
    value: "average",
    label: "Average",
    description: "Find the mean value from selected questions.",
    minSources: 1,
  },
  {
    value: "difference",
    label: "Subtract",
    description: "Subtract the second question from the first.",
    minSources: 2,
  },
  {
    value: "product",
    label: "Multiply",
    description: "Multiply selected question answers.",
    minSources: 1,
  },
  {
    value: "percentage",
    label: "Percentage",
    description: "Calculate first question as a percentage of the second.",
    minSources: 2,
  },
  {
    value: "ratio",
    label: "Ratio",
    description: "Divide the first question by the second.",
    minSources: 2,
  },
];

const recommendedCalculationSources = new Set<FieldType>([
  "number",
  "decimal",
  "currency",
  "percentage",
  "counter",
  "rating",
  "nps",
  "slider",
  "range",
  "duration",
  "measurement",
  "yes_no",
  "calculated",
]);

function expressionVariables(expression: string): string[] {
  return [...expression.matchAll(/\$\{([^}]+)\}/g)]
    .map((match) => match[1]?.trim() ?? "")
    .filter(Boolean);
}

function variableForField(field: FormField): string {
  return field.variableName?.trim() || field.id;
}

function displayLabel(field: FormField): string {
  const variableName = variableForField(field);
  return `${field.label || "Untitled question"} (${variableName})`;
}

export function CalculationBuilder({
  compact = false,
  field,
  form,
  onApplyPatch,
}: {
  compact?: boolean;
  field: FormField;
  form: DynamicForm;
  onApplyPatch: (patch: Partial<FormField>) => void;
}) {
  const sourceFields = useMemo(
    () =>
      form.fields.filter((candidate) => {
        if (candidate.id === field.id) return false;
        if (!recommendedCalculationSources.has(candidate.type)) return false;
        return Boolean(variableForField(candidate));
      }),
    [field.id, form.fields],
  );
  const currentExpression = field.calculation?.expression ?? "";
  const [operation, setOperation] = useState<CalculationOperation>("sum");
  const [selectedVariables, setSelectedVariables] = useState<string[]>(() => {
    const existing = expressionVariables(currentExpression);
    return existing.length ? existing : sourceFields.slice(0, 2).map(variableForField);
  });
  const selectedOperation =
    calculationOperations.find((candidate) => candidate.value === operation) ??
    calculationOperations[0];
  const usesPairSources = ["difference", "percentage", "ratio"].includes(operation);
  const selectedForExpression = usesPairSources
    ? selectedVariables.slice(0, 2)
    : selectedVariables;
  const generatedExpression = buildCalculationExpression(operation, selectedForExpression);
  const canApply =
    generatedExpression.length > 0 &&
    selectedForExpression.filter(Boolean).length >= selectedOperation.minSources;

  useEffect(() => {
    const existing = expressionVariables(currentExpression);
    setSelectedVariables(existing.length ? existing : sourceFields.slice(0, 2).map(variableForField));
  }, [currentExpression, field.id, sourceFields]);

  function applyExpression(expression: string, preview: string) {
    onApplyPatch(calculationPatchForField(field, expression, preview));
  }

  function updatePairSource(index: number, value: string) {
    setSelectedVariables((previous) => {
      const next = [...previous];
      next[index] = value;
      return next.filter(Boolean);
    });
  }

  function toggleSource(variableName: string, checked: boolean) {
    setSelectedVariables((previous) => {
      if (checked) return previous.includes(variableName) ? previous : [...previous, variableName];
      return previous.filter((candidate) => candidate !== variableName);
    });
  }

  return (
    <section className="space-y-3 rounded-lg border bg-surface-container-lowest p-3">
      <div className="flex items-start gap-2">
        <Calculator aria-hidden="true" className="mt-0.5 text-primary" size={16} />
        <div>
          <h3 className="text-sm font-semibold">Calculation builder</h3>
          <p className="text-xs leading-5 text-muted-foreground">
            Choose the questions to calculate this answer. Atlas writes the formula for web and mobile.
          </p>
        </div>
      </div>

      {sourceFields.length ? (
        <>
          <label className="block text-sm font-semibold">
            Calculation type
            <Select
              className="mt-2"
              onChange={(event) => setOperation(event.target.value as CalculationOperation)}
              value={operation}
            >
              {calculationOperations.map((candidate) => (
                <option key={candidate.value} value={candidate.value}>
                  {candidate.label}
                </option>
              ))}
            </Select>
          </label>
          <p className="rounded-md bg-background px-3 py-2 text-xs text-muted-foreground">
            {selectedOperation.description}
          </p>

          {usesPairSources ? (
            <div className={compact ? "grid gap-3" : "grid gap-3 md:grid-cols-2"}>
              {["First question", "Second question"].map((label, index) => (
                <label className="text-sm font-semibold" key={label}>
                  {label}
                  <Select
                    className="mt-2"
                    onChange={(event) => updatePairSource(index, event.target.value)}
                    value={selectedVariables[index] ?? (sourceFields[index] ? variableForField(sourceFields[index]) : "")}
                  >
                    <option value="" disabled>
                      Select a question
                    </option>
                    {sourceFields.map((candidate) => (
                      <option key={candidate.id} value={variableForField(candidate)}>
                        {displayLabel(candidate)}
                      </option>
                    ))}
                  </Select>
                </label>
              ))}
            </div>
          ) : (
            <div className="rounded-md border bg-background p-3">
              <p className="text-sm font-semibold">Source questions</p>
              <div className={compact ? "mt-2 space-y-2" : "mt-2 grid gap-2 md:grid-cols-2"}>
                {sourceFields.map((candidate) => {
                  const variableName = variableForField(candidate);
                  return (
                    <label className="flex items-center gap-2 text-sm" key={candidate.id}>
                      <input
                        checked={selectedVariables.includes(variableName)}
                        className="h-4 w-4"
                        onChange={(event) => toggleSource(variableName, event.target.checked)}
                        type="checkbox"
                      />
                      <span>{displayLabel(candidate)}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <div className="rounded-md border bg-background p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold">Generated formula</p>
              <Button
                disabled={!canApply}
                onClick={() =>
                  applyExpression(
                    generatedExpression,
                    `Uses ${selectedForExpression.filter(Boolean).length} source question(s).`,
                  )
                }
                type="button"
              >
                Apply formula
              </Button>
            </div>
            <code className="mt-2 block rounded-md bg-surface-container px-3 py-2 text-xs text-on-surface">
              {generatedExpression || "Choose source questions to generate a formula."}
            </code>
          </div>
        </>
      ) : (
        <div className="rounded-md border bg-background p-3 text-sm text-muted-foreground">
          Add a numeric, rating, yes/no, or calculated question before this field so it can be used as a source.
        </div>
      )}

      <label className="block text-sm font-semibold">
        Manual formula
        <Input
          className="mt-2 font-mono"
          onChange={(event) =>
            applyExpression(event.target.value, "Manual formula saved. Test the form before publishing.")
          }
          placeholder="sum(${quantity}, ${bonus})"
          value={currentExpression}
        />
      </label>
      <p className="text-xs leading-5 text-muted-foreground">
        Use manual formulas for advanced functions such as round, min, max, age, datediff, if, and concat.
      </p>
    </section>
  );
}
