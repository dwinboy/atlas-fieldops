import { describe, expect, it } from "vitest";

import {
  createEnterpriseDraftForm,
  validateFormForPublish,
  type FormSetupDraft,
} from "@/modules/forms/FormCreationWorkspace";

const setup: FormSetupDraft = {
  collectionMethod: "web_mobile",
  description: "Collect baseline household and farm data.",
  durationMinutes: 30,
  formName: "Baseline Household Form",
  formType: "Baseline Survey",
  language: "English",
  owner: "M&E Manager",
  projectName: "Agricultural Resilience Program",
};

describe("enterprise form creation workspace", () => {
  it("creates a governed draft shell before opening the builder", () => {
    const draft = createEnterpriseDraftForm(setup, "template", []);

    expect(draft.status).toBe("draft");
    expect(draft.name).toBe("Baseline Household Form");
    expect(draft.pages).toHaveLength(1);
    expect(draft.sections.length).toBeGreaterThanOrEqual(2);
    expect(draft.fields.length).toBeGreaterThan(0);
    expect(new Set(draft.fields.map((field) => field.variableName)).size).toBe(draft.fields.length);
  });

  it("blocks publishing when a blank form has no questions", () => {
    const draft = createEnterpriseDraftForm(setup, "blank", []);
    const checklist = validateFormForPublish(draft, setup);

    expect(checklist.find((item) => item.id === "questions")?.complete).toBe(false);
    expect(checklist.filter((item) => item.required && !item.complete).map((item) => item.id)).toContain("questions");
  });

  it("detects duplicate variable names before publish", () => {
    const draft = createEnterpriseDraftForm(setup, "template", []);
    const duplicate = {
      ...draft,
      fields: draft.fields.map((field) => ({ ...field, variableName: "duplicate_name" })),
    };
    const checklist = validateFormForPublish(duplicate, setup);

    expect(checklist.find((item) => item.id === "variables")?.complete).toBe(false);
  });
});
