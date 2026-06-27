import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";

/** Guided cross-field rule builder: pick an operator and another question to compose a comparison
 * (e.g. this answer ≥ another answer) without hand-writing `${var}` expressions. */
export function CrossFieldRuleBuilder({
  thisVariable,
  siblings,
  onApply,
}: {
  thisVariable: string;
  siblings: { value: string; label: string }[];
  onApply: (expression: string) => void;
}) {
  const ops: { value: string; label: string }[] = [
    { value: ">=", label: "≥ (at least)" },
    { value: "<=", label: "≤ (at most)" },
    { value: ">", label: "> (greater than)" },
    { value: "<", label: "< (less than)" },
    { value: "==", label: "= (equals)" },
    { value: "!=", label: "≠ (not equals)" },
  ];
  const [op, setOp] = useState(">=");
  const [other, setOther] = useState(siblings[0]?.value ?? "");
  if (siblings.length === 0) return null;
  return (
    <div className="rounded-md border border-dashed bg-background p-3">
      <p className="text-sm font-semibold">Compare with another question</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Builds a cross-field rule like “this answer ≥ another answer” — no formula typing.
      </p>
      <div className="mt-2 grid items-center gap-2 lg:grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)_auto]">
        <span className="text-xs font-semibold text-muted-foreground">This answer</span>
        <Select onChange={(event) => setOp(event.target.value)} value={op}>
          {ops.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </Select>
        <Select onChange={(event) => setOther(event.target.value)} value={other}>
          {siblings.map((sibling) => (
            <option key={sibling.value} value={sibling.value}>
              {sibling.label}
            </option>
          ))}
        </Select>
        <Button
          disabled={!thisVariable || !other}
          onClick={() => onApply(`\${${thisVariable}} ${op} \${${other}}`)}
          size="sm"
          type="button"
          variant="secondary"
        >
          Apply
        </Button>
      </div>
    </div>
  );
}
