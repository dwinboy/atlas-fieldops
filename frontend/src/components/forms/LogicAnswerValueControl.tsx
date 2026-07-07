import { Input, Select } from "@/components/ui/input";
import {
  LOGIC_CONDITION_OPERATORS,
  logicValueInputForField,
  type FormField,
  type LogicConditionOperator,
} from "@/lib/forms";

function inputTypeForKind(kind: ReturnType<typeof logicValueInputForField>["kind"]): string {
  if (kind === "number") return "number";
  if (kind === "date") return "date";
  if (kind === "datetime") return "datetime-local";
  if (kind === "time") return "time";
  return "text";
}

export function LogicAnswerValueControl({
  conditionField,
  operator,
  value,
  value2,
  onValueChange,
  onValue2Change,
}: {
  conditionField?: FormField;
  onValue2Change: (value: string) => void;
  onValueChange: (value: string) => void;
  operator: LogicConditionOperator;
  value: string;
  value2: string;
}) {
  const operatorSpec =
    LOGIC_CONDITION_OPERATORS.find((item) => item.value === operator) ??
    LOGIC_CONDITION_OPERATORS[0];
  const control = logicValueInputForField(conditionField);

  if (!operatorSpec.needsValue) {
    return (
      <div className="flex min-h-9 items-center rounded-xl border border-dashed bg-background px-3 text-xs text-muted-foreground">
        No answer value needed
      </div>
    );
  }

  const renderControl = (
    currentValue: string,
    onChange: (nextValue: string) => void,
    placeholder: string,
  ) => {
    if (control.kind === "select" || control.kind === "boolean") {
      const options =
        control.kind === "boolean"
          ? [
              { label: "Yes", value: "Yes" },
              { label: "No", value: "No" },
            ]
          : control.options ?? [];

      if (options.length === 0) {
        return (
          <div className="flex min-h-9 items-center rounded-xl border border-warning/40 bg-warning/10 px-3 text-xs text-warning">
            Add response options first
          </div>
        );
      }

      return (
        <Select onChange={(event) => onChange(event.target.value)} value={currentValue}>
          <option value="">Choose an answer...</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      );
    }

    return (
      <Input
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={inputTypeForKind(control.kind)}
        value={currentValue}
      />
    );
  };

  return (
    <div className="flex items-center gap-1">
      {renderControl(value, onValueChange, operatorSpec.valuePlaceholder ?? "Answer value")}
      {operatorSpec.needsSecondValue ? (
        <>
          <span className="text-xs text-muted-foreground">and</span>
          {renderControl(value2, onValue2Change, "High")}
        </>
      ) : null}
    </div>
  );
}
