import { describe, expect, it } from "vitest";

import {
  activeLifecycleStepId,
  assembleWorksheetRow,
  approvalActionState,
  approvalBlockingFailures,
  assignmentReadinessState,
  backendDraftNameForSave,
  backendFormTargetIdForSave,
  createDraftFromSpreadsheetRows,
  createEditableDraftFromListItem,
  createEnterpriseDraftForm,
  duplicateReviewDefaults,
  lifecycleActionState,
  lifecycleCompletionState,
  MINIMUM_PUBLISH_READINESS_SCORE,
  previewTestReviewDefaults,
  publishBlockingFailures,
  quickSetupReviewDefaults,
  requiredQuestionsAdviceState,
  resolvePendingStarterTemplateId,
  resolveStarterTemplateForSector,
  sectorFormTypeOptions,
  spreadsheetOptionsForType,
  surveyContextPayloadForForm,
  testingReadinessComplete,
  uniqueSpreadsheetOptions,
  validateFormForPublish,
  warningQuickFixForItemId,
  type FormSetupDraft,
} from "@/modules/forms/FormCreationWorkspace";
import { SECTOR_TERMINOLOGY } from "@/lib/sectorTerminology";

const setup: FormSetupDraft = {
  collectionMethod: "web_mobile",
  description: "Collect baseline household and farm data.",
  durationMinutes: 30,
  formName: "Baseline Household Form",
  formType: "Baseline Survey",
  language: "English",
  owner: "M&E Manager",
  projectId: "project-agriculture",
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

  it("detects invalid variable names before publish", () => {
    const draft = createEnterpriseDraftForm(setup, "template", []);
    const invalid = {
      ...draft,
      fields: draft.fields.map((field, index) => ({
        ...field,
        variableName: index === 0 ? "bad variable name" : field.variableName,
      })),
    };
    const checklist = validateFormForPublish(invalid, setup);

    expect(checklist.find((item) => item.id === "variables")?.complete).toBe(false);
  });

  it("accepts forms whose saved questions rely on label-derived variable names", () => {
    const draft = createEnterpriseDraftForm(setup, "template", []);
    const labelDerived = {
      ...draft,
      fields: draft.fields.map((field) => ({ ...field, variableName: undefined })),
    };

    const checklist = validateFormForPublish(labelDerived, setup);

    expect(checklist.find((item) => item.id === "variables")?.complete).toBe(true);
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

  it("does not use the live published form id as the draft save target", () => {
    expect(
      backendFormTargetIdForSave(
        {
          id: "published-form-1",
          status: "published",
        },
        null,
      ),
    ).toBeNull();
    expect(
      backendFormTargetIdForSave(
        {
          id: "draft-form-1",
          status: "draft",
        },
        null,
      ),
    ).toBe("draft-form-1");
    expect(
      backendFormTargetIdForSave(
        {
          id: "published-form-1",
          status: "published",
        },
        "revision-draft-1",
      ),
    ).toBe("revision-draft-1");
  });

  it("clearly names a first saved draft revision from a published form", () => {
    expect(
      backendDraftNameForSave(
        "Monthly Store Audit",
        {
          status: "published",
          version: 2,
        },
        null,
      ),
    ).toBe("Monthly Store Audit Draft revision v3");
    expect(
      backendDraftNameForSave(
        "Monthly Store Audit",
        {
          status: "published",
          version: 2,
        },
        "revision-draft-1",
      ),
    ).toBe("Monthly Store Audit Draft revision v3");
    expect(
      backendDraftNameForSave(
        "Monthly Store Audit Draft revision v3",
        {
          status: "published",
          version: 2,
        },
        "revision-draft-1",
      ),
    ).toBe("Monthly Store Audit Draft revision v3");
  });

  it("creates sector-neutral survey context for auto-created form workspaces", () => {
    expect(
      surveyContextPayloadForForm(
        {
          formName: "Store Inventory Count",
          formType: "Inventory Count",
        },
        "publish",
      ),
    ).toEqual({
      custom_type_label: "Inventory Count",
      description: "Auto-created workspace context for published inventory count forms.",
      survey_type: "custom",
      target_population: "Project records",
      title: "Store Inventory Count",
    });
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

  it("does not infer every imported header as a date when sample rows are empty", () => {
    const draft = createDraftFromSpreadsheetRows(
      setup,
      ["Product Name", "Store", "Count Date"],
      [],
    );
    const byLabel = Object.fromEntries(draft.fields.map((field) => [field.label, field]));

    expect(byLabel["Product Name"].type).toBe("text");
    expect(byLabel["Store"].type).toBe("text");
    expect(byLabel["Count Date"].type).toBe("date");
  });

  it("deduplicates imported choice options without losing the first clean label", () => {
    expect(uniqueSpreadsheetOptions(["North", " north ", "NORTH", "South", "", "South "])).toEqual([
      "North",
      "South",
    ]);
  });

  it("normalizes imported binary response options to Yes and No", () => {
    expect(spreadsheetOptionsForType("radio", ["Y", "n", "true", "False"])).toEqual([
      "Yes",
      "No",
    ]);

    const draft = createDraftFromSpreadsheetRows(
      setup,
      ["Approved"],
      [["Y"], ["N"], ["true"]],
    );

    expect(draft.fields[0]?.type).toBe("radio");
    expect(draft.fields[0]?.options).toEqual(["Yes", "No"]);
  });

  it("keeps imported identifiers and codes as text even when values are numeric", () => {
    const draft = createDraftFromSpreadsheetRows(
      setup,
      ["Product Code", "Customer ID", "Quantity"],
      [
        ["00123", "00045", "10"],
        ["00124", "00046", "12"],
      ],
    );
    const byLabel = Object.fromEntries(draft.fields.map((field) => [field.label, field]));

    expect(byLabel["Product Code"].type).toBe("text");
    expect(byLabel["Customer ID"].type).toBe("text");
    expect(byLabel["Quantity"].type).toBe("number");
  });

  it("keeps imported latitude, longitude, and GPS accuracy as validated decimal fields", () => {
    const draft = createDraftFromSpreadsheetRows(
      setup,
      ["Latitude", "Longitude", "GPS Accuracy"],
      [["4.0511", "9.7679", "12"]],
    );
    const byLabel = Object.fromEntries(draft.fields.map((field) => [field.label, field]));

    expect(byLabel["Latitude"].type).toBe("decimal");
    expect(byLabel["Latitude"].validation).toMatchObject({ max: 90, min: -90 });
    expect(byLabel["Longitude"].type).toBe("decimal");
    expect(byLabel["Longitude"].validation).toMatchObject({ max: 180, min: -180 });
    expect(byLabel["GPS Accuracy"].type).toBe("decimal");
    expect(byLabel["GPS Accuracy"].validation).toMatchObject({ min: 0 });
  });

  it("infers business import columns as scanner, link, money, percent, and time controls", () => {
    const draft = createDraftFromSpreadsheetRows(
      setup,
      ["Product Barcode", "Package QR Code", "Website URL", "Sales Amount", "Completion %", "Visit Time", "Submitted Timestamp"],
      [
        ["978020137962", "QR-001", "https://atlasfieldops.com", "1200", "75%", "08:30", "2026-06-20 08:30"],
        ["978020137963", "QR-002", "https://example.org", "1450", "80%", "14:45", "2026-06-21 14:45"],
      ],
    );
    const byLabel = Object.fromEntries(draft.fields.map((field) => [field.label, field]));

    expect(byLabel["Product Barcode"].type).toBe("barcode");
    expect(byLabel["Package QR Code"].type).toBe("qr");
    expect(byLabel["Website URL"].type).toBe("url");
    expect(byLabel["Sales Amount"].type).toBe("currency");
    expect(byLabel["Completion %"].type).toBe("decimal");
    expect(byLabel["Completion %"].validation).toMatchObject({ max: 100, min: 0 });
    expect(byLabel["Visit Time"].type).toBe("time");
    expect(byLabel["Submitted Timestamp"].type).toBe("datetime");
  });

  it("offers sector-specific form types for every supported sector", () => {
    // Every non-custom sector the workspace can adapt to must have its own
    // form-type options, otherwise that sector silently falls back to the
    // generic M&E list — the gap that left humanitarian, nutrition, WASH, etc.
    // without sector-aware form types.
    const sectorsNeedingFormTypes = Object.keys(SECTOR_TERMINOLOGY).filter(
      (sectorId) => sectorId !== "custom",
    );
    for (const sectorId of sectorsNeedingFormTypes) {
      const options = sectorFormTypeOptions[sectorId];
      expect(options, `missing form types for sector "${sectorId}"`).toBeDefined();
      expect(options.length).toBeGreaterThan(1);
      // "Custom" must always be offered as an escape hatch.
      expect(options).toContain("Custom");
    }
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

  it("only consumes valid pending starter templates from the workspace handoff", () => {
    expect(resolvePendingStarterTemplateId("entity-registration")).toBe("entity-registration");
    expect(resolvePendingStarterTemplateId("tpl-baseline")).toBe("baseline");
    expect(resolvePendingStarterTemplateId("tpl-feedback")).toBe("beneficiary-feedback");
    expect(resolvePendingStarterTemplateId("tpl-delivery-proof")).toBe("delivery-proof");
    expect(resolvePendingStarterTemplateId("not-a-real-template")).toBeNull();
    expect(resolvePendingStarterTemplateId(null)).toBeNull();
  });

  it("preserves explicit starter template choices across sector suggestions", () => {
    expect(resolveStarterTemplateForSector("baseline", "custom")).toBe("baseline");
    expect(resolveStarterTemplateForSector("tpl-baseline", "custom")).toBe("baseline");
    expect(resolveStarterTemplateForSector(null, "custom")).toBe("entity-registration");
  });

  it("reflects lifecycle action state after a form moves into testing and review", () => {
    expect(lifecycleActionState("draft")).toMatchObject({
      approveDisabled: false,
      approveLabel: "Approve for Publish",
      reviewDisabled: true,
      reviewLabel: "Complete Preview & Test",
      testingDisabled: false,
      testingLabel: "Move to Testing",
    });

    expect(lifecycleActionState("testing")).toMatchObject({
      reviewDisabled: true,
      reviewLabel: "Complete Preview & Test",
      testingDisabled: true,
      testingLabel: "In Testing",
    });

    expect(lifecycleActionState("testing", true)).toMatchObject({
      reviewDisabled: false,
      reviewLabel: "Submit for Review",
    });

    expect(lifecycleActionState("review")).toMatchObject({
      reviewDisabled: true,
      reviewLabel: "Under Review",
      testingDisabled: true,
      testingLabel: "Testing complete",
    });

    expect(lifecycleActionState("approved")).toMatchObject({
      approveDisabled: true,
      approveLabel: "Approved for Publish",
      reviewDisabled: true,
      reviewLabel: "Review complete",
    });
  });

  it("applies duplicate review defaults without changing unrelated entity workflow rules", () => {
    expect(
      duplicateReviewDefaults({
        duplicateAction: "warn",
        duplicateFields: [],
        duplicateGpsDetection: false,
        duplicateSeverity: "medium",
        duplicateThreshold: 50,
      }),
    ).toEqual({
      duplicateAction: "review",
      duplicateFields: ["phone_number", "household_id", "full_name", "village"],
      duplicateGpsDetection: true,
      duplicateSeverity: "high",
      duplicateThreshold: 85,
    });
  });

  it("removes the fake required-questions auto-fix when the form is still blank", () => {
    expect(requiredQuestionsAdviceState(0)).toEqual({
      fix:
        "Open Builder and add the core questions first. Once they exist, mark identity, date, location, consent, service, or activity questions as required.",
      platformAction:
        "Manager decision needed: the platform can open Builder, but it cannot mark required questions until at least one question exists.",
      why:
        "This form has no questions yet, so there is nothing the platform can safely mark as required. Add the data fields first, then review which ones must block incomplete submissions.",
    });

    expect(requiredQuestionsAdviceState(3).quickFixId).toBe("mark_core_required");
  });

  it("only offers warning auto-fixes for warnings the platform can actually change", () => {
    expect(warningQuickFixForItemId("results-linkage")).toBe("mne_context_defaults");
    expect(warningQuickFixForItemId("dont-know-policy")).toBe("mne_context_defaults");
    expect(warningQuickFixForItemId("indicator-mapping")).toBeUndefined();
    expect(warningQuickFixForItemId("import-template")).toBeUndefined();
  });

  it("keeps quick setup in testing instead of silently approving or skipping preview", () => {
    const draft = createEnterpriseDraftForm(setup, "blank", []);
    const patch = quickSetupReviewDefaults(
      {
        assignedFieldOfficerIds: [],
        assignedTeamIds: [],
        assignmentMode: "assigned_only",
        changeSummary: "",
        lifecycleStatus: "draft",
        profileMappings: {
          dob: "",
          fullName: "",
          gender: "",
          gps: "",
          householdId: "",
          nationalId: "",
          phone: "",
          village: "",
        },
        profileUpdateMode: "with_supervisor_approval",
        reviewComments: "",
      },
      draft.fields,
    );

    expect(patch.lifecycleStatus).toBe("testing");
    expect(patch.changeSummary).toBe("Initial test-ready draft.");
    expect(patch.reviewComments).toBe(
      "Prepared with recommended defaults and ready for Preview & Test.",
    );
    expect(patch.assignmentMode).toBe("project_team");
  });

  it("requires assigned collectors for mobile forms but not web-only entry", () => {
    const assignedOnlyWithoutTargets = {
      assignedFieldOfficerIds: [],
      assignedTeamIds: [],
      assignmentMode: "assigned_only" as const,
    };

    expect(assignmentReadinessState("mobile", assignedOnlyWithoutTargets)).toEqual({
      complete: false,
      required: true,
    });
    expect(assignmentReadinessState("web_mobile", assignedOnlyWithoutTargets)).toEqual({
      complete: false,
      required: true,
    });
    expect(assignmentReadinessState("web", assignedOnlyWithoutTargets)).toEqual({
      complete: true,
      required: false,
    });
  });

  it("blocks approval while required readiness failures still exist", () => {
    expect(approvalActionState("review", 3)).toEqual({
      canApprove: false,
      label: "Resolve blockers before approval",
      message:
        "Resolve the required readiness blockers before approving this form for publishing.",
    });

    expect(approvalActionState("review", 0)).toEqual({
      canApprove: true,
      label: "Approve Form",
      message: "This form is ready for approval.",
    });

    expect(approvalActionState("review", 0, false)).toEqual({
      canApprove: false,
      label: "Complete Preview & Test",
      message:
        "Complete Preview & Test before approving this form for publishing.",
    });

    expect(approvalActionState("draft", 0)).toEqual({
      canApprove: false,
      label: "Submit for review first",
      message:
        "Move the form through testing and submit it for review before approving it for publishing.",
    });
  });

  it("does not count the lifecycle-approved item as a pre-approval blocker", () => {
    const checklist = validateFormForPublish(
      createEnterpriseDraftForm(setup, "template", []),
      setup,
      true,
    );

    const allFailures = checklist.filter((item) => item.required && !item.complete);

    expect(allFailures.some((item) => item.id === "lifecycle-approved")).toBe(true);
    expect(approvalBlockingFailures(checklist).some((item) => item.id === "lifecycle-approved")).toBe(false);
  });

  it("keeps advanced governance checks as warnings instead of hard publish blockers", () => {
    const checklist = validateFormForPublish(
      createEnterpriseDraftForm(setup, "template", []),
      setup,
      true,
    );
    const blockers = publishBlockingFailures(checklist).map((item) => item.id);
    const readinessScore = Math.round((checklist.filter((item) => item.status === "passed").length / checklist.length) * 100);

    expect(blockers).toEqual([]);
    expect(readinessScore).toBeGreaterThanOrEqual(MINIMUM_PUBLISH_READINESS_SCORE);
    expect(checklist.find((item) => item.id === "lifecycle-approved")?.complete).toBe(false);
    expect(checklist.find((item) => item.id === "certification")?.complete).toBe(false);
  });

  it("keeps the lifecycle stepper on review until the form is actually approved", () => {
    expect(activeLifecycleStepId("review", "review", false, 2)).toBe("review");
    expect(activeLifecycleStepId("review", "approved", false, 2)).toBe("approve");
    expect(activeLifecycleStepId("review", "approved", false, 0)).toBe("publish");
  });

  it("counts lifecycle completion from real setup, builder, and controls readiness", () => {
    const blankDraft = createEnterpriseDraftForm(setup, "blank", []);
    const blankChecklist = validateFormForPublish(blankDraft, setup, false);

    expect(
      lifecycleCompletionState({
        checklist: blankChecklist,
        hasDraft: true,
        lifecycleStatus: "draft",
        published: false,
        testingCompletedAt: "",
      }),
    ).toMatchObject({
      setup: false,
      builder: false,
      controls: false,
      review: false,
      approve: false,
      publish: false,
    });

    const readyChecklist = validateFormForPublish(blankDraft, setup, true);
    expect(
      lifecycleCompletionState({
        checklist: readyChecklist,
        hasDraft: true,
        lifecycleStatus: "review",
        published: false,
        testingCompletedAt: "",
      }).review,
    ).toBe(true);
  });

  it("only marks the test step complete after preview testing is actually completed", () => {
    const draft = createEnterpriseDraftForm(setup, "blank", []);
    const checklist = validateFormForPublish(draft, setup, true);

    expect(
      lifecycleCompletionState({
        checklist,
        hasDraft: true,
        lifecycleStatus: "review",
        published: false,
        testingCompletedAt: "",
      }).test,
    ).toBe(false);

    expect(
      lifecycleCompletionState({
        checklist,
        hasDraft: true,
        lifecycleStatus: "review",
        published: false,
        testingCompletedAt: "2026-06-22T12:00:00.000Z",
      }).test,
    ).toBe(true);
  });

  it("records preview testing completion when submitting a form for review", () => {
    expect(
      previewTestReviewDefaults(
        {
          reviewComments: "",
          testingCompletedAt: "",
        },
        "2026-06-22T12:00:00.000Z",
      ),
    ).toEqual({
      lifecycleStatus: "review",
      reviewComments: "Submitted for technical and sector review.",
      testingCompletedAt: "2026-06-22T12:00:00.000Z",
    });

    expect(
      previewTestReviewDefaults(
        {
          reviewComments: "Pilot passed.",
          testingCompletedAt: "2026-06-21T09:00:00.000Z",
        },
        "2026-06-22T12:00:00.000Z",
      ),
    ).toMatchObject({
      reviewComments: "Pilot passed.",
      testingCompletedAt: "2026-06-21T09:00:00.000Z",
    });
  });

  it("requires actual preview test completion before readiness marks testing complete", () => {
    expect(
      testingReadinessComplete({
        testingCompletedAt: "",
        testingRequirement: "test_submission",
      }),
    ).toBe(false);
    expect(
      testingReadinessComplete({
        testingCompletedAt: "2026-06-22T12:00:00.000Z",
        testingRequirement: "test_submission",
      }),
    ).toBe(true);

    const draft = createEnterpriseDraftForm(setup, "template", []);
    const checklist = validateFormForPublish(draft, setup, true);

    expect(checklist.find((item) => item.id === "testing")).toMatchObject({
      complete: false,
      jumpTo: "preview",
      label: "Preview testing completed",
    });
  });
});
