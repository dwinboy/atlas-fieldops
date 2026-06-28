import { describe, expect, it } from "vitest";

import { conditionPasses, simulateForm } from "@/lib/formSimulator";
import { createField, type DynamicForm } from "@/lib/forms";

describe("conditionPasses", () => {
  const V = (o: Record<string, unknown>) => new Map<string, unknown>(Object.entries(o));

  it("evaluates the operator set", () => {
    expect(conditionPasses("${age} >= 18", V({ age: 18 }))).toBe(true);
    expect(conditionPasses("${age} >= 18", V({ age: 17 }))).toBe(false);
    expect(conditionPasses("${age} between 12,49", V({ age: 30 }))).toBe(true);
    expect(conditionPasses("${region} in Kano,Lagos", V({ region: "Lagos" }))).toBe(true);
    expect(conditionPasses("${name} contains 'ali'", V({ name: "Khalid" }))).toBe(true);
    expect(conditionPasses("${notes} is empty", V({}))).toBe(true);
    expect(conditionPasses("${gender} = 'Female' and ${age} >= 18", V({ gender: "Female", age: 20 }))).toBe(true);
    expect(conditionPasses("${gender} = 'Female' and ${age} >= 18", V({ gender: "Female", age: 10 }))).toBe(false);
    expect(conditionPasses("", V({}))).toBe(true);
  });
});

describe("simulateForm", () => {
  function form(): DynamicForm {
    return {
      id: "f",
      name: "F",
      status: "draft",
      version: 1,
      activeVersion: 0,
      sections: [
        { id: "s1", title: "Intro" },
        { id: "s2", title: "Children", visibleWhen: "${has_children} = 'Yes'" },
      ],
      fields: [
        { ...createField("yes_no", "s1"), id: "q1", variableName: "has_children", label: "Has children?" },
        {
          ...createField("number", "s2"),
          id: "q2",
          variableName: "child_count",
          label: "How many?",
          required: true,
        },
        {
          ...createField("calculated", "s1"),
          id: "q3",
          variableName: "score",
          label: "Score",
          calculation: { expression: "if(${has_children} = 'Yes', 10, 0)" },
        },
      ],
      updatedAt: new Date().toISOString(),
    };
  }

  it("hides a section until its condition passes", () => {
    const noKids = simulateForm(form(), new Map([["has_children", "No"]]));
    expect(noKids.find((s) => s.id === "s2")?.visible).toBe(false);
    const withKids = simulateForm(form(), new Map([["has_children", "Yes"]]));
    expect(withKids.find((s) => s.id === "s2")?.visible).toBe(true);
  });

  it("flags required answers only in visible sections, and computes calculations", () => {
    const withKids = simulateForm(form(), new Map([["has_children", "Yes"]]));
    const childCount = withKids.flatMap((s) => s.fields).find((f) => f.field.id === "q2");
    expect(childCount?.issue).toBe("Required — needs an answer");
    const score = withKids.flatMap((s) => s.fields).find((f) => f.field.id === "q3");
    expect(score?.calculatedValue).toBe(10);

    const noKids = simulateForm(form(), new Map([["has_children", "No"]]));
    // The required child question is in a hidden section → no blocking issue.
    const hiddenIssues = noKids.filter((s) => s.visible).flatMap((s) => s.fields).filter((f) => f.issue);
    expect(hiddenIssues).toHaveLength(0);
  });
});
