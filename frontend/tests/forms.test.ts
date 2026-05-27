import { describe, expect, it } from "vitest";

import { addField, publishForm, removeField, type DynamicForm } from "@/lib/forms";

const baseForm: DynamicForm = {
  id: "field-audit",
  name: "Field audit",
  status: "draft",
  updatedAt: "2026-05-27T00:00:00.000Z",
  fields: []
};

describe("dynamic form helpers", () => {
  it("adds fields immutably", () => {
    const next = addField(baseForm, {
      id: "asset-tag",
      label: "Asset tag",
      type: "text",
      required: true
    });

    expect(baseForm.fields).toHaveLength(0);
    expect(next.fields).toHaveLength(1);
    expect(next.fields[0]?.label).toBe("Asset tag");
  });

  it("removes fields by id", () => {
    const form = addField(baseForm, {
      id: "asset-tag",
      label: "Asset tag",
      type: "text",
      required: true
    });

    expect(removeField(form, "asset-tag").fields).toHaveLength(0);
  });

  it("requires at least one field before publishing", () => {
    expect(() => publishForm(baseForm)).toThrow("at least one field");
  });
});

