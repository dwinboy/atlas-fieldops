import { describe, expect, it } from "vitest";

import { describeField, fieldConnections } from "@/lib/formInsights";
import { createField, type DynamicForm } from "@/lib/forms";

function form(): DynamicForm {
  return {
    id: "f",
    name: "F",
    status: "draft",
    version: 1,
    activeVersion: 0,
    sections: [{ id: "s1", title: "Main" }],
    fields: [
      { ...createField("yes_no", "s1"), id: "q1", variableName: "has_children", label: "Has children?" },
      {
        ...createField("number", "s1"),
        id: "q2",
        variableName: "child_count",
        label: "How many?",
        required: true,
        logic: [{ id: "r", kind: "show", expression: "${has_children} = 'Yes'", message: "show this question when Has children? is Yes." }],
      },
      {
        ...createField("calculated", "s1"),
        id: "q3",
        variableName: "score",
        label: "Score",
        calculation: { expression: "${child_count} * 10" },
      },
    ],
    updatedAt: new Date().toISOString(),
  };
}

describe("describeField", () => {
  it("summarises relevance, requirement, and calculation in plain language", () => {
    const f = form();
    const childCount = f.fields.find((x) => x.id === "q2")!;
    const summary = describeField(childCount);
    expect(summary).toContain("Shown only when Has children? is Yes");
    expect(summary).toContain("Required");

    const score = f.fields.find((x) => x.id === "q3")!;
    expect(describeField(score)).toContain("Auto-calculated");
  });
});

describe("fieldConnections", () => {
  it("reports dependencies and dependents", () => {
    const f = form();
    const childCount = f.fields.find((x) => x.id === "q2")!;
    const conn = fieldConnections(f, childCount);
    // child_count is shown based on has_children …
    expect(conn.dependsOn.map((d) => d.id)).toContain("q1");
    // … and is used by the score calculation.
    expect(conn.usedBy.map((d) => d.id)).toContain("q3");
  });
});
