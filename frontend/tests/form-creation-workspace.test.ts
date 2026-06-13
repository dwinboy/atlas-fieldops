import { describe, expect, it } from "vitest";

import {
  assembleWorksheetRow,
  createDraftFromSpreadsheetRows,
  createEditableDraftFromListItem,
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

  it("opens an existing form summary as an editable builder draft", () => {
    const draft = createEditableDraftFromListItem({
      active_assignments: 12,
      created_by: "Survey owner",
      form_type: "Registration",
      has_quality_issues: false,
      id: "preview-farmer-registration",
      name: "Farmer Registration Survey Form",
      owner: "M&E Manager",
      pending_approval: false,
      project_id: "preview-agriculture",
      project_name: "Agricultural Resilience Program",
      quality_score: 91,
      questions: 42,
      recently_updated: true,
      sections: 6,
      slug: "farmer-registration-survey-form",
      status: "published",
      survey_name: "Farmer Registration Survey",
      total_submissions: 1840,
      updated_at: "2026-06-05T00:00:00.000Z",
      version: 3,
    });

    expect(draft.id).toBe("preview-farmer-registration");
    expect(draft.name).toBe("Farmer Registration Survey Form");
    expect(draft.status).toBe("published");
    expect(draft.version).toBe(3);
    expect(draft.sections).toHaveLength(6);
    expect(draft.fields).toHaveLength(42);
    expect(draft.fields.some((field) => field.type === "repeat_group")).toBe(true);
    expect(draft.fields.some((field) => field.type === "gps" && field.validation?.accuracyMax)).toBe(true);
  });

  it("turns spreadsheet headers into editable builder questions with inferred types", () => {
    const headers = ["Full Name", "Age", "Email", "Phone", "Region"];
    const sampleRows = [
      ["Amina Bello", "34", "amina@example.org", "+237600000001", "Northwest"],
      ["Joseph Mbarga", "29", "joseph@example.org", "+237600000002", "Littoral"],
      ["Grace Eyong", "41", "grace@example.org", "+237600000003", "Northwest"],
    ];

    const draft = createDraftFromSpreadsheetRows(setup, headers, sampleRows);

    // First row becomes the questions, in order.
    expect(draft.fields).toHaveLength(headers.length);
    expect(draft.fields.map((field) => field.label)).toEqual(headers);

    // Types are inferred from header names and sample values.
    const byLabel = Object.fromEntries(draft.fields.map((field) => [field.label, field]));
    expect(byLabel["Age"].type).toBe("number");
    expect(byLabel["Email"].type).toBe("email");
    expect(byLabel["Phone"].type).toBe("phone");
    // A low-cardinality column becomes a choice with options drawn from samples.
    expect(byLabel["Region"].type).toBe("select");
    expect(byLabel["Region"].options).toContain("Northwest");

    // Every question is editable in the builder: unique variable names, one section.
    expect(new Set(draft.fields.map((field) => field.variableName)).size).toBe(headers.length);
    expect(draft.sections).toHaveLength(1);
    expect(draft.fields.every((field) => field.sectionId === draft.sections[0].id)).toBe(true);
  });

  it("keeps every column when xlsx cells omit their reference attribute", () => {
    // Some exporters (LibreOffice, streamed writers) write cells without an `r`
    // reference. They must fall back to sequential columns, not collapse to one.
    const withoutRefs = assembleWorksheetRow([
      { reference: null, value: "Full Name" },
      { reference: null, value: "Age" },
      { reference: null, value: "Email" },
    ]);
    expect(withoutRefs).toEqual(["Full Name", "Age", "Email"]);

    // Cells with references resolve to their column, and sparse rows keep gaps.
    const withRefs = assembleWorksheetRow([
      { reference: "A1", value: "Full Name" },
      { reference: "B1", value: "Age" },
      { reference: "C1", value: "Email" },
    ]);
    expect(withRefs).toEqual(["Full Name", "Age", "Email"]);

    const sparse = assembleWorksheetRow([
      { reference: "A1", value: "Full Name" },
      { reference: "C1", value: "Email" },
    ]);
    expect(sparse).toEqual(["Full Name", "", "Email"]);
  });
});
