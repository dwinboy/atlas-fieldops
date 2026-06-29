// Data dictionary / codebook export: a flat, analyst-friendly description of every variable in a
// form — labels, types, the exact value↔label lists for choices, where options come from, validation,
// and relevance — so teams can clean and document collected data. Pure and unit-testable.
import { describeField } from "@/lib/formInsights";
import { exportedOptions, type DynamicForm, type FormField } from "@/lib/forms";

export type CodebookRow = {
  section: string;
  group: string;
  variable: string;
  label: string;
  type: string;
  required: string;
  choices: string;
  source: string;
  validation: string;
  behavior: string;
};

function choicesText(field: FormField): string {
  if (!field.options?.length) return "";
  return exportedOptions(field.options, field.optionValues)
    .map((option) => `${option.value} = ${option.label}`)
    .join(" | ");
}

function sourceText(field: FormField): string {
  const selection = field.selection;
  if (selection && selection.source !== "static") {
    if (selection.source === "dataset") return `dataset:${selection.datasetId ?? ""}`;
    if (selection.source === "question") return `question:${selection.fromQuestionVariable ?? ""}`;
    if (selection.source === "record") return `records:${selection.recordFormId ?? selection.entityType ?? ""}`;
  }
  if (field.carryForward) return `carry-forward:${field.carryForward.fromVariable}`;
  return field.options?.length ? "static list" : "";
}

function validationText(field: FormField): string {
  const v = field.validation;
  if (!v) return "";
  const parts: string[] = [];
  if (v.min != null) parts.push(`min ${v.min}`);
  if (v.max != null) parts.push(`max ${v.max}`);
  if (v.integerOnly) parts.push("whole number");
  if (v.minLength != null) parts.push(`min length ${v.minLength}`);
  if (v.maxLength != null) parts.push(`max length ${v.maxLength}`);
  if (v.pattern) parts.push(`pattern ${v.pattern}`);
  if (v.minSelections != null) parts.push(`min ${v.minSelections} selected`);
  if (v.maxSelections != null) parts.push(`max ${v.maxSelections} selected`);
  if (v.decimalPlaces != null) parts.push(`${v.decimalPlaces} decimals`);
  if (v.unit) parts.push(`unit ${v.unit}`);
  if (v.uniqueResponse) parts.push("unique across submissions");
  if (v.uniqueInGroup) parts.push("unique per row");
  if (v.expression) parts.push(`rule ${v.expression}`);
  return parts.join("; ");
}

function rowFor(field: FormField, sectionTitle: string, group: string): CodebookRow {
  return {
    section: sectionTitle,
    group,
    variable: field.variableName ?? field.id,
    label: field.label,
    type: field.type,
    required: field.required ? "yes" : "no",
    choices: choicesText(field),
    source: sourceText(field),
    validation: validationText(field),
    behavior: describeField(field),
  };
}

/** Builds one row per question (and per repeat-group child) describing how the variable is defined. */
export function buildCodebook(form: DynamicForm): CodebookRow[] {
  const rows: CodebookRow[] = [];
  for (const section of form.sections) {
    const sectionFields = form.fields.filter((field) => field.sectionId === section.id);
    for (const field of sectionFields) {
      rows.push(rowFor(field, section.title, ""));
      if (field.type === "repeat_group" && field.children?.length) {
        for (const child of field.children) {
          rows.push(rowFor(child, section.title, field.label));
        }
      }
    }
  }
  return rows;
}

const COLUMNS: { key: keyof CodebookRow; header: string }[] = [
  { key: "section", header: "Section" },
  { key: "group", header: "Repeat group" },
  { key: "variable", header: "Variable" },
  { key: "label", header: "Label" },
  { key: "type", header: "Type" },
  { key: "required", header: "Required" },
  { key: "choices", header: "Choices (code = label)" },
  { key: "source", header: "Answer source" },
  { key: "validation", header: "Validation" },
  { key: "behavior", header: "Behavior" },
];

function escapeCsv(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

/** Serialises the codebook to CSV (analyst-friendly; opens in Excel/Stata/SPSS/R). */
export function codebookToCsv(form: DynamicForm): string {
  const rows = buildCodebook(form);
  const lines = [COLUMNS.map((column) => escapeCsv(column.header)).join(",")];
  for (const row of rows) {
    lines.push(COLUMNS.map((column) => escapeCsv(String(row[column.key] ?? ""))).join(","));
  }
  return lines.join("\n");
}
