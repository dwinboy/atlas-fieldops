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
  duplicatePage,
  duplicateSection,
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

  it("creates manual questions as optional until the user marks them required", () => {
    expect(createField("text", "main").required).toBe(false);
    expect(createField("number", "main").required).toBe(false);
    expect(createField("gps", "main").required).toBe(false);
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

  it("keeps variable names unique when fields or sections are duplicated repeatedly", () => {
    const withField = addField(baseForm, {
      id: "gps",
      label: "GPS",
      required: false,
      sectionId: "main",
      type: "gps",
      variableName: "gps_location",
    });
    const duplicatedTwice = duplicateField(duplicateField(withField, "gps"), "gps");

    expect(duplicatedTwice.fields.map((field) => field.variableName)).toEqual([
      "gps_location",
      "gps_location_copy_2",
      "gps_location_copy",
    ]);

    const withSectionFields = addField(
      addField(baseForm, {
        id: "name",
        label: "Name",
        required: false,
        sectionId: "main",
        type: "text",
        variableName: "name",
      }),
      {
        id: "phone",
        label: "Phone",
        required: false,
        sectionId: "main",
        type: "phone",
        variableName: "phone",
      },
    );
    const duplicatedSections = duplicateSection(duplicateSection(withSectionFields, "main"), "main");
    const variableNames = duplicatedSections.fields.map((field) => field.variableName);

    expect(new Set(variableNames).size).toBe(variableNames.length);
  });

  it("keeps variable names unique when full pages are duplicated repeatedly", () => {
    const page = createPage("Visit");
    const section = createSection(page.id, "Visit details");
    const formWithPage = addField(
      addField(addSection(addPage(baseForm, page), section), {
        id: "visit-name",
        label: "Visit name",
        pageId: page.id,
        required: false,
        sectionId: section.id,
        type: "text",
        variableName: "visit_name",
      }),
      {
        id: "visit-gps",
        label: "Visit GPS",
        pageId: page.id,
        required: false,
        sectionId: section.id,
        type: "gps",
        variableName: "visit_gps",
      },
    );
    const duplicatedPages = duplicatePage(duplicatePage(formWithPage, page.id), page.id);
    const variableNames = duplicatedPages.fields.map((field) => field.variableName);

    expect(new Set(variableNames).size).toBe(variableNames.length);
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
    expect(schema.sections[0]?.fields[0]?.variable_name).toBe("farm_gps");
    expect(schema.sections[0]?.fields[0]?.validation).toEqual({ accuracyMax: 20 });
  });

  it("keeps mobile field variable names unique when labels or variables collide", () => {
    const form = addField(
      addField(baseForm, {
        id: "store-code-a",
        label: "Store code",
        required: false,
        sectionId: "main",
        type: "text",
        variableName: "store_code",
      }),
      {
        id: "store-code-b",
        label: "Store code",
        required: false,
        sectionId: "main",
        type: "text",
        variableName: "store_code",
      },
    );
    const schema = toMobileSchema(form);

    expect(schema.sections[0]?.fields.map((field) => field.variable_name)).toEqual([
      "store_code",
      "store_code_2",
    ]);
  });

  it("keeps mobile option values unique when labels slug to the same value", () => {
    const form = addField(baseForm, {
      id: "status",
      label: "Status",
      options: ["Needs support", "Needs-support"],
      required: false,
      sectionId: "main",
      type: "select",
    });
    const schema = toMobileSchema(form);

    expect(schema.sections[0]?.fields[0]?.options).toEqual([
      { label: "Needs support", value: "needs_support" },
      { label: "Needs-support", value: "needs_support_2" },
    ]);
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

  it("exports repeat group children in backend schema format", () => {
    const repeat = {
      ...createField("repeat_group", "main", "page-1"),
      id: "household-members",
      label: "Household Members",
      variableName: "household_members",
      children: [
        {
          ...createField("select", "household-members", "page-1"),
          id: "member-status",
          label: "Member Status",
          variableName: "member_status",
          options: ["Present", "Present!"],
        },
      ],
    };
    const schema = toMobileSchema(addField(baseForm, repeat));
    const child = schema.sections[0]?.fields[0]?.children[0];

    expect(child?.variable_name).toBe("member_status");
    expect(child?.options).toEqual([
      { label: "Present", value: "present" },
      { label: "Present!", value: "present_2" },
    ]);
    expect("variableName" in (child ?? {})).toBe(false);
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
      variableName: "crop_condition",
      options: ["Healthy", "Needs support"]
    });

    const workbook = toXlsFormWorkbook(form);

    expect(workbook.settings.form_title).toBe("Field audit");
    expect(workbook.survey.map((row) => row.type)).toContain("select_one crop_condition");
    expect(workbook.survey.find((row) => row.name === "crop_condition")?.required).toBe("yes");
    expect(workbook.choices).toEqual([
      { list_name: "crop_condition", name: "healthy", label: "Healthy" },
      { list_name: "crop_condition", name: "needs_support", label: "Needs support" }
    ]);
  });

  it("keeps XLSForm survey names unique when labels or variables collide", () => {
    const form = addField(
      addField(baseForm, {
        id: "crop-status-a",
        label: "Crop status",
        options: ["Healthy", "Needs support"],
        required: false,
        sectionId: "main",
        type: "select",
        variableName: "crop_status",
      }),
      {
        id: "crop-status-b",
        label: "Crop status",
        options: ["Good", "Bad"],
        required: false,
        sectionId: "main",
        type: "select",
        variableName: "crop_status",
      },
    );
    const workbook = toXlsFormWorkbook(form);

    expect(workbook.survey.map((row) => row.name)).toContain("crop_status");
    expect(workbook.survey.map((row) => row.name)).toContain("crop_status_2");
    expect(workbook.survey.map((row) => row.type)).toContain("select_one crop_status_2");
    expect(workbook.choices.filter((choice) => choice.list_name === "crop_status_2")).toEqual([
      { label: "Good", list_name: "crop_status_2", name: "good" },
      { label: "Bad", list_name: "crop_status_2", name: "bad" },
    ]);
  });

  it("keeps XLSForm choice names unique when option labels collide", () => {
    const form = addField(baseForm, {
      id: "status",
      label: "Status",
      options: ["Needs support", "Needs-support"],
      required: false,
      sectionId: "main",
      type: "select",
      variableName: "status",
    });
    const workbook = toXlsFormWorkbook(form);

    expect(workbook.choices).toEqual([
      { label: "Needs support", list_name: "status", name: "needs_support" },
      { label: "Needs-support", list_name: "status", name: "needs_support_2" },
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

  it("exports repeat group child variable names and choices", () => {
    const repeat = {
      ...createField("repeat_group", "main"),
      id: "household-members",
      label: "Household members",
      variableName: "household_members",
      children: [
        {
          id: "member-status",
          label: "Member status",
          options: ["Present", "Absent"],
          required: true,
          sectionId: "main",
          type: "select" as const,
          variableName: "member_status",
        },
      ],
    };
    const workbook = toXlsFormWorkbook(addField(baseForm, repeat));

    expect(workbook.survey.find((row) => row.name === "member_status")?.type).toBe(
      "select_one member_status",
    );
    expect(workbook.choices).toEqual([
      { label: "Present", list_name: "member_status", name: "present" },
      { label: "Absent", list_name: "member_status", name: "absent" },
    ]);
  });

  it("adds spreadsheet upload hints for repeat groups and matrix questions", () => {
    const repeat = {
      ...createField("repeat_group", "main"),
      id: "household-members",
      label: "Household members",
      variableName: "household_members",
    };
    const matrix = {
      ...createField("matrix_single", "main"),
      id: "service-matrix",
      label: "Service matrix",
      variableName: "service_matrix",
    };
    const workbook = toXlsFormWorkbook(addField(addField(baseForm, repeat), matrix));

    expect(workbook.survey.find((row) => row.name === "household_members")?.hint).toContain(
      "repeated rows as JSON",
    );
    expect(workbook.survey.find((row) => row.name === "service_matrix")?.hint).toContain(
      "matrix answers as JSON",
    );
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
