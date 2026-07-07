import { describe, expect, it } from "vitest";

import {
  cleanChoiceOptions,
  insertChoiceOptionDraft,
  labelPatchWithAutoVariable,
  normalizeChoiceDraftOptions,
  normalizeVariableNameInput,
  pasteChoiceOptionLines,
  removeChoiceOptionDraft,
  typeChangePatchForField,
} from "@/components/DynamicForms";
import {
  buildCalculationExpression,
  calculationPatchForField,
  logicValueInputForField,
} from "@/lib/forms";

describe("choice option editor helpers", () => {
  it("keeps a blank draft row for keyboard entry while saving clean options", () => {
    const draft = insertChoiceOptionDraft(["Yes", "No"], 1);

    expect(draft).toEqual(["Yes", "No", ""]);
    expect(cleanChoiceOptions(draft)).toEqual(["Yes", "No"]);
  });

  it("never leaves the option editor without an editable row", () => {
    expect(normalizeChoiceDraftOptions([])).toEqual([""]);
    expect(removeChoiceOptionDraft(["Only option"], 0)).toEqual([""]);
  });

  it("turns pasted lines into separate response options", () => {
    expect(pasteChoiceOptionLines(["One"], 0, "North\nSouth\n East ")).toEqual([
      "North",
      "South",
      "East",
    ]);
    expect(pasteChoiceOptionLines(["One"], 0, "Single option")).toBeNull();
  });
});

describe("question label variable naming", () => {
  it("normalizes manually typed variable names into safe snake case", () => {
    expect(normalizeVariableNameInput(" Customer ID / Region ")).toBe("customer_id_region");
    expect(normalizeVariableNameInput("2026 Store Code")).toBe("q_2026_store_code");
    expect(normalizeVariableNameInput("")).toBe("");
  });

  it("updates auto-generated variable names when the question label changes", () => {
    expect(
      labelPatchWithAutoVariable(
        {
          id: "text-1",
          label: "Farmer name",
          required: true,
          sectionId: "main",
          type: "text",
          variableName: "farmer_name",
        },
        "Customer name",
        [],
      ),
    ).toMatchObject({ label: "Customer name", variableName: "customer_name" });
  });

  it("keeps numeric auto suffix behavior but preserves manual variable names", () => {
    expect(
      labelPatchWithAutoVariable(
        {
          id: "text-2",
          label: "Age",
          required: true,
          sectionId: "main",
          type: "text",
          variableName: "age_2",
        },
        "Household size",
        ["age"],
      ),
    ).toMatchObject({ label: "Household size", variableName: "household_size" });

    expect(
      labelPatchWithAutoVariable(
        {
          id: "text-3",
          label: "Age",
          required: true,
          sectionId: "main",
          type: "text",
          variableName: "age_group",
        },
        "Household size",
        [],
      ),
    ).toEqual({ label: "Household size" });
  });
});

describe("question response type changes", () => {
  it("initializes type-specific settings when users change response type", () => {
    const baseField = {
      id: "question-1",
      label: "Store location",
      required: false,
      sectionId: "main",
      type: "text" as const,
      variableName: "store_location",
    };

    expect(typeChangePatchForField(baseField, "select")).toMatchObject({
      options: ["Yes", "No"],
      type: "select",
    });
    expect(typeChangePatchForField(baseField, "gps")).toMatchObject({
      gps: { accuracy: true, latitude: true, longitude: true, timestamp: true },
      type: "gps",
      validation: { accuracyMax: 25 },
    });
    expect(typeChangePatchForField(baseField, "matrix_single")).toMatchObject({
      matrix: { columns: ["Option 1", "Option 2", "Option 3"], rows: ["Row 1", "Row 2", "Row 3"] },
      type: "matrix_single",
    });
  });

  it("preserves choice options between choice types and clears stale settings otherwise", () => {
    const choiceField = {
      id: "question-2",
      label: "Status",
      options: ["Open", "Closed"],
      required: false,
      sectionId: "main",
      type: "select" as const,
      variableName: "status",
    };

    expect(typeChangePatchForField(choiceField, "radio").options).toEqual(["Open", "Closed"]);

    const textPatch = typeChangePatchForField(choiceField, "text");
    expect(textPatch).toMatchObject({ type: "text" });
    expect(textPatch.options).toBeUndefined();
  });

  it("seeds sensible defaults for the broadened response types", () => {
    const baseField = {
      id: "question-3",
      label: "Measure",
      required: false,
      sectionId: "main",
      type: "text" as const,
      variableName: "measure",
    };

    expect(typeChangePatchForField(baseField, "percentage")).toMatchObject({
      type: "percentage",
      validation: { min: 0, max: 100, unit: "%" },
    });
    expect(typeChangePatchForField(baseField, "counter")).toMatchObject({
      type: "counter",
      validation: { min: 0, integerOnly: true },
    });
    expect(typeChangePatchForField(baseField, "yes_no").options).toEqual(["Yes", "No"]);
    expect(typeChangePatchForField(baseField, "measurement").options).toEqual(["kg", "g", "lb"]);

    const constantSum = typeChangePatchForField(baseField, "constant_sum");
    expect(constantSum).toMatchObject({ type: "constant_sum", validation: { max: 100 } });
    expect(constantSum.options).toEqual(["Option 1", "Option 2", "Option 3"]);

    expect(typeChangePatchForField(baseField, "slider")).toMatchObject({
      type: "slider",
      validation: { min: 0, max: 100, step: 1 },
    });
  });
});

describe("calculated response helpers", () => {
  it("builds readable formulas from selected question variables", () => {
    expect(buildCalculationExpression("sum", ["quantity", "bonus"])).toBe(
      "sum(${quantity}, ${bonus})",
    );
    expect(buildCalculationExpression("average", ["yield_a", "yield_b"])).toBe(
      "avg(${yield_a}, ${yield_b})",
    );
    expect(buildCalculationExpression("percentage", ["trained", "registered"])).toBe(
      "round((${trained} / ${registered}) * 100, 2)",
    );
  });

  it("keeps calculated formulas synchronized with calculation logic", () => {
    const patch = calculationPatchForField(
      {
        id: "calculated-1",
        label: "Training completion rate",
        required: false,
        sectionId: "main",
        type: "calculated",
        variableName: "training_completion_rate",
      },
      "round((${trained} / ${registered}) * 100, 2)",
    );

    expect(patch.calculation?.expression).toBe(
      "round((${trained} / ${registered}) * 100, 2)",
    );
    expect(patch.logic).toEqual([
      {
        expression: "round((${trained} / ${registered}) * 100, 2)",
        id: "calculated-1-calculation",
        kind: "calculation",
        targetId: "calculated-1",
      },
    ]);
  });
});

describe("logic answer value helpers", () => {
  it("returns selectable answer labels with stored values for choice questions", () => {
    expect(
      logicValueInputForField({
        id: "stock-status",
        label: "Stock status",
        optionValues: ["in_stock", "out_of_stock"],
        options: ["In stock", "Out of stock"],
        required: false,
        sectionId: "main",
        type: "dropdown",
        variableName: "stock_status",
      }),
    ).toEqual({
      kind: "select",
      options: [
        { label: "In stock", value: "in_stock" },
        { label: "Out of stock", value: "out_of_stock" },
      ],
    });
  });

  it("keeps open response questions as typed controls", () => {
    expect(
      logicValueInputForField({
        id: "age",
        label: "Age",
        required: false,
        sectionId: "main",
        type: "number",
        variableName: "age",
      }),
    ).toEqual({ kind: "number" });
  });
});
