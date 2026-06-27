import { describe, expect, it } from "vitest";

import {
  createField,
  fieldValidationCapabilities,
  logicValueInputForField,
  type FormField,
} from "@/lib/forms";

describe("fieldValidationCapabilities", () => {
  it("shows numeric validations for a whole-number question, not text length or decimals", () => {
    const caps = fieldValidationCapabilities("number");
    expect(caps.numericRange).toBe(true);
    expect(caps.wholeNumberToggle).toBe(true);
    expect(caps.decimals).toBe(false);
    expect(caps.textLength).toBe(false);
    expect(caps.pattern).toBe(false);
    expect(caps.dateRange).toBe(false);
  });

  it("offers decimal places only for decimal/currency, never the whole-number toggle", () => {
    const decimal = fieldValidationCapabilities("decimal");
    expect(decimal.decimals).toBe(true);
    expect(decimal.wholeNumberToggle).toBe(false);
    expect(fieldValidationCapabilities("currency").decimals).toBe(true);
  });

  it("shows length and pattern for text, never numeric range", () => {
    const caps = fieldValidationCapabilities("text");
    expect(caps.textLength).toBe(true);
    expect(caps.pattern).toBe(true);
    expect(caps.numericRange).toBe(false);
  });

  it("shows date range only for date-like questions", () => {
    expect(fieldValidationCapabilities("date").dateRange).toBe(true);
    expect(fieldValidationCapabilities("text").dateRange).toBe(false);
  });

  it("shows selection limits only for multi-pick choices", () => {
    expect(fieldValidationCapabilities("multiselect").selections).toBe(true);
    expect(fieldValidationCapabilities("checkbox").selections).toBe(true);
    expect(fieldValidationCapabilities("radio").selections).toBe(false);
  });
});

describe("logicValueInputForField", () => {
  it("uses a dropdown of the question's options for a choice question", () => {
    const field: FormField = {
      ...createField("select", "main"),
      options: ["Female", "Male"],
    };
    const control = logicValueInputForField(field);
    expect(control.kind).toBe("select");
    expect(control.options).toEqual(["Female", "Male"]);
  });

  it("uses a number input for a numeric question and a date input for a date question", () => {
    expect(logicValueInputForField(createField("number", "main")).kind).toBe("number");
    expect(logicValueInputForField(createField("date", "main")).kind).toBe("date");
  });

  it("falls back to text for free-text questions", () => {
    expect(logicValueInputForField(createField("text", "main")).kind).toBe("text");
  });
});
