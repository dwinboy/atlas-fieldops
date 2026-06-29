import { describe, expect, it } from "vitest";

import { buildCodebook, codebookToCsv } from "@/lib/codebook";
import { createField, type DynamicForm } from "@/lib/forms";

function form(): DynamicForm {
  return {
    id: "f",
    name: "Crop Visit",
    status: "draft",
    version: 1,
    activeVersion: 0,
    sections: [{ id: "s1", title: "Main" }],
    fields: [
      {
        ...createField("select", "s1"),
        id: "a",
        variableName: "region",
        label: "Region",
        required: true,
        options: ["Kano", "Lagos"],
        optionValues: ["KN", ""],
      },
      {
        ...createField("number", "s1"),
        id: "b",
        variableName: "age",
        label: "Age",
        validation: { min: 0, max: 120, integerOnly: true },
      },
      {
        ...createField("repeat_group", "s1"),
        id: "r",
        variableName: "members",
        label: "Members",
        children: [{ ...createField("text", "s1"), id: "c", variableName: "member_name", label: "Member name" }],
      },
    ],
    updatedAt: new Date().toISOString(),
  };
}

describe("buildCodebook", () => {
  it("describes each variable including choices, codes, and validation", () => {
    const rows = buildCodebook(form());
    const region = rows.find((r) => r.variable === "region")!;
    expect(region.required).toBe("yes");
    expect(region.choices).toBe("KN = Kano | lagos = Lagos");
    expect(region.source).toBe("static list");

    const age = rows.find((r) => r.variable === "age")!;
    expect(age.validation).toContain("max 120");
    expect(age.validation).toContain("whole number");
  });

  it("includes repeat-group children with the parent as the group", () => {
    const rows = buildCodebook(form());
    const member = rows.find((r) => r.variable === "member_name")!;
    expect(member.group).toBe("Members");
  });
});

describe("codebookToCsv", () => {
  it("emits a header row and escapes commas/quotes", () => {
    const csv = codebookToCsv(form());
    const lines = csv.split("\n");
    expect(lines[0]).toContain("Variable");
    expect(lines[0]).toContain("Choices (code = label)");
    // The region choices string contains " | " and is quoted only if it has commas — here it has none.
    expect(csv).toContain("KN = Kano | lagos = Lagos");
  });
});
