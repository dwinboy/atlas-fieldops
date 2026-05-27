import { describe, expect, it } from "vitest";

import {
  addField,
  createDraftVersion,
  createField,
  duplicateField,
  publishForm,
  removeField,
  reorderFields,
  toMobileSchema,
  type DynamicForm
} from "@/lib/forms";

const baseForm: DynamicForm = {
  id: "field-audit",
  name: "Field audit",
  status: "draft",
  version: 1,
  activeVersion: 0,
  defaultLanguage: "en",
  languages: ["en"],
  sections: [{ id: "main", title: "Main" }],
  updatedAt: "2026-05-27T00:00:00.000Z",
  fields: []
};

describe("dynamic form helpers", () => {
  it("adds fields immutably", () => {
    const next = addField(baseForm, {
      id: "asset-tag",
      label: "Asset tag",
      type: "text",
      required: true,
      sectionId: "main"
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
      required: true,
      sectionId: "main"
    });

    expect(removeField(form, "asset-tag").fields).toHaveLength(0);
  });

  it("reorders and duplicates fields for drag/drop builder workflows", () => {
    const withFields = ["name", "gps", "photo"].reduce(
      (form, id) =>
        addField(form, {
          id,
          label: id,
          type: id === "gps" ? "gps" : id === "photo" ? "photo" : "text",
          required: id !== "photo",
          sectionId: "main"
        }),
      baseForm
    );

    const reordered = reorderFields(withFields, "photo", "name");
    const duplicated = duplicateField(reordered, "gps");

    expect(reordered.fields.map((field) => field.id)).toEqual(["photo", "name", "gps"]);
    expect(duplicated.fields).toHaveLength(4);
    expect(duplicated.fields[3]?.label).toBe("gps copy");
  });

  it("publishes immutable active versions and creates editable draft versions", () => {
    const form = addField(baseForm, createField("gps", "main"));
    const published = publishForm(form);
    const draft = createDraftVersion(published);

    expect(published.status).toBe("published");
    expect(published.activeVersion).toBe(1);
    expect(draft.status).toBe("draft");
    expect(draft.version).toBe(2);
  });

  it("exports a mobile-compatible schema", () => {
    const form = addField(baseForm, {
      id: "farm-gps",
      label: "Farm GPS",
      type: "gps",
      required: true,
      sectionId: "main",
      validation: { accuracyMax: 20 }
    });

    const schema = toMobileSchema(form);

    expect(schema.offline_compatible).toBe(true);
    expect(schema.sections[0]?.fields[0]?.type).toBe("gps");
    expect(schema.sections[0]?.fields[0]?.validation).toEqual({ accuracyMax: 20 });
  });

  it("requires at least one field before publishing", () => {
    expect(() => publishForm(baseForm)).toThrow("at least one field");
  });
});
