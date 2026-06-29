import { describe, expect, it } from "vitest";

import { diffForms } from "@/lib/formDiff";
import { createField, type DynamicForm } from "@/lib/forms";

function form(fields: DynamicForm["fields"]): DynamicForm {
  return {
    id: "f",
    name: "F",
    status: "published",
    version: 1,
    activeVersion: 1,
    sections: [{ id: "s1", title: "Main" }],
    fields,
    updatedAt: new Date().toISOString(),
  };
}

describe("diffForms", () => {
  it("flags removed questions, renames, type changes, and removed option codes as breaking", () => {
    const prev = form([
      { ...createField("text", "s1"), id: "a", variableName: "name", label: "Name" },
      { ...createField("number", "s1"), id: "b", variableName: "age", label: "Age" },
      { ...createField("select", "s1"), id: "c", variableName: "region", label: "Region", options: ["Kano", "Lagos"], optionValues: ["KN", "LG"] },
    ]);
    const next = form([
      // a removed
      { ...createField("text", "s1"), id: "b", variableName: "age_years", label: "Age" }, // renamed + retyped
      { ...createField("select", "s1"), id: "c", variableName: "region", label: "Region", options: ["Kano"], optionValues: ["KN"] }, // LG removed
      { ...createField("text", "s1"), id: "d", variableName: "phone", label: "Phone" }, // added
    ]);

    const changes = diffForms(prev, next);
    const breaking = changes.filter((c) => c.severity === "breaking").map((c) => c.message);
    expect(breaking.some((m) => m.includes("Question removed") && m.includes("name"))).toBe(true);
    expect(breaking.some((m) => m.includes("Variable renamed") && m.includes("age_years"))).toBe(true);
    expect(breaking.some((m) => m.includes("Type changed"))).toBe(true);
    expect(breaking.some((m) => m.includes("Option code(s) removed") && m.includes("LG"))).toBe(true);
    expect(changes.some((c) => c.severity === "safe" && c.message.includes("Question added"))).toBe(true);
  });

  it("reports no changes for an identical form", () => {
    const fields = [{ ...createField("text", "s1"), id: "a", variableName: "name", label: "Name" }];
    expect(diffForms(form(fields), form(fields))).toHaveLength(0);
  });
});
