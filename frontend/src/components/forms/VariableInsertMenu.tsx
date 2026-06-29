import { Select } from "@/components/ui/input";
import { type DynamicForm } from "@/lib/forms";

/** A small "Insert answer…" dropdown that appends a `${variable}` token to an expression/label input,
 * so builders pick an existing question instead of hand-typing variable names (which caused the
 * "unknown variable" errors the health check flags). Resets to the placeholder after each insert. */
export function VariableInsertMenu({
  form,
  excludeFieldId,
  onInsert,
  label = "Insert answer…",
}: {
  form: DynamicForm;
  excludeFieldId?: string;
  onInsert: (token: string) => void;
  label?: string;
}) {
  const options = form.fields
    .filter((field) => field.id !== excludeFieldId && field.variableName)
    .map((field) => ({ variable: field.variableName as string, label: field.label }));

  if (options.length === 0) return null;

  return (
    <Select
      aria-label={label}
      className="h-8 w-40 text-xs"
      onChange={(event) => {
        const variable = event.target.value;
        if (variable) onInsert(`\${${variable}}`);
        event.target.value = "";
      }}
      value=""
    >
      <option value="">{label}</option>
      {options.map((option) => (
        <option key={option.variable} value={option.variable}>
          {option.label}
        </option>
      ))}
    </Select>
  );
}
