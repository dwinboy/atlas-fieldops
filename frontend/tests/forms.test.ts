import { describe, expect, it } from "vitest";

import {
  addField,
  addPage,
  addSection,
  buildFormReadinessChecklist,
  createDraftVersion,
  deployFormToMobileApp,
  createField,
  createPage,
  createSection,
  duplicateField,
  moveFieldToSection,
  publishForm,
  removeField,
  reorderFields,
  getCollectionCompatibility,
  isFormReadyForPublish,
  toMobileSchema,
  toXlsFormWorkbook,
  type DynamicForm
} from "@/lib/forms";

const baseForm: DynamicForm = {
  id: "field-audit",
  name: "Field audit",
  status: "draft",
  version: 1,
  activeVersion: 0,
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

  it("publishes and deploys forms to the mobile app", () => {
    const form = addField(baseForm, createField("gps", "main"));
    const deployed = deployFormToMobileApp(form, {
      assignedAudience: "Survey team only",
      syncMode: "offline_first",
    });

    expect(deployed.status).toBe("published");
    expect(deployed.mobileDeployment?.channel).toBe("survey_app");
    expect(deployed.mobileDeployment?.assignedAudience).toBe("Survey team only");
    expect(deployed.mobileDeployment?.syncMode).toBe("offline_first");
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
    expect(schema.language).toBe("en");
    expect(schema.pages[0]?.title).toBe("Page 1");
    expect(schema.sections[0]?.title).toBe("Main");
    expect(schema.sections[0]?.page_id).toBe("page-1");
    expect(schema.sections[0]?.fields[0]?.label).toBe("Farm GPS");
    expect(schema.sections[0]?.fields[0]?.type).toBe("gps");
    expect(schema.sections[0]?.fields[0]?.validation).toEqual({ accuracyMax: 20 });
  });

  it("organizes questions by pages and sections", () => {
    const page = createPage("Household roster");
    const section = createSection(page.id, "Members");
    const formWithPage = addSection(addPage(baseForm, page), section);
    const field = createField("repeat_group", section.id, page.id);
    const next = addField(formWithPage, field);
    const schema = toMobileSchema(next);

    expect(schema.pages.find((candidate) => candidate.id === page.id)?.sections).toContain(section.id);
    expect(schema.sections.find((candidate) => candidate.id === section.id)?.fields[0]?.type).toBe("repeat_group");
  });

  it("moves fields between sections without losing page context", () => {
    const page = createPage("Evidence");
    const section = createSection(page.id, "Media");
    const form = addField(addSection(addPage(baseForm, page), section), createField("image", "main"));
    const moved = moveFieldToSection(form, form.fields[0]?.id ?? "", section.id);

    expect(moved.fields[0]?.sectionId).toBe(section.id);
    expect(moved.fields[0]?.pageId).toBe(page.id);
  });

  it("exports an XLSForm workbook with survey, choices, and settings", () => {
    const form = addField(baseForm, {
      id: "crop-status",
      label: "Crop status",
      type: "select",
      required: true,
      sectionId: "main",
      options: ["Healthy", "Needs support"]
    });

    const workbook = toXlsFormWorkbook(form);

    expect(workbook.settings.form_title).toBe("Field audit");
    expect(workbook.survey.map((row) => row.type)).toContain("select_one crop_status");
    expect(workbook.survey.find((row) => row.name === "crop_status")?.required).toBe("yes");
    expect(workbook.choices).toEqual([
      { list_name: "crop_status", name: "healthy", label: "Healthy" },
      { list_name: "crop_status", name: "needs_support", label: "Needs support" }
    ]);
  });

  it("summarizes collection compatibility for web, mobile, media, and XLSForm readiness", () => {
    const form = addField(
      addField(baseForm, {
        id: "site-gps",
        label: "Site GPS",
        type: "gps",
        required: true,
        sectionId: "main"
      }),
      {
        id: "proof-photo",
        label: "Proof photo",
        type: "photo",
        required: false,
        sectionId: "main"
      }
    );

    const compatibility = getCollectionCompatibility(form);

    expect(compatibility.xlsFormReady).toBe(true);
    expect(compatibility.webFormReady).toBe(true);
    expect(compatibility.mobileAppReady).toBe(true);
    expect(compatibility.hasGps).toBe(true);
    expect(compatibility.mediaCount).toBe(1);
  });

  it("supports enterprise survey field types in exports", () => {
    const form = addField(addField(baseForm, createField("matrix_single", "main")), createField("geofence", "main"));
    const workbook = toXlsFormWorkbook(form);
    const compatibility = getCollectionCompatibility(form);

    expect(workbook.survey.map((row) => row.type)).toContain("table-list");
    expect(workbook.survey.map((row) => row.type)).toContain("geopoint");
    expect(compatibility.hasGps).toBe(true);
  });

  it("requires at least one field before publishing", () => {
    expect(() => publishForm(baseForm)).toThrow("at least one field");
  });

  it("builds a manager readiness checklist before publishing", () => {
    const form = addField(baseForm, createField("gps", "main"));
    const items = buildFormReadinessChecklist(form, {
      hasProject: true,
      hasSurvey: true,
      controlsConfigured: true,
      workflowConfigured: true,
      qualityChecksConfigured: true,
      mobilePreviewChecked: false,
      pilotTestCompleted: false,
      deploymentAudienceSelected: true
    });

    expect(items.find((item) => item.id === "questions")?.complete).toBe(true);
    expect(items.find((item) => item.id === "mobile-preview")?.required).toBe(false);
    expect(isFormReadyForPublish(items)).toBe(true);
  });

  it("blocks readiness when required governance is missing", () => {
    const form = addField(baseForm, createField("text", "main"));
    const items = buildFormReadinessChecklist(form, {
      hasProject: true,
      hasSurvey: true,
      controlsConfigured: false,
      workflowConfigured: true,
      qualityChecksConfigured: true,
      mobilePreviewChecked: true,
      pilotTestCompleted: true,
      deploymentAudienceSelected: true
    });

    expect(items.find((item) => item.id === "controls")?.complete).toBe(false);
    expect(isFormReadyForPublish(items)).toBe(false);
  });
});
