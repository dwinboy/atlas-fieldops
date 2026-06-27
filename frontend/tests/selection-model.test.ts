import { describe, expect, it } from "vitest";

import { createField, normalizeSelection, type FormField } from "@/lib/forms";

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
