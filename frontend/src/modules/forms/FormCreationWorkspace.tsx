"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  FileSpreadsheet,
  FileText,
  Fingerprint,
  GitBranch,
  Layers3,
  ListChecks,
  MonitorSmartphone,
  Play,
  Rocket,
  ShieldCheck,
  Smartphone,
  Sparkles,
  TabletSmartphone,
  UploadCloud,
  Workflow,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import { DynamicForms } from "@/components/DynamicForms";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HelpHint } from "@/components/ui/help-hint";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import {
  createForm,
  createSurvey,
  getFormSchema,
  listProjects,
  listSurveys,
  updateForm,
  updateFormControls,
  type FormControlsSettings,
} from "@/lib/api";
import {
  createField,
  createPage,
  createSection,
  toMobileSchema,
  type DynamicForm,
  type FieldType,
  type FormField,
  type FormReadinessItem,
  type FormSection,
} from "@/lib/forms";
import { cn } from "@/lib/utils";
import type { FormListItem } from "@/modules/forms/data";
import { statusTone } from "@/modules/forms/utils";
import { useWorkspaceStore, type LocalWorkspaceForm } from "@/stores/workspace";

type CreationStage =
  | "setup"
  | "start"
  | "builder"
  | "controls"
  | "preview"
  | "review";
type StartMethod = "blank" | "template" | "duplicate" | "import";
type CollectionMethod = "web" | "mobile" | "web_mobile";

type StarterTemplate = {
  description: string;
  fields: { label: string; required?: boolean; type: FieldType }[];
  formType: string;
  id: string;
  name: string;
};

type FormControlsDraft = {
  accessibilityMode: "standard" | "large_text" | "high_contrast";
  allowAnonymous: boolean;
  allowManualCoordinates: boolean;
  assignmentMode: "assigned_only" | "project_team" | "open_link";
  auditTrail: boolean;
  autoAssignmentRule: string;
  beneficiarySearch: "required" | "optional" | "disabled";
  blockWithoutConsent: boolean;
  boundaryValidation: boolean;
  businessPurpose: string;
  changeSummary: string;
  consentMode: "digital" | "written" | "verbal" | "guardian" | "not_required";
  coordinateMasking: boolean;
  dataQualityMode: "standard" | "strict" | "advisory";
  dataSourceType: "primary" | "secondary" | "administrative" | "imported" | "mixed";
  duplicateAction: "block" | "warn" | "review";
  duplicateFields: string[];
  duplicateGpsDetection: boolean;
  duplicateSeverity: "low" | "medium" | "high" | "critical";
  duplicateThreshold: number;
  entityType: string;
  eventMode: "none" | "creates_event" | "selects_event" | "attendance";
  expectedUse: string;
  exportRestricted: boolean;
  fileTypes: string;
  formObjective: string;
  geographicScope: string;
  gpsAccuracy: number;
  indicatorComponent: "none" | "numerator" | "denominator" | "disaggregation" | "evidence";
  indicatorLink: string;
  lifecycleStatus: "draft" | "testing" | "review" | "approved" | "published" | "suspended" | "archived";
  linkedOutcome: string;
  linkedOutput: string;
  localizationLanguages: string;
  maxAttachmentSizeMb: number;
  maximumDurationMinutes: number;
  maximumSubmissionsPerDay: number;
  mediaRequirement: "none" | "photo" | "signature" | "photo_signature" | "any_attachment";
  meReviewerName: string;
  minimumDurationMinutes: number;
  offlineEnabled: boolean;
  offlineMediaCapture: boolean;
  lockApprovedRecords: boolean;
  permissionPreset: "standard" | "restricted" | "open";
  parentForm: string;
  programObjective: string;
  profileMappings: {
    dob: string;
    fullName: string;
    gender: string;
    gps: string;
    phone: string;
    village: string;
  };
  profileUpdateMode: "with_supervisor_approval" | "after_submission" | "never";
  referenceDataRequired: boolean;
  relatedForms: string;
  requireConsent: boolean;
  resultArea: string;
  reviewApprover: "me_manager" | "data_manager" | "supervisor";
  reviewReturner: "supervisor" | "data_manager" | "me_manager";
  reviewComments: string;
  reviewer: "supervisor" | "data_manager" | "me_manager";
  requiresEntity: boolean;
  requiresGps: boolean;
  riskClassification: "low" | "medium" | "high" | "sensitive";
  samplingMethod: "none" | "random" | "stratified" | "cluster" | "purposive" | "systematic";
  seasonEnd: string;
  seasonName: string;
  seasonStart: string;
  storeConsentVersion: boolean;
  technicalReviewerName: string;
  finalApproverName: string;
  approvalDate: string;
  approvalNotes: string;
  submissionFrequency:
    | "once_ever"
    | "once_per_project"
    | "once_per_year"
    | "once_per_season"
    | "once_per_quarter"
    | "once_per_month"
    | "once_per_event"
    | "unlimited";
  targetSampleSize: number;
  trackingSeries: string;
  translationStatus: "not_started" | "in_progress" | "ready" | "approved";
  triggerRule: string;
  versionNumber: string;
  waveLabel: string;
  workflowPreset: "supervisor_review" | "data_manager_review" | "two_step_review";
};

type PublishReadinessItem = FormReadinessItem & {
  category: string;
  jumpTo: CreationStage;
  status: "passed" | "warning" | "failed";
};

export type FormSetupDraft = {
  collectionMethod: CollectionMethod;
  description: string;
  durationMinutes: number;
  formName: string;
  formType: string;
  language: string;
  owner: string;
  projectName: string;
};

type FormCreationWorkspaceProps = {
  existingForms: FormListItem[];
  initialForm?: FormListItem | null;
  onBack: () => void;
  token: string | null;
};

const formTypes = [
  "Baseline Survey",
  "Endline Survey",
  "Monitoring Visit",
  "Beneficiary Registration",
  "Needs Assessment",
  "Facility Assessment",
  "Training Attendance",
  "Feedback Form",
  "Case Management",
  "Custom",
];

const projectOptions = [
  "Agricultural Resilience Program",
  "Community Health Access Project",
  "Education Quality Improvement",
  "Humanitarian Response Program",
];

const setupDefaults: FormSetupDraft = {
  collectionMethod: "web_mobile",
  description: "",
  durationMinutes: 25,
  formName: "",
  formType: "Baseline Survey",
  language: "English",
  owner: "M&E Manager",
  projectName: projectOptions[0] ?? "Project",
};

function MobileFormPreview({ form }: { form: DynamicForm }) {
  const pages = form.pages?.length
    ? form.pages
    : [{ id: "default-page", title: "Page 1" }];

  return (
    <div className="w-[320px] overflow-hidden rounded-[2rem] border-[10px] border-foreground bg-background shadow-elevated">
      <div className="flex items-center justify-between border-b bg-foreground px-4 py-2 text-[11px] font-semibold text-background">
        <span>Atlas FieldOps</span>
        <span>Preview</span>
      </div>
      <div className="max-h-[72vh] overflow-y-auto bg-muted/30 p-3 product-scrollbar">
        <div className="rounded-xl border bg-panel p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
            Draft form
          </p>
          <h3 className="mt-1 text-base font-semibold">{form.name}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {form.fields.length} question{form.fields.length === 1 ? "" : "s"}{" "}
            ready for mobile testing.
          </p>
        </div>
        <div className="mt-3 space-y-3">
          {pages.map((page) => {
            const pageSections = form.sections.filter(
              (section) => section.pageId === page.id,
            );
            return (
              <section className="space-y-3" key={page.id}>
                {pageSections.map((section) => {
                  const fields = form.fields.filter(
                    (field) => field.sectionId === section.id,
                  );
                  return (
                    <div
                      className="rounded-xl border bg-panel p-3"
                      key={section.id}
                    >
                      <h4 className="text-sm font-semibold">{section.title}</h4>
                      <div className="mt-3 space-y-3">
                        {fields.map((field, index) => (
                          <label
                            className="block rounded-lg border bg-background p-3 text-xs"
                            key={field.id}
                          >
                            <span className="flex items-start gap-1.5 font-semibold">
                              <span className="text-muted-foreground">
                                {index + 1}.
                              </span>
                              <span>{field.label}</span>
                              {field.required ? (
                                <span className="text-danger">*</span>
                              ) : null}
                            </span>
                            {field.hint ? (
                              <span className="mt-1 block text-[11px] text-muted-foreground">
                                {field.hint}
                              </span>
                            ) : null}
                            <MobilePreviewInput field={field} />
                          </label>
                        ))}
                        {!fields.length ? (
                          <div className="rounded-lg border border-dashed bg-background p-3 text-xs text-muted-foreground">
                            No questions in this section yet.
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </section>
            );
          })}
          {!form.fields.length ? (
            <div className="rounded-xl border border-dashed bg-panel p-5 text-center text-xs text-muted-foreground">
              Add a question to see it in mobile preview.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function MobilePreviewInput({ field }: { field: FormField }) {
  if (field.options?.length) {
    return (
      <div className="mt-2 space-y-1.5">
        {field.options.slice(0, 4).map((option) => (
          <span
            className="block rounded-lg border bg-panel px-3 py-2 text-[11px]"
            key={option}
          >
            {option}
          </span>
        ))}
      </div>
    );
  }

  if (
    ["photo", "image", "audio", "video", "file", "signature"].includes(
      field.type,
    )
  ) {
    return (
      <div className="mt-2 rounded-lg border border-dashed bg-panel px-3 py-3 text-center text-[11px] text-muted-foreground">
        Capture {field.type.replace("_", " ")}
      </div>
    );
  }

  if (["gps", "geolocation", "map", "geofence"].includes(field.type)) {
    return (
      <div className="mt-2 grid grid-cols-2 gap-1.5 text-[11px] text-muted-foreground">
        <span className="rounded-lg border bg-panel px-2 py-2">Latitude</span>
        <span className="rounded-lg border bg-panel px-2 py-2">Longitude</span>
        <span className="rounded-lg border bg-panel px-2 py-2">Accuracy</span>
        <span className="rounded-lg border bg-panel px-2 py-2">Timestamp</span>
      </div>
    );
  }

  return (
    <span className="mt-2 block rounded-lg border bg-panel px-3 py-2 text-[11px] text-muted-foreground">
      {field.appearance?.placeholder ?? field.hint ?? "Answer"}
    </span>
  );
}

function slugifyFormName(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || `form-${Date.now()}`
  );
}

function workspaceFormFromDraft(
  form: DynamicForm,
  setup: FormSetupDraft,
  projectId?: string | null,
): LocalWorkspaceForm {
  return {
    active_assignments: form.status === "published" ? 1 : 0,
    created_by: "M&E Manager",
    description: setup.description || form.pages?.[0]?.description || null,
    form_type: setup.formType,
    has_quality_issues: form.fields.length === 0,
    id: form.id,
    name: form.name,
    owner: setup.owner || "M&E Manager",
    pending_approval: form.status !== "published",
    project_id: projectId ?? null,
    project_name: setup.projectName,
    quality_score:
      form.status === "published" ? 86 : form.fields.length ? 72 : 45,
    questions: form.fields.length,
    recently_updated: true,
    sections: form.sections.length,
    slug: slugifyFormName(form.name),
    status: form.status,
    survey_name: setup.formType,
    total_submissions: 0,
    updated_at: form.updatedAt,
    version: form.version,
  };
}

const lifecycleSteps: {
  id: "setup" | "builder" | "controls" | "test" | "review" | "approve" | "publish";
  label: string;
  helper: string;
}[] = [
  {
    id: "setup",
    label: "Setup",
    helper: "Form info and project",
  },
  {
    id: "builder",
    label: "Builder",
    helper: "Questions stay here",
  },
  {
    id: "controls",
    label: "Controls",
    helper: "Rules and governance",
  },
  {
    id: "test",
    label: "Test",
    helper: "Preview and validate",
  },
  {
    id: "review",
    label: "Review",
    helper: "Readiness checklist",
  },
  {
    id: "approve",
    label: "Approve",
    helper: "Reviewer sign-off",
  },
  {
    id: "publish",
    label: "Publish",
    helper: "Field-ready version",
  },
];

const startMethods: {
  description: string;
  id: StartMethod;
  label: string;
  icon: LucideIcon;
}[] = [
  {
    description:
      "Open a clean draft with one starter section and no questions.",
    id: "blank",
    label: "Start from Blank",
    icon: FileText,
  },
  {
    description:
      "Use a recommended M&E structure with consent, respondent, GPS, and quality fields.",
    id: "template",
    label: "Use Template",
    icon: Sparkles,
  },
  {
    description:
      "Create a new editable draft based on an existing form summary.",
    id: "duplicate",
    label: "Duplicate Existing Form",
    icon: GitBranch,
  },
  {
    description: "Create a shell now and import XLSForm or CSV columns later.",
    id: "import",
    label: "Import XLSForm or CSV Later",
    icon: FileSpreadsheet,
  },
];

const starterTemplates: StarterTemplate[] = [
  {
    description:
      "Register farmers or beneficiaries once with consent, identity, location, and contact details.",
    fields: [
      { label: "Consent confirmed", required: true, type: "radio" },
      { label: "Farmer full name", required: true, type: "text" },
      { label: "Phone number", type: "phone" },
      { label: "Gender", type: "radio" },
      { label: "Date of birth", type: "date" },
      { label: "Village", required: true, type: "text" },
      { label: "Household ID", type: "text" },
      { label: "Registration GPS", required: true, type: "gps" },
    ],
    formType: "Beneficiary Registration",
    id: "beneficiary-registration",
    name: "Beneficiary / Farmer Registration",
  },
  {
    description:
      "Capture baseline status, household profile, services received, and initial indicator values.",
    fields: [
      { label: "Beneficiary code", required: true, type: "text" },
      { label: "Household size", type: "number" },
      { label: "Main livelihood activity", type: "select" },
      { label: "Baseline income", type: "currency" },
      { label: "Current service access", type: "radio" },
      { label: "Baseline GPS", required: true, type: "gps" },
      { label: "Enumerator notes", type: "textarea" },
    ],
    formType: "Baseline Survey",
    id: "baseline",
    name: "Baseline Survey",
  },
  {
    description:
      "Use for repeated visits, progress checks, training follow-up, and data quality evidence.",
    fields: [
      { label: "Beneficiary code", required: true, type: "text" },
      { label: "Visit date", required: true, type: "date" },
      { label: "Activity completed", required: true, type: "radio" },
      { label: "Progress score", type: "rating" },
      { label: "Issues observed", type: "textarea" },
      { label: "Visit GPS", required: true, type: "gps" },
      { label: "Photo evidence", type: "photo" },
    ],
    formType: "Monitoring Visit",
    id: "monitoring-visit",
    name: "Monitoring Visit",
  },
  {
    description:
      "Track attendance, inputs, kits, cash, services, or materials delivered to participants.",
    fields: [
      { label: "Beneficiary code", required: true, type: "text" },
      { label: "Distribution date", required: true, type: "date" },
      { label: "Item or service received", required: true, type: "select" },
      { label: "Quantity received", type: "number" },
      { label: "Recipient signature", type: "signature" },
      { label: "Distribution GPS", type: "gps" },
    ],
    formType: "Training Attendance",
    id: "attendance-distribution",
    name: "Attendance / Distribution",
  },
];

const defaultControlsDraft: FormControlsDraft = {
  accessibilityMode: "standard",
  allowAnonymous: false,
  allowManualCoordinates: false,
  assignmentMode: "assigned_only",
  auditTrail: true,
  autoAssignmentRule: "Baseline completed -> schedule monitoring visit in 30 days",
  beneficiarySearch: "optional",
  blockWithoutConsent: true,
  boundaryValidation: false,
  businessPurpose: "Support project monitoring, review, and donor-ready evidence.",
  changeSummary: "",
  consentMode: "digital",
  coordinateMasking: false,
  dataQualityMode: "standard",
  dataSourceType: "primary",
  duplicateAction: "review",
  duplicateFields: ["phone_number", "household_id", "full_name", "village"],
  duplicateGpsDetection: true,
  duplicateSeverity: "high",
  duplicateThreshold: 85,
  entityType: "Farmer",
  eventMode: "none",
  expectedUse: "Approved records feed beneficiary history, dashboards, indicators, and reports.",
  exportRestricted: true,
  fileTypes: "jpg,png,pdf",
  formObjective: "Collect reliable field evidence for project decisions.",
  geographicScope: "",
  gpsAccuracy: 20,
  indicatorComponent: "none",
  indicatorLink: "",
  lifecycleStatus: "draft",
  linkedOutcome: "",
  linkedOutput: "",
  localizationLanguages: "English",
  maxAttachmentSizeMb: 10,
  maximumDurationMinutes: 90,
  maximumSubmissionsPerDay: 40,
  mediaRequirement: "none",
  meReviewerName: "M&E Reviewer",
  minimumDurationMinutes: 5,
  offlineEnabled: true,
  offlineMediaCapture: true,
  lockApprovedRecords: true,
  permissionPreset: "standard",
  parentForm: "",
  programObjective: "",
  profileMappings: {
    dob: "",
    fullName: "",
    gender: "",
    gps: "",
    phone: "",
    village: "",
  },
  profileUpdateMode: "with_supervisor_approval",
  referenceDataRequired: true,
  relatedForms: "",
  requireConsent: true,
  resultArea: "",
  reviewComments: "",
  reviewApprover: "me_manager",
  reviewer: "supervisor",
  reviewReturner: "supervisor",
  requiresEntity: false,
  requiresGps: true,
  riskClassification: "medium",
  samplingMethod: "none",
  seasonEnd: "",
  seasonName: "",
  seasonStart: "",
  storeConsentVersion: true,
  technicalReviewerName: "Technical Reviewer",
  finalApproverName: "M&E Manager",
  approvalDate: "",
  approvalNotes: "",
  submissionFrequency: "unlimited",
  targetSampleSize: 0,
  trackingSeries: "",
  translationStatus: "not_started",
  triggerRule: "If critical data quality risk is detected -> create Data Quality issue",
  versionNumber: "1.0.0",
  waveLabel: "",
  workflowPreset: "supervisor_review",
};

function variableNameFromLabel(label: string, fallback: string): string {
  return (
    label
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 54) || fallback
  );
}

function uniqueVariableName(label: string, used: Set<string>, fallback: string): string {
  const base = variableNameFromLabel(label, fallback);
  let candidate = base;
  let index = 2;
  while (used.has(candidate)) {
    candidate = `${base}_${index}`;
    index += 1;
  }
  used.add(candidate);
  return candidate;
}

function slugFromText(value: string, fallback: string): string {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || fallback
  );
}

function attachStarterField(
  section: FormSection,
  type: FieldType,
  label: string,
  required = false,
): FormField {
  const field = createField(type, section.id, section.pageId);
  return {
    ...field,
    label,
    required,
    variableName: variableNameFromLabel(label, field.id),
  };
}

function decodeXmlText(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function parseDelimitedRows(text: string): string[][] {
  const firstLine = text.split(/\r?\n/).find((line) => line.trim()) ?? "";
  const delimiter = firstLine.includes("\t")
    ? "\t"
    : firstLine.split(";").length > firstLine.split(",").length
      ? ";"
      : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"' && inQuotes && next === '"') {
      cell += '"';
      index += 1;
      continue;
    }
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === delimiter && !inQuotes) {
      row.push(cell.trim());
      cell = "";
      continue;
    }
    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell.trim());
      if (row.some((value) => value.length)) rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    cell += char;
  }
  row.push(cell.trim());
  if (row.some((value) => value.length)) rows.push(row);
  return rows;
}

function columnIndexFromCellRef(reference: string | null): number {
  const letters = reference?.match(/[A-Z]+/i)?.[0]?.toUpperCase() ?? "A";
  return [...letters].reduce((total, letter) => total * 26 + letter.charCodeAt(0) - 64, 0) - 1;
}

async function inflateRawZipEntry(bytes: Uint8Array): Promise<string> {
  if (!("DecompressionStream" in globalThis)) {
    throw new Error("This browser cannot read XLSX files directly. Save the spreadsheet as CSV and import again.");
  }
  const body = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const stream = new Blob([body]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  const inflated = await new Response(stream).arrayBuffer();
  return new TextDecoder().decode(inflated);
}

async function readZipTextFile(buffer: ArrayBuffer, wantedPath: string): Promise<string | null> {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  let endRecordOffset = -1;
  for (let offset = buffer.byteLength - 22; offset >= 0; offset -= 1) {
    if (view.getUint32(offset, true) === 0x06054b50) {
      endRecordOffset = offset;
      break;
    }
  }
  if (endRecordOffset < 0) return null;
  const totalEntries = view.getUint16(endRecordOffset + 10, true);
  let centralOffset = view.getUint32(endRecordOffset + 16, true);
  const decoder = new TextDecoder();

  for (let entry = 0; entry < totalEntries; entry += 1) {
    if (view.getUint32(centralOffset, true) !== 0x02014b50) break;
    const method = view.getUint16(centralOffset + 10, true);
    const compressedSize = view.getUint32(centralOffset + 20, true);
    const nameLength = view.getUint16(centralOffset + 28, true);
    const extraLength = view.getUint16(centralOffset + 30, true);
    const commentLength = view.getUint16(centralOffset + 32, true);
    const localOffset = view.getUint32(centralOffset + 42, true);
    const name = decoder.decode(bytes.slice(centralOffset + 46, centralOffset + 46 + nameLength));
    if (name === wantedPath) {
      const localNameLength = view.getUint16(localOffset + 26, true);
      const localExtraLength = view.getUint16(localOffset + 28, true);
      const dataStart = localOffset + 30 + localNameLength + localExtraLength;
      const entryBytes = bytes.slice(dataStart, dataStart + compressedSize);
      if (method === 0) return decoder.decode(entryBytes);
      if (method === 8) return inflateRawZipEntry(entryBytes);
      throw new Error("Unsupported XLSX compression method.");
    }
    centralOffset += 46 + nameLength + extraLength + commentLength;
  }
  return null;
}

function sharedStringsFromXml(xml: string): string[] {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  return Array.from(doc.getElementsByTagName("si")).map((item) => item.textContent?.trim() ?? "");
}

function rowsFromWorksheetXml(xml: string, sharedStrings: string[]): string[][] {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  return Array.from(doc.getElementsByTagName("row")).map((row) => {
    const values: string[] = [];
    Array.from(row.getElementsByTagName("c")).forEach((cell) => {
      const index = columnIndexFromCellRef(cell.getAttribute("r"));
      const type = cell.getAttribute("t");
      const rawValue =
        cell.getElementsByTagName("v")[0]?.textContent ??
        cell.getElementsByTagName("t")[0]?.textContent ??
        "";
      values[index] = type === "s" ? (sharedStrings[Number(rawValue)] ?? "") : decodeXmlText(rawValue);
    });
    return values.map((value) => value ?? "");
  });
}

async function readSpreadsheetRows(file: File): Promise<string[][]> {
  const lowerName = file.name.toLowerCase();
  if (lowerName.endsWith(".xlsx")) {
    const buffer = await file.arrayBuffer();
    const sheetXml = await readZipTextFile(buffer, "xl/worksheets/sheet1.xml");
    if (!sheetXml) throw new Error("No first worksheet was found in this Excel file.");
    const sharedXml = await readZipTextFile(buffer, "xl/sharedStrings.xml");
    return rowsFromWorksheetXml(sheetXml, sharedXml ? sharedStringsFromXml(sharedXml) : []);
  }
  if (lowerName.endsWith(".xls")) {
    throw new Error("Older .xls files are not supported yet. Save the file as .xlsx or CSV and import again.");
  }
  return parseDelimitedRows(await file.text());
}

function inferFieldType(header: string, values: string[]): FieldType {
  const label = header.toLowerCase();
  const samples = values.map((value) => value.trim()).filter(Boolean);
  if (label.includes("email")) return "email";
  if (label.includes("phone") || label.includes("mobile") || label.includes("contact")) return "phone";
  if (label.includes("gps") || label.includes("coordinate")) return "gps";
  if (label.includes("photo") || label.includes("image")) return "photo";
  if (label.includes("signature")) return "signature";
  if (label.includes("date") || samples.every((value) => !Number.isNaN(Date.parse(value)))) return "date";
  if (samples.length && samples.every((value) => /^-?\d+$/.test(value))) return "number";
  if (samples.length && samples.every((value) => /^-?\d+(\.\d+)?$/.test(value))) return "decimal";
  const normalized = new Set(samples.map((value) => value.toLowerCase()));
  if (normalized.size > 0 && normalized.size <= 8) {
    if ([...normalized].every((value) => ["yes", "no", "y", "n", "true", "false"].includes(value))) return "radio";
    return "select";
  }
  if (samples.some((value) => value.length > 100)) return "textarea";
  return "text";
}

function createDraftFromSpreadsheetRows(setup: FormSetupDraft, rows: string[], sampleRows: string[][]): DynamicForm {
  const form = createEnterpriseDraftForm(setup, "import", []);
  const page = (form.pages ?? [])[0] ?? createPage("Page 1");
  const section = {
    ...(form.sections[0] ?? createSection(page.id, "Imported questions")),
    title: "Imported spreadsheet columns",
    description: "Questions generated from the first row of the uploaded spreadsheet. Review labels, required status, options, and validation before publishing.",
  };
  const used = new Set<string>();
  const fields = rows
    .map((header, index) => header.trim() || `Column ${index + 1}`)
    .filter(Boolean)
    .map((header, index) => {
      const samples = sampleRows.map((row) => row[index] ?? "");
      const type = inferFieldType(header, samples);
      const field = createField(type, section.id, page.id);
      const options = ["select", "radio", "dropdown", "multiselect"].includes(type)
        ? Array.from(new Set(samples.map((value) => value.trim()).filter(Boolean))).slice(0, 20)
        : field.options;
      return {
        ...field,
        hint: `Imported from spreadsheet column ${index + 1}.`,
        label: header,
        options: options?.length ? options : field.options,
        required: false,
        variableName: uniqueVariableName(header, used, field.id),
      };
    });
  return {
    ...form,
    fields,
    history: [
      ...(form.history ?? []),
      {
        createdAt: new Date().toISOString(),
        status: "draft",
        summary: `Generated ${fields.length} editable question(s) from spreadsheet headers`,
        version: form.version,
      },
    ],
    pages: [{ ...page, description: "Generated from spreadsheet import." }],
    sections: [section],
    updatedAt: new Date().toISOString(),
  };
}

function createDraftFromStarterTemplate(
  setup: FormSetupDraft,
  template: StarterTemplate,
): DynamicForm {
  const nextSetup = {
    ...setup,
    formName: setup.formName.trim() || template.name,
    formType: template.formType,
  };
  const form = createEnterpriseDraftForm(nextSetup, "blank", []);
  const page = (form.pages ?? [])[0] ?? createPage("Page 1");
  const section = {
    ...(form.sections[0] ?? createSection(page.id, template.name)),
    title: template.name,
    description: template.description,
  };
  const fields = template.fields.map((field) =>
    attachStarterField(section, field.type, field.label, Boolean(field.required)),
  );
  return {
    ...form,
    fields,
    history: [
      ...(form.history ?? []),
      {
        createdAt: new Date().toISOString(),
        status: "draft",
        summary: `Started from ${template.name} template`,
        version: form.version,
      },
    ],
    name: nextSetup.formName,
    pages: [{ ...page, description: template.description }],
    sections: [section],
    updatedAt: new Date().toISOString(),
  };
}

function createDuplicateDraftFromForm(
  source: DynamicForm,
  setup: FormSetupDraft,
): DynamicForm {
  const now = new Date().toISOString();
  const duplicatedId = `draft-form-${Date.now()}`;
  return {
    ...source,
    activeVersion: 0,
    history: [
      ...(source.history ?? []),
      {
        createdAt: now,
        status: "draft",
        summary: `Duplicated from ${source.name}`,
        version: 1,
      },
    ],
    id: duplicatedId,
    name: setup.formName.trim() || `${source.name} Copy`,
    status: "draft",
    updatedAt: now,
    version: 1,
  };
}

function controlsDraftToApiControls(
  controls: FormControlsDraft,
  form: DynamicForm,
): FormControlsSettings {
  const requiredFields = form.fields
    .filter((field) => field.required)
    .map((field) => field.variableName ?? field.id);
  const duplicateFields = controls.duplicateFields.length
    ? controls.duplicateFields
    : ["phone_number", "household_id", "full_name"];
  const dataDictionary = form.fields.map((field) => {
    const variableName = field.variableName ?? variableNameFromLabel(field.label, field.id);
    const profileTarget = Object.entries(controls.profileMappings).find(
      ([, mappedVariable]) => mappedVariable === variableName,
    )?.[0];
    return {
      question_id: field.id,
      question_label: field.label,
      variable_name: variableName,
      definition: field.hint || `Response for ${field.label}.`,
      data_type: field.type,
      allowed_values: field.options ?? [],
      units:
        field.type === "currency"
          ? "Currency"
          : field.type === "gps"
            ? "Latitude/longitude"
            : field.type === "number" || field.type === "decimal"
              ? "Numeric value"
              : "",
      source: controls.dataSourceType,
      sensitivity:
        /name|phone|national|id|gps|location|consent/i.test(field.label)
          ? "PII"
          : controls.riskClassification,
      indicator_mapping:
        controls.indicatorLink && controls.indicatorComponent !== "none"
          ? {
              indicator: controls.indicatorLink,
              component: controls.indicatorComponent,
              contribution:
                controls.indicatorComponent === "numerator"
                  ? "Numerator contribution"
                  : controls.indicatorComponent === "denominator"
                    ? "Denominator contribution"
                    : "Supporting evidence",
              weight: 1,
            }
          : null,
      profile_impact: profileTarget
        ? {
            impact: "updates_profile",
            target_field: profileTarget,
            history_policy: controls.profileUpdateMode,
          }
        : { impact: "no_impact" },
    };
  });
  const dependencyMap = form.fields.flatMap((field) =>
    (field.logic ?? []).map((rule) => ({
      from_question_id: field.id,
      from_variable: field.variableName ?? field.id,
      expression: rule.expression,
      target_question_id: rule.targetId ?? null,
      action: rule.kind,
    })),
  );
  const workflowStages =
    controls.workflowPreset === "two_step_review"
      ? [
          {
            id: "submitted",
            name: "Submitted",
            reviewer_roles: ["survey_supervisor"],
            reviewer_location_scope: "assigned_locations",
            require_comment_on_reject: true,
            require_comment_on_return: true,
            sla_hours: 24,
          },
          {
            id: "data_manager_review",
            name: "Data Manager Review",
            reviewer_roles: ["data_manager"],
            reviewer_location_scope: "project",
            require_comment_on_reject: true,
            require_comment_on_return: true,
            sla_hours: 48,
          },
          {
            id: "approved",
            name: "Approved",
            reviewer_roles: [controls.reviewApprover],
            reviewer_location_scope: "project",
            require_comment_on_reject: true,
            require_comment_on_return: true,
            sla_hours: 72,
          },
        ]
      : [
          {
            id: "submitted",
            name: "Submitted",
            reviewer_roles: [controls.reviewer],
            reviewer_location_scope: "assigned_locations",
            require_comment_on_reject: true,
            require_comment_on_return: true,
            sla_hours: 24,
          },
          {
            id: "approved",
            name: "Approved",
            reviewer_roles: [controls.reviewApprover],
            reviewer_location_scope: "project",
            require_comment_on_reject: true,
            require_comment_on_return: true,
            sla_hours: 48,
          },
        ];

  return {
    reference_bindings: controls.referenceDataRequired
      ? form.fields
          .filter((field) =>
            ["select", "dropdown", "multiselect", "radio"].includes(field.type),
          )
          .slice(0, 6)
          .map((field) => ({
            id: `${field.id}-reference`,
            question_id: field.id,
            question_label: field.label,
            reference_list_name: field.label,
            reference_type: "custom",
            source: "existing" as const,
            enforce_controlled_values: true,
            allow_inactive_values: false,
            parent_reference: null,
            effective_from: null,
            effective_to: null,
            version: 1,
            updated_by: null,
            changed_since_publish: true,
          }))
      : [],
    entity_controls: {
      linked_to_entity: controls.requiresEntity || !controls.allowAnonymous,
      entity_type: controls.entityType,
      creates_new_entity:
        /registration/i.test(form.name) || controls.profileUpdateMode === "after_submission",
      updates_existing_entity: controls.profileUpdateMode !== "never",
      requires_existing_entity: controls.requiresEntity,
      allows_anonymous: controls.allowAnonymous,
      submission_frequency: controls.submissionFrequency,
      unique_fields: ["entity_id", "national_id"],
      matching_fields: duplicateFields,
      duplicate_mode: "weighted",
      duplicate_threshold: controls.duplicateThreshold,
      duplicate_action: controls.duplicateAction,
      prefill_profile: controls.beneficiarySearch !== "disabled",
      lock_prefilled_fields: controls.profileUpdateMode === "with_supervisor_approval",
      editable_with_reason: true,
      profile_update_mode: controls.profileUpdateMode,
    },
    permission_rules: [
      {
        subject_type: "role",
        subject_name: "M&E Manager",
        permissions: [
          "view_form",
          "edit_form",
          "publish_form",
          "archive_form",
          "assign_form",
          "view_submissions",
          "review_submissions",
          "approve_submissions",
          "export_data",
          "manage_form_controls",
        ],
        location_scope: controls.permissionPreset === "restricted" ? "project" : "organization",
        can_approve_own_submission: false,
        read_only: false,
      },
      {
        subject_type: "role",
        subject_name: "Field Officer",
        permissions: ["view_form", "submit_data", "edit_returned_submissions"],
        location_scope:
          controls.assignmentMode === "assigned_only"
            ? "assigned_locations"
            : "project",
        can_approve_own_submission: false,
        read_only: false,
      },
      {
        subject_type: "role",
        subject_name: "Viewer / Donor",
        permissions: ["view_form", "view_submissions"],
        location_scope: "project",
        can_approve_own_submission: false,
        read_only: true,
      },
    ],
    workflow_stages: workflowStages,
    data_quality_rules: [
      {
        id: "required_fields",
        label: "Required fields",
        rule_type: "required",
        enabled: true,
        severity: "critical",
        blocking: controls.dataQualityMode === "strict",
        fields: requiredFields,
        expression: null,
      },
      {
        id: "duplicate_detection",
        label: "Duplicate detection",
        rule_type: "duplicate",
        enabled: true,
        severity: controls.duplicateSeverity,
        blocking: controls.duplicateAction === "block",
        fields: duplicateFields,
        expression: null,
      },
      {
        id: "gps_validation",
        label: "GPS validation",
        rule_type: "gps",
        enabled: controls.requiresGps,
        severity: controls.requiresGps ? "high" : "medium",
        blocking: controls.dataQualityMode === "strict" && controls.requiresGps,
        fields: [],
        expression: `accuracy <= ${controls.gpsAccuracy}`,
      },
      {
        id: "missing_consent",
        label: "Missing consent flag",
        rule_type: "consent",
        enabled: controls.requireConsent,
        severity: "critical",
        blocking: controls.blockWithoutConsent,
        fields: [],
        expression: null,
      },
      {
        id: "interview_duration",
        label: "Interview duration check",
        rule_type: "duration",
        enabled: true,
        severity: "medium",
        blocking: false,
        fields: [],
        expression: `duration_minutes between ${controls.minimumDurationMinutes} and ${controls.maximumDurationMinutes}`,
      },
      {
        id: "enumerator_daily_volume",
        label: "Enumerator daily volume",
        rule_type: "enumerator_quality",
        enabled: controls.maximumSubmissionsPerDay > 0,
        severity: "medium",
        blocking: false,
        fields: [],
        expression: `max_submissions_per_day <= ${controls.maximumSubmissionsPerDay}`,
      },
    ],
    governance: {
      form_status:
        form.status === "published" ? "published" : controls.lifecycleStatus,
      approval_workflow:
        controls.workflowPreset === "two_step_review" ? "standard" : "simple",
      required_review_levels:
        controls.workflowPreset === "two_step_review" ? 2 : 1,
      submitted_records_editable: true,
      approved_records_editable: false,
      rejected_records_resubmittable: true,
      duplicate_submissions_allowed: controls.submissionFrequency === "unlimited",
      duplicate_detection_fields: duplicateFields,
      require_gps_capture: controls.requiresGps,
      require_timestamp_capture: true,
      require_enumerator_assignment: controls.assignmentMode === "assigned_only",
      require_supervisor_review: true,
      data_retention_days: controls.riskClassification === "sensitive" ? 3650 : 2555,
      export_restricted: controls.exportRestricted,
      sensitive_field_masking:
        controls.riskClassification === "high" ||
        controls.riskClassification === "sensitive",
      pii_tagging_required: controls.riskClassification !== "low",
      consent_required: controls.requireConsent,
      minimum_quality_score: controls.dataQualityMode === "strict" ? 90 : 75,
      review_sla_hours: controls.workflowPreset === "two_step_review" ? 72 : 48,
      auto_lock_after_approval: controls.lockApprovedRecords,
      auto_archive_after_project_closure: true,
    },
    audit: {
      immutable: controls.auditTrail,
      reason_required_events: [
        "control_changed",
        "entity_rule_changed",
        "frequency_rule_changed",
        "duplicate_rule_changed",
        "indicator_mapping_changed",
        "data_dictionary_changed",
        "profile_mapping_changed",
        "tracking_rule_changed",
        "translation_changed",
        "sampling_changed",
        "trigger_rule_changed",
        "workflow_changed",
        "permission_changed",
        "publish_attempt",
        "publish_failure",
        "form_published",
        "export_performed",
      ],
      tracked_events: [
        "form_created",
        "form_edited",
        "question_added",
        "question_removed",
        "control_changed",
        "entity_rule_changed",
        "frequency_rule_changed",
        "duplicate_rule_changed",
        "indicator_mapping_changed",
        "data_dictionary_changed",
        "profile_mapping_changed",
        "trigger_changed",
        "lifecycle_changed",
        "translation_changed",
        "sampling_changed",
        "workflow_changed",
        "permission_changed",
        "publish_readiness_run",
        "publish_attempt",
        "publish_success",
        "publish_failure",
        "form_archived",
        "submission_created",
        "submission_reviewed",
        "submission_approved",
        "submission_returned",
        "export_performed",
      ],
      export_allowed_roles: ["system_admin", "me_manager", "data_manager"],
    },
    versioning: {
      editing_published_creates_draft: true,
      preserve_submission_version_link: true,
      compare_versions_enabled: true,
      reference_lists_version_aware: true,
      archived_versions_viewable: true,
    },
    instrument: {
      purpose: {
        form_objective: controls.formObjective,
        business_purpose: controls.businessPurpose,
        program_objective: controls.programObjective,
        expected_use: controls.expectedUse,
        result_area: controls.resultArea,
        linked_outcome: controls.linkedOutcome,
        linked_output: controls.linkedOutput,
      },
      indicator_mappings: controls.indicatorLink
        ? form.fields.map((field) => ({
            form_id: form.id,
            question_id: field.id,
            variable_name: field.variableName ?? field.id,
            linked_indicator: controls.indicatorLink,
            indicator_component: controls.indicatorComponent,
            weight: 1,
          }))
        : [],
      data_dictionary: dataDictionary,
      dependency_map: dependencyMap,
      profile_impact_rules: dataDictionary.map((entry) => ({
        question_id: entry.question_id,
        variable_name: entry.variable_name,
        profile_impact: entry.profile_impact,
      })),
      profile_history_policy: {
        default_action:
          controls.profileUpdateMode === "with_supervisor_approval"
            ? "require_approval"
            : controls.profileUpdateMode === "after_submission"
              ? "keep_history"
              : "no_update",
        preserve_old_value: true,
        require_reason_for_change: true,
      },
      attachment_governance: {
        requirement: controls.mediaRequirement,
        allowed_formats: controls.fileTypes
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
        maximum_file_size_mb: controls.maxAttachmentSizeMb,
        maximum_count: controls.mediaRequirement === "none" ? 0 : 5,
      },
      interview_duration: {
        minimum_minutes: controls.minimumDurationMinutes,
        expected_minutes: controls.maximumDurationMinutes > controls.minimumDurationMinutes
          ? Math.round((controls.minimumDurationMinutes + controls.maximumDurationMinutes) / 2)
          : controls.minimumDurationMinutes,
        maximum_minutes: controls.maximumDurationMinutes,
      },
      enumerator_quality: {
        maximum_submissions_per_day: controls.maximumSubmissionsPerDay,
        gps_compliance_required: controls.requiresGps,
        photo_compliance_required:
          controls.mediaRequirement === "photo" ||
          controls.mediaRequirement === "photo_signature",
        consent_compliance_required: controls.requireConsent,
      },
      event_settings: {
        mode: controls.eventMode,
        event_entity_type: controls.eventMode === "none" ? null : "Event",
      },
      tracking: {
        tracking_series: controls.trackingSeries,
        parent_form: controls.parentForm,
        related_forms: controls.relatedForms
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
      },
      seasonal_rules: {
        season_name: controls.seasonName,
        season_start: controls.seasonStart || null,
        season_end: controls.seasonEnd || null,
      },
      survey_wave: {
        wave_label: controls.waveLabel,
        wave_required_on_submission: Boolean(controls.waveLabel),
      },
      data_source: {
        source_type: controls.dataSourceType,
      },
      geographic_scope: {
        description: controls.geographicScope,
        boundary_validation: controls.boundaryValidation,
        restricted_areas_supported: true,
      },
      auto_assignment_rules: controls.autoAssignmentRule
        ? [{ id: "auto_assignment_1", rule: controls.autoAssignmentRule, enabled: true }]
        : [],
      trigger_rules: controls.triggerRule
        ? [{ id: "trigger_1", rule: controls.triggerRule, enabled: true }]
        : [],
      related_forms: {
        parent_form: controls.parentForm,
        related_forms: controls.relatedForms
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
        graph_ready: true,
      },
      lifecycle: {
        status: form.status === "published" ? "published" : controls.lifecycleStatus,
        allowed_statuses: [
          "draft",
          "testing",
          "review",
          "approved",
          "published",
          "suspended",
          "archived",
        ],
        workflow: [
          "draft",
          "testing",
          "review",
          "approved",
          "published",
          "suspended",
          "archived",
        ],
        can_publish: controls.lifecycleStatus === "approved",
        review_comments: controls.reviewComments,
      },
      certification: {
        technical_reviewer_required: true,
        me_reviewer_required: true,
        technical_reviewer: controls.technicalReviewerName,
        me_reviewer: controls.meReviewerName,
        final_approver: controls.finalApproverName,
        approver_role: controls.reviewApprover,
        approval_date: controls.approvalDate || null,
        approval_notes: controls.approvalNotes,
        approval_notes_required: true,
      },
      sampling: {
        target_sample_size: controls.targetSampleSize,
        sampling_method: controls.samplingMethod,
      },
      performance_analytics: {
        completion_rate: true,
        drop_off_rate: true,
        question_skip_rate: true,
        average_duration: true,
        validation_failures: true,
      },
      localization: {
        languages: controls.localizationLanguages
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
        default_language: "English",
        translation_status: controls.translationStatus,
      },
      accessibility: {
        mode: controls.accessibilityMode,
        screen_reader_metadata: true,
        accessible_labels_required: true,
      },
      ai_readiness: {
        indicator_suggestions_ready: true,
        logic_review_ready: true,
        translation_generation_ready: true,
        bad_question_detection_ready: true,
      },
    },
  };
}

function builderStatusFromListStatus(status: string): DynamicForm["status"] {
  if (status === "published" || status === "archived") {
    return status;
  }
  return "draft";
}

export function createEditableDraftFromListItem(
  form: FormListItem,
): DynamicForm {
  const createdAt = form.updated_at || new Date().toISOString();
  const page = createPage("Page 1");
  const sectionCount = Math.max(1, form.sections || 1);
  const questionCount = Math.max(1, form.questions || 1);
  const sectionTitles = [
    "Consent and respondent profile",
    "Household and beneficiary details",
    "Location and coverage",
    "Program participation",
    "Evidence and data quality",
    "Enumerator review",
    "Supervisor checks",
    "Additional context",
  ];
  const sections = Array.from({ length: sectionCount }, (_, index) => ({
    ...createSection(page.id, sectionTitles[index] ?? `Section ${index + 1}`),
    description:
      index === 0
        ? (form.description ?? `Editable builder draft for ${form.name}.`)
        : `Operational section ${index + 1} for ${form.survey_name}.`,
  }));
  const questionTypes: FieldType[] = [
    "text",
    "number",
    "radio",
    "select",
    "gps",
    "photo",
    "date",
    "textarea",
    "checkbox",
    "decimal",
  ];
  const fields = Array.from({ length: questionCount }, (_, index) => {
    const section = sections[index % sections.length] ?? sections[0];
    const type =
      index === Math.min(5, questionCount - 1)
        ? "repeat_group"
        : (questionTypes[index % questionTypes.length] ?? "text");
    const label =
      index === 0
        ? "Consent confirmed"
        : type === "repeat_group"
          ? "Household members"
          : `${section.title} question ${Math.floor(index / sections.length) + 1}`;
    const field = attachStarterField(
      section,
      type,
      label,
      index < 3 || type === "gps",
    );
    return {
      ...field,
      options:
        type === "radio" || type === "select" || type === "checkbox"
          ? ["Yes", "No", "Not applicable"]
          : field.options,
      repeat:
        type === "repeat_group"
          ? { min: 1, max: 12, allowNested: false }
          : field.repeat,
      validation:
        type === "gps"
          ? { accuracyMax: 15 }
          : type === "number" || type === "decimal"
            ? { min: 0 }
            : field.validation,
      variableName: variableNameFromLabel(label, `question_${index + 1}`),
    };
  });

  return {
    activeVersion: form.status === "published" ? form.version : 0,
    fields,
    history: [
      {
        createdAt,
        status: builderStatusFromListStatus(form.status),
        summary: `Opened from ${form.name} summary for builder editing`,
        version: form.version,
      },
    ],
    id: form.id,
    name: form.name,
    pages: [
      {
        ...page,
        description: `${form.form_type} for ${form.project_name} / ${form.survey_name}.`,
      },
    ],
    sections,
    status: builderStatusFromListStatus(form.status),
    updatedAt: createdAt,
    version: form.version,
  };
}

function createEditableDraftFromSavedSchema(
  form: FormListItem,
  schema: Record<string, unknown>,
  version: number,
): DynamicForm {
  const schemaPages = Array.isArray((schema as { pages?: unknown }).pages)
    ? ((schema as { pages: Record<string, unknown>[] }).pages)
    : [];
  const schemaSections = Array.isArray(
    (schema as { sections?: unknown }).sections,
  )
    ? ((schema as { sections: Record<string, unknown>[] }).sections)
    : [];
  const pages =
    schemaPages.length > 0
      ? schemaPages.map((page, index) => ({
          id: String(page.id ?? `page-${index + 1}`),
          title: String(page.title ?? `Page ${index + 1}`),
          description:
            typeof page.description === "string" ? page.description : undefined,
        }))
      : [createPage("Page 1")];
  const fallbackPageId = pages[0]?.id ?? "page-1";
  const sections =
    schemaSections.length > 0
      ? schemaSections.map((section, index) => ({
          id: String(section.id ?? `section-${index + 1}`),
          title: String(section.title ?? `Section ${index + 1}`),
          description:
            typeof section.description === "string"
              ? section.description
              : undefined,
          pageId:
            typeof section.page_id === "string"
              ? section.page_id
              : fallbackPageId,
        }))
      : [createSection(fallbackPageId, "Questions")];
  const fields = schemaSections.flatMap((section, sectionIndex) => {
    const sectionId = String(section.id ?? sections[sectionIndex]?.id);
    const rawFields = Array.isArray(section.fields)
      ? (section.fields as Record<string, unknown>[])
      : [];
    return rawFields.map((field, fieldIndex) => {
      const optionValues = Array.isArray(field.options)
        ? (field.options as Record<string, unknown>[]).map((option) =>
            String(option.label ?? option.value ?? ""),
          )
        : [];
      return {
        id: String(field.id ?? `field-${sectionIndex + 1}-${fieldIndex + 1}`),
        label: String(field.label ?? `Question ${fieldIndex + 1}`),
        type: String(field.type ?? "text") as FieldType,
        required: Boolean(field.required),
        hint: typeof field.hint === "string" ? field.hint : undefined,
        pageId:
          typeof field.page_id === "string"
            ? field.page_id
            : sections[sectionIndex]?.pageId,
        sectionId,
        variableName:
          typeof field.variable_name === "string"
            ? field.variable_name
            : undefined,
        options: optionValues.filter(Boolean),
        validation:
          field.validation && typeof field.validation === "object"
            ? (field.validation as FormField["validation"])
            : undefined,
        logic: Array.isArray(field.logic)
          ? (field.logic as FormField["logic"])
          : undefined,
        appearance:
          field.appearance && typeof field.appearance === "object"
            ? (field.appearance as FormField["appearance"])
            : undefined,
        calculation:
          typeof field.calculation === "string"
            ? { expression: field.calculation }
            : field.calculation && typeof field.calculation === "object"
              ? (field.calculation as FormField["calculation"])
              : undefined,
        matrix:
          field.matrix && typeof field.matrix === "object"
            ? (field.matrix as FormField["matrix"])
            : undefined,
        repeat:
          field.repeat && typeof field.repeat === "object"
            ? (field.repeat as FormField["repeat"])
            : undefined,
        media:
          field.media && typeof field.media === "object"
            ? (field.media as FormField["media"])
            : undefined,
        gps:
          field.gps && typeof field.gps === "object"
            ? (field.gps as FormField["gps"])
            : undefined,
      } satisfies FormField;
    });
  });
  const updatedAt = form.updated_at || new Date().toISOString();
  return {
    activeVersion: form.status === "published" ? version : 0,
    fields,
    history: [
      {
        createdAt: updatedAt,
        status: builderStatusFromListStatus(form.status),
        summary: `Loaded saved schema for ${form.name}`,
        version,
      },
    ],
    id: form.id,
    name: form.name,
    pages,
    sections,
    status: builderStatusFromListStatus(form.status),
    updatedAt,
    version,
  };
}

export function createEnterpriseDraftForm(
  setup: FormSetupDraft,
  startMethod: StartMethod,
  existingForms: FormListItem[],
): DynamicForm {
  const page = createPage("Page 1");
  const overviewSection = createSection(page.id, "Form setup");
  const evidenceSection = createSection(page.id, "Evidence and quality");
  const createdAt = new Date().toISOString();
  const baseName = setup.formName.trim() || `${setup.formType} Form`;
  const form: DynamicForm = {
    activeVersion: 0,
    fields: [],
    history: [
      {
        createdAt,
        status: "draft",
        summary: `Draft shell created from ${startMethod.replace("_", " ")} setup`,
        version: 1,
      },
    ],
    id: `draft-form-${Date.now()}`,
    name: baseName,
    pages: [
      {
        ...page,
        description: `${setup.formType} for ${setup.projectName}. Collection method: ${setup.collectionMethod.replace("_", " + ")}.`,
      },
    ],
    sections: [
      {
        ...overviewSection,
        description:
          setup.description || "Core questions and respondent context.",
      },
    ],
    status: "draft",
    updatedAt: createdAt,
    version: 1,
  };

  if (startMethod === "blank") {
    return form;
  }

  if (startMethod === "duplicate") {
    const source = existingForms[0];
    const duplicatedFields = [
      attachStarterField(overviewSection, "text", "Respondent name", true),
      attachStarterField(overviewSection, "radio", "Consent confirmed", true),
      attachStarterField(evidenceSection, "gps", "Collection GPS", true),
    ];
    return {
      ...form,
      fields: duplicatedFields,
      name: source ? `${source.name} Copy` : `${baseName} Copy`,
      sections: [
        form.sections[0] ?? overviewSection,
        {
          ...evidenceSection,
          description: source
            ? `Starter copy based on ${source.name}. Review all questions before publishing.`
            : "Evidence and quality checks.",
        },
      ],
    };
  }

  if (startMethod === "import") {
    return {
      ...form,
      fields: [
        attachStarterField(overviewSection, "hidden", "Import batch ID", false),
        attachStarterField(overviewSection, "textarea", "Import notes", false),
      ],
    };
  }

  const sections = [
    form.sections[0] ?? overviewSection,
    {
      ...evidenceSection,
      description:
        "GPS, consent evidence, files, and supervisor quality checks.",
    },
  ];
  const fields = [
    attachStarterField(overviewSection, "radio", "Consent given", true),
    attachStarterField(overviewSection, "text", "Respondent full name", true),
    attachStarterField(overviewSection, "phone", "Phone number", false),
    attachStarterField(overviewSection, "number", "Age", false),
    attachStarterField(evidenceSection, "gps", "Collection GPS", true),
    attachStarterField(evidenceSection, "photo", "Photo evidence", false),
    attachStarterField(evidenceSection, "rating", "Data quality score", false),
  ];

  return { ...form, fields, sections };
}

export function validateFormForPublish(
  form: DynamicForm | null | undefined,
  setup: FormSetupDraft,
  projectLinked = Boolean(setup.projectName.trim()),
  controls: FormControlsDraft = defaultControlsDraft,
): PublishReadinessItem[] {
  const fields = form?.fields ?? [];
  const sections = form?.sections ?? [];
  const variableNames = fields
    .map((field) => field.variableName?.trim())
    .filter(Boolean) as string[];
  const uniqueVariableNames = new Set(variableNames);
  const hasGps = fields.some((field) =>
    ["gps", "geolocation", "map", "geofence"].includes(field.type),
  );
  const hasMedia = fields.some((field) =>
    ["photo", "image", "signature", "audio", "video", "file"].includes(
      field.type,
    ),
  );
  const hasConsentQuestion = fields.some((field) =>
    /consent|agree|permission/i.test(field.label),
  );
  const hasBrokenLogic = fields.some((field) =>
    (field.logic ?? []).some(
      (rule) =>
        rule.targetId &&
        !fields.some((candidate) => candidate.id === rule.targetId),
    ),
  );
  const entityRuleSelected =
    controls.requiresEntity ||
    controls.allowAnonymous ||
    controls.profileUpdateMode !== "never";
  const needsEntityMapping =
    controls.requiresEntity || controls.profileUpdateMode !== "never";
  const entityMappings = Object.values(controls.profileMappings).filter(Boolean);

  const item = ({
    category,
    complete,
    description,
    id,
    jumpTo,
    label,
    required,
    warning = false,
  }: {
    category: string;
    complete: boolean;
    description: string;
    id: string;
    jumpTo: CreationStage;
    label: string;
    required: boolean;
    warning?: boolean;
  }): PublishReadinessItem => ({
    category,
    complete,
    description,
    id,
    jumpTo,
    label,
    required,
    status: complete ? "passed" : required && !warning ? "failed" : "warning",
  });

  return [
    item({
      category: "Form information",
      complete: Boolean(setup.formName.trim() || form?.name.trim()),
      description: "The published form must have a clear operational name.",
      id: "name",
      jumpTo: "setup",
      label: "Form has a name",
      required: true,
    }),
    item({
      category: "Form information",
      complete: Boolean(setup.formType.trim()),
      description: "Choose the M&E form type so readiness rules match the collection purpose.",
      id: "form-type",
      jumpTo: "setup",
      label: "Form type selected",
      required: true,
    }),
    item({
      category: "Form information",
      complete: Boolean(setup.owner.trim()),
      description: "Every form needs an accountable owner.",
      id: "owner",
      jumpTo: "setup",
      label: "Owner defined",
      required: true,
    }),
    item({
      category: "Form information",
      complete: Boolean(setup.language.trim()),
      description: "Primary language is required before translation and mobile readiness.",
      id: "language",
      jumpTo: "setup",
      label: "Primary language defined",
      required: true,
    }),
    item({
      category: "Form information",
      complete: projectLinked,
      description:
        "Every form must belong to a project so submissions remain traceable.",
      id: "project",
      jumpTo: "setup",
      label: "Form belongs to a project",
      required: true,
    }),
    item({
      category: "Purpose",
      complete: Boolean(
        controls.formObjective.trim() &&
          controls.businessPurpose.trim() &&
          controls.expectedUse.trim(),
      ),
      description:
        "Managed M&E instruments need an objective, business purpose, and expected use before field deployment.",
      id: "purpose",
      jumpTo: "controls",
      label: "Form purpose and business context defined",
      required: true,
    }),
    item({
      category: "Purpose",
      complete: Boolean(
        controls.resultArea.trim() ||
          controls.linkedOutcome.trim() ||
          controls.linkedOutput.trim(),
      ),
      description:
        "Link the form to a result area, outcome, or output so it can support donor reporting and program learning.",
      id: "results-linkage",
      jumpTo: "controls",
      label: "Result linkage reviewed",
      required: false,
      warning: true,
    }),
    item({
      category: "Structure",
      complete: sections.length > 0,
      description:
        "Sections organize the survey for field officers and reviewers.",
      id: "sections",
      jumpTo: "builder",
      label: "At least one section exists",
      required: true,
    }),
    item({
      category: "Structure",
      complete: fields.length > 0,
      description: "Add at least one question before publishing.",
      id: "questions",
      jumpTo: "builder",
      label: "At least one question exists",
      required: true,
    }),
    item({
      category: "Structure",
      complete: sections.length > 1 || fields.length <= 12,
      description:
        "Large forms should be grouped into practical sections instead of one long question list.",
      id: "organized-sections",
      jumpTo: "builder",
      label: "Question structure is organized",
      required: false,
      warning: true,
    }),
    item({
      category: "Question validation",
      complete:
        variableNames.length === fields.length &&
        uniqueVariableNames.size === variableNames.length,
      description:
        "Variable names must be present, unique, stable, lowercase-friendly, and without spaces.",
      id: "variables",
      jumpTo: "builder",
      label: "Variable names are unique",
      required: true,
    }),
    item({
      category: "Data dictionary",
      complete: fields.every((field) =>
        Boolean((field.variableName ?? "").trim() || field.label.trim()),
      ),
      description:
        "Every question needs a variable name, type, allowed values, sensitivity, and dictionary metadata.",
      id: "data-dictionary",
      jumpTo: "controls",
      label: "Data dictionary can be generated",
      required: true,
    }),
    item({
      category: "Question validation",
      complete: fields.some((field) => field.required),
      description:
        "At least one required question should protect completeness before field rollout.",
      id: "required-questions",
      jumpTo: "builder",
      label: "Required questions reviewed",
      required: true,
    }),
    item({
      category: "Logic rules",
      complete: !hasBrokenLogic,
      description: "Logic cannot point to deleted questions.",
      id: "logic",
      jumpTo: "builder",
      label: "Logic rules are valid",
      required: true,
    }),
    item({
      category: "Entity settings",
      complete: entityRuleSelected && Boolean(controls.entityType.trim()),
      description:
        "Choose whether this form creates, updates, requires, or allows anonymous beneficiary/entity records.",
      id: "entity-settings",
      jumpTo: "controls",
      label: "Beneficiary/entity settings defined",
      required: true,
    }),
    item({
      category: "Entity settings",
      complete: !needsEntityMapping || entityMappings.length >= 2,
      description:
        "Entity-linked forms should map key questions such as name, phone, village, or GPS to the beneficiary profile.",
      id: "entity-mapping",
      jumpTo: "controls",
      label: "Beneficiary profile mapping reviewed",
      required: needsEntityMapping,
      warning: !needsEntityMapping,
    }),
    item({
      category: "Submission rules",
      complete: Boolean(controls.submissionFrequency),
      description:
        "Every form must define whether it is once-ever, periodic, event-based, or unlimited.",
      id: "frequency",
      jumpTo: "controls",
      label: "Submission frequency rule selected",
      required: true,
    }),
    item({
      category: "Duplicate prevention",
      complete:
        controls.duplicateFields.length > 0 &&
        controls.duplicateThreshold >= 50 &&
        Boolean(controls.duplicateAction),
      description:
        "Duplicate rules protect beneficiary registration and repeated submissions before they reach reports.",
      id: "duplicate-rules",
      jumpTo: "controls",
      label: "Duplicate prevention configured",
      required: true,
    }),
    item({
      category: "Indicator mapping",
      complete:
        !controls.indicatorLink.trim() ||
        controls.indicatorComponent !== "none",
      description:
        "If a form or question is linked to an indicator, choose whether it contributes to numerator, denominator, disaggregation, or evidence.",
      id: "indicator-mapping",
      jumpTo: "controls",
      label: "Indicator mapping reviewed",
      required: false,
      warning: true,
    }),
    item({
      category: "Duration and quality",
      complete:
        controls.minimumDurationMinutes > 0 &&
        controls.maximumDurationMinutes >= controls.minimumDurationMinutes,
      description:
        "Expected duration rules help Data Quality flag submissions completed too quickly or unusually slowly.",
      id: "duration",
      jumpTo: "controls",
      label: "Interview duration rules configured",
      required: true,
    }),
    item({
      category: "Enumerator quality",
      complete: controls.maximumSubmissionsPerDay > 0,
      description:
        "Enumerator quality controls help detect suspicious daily volume, missing GPS, missing consent, and weak evidence.",
      id: "enumerator-quality",
      jumpTo: "controls",
      label: "Enumerator quality controls reviewed",
      required: false,
      warning: true,
    }),
    item({
      category: "Reference data",
      complete:
        !controls.referenceDataRequired ||
        fields.some((field) =>
          ["select", "dropdown", "multiselect", "radio"].includes(field.type),
        ),
      description:
        "Reference data is recommended for location, facility, crop, donor, and program lists.",
      id: "reference-data",
      jumpTo: "controls",
      label: "Reference data reviewed",
      required: false,
      warning: true,
    }),
    item({
      category: "GPS settings",
      complete: !controls.requiresGps || hasGps,
      description:
        "If GPS is required, the form must include a GPS/geolocation question.",
      id: "gps-question",
      jumpTo: "builder",
      label: "GPS question exists when required",
      required: controls.requiresGps,
    }),
    item({
      category: "GPS settings",
      complete: controls.gpsAccuracy > 0 && controls.gpsAccuracy <= 100,
      description:
        "Set a realistic GPS accuracy threshold, for example 20 meters.",
      id: "gps-threshold",
      jumpTo: "controls",
      label: "GPS accuracy threshold configured",
      required: true,
    }),
    item({
      category: "Media settings",
      complete: controls.mediaRequirement === "none" || hasMedia,
      description:
        "Media rules should match whether photo, signature, audio, video, or file evidence is expected.",
      id: "media",
      jumpTo: "controls",
      label: "Media rules reviewed",
      required: controls.mediaRequirement !== "none",
    }),
    item({
      category: "Consent",
      complete:
        !controls.requireConsent ||
        (controls.consentMode !== "not_required" && hasConsentQuestion),
      description:
        "Consent forms should include a consent question and block missing consent when required.",
      id: "consent",
      jumpTo: controls.requireConsent && !hasConsentQuestion ? "builder" : "controls",
      label: "Consent configuration complete",
      required: controls.requireConsent,
    }),
    item({
      category: "Data quality",
      complete: Boolean(controls.dataQualityMode),
      description:
        "Select how validation failures, missing data, outliers, and GPS issues affect collection and review.",
      id: "data-quality",
      jumpTo: "controls",
      label: "Data quality mode selected",
      required: true,
    }),
    item({
      category: "Workflow",
      complete: Boolean(
        controls.workflowPreset && controls.reviewer && controls.reviewApprover,
      ),
      description:
        "Define who reviews, who approves, and who can return or reject submissions.",
      id: "workflow",
      jumpTo: "controls",
      label: "Review workflow configured",
      required: true,
    }),
    item({
      category: "Permissions",
      complete: Boolean(controls.permissionPreset),
      description:
        "Permissions define who can view, edit, publish, assign, collect, review, approve, and export.",
      id: "permissions",
      jumpTo: "controls",
      label: "Permissions reviewed",
      required: true,
    }),
    item({
      category: "Assignment rules",
      complete: controls.assignmentMode === "assigned_only",
      description:
        "Assigned users only is the recommended default before pushing forms to field officers.",
      id: "assignment",
      jumpTo: "controls",
      label: "Assignment rules configured",
      required: false,
      warning: true,
    }),
    item({
      category: "Offline readiness",
      complete:
        controls.offlineEnabled &&
        (!controls.referenceDataRequired || setup.collectionMethod !== "web"),
      description:
        "Mobile-ready forms should support offline sync, reference data download, and media capture rules.",
      id: "offline",
      jumpTo: "controls",
      label: "Offline collection readiness reviewed",
      required: false,
      warning: true,
    }),
    item({
      category: "Tracking",
      complete:
        Boolean(controls.trackingSeries.trim()) ||
        ["Registration", "Baseline Survey", "Monitoring Visit", "Endline"].includes(
          setup.formType,
        ),
      description:
        "Longitudinal instruments should identify their tracking series and related form chain.",
      id: "tracking-series",
      jumpTo: "controls",
      label: "Longitudinal tracking reviewed",
      required: false,
      warning: true,
    }),
    item({
      category: "Sampling",
      complete:
        controls.samplingMethod === "none" ||
        controls.targetSampleSize > 0,
      description:
        "If this is an evaluation or survey sample, define the method and target sample size.",
      id: "sampling",
      jumpTo: "controls",
      label: "Sampling controls reviewed",
      required: false,
      warning: true,
    }),
    item({
      category: "Localization",
      complete: Boolean(controls.localizationLanguages.trim()),
      description:
        "One instrument should be able to carry language versions and translation status.",
      id: "localization",
      jumpTo: "controls",
      label: "Localization settings reviewed",
      required: false,
      warning: true,
    }),
    item({
      category: "Trigger rules",
      complete: Boolean(controls.triggerRule.trim() || controls.autoAssignmentRule.trim()),
      description:
        "Trigger and auto-assignment rules make form chains operational, for example baseline completed -> monitoring visit.",
      id: "trigger-rules",
      jumpTo: "controls",
      label: "Trigger rules reviewed",
      required: false,
      warning: true,
    }),
    item({
      category: "Lifecycle",
      complete: controls.lifecycleStatus === "approved",
      description:
        "Forms move from Draft to Testing to Review to Approved before they can be published for assignments and field collection.",
      id: "lifecycle-approved",
      jumpTo: "controls",
      label: "Form lifecycle is approved for publishing",
      required: true,
    }),
    item({
      category: "Certification",
      complete: Boolean(
        controls.technicalReviewerName.trim() &&
          controls.meReviewerName.trim() &&
          controls.finalApproverName.trim() &&
          controls.approvalNotes.trim(),
      ),
      description:
        "Technical reviewer, M&E reviewer, final approver, and approval notes are required for enterprise form certification.",
      id: "certification",
      jumpTo: "controls",
      label: "Form certification completed",
      required: true,
    }),
    item({
      category: "Risk classification",
      complete: Boolean(controls.riskClassification),
      description:
        "Classify form risk so sensitive forms can require stricter permissions, masking, and approval.",
      id: "risk",
      jumpTo: "controls",
      label: "Risk classification selected",
      required: true,
    }),
    item({
      category: "Versioning",
      complete: Boolean(
        controls.versionNumber.trim() && controls.changeSummary.trim(),
      ),
      description:
        "Before publishing, enter a version number and change summary for immutable history.",
      id: "version",
      jumpTo: "controls",
      label: "Version information complete",
      required: true,
    }),
    item({
      category: "Governance",
      complete: controls.auditTrail && controls.lockApprovedRecords,
      description:
        "Consent, retention, masking, edit rules, and record locking have production defaults.",
      id: "governance",
      jumpTo: "controls",
      label: "Governance reviewed",
      required: true,
    }),
    item({
      category: "Mapping settings",
      complete:
        !hasGps ||
        fields.some((field) => field.type === "gps" && field.validation?.accuracyMax) ||
        controls.gpsAccuracy > 0,
      description:
        "GPS forms need an accuracy threshold before field deployment.",
      id: "mapping",
      jumpTo: "controls",
      label: "Mapping settings reviewed",
      required: hasGps,
    }),
  ];
}

export function FormCreationWorkspace({
  existingForms,
  initialForm,
  onBack,
  token,
}: FormCreationWorkspaceProps) {
  const localProjects = useWorkspaceStore((state) => state.localProjects);
  const upsertLocalForm = useWorkspaceStore((state) => state.upsertLocalForm);
  const preview = !token || token === "preview-token";
  const projectsQuery = useQuery({
    enabled: Boolean(token && !preview),
    queryFn: () => listProjects(token ?? ""),
    queryKey: ["form-builder-projects", token],
  });
  const surveysQuery = useQuery({
    enabled: Boolean(token && !preview),
    queryFn: () => listSurveys(token ?? ""),
    queryKey: ["form-builder-surveys", token],
  });
  const tenantProjects = useMemo(() => projectsQuery.data ?? [], [projectsQuery.data]);
  const tenantSurveys = useMemo(() => surveysQuery.data ?? [], [surveysQuery.data]);
  const formSchemaQuery = useQuery({
    enabled: Boolean(initialForm && token && !preview),
    queryFn: () => getFormSchema(token ?? "", initialForm?.id ?? ""),
    queryKey: ["form-builder-schema", token, initialForm?.id],
  });
  const availableProjectOptions = useMemo(
    () =>
      Array.from(
        new Set(
          preview
            ? [...localProjects.map((project) => project.name), ...projectOptions]
            : tenantProjects.map((project) => project.name),
        ),
      ),
    [localProjects, preview, tenantProjects],
  );
  const initialDraft = useMemo(
    () =>
      initialForm && (preview || !token)
        ? createEditableDraftFromListItem(initialForm)
        : null,
    [initialForm, preview, token],
  );
  const initialSetup = useMemo<FormSetupDraft>(
    () =>
      initialForm
        ? {
            collectionMethod: "web_mobile",
            description: initialForm.description ?? "",
            durationMinutes: 25,
            formName: initialForm.name,
            formType: initialForm.form_type,
            language: "English",
            owner: initialForm.owner,
            projectName: initialForm.project_name,
          }
        : {
            ...setupDefaults,
            formName: "New data collection form",
            projectName: "",
          },
    [initialForm],
  );
  const [setup, setSetup] = useState<FormSetupDraft>(initialSetup);
  const [stage, setStage] = useState<CreationStage>(
    initialForm ? "builder" : "setup",
  );
  const [startMethod, setStartMethod] = useState<StartMethod>("blank");
  const [selectedTemplateId, setSelectedTemplateId] = useState(
    starterTemplates[0]?.id ?? "",
  );
  const [selectedDuplicateFormId, setSelectedDuplicateFormId] = useState(
    existingForms[0]?.id ?? "",
  );
  const [draftForm, setDraftForm] = useState<DynamicForm | null>(initialDraft);
  const [publishedForm, setPublishedForm] = useState<DynamicForm | null>(null);
  const [controlsDraft, setControlsDraft] =
    useState<FormControlsDraft>(defaultControlsDraft);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importMessage, setImportMessage] = useState("");
  const [importBusy, setImportBusy] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishMessage, setPublishMessage] = useState("");
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);
  const importFileRef = useRef<HTMLInputElement | null>(null);
  const selectedProject = useMemo(
    () =>
      preview
        ? localProjects.find((project) => project.name === setup.projectName)
        : tenantProjects.find((project) => project.name === setup.projectName),
    [localProjects, preview, setup.projectName, tenantProjects],
  );
  const selectedProjectId = selectedProject?.id ?? null;
  const selectedSurvey =
    !preview && selectedProjectId
      ? tenantSurveys.find((survey) => survey.project_id === selectedProjectId)
      : null;
  const projectLinked = preview
    ? Boolean(setup.projectName.trim())
    : Boolean(selectedProjectId);
  const checklist = useMemo(
    () => validateFormForPublish(draftForm, setup, projectLinked, controlsDraft),
    [controlsDraft, draftForm, projectLinked, setup],
  );
  const criticalFailures = checklist.filter(
    (item) => item.required && !item.complete,
  );
  const readinessPassedCount = checklist.filter(
    (item) => item.status === "passed",
  ).length;
  const readinessWarnings = checklist.filter(
    (item) => item.status === "warning",
  );
  const readinessScore = checklist.length
    ? Math.round((readinessPassedCount / checklist.length) * 100)
    : 0;
  const readinessLabel =
    criticalFailures.length > 0
      ? "Not Ready"
      : readinessScore >= 90
        ? "Ready"
        : "Needs Review";
  const readinessTone =
    criticalFailures.length > 0
      ? "danger"
      : readinessScore >= 90
        ? "success"
        : "warning";
  const questionMappingOptions = useMemo(
    () =>
      (draftForm?.fields ?? []).map((field) => ({
        id: field.id,
        label: field.label,
        variableName:
          field.variableName ?? variableNameFromLabel(field.label, field.id),
      })),
    [draftForm],
  );
  const activeLifecycleId = publishedForm
    ? "publish"
    : stage === "setup" || stage === "start"
      ? "setup"
      : stage === "builder"
        ? "builder"
        : stage === "controls"
          ? "controls"
          : stage === "preview"
            ? "test"
            : controlsDraft.lifecycleStatus === "approved"
              ? criticalFailures.length
                ? "approve"
                : "publish"
              : controlsDraft.lifecycleStatus === "review"
                ? "approve"
                : "review";
  const activeLifecycleIndex = lifecycleSteps.findIndex(
    (step) => step.id === activeLifecycleId,
  );
  const lifecycleCompletion = {
    approve: controlsDraft.lifecycleStatus === "approved" || Boolean(publishedForm),
    builder: Boolean(draftForm && draftForm.fields.length > 0),
    controls: readinessScore >= 70,
    publish: Boolean(publishedForm),
    review:
      controlsDraft.lifecycleStatus === "review" ||
      controlsDraft.lifecycleStatus === "approved" ||
      Boolean(publishedForm),
    setup: Boolean(setup.formName.trim()),
    test:
      controlsDraft.lifecycleStatus === "testing" ||
      controlsDraft.lifecycleStatus === "review" ||
      controlsDraft.lifecycleStatus === "approved" ||
      Boolean(publishedForm),
  } satisfies Record<(typeof lifecycleSteps)[number]["id"], boolean>;

  function updateSetup(patch: Partial<FormSetupDraft>): void {
    setSetup((current) => ({ ...current, ...patch }));
  }

  function updateControlsDraft(patch: Partial<FormControlsDraft>): void {
    setControlsDraft((current) => ({ ...current, ...patch }));
  }

  function openLifecycleStep(stepId: (typeof lifecycleSteps)[number]["id"]): void {
    if (stepId === "setup") {
      setStage("setup");
      return;
    }
    if (!draftForm) return;
    if (stepId === "builder") {
      setStage("builder");
      return;
    }
    if (stepId === "controls") {
      setStage("controls");
      return;
    }
    if (stepId === "test") {
      setStage("preview");
      return;
    }
    setStage("review");
  }

  function approveForPublish(): void {
    updateControlsDraft({
      approvalDate:
        controlsDraft.approvalDate || new Date().toISOString().slice(0, 10),
      approvalNotes:
        controlsDraft.approvalNotes || "Reviewed and approved for publishing.",
      lifecycleStatus: "approved",
    });
  }

  useEffect(() => {
    if (preview || !tenantProjects.length || !initialForm) return;
    if (tenantProjects.some((project) => project.name === setup.projectName)) return;
    setSetup((current) => ({ ...current, projectName: initialForm.project_name ?? "" }));
  }, [initialForm, preview, setup.projectName, tenantProjects]);

  useEffect(() => {
    if (!initialForm || !formSchemaQuery.data) return;
    setDraftForm(
      createEditableDraftFromSavedSchema(
        initialForm,
        formSchemaQuery.data.schema,
        formSchemaQuery.data.version,
      ),
    );
    setStage("builder");
  }, [formSchemaQuery.data, initialForm]);

  useEffect(() => {
    if (selectedDuplicateFormId || !existingForms.length) return;
    setSelectedDuplicateFormId(existingForms[0]?.id ?? "");
  }, [existingForms, selectedDuplicateFormId]);

  async function createDraftAndOpenBuilder(method = startMethod): Promise<void> {
    setImportMessage("");
    let nextDraft = createEnterpriseDraftForm(setup, method, existingForms);
    if (method === "template") {
      const template =
        starterTemplates.find((candidate) => candidate.id === selectedTemplateId) ??
        starterTemplates[0];
      if (template) {
        nextDraft = createDraftFromStarterTemplate(setup, template);
        updateSetup({ formType: template.formType });
      }
    }
    if (method === "duplicate") {
      const source = existingForms.find(
        (candidate) => candidate.id === selectedDuplicateFormId,
      );
      if (!source) {
        setImportMessage("Choose an existing form before continuing.");
        return;
      }
      try {
        if (token && !preview) {
          const schema = await getFormSchema(token, source.id);
          nextDraft = createDuplicateDraftFromForm(
            createEditableDraftFromSavedSchema(source, schema.schema, schema.version),
            setup,
          );
        } else {
          nextDraft = createDuplicateDraftFromForm(
            createEditableDraftFromListItem(source),
            setup,
          );
        }
        updateSetup({
          formName: setup.formName.trim() || `${source.name} Copy`,
          formType: source.form_type,
        });
      } catch (error) {
        setImportMessage(
          error instanceof Error
            ? error.message
            : "The selected form could not be duplicated.",
        );
        return;
      }
    }
    if (method === "import" && importFile) {
      setImportBusy(true);
      try {
        const rows = await readSpreadsheetRows(importFile);
        const headers = rows[0]?.map((header) => header.trim()) ?? [];
        if (!headers.some(Boolean)) {
          throw new Error("The spreadsheet must have question names in the first row.");
        }
        nextDraft = createDraftFromSpreadsheetRows(setup, headers, rows.slice(1, 51));
        setImportMessage(`${headers.filter(Boolean).length} spreadsheet column(s) were converted into editable form questions.`);
      } catch (error) {
        setImportMessage(error instanceof Error ? error.message : "The spreadsheet could not be read.");
        setImportBusy(false);
        return;
      }
      setImportBusy(false);
    }
    setDraftForm(nextDraft);
    upsertLocalForm(
      workspaceFormFromDraft(
        nextDraft,
        setup,
        selectedProjectId,
      ),
    );
    setPublishedForm(null);
    setStage("builder");
  }

  function saveDraftLocally(): void {
    if (!draftForm) return;
    upsertLocalForm(workspaceFormFromDraft(draftForm, setup, selectedProjectId));
    setPublishMessage(
      projectLinked
        ? "Draft saved. You can publish when ready."
        : "Draft saved locally. Select an existing project before publishing.",
    );
  }

  async function publishDraft(): Promise<void> {
    if (!draftForm) return;
    if (!projectLinked || !selectedProjectId) {
      setPublishMessage("Select an existing project before publishing. Drafts can be saved without a project, but published forms must be project-linked.");
      setStage("setup");
      return;
    }
    if (criticalFailures.length) {
      setPublishMessage("Resolve the required readiness checks before publishing.");
      return;
    }
    if (token && !preview) {
      setPublishing(true);
      setPublishMessage("");
      try {
        const survey =
          selectedSurvey ??
          (await createSurvey(token, {
            code: `FORM-${Date.now().toString(36).toUpperCase()}`,
            description: "Auto-created survey context for a project-linked data collection form.",
            geographic_scope: selectedProject?.region ?? null,
            project_id: selectedProjectId,
            status: "active",
            survey_type: "monitoring",
            target_population: "Project participants",
            title: "General Data Collection",
          }));
        const schema = toMobileSchema(draftForm) as Record<string, unknown>;
        const saved = initialForm
          ? await updateForm(token, initialForm.id, {
              description:
                setup.description || draftForm.sections[0]?.description || null,
              name: draftForm.name,
              publish: true,
              schema,
            })
          : await createForm(token, {
              description:
                setup.description || draftForm.sections[0]?.description || null,
              name: draftForm.name,
              project_id: selectedProjectId,
              publish: true,
              schema,
              slug: `${slugFromText(draftForm.name, "form")}-${Date.now().toString(36)}`,
              survey_id: survey.id,
            });
        const nextPublishedForm: DynamicForm = {
          ...draftForm,
          activeVersion: saved.current_version,
          id: saved.id,
          status: "published",
          updatedAt: new Date().toISOString(),
          version: saved.current_version,
        };
        await updateFormControls(
          token,
          saved.id,
          controlsDraftToApiControls(controlsDraft, nextPublishedForm),
        );
        setPublishedForm(nextPublishedForm);
        setDraftForm(nextPublishedForm);
        upsertLocalForm(workspaceFormFromDraft(nextPublishedForm, setup, selectedProjectId));
        setPublishMessage(
          initialForm
            ? `${saved.name} was saved as version ${saved.current_version}. Existing submissions remain linked to their original version.`
            : `${saved.name} was published under ${selectedProject?.name ?? "the selected project"}.`,
        );
        setStage("review");
      } catch (error) {
        setPublishMessage(error instanceof Error ? error.message : "The form could not be published.");
      } finally {
        setPublishing(false);
      }
      return;
    }
    const nextPublishedForm: DynamicForm = {
      ...draftForm,
      activeVersion: Math.max(draftForm.activeVersion, 1),
      history: [
        ...(draftForm.history ?? []),
        {
          createdAt: new Date().toISOString(),
          status: "published",
          summary:
            controlsDraft.changeSummary ||
            "Published after enterprise readiness review",
          version: Math.max(draftForm.version, 1),
        },
      ],
      status: "published",
      updatedAt: new Date().toISOString(),
    };
    setPublishedForm(nextPublishedForm);
    setDraftForm(nextPublishedForm);
    upsertLocalForm(
      workspaceFormFromDraft(
        nextPublishedForm,
        setup,
        selectedProjectId,
      ),
    );
  }

  function handleBuilderFormChange(nextForm: DynamicForm): void {
    setDraftForm(nextForm);
    upsertLocalForm(
      workspaceFormFromDraft(
        nextForm,
        setup,
        selectedProjectId,
      ),
    );
  }

  if (initialForm && !preview && formSchemaQuery.isLoading && !draftForm) {
    return (
      <section className="space-y-3">
        <div className="rounded-xl border bg-panel p-4 shadow-line">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Badge tone="collect">FORMS</Badge>
              <h1 className="mt-3 text-xl font-semibold">
                Loading saved form
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Opening the exact saved schema for {initialForm.name}. Your
                questions and settings will not be regenerated.
              </p>
            </div>
            <Button onClick={onBack} variant="secondary">
              <ArrowLeft aria-hidden="true" />
              Back to forms
            </Button>
          </div>
        </div>
        <div className="rounded-xl border bg-panel p-8 text-center text-sm text-muted-foreground">
          Fetching form questions, response types, validation, logic, and data
          controls...
        </div>
      </section>
    );
  }

  if (initialForm && !preview && formSchemaQuery.isError && !draftForm) {
    return (
      <section className="space-y-3">
        <div className="rounded-xl border bg-panel p-4 shadow-line">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Badge tone="danger">SCHEMA ERROR</Badge>
              <h1 className="mt-3 text-xl font-semibold">
                The saved form could not be opened
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                The builder will not show generated placeholder questions for a
                saved form. Try again or return to the forms list.
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => formSchemaQuery.refetch()} variant="primary">
                Retry
              </Button>
              <Button onClick={onBack} variant="secondary">
                <ArrowLeft aria-hidden="true" />
                Back
              </Button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const status = publishedForm?.status ?? draftForm?.status ?? "draft";
  const compactBuilderMode = stage === "builder" && Boolean(draftForm);

  return (
    <section className={cn("space-y-3", compactBuilderMode && "space-y-1.5")}>
      <div
        className={cn(
          "rounded-xl border bg-panel p-3 shadow-line",
          compactBuilderMode && "rounded-lg px-2 py-1.5",
        )}
      >
        <div
          className={cn(
            "flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between",
            compactBuilderMode && "gap-2 xl:items-center",
          )}
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="collect">FORMS</Badge>
              {compactBuilderMode ? (
                <span className="text-sm font-semibold">Create Form</span>
              ) : null}
              <Badge tone={statusTone(status)}>{status}</Badge>
              <span className="text-xs text-muted-foreground">
                Autosave: Saved
              </span>
            </div>
            <div
              className={cn(
                "flex flex-wrap items-center gap-2",
                compactBuilderMode ? "sr-only" : "mt-3",
              )}
            >
              <h1
                className={cn(
                  "font-semibold tracking-tight",
                  compactBuilderMode ? "text-base" : "text-2xl",
                )}
              >
                Create Form
              </h1>
              {!compactBuilderMode ? (
                <HelpHint label="About create form" title="Create Form">
                  Create the draft shell first, then build questions, configure
                  controls, test the form, review readiness, and publish a
                  governed version for field operations.
                </HelpHint>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={onBack}
              size={compactBuilderMode ? "sm" : undefined}
              variant="secondary"
            >
              <ArrowLeft aria-hidden="true" />
              Back to forms
            </Button>
            {compactBuilderMode ? (
              <>
                <Button
                  onClick={saveDraftLocally}
                  size="sm"
                  variant="secondary"
                >
                  Save draft
                </Button>
                <Button
                  onClick={() => setStage("setup")}
                  size="sm"
                  variant="ghost"
                >
                  Setup
                </Button>
                <Button
                  onClick={() => setStage("controls")}
                  size="sm"
                  variant="primary"
                >
                  Next: Configure Controls
                </Button>
                <Button
                  onClick={() => setMobilePreviewOpen(true)}
                  size="sm"
                  variant="secondary"
                >
                  <MonitorSmartphone aria-hidden="true" />
                  Preview
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </div>

      <section className="rounded-xl border bg-panel p-3 shadow-line">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold">Form lifecycle</h2>
              <Badge tone={publishedForm ? "success" : readinessTone}>
                {publishedForm
                  ? "Published"
                  : controlsDraft.lifecycleStatus === "approved"
                    ? "Approved"
                    : readinessLabel}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Build questions first, then configure controls, test, review,
              approve, and publish. Publishing is only available at the final
              review gate.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {stage === "setup" ? (
              <Button
                disabled={!setup.formName.trim()}
                onClick={() => setStage("start")}
                size="sm"
                variant="primary"
              >
                Next: Choose Start Method
              </Button>
            ) : null}
            {stage === "start" ? (
              <Button
                disabled={
                  importBusy ||
                  (startMethod === "duplicate" && !selectedDuplicateFormId) ||
                  (startMethod === "template" && !selectedTemplateId)
                }
                onClick={() => void createDraftAndOpenBuilder()}
                size="sm"
                variant="primary"
              >
                Next: Open Builder
              </Button>
            ) : null}
            {stage === "builder" ? (
              <Button onClick={() => setStage("controls")} size="sm" variant="primary">
                Next: Configure Controls
              </Button>
            ) : null}
            {stage === "controls" ? (
              <Button onClick={() => setStage("preview")} size="sm" variant="primary">
                Next: Preview & Test
              </Button>
            ) : null}
            {stage === "preview" ? (
              <Button
                onClick={() => {
                  updateControlsDraft({
                    lifecycleStatus: "review",
                    reviewComments:
                      controlsDraft.reviewComments ||
                      "Submitted for technical and M&E review.",
                  });
                  setStage("review");
                }}
                size="sm"
                variant="primary"
              >
                Submit for Review
              </Button>
            ) : null}
            {stage === "review" && controlsDraft.lifecycleStatus !== "approved" ? (
              <Button onClick={approveForPublish} size="sm" variant="primary">
                Approve Form
              </Button>
            ) : null}
            {stage === "review" && controlsDraft.lifecycleStatus === "approved" ? (
              <Button
                disabled={!draftForm || criticalFailures.length > 0 || publishing}
                onClick={publishDraft}
                size="sm"
                variant="primary"
              >
                <Rocket aria-hidden="true" />
                {publishing ? "Publishing" : "Publish Form"}
              </Button>
            ) : null}
          </div>
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-7">
          {lifecycleSteps.map((step, index) => {
            const isActive = step.id === activeLifecycleId;
            const isComplete = lifecycleCompletion[step.id];
            const isFuture = index > activeLifecycleIndex && !isComplete;
            return (
              <button
                className={cn(
                  "rounded-lg border px-2.5 py-2 text-left transition",
                  isActive
                    ? "border-primary bg-primary text-primary-foreground"
                    : isComplete
                      ? "border-success/30 bg-success/10 text-foreground"
                      : "bg-background/60 hover:bg-muted/60",
                  isFuture && "text-muted-foreground",
                )}
                disabled={step.id !== "setup" && !draftForm}
                key={step.id}
                onClick={() => openLifecycleStep(step.id)}
                type="button"
              >
                <span className="flex items-center gap-1.5 text-xs font-semibold">
                  {isComplete ? (
                    <CheckCircle2 aria-hidden="true" size={13} />
                  ) : isActive ? (
                    <Play aria-hidden="true" size={13} />
                  ) : (
                    <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full border text-[9px]">
                      {index + 1}
                    </span>
                  )}
                  {step.label}
                </span>
                <span
                  className={cn(
                    "mt-1 block truncate text-[11px]",
                    isActive
                      ? "text-primary-foreground/75"
                      : "text-muted-foreground",
                  )}
                >
                  {step.helper}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {stage === "setup" ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(320px,0.55fr)]">
          <section className="rounded-xl border bg-panel p-3.5 shadow-line">
            <div>
              <Badge tone="accent">Step 1</Badge>
              <h2 className="mt-3 text-lg font-semibold">Basic Information</h2>
            </div>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <label className="text-sm">
                <span className="mb-1 block font-medium">Form Name</span>
                <Input
                  onChange={(event) =>
                    updateSetup({ formName: event.target.value })
                  }
                  placeholder="Baseline household survey"
                  value={setup.formName}
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-medium">Project</span>
                <Select
                  onChange={(event) =>
                    updateSetup({ projectName: event.target.value })
                  }
                  value={setup.projectName}
                >
                  <option value="">Choose project when ready to publish</option>
                  {!availableProjectOptions.length ? (
                    <option value="">Create or select a project first</option>
                  ) : null}
                  {availableProjectOptions.map((project) => (
                    <option key={project} value={project}>
                      {project}
                    </option>
                  ))}
                </Select>
                {!preview && !projectsQuery.isLoading && !availableProjectOptions.length ? (
                  <span className="mt-1 block text-xs text-danger">
                    Create a project before publishing this data collection form.
                  </span>
                ) : null}
                {availableProjectOptions.length ? (
                  <span className="mt-1 block text-xs text-muted-foreground">
                    You can save the draft now. Publishing requires an existing project.
                  </span>
                ) : null}
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-medium">Form Type</span>
                <Select
                  onChange={(event) =>
                    updateSetup({ formType: event.target.value })
                  }
                  value={setup.formType}
                >
                  {formTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-medium">Primary Language</span>
                <Input
                  onChange={(event) =>
                    updateSetup({ language: event.target.value })
                  }
                  value={setup.language}
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-medium">Owner</span>
                <Input
                  onChange={(event) =>
                    updateSetup({ owner: event.target.value })
                  }
                  value={setup.owner}
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-medium">
                  Estimated Duration (minutes)
                </span>
                <Input
                  min={1}
                  onChange={(event) =>
                    updateSetup({
                      durationMinutes: Number(event.target.value) || 1,
                    })
                  }
                  type="number"
                  value={setup.durationMinutes}
                />
              </label>
              <label className="text-sm md:col-span-2">
                <span className="mb-1 block font-medium">Description</span>
                <Textarea
                  onChange={(event) =>
                    updateSetup({ description: event.target.value })
                  }
                  placeholder="What this form collects, who uses it, and what decisions the data supports."
                  value={setup.description}
                />
              </label>
            </div>
            <div className="mt-5">
              <p className="text-sm font-medium">Data Collection Method</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {(
                  [
                    ["web", MonitorSmartphone, "Web"],
                    ["mobile", Smartphone, "Mobile"],
                    ["web_mobile", TabletSmartphone, "Web and Mobile"],
                  ] satisfies [CollectionMethod, LucideIcon, string][]
                ).map(([method, Icon, label]) => (
                  <button
                    className={cn(
                      "rounded-xl border bg-background/60 p-3 text-left transition hover:border-primary/40",
                      setup.collectionMethod === method &&
                        "border-primary/50 bg-primary/10",
                    )}
                    key={method}
                    onClick={() => updateSetup({ collectionMethod: method })}
                    type="button"
                  >
                    <Icon
                      aria-hidden="true"
                      className="text-primary"
                      size={17}
                    />
                    <span className="mt-2 block text-sm font-semibold">
                      {label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <Button
                disabled={!setup.formName.trim()}
                onClick={() => setStage("start")}
                variant="primary"
              >
                Continue
              </Button>
            </div>
            {publishMessage ? (
              <div className="mt-3 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-muted-foreground">
                {publishMessage}
              </div>
            ) : null}
          </section>
          <aside className="rounded-xl border bg-panel p-3.5 shadow-line">
            <h3 className="font-semibold">Draft shell will contain</h3>
            <div className="mt-4 space-y-3">
              <Signal label="Initial Status" value="Draft" />
              <Signal label="Owner" value={setup.owner} />
              <Signal label="Language" value={setup.language} />
              <Signal
                label="Collection Method"
                value={setup.collectionMethod.replace("_", " + ")}
              />
            </div>
          </aside>
        </div>
      ) : null}

      {stage === "start" ? (
        <section className="rounded-xl border bg-panel p-3.5 shadow-line">
          <Badge tone="accent">Step 2</Badge>
          <h2 className="mt-3 text-lg font-semibold">Start Method</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {startMethods.map((method) => {
              const Icon = method.icon;
              return (
                <button
                  className={cn(
                    "rounded-2xl border bg-background/60 p-4 text-left transition hover:border-primary/40",
                    startMethod === method.id &&
                      "border-primary/50 bg-primary/10",
                  )}
                  key={method.id}
                  onClick={() => setStartMethod(method.id)}
                  type="button"
                >
                  <Icon aria-hidden="true" className="text-primary" size={20} />
                  <span className="mt-3 flex items-center gap-2 font-semibold">
                    {method.label}
                    <HelpHint
                      label={`About ${method.label}`}
                      title={method.label}
                    >
                      {method.description}
                    </HelpHint>
                  </span>
                </button>
              );
            })}
          </div>
          {startMethod === "template" ? (
            <div className="mt-4 rounded-xl border bg-background/70 p-4">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold">Choose a template</h3>
                <HelpHint label="About form templates" title="Choose a template">
                  Templates create a real editable draft with recommended
                  questions, response types, required fields, GPS, and evidence
                  prompts. You can change every question before publishing.
                </HelpHint>
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {starterTemplates.map((template) => (
                  <button
                    className={cn(
                      "rounded-lg border bg-panel p-3 text-left transition hover:border-primary/40",
                      selectedTemplateId === template.id &&
                        "border-primary/50 bg-primary/10",
                    )}
                    key={template.id}
                    onClick={() => {
                      setSelectedTemplateId(template.id);
                      updateSetup({
                        formType: template.formType,
                        formName:
                          setup.formName.trim() || `${template.name} Form`,
                      });
                    }}
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold">{template.name}</p>
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {template.description}
                        </p>
                      </div>
                      <Badge tone="neutral">
                        {template.fields.length} fields
                      </Badge>
                    </div>
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      {template.formType}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          {startMethod === "duplicate" ? (
            <div className="mt-4 rounded-xl border bg-background/70 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold">
                      Choose an existing form
                    </h3>
                    <HelpHint
                      label="About duplicate existing form"
                      title="Choose an existing form"
                    >
                      Atlas copies the selected form into a new draft. Published
                      source forms remain unchanged and existing submissions
                      stay linked to their original version.
                    </HelpHint>
                  </div>
                  <Select
                    className="mt-3"
                    disabled={!existingForms.length}
                    onChange={(event) =>
                      setSelectedDuplicateFormId(event.target.value)
                    }
                    value={selectedDuplicateFormId}
                  >
                    {!existingForms.length ? (
                      <option value="">No existing forms available</option>
                    ) : null}
                    {existingForms.map((form) => (
                      <option key={form.id} value={form.id}>
                        {form.name} · {form.project_name} · v{form.version}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="rounded-lg border bg-panel px-3 py-2 text-xs text-muted-foreground md:w-72">
                  {existingForms.find(
                    (form) => form.id === selectedDuplicateFormId,
                  ) ? (
                    <>
                      <p className="font-semibold text-foreground">
                        {
                          existingForms.find(
                            (form) => form.id === selectedDuplicateFormId,
                          )?.questions
                        }{" "}
                        questions copied
                      </p>
                      <p className="mt-1">
                        The copy opens in the builder as a draft.
                      </p>
                    </>
                  ) : (
                    "Create or import a form first, then return here to duplicate it."
                  )}
                </div>
              </div>
              {importMessage ? (
                <div className="mt-3 rounded-lg border bg-panel px-3 py-2 text-sm text-muted-foreground">
                  {importMessage}
                </div>
              ) : null}
            </div>
          ) : null}
          {startMethod === "import" ? (
            <div className="mt-4 rounded-xl border bg-background/70 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold">
                      Upload spreadsheet to create questions
                    </h3>
                    <HelpHint
                      label="About spreadsheet form creation"
                      title="Upload spreadsheet to create questions"
                    >
                      Use a CSV, TSV, or XLSX file where the first row contains
                      column names. Atlas turns each column into an editable
                      question and infers common response types from sample rows.
                    </HelpHint>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {importFile
                      ? `${importFile.name} selected`
                      : "First row becomes question labels. You can edit every question before publishing."}
                  </p>
                </div>
                <input
                  accept=".csv,.tsv,.txt,.xlsx"
                  className="hidden"
                  onChange={(event) => {
                    setImportFile(event.target.files?.[0] ?? null);
                    setImportMessage("");
                  }}
                  ref={importFileRef}
                  type="file"
                />
                <Button
                  onClick={() => importFileRef.current?.click()}
                  type="button"
                  variant="secondary"
                >
                  <UploadCloud aria-hidden="true" />
                  Choose file
                </Button>
              </div>
              {importMessage ? (
                <div className="mt-3 rounded-lg border bg-panel px-3 py-2 text-sm text-muted-foreground">
                  {importMessage}
                </div>
              ) : null}
            </div>
          ) : null}
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            <Button onClick={() => setStage("setup")} variant="ghost">
              Back
            </Button>
            <Button
              disabled={
                importBusy ||
                (startMethod === "duplicate" && !selectedDuplicateFormId) ||
                (startMethod === "template" && !selectedTemplateId)
              }
              onClick={() => void createDraftAndOpenBuilder()}
              variant="primary"
            >
              <Play aria-hidden="true" />
              {importBusy ? "Reading file" : "Continue to Builder"}
            </Button>
          </div>
        </section>
      ) : null}

      {stage === "builder" && draftForm ? (
        <section className="form-create-builder">
          <style>
            {`
              .form-create-builder [data-builder-global-header],
              .form-create-builder [data-builder-sticky-header],
              .form-create-builder [data-builder-flow],
              .form-create-builder [data-builder-result],
              .form-create-builder [data-builder-mobile-tabs],
              .form-create-builder [data-builder-workspace] {
                display: none !important;
              }

              .form-create-builder [data-builder-grid] {
                grid-template-columns: minmax(0, 1fr) !important;
              }

              .form-create-builder [data-question-first-canvas] {
                border-top: 0 !important;
              }

              @media (min-width: 1280px) {
                .form-create-builder [data-builder-grid] {
                  height: calc(100vh - 132px) !important;
                  min-height: 610px !important;
                }
              }
            `}
          </style>
          <DynamicForms
            compactBuilder
            contextProjectName={setup.projectName}
            initialDraft={draftForm}
            onFormChange={handleBuilderFormChange}
            token={token}
          />
        </section>
      ) : null}

      <Modal
        description="Mobile view opens as a test-only preview. It does not create a real submission."
        onOpenChange={setMobilePreviewOpen}
        open={mobilePreviewOpen}
        title="Mobile form preview"
      >
        <div className="flex justify-center p-5">
          {draftForm ? <MobileFormPreview form={draftForm} /> : null}
        </div>
      </Modal>

      {stage === "controls" ? (
        <section className="space-y-3">
          <StagePanel
            action={
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => {
                    if (draftForm) {
                      handleBuilderFormChange({
                        ...draftForm,
                        history: [
                          ...(draftForm.history ?? []),
                          {
                            createdAt: new Date().toISOString(),
                            status: draftForm.status,
                            summary: `Controls reviewed: ${controlsDraft.permissionPreset} permissions, ${controlsDraft.workflowPreset} workflow, ${controlsDraft.dataQualityMode} data quality.`,
                            version: draftForm.version,
                          },
                        ],
                      });
                    }
                    setPublishMessage("Controls saved for this draft. Continue to preview when ready.");
                  }}
                  variant="secondary"
                >
                  Save controls
                </Button>
                <Button onClick={() => setStage("preview")} variant="primary">
                  Next: Preview & Test
                </Button>
              </div>
            }
            icon={ShieldCheck}
            title="Controls & Governance"
            route="/forms/:formId/governance"
            lines={[
              "Review permissions, workflow, data quality, governance, reference data, and mapping controls before publishing.",
              "These are form-level settings; platform-wide policies remain in Governance and Administration.",
            ]}
          />
          <div className="grid gap-3 md:grid-cols-[220px_minmax(0,1fr)]">
            <section className="rounded-xl border bg-panel p-3.5 shadow-line">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold">Field Readiness</p>
                <Badge tone={readinessTone}>{readinessLabel}</Badge>
              </div>
              <p className="mt-3 text-3xl font-semibold tracking-tight">
                {readinessScore}%
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {criticalFailures.length} failure(s), {readinessWarnings.length} warning(s)
              </p>
            </section>
            <section className="rounded-xl border bg-panel p-3.5 shadow-line">
              <p className="text-sm font-semibold">Publishing rule</p>
              <p className="mt-2 text-sm text-muted-foreground">
                A form can be saved at any time. Publishing requires project
                linkage, beneficiary rules, duplicate controls, review workflow,
                permissions, approved lifecycle status, certification notes,
                version notes, and audit-safe governance settings.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {criticalFailures.slice(0, 5).map((failure) => (
                  <button
                    className="rounded-full border border-danger/25 bg-danger/10 px-2 py-1 text-xs font-medium text-danger"
                    key={failure.id}
                    onClick={() => setStage(failure.jumpTo)}
                    type="button"
                  >
                    Fix {failure.label}
                  </button>
                ))}
                {!criticalFailures.length ? (
                  <Badge tone="success">Required checks are clear</Badge>
                ) : null}
              </div>
            </section>
          </div>
          <section className="rounded-xl border bg-panel p-3.5 shadow-line">
            <div className="flex items-center gap-2">
              <Sparkles aria-hidden="true" className="text-primary" size={18} />
              <h3 className="font-semibold">M&amp;E Instrument Management</h3>
              <HelpHint
                label="About M&E instrument management"
                title="M&E Instrument Management"
              >
                These controls turn a form into a managed monitoring and
                evaluation instrument with purpose, indicators, data dictionary,
                tracking series, sampling, translations, and trigger rules.
              </HelpHint>
            </div>
            <div className="mt-3 rounded-lg border bg-background/70 p-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold">Lifecycle status</p>
                    <Badge
                      tone={
                        controlsDraft.lifecycleStatus === "approved"
                          ? "success"
                          : controlsDraft.lifecycleStatus === "review"
                            ? "warning"
                            : "neutral"
                      }
                    >
                      {controlsDraft.lifecycleStatus.replaceAll("_", " ")}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Move the form through testing, review, and approval before
                    publishing. The question builder remains unchanged.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() =>
                      updateControlsDraft({
                        lifecycleStatus: "testing",
                        reviewComments:
                          controlsDraft.reviewComments ||
                          "Moved to testing for preview, logic, validation, and reference data checks.",
                      })
                    }
                    size="sm"
                    type="button"
                    variant="secondary"
                  >
                    Move to Testing
                  </Button>
                  <Button
                    onClick={() =>
                      updateControlsDraft({
                        lifecycleStatus: "review",
                        reviewComments:
                          controlsDraft.reviewComments ||
                          "Submitted for technical and M&E review.",
                      })
                    }
                    size="sm"
                    type="button"
                    variant="secondary"
                  >
                    Submit for Review
                  </Button>
                  <Button
                    onClick={() =>
                      updateControlsDraft({
                        approvalDate:
                          controlsDraft.approvalDate ||
                          new Date().toISOString().slice(0, 10),
                        approvalNotes:
                          controlsDraft.approvalNotes ||
                          "Reviewed and approved for publishing.",
                        lifecycleStatus: "approved",
                      })
                    }
                    size="sm"
                    type="button"
                    variant="primary"
                  >
                    Approve for Publish
                  </Button>
                </div>
              </div>
            </div>
            <div className="mt-3 grid gap-3 xl:grid-cols-2">
              <details className="rounded-lg border bg-background/70 p-3" open>
                <summary className="cursor-pointer text-sm font-semibold">
                  Purpose and results context
                </summary>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="text-sm font-medium">
                    Form objective
                    <Textarea
                      className="mt-2"
                      onChange={(event) =>
                        updateControlsDraft({ formObjective: event.target.value })
                      }
                      value={controlsDraft.formObjective}
                    />
                  </label>
                  <label className="text-sm font-medium">
                    Business purpose
                    <Textarea
                      className="mt-2"
                      onChange={(event) =>
                        updateControlsDraft({ businessPurpose: event.target.value })
                      }
                      value={controlsDraft.businessPurpose}
                    />
                  </label>
                  <label className="text-sm font-medium">
                    Program objective
                    <Input
                      className="mt-2"
                      onChange={(event) =>
                        updateControlsDraft({ programObjective: event.target.value })
                      }
                      placeholder="Improve farmer productivity"
                      value={controlsDraft.programObjective}
                    />
                  </label>
                  <label className="text-sm font-medium">
                    Result area
                    <Input
                      className="mt-2"
                      onChange={(event) =>
                        updateControlsDraft({ resultArea: event.target.value })
                      }
                      placeholder="Agricultural Productivity"
                      value={controlsDraft.resultArea}
                    />
                  </label>
                  <label className="text-sm font-medium">
                    Linked outcome
                    <Input
                      className="mt-2"
                      onChange={(event) =>
                        updateControlsDraft({ linkedOutcome: event.target.value })
                      }
                      placeholder="Increased farm productivity"
                      value={controlsDraft.linkedOutcome}
                    />
                  </label>
                  <label className="text-sm font-medium">
                    Linked output
                    <Input
                      className="mt-2"
                      onChange={(event) =>
                        updateControlsDraft({ linkedOutput: event.target.value })
                      }
                      placeholder="Farmers trained and monitored"
                      value={controlsDraft.linkedOutput}
                    />
                  </label>
                  <label className="text-sm font-medium sm:col-span-2">
                    Expected use
                    <Textarea
                      className="mt-2"
                      onChange={(event) =>
                        updateControlsDraft({ expectedUse: event.target.value })
                      }
                      value={controlsDraft.expectedUse}
                    />
                  </label>
                </div>
              </details>

              <details className="rounded-lg border bg-background/70 p-3" open>
                <summary className="cursor-pointer text-sm font-semibold">
                  Indicators and data dictionary
                </summary>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="text-sm font-medium">
                    Linked indicator
                    <Input
                      className="mt-2"
                      onChange={(event) =>
                        updateControlsDraft({ indicatorLink: event.target.value })
                      }
                      placeholder="% farmers using improved seeds"
                      value={controlsDraft.indicatorLink}
                    />
                  </label>
                  <label className="text-sm font-medium">
                    Indicator component
                    <Select
                      className="mt-2"
                      onChange={(event) =>
                        updateControlsDraft({
                          indicatorComponent:
                            event.target.value as FormControlsDraft["indicatorComponent"],
                        })
                      }
                      value={controlsDraft.indicatorComponent}
                    >
                      <option value="none">Not mapped yet</option>
                      <option value="numerator">Numerator</option>
                      <option value="denominator">Denominator</option>
                      <option value="disaggregation">Disaggregation</option>
                      <option value="evidence">Supporting evidence</option>
                    </Select>
                  </label>
                  <div className="sm:col-span-2 rounded-lg border bg-panel p-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold">Dictionary preview</p>
                      <Badge tone="neutral">
                        {questionMappingOptions.length} question(s)
                      </Badge>
                    </div>
                    <div className="mt-2 max-h-40 overflow-auto text-xs">
                      {questionMappingOptions.length ? (
                        questionMappingOptions.slice(0, 8).map((question) => (
                          <div
                            className="grid grid-cols-[minmax(0,1fr)_140px] gap-2 border-t py-1 first:border-t-0"
                            key={question.id}
                          >
                            <span className="truncate">{question.label}</span>
                            <code className="truncate text-muted-foreground">
                              {question.variableName}
                            </code>
                          </div>
                        ))
                      ) : (
                        <p className="py-3 text-center text-muted-foreground">
                          Add questions to generate the data dictionary.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </details>

              <details className="rounded-lg border bg-background/70 p-3">
                <summary className="cursor-pointer text-sm font-semibold">
                  Tracking, events, waves, and seasons
                </summary>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="text-sm font-medium">
                    Tracking series
                    <Input
                      className="mt-2"
                      onChange={(event) =>
                        updateControlsDraft({ trackingSeries: event.target.value })
                      }
                      placeholder="Farmer Performance Series"
                      value={controlsDraft.trackingSeries}
                    />
                  </label>
                  <label className="text-sm font-medium">
                    Event mode
                    <Select
                      className="mt-2"
                      onChange={(event) =>
                        updateControlsDraft({
                          eventMode: event.target.value as FormControlsDraft["eventMode"],
                        })
                      }
                      value={controlsDraft.eventMode}
                    >
                      <option value="none">Beneficiary form</option>
                      <option value="creates_event">Creates event</option>
                      <option value="selects_event">Selects event</option>
                      <option value="attendance">Attendance tracking</option>
                    </Select>
                  </label>
                  <label className="text-sm font-medium">
                    Parent form
                    <Input
                      className="mt-2"
                      onChange={(event) =>
                        updateControlsDraft({ parentForm: event.target.value })
                      }
                      placeholder="Registration"
                      value={controlsDraft.parentForm}
                    />
                  </label>
                  <label className="text-sm font-medium">
                    Related forms
                    <Input
                      className="mt-2"
                      onChange={(event) =>
                        updateControlsDraft({ relatedForms: event.target.value })
                      }
                      placeholder="Baseline, Monitoring, Endline"
                      value={controlsDraft.relatedForms}
                    />
                  </label>
                  <label className="text-sm font-medium">
                    Survey wave
                    <Input
                      className="mt-2"
                      onChange={(event) =>
                        updateControlsDraft({ waveLabel: event.target.value })
                      }
                      placeholder="Wave 1"
                      value={controlsDraft.waveLabel}
                    />
                  </label>
                  <label className="text-sm font-medium">
                    Season
                    <Input
                      className="mt-2"
                      onChange={(event) =>
                        updateControlsDraft({ seasonName: event.target.value })
                      }
                      placeholder="Wet season"
                      value={controlsDraft.seasonName}
                    />
                  </label>
                  <label className="text-sm font-medium">
                    Season start
                    <Input
                      className="mt-2"
                      onChange={(event) =>
                        updateControlsDraft({ seasonStart: event.target.value })
                      }
                      type="date"
                      value={controlsDraft.seasonStart}
                    />
                  </label>
                  <label className="text-sm font-medium">
                    Season end
                    <Input
                      className="mt-2"
                      onChange={(event) =>
                        updateControlsDraft({ seasonEnd: event.target.value })
                      }
                      type="date"
                      value={controlsDraft.seasonEnd}
                    />
                  </label>
                </div>
              </details>

              <details className="rounded-lg border bg-background/70 p-3">
                <summary className="cursor-pointer text-sm font-semibold">
                  Sampling, geography, duration, and localization
                </summary>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="text-sm font-medium">
                    Data source type
                    <Select
                      className="mt-2"
                      onChange={(event) =>
                        updateControlsDraft({
                          dataSourceType:
                            event.target.value as FormControlsDraft["dataSourceType"],
                        })
                      }
                      value={controlsDraft.dataSourceType}
                    >
                      <option value="primary">Primary data</option>
                      <option value="secondary">Secondary data</option>
                      <option value="administrative">Administrative data</option>
                      <option value="imported">Imported data</option>
                      <option value="mixed">Mixed source</option>
                    </Select>
                  </label>
                  <label className="text-sm font-medium">
                    Sampling method
                    <Select
                      className="mt-2"
                      onChange={(event) =>
                        updateControlsDraft({
                          samplingMethod:
                            event.target.value as FormControlsDraft["samplingMethod"],
                        })
                      }
                      value={controlsDraft.samplingMethod}
                    >
                      <option value="none">Not a sample survey</option>
                      <option value="random">Random</option>
                      <option value="stratified">Stratified</option>
                      <option value="cluster">Cluster</option>
                      <option value="purposive">Purposive</option>
                      <option value="systematic">Systematic</option>
                    </Select>
                  </label>
                  <label className="text-sm font-medium">
                    Target sample size
                    <Input
                      className="mt-2"
                      min={0}
                      onChange={(event) =>
                        updateControlsDraft({
                          targetSampleSize: Number(event.target.value) || 0,
                        })
                      }
                      type="number"
                      value={controlsDraft.targetSampleSize}
                    />
                  </label>
                  <label className="text-sm font-medium">
                    Max submissions per day
                    <Input
                      className="mt-2"
                      min={1}
                      onChange={(event) =>
                        updateControlsDraft({
                          maximumSubmissionsPerDay:
                            Number(event.target.value) || 1,
                        })
                      }
                      type="number"
                      value={controlsDraft.maximumSubmissionsPerDay}
                    />
                  </label>
                  <label className="text-sm font-medium">
                    Minimum duration minutes
                    <Input
                      className="mt-2"
                      min={1}
                      onChange={(event) =>
                        updateControlsDraft({
                          minimumDurationMinutes:
                            Number(event.target.value) || 1,
                        })
                      }
                      type="number"
                      value={controlsDraft.minimumDurationMinutes}
                    />
                  </label>
                  <label className="text-sm font-medium">
                    Maximum duration minutes
                    <Input
                      className="mt-2"
                      min={1}
                      onChange={(event) =>
                        updateControlsDraft({
                          maximumDurationMinutes:
                            Number(event.target.value) || 1,
                        })
                      }
                      type="number"
                      value={controlsDraft.maximumDurationMinutes}
                    />
                  </label>
                  <label className="text-sm font-medium sm:col-span-2">
                    Geographic scope
                    <Input
                      className="mt-2"
                      onChange={(event) =>
                        updateControlsDraft({ geographicScope: event.target.value })
                      }
                      placeholder="Country, region, district, community, or project boundary"
                      value={controlsDraft.geographicScope}
                    />
                  </label>
                  <label className="text-sm font-medium">
                    Languages
                    <Input
                      className="mt-2"
                      onChange={(event) =>
                        updateControlsDraft({
                          localizationLanguages: event.target.value,
                        })
                      }
                      placeholder="English, French"
                      value={controlsDraft.localizationLanguages}
                    />
                  </label>
                  <label className="text-sm font-medium">
                    Translation status
                    <Select
                      className="mt-2"
                      onChange={(event) =>
                        updateControlsDraft({
                          translationStatus:
                            event.target.value as FormControlsDraft["translationStatus"],
                        })
                      }
                      value={controlsDraft.translationStatus}
                    >
                      <option value="not_started">Not started</option>
                      <option value="in_progress">In progress</option>
                      <option value="ready">Ready</option>
                      <option value="approved">Approved</option>
                    </Select>
                  </label>
                </div>
              </details>

              <details className="rounded-lg border bg-background/70 p-3 xl:col-span-2" open>
                <summary className="cursor-pointer text-sm font-semibold">
                  Certification, triggers, accessibility, and AI-ready metadata
                </summary>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="text-sm font-medium">
                    Technical reviewer
                    <Input
                      className="mt-2"
                      onChange={(event) =>
                        updateControlsDraft({
                          technicalReviewerName: event.target.value,
                        })
                      }
                      value={controlsDraft.technicalReviewerName}
                    />
                  </label>
                  <label className="text-sm font-medium">
                    M&amp;E reviewer
                    <Input
                      className="mt-2"
                      onChange={(event) =>
                        updateControlsDraft({
                          meReviewerName: event.target.value,
                        })
                      }
                      value={controlsDraft.meReviewerName}
                    />
                  </label>
                  <label className="text-sm font-medium">
                    Final approver
                    <Input
                      className="mt-2"
                      onChange={(event) =>
                        updateControlsDraft({
                          finalApproverName: event.target.value,
                        })
                      }
                      value={controlsDraft.finalApproverName}
                    />
                  </label>
                  <label className="text-sm font-medium">
                    Approval date
                    <Input
                      className="mt-2"
                      onChange={(event) =>
                        updateControlsDraft({ approvalDate: event.target.value })
                      }
                      type="date"
                      value={controlsDraft.approvalDate}
                    />
                  </label>
                  <label className="text-sm font-medium">
                    Review comments
                    <Textarea
                      className="mt-2"
                      onChange={(event) =>
                        updateControlsDraft({ reviewComments: event.target.value })
                      }
                      value={controlsDraft.reviewComments}
                    />
                  </label>
                  <label className="text-sm font-medium">
                    Approval notes
                    <Textarea
                      className="mt-2"
                      onChange={(event) =>
                        updateControlsDraft({ approvalNotes: event.target.value })
                      }
                      value={controlsDraft.approvalNotes}
                    />
                  </label>
                  <label className="text-sm font-medium">
                    Auto-assignment rule
                    <Textarea
                      className="mt-2"
                      onChange={(event) =>
                        updateControlsDraft({
                          autoAssignmentRule: event.target.value,
                        })
                      }
                      value={controlsDraft.autoAssignmentRule}
                    />
                  </label>
                  <label className="text-sm font-medium">
                    Trigger rule
                    <Textarea
                      className="mt-2"
                      onChange={(event) =>
                        updateControlsDraft({ triggerRule: event.target.value })
                      }
                      value={controlsDraft.triggerRule}
                    />
                  </label>
                  <label className="text-sm font-medium">
                    Accessibility mode
                    <Select
                      className="mt-2"
                      onChange={(event) =>
                        updateControlsDraft({
                          accessibilityMode:
                            event.target.value as FormControlsDraft["accessibilityMode"],
                        })
                      }
                      value={controlsDraft.accessibilityMode}
                    >
                      <option value="standard">Standard</option>
                      <option value="large_text">Large text ready</option>
                      <option value="high_contrast">High contrast ready</option>
                    </Select>
                  </label>
                  <div className="rounded-lg border bg-panel p-3 text-xs text-muted-foreground">
                    AI-ready metadata stores clean labels, variable names,
                    indicators, dictionary definitions, dependencies, and
                    translation status. No AI generation is run now.
                  </div>
                </div>
              </details>
            </div>
          </section>
          <div className="grid gap-3 lg:grid-cols-2">
            <section className="rounded-xl border bg-panel p-3.5 shadow-line">
              <div className="flex items-center gap-2">
                <ShieldCheck aria-hidden="true" className="text-primary" size={18} />
                <h3 className="font-semibold">Permissions</h3>
                <HelpHint label="About permissions" title="Permissions">
                  Decide who can collect, review, approve, edit, publish, and
                  export this form&apos;s data.
                </HelpHint>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-medium">
                  Access preset
                  <Select
                    className="mt-2"
                    onChange={(event) =>
                      updateControlsDraft({
                        permissionPreset: event.target.value as FormControlsDraft["permissionPreset"],
                      })
                    }
                    value={controlsDraft.permissionPreset}
                  >
                    <option value="standard">Standard project roles</option>
                    <option value="restricted">Restricted reviewers only</option>
                    <option value="open">Open to assigned project team</option>
                  </Select>
                </label>
                <label className="flex items-center gap-2 text-sm font-medium sm:mt-7">
                  <input
                    checked={controlsDraft.exportRestricted}
                    onChange={(event) =>
                      updateControlsDraft({ exportRestricted: event.target.checked })
                    }
                    type="checkbox"
                  />
                  Require export permission
                </label>
                <label className="text-sm font-medium sm:col-span-2">
                  Field collection access
                  <Select
                    className="mt-2"
                    onChange={(event) =>
                      updateControlsDraft({
                        assignmentMode: event.target.value as FormControlsDraft["assignmentMode"],
                      })
                    }
                    value={controlsDraft.assignmentMode}
                  >
                    <option value="assigned_only">Assigned users only</option>
                    <option value="project_team">Project team can collect</option>
                    <option value="open_link">Open link for controlled web entry</option>
                  </Select>
                </label>
              </div>
            </section>

            <section className="rounded-xl border bg-panel p-3.5 shadow-line">
              <div className="flex items-center gap-2">
                <Workflow aria-hidden="true" className="text-primary" size={18} />
                <h3 className="font-semibold">Workflow</h3>
                <HelpHint label="About workflow" title="Workflow">
                  Field submissions should arrive for review. Reviewers decide
                  whether to approve, return, reject, or escalate records.
                </HelpHint>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-medium">
                  Review workflow
                  <Select
                    className="mt-2"
                    onChange={(event) =>
                      updateControlsDraft({
                        workflowPreset: event.target.value as FormControlsDraft["workflowPreset"],
                      })
                    }
                    value={controlsDraft.workflowPreset}
                  >
                    <option value="supervisor_review">Supervisor review</option>
                    <option value="data_manager_review">Data manager review</option>
                    <option value="two_step_review">Supervisor + data manager</option>
                  </Select>
                </label>
                <label className="flex items-center gap-2 text-sm font-medium sm:mt-7">
                  <input
                    checked={controlsDraft.lockApprovedRecords}
                    onChange={(event) =>
                      updateControlsDraft({ lockApprovedRecords: event.target.checked })
                    }
                    type="checkbox"
                  />
                  Lock approved records
                </label>
                <label className="text-sm font-medium">
                  Primary reviewer
                  <Select
                    className="mt-2"
                    onChange={(event) =>
                      updateControlsDraft({
                        reviewer: event.target.value as FormControlsDraft["reviewer"],
                      })
                    }
                    value={controlsDraft.reviewer}
                  >
                    <option value="supervisor">Supervisor</option>
                    <option value="data_manager">Data Manager</option>
                    <option value="me_manager">M&amp;E Manager</option>
                  </Select>
                </label>
                <label className="text-sm font-medium">
                  Final approver
                  <Select
                    className="mt-2"
                    onChange={(event) =>
                      updateControlsDraft({
                        reviewApprover: event.target.value as FormControlsDraft["reviewApprover"],
                      })
                    }
                    value={controlsDraft.reviewApprover}
                  >
                    <option value="me_manager">M&amp;E Manager</option>
                    <option value="data_manager">Data Manager</option>
                    <option value="supervisor">Supervisor</option>
                  </Select>
                </label>
                <label className="text-sm font-medium sm:col-span-2">
                  Can return for correction
                  <Select
                    className="mt-2"
                    onChange={(event) =>
                      updateControlsDraft({
                        reviewReturner: event.target.value as FormControlsDraft["reviewReturner"],
                      })
                    }
                    value={controlsDraft.reviewReturner}
                  >
                    <option value="supervisor">Supervisor</option>
                    <option value="data_manager">Data Manager</option>
                    <option value="me_manager">M&amp;E Manager</option>
                  </Select>
                </label>
              </div>
            </section>

            <section className="rounded-xl border bg-panel p-3.5 shadow-line">
              <div className="flex items-center gap-2">
                <ClipboardCheck aria-hidden="true" className="text-primary" size={18} />
                <h3 className="font-semibold">Data Quality</h3>
                <HelpHint label="About data quality" title="Data Quality">
                  Choose whether validation failures block collection, warn
                  collectors, or route records for reviewer decision.
                </HelpHint>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-medium">
                  Validation mode
                  <Select
                    className="mt-2"
                    onChange={(event) =>
                      updateControlsDraft({
                        dataQualityMode: event.target.value as FormControlsDraft["dataQualityMode"],
                      })
                    }
                    value={controlsDraft.dataQualityMode}
                  >
                    <option value="standard">Standard warnings + review</option>
                    <option value="strict">Strict blocking checks</option>
                    <option value="advisory">Advisory warnings only</option>
                  </Select>
                </label>
                <label className="text-sm font-medium">
                  Duplicate action
                  <Select
                    className="mt-2"
                    onChange={(event) =>
                      updateControlsDraft({
                        duplicateAction: event.target.value as FormControlsDraft["duplicateAction"],
                      })
                    }
                    value={controlsDraft.duplicateAction}
                  >
                    <option value="block">Block likely duplicates</option>
                    <option value="warn">Warn collector</option>
                    <option value="review">Send to review</option>
                  </Select>
                </label>
                <label className="text-sm font-medium">
                  Duplicate threshold
                  <Input
                    className="mt-2"
                    max={100}
                    min={50}
                    onChange={(event) =>
                      updateControlsDraft({
                        duplicateThreshold: Number(event.target.value) || 50,
                      })
                    }
                    type="number"
                    value={controlsDraft.duplicateThreshold}
                  />
                </label>
                <label className="text-sm font-medium">
                  Duplicate severity
                  <Select
                    className="mt-2"
                    onChange={(event) =>
                      updateControlsDraft({
                        duplicateSeverity: event.target.value as FormControlsDraft["duplicateSeverity"],
                      })
                    }
                    value={controlsDraft.duplicateSeverity}
                  >
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                    <option value="low">Low</option>
                  </Select>
                </label>
                <label className="text-sm font-medium sm:col-span-2">
                  Duplicate matching fields
                  <Input
                    className="mt-2"
                    onChange={(event) =>
                      updateControlsDraft({
                        duplicateFields: event.target.value
                          .split(",")
                          .map((value) => value.trim())
                          .filter(Boolean),
                      })
                    }
                    placeholder="phone_number, national_id, household_id, full_name, village"
                    value={controlsDraft.duplicateFields.join(", ")}
                  />
                </label>
              </div>
            </section>

            <section className="rounded-xl border bg-panel p-3.5 shadow-line">
              <div className="flex items-center gap-2">
                <Fingerprint aria-hidden="true" className="text-primary" size={18} />
                <h3 className="font-semibold">Entity & Duplicate Controls</h3>
                <HelpHint label="About entity controls" title="Entity & Duplicate Controls">
                  Link submissions to a beneficiary, farmer, household,
                  facility, school, or custom entity so records are tracked
                  over time.
                </HelpHint>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    checked={controlsDraft.requiresEntity}
                    onChange={(event) =>
                      updateControlsDraft({ requiresEntity: event.target.checked })
                    }
                    type="checkbox"
                  />
                  Require beneficiary/entity
                </label>
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    checked={controlsDraft.allowAnonymous}
                    onChange={(event) =>
                      updateControlsDraft({ allowAnonymous: event.target.checked })
                    }
                    type="checkbox"
                  />
                  Allow anonymous submission
                </label>
                <label className="text-sm font-medium">
                  Entity type
                  <Select
                    className="mt-2"
                    onChange={(event) =>
                      updateControlsDraft({ entityType: event.target.value })
                    }
                    value={controlsDraft.entityType}
                  >
                    {["Farmer", "Household", "Beneficiary", "Facility", "School", "Group", "Custom Entity"].map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </Select>
                </label>
                <label className="text-sm font-medium sm:col-span-2">
                  Profile update mode
                  <Select
                    className="mt-2"
                    onChange={(event) =>
                      updateControlsDraft({
                        profileUpdateMode: event.target.value as FormControlsDraft["profileUpdateMode"],
                      })
                    }
                    value={controlsDraft.profileUpdateMode}
                  >
                    <option value="with_supervisor_approval">Require supervisor approval</option>
                    <option value="after_submission">Update after approved submission</option>
                    <option value="never">Never update profile from this form</option>
                  </Select>
                </label>
                <label className="text-sm font-medium">
                  Beneficiary search
                  <Select
                    className="mt-2"
                    onChange={(event) =>
                      updateControlsDraft({
                        beneficiarySearch: event.target.value as FormControlsDraft["beneficiarySearch"],
                      })
                    }
                    value={controlsDraft.beneficiarySearch}
                  >
                    <option value="required">Required before collection</option>
                    <option value="optional">Optional</option>
                    <option value="disabled">Disabled for registration</option>
                  </Select>
                </label>
                <label className="text-sm font-medium">
                  Submission frequency
                  <Select
                    className="mt-2"
                    onChange={(event) =>
                      updateControlsDraft({
                        submissionFrequency: event.target.value as FormControlsDraft["submissionFrequency"],
                      })
                    }
                    value={controlsDraft.submissionFrequency}
                  >
                    <option value="once_ever">Once ever</option>
                    <option value="once_per_project">Once per project</option>
                    <option value="once_per_year">Once per year</option>
                    <option value="once_per_season">Once per season</option>
                    <option value="once_per_quarter">Once per quarter</option>
                    <option value="once_per_month">Once per month</option>
                    <option value="once_per_event">Once per event</option>
                    <option value="unlimited">Unlimited</option>
                  </Select>
                </label>
              </div>
            </section>

            <section className="rounded-xl border bg-panel p-3.5 shadow-line">
              <div className="flex items-center gap-2">
                <ListChecks aria-hidden="true" className="text-primary" size={18} />
                <h3 className="font-semibold">Beneficiary Profile Mapping</h3>
                <HelpHint label="About profile mapping" title="Beneficiary Profile Mapping">
                  Tell Atlas which question controls each beneficiary profile
                  field. Approved submissions can then create update proposals
                  without silently overwriting the registry.
                </HelpHint>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {(
                  [
                    ["fullName", "Full name"],
                    ["phone", "Phone"],
                    ["village", "Village"],
                    ["gps", "GPS"],
                    ["gender", "Gender"],
                    ["dob", "Date of birth"],
                  ] satisfies [keyof FormControlsDraft["profileMappings"], string][]
                ).map(([fieldKey, label]) => (
                  <label className="text-sm font-medium" key={fieldKey}>
                    {label}
                    <Select
                      className="mt-2"
                      onChange={(event) =>
                        updateControlsDraft({
                          profileMappings: {
                            ...controlsDraft.profileMappings,
                            [fieldKey]: event.target.value,
                          },
                        })
                      }
                      value={controlsDraft.profileMappings[fieldKey]}
                    >
                      <option value="">Not mapped yet</option>
                      {questionMappingOptions.map((question) => (
                        <option key={question.id} value={question.variableName}>
                          {question.label}
                        </option>
                      ))}
                    </Select>
                  </label>
                ))}
              </div>
            </section>

            <section className="rounded-xl border bg-panel p-3.5 shadow-line">
              <div className="flex items-center gap-2">
                <MonitorSmartphone aria-hidden="true" className="text-primary" size={18} />
                <h3 className="font-semibold">Mapping Settings</h3>
                <HelpHint label="About mapping settings" title="Mapping Settings">
                  Configure GPS evidence for this form. Full GIS visualization
                  remains in Mapping.
                </HelpHint>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    checked={controlsDraft.requiresGps}
                    onChange={(event) =>
                      updateControlsDraft({ requiresGps: event.target.checked })
                    }
                    type="checkbox"
                  />
                  Require GPS evidence
                </label>
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    checked={controlsDraft.coordinateMasking}
                    onChange={(event) =>
                      updateControlsDraft({ coordinateMasking: event.target.checked })
                    }
                    type="checkbox"
                  />
                  Mask coordinates for exports
                </label>
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    checked={controlsDraft.boundaryValidation}
                    onChange={(event) =>
                      updateControlsDraft({ boundaryValidation: event.target.checked })
                    }
                    type="checkbox"
                  />
                  Validate against project boundary
                </label>
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    checked={controlsDraft.allowManualCoordinates}
                    onChange={(event) =>
                      updateControlsDraft({ allowManualCoordinates: event.target.checked })
                    }
                    type="checkbox"
                  />
                  Allow manual coordinates
                </label>
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    checked={controlsDraft.duplicateGpsDetection}
                    onChange={(event) =>
                      updateControlsDraft({ duplicateGpsDetection: event.target.checked })
                    }
                    type="checkbox"
                  />
                  Detect repeated GPS points
                </label>
                <label className="text-sm font-medium sm:col-span-2">
                  Minimum GPS accuracy in meters
                  <Input
                    className="mt-2"
                    min={1}
                    onChange={(event) =>
                      updateControlsDraft({
                        gpsAccuracy: Number(event.target.value) || 1,
                      })
                    }
                    type="number"
                    value={controlsDraft.gpsAccuracy}
                  />
                </label>
              </div>
            </section>

            <section className="rounded-xl border bg-panel p-3.5 shadow-line">
              <div className="flex items-center gap-2">
                <ClipboardList aria-hidden="true" className="text-primary" size={18} />
                <h3 className="font-semibold">Consent & Media</h3>
                <HelpHint label="About consent and media" title="Consent & Media">
                  Configure consent evidence, attachment requirements, file
                  limits, and whether missing consent blocks submission.
                </HelpHint>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    checked={controlsDraft.requireConsent}
                    onChange={(event) =>
                      updateControlsDraft({ requireConsent: event.target.checked })
                    }
                    type="checkbox"
                  />
                  Require consent
                </label>
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    checked={controlsDraft.blockWithoutConsent}
                    onChange={(event) =>
                      updateControlsDraft({ blockWithoutConsent: event.target.checked })
                    }
                    type="checkbox"
                  />
                  Block missing consent
                </label>
                <label className="text-sm font-medium">
                  Consent type
                  <Select
                    className="mt-2"
                    onChange={(event) =>
                      updateControlsDraft({
                        consentMode: event.target.value as FormControlsDraft["consentMode"],
                      })
                    }
                    value={controlsDraft.consentMode}
                  >
                    <option value="digital">Digital consent</option>
                    <option value="written">Written consent</option>
                    <option value="verbal">Verbal consent</option>
                    <option value="guardian">Guardian consent</option>
                    <option value="not_required">Not required</option>
                  </Select>
                </label>
                <label className="flex items-center gap-2 text-sm font-medium sm:mt-7">
                  <input
                    checked={controlsDraft.storeConsentVersion}
                    onChange={(event) =>
                      updateControlsDraft({ storeConsentVersion: event.target.checked })
                    }
                    type="checkbox"
                  />
                  Store consent version
                </label>
                <label className="text-sm font-medium">
                  Media requirement
                  <Select
                    className="mt-2"
                    onChange={(event) =>
                      updateControlsDraft({
                        mediaRequirement: event.target.value as FormControlsDraft["mediaRequirement"],
                      })
                    }
                    value={controlsDraft.mediaRequirement}
                  >
                    <option value="none">No media required</option>
                    <option value="photo">Photo required</option>
                    <option value="signature">Signature required</option>
                    <option value="photo_signature">Photo and signature</option>
                    <option value="any_attachment">Any attachment</option>
                  </Select>
                </label>
                <label className="text-sm font-medium">
                  Maximum file size MB
                  <Input
                    className="mt-2"
                    min={1}
                    onChange={(event) =>
                      updateControlsDraft({
                        maxAttachmentSizeMb: Number(event.target.value) || 1,
                      })
                    }
                    type="number"
                    value={controlsDraft.maxAttachmentSizeMb}
                  />
                </label>
                <label className="text-sm font-medium sm:col-span-2">
                  Allowed file types
                  <Input
                    className="mt-2"
                    onChange={(event) =>
                      updateControlsDraft({ fileTypes: event.target.value })
                    }
                    placeholder="jpg, png, pdf, mp4"
                    value={controlsDraft.fileTypes}
                  />
                </label>
              </div>
            </section>

            <section className="rounded-xl border bg-panel p-3.5 shadow-line">
              <div className="flex items-center gap-2">
                <Smartphone aria-hidden="true" className="text-primary" size={18} />
                <h3 className="font-semibold">Offline & Reference Data</h3>
                <HelpHint label="About offline settings" title="Offline & Reference Data">
                  Store mobile-ready rules now so field officers can download
                  reference lists, collect offline, and sync safely.
                </HelpHint>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    checked={controlsDraft.offlineEnabled}
                    onChange={(event) =>
                      updateControlsDraft({ offlineEnabled: event.target.checked })
                    }
                    type="checkbox"
                  />
                  Offline collection enabled
                </label>
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    checked={controlsDraft.referenceDataRequired}
                    onChange={(event) =>
                      updateControlsDraft({ referenceDataRequired: event.target.checked })
                    }
                    type="checkbox"
                  />
                  Require reference data download
                </label>
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    checked={controlsDraft.offlineMediaCapture}
                    onChange={(event) =>
                      updateControlsDraft({ offlineMediaCapture: event.target.checked })
                    }
                    type="checkbox"
                  />
                  Allow offline media capture
                </label>
              </div>
            </section>

            <section className="rounded-xl border bg-panel p-3.5 shadow-line">
              <div className="flex items-center gap-2">
                <Layers3 aria-hidden="true" className="text-primary" size={18} />
                <h3 className="font-semibold">Risk & Versioning</h3>
                <HelpHint label="About risk and versioning" title="Risk & Versioning">
                  Published versions are immutable. Editing a published form
                  creates a governed version with a clear change summary.
                </HelpHint>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-medium">
                  Risk classification
                  <Select
                    className="mt-2"
                    onChange={(event) =>
                      updateControlsDraft({
                        riskClassification: event.target.value as FormControlsDraft["riskClassification"],
                      })
                    }
                    value={controlsDraft.riskClassification}
                  >
                    <option value="low">Low risk</option>
                    <option value="medium">Medium risk</option>
                    <option value="high">High risk</option>
                    <option value="sensitive">Sensitive</option>
                  </Select>
                </label>
                <label className="text-sm font-medium">
                  Version number
                  <Input
                    className="mt-2"
                    onChange={(event) =>
                      updateControlsDraft({ versionNumber: event.target.value })
                    }
                    placeholder="1.0.0"
                    value={controlsDraft.versionNumber}
                  />
                </label>
                <label className="text-sm font-medium sm:col-span-2">
                  Publish change summary
                  <Textarea
                    className="mt-2"
                    onChange={(event) =>
                      updateControlsDraft({ changeSummary: event.target.value })
                    }
                    placeholder="Explain what changed and why this version is ready for field use."
                    value={controlsDraft.changeSummary}
                  />
                </label>
              </div>
            </section>

            <section className="rounded-xl border bg-panel p-3.5 shadow-line">
              <div className="flex items-center gap-2">
                <GitBranch aria-hidden="true" className="text-primary" size={18} />
                <h3 className="font-semibold">Governance & Audit Trail</h3>
                <HelpHint label="About governance and audit" title="Governance & Audit Trail">
                  Control auditability, approved-data locking, and traceability
                  for form changes, submitted rows, exports, and review actions.
                </HelpHint>
              </div>
              <div className="mt-3 space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    checked={controlsDraft.auditTrail}
                    onChange={(event) =>
                      updateControlsDraft({ auditTrail: event.target.checked })
                    }
                    type="checkbox"
                  />
                  Log form and data actions to audit trail
                </label>
                <div className="rounded-lg border bg-background/70 p-3 text-xs text-muted-foreground">
                  Current control summary: {controlsDraft.permissionPreset} permissions,
                  {" "}{controlsDraft.workflowPreset.replaceAll("_", " ")},
                  {" "}{controlsDraft.dataQualityMode} quality mode,
                  {" "}
                  {controlsDraft.requiresEntity
                    ? controlsDraft.entityType
                    : controlsDraft.allowAnonymous
                      ? "anonymous submission allowed"
                      : "entity rule not set"}.
                </div>
              </div>
            </section>
          </div>
          {publishMessage ? (
            <div className="rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm text-muted-foreground">
              {publishMessage}
            </div>
          ) : null}
        </section>
      ) : null}

      {stage === "preview" ? (
        <section className="space-y-3">
          <StagePanel
            action={
              <Button
                onClick={() => {
                  updateControlsDraft({
                    lifecycleStatus: "review",
                    reviewComments:
                      controlsDraft.reviewComments ||
                      "Submitted for technical and M&E review.",
                  });
                  setStage("review");
                }}
                variant="primary"
              >
                Submit for Review
              </Button>
            }
            icon={MonitorSmartphone}
            title="Preview & Test"
            route="/forms/:formId/preview"
            lines={[
              "Test-only previews should validate required fields, skip logic, references, repeat groups, calculations, consent behavior, and GPS placeholders.",
              "Preview submissions are not counted as real submissions.",
            ]}
          />
          <div className="grid gap-4 xl:grid-cols-3">
            {(
              [
                [
                  "Web Preview",
                  MonitorSmartphone,
                  "Desktop staff collection and manager review.",
                ],
                [
                  "Tablet Preview",
                  TabletSmartphone,
                  "Supervisor-friendly operational layout.",
                ],
                [
                  "Mobile Preview",
                  Smartphone,
                  "Enumerator mode for offline collection.",
                ],
              ] satisfies [string, LucideIcon, string][]
            ).map(([title, Icon, description]) => (
              <div
                className="rounded-xl border bg-panel p-3.5 shadow-line"
                key={String(title)}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{title}</h3>
                  <Icon aria-hidden="true" className="text-primary" size={19} />
                </div>
                <div className="mt-4 rounded-xl border bg-background/70 p-4">
                  <p className="text-sm font-semibold">
                    {draftForm?.name ?? setup.formName}
                  </p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    Preview mode
                    <HelpHint label={`About ${title}`} title={title}>
                      {description}
                    </HelpHint>
                  </div>
                  <div className="mt-4 space-y-2">
                    {(draftForm?.fields ?? []).slice(0, 4).map((field) => (
                      <div
                        className="rounded-lg border bg-panel px-3 py-2"
                        key={field.id}
                      >
                        <p className="text-sm font-medium">
                          {field.label}
                          {field.required ? " *" : ""}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {field.type} · {field.variableName}
                        </p>
                      </div>
                    ))}
                    {draftForm?.fields.length ? null : (
                      <div className="rounded-lg border border-dashed bg-muted/30 px-3 py-5 text-center text-sm text-muted-foreground">
                        No questions yet. Return to Builder and add questions.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {stage === "review" ? (
        <section className="space-y-3">
          <StagePanel
            action={
              controlsDraft.lifecycleStatus === "approved" ? (
                <Button
                  disabled={!draftForm || criticalFailures.length > 0 || publishing}
                  onClick={publishDraft}
                  variant="primary"
                >
                  <Rocket aria-hidden="true" />
                  {publishing ? "Publishing" : "Publish Form"}
                </Button>
              ) : (
                <Button onClick={approveForPublish} variant="primary">
                  Approve Form
                </Button>
              )
            }
            icon={ListChecks}
            route="/forms/:formId/review"
            title="Review Before Publish"
            lines={[
              "Publishing is blocked when critical readiness checks fail.",
              "Publishing creates an immutable published version and makes the form available for Field Operations assignments.",
            ]}
          />
          <div className="grid gap-3 md:grid-cols-[220px_minmax(0,1fr)]">
            <section className="rounded-xl border bg-panel p-3.5 shadow-line">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold">Readiness Score</p>
                <Badge tone={readinessTone}>{readinessLabel}</Badge>
              </div>
              <p className="mt-3 text-3xl font-semibold tracking-tight">
                {readinessScore}%
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {readinessPassedCount} of {checklist.length} checks passed.
              </p>
            </section>
            <section className="rounded-xl border bg-panel p-3.5 shadow-line">
              <p className="text-sm font-semibold">Publish decision</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {criticalFailures.length
                  ? "Publishing is blocked until critical failures are resolved. Warnings can be accepted by governance policy, but they remain visible in the audit history."
                  : "Required checks are complete. Review warnings, then publish the governed field-ready version."}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {criticalFailures.map((item) => (
                  <button
                    className="rounded-full border border-danger/25 bg-danger/10 px-2 py-1 text-xs font-medium text-danger"
                    key={item.id}
                    onClick={() => setStage(item.jumpTo)}
                    type="button"
                  >
                    Fix {item.label}
                  </button>
                ))}
                {!criticalFailures.length ? (
                  <Badge tone="success">Ready for publish approval</Badge>
                ) : null}
              </div>
            </section>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {checklist.map((item) => {
              const passed = item.complete;
              const tone = passed
                ? "success"
                : item.required
                  ? "danger"
                  : "warning";
              return (
                <div
                  className="rounded-xl border bg-panel p-3 shadow-line"
                  key={item.id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Badge tone={tone}>
                        {passed
                          ? "Passed"
                          : item.required
                            ? "Failed"
                            : "Warning"}
                      </Badge>
                      <Badge className="ml-2" tone="neutral">
                        {item.category}
                      </Badge>
                      <div className="mt-3 flex items-center gap-2">
                        <h3 className="font-semibold">{item.label}</h3>
                        <HelpHint
                          label={`About ${item.label}`}
                          title={item.label}
                        >
                          {item.description}
                        </HelpHint>
                      </div>
                      {!passed ? (
                        <Button
                          className="mt-3"
                          onClick={() => setStage(item.jumpTo)}
                          size="sm"
                          type="button"
                          variant={item.required ? "primary" : "secondary"}
                        >
                          Open setting
                        </Button>
                      ) : null}
                    </div>
                    {passed ? (
                      <CheckCircle2
                        aria-hidden="true"
                        className="text-success"
                      />
                    ) : (
                      <XCircle aria-hidden="true" className="text-danger" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {publishedForm ? (
            <div className="rounded-2xl border border-success/30 bg-success/10 p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2
                  aria-hidden="true"
                  className="mt-0.5 text-success"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">Published version created</h3>
                    <HelpHint
                      label="About published version"
                      title="Published version created"
                    >
                      {publishedForm.name} is now Published as v
                      {publishedForm.activeVersion}. Field Operations can assign
                      it to collectors.
                    </HelpHint>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}
    </section>
  );
}

function StagePanel({
  action,
  icon: Icon,
  lines,
  route,
  title,
}: {
  action?: ReactNode;
  icon: LucideIcon;
  lines: string[];
  route: string;
  title: string;
}) {
  return (
    <div className="rounded-xl border bg-panel p-3.5 shadow-line">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-primary/10 text-primary">
            <Icon aria-hidden="true" size={18} />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-semibold">{title}</h2>
              <Badge tone="neutral">{route}</Badge>
              <HelpHint label={`About ${title}`} title={title}>
                {lines.join(" ")}
              </HelpHint>
            </div>
          </div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </div>
  );
}

function Signal({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-background/60 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold">{value}</p>
    </div>
  );
}
