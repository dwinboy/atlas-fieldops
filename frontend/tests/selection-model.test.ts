import { describe, expect, it } from "vitest";

import { createField, normalizeSelection, toMobileSchema, type FormField } from "@/lib/forms";

function field(selection: FormField["selection"]): FormField {
  return { ...createField("lookup", "main"), selection };
}

describe("normalizeSelection", () => {
  it("drops static selections (they use the manual options list)", () => {
    expect(normalizeSelection(field({ source: "static" }))).toBeUndefined();
    expect(normalizeSelection({ ...createField("text", "main"), selection: undefined })).toBeUndefined();
  });

  it("keeps dataset config with columns, filters, cascade and autofill", () => {
    const result = normalizeSelection(
      field({
        source: "dataset",
        datasetId: "districts",
        displayColumn: "name",
        valueColumn: "code",
        searchColumns: ["name", "", "region"],
        cascadeFromVariable: "region_q",
        filterMatch: "any",
        filters: [
          { column: "region", op: "eq", fromVariable: "region_q" },
          { column: "status", op: "not_empty" },
          { column: "blank", op: "eq" },
        ],
        autofill: [
          { fromColumn: "district", toVariable: "district_q", overwrite: true },
          { fromColumn: "", toVariable: "x" },
        ],
      }),
    );
    expect(result?.searchColumns).toEqual(["name", "region"]);
    // The empty-value eq filter is dropped; not_empty + dynamic filters are kept.
    expect(result?.filters).toHaveLength(2);
    expect(result?.filterMatch).toBe("any");
    // Incomplete autofill mapping is dropped.
    expect(result?.autofill).toHaveLength(1);
    expect(result?.autofill?.[0].toVariable).toBe("district_q");
  });
});

describe("default value + matrix serialization", () => {
  it("serializes a question's default value to the mobile schema", () => {
    const form = {
      id: "f1",
      name: "F",
      status: "draft" as const,
      version: 1,
      activeVersion: 1,
      sections: [{ id: "main", title: "Main" }],
      fields: [{ ...createField("text", "main"), defaultValue: "N/A" }],
      updatedAt: new Date().toISOString(),
    };
    const schema = toMobileSchema(form) as { sections: { fields: { defaultValue?: unknown }[] }[] };
    expect(schema.sections[0].fields[0].defaultValue).toBe("N/A");
  });

  it("uses author answer codes for options when set, else auto-derives them", () => {
    const form = {
      id: "f2",
      name: "F",
      status: "draft" as const,
      version: 1,
      activeVersion: 1,
      sections: [{ id: "main", title: "Main" }],
      fields: [
        { ...createField("select", "main"), options: ["Strongly agree", "Disagree"], optionValues: ["5", ""] },
      ],
      updatedAt: new Date().toISOString(),
    };
    const schema = toMobileSchema(form) as {
      sections: { fields: { options: { label: string; value: string }[] }[] }[];
    };
    const options = schema.sections[0].fields[0].options;
    // Custom code preserved exactly; blank code falls back to the slugified label.
    expect(options[0]).toEqual({ label: "Strongly agree", value: "5" });
    expect(options[1]).toEqual({ label: "Disagree", value: "disagree" });
  });

  it("serializes a matrix row source (rows from another question)", () => {
    const form = {
      id: "f3",
      name: "F",
      status: "draft" as const,
      version: 1,
      activeVersion: 1,
      sections: [{ id: "main", title: "Main" }],
      fields: [
        {
          ...createField("matrix_single", "main"),
          matrix: { rows: [], columns: ["Poor", "Good"] },
          selection: { source: "question" as const, fromQuestionVariable: "crops" },
        },
      ],
      updatedAt: new Date().toISOString(),
    };
    const schema = toMobileSchema(form) as {
      sections: { fields: { selection?: { source: string; fromQuestionVariable?: string } }[] }[];
    };
    const selection = schema.sections[0].fields[0].selection;
    expect(selection?.source).toBe("question");
    expect(selection?.fromQuestionVariable).toBe("crops");
  });
});
