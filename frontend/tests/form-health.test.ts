import { describe, expect, it } from "vitest";

import { checkFormHealth } from "@/lib/formHealth";
import { createField, type DynamicForm } from "@/lib/forms";

function baseForm(fields: DynamicForm["fields"]): DynamicForm {
  return {
    id: "f",
    name: "F",
    status: "draft",
    version: 1,
    activeVersion: 0,
    sections: [{ id: "s1", title: "Main" }],
    fields,
    updatedAt: new Date().toISOString(),
  };
}

describe("checkFormHealth", () => {
  it("passes a well-formed form", () => {
    const form = baseForm([
      { ...createField("text", "s1"), id: "a", variableName: "name", label: "Name" },
      { ...createField("select", "s1"), id: "b", variableName: "region", label: "Region", options: ["Kano", "Lagos"] },
    ]);
    expect(checkFormHealth(form)).toHaveLength(0);
  });

  it("flags duplicate variable names", () => {
    const form = baseForm([
      { ...createField("text", "s1"), id: "a", variableName: "dup", label: "A" },
      { ...createField("text", "s1"), id: "b", variableName: "dup", label: "B" },
    ]);
    expect(checkFormHealth(form).some((i) => i.severity === "error" && i.message.includes("dup"))).toBe(true);
  });

  it("flags references to unknown variables in logic and piping", () => {
    const form = baseForm([
      {
        ...createField("number", "s1"),
        id: "a",
        variableName: "count",
        label: "How many ${ghost}?",
        logic: [{ id: "r", kind: "show", expression: "${missing} = 'Yes'" }],
      },
    ]);
    const issues = checkFormHealth(form);
    expect(issues.some((i) => i.message.includes("missing"))).toBe(true);
    expect(issues.some((i) => i.message.includes("ghost"))).toBe(true);
  });

  it("flags circular calculations", () => {
    const form = baseForm([
      { ...createField("calculated", "s1"), id: "a", variableName: "x", label: "X", calculation: { expression: "${y} + 1" } },
      { ...createField("calculated", "s1"), id: "b", variableName: "y", label: "Y", calculation: { expression: "${x} + 1" } },
    ]);
    expect(checkFormHealth(form).some((i) => i.message.toLowerCase().includes("circular"))).toBe(true);
  });

  it("flags a choice question with no options and a matrix with no columns", () => {
    const form = baseForm([
      { ...createField("select", "s1"), id: "a", variableName: "pick", label: "Pick", options: [] },
      { ...createField("matrix_single", "s1"), id: "b", variableName: "grid", label: "Grid", matrix: { rows: ["r"], columns: [] } },
    ]);
    const issues = checkFormHealth(form);
    expect(issues.some((i) => i.message.includes("no options"))).toBe(true);
    expect(issues.some((i) => i.message.includes("no columns"))).toBe(true);
  });
});
