"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Archive,
  ArrowDown,
  ArrowUp,
  Braces,
  Calendar,
  Camera,
  Check,
  ClipboardList,
  Command,
  Copy,
  Database,
  Eye,
  EyeOff,
  FileDown,
  FileUp,
  GitBranch,
  GripVertical,
  Grid3X3,
  Hash,
  History,
  Layers3,
  ListFilter,
  MapPin,
  MessageSquareText,
  MonitorSmartphone,
  MousePointer2,
  Palette,
  PanelsTopLeft,
  Plus,
  QrCode,
  Repeat2,
  RotateCcw,
  RotateCw,
  Search,
  Settings2,
  ShieldCheck,
  Sigma,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  Star,
  Table2,
  Trash2,
  Type,
  UploadCloud,
  Variable,
  Workflow,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import {
  addPage,
  addField,
  addSection,
  buildFormReadinessChecklist,
  createDraftVersion,
  createField,
  createPage,
  createSection,
  defaultPages,
  deployFormToMobileApp,
  duplicatePage,
  duplicateField,
  duplicateSection,
  fieldCatalog,
  getCollectionCompatibility,
  isFormReadyForPublish,
  moveFieldToPage,
  moveFieldToSection,
  normalizeForm,
  publishForm,
  removeField,
  reorderPages,
  reorderFields,
  reorderSections,
  toMobileSchema,
  toXlsFormWorkbook,
  updateField,
  type DynamicForm,
  type FieldType,
  type FormField,
  type FormSection,
  type LogicRule,
  type MobileDeployment,
  type FormReadinessItem,
} from "@/lib/forms";
import {
  createForm,
  createPublicCollectionLink,
  exportFormXlsForm,
  getFormCollectionCompatibility,
  listSubmissions,
  listForms,
  listPrograms,
  listSurveys,
  reviewSubmission,
  updateFormControls,
  type DataFormRead,
  type FormControlsSettings,
  type FormWorkflowStage,
  type ProgramRead,
  type SubmissionRead,
  type SurveyRead,
} from "@/lib/api";
import {
  formTemplateCategories,
  formTemplates,
  type FormTemplateCard,
} from "@/lib/mockData";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/stores/workspace";

const fieldTypeIcons: Record<FieldType, typeof Type> = {
  text: Type,
  textarea: MessageSquareText,
  number: Hash,
  decimal: Hash,
  currency: Hash,
  phone: Type,
  email: Type,
  url: Type,
  password: Type,
  select: ListFilter,
  dropdown: ListFilter,
  multiselect: ListFilter,
  radio: ListFilter,
  checkbox: Check,
  ranking: ListFilter,
  likert: SlidersHorizontal,
  matrix_single: Table2,
  matrix_multi: Table2,
  nps: Star,
  rating: Star,
  gps: MapPin,
  geolocation: MapPin,
  map: MapPin,
  geofence: MapPin,
  photo: Camera,
  image: Camera,
  signature: Type,
  barcode: Braces,
  qr: QrCode,
  audio: MonitorSmartphone,
  video: MonitorSmartphone,
  file: FileUp,
  date: Calendar,
  time: Calendar,
  datetime: Calendar,
  hidden: EyeOff,
  calculated: Sigma,
  repeat_group: Repeat2,
  grid: Grid3X3,
};

function templateToForm(template: FormTemplateCard): DynamicForm {
  const pageId = `${template.id}-page-1`;
  const sectionId = `${template.id}-main`;
  const evidenceSectionId = `${template.id}-evidence`;
  const fields: FormField[] = [
    {
      id: `${template.id}-beneficiary`,
      label: "Beneficiary or respondent name",
      type: "text",
      required: true,
      pageId,
      sectionId,
    },
    {
      id: `${template.id}-uid`,
      label: "Unique ID or program code",
      type: "text",
      required: true,
      pageId,
      sectionId,
    },
    {
      id: `${template.id}-community`,
      label: "Community or village",
      type: "text",
      required: true,
      pageId,
      sectionId,
    },
    {
      id: `${template.id}-status`,
      label: `${template.name.replace(" Form", "")} status`,
      type: "select",
      required: true,
      pageId,
      sectionId,
      options: ["New", "In progress", "Needs follow-up", "Complete"],
    },
    {
      id: `${template.id}-notes`,
      label: "Field officer notes",
      type: "textarea",
      required: false,
      pageId,
      sectionId,
    },
    {
      id: `${template.id}-quality`,
      label: "Data quality confidence",
      type: "radio",
      required: true,
      pageId,
      sectionId: evidenceSectionId,
      options: ["High", "Medium", "Low"],
    },
  ];

  if (template.hasGps) {
    fields.push({
      id: `${template.id}-gps`,
      label: "Automatic GPS location",
      type: "gps",
      required: true,
      pageId,
      sectionId: evidenceSectionId,
      validation: { accuracyMax: 25 },
    });
  }

  if (template.hasMedia) {
    fields.push({
      id: `${template.id}-photo`,
      label: "Photo or signature evidence",
      type: "photo",
      required: false,
      pageId,
      sectionId: evidenceSectionId,
      logic: [
        {
          id: `${template.id}-photo-required`,
          kind: "required",
          expression: "${quality} = 'Low'",
          message: "Add proof when confidence is low",
        },
      ],
    });
  }

  if (template.repeatGroups > 0) {
    fields.push({
      id: `${template.id}-repeat`,
      label:
        template.category === "Agriculture"
          ? "Crops or farm plots"
          : "Household members or linked records",
      type: "repeat_group",
      required: false,
      pageId,
      sectionId,
      children: [
        {
          id: `${template.id}-repeat-name`,
          label: "Record name",
          type: "text",
          required: true,
          sectionId,
        },
        {
          id: `${template.id}-repeat-value`,
          label: "Value or count",
          type: "number",
          required: false,
          sectionId,
          validation: { min: 0 },
        },
      ],
    });
  }

  return {
    id: `${template.id}-${Date.now()}`,
    name: template.name,
    status: "draft",
    version: 1,
    activeVersion: 0,
    updatedAt: new Date().toISOString(),
    pages: [
      {
        id: pageId,
        title: "Page 1",
        description: "Primary collection flow for this survey form.",
      },
    ],
    sections: [
      {
        id: sectionId,
        title: "Core questions",
        description: template.description,
        pageId,
      },
      {
        id: evidenceSectionId,
        title: "Evidence and review",
        description: "GPS, proof, quality checks, and supervisor review.",
        pageId,
      },
    ],
    fields,
  };
}

type DynamicFormsProps = {
  initialDraft?: DynamicForm;
  token: string | null;
};

type PreviewMode = "desktop" | "tablet" | "mobile" | "enumerator" | "respondent";
type LeftPanelTab = "structure" | "bank" | "templates" | "logic" | "variables";
type RightPanelTab = "field" | "validation" | "logic" | "calculation" | "appearance" | "advanced";
type BuilderAssistantMode = "question" | "section" | "preview" | "readiness" | "logic";
type BuilderFocusPanel = "build" | "structure" | "preview";
type DistributionChannel = "survey_app" | "web_link" | "public_link" | "xlsform";
type FieldPreset = {
  id: string;
  label: string;
  type: FieldType;
  hint: string;
  required?: boolean;
  options?: string[];
  validation?: FormField["validation"];
};
type SectionTemplate = {
  id: string;
  title: string;
  description: string;
  fields: FieldPreset[];
};

const previewFormProjects: ProgramRead[] = [
  { id: "preview-agriculture", name: "Agricultural Resilience Program", slug: "agricultural-resilience", region: "North West", is_active: true },
  { id: "preview-health", name: "Community Health Outreach", slug: "community-health", region: "Central", is_active: true },
];

const previewFormSurveys: SurveyRead[] = [
  {
    id: "preview-baseline",
    organization_id: "preview-org",
    project_id: "preview-agriculture",
    created_by_user_id: "preview-user",
    owner_user_id: "preview-user",
    manager_user_id: null,
    title: "Baseline Survey",
    code: "AGR-BASE-2026",
    description: "Baseline household and farm data collection.",
    survey_type: "baseline",
    status: "active",
    start_date: "2026-06-01",
    end_date: "2026-06-30",
    geographic_scope: "North West districts",
    target_population: "Smallholder farmers",
    indicator_ids_json: [],
    custom_type_label: null,
    is_active: true,
  },
  {
    id: "preview-registration",
    organization_id: "preview-org",
    project_id: "preview-agriculture",
    created_by_user_id: "preview-user",
    owner_user_id: "preview-user",
    manager_user_id: null,
    title: "Farmer Registration Survey",
    code: "AGR-REG-2026",
    description: "Registration and eligibility data collection.",
    survey_type: "farmer_survey",
    status: "draft",
    start_date: null,
    end_date: null,
    geographic_scope: "Program communities",
    target_population: "Farmers",
    indicator_ids_json: [],
    custom_type_label: null,
    is_active: true,
  },
];

const quickFieldPresets: FieldPreset[] = [
  { id: "person-name", label: "Person name", type: "text", hint: "Full name of respondent or beneficiary.", required: true },
  { id: "phone-number", label: "Phone number", type: "phone", hint: "Primary contact number.", required: true },
  { id: "age", label: "Age", type: "number", hint: "Age in completed years.", validation: { min: 0, max: 120 } },
  { id: "gender", label: "Gender", type: "radio", hint: "Gender identity for demographic reporting.", options: ["Female", "Male", "Prefer not to say"] },
  { id: "yes-no", label: "Yes / No question", type: "radio", hint: "Simple eligibility or confirmation question.", options: ["Yes", "No"] },
  { id: "gps-location", label: "GPS location", type: "gps", hint: "Capture accurate field location.", required: true, validation: { accuracyMax: 25 } },
  { id: "photo-evidence", label: "Photo evidence", type: "image", hint: "Capture or upload proof from the field." },
  { id: "consent-signature", label: "Consent signature", type: "signature", hint: "Respondent consent or acknowledgement." },
];

const sectionTemplates: SectionTemplate[] = [
  {
    id: "respondent-details",
    title: "Respondent details",
    description: "Identity, contact, and demographic questions.",
    fields: [
      quickFieldPresets[0],
      quickFieldPresets[1],
      quickFieldPresets[2],
      quickFieldPresets[3],
    ].filter(Boolean) as FieldPreset[],
  },
  {
    id: "gps-evidence",
    title: "GPS and evidence",
    description: "Location and proof fields for field verification.",
    fields: [
      quickFieldPresets[5],
      quickFieldPresets[6],
      { id: "field-notes", label: "Field notes", type: "textarea", hint: "Important context from the enumerator." },
    ].filter(Boolean) as FieldPreset[],
  },
  {
    id: "household-roster",
    title: "Household roster",
    description: "Repeatable household member collection.",
    fields: [
      { id: "household-size", label: "Household size", type: "number", hint: "Total people living in the household.", validation: { min: 1, max: 50 } },
      { id: "household-members", label: "Household members", type: "repeat_group", hint: "Add each member as a repeat record." },
    ],
  },
  {
    id: "review-quality",
    title: "Supervisor review",
    description: "Quality checks before data approval.",
    fields: [
      { id: "quality-score", label: "Data quality score", type: "rating", hint: "Supervisor quality rating.", validation: { min: 1, max: 5 } },
      { id: "review-status", label: "Review status", type: "dropdown", hint: "Supervisor decision.", options: ["Approved", "Needs correction", "Rejected"] },
      { id: "review-notes", label: "Review notes", type: "textarea", hint: "Explain the review decision." },
    ],
  },
];

const templateCategoryDescriptions: Record<string, string> = {
  Recommended: "Best starting points for common survey and field operation workflows.",
  Agriculture: "Farmer registration, crop monitoring, yield checks, market access, and extension visits.",
  Health: "Facility, outreach, vaccination, household health, and community follow-up forms.",
  Education: "School monitoring, learner attendance, classroom checks, and education program reviews.",
  "NGO Operations": "Program delivery, staff operations, field visits, and partner implementation tracking.",
  "Humanitarian & NGO": "Rapid assessment, response monitoring, distribution, referrals, and protection workflows.",
  "Monitoring & Evaluation": "Baseline, midline, endline, indicator tracking, verification, and evaluation tools.",
  "Government & Community": "Community records, public services, civic outreach, and local administration surveys.",
  "Business & Operations": "Operational inspections, asset checks, customer visits, and service delivery reviews.",
  Surveys: "General-purpose questionnaires for research, feedback, assessments, and interviews.",
  "Registration Workflows": "Beneficiary, household, farmer, group, facility, and participant onboarding.",
  "Case Management": "Complaints, referrals, incident follow-up, corrections, and resolution tracking.",
};

const sectionToneStyles = [
  {
    border: "border-emerald-200/80 dark:border-emerald-900/55",
    header: "bg-emerald-50/80 dark:bg-emerald-950/25",
    rail: "bg-emerald-500",
    icon: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  },
  {
    border: "border-sky-200/80 dark:border-sky-900/55",
    header: "bg-sky-50/80 dark:bg-sky-950/25",
    rail: "bg-sky-500",
    icon: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  },
  {
    border: "border-amber-200/80 dark:border-amber-900/55",
    header: "bg-amber-50/80 dark:bg-amber-950/25",
    rail: "bg-amber-500",
    icon: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  },
  {
    border: "border-violet-200/80 dark:border-violet-900/55",
    header: "bg-violet-50/80 dark:bg-violet-950/25",
    rail: "bg-violet-500",
    icon: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  },
  {
    border: "border-rose-200/80 dark:border-rose-900/55",
    header: "bg-rose-50/80 dark:bg-rose-950/25",
    rail: "bg-rose-500",
    icon: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  },
];

function getSectionTone(index: number) {
  return sectionToneStyles[index % sectionToneStyles.length];
}

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 120) || `form-${Date.now()}`
  );
}

function persistedFormToLocal(form: DataFormRead): DynamicForm {
  const pageId = `${form.id}-page-1`;
  const sectionId = `${form.id}-summary`;
  return {
    id: form.id,
    name: form.name,
    status:
      form.status === "published"
        ? "published"
        : form.status === "archived"
          ? "archived"
          : "draft",
    version: form.current_version,
    activeVersion: form.status === "published" ? form.current_version : 0,
    updatedAt: new Date().toISOString(),
    pages: [
      {
        id: pageId,
        title: "Saved version",
        description: "Published backend structure summarized for review.",
      },
    ],
    sections: [
      {
        id: sectionId,
        title: "Saved form",
        description: form.description ?? "Stored in the backend.",
        pageId,
      },
    ],
    fields: [
      {
        id: `${form.id}-respondent`,
        label: "Respondent name",
        type: "text",
        required: true,
        pageId,
        sectionId,
      },
      {
        id: `${form.id}-location`,
        label: "Collection GPS",
        type: "gps",
        required: true,
        pageId,
        sectionId,
        validation: { accuracyMax: 25 },
      },
      {
        id: `${form.id}-notes`,
        label: "Field notes",
        type: "textarea",
        required: false,
        pageId,
        sectionId,
      },
    ],
  };
}

type FormControlsTab =
  | "overview"
  | "reference"
  | "permissions"
  | "workflow"
  | "quality"
  | "governance"
  | "audit"
  | "versions";

type FormReadinessState = {
  mobilePreviewChecked: boolean;
  pilotTestCompleted: boolean;
  enumeratorBriefingReady: boolean;
  importTemplateReviewed: boolean;
  lastReviewedAt?: string;
};

type FormAssignmentPlan = {
  audience: string;
  team: string;
  supervisor: string;
  locationScope: string;
  targetSubmissions: number;
  dailyTarget: number;
  briefingComplete: boolean;
  pilotEnumerator: string;
  lastUpdatedAt?: string;
};

type FormImportRun = {
  id: string;
  fileName: string;
  rows: number;
  mappedColumns: number;
  validRows: number;
  issueCount: number;
  status: "validated" | "needs_mapping" | "imported";
  createdAt: string;
};

type FormQualityFlag = {
  id: string;
  label: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  affectedRecords: number;
  owner: string;
  status: "open" | "monitoring" | "resolved";
  recommendation: string;
};

type ReviewAction = "approve" | "reject" | "request_correction" | "start_review";

const formControlsTabs = [
  ["overview", ShieldCheck, "Overview"],
  ["reference", Database, "Reference Data"],
  ["permissions", ShieldCheck, "Permissions"],
  ["workflow", Workflow, "Workflow"],
  ["quality", Check, "Data Quality"],
  ["governance", Settings2, "Governance"],
  ["audit", History, "Audit Trail"],
  ["versions", GitBranch, "Versions"],
] satisfies [FormControlsTab, typeof Type, string][];

const defaultReadinessState: FormReadinessState = {
  mobilePreviewChecked: false,
  pilotTestCompleted: false,
  enumeratorBriefingReady: false,
  importTemplateReviewed: false,
};

const defaultAssignmentPlan: FormAssignmentPlan = {
  audience: "All assigned field officers",
  team: "Baseline enumerators",
  supervisor: "Survey supervisor",
  locationScope: "Survey geography",
  targetSubmissions: 250,
  dailyTarget: 25,
  briefingComplete: false,
  pilotEnumerator: "Lead enumerator",
};

const formReviewStatusTone: Record<string, BadgeProps["tone"]> = {
  submitted: "accent",
  under_review: "warning",
  approved: "success",
  rejected: "danger",
  correction_requested: "warning",
  resubmitted: "accent",
};

function getReviewStatusTone(status: string): BadgeProps["tone"] {
  return formReviewStatusTone[status] ?? "neutral";
}

function getImportStatusTone(status: FormImportRun["status"]): BadgeProps["tone"] {
  if (status === "imported") return "success";
  if (status === "validated") return "accent";
  return "warning";
}

function getQualitySeverityTone(severity: FormQualityFlag["severity"]): BadgeProps["tone"] {
  if (severity === "Critical") return "danger";
  if (severity === "High") return "warning";
  if (severity === "Medium") return "accent";
  return "neutral";
}

const workflowPresets: Record<"simple" | "standard" | "correction", FormWorkflowStage[]> = {
  simple: [
    {
      id: "submitted",
      name: "Submitted",
      reviewer_roles: ["me_manager"],
      reviewer_location_scope: "project",
      require_comment_on_reject: true,
      require_comment_on_return: true,
      sla_hours: 24,
    },
    {
      id: "approved",
      name: "Approved",
      reviewer_roles: ["me_manager"],
      reviewer_location_scope: "project",
      require_comment_on_reject: true,
      require_comment_on_return: true,
      sla_hours: 48,
    },
  ],
  standard: [
    {
      id: "submitted",
      name: "Submitted",
      reviewer_roles: ["survey_supervisor"],
      reviewer_location_scope: "assigned_location",
      require_comment_on_reject: true,
      require_comment_on_return: true,
      sla_hours: 24,
    },
    {
      id: "supervisor_review",
      name: "Supervisor Review",
      reviewer_roles: ["survey_supervisor"],
      reviewer_location_scope: "assigned_location",
      require_comment_on_reject: true,
      require_comment_on_return: true,
      sla_hours: 48,
    },
    {
      id: "data_manager_review",
      name: "Data Manager Review",
      reviewer_roles: ["data_manager", "data_quality_officer"],
      reviewer_location_scope: "project",
      require_comment_on_reject: true,
      require_comment_on_return: true,
      sla_hours: 48,
    },
    {
      id: "approved",
      name: "Approved",
      reviewer_roles: ["me_manager"],
      reviewer_location_scope: "project",
      require_comment_on_reject: true,
      require_comment_on_return: true,
      sla_hours: 72,
    },
  ],
  correction: [
    {
      id: "submitted",
      name: "Submitted",
      reviewer_roles: ["survey_supervisor"],
      reviewer_location_scope: "assigned_location",
      require_comment_on_reject: true,
      require_comment_on_return: true,
      sla_hours: 24,
    },
    {
      id: "returned_for_correction",
      name: "Returned for Correction",
      reviewer_roles: ["field_officer", "survey_supervisor"],
      reviewer_location_scope: "assigned_location",
      require_comment_on_reject: true,
      require_comment_on_return: true,
      sla_hours: 24,
    },
    {
      id: "reviewed",
      name: "Reviewed",
      reviewer_roles: ["data_manager"],
      reviewer_location_scope: "project",
      require_comment_on_reject: true,
      require_comment_on_return: true,
      sla_hours: 48,
    },
    {
      id: "approved",
      name: "Approved",
      reviewer_roles: ["me_manager"],
      reviewer_location_scope: "project",
      require_comment_on_reject: true,
      require_comment_on_return: true,
      sla_hours: 72,
    },
  ],
};

function formatReviewStatus(status: string) {
  return status.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function createPreviewSubmissionRows(form: DynamicForm): SubmissionRead[] {
  const now = Date.now();
  const primaryField = form.fields[0];
  const evidenceField = form.fields.find((field) => ["gps", "geolocation", "map", "geofence", "photo", "image", "file"].includes(field.type));
  return [
    {
      id: `${form.id}-review-001`,
      client_submission_id: `${form.id.slice(0, 10)}-0001`,
      project_id: "preview-agriculture",
      survey_id: "preview-baseline",
      form_id: form.id,
      field_officer_id: "officer-001",
      status: "under_review",
      server_sequence: 1,
      captured_at: new Date(now - 3 * 60 * 60 * 1000).toISOString(),
      submitted_at: new Date(now - 75 * 60 * 1000).toISOString(),
      sync_received_at: new Date(now - 70 * 60 * 1000).toISOString(),
      offline_created: true,
      latitude: 5.9631,
      longitude: 10.1591,
      accuracy: 8.4,
      payload_json: {
        [primaryField?.variableName ?? primaryField?.id ?? "respondent"]: "Sample respondent",
        [evidenceField?.variableName ?? evidenceField?.id ?? "evidence"]: evidenceField ? "Captured" : "Not required",
        quality_score: 86,
      },
    },
    {
      id: `${form.id}-review-002`,
      client_submission_id: `${form.id.slice(0, 10)}-0002`,
      project_id: "preview-agriculture",
      survey_id: "preview-baseline",
      form_id: form.id,
      field_officer_id: "officer-002",
      status: "correction_requested",
      server_sequence: 2,
      captured_at: new Date(now - 5 * 60 * 60 * 1000).toISOString(),
      submitted_at: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
      sync_received_at: new Date(now - 110 * 60 * 1000).toISOString(),
      offline_created: false,
      latitude: 4.0511,
      longitude: 9.7679,
      accuracy: 18.2,
      payload_json: {
        [primaryField?.variableName ?? primaryField?.id ?? "respondent"]: "Needs correction",
        issue: "Photo evidence or reference value needs confirmation",
        quality_score: 62,
      },
    },
  ];
}

function createPreviewImportRuns(form: DynamicForm): FormImportRun[] {
  return [
    {
      id: `${form.id}-import-1`,
      fileName: `${slugify(form.name)}-field-data.xlsx`,
      rows: 120,
      mappedColumns: Math.max(form.fields.length - 1, 1),
      validRows: 113,
      issueCount: 7,
      status: "validated",
      createdAt: new Date().toISOString(),
    },
  ];
}

function createPreviewQualityFlags(form: DynamicForm, submissions: SubmissionRead[]): FormQualityFlag[] {
  const mediaCount = form.fields.filter((field) => ["photo", "image", "audio", "video", "file", "signature"].includes(field.type)).length;
  const gpsCount = form.fields.filter((field) => ["gps", "geolocation", "map", "geofence"].includes(field.type)).length;
  const reviewCount = submissions.filter((submission) => ["submitted", "under_review", "correction_requested"].includes(submission.status)).length;
  return [
    {
      id: `${form.id}-quality-gps`,
      label: "GPS accuracy outside target",
      severity: gpsCount ? "High" : "Medium",
      affectedRecords: gpsCount ? 4 : 0,
      owner: "Survey supervisor",
      status: gpsCount ? "monitoring" : "resolved",
      recommendation: gpsCount
        ? "Ask enumerators to wait for stronger GPS accuracy before saving records."
        : "Add GPS capture if location evidence is required for this survey.",
    },
    {
      id: `${form.id}-quality-review`,
      label: "Records waiting for review",
      severity: reviewCount > 1 ? "High" : "Medium",
      affectedRecords: reviewCount,
      owner: "Data manager",
      status: reviewCount ? "open" : "resolved",
      recommendation: "Use the submission review workspace to approve clean records or return records for correction.",
    },
    {
      id: `${form.id}-quality-media`,
      label: "Evidence attachment check",
      severity: mediaCount ? "Medium" : "Low",
      affectedRecords: mediaCount ? 2 : 0,
      owner: "Data quality officer",
      status: mediaCount ? "monitoring" : "resolved",
      recommendation: mediaCount
        ? "Check that photos, signatures, or files are readable before approval."
        : "No media evidence is required on this form.",
    },
  ];
}

function createDefaultFormControls(form?: DynamicForm): FormControlsSettings {
  const duplicateFields = (form?.fields ?? [])
    .slice(0, 2)
    .map((field) => field.variableName ?? field.id);

  return {
    reference_bindings: [],
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
        location_scope: "project",
        can_approve_own_submission: false,
        read_only: false,
      },
      {
        subject_type: "role",
        subject_name: "Field Officer",
        permissions: ["view_form", "submit_data", "edit_own_draft_submissions", "edit_returned_submissions"],
        location_scope: "assigned_locations",
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
    workflow_stages: workflowPresets.standard,
    data_quality_rules: [
      {
        id: "required_fields",
        label: "Required fields",
        rule_type: "required",
        enabled: true,
        severity: "critical",
        blocking: true,
        fields: [],
        expression: null,
      },
      {
        id: "gps_boundary",
        label: "GPS boundary check",
        rule_type: "gps_boundary",
        enabled: true,
        severity: "high",
        blocking: false,
        fields: [],
        expression: null,
      },
      {
        id: "duplicate_detection",
        label: "Duplicate detection",
        rule_type: "duplicate",
        enabled: true,
        severity: "high",
        blocking: false,
        fields: duplicateFields,
        expression: null,
      },
      {
        id: "missing_consent",
        label: "Missing consent flag",
        rule_type: "consent",
        enabled: true,
        severity: "critical",
        blocking: true,
        fields: [],
        expression: null,
      },
    ],
    governance: {
      form_status: form?.status === "published" ? "published" : "draft",
      approval_workflow: "standard",
      required_review_levels: 2,
      submitted_records_editable: false,
      approved_records_editable: false,
      rejected_records_resubmittable: true,
      duplicate_submissions_allowed: false,
      duplicate_detection_fields: duplicateFields.length ? duplicateFields : ["respondent_id", "phone_number"],
      require_gps_capture: true,
      require_timestamp_capture: true,
      require_enumerator_assignment: true,
      require_supervisor_review: true,
      data_retention_days: 2555,
      export_restricted: true,
      sensitive_field_masking: true,
      pii_tagging_required: true,
      consent_required: true,
      minimum_quality_score: 80,
      review_sla_hours: 48,
      auto_lock_after_approval: true,
      auto_archive_after_project_closure: true,
    },
    audit: {
      immutable: true,
      reason_required_events: [
        "validation_rule_changed",
        "permission_changed",
        "form_published",
        "submission_rejected",
        "data_deleted",
        "export_performed",
      ],
      tracked_events: [
        "form_created",
        "form_edited",
        "question_added",
        "question_removed",
        "validation_rule_changed",
        "skip_logic_changed",
        "reference_list_attached",
        "permission_changed",
        "form_published",
        "form_archived",
        "submission_created",
        "submission_reviewed",
        "submission_approved",
        "submission_rejected",
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
  };
}

function normalizeFormControls(value: unknown, form?: DynamicForm): FormControlsSettings {
  const defaults = createDefaultFormControls(form);
  if (!value || typeof value !== "object") {
    return defaults;
  }
  const record = value as Partial<FormControlsSettings>;

  return {
    reference_bindings: Array.isArray(record.reference_bindings)
      ? record.reference_bindings
      : defaults.reference_bindings,
    permission_rules: Array.isArray(record.permission_rules)
      ? record.permission_rules
      : defaults.permission_rules,
    workflow_stages: Array.isArray(record.workflow_stages)
      ? record.workflow_stages
      : defaults.workflow_stages,
    data_quality_rules: Array.isArray(record.data_quality_rules)
      ? record.data_quality_rules
      : defaults.data_quality_rules,
    governance: { ...defaults.governance, ...(record.governance ?? {}) },
    audit: { ...defaults.audit, ...(record.audit ?? {}) },
    versioning: { ...defaults.versioning, ...(record.versioning ?? {}) },
  };
}

function FieldInputPreview({ field }: { field: FormField }) {
  if (field.options?.length) {
    return (
      <div className="mt-2 flex flex-wrap gap-1.5">
        {field.options.slice(0, 6).map((option) => (
          <span className="rounded-md border bg-panel px-3 py-1.5 text-xs text-muted-foreground" key={option}>
            {option}
          </span>
        ))}
      </div>
    );
  }

  if (["matrix_single", "matrix_multi", "grid"].includes(field.type)) {
    return (
      <div className="mt-2 overflow-hidden rounded-md border bg-panel">
        <div className="grid grid-cols-4 border-b text-[11px] text-muted-foreground">
          <span className="p-2">Row</span>
          {(field.matrix?.columns ?? ["Option 1", "Option 2", "Option 3"]).slice(0, 3).map((column) => (
            <span className="border-l p-2" key={column}>{column}</span>
          ))}
        </div>
        {(field.matrix?.rows ?? ["Row 1", "Row 2"]).slice(0, 2).map((row) => (
          <div className="grid grid-cols-4 border-b last:border-b-0 text-xs" key={row}>
            <span className="p-2 text-muted-foreground">{row}</span>
            <span className="border-l p-2 text-center text-muted-foreground">○</span>
            <span className="border-l p-2 text-center text-muted-foreground">○</span>
            <span className="border-l p-2 text-center text-muted-foreground">○</span>
          </div>
        ))}
      </div>
    );
  }

  if (field.type === "repeat_group") {
    return (
      <div className="mt-2 rounded-md border border-dashed bg-panel px-3 py-2 text-xs text-muted-foreground">
        Add item · remove item · duplicate item · repeat limit {field.repeat?.max ?? "not set"}
      </div>
    );
  }

  if (["gps", "geolocation", "map", "geofence"].includes(field.type)) {
    return (
      <div className="mt-2 grid grid-cols-2 gap-1.5 text-xs">
        {["Latitude", "Longitude", "Accuracy", "Timestamp"].map((label) => (
          <span className="rounded-md border bg-panel px-3 py-2 text-muted-foreground" key={label}>{label}</span>
        ))}
      </div>
    );
  }

  if (["photo", "image", "video", "audio", "file", "signature"].includes(field.type)) {
    return (
      <div className="mt-2 rounded-md border border-dashed bg-panel px-3 py-2.5 text-center text-xs text-muted-foreground">
        Capture or upload {field.type.replace("_", " ")}
      </div>
    );
  }

  if (field.type === "calculated") {
    return (
      <div className="mt-2 rounded-md border bg-panel px-3 py-2 font-mono text-xs text-muted-foreground">
        {field.calculation?.expression ?? "Formula preview"}
      </div>
    );
  }

  return (
    <div className="mt-2 rounded-md border bg-panel px-3 py-2 text-sm text-muted-foreground">
      {field.appearance?.placeholder ?? field.hint ?? "Answer goes here"}
    </div>
  );
}

function SortableField({
  field,
  index,
  selected,
  onDuplicate,
  onEditSettings,
  onLabelChange,
  onMoveDown,
  onMoveUp,
  onRemove,
  onSelect,
  onToggleRequired,
  canMoveDown,
  canMoveUp,
}: {
  field: FormField;
  index: number;
  selected: boolean;
  onDuplicate: () => void;
  onEditSettings: () => void;
  onLabelChange: (label: string) => void;
  onMoveDown: () => void;
  onMoveUp: () => void;
  onRemove: () => void;
  onSelect: () => void;
  onToggleRequired: (required: boolean) => void;
  canMoveDown: boolean;
  canMoveUp: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });
  const FieldIcon = fieldTypeIcons[field.type];

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "group border-b bg-panel px-3 py-2.5 transition last:border-b-0 hover:bg-muted/30",
        selected && "bg-primary/10 ring-1 ring-inset ring-primary/25",
        isDragging && "relative z-10 shadow-elevated",
      )}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-start gap-2">
          <button
            className="mt-0.5 flex h-8 w-7 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            {...attributes}
            {...listeners}
            aria-label={`Drag ${field.label} to reorder`}
            onClick={(event) => event.stopPropagation()}
            type="button"
          >
            <GripVertical aria-hidden="true" size={15} />
          </button>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-background text-muted-foreground">
            <FieldIcon aria-hidden="true" size={15} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-mono text-[11px] text-muted-foreground">
                {String(index + 1).padStart(2, "0")}
              </span>
              <Badge tone="neutral">{field.type.replace("_", " ")}</Badge>
              {field.required ? <Badge tone="warning">required</Badge> : null}
              {field.logic?.length ? <Badge tone="accent">logic</Badge> : null}
            </div>
            <Input
              className="mt-1 h-8 border-transparent bg-transparent px-0 text-sm font-semibold shadow-none focus:border-primary"
              onChange={(event) => onLabelChange(event.target.value)}
              onClick={(event) => event.stopPropagation()}
              value={field.label}
            />
            {field.hint ? (
              <p className="line-clamp-1 text-xs text-muted-foreground">{field.hint}</p>
            ) : null}
            <FieldInputPreview field={field} />
          </div>
        </div>
        <div className="grid shrink-0 grid-cols-2 gap-1 opacity-100 transition md:opacity-0 md:group-hover:opacity-100">
        <Button
          aria-label={`Open settings for ${field.label}`}
          onClick={(event) => {
            event.stopPropagation();
            onEditSettings();
          }}
          size="icon"
          type="button"
          variant="secondary"
        >
          <Settings2 aria-hidden="true" />
        </Button>
        <Button
          aria-label={`${field.required ? "Make optional" : "Make required"} ${field.label}`}
          onClick={(event) => {
            event.stopPropagation();
            onToggleRequired(!field.required);
          }}
          size="icon"
          type="button"
          variant={field.required ? "secondary" : "ghost"}
        >
          <Check aria-hidden="true" />
        </Button>
        <Button
          aria-label={`Move ${field.label} up`}
          disabled={!canMoveUp}
          onClick={(event) => {
            event.stopPropagation();
            onMoveUp();
          }}
          size="icon"
          type="button"
          variant="ghost"
        >
          <ArrowUp aria-hidden="true" />
        </Button>
        <Button
          aria-label={`Move ${field.label} down`}
          disabled={!canMoveDown}
          onClick={(event) => {
            event.stopPropagation();
            onMoveDown();
          }}
          size="icon"
          type="button"
          variant="ghost"
        >
          <ArrowDown aria-hidden="true" />
        </Button>
        <Button
          aria-label={`Duplicate ${field.label}`}
          onClick={(event) => {
            event.stopPropagation();
            onDuplicate();
          }}
          size="icon"
          type="button"
          variant="ghost"
        >
          <Copy aria-hidden="true" />
        </Button>
        <Button
          aria-label={`Remove ${field.label}`}
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
          size="icon"
          type="button"
          variant="ghost"
        >
          <Trash2 aria-hidden="true" />
        </Button>
        </div>
      </div>
    </div>
  );
}

export function DynamicForms({ initialDraft, token }: DynamicFormsProps) {
  const initialDraftIdRef = useRef(initialDraft?.id ?? "");
  const [forms, setForms] = useState<DynamicForm[]>(() => (initialDraft ? [initialDraft] : []));
  const [selectedFormId, setSelectedFormId] = useState("");
  const [selectedFieldId, setSelectedFieldId] = useState("");
  const [builderMode, setBuilderMode] = useState<"builder" | "templates">(
    "builder",
  );
  const [previewMode, setPreviewMode] = useState<PreviewMode>("mobile");
  const [leftPanelTab, setLeftPanelTab] = useState<LeftPanelTab>("structure");
  const [rightPanelTab, setRightPanelTab] = useState<RightPanelTab>("field");
  const [builderFocusPanel, setBuilderFocusPanel] = useState<BuilderFocusPanel>("build");
  const [selectedPageId, setSelectedPageId] = useState("");
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [historyPast, setHistoryPast] = useState<DynamicForm[]>([]);
  const [historyFuture, setHistoryFuture] = useState<DynamicForm[]>([]);
  const [builderAssistantOpen, setBuilderAssistantOpen] = useState(false);
  const [builderActionDialogOpen, setBuilderActionDialogOpen] = useState(false);
  const [fieldSettingsDialogOpen, setFieldSettingsDialogOpen] = useState(false);
  const [mobileDeployDialogOpen, setMobileDeployDialogOpen] = useState(false);
  const [formControlsDialogOpen, setFormControlsDialogOpen] = useState(false);
  const [readinessDialogOpen, setReadinessDialogOpen] = useState(false);
  const [reviewWorkspaceDialogOpen, setReviewWorkspaceDialogOpen] = useState(false);
  const [assignmentWorkspaceDialogOpen, setAssignmentWorkspaceDialogOpen] = useState(false);
  const [importWorkspaceDialogOpen, setImportWorkspaceDialogOpen] = useState(false);
  const [qualityWorkspaceDialogOpen, setQualityWorkspaceDialogOpen] = useState(false);
  const [formControlsTab, setFormControlsTab] = useState<FormControlsTab>("overview");
  const [builderAssistantMode, setBuilderAssistantMode] = useState<BuilderAssistantMode>("question");
  const [smartFieldQuery, setSmartFieldQuery] = useState("");
  const [newFormDialogOpen, setNewFormDialogOpen] = useState(false);
  const [newFormName, setNewFormName] = useState("New survey form");
  const [newFormDescription, setNewFormDescription] = useState("");
  const [newFormChannel, setNewFormChannel] = useState<DistributionChannel>("survey_app");
  const [newFormBlocks, setNewFormBlocks] = useState<string[]>(["respondent-details", "gps-evidence"]);
  const [templateCategory, setTemplateCategory] = useState("Recommended");
  const [templateQuery, setTemplateQuery] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState(previewFormProjects[0]?.id ?? "");
  const [selectedSurveyId, setSelectedSurveyId] = useState(previewFormSurveys[0]?.id ?? "");
  const [showWorkflowDetails, setShowWorkflowDetails] = useState(false);
  const [mobileDeploymentAudience, setMobileDeploymentAudience] = useState("All assigned field officers");
  const [mobileDeploymentSyncMode, setMobileDeploymentSyncMode] = useState<"offline_first" | "online_required">("offline_first");
  const [mobileDeployments, setMobileDeployments] = useState<Record<string, MobileDeployment>>({});
  const [formControlsByFormId, setFormControlsByFormId] = useState<Record<string, FormControlsSettings>>({});
  const [formReadinessByFormId, setFormReadinessByFormId] = useState<Record<string, FormReadinessState>>({});
  const [formReviewRowsByFormId, setFormReviewRowsByFormId] = useState<Record<string, SubmissionRead[]>>({});
  const [formAssignmentByFormId, setFormAssignmentByFormId] = useState<Record<string, FormAssignmentPlan>>({});
  const [formImportRunsByFormId, setFormImportRunsByFormId] = useState<Record<string, FormImportRun[]>>({});
  const [formQualityFlagsByFormId, setFormQualityFlagsByFormId] = useState<Record<string, FormQualityFlag[]>>({});
  const [selectedReviewSubmissionId, setSelectedReviewSubmissionId] = useState("");
  const [reviewComment, setReviewComment] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState(
    formTemplates[0]?.id ?? "",
  );
  const [builderResult, setBuilderResult] = useState(
    initialDraft
      ? `${initialDraft.name} draft shell was created. Add sections, questions, validation, logic, controls, then review readiness before publishing.`
      : "",
  );
  const pendingTemplateId = useWorkspaceStore(
    (state) => state.pendingTemplateId,
  );
  const setActiveView = useWorkspaceStore((state) => state.setActiveView);
  const setSidebarCollapsed = useWorkspaceStore((state) => state.setSidebarCollapsed);
  const setPendingTemplateId = useWorkspaceStore(
    (state) => state.setPendingTemplateId,
  );
  const pushToast = useWorkspaceStore((state) => state.pushToast);
  const isPreview = !token || token === "preview-token";
  const projectsQuery = useQuery({
    queryKey: ["programs", token],
    queryFn: () => listPrograms(token ?? ""),
    enabled: Boolean(token && !isPreview),
  });
  const surveysQuery = useQuery({
    queryKey: ["surveys", token],
    queryFn: () => listSurveys(token ?? ""),
    enabled: Boolean(token && !isPreview),
  });
  const backendFormsQuery = useQuery({
    queryKey: ["forms", token],
    queryFn: () => listForms(token ?? ""),
    enabled: Boolean(token && !isPreview),
  });
  const formSubmissionsQuery = useQuery({
    queryKey: ["form-submissions", token, selectedFormId],
    queryFn: () => listSubmissions(token ?? ""),
    enabled: Boolean(token && !isPreview && selectedFormId && reviewWorkspaceDialogOpen),
  });
  const projects = useMemo(
    () => (isPreview ? previewFormProjects : projectsQuery.data ?? []),
    [isPreview, projectsQuery.data],
  );
  const surveys = useMemo(
    () => (isPreview ? previewFormSurveys : surveysQuery.data ?? []),
    [isPreview, surveysQuery.data],
  );
  const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? projects[0];
  const projectSurveys = surveys.filter((survey) => survey.project_id === selectedProject?.id);
  const selectedSurvey = projectSurveys.find((survey) => survey.id === selectedSurveyId) ?? projectSurveys[0];
  const persistedForms = useMemo(
    () => (backendFormsQuery.data ?? []).map(persistedFormToLocal),
    [backendFormsQuery.data],
  );
  const allForms = useMemo(() => {
    const seen = new Set<string>();
    return [...forms, ...persistedForms].filter((form) => {
      if (seen.has(form.id)) {
        return false;
      }
      seen.add(form.id);
      return true;
    });
  }, [forms, persistedForms]);
  const selectedForm = useMemo(
    () => {
      const form = allForms.find((candidate) => candidate.id === selectedFormId) ?? allForms[0];
      return form ? normalizeForm(form) : undefined;
    },
    [allForms, selectedFormId],
  );
  const selectedBackendForm = useMemo(
    () => (backendFormsQuery.data ?? []).find((form) => form.id === selectedForm?.id),
    [backendFormsQuery.data, selectedForm?.id],
  );
  const selectedFormControls = useMemo(
    () =>
      selectedForm
        ? formControlsByFormId[selectedForm.id] ?? normalizeFormControls(selectedBackendForm?.controls_json, selectedForm)
        : createDefaultFormControls(),
    [formControlsByFormId, selectedBackendForm?.controls_json, selectedForm],
  );
  const selectedMobileDeployment =
    selectedForm?.mobileDeployment ??
    (selectedForm ? mobileDeployments[selectedForm.id] : undefined);
  const selectedPages = selectedForm ? defaultPages(selectedForm) : [];
  const activePage = selectedPages.find((page) => page.id === selectedPageId) ?? selectedPages[0];
  const activeSections = selectedForm?.sections.filter((section) => section.pageId === activePage?.id) ?? [];
  const activeSection = activeSections.find((section) => section.id === selectedSectionId) ?? activeSections[0] ?? selectedForm?.sections[0];
  const activePageFields = selectedForm?.fields.filter((field) => field.pageId === activePage?.id) ?? [];
  const selectedField =
    selectedForm?.fields.find((field) => field.id === selectedFieldId) ??
    selectedForm?.fields[0];
  const isPersistedSelectedForm = Boolean(
    selectedFormId && persistedForms.some((form) => form.id === selectedFormId),
  );
  const formControlsReady = Boolean(
    selectedFormControls.permission_rules.length &&
      selectedFormControls.workflow_stages.length &&
      selectedFormControls.data_quality_rules.some((rule) => rule.enabled),
  );
  const selectedFormReadiness =
    selectedForm
      ? formReadinessByFormId[selectedForm.id] ?? defaultReadinessState
      : defaultReadinessState;
  const selectedPreviewReviewRows = useMemo(
    () =>
      selectedForm
        ? formReviewRowsByFormId[selectedForm.id] ?? createPreviewSubmissionRows(selectedForm)
        : [],
    [formReviewRowsByFormId, selectedForm],
  );
  const selectedFormReviewRows = useMemo(
    () =>
      isPreview
        ? selectedPreviewReviewRows
        : (formSubmissionsQuery.data ?? []).filter((submission) => submission.form_id === selectedForm?.id),
    [formSubmissionsQuery.data, isPreview, selectedForm?.id, selectedPreviewReviewRows],
  );
  const selectedAssignmentPlan =
    selectedForm
      ? formAssignmentByFormId[selectedForm.id] ?? {
          ...defaultAssignmentPlan,
          audience: mobileDeploymentAudience,
          locationScope: selectedSurvey?.geographic_scope ?? selectedProject?.region ?? defaultAssignmentPlan.locationScope,
        }
      : defaultAssignmentPlan;
  const selectedImportRuns = useMemo(
    () =>
      selectedForm
        ? formImportRunsByFormId[selectedForm.id] ?? createPreviewImportRuns(selectedForm)
        : [],
    [formImportRunsByFormId, selectedForm],
  );
  const selectedQualityFlags = useMemo(
    () =>
      selectedForm
        ? formQualityFlagsByFormId[selectedForm.id] ?? createPreviewQualityFlags(selectedForm, selectedFormReviewRows)
        : [],
    [formQualityFlagsByFormId, selectedForm, selectedFormReviewRows],
  );
  const selectedReviewSubmission =
    selectedFormReviewRows.find((submission) => submission.id === selectedReviewSubmissionId) ??
    selectedFormReviewRows[0];
  const readinessItems: FormReadinessItem[] = useMemo(
    () =>
      buildFormReadinessChecklist(selectedForm, {
        hasProject: Boolean(selectedProject),
        hasSurvey: Boolean(selectedSurvey),
        controlsConfigured: formControlsReady,
        workflowConfigured: selectedFormControls.workflow_stages.length > 0,
        qualityChecksConfigured: selectedFormControls.data_quality_rules.some((rule) => rule.enabled),
        mobilePreviewChecked: selectedFormReadiness.mobilePreviewChecked,
        pilotTestCompleted: selectedFormReadiness.pilotTestCompleted,
        deploymentAudienceSelected: Boolean(mobileDeploymentAudience.trim()),
      }),
    [
      selectedForm,
      selectedProject,
      selectedSurvey,
      formControlsReady,
      selectedFormControls.workflow_stages.length,
      selectedFormControls.data_quality_rules,
      selectedFormReadiness.mobilePreviewChecked,
      selectedFormReadiness.pilotTestCompleted,
      mobileDeploymentAudience,
    ],
  );
  const readinessReadyForPublish = isFormReadyForPublish(readinessItems);
  const readinessCompletedCount = readinessItems.filter((item) => item.complete).length;
  const readinessRequiredMissingCount = readinessItems.filter((item) => item.required && !item.complete).length;

  function createMobileDeployment(): MobileDeployment {
    return {
      assignedAudience: mobileDeploymentAudience,
      channel: "survey_app",
      deployedAt: new Date().toISOString(),
      instructions:
        "Field officers should sync the Survey App, open Assigned forms, and start collection from the latest published version.",
      status: "deployed",
      syncMode: mobileDeploymentSyncMode,
    };
  }

  const publishMutation = useMutation({
    mutationFn: (payload: { form: DynamicForm; publish: boolean; deployToMobile?: boolean }) =>
      createForm(token ?? "", {
        project_id: selectedProject?.id ?? "",
        survey_id: selectedSurvey?.id ?? "",
        name: payload.form.name,
        slug: `${slugify(payload.form.name)}-${Date.now().toString(36)}`,
        description: payload.form.sections[0]?.description ?? null,
        schema: toMobileSchema(payload.form) as Record<string, unknown>,
        publish: payload.publish,
      }),
    onSuccess: async (savedForm, variables) => {
      if (variables.deployToMobile) {
        const deployment = createMobileDeployment();
        setMobileDeployments((current) => ({
          ...current,
          [savedForm.id]: deployment,
        }));
        setMobileDeployDialogOpen(false);
        setBuilderResult(
          `${savedForm.name} is published and deployed to the Survey App for ${deployment.assignedAudience}. Field officers will see it after they sync their mobile app.`,
        );
      } else {
        setBuilderResult(
          `${savedForm.name} is ${savedForm.status} as backend version ${savedForm.current_version}. Field teams can use the latest published version after sync.`,
        );
      }
      pushToast({
        title:
          variables.deployToMobile
            ? "Deployed to Survey App"
            : savedForm.status === "published"
              ? "Form published"
              : "Form saved",
        description: variables.deployToMobile
          ? `${savedForm.name} will appear for assigned field officers after mobile sync.`
          : `${savedForm.name} is stored in the backend as version ${savedForm.current_version}.`,
        tone: "success",
      });
      setForms((current) =>
        current.filter((form) => form.id !== variables.form.id),
      );
      setFormControlsByFormId((current) => {
        const nextControls = {
          ...current,
          [savedForm.id]: normalizeFormControls(
            savedForm.controls_json ?? current[variables.form.id] ?? createDefaultFormControls(variables.form),
            persistedFormToLocal(savedForm),
          ),
        };
        delete nextControls[variables.form.id];
        return nextControls;
      });
      setSelectedFormId(savedForm.id);
      setSelectedFieldId(`${savedForm.id}-respondent`);
      await backendFormsQuery.refetch();
    },
    onError: () => {
      setBuilderResult(
        "The form was not saved. Check your form management permission and confirm the form has at least one question before publishing.",
      );
      pushToast({
        title: "Form was not saved",
        description:
          "Check permissions and required form fields before trying again.",
        tone: "danger",
      });
    },
  });
  const serverCompatibilityQuery = useQuery({
    queryKey: ["form-compatibility", token, selectedFormId],
    queryFn: () => getFormCollectionCompatibility(token ?? "", selectedFormId),
    enabled: Boolean(
      token && !isPreview && isPersistedSelectedForm,
    ),
  });
  const xlsFormQuery = useQuery({
    queryKey: ["form-xlsform", token, selectedFormId],
    queryFn: () => exportFormXlsForm(token ?? "", selectedFormId),
    enabled: false,
  });
  const publicLinkMutation = useMutation({
    mutationFn: () =>
      createPublicCollectionLink(token ?? "", {
        form_id: selectedFormId,
        slug: `${slugify(selectedForm?.name ?? "form")}-${Date.now().toString(36)}`,
        title: selectedForm?.name ?? "Public collection form",
        description:
          "Controlled public collection link generated from the form builder.",
        access_mode: "restricted",
        require_authentication: false,
        allow_offline_web: true,
        permission_json: {
          submit: true,
          view: false,
          edit: false,
          export: false,
        },
      }),
    onSuccess: (link) => {
      setBuilderResult(
        `${link.title} has a controlled public collection link: ${link.public_url}. Share it only with the intended collection audience.`,
      );
      pushToast({
        title: "Public link created",
        description: `${link.public_url} is ready for controlled collection`,
        tone: "success",
      });
    },
    onError: () => {
      setBuilderResult(
        "Public link was not created. Save this form to the backend first, then create a link from the saved form.",
      );
      pushToast({
        title: "Public link not created",
        description:
          "Select a saved backend form and sign in with form management access.",
        tone: "danger",
      });
    },
  });
  const updateControlsMutation = useMutation({
    mutationFn: (payload: { formId: string; controls: FormControlsSettings }) =>
      updateFormControls(token ?? "", payload.formId, payload.controls),
    onSuccess: async (savedForm, variables) => {
      setFormControlsByFormId((current) => ({
        ...current,
        [variables.formId]: normalizeFormControls(savedForm.controls_json ?? variables.controls, selectedForm),
      }));
      setFormControlsDialogOpen(false);
      setBuilderResult(
        `${savedForm.name} controls were saved. Reference data, permissions, workflow, quality, audit, and version rules are now attached to this form.`,
      );
      pushToast({
        title: "Form controls saved",
        description: `${savedForm.name} now has form-level governance settings.`,
        tone: "success",
      });
      await backendFormsQuery.refetch();
    },
    onError: () => {
      setBuilderResult(
        "Form controls were not saved. Confirm you have permission to manage forms and that the form is saved to the backend.",
      );
      pushToast({
        title: "Controls were not saved",
        description: "Check form management permission and try again.",
        tone: "danger",
      });
    },
  });
  const formReviewMutation = useMutation({
    mutationFn: (payload: { submissionId: string; action: ReviewAction; comment: string }) =>
      reviewSubmission(token ?? "", payload.submissionId, {
        action: payload.action,
        comment: payload.comment,
      }),
    onSuccess: async (submission, variables) => {
      setReviewComment("");
      setBuilderResult(`${submission.client_submission_id} is now ${formatReviewStatus(submission.status)}. Reviewer note: ${variables.comment}`);
      pushToast({
        title: `Submission ${variables.action.replace("_", " ")}`,
        description: `${submission.client_submission_id} was updated.`,
        tone: "success",
      });
      await formSubmissionsQuery.refetch();
    },
    onError: () => {
      setBuilderResult(
        "The review decision was not saved. Confirm the submission is open, add a reviewer note, and check your review permission.",
      );
      pushToast({
        title: "Review decision failed",
        description: "Check the submission status and your review permission.",
        tone: "danger",
      });
    },
  });
  const visibleTemplates = useMemo(() => {
    const needle = templateQuery.trim().toLowerCase();
    return formTemplates.filter((template) => {
      const categoryMatch =
        templateCategory === "Recommended"
          ? template.featured
          : template.category === templateCategory;
      const queryMatch =
        !needle ||
        template.name.toLowerCase().includes(needle) ||
        template.description.toLowerCase().includes(needle) ||
        template.tags.some((tag) => tag.toLowerCase().includes(needle));
      return categoryMatch && queryMatch;
    });
  }, [templateCategory, templateQuery]);
  const selectedTemplate =
    formTemplates.find((template) => template.id === selectedTemplateId) ??
    visibleTemplates[0] ??
    formTemplates[0];
  const smartFieldSuggestions = useMemo(() => {
    const catalogPresets: FieldPreset[] = fieldCatalog.flatMap((group) =>
      group.fields.map((field) => ({
        id: `catalog-${field.type}`,
        label: field.label,
        type: field.type,
        hint: field.description,
      })),
    );
    const deduped = [...quickFieldPresets, ...catalogPresets].filter(
      (preset, index, presets) => presets.findIndex((candidate) => candidate.label === preset.label) === index,
    );
    const needle = smartFieldQuery.trim().toLowerCase();
    if (!needle) {
      return quickFieldPresets.slice(0, 8);
    }
    return deduped
      .filter((preset) =>
        [preset.label, preset.type, preset.hint, ...(preset.options ?? [])]
          .join(" ")
          .toLowerCase()
          .includes(needle),
      )
      .slice(0, 8);
  }, [smartFieldQuery]);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const updateSelectedForm = useCallback((nextForm: DynamicForm, options: { trackHistory?: boolean } = {}) => {
    if (selectedForm && options.trackHistory !== false) {
      setHistoryPast((current) => [...current.slice(-19), selectedForm]);
      setHistoryFuture([]);
    }
    setForms((current) => {
      const exists = current.some((form) => form.id === nextForm.id);
      return exists
        ? current.map((form) => (form.id === nextForm.id ? nextForm : form))
        : [nextForm, ...current];
    });
  }, [selectedForm]);

  function updateSelectedFormControls(updater: (controls: FormControlsSettings) => FormControlsSettings) {
    if (!selectedForm) {
      return;
    }
    setFormControlsByFormId((current) => ({
      ...current,
      [selectedForm.id]: updater(current[selectedForm.id] ?? selectedFormControls),
    }));
  }

  function addReferenceBinding(field = selectedField) {
    if (!field) {
      pushToast({
        title: "Select a question first",
        description: "Choose the form question that should use controlled reference data.",
        tone: "warning",
      });
      return;
    }
    const existing = selectedFormControls.reference_bindings.some((binding) => binding.question_id === field.id);
    if (existing) {
      setFormControlsTab("reference");
      setFormControlsDialogOpen(true);
      pushToast({
        title: "Reference already attached",
        description: `${field.label} already has a controlled list binding.`,
        tone: "neutral",
      });
      return;
    }
    const suggestedList = /district/i.test(field.label)
      ? "Official District reference list"
      : /region|province|state/i.test(field.label)
        ? "Official Region reference list"
        : /community|village|ward/i.test(field.label)
          ? "Official Community reference list"
          : /school/i.test(field.label)
            ? "Official School reference list"
            : /facility|clinic|hospital/i.test(field.label)
              ? "Official Facility reference list"
              : `${field.label} reference list`;
    updateSelectedFormControls((controls) => ({
      ...controls,
      reference_bindings: [
        ...controls.reference_bindings,
        {
          id: `reference-${field.id}-${Date.now()}`,
          question_id: field.id,
          question_label: field.label,
          reference_list_name: suggestedList,
          reference_type: suggestedList.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "reference",
          source: "existing",
          enforce_controlled_values: true,
          allow_inactive_values: false,
          parent_reference: /district|community|village|ward/i.test(field.label) ? "Region" : null,
          effective_from: null,
          effective_to: null,
          version: 1,
          updated_by: "M&E Manager",
          changed_since_publish: false,
        },
      ],
    }));
    setFormControlsTab("reference");
    setFormControlsDialogOpen(true);
    setBuilderResult(`${field.label} is now mapped to a controlled reference list.`);
  }

  function applyWorkflowPreset(preset: "simple" | "standard" | "correction") {
    updateSelectedFormControls((controls) => ({
      ...controls,
      workflow_stages: workflowPresets[preset].map((stage) => ({ ...stage, reviewer_roles: [...stage.reviewer_roles] })),
      governance: {
        ...controls.governance,
        approval_workflow: preset,
        required_review_levels: preset === "simple" ? 1 : 2,
        require_supervisor_review: preset !== "simple",
      },
    }));
  }

  function saveSelectedFormControls() {
    if (!selectedForm) {
      return;
    }
    if (token && !isPreview && isPersistedSelectedForm) {
      updateControlsMutation.mutate({ formId: selectedForm.id, controls: selectedFormControls });
      return;
    }
    setFormControlsByFormId((current) => ({
      ...current,
      [selectedForm.id]: selectedFormControls,
    }));
    setFormControlsDialogOpen(false);
    setBuilderResult(
      `${selectedForm.name} controls were saved in the local preview. Save the form to the backend to persist them for production users.`,
    );
    pushToast({
      title: "Preview controls saved",
      description: "Controls are ready locally and will be persisted after the form is saved to the backend.",
      tone: "success",
    });
  }

  function updateSelectedReadiness(patch: Partial<FormReadinessState>) {
    if (!selectedForm) {
      return;
    }
    setFormReadinessByFormId((current) => ({
      ...current,
      [selectedForm.id]: {
        ...(current[selectedForm.id] ?? defaultReadinessState),
        ...patch,
        lastReviewedAt: new Date().toISOString(),
      },
    }));
  }

  function openReadinessChecklist() {
    setMobileDeployDialogOpen(false);
    setFormControlsDialogOpen(false);
    setReviewWorkspaceDialogOpen(false);
    setAssignmentWorkspaceDialogOpen(false);
    setImportWorkspaceDialogOpen(false);
    setQualityWorkspaceDialogOpen(false);
    setReadinessDialogOpen(true);
    setBuilderResult("Review readiness before publishing or deploying this form to field teams.");
  }

  function openDeploymentCenter() {
    setReadinessDialogOpen(false);
    setFormControlsDialogOpen(false);
    setReviewWorkspaceDialogOpen(false);
    setAssignmentWorkspaceDialogOpen(false);
    setImportWorkspaceDialogOpen(false);
    setQualityWorkspaceDialogOpen(false);
    setMobileDeployDialogOpen(true);
    setBuilderResult("Use the deployment center to publish, assign, deploy, and monitor mobile sync readiness.");
  }

  function openSubmissionReviewWorkspace() {
    setReadinessDialogOpen(false);
    setMobileDeployDialogOpen(false);
    setFormControlsDialogOpen(false);
    setAssignmentWorkspaceDialogOpen(false);
    setImportWorkspaceDialogOpen(false);
    setQualityWorkspaceDialogOpen(false);
    setReviewWorkspaceDialogOpen(true);
    if (selectedFormReviewRows[0] && !selectedReviewSubmissionId) {
      setSelectedReviewSubmissionId(selectedFormReviewRows[0].id);
    }
    setBuilderResult("Review incoming records for this form without leaving the form workspace.");
  }

  function openAssignmentWorkspace() {
    setReadinessDialogOpen(false);
    setMobileDeployDialogOpen(false);
    setFormControlsDialogOpen(false);
    setReviewWorkspaceDialogOpen(false);
    setImportWorkspaceDialogOpen(false);
    setQualityWorkspaceDialogOpen(false);
    setAssignmentWorkspaceDialogOpen(true);
    setBuilderResult("Assign the form to teams, supervisors, locations, and collection targets.");
  }

  function openImportWorkspace() {
    setReadinessDialogOpen(false);
    setMobileDeployDialogOpen(false);
    setFormControlsDialogOpen(false);
    setReviewWorkspaceDialogOpen(false);
    setAssignmentWorkspaceDialogOpen(false);
    setQualityWorkspaceDialogOpen(false);
    setImportWorkspaceDialogOpen(true);
    setBuilderResult("Use the form import workspace to download a matching template, map columns, validate records, and import clean data.");
  }

  function openQualityWorkspace() {
    setReadinessDialogOpen(false);
    setMobileDeployDialogOpen(false);
    setFormControlsDialogOpen(false);
    setReviewWorkspaceDialogOpen(false);
    setAssignmentWorkspaceDialogOpen(false);
    setImportWorkspaceDialogOpen(false);
    setQualityWorkspaceDialogOpen(true);
    setBuilderResult("Review data quality flags, affected records, owners, and next actions for this form.");
  }

  function updateAssignmentPlan(patch: Partial<FormAssignmentPlan>) {
    if (!selectedForm) {
      return;
    }
    setFormAssignmentByFormId((current) => ({
      ...current,
      [selectedForm.id]: {
        ...selectedAssignmentPlan,
        ...patch,
        lastUpdatedAt: new Date().toISOString(),
      },
    }));
  }

  function saveAssignmentPlan() {
    if (!selectedForm) {
      return;
    }
    updateAssignmentPlan({});
    setMobileDeploymentAudience(selectedAssignmentPlan.audience);
    setAssignmentWorkspaceDialogOpen(false);
    setBuilderResult(
      `${selectedForm.name} is assigned to ${selectedAssignmentPlan.team} under ${selectedAssignmentPlan.supervisor} for ${selectedAssignmentPlan.locationScope}.`,
    );
    pushToast({
      title: "Assignment plan saved",
      description: `${selectedAssignmentPlan.team} can collect up to ${selectedAssignmentPlan.targetSubmissions} target submissions.`,
      tone: "success",
    });
  }

  function validateImportTemplate() {
    if (!selectedForm) {
      return;
    }
    const nextRun: FormImportRun = {
      id: `${selectedForm.id}-import-${Date.now()}`,
      fileName: `${slugify(selectedForm.name)}-template.xlsx`,
      rows: 75,
      mappedColumns: selectedForm.fields.length,
      validRows: Math.max(70, selectedForm.fields.length ? 72 : 0),
      issueCount: selectedForm.fields.some((field) => field.required) ? 3 : 8,
      status: "validated",
      createdAt: new Date().toISOString(),
    };
    setFormImportRunsByFormId((current) => ({
      ...current,
      [selectedForm.id]: [nextRun, ...(current[selectedForm.id] ?? [])],
    }));
    updateSelectedReadiness({ importTemplateReviewed: true });
    setBuilderResult(`${nextRun.fileName} was validated against ${selectedForm.fields.length} form fields. Fix ${nextRun.issueCount} issue(s) before final import.`);
    pushToast({
      title: "Import template validated",
      description: `${nextRun.validRows} rows are ready after column mapping checks.`,
      tone: "success",
    });
  }

  function markImportAsImported(runId: string) {
    if (!selectedForm) {
      return;
    }
    setFormImportRunsByFormId((current) => ({
      ...current,
      [selectedForm.id]: (current[selectedForm.id] ?? selectedImportRuns).map((run) =>
        run.id === runId ? { ...run, status: "imported", issueCount: 0, validRows: run.rows } : run,
      ),
    }));
    setBuilderResult("Validated records were imported into this form workspace and are ready for review and reporting.");
    pushToast({
      title: "Preview import completed",
      description: "Imported records are now treated as form data in this workspace.",
      tone: "success",
    });
  }

  function resolveQualityFlag(flagId: string) {
    if (!selectedForm) {
      return;
    }
    setFormQualityFlagsByFormId((current) => ({
      ...current,
      [selectedForm.id]: (current[selectedForm.id] ?? selectedQualityFlags).map((flag) =>
        flag.id === flagId ? { ...flag, status: "resolved", affectedRecords: 0 } : flag,
      ),
    }));
    setBuilderResult("Quality flag resolved for this form. Keep monitoring the form before using data in reports.");
    pushToast({
      title: "Quality flag resolved",
      description: "The form quality workspace was updated.",
      tone: "success",
    });
  }

  function runFormReviewAction(action: ReviewAction) {
    if (!selectedForm || !selectedReviewSubmission) {
      pushToast({
        title: "Select a submission first",
        description: "Choose a submission from the review queue before applying a decision.",
        tone: "warning",
      });
      return;
    }
    const trimmedComment = reviewComment.trim();
    if ((action === "request_correction" || action === "reject") && !trimmedComment) {
      pushToast({
        title: "Reviewer note required",
        description: "Explain what field teams need to correct or why the record is rejected.",
        tone: "warning",
      });
      return;
    }
    const nextStatus =
      action === "approve"
        ? "approved"
        : action === "reject"
          ? "rejected"
          : action === "request_correction"
            ? "correction_requested"
            : "under_review";
    const comment = trimmedComment || `Marked as ${formatReviewStatus(nextStatus)} from the form review workspace.`;

    if (token && !isPreview) {
      formReviewMutation.mutate({
        submissionId: selectedReviewSubmission.id,
        action,
        comment,
      });
      return;
    }

    setFormReviewRowsByFormId((current) => {
      const rows = current[selectedForm.id] ?? createPreviewSubmissionRows(selectedForm);
      return {
        ...current,
        [selectedForm.id]: rows.map((submission) =>
          submission.id === selectedReviewSubmission.id
            ? {
                ...submission,
                status: nextStatus,
                payload_json: {
                  ...submission.payload_json,
                  reviewer_note: comment,
                  reviewed_at: new Date().toISOString(),
                },
              }
            : submission,
        ),
      };
    });
    setReviewComment("");
    setBuilderResult(`${selectedReviewSubmission.client_submission_id} is now ${formatReviewStatus(nextStatus)}. Reviewer note: ${comment}`);
    pushToast({
      title: `Preview ${action.replace("_", " ")}`,
      description: selectedReviewSubmission.client_submission_id,
      tone: action === "approve" ? "success" : action === "reject" ? "danger" : "warning",
    });
  }

  const undoLastChange = useCallback(() => {
    const previous = historyPast.at(-1);
    if (!previous || !selectedForm) {
      return;
    }
    setHistoryPast((current) => current.slice(0, -1));
    setHistoryFuture((current) => [selectedForm, ...current.slice(0, 19)]);
    updateSelectedForm(previous, { trackHistory: false });
    setSelectedFieldId(previous.fields[0]?.id ?? "");
  }, [historyPast, selectedForm, updateSelectedForm]);

  const redoLastChange = useCallback(() => {
    const next = historyFuture[0];
    if (!next || !selectedForm) {
      return;
    }
    setHistoryFuture((current) => current.slice(1));
    setHistoryPast((current) => [...current.slice(-19), selectedForm]);
    updateSelectedForm(next, { trackHistory: false });
    setSelectedFieldId(next.fields[0]?.id ?? "");
  }, [historyFuture, selectedForm, updateSelectedForm]);

  function openNewFormDialog() {
    setNewFormDialogOpen(true);
    setNewFormName(selectedSurvey ? `${selectedSurvey.title} form` : "New survey form");
    setNewFormDescription(selectedSurvey?.description ?? "");
    setNewFormChannel("survey_app");
    setNewFormBlocks(["respondent-details", "gps-evidence"]);
  }

  function createGuidedForm() {
    if (!selectedProject || !selectedSurvey) {
      setBuilderResult("Select a project and survey before creating a form.");
      pushToast({
        title: "Project and survey required",
        description: "Choose where this form belongs before continuing.",
        tone: "warning",
      });
      return;
    }
    const formId = `guided-form-${Date.now()}`;
    const pageId = `${formId}-page-1`;
    const selectedBlocks = sectionTemplates.filter((template) => newFormBlocks.includes(template.id));
    const blocks = selectedBlocks.length ? selectedBlocks : sectionTemplates.filter((template) => template.id === "respondent-details");
    const formDescription = newFormDescription.trim();
    const sections: FormSection[] = [];
    const fields: FormField[] = [];
    for (const [index, block] of blocks.entries()) {
      const section = createSection(pageId, block.title);
      const sectionWithDescription = {
        ...section,
        description: index === 0 && formDescription ? formDescription : block.description,
      };
      sections.push(sectionWithDescription);
      fields.push(...block.fields.map((preset) => fieldFromPreset(preset, sectionWithDescription)));
    }
    const nextForm: DynamicForm = {
      id: formId,
      name: newFormName.trim() || `${selectedSurvey.title} form`,
      status: "draft",
      version: 1,
      activeVersion: 0,
      updatedAt: new Date().toISOString(),
      pages: [
        {
          id: pageId,
          title: "Page 1",
          description: formDescription || `Created for ${selectedSurvey.title} via ${
            newFormChannel === "survey_app"
              ? "Survey App"
              : newFormChannel === "web_link"
                ? "Web Link"
                : newFormChannel === "public_link"
                  ? "Public Link"
                  : "XLSForm/ODK"
          }.`,
        },
      ],
      sections,
      fields,
      history: [
        {
          version: 1,
          status: "draft",
          createdAt: new Date().toISOString(),
          summary: "Created from guided form setup",
        },
      ],
    };
    setForms((current) => [nextForm, ...current]);
    setFormControlsByFormId((current) => ({
      ...current,
      [nextForm.id]: createDefaultFormControls(nextForm),
    }));
    setSelectedFormId(nextForm.id);
    setSelectedFieldId(nextForm.fields[0]?.id ?? "");
    setSelectedPageId(pageId);
    setSelectedSectionId(nextForm.sections[0]?.id ?? "");
    setBuilderMode("builder");
    setBuilderFocusPanel("build");
    setBuilderAssistantOpen(true);
    setBuilderAssistantMode("question");
    setNewFormDialogOpen(false);
    setBuilderResult(
      `${nextForm.name} was created for ${selectedProject.name} / ${selectedSurvey.title}. Distribution channel: ${newFormChannel.replace("_", " ")}. Next, add one question or preview the form.`,
    );
    pushToast({
      title: "Guided form created",
      description: "Atlas added the selected blocks and opened the next recommended action.",
      tone: "success",
    });
  }

  function moveField(fieldId: string, direction: -1 | 1) {
    if (!selectedForm) {
      return;
    }
    const currentIndex = selectedForm.fields.findIndex(
      (field) => field.id === fieldId,
    );
    const nextIndex = currentIndex + direction;
    if (
      currentIndex < 0 ||
      nextIndex < 0 ||
      nextIndex >= selectedForm.fields.length
    ) {
      return;
    }
    const nextFields = [...selectedForm.fields];
    const [field] = nextFields.splice(currentIndex, 1);
    if (!field) {
      return;
    }
    nextFields.splice(nextIndex, 0, field);
    updateSelectedForm({
      ...selectedForm,
      fields: nextFields,
      updatedAt: new Date().toISOString(),
    });
  }

  function saveSelectedForm(publish: boolean) {
    if (!selectedForm) {
      return;
    }
    if (!selectedProject || !selectedSurvey) {
      setBuilderResult(
        "Select a project and survey before saving or publishing. Atlas forms must belong to a survey so submissions, indicators, and reports stay traceable.",
      );
      pushToast({
        title: "Survey context required",
        description: "Choose Project, then Survey, then save the form.",
        tone: "warning",
      });
      return;
    }
    if (publish && !readinessReadyForPublish) {
      openReadinessChecklist();
      pushToast({
        title: "Readiness review needed",
        description: "Complete required readiness items before publishing this form.",
        tone: "warning",
      });
      return;
    }
    if (token && !isPreview) {
      publishMutation.mutate({ form: selectedForm, publish });
      return;
    }
    const nextForm = publish
      ? publishForm(selectedForm)
      : createDraftVersion(selectedForm);
    updateSelectedForm(nextForm);
    setBuilderResult(
      publish
        ? `${nextForm.name} is published in preview as version ${nextForm.activeVersion}. Review the phone preview before assigning it to field teams.`
        : `${nextForm.name} was saved as a draft preview version ${nextForm.version}. Continue editing before publishing.`,
    );
    pushToast({
      title: publish ? "Preview form published" : "Preview draft saved",
      description: `${selectedForm.name} was updated in preview mode.`,
      tone: "success",
    });
  }

  function deploySelectedFormToMobileApp() {
    if (!selectedForm) {
      return;
    }
    if (!selectedProject || !selectedSurvey) {
      setBuilderResult(
        "Select a project and survey before deploying. Mobile forms must stay connected to a survey so field submissions sync into the right workspace.",
      );
      pushToast({
        title: "Survey context required",
        description: "Choose Project and Survey before deploying to the mobile app.",
        tone: "warning",
      });
      return;
    }
    if (!selectedForm.fields.length) {
      setBuilderResult(
        "Add at least one question before deploying this form to field officers.",
      );
      pushToast({
        title: "Add questions first",
        description: "Field officers need at least one question before the form can be deployed.",
        tone: "warning",
      });
      return;
    }
    if (!readinessReadyForPublish) {
      openReadinessChecklist();
      pushToast({
        title: "Finish readiness first",
        description: "Complete required readiness items before deploying this form to field officers.",
        tone: "warning",
      });
      return;
    }

    if (token && !isPreview) {
      if (isPersistedSelectedForm && selectedForm.status === "published") {
        const deployment = createMobileDeployment();
        setMobileDeployments((current) => ({
          ...current,
          [selectedForm.id]: deployment,
        }));
        setMobileDeployDialogOpen(false);
        setBuilderResult(
          `${selectedForm.name} is deployed to the Survey App for ${deployment.assignedAudience}. Field officers will see it after syncing their app.`,
        );
        pushToast({
          title: "Deployed to Survey App",
          description: `${selectedForm.name} is ready for assigned field officers after sync.`,
          tone: "success",
        });
        return;
      }

      publishMutation.mutate({
        form: selectedForm,
        publish: true,
        deployToMobile: true,
      });
      return;
    }

    try {
      const deployedForm = deployFormToMobileApp(selectedForm, {
        assignedAudience: mobileDeploymentAudience,
        syncMode: mobileDeploymentSyncMode,
      });
      updateSelectedForm(deployedForm);
      setMobileDeployDialogOpen(false);
      setBuilderResult(
        `${deployedForm.name} is deployed in preview to the Survey App for ${deployedForm.mobileDeployment?.assignedAudience}. Field officers can sync their app and start collection.`,
      );
      pushToast({
        title: "Preview mobile deployment ready",
        description: `${deployedForm.name} is published and deployed to the Survey App in preview mode.`,
        tone: "success",
      });
    } catch {
      setBuilderResult(
        "The form could not be deployed. Add at least one question and try again.",
      );
      pushToast({
        title: "Deployment failed",
        description: "Add questions before deploying this form to mobile.",
        tone: "danger",
      });
    }
  }

  function applyTemplate(template: FormTemplateCard) {
    const nextForm = templateToForm(template);
    setForms((current) => [nextForm, ...current]);
    setFormControlsByFormId((current) => ({
      ...current,
      [nextForm.id]: createDefaultFormControls(nextForm),
    }));
    setSelectedFormId(nextForm.id);
    setSelectedFieldId(nextForm.fields[0]?.id ?? "");
    setBuilderMode("builder");
    setBuilderResult(
      `${template.name} was added to the builder with ${nextForm.fields.length} starter questions. Customize labels, rules, and required fields before publishing.`,
    );
    pushToast({
      title: "Template added to builder",
      description: `${template.name} is ready to customize and publish.`,
      tone: "success",
    });
  }

  useEffect(() => {
    if (!pendingTemplateId) {
      return;
    }
    const template = formTemplates.find(
      (candidate) => candidate.id === pendingTemplateId,
    );
    if (template) {
      applyTemplate(template);
    }
    setPendingTemplateId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingTemplateId, setPendingTemplateId]);

  useEffect(() => {
    if (!initialDraft || initialDraftIdRef.current === initialDraft.id) {
      return;
    }
    initialDraftIdRef.current = initialDraft.id;
    setForms((current) => [initialDraft, ...current.filter((form) => form.id !== initialDraft.id)]);
    setSelectedFormId(initialDraft.id);
    setSelectedFieldId(initialDraft.fields[0]?.id ?? "");
    setSelectedPageId(defaultPages(initialDraft)[0]?.id ?? "");
    setSelectedSectionId(initialDraft.sections[0]?.id ?? "");
    setBuilderMode("builder");
    setBuilderFocusPanel("build");
    setBuilderResult(
      `${initialDraft.name} draft shell was created. Add sections, questions, validation, logic, controls, then review readiness before publishing.`,
    );
  }, [initialDraft]);

  useEffect(() => {
    if (!allForms.length) {
      if (selectedFormId) {
        setSelectedFormId("");
      }
      if (selectedFieldId) {
        setSelectedFieldId("");
      }
      return;
    }
    const currentForm = allForms.find((form) => form.id === selectedFormId);
    if (!currentForm) {
      const firstForm = allForms[0];
      setSelectedFormId(firstForm.id);
      setSelectedFieldId(firstForm.fields[0]?.id ?? "");
    }
  }, [allForms, selectedFieldId, selectedFormId]);

  useEffect(() => {
    if (!selectedForm) {
      return;
    }
    const pages = defaultPages(selectedForm);
    const pageStillValid = pages.some((page) => page.id === selectedPageId);
    const nextPage = pageStillValid ? pages.find((page) => page.id === selectedPageId) : pages[0];
    if (nextPage && nextPage.id !== selectedPageId) {
      setSelectedPageId(nextPage.id);
    }
    const sections = selectedForm.sections.filter((section) => section.pageId === nextPage?.id);
    const sectionStillValid = sections.some((section) => section.id === selectedSectionId);
    const nextSection = sectionStillValid ? sections.find((section) => section.id === selectedSectionId) : sections[0] ?? selectedForm.sections[0];
    if (nextSection && nextSection.id !== selectedSectionId) {
      setSelectedSectionId(nextSection.id);
    }
  }, [selectedForm, selectedPageId, selectedSectionId]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const isUndo = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z" && !event.shiftKey;
      const isRedo = (event.metaKey || event.ctrlKey) && (event.key.toLowerCase() === "y" || (event.shiftKey && event.key.toLowerCase() === "z"));
      if (isUndo) {
        event.preventDefault();
        undoLastChange();
      }
      if (isRedo) {
        event.preventDefault();
        redoLastChange();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [redoLastChange, undoLastChange]);

  useEffect(() => {
    if (!projects.length || selectedProjectId) {
      return;
    }
    setSelectedProjectId(projects[0]?.id ?? "");
  }, [projects, selectedProjectId]);

  useEffect(() => {
    if (!selectedProject) {
      return;
    }
    const surveyStillValid = projectSurveys.some((survey) => survey.id === selectedSurveyId);
    if (!surveyStillValid) {
      setSelectedSurveyId(projectSurveys[0]?.id ?? "");
    }
  }, [projectSurveys, selectedProject, selectedSurveyId]);

  useEffect(() => {
    if (!reviewWorkspaceDialogOpen) {
      return;
    }
    if (!selectedFormReviewRows.length) {
      if (selectedReviewSubmissionId) {
        setSelectedReviewSubmissionId("");
      }
      return;
    }
    const stillSelected = selectedFormReviewRows.some(
      (submission) => submission.id === selectedReviewSubmissionId,
    );
    if (!stillSelected) {
      setSelectedReviewSubmissionId(selectedFormReviewRows[0]?.id ?? "");
    }
  }, [reviewWorkspaceDialogOpen, selectedFormReviewRows, selectedReviewSubmissionId]);

  function addCatalogField(type: FieldType) {
    if (!selectedForm) {
      return;
    }
    const section = activeSection ?? selectedForm.sections[0];
    const sectionId = section?.id ?? "default";
    const field = createField(type, sectionId, section?.pageId ?? activePage?.id);
    updateSelectedForm(addField(selectedForm, field));
    setSelectedFieldId(field.id);
    setRightPanelTab("field");
    setFieldSettingsDialogOpen(true);
    setBuilderResult(
      `${field.label} was added. Edit the label, required setting, and rules in the field settings dialog.`,
    );
    setBuilderAssistantOpen(true);
    setBuilderActionDialogOpen(false);
  }

  function openBuilderAssistant(mode: BuilderAssistantMode, query = "") {
    setBuilderAssistantMode(mode);
    setBuilderAssistantOpen(true);
    setBuilderActionDialogOpen(true);
    if (mode === "question") {
      setSmartFieldQuery(query);
    }
  }

  function openFieldSettings(fieldId: string, tab: RightPanelTab = "field") {
    setSelectedFieldId(fieldId);
    setRightPanelTab(tab);
    setFieldSettingsDialogOpen(true);
  }

  function fieldFromPreset(preset: FieldPreset, section: FormSection): FormField {
    const field = createField(preset.type, section.id, section.pageId);
    return {
      ...field,
      label: preset.label,
      hint: preset.hint,
      required: preset.required ?? field.required,
      options: preset.options ?? field.options,
      validation: { ...field.validation, ...preset.validation },
      variableName: preset.id.replaceAll("-", "_"),
    };
  }

  function addPresetField(preset: FieldPreset, targetSection?: FormSection) {
    if (!selectedForm) {
      return;
    }
    const section = targetSection ?? activeSection ?? selectedForm.sections[0];
    if (!section) {
      return;
    }
    const field = fieldFromPreset(preset, section);
    updateSelectedForm(addField(selectedForm, field));
    openFieldSettings(field.id);
    setBuilderResult(`${preset.label} was added with beginner-friendly defaults.`);
    setBuilderAssistantOpen(true);
    setBuilderActionDialogOpen(false);
  }

  function addSectionTemplate(template: SectionTemplate) {
    if (!selectedForm || !activePage) {
      return;
    }
    const section = createSection(activePage.id, template.title);
    const nextFields = template.fields.map((preset) => fieldFromPreset(preset, section));
    updateSelectedForm({
      ...selectedForm,
      sections: [...selectedForm.sections, { ...section, description: template.description }],
      fields: [...selectedForm.fields, ...nextFields],
      updatedAt: new Date().toISOString(),
    });
    setSelectedSectionId(section.id);
    if (nextFields[0]) {
      openFieldSettings(nextFields[0].id);
    }
    setBuilderResult(`${template.title} was inserted with ${nextFields.length} ready-to-edit questions.`);
    setBuilderAssistantOpen(true);
    setBuilderActionDialogOpen(false);
  }

  function applySmartFieldSetup(kind: "required" | "email" | "phone" | "gps" | "yes_no" | "skip_rule") {
    if (!selectedForm || !selectedField) {
      return;
    }
    const patch: Partial<FormField> =
      kind === "required"
        ? { required: true }
        : kind === "email"
          ? { type: "email", validation: { ...selectedField.validation, pattern: "^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$" }, hint: selectedField.hint || "Enter a valid email address." }
          : kind === "phone"
            ? { type: "phone", validation: { ...selectedField.validation, pattern: "^[0-9+\\-\\s()]{7,}$" }, hint: selectedField.hint || "Enter a valid phone number." }
            : kind === "gps"
              ? { type: "gps", required: true, validation: { ...selectedField.validation, accuracyMax: 25 }, hint: selectedField.hint || "Capture GPS with acceptable accuracy before submitting." }
              : kind === "yes_no"
                ? { type: "radio", options: ["Yes", "No"], hint: selectedField.hint || "Choose one response." }
                : {
                    logic: [
                      ...(selectedField.logic ?? []),
                      {
                        id: `${selectedField.id}-show-${Date.now()}`,
                        kind: "show",
                        expression: "${previous_answer} = 'Yes'",
                        message: "Show this question only when the previous answer is Yes.",
                      },
                    ],
                  };
    updateSelectedForm(updateField(selectedForm, selectedField.id, patch));
    setRightPanelTab(kind === "skip_rule" ? "logic" : "field");
    setBuilderResult("Smart setup was applied to the selected field.");
    setBuilderAssistantOpen(true);
    setBuilderActionDialogOpen(false);
  }

  function addBuilderPage() {
    if (!selectedForm) {
      return;
    }
    const page = createPage(`Page ${selectedPages.length + 1}`);
    const nextForm = addPage(selectedForm, page);
    updateSelectedForm(nextForm);
    setSelectedPageId(page.id);
    setSelectedSectionId(nextForm.sections.find((section) => section.pageId === page.id)?.id ?? "");
    setBuilderResult(`${page.title} was added. Add sections and questions for this survey step.`);
  }

  function addBuilderSection() {
    if (!selectedForm || !activePage) {
      return;
    }
    const section = createSection(activePage.id, `Section ${activeSections.length + 1}`);
    updateSelectedForm(addSection(selectedForm, section));
    setSelectedSectionId(section.id);
    setBuilderResult(`${section.title} was added to ${activePage.title}.`);
  }

  function duplicateBuilderPage(pageId: string) {
    if (!selectedForm) {
      return;
    }
    const nextForm = duplicatePage(selectedForm, pageId);
    updateSelectedForm(nextForm);
    const duplicatedPage = defaultPages(nextForm).at(-1);
    setSelectedPageId(duplicatedPage?.id ?? pageId);
    setBuilderResult("The page, its sections, and its questions were duplicated into a new draft page.");
  }

  function duplicateBuilderSection(sectionId: string) {
    if (!selectedForm) {
      return;
    }
    const nextForm = duplicateSection(selectedForm, sectionId);
    updateSelectedForm(nextForm);
    const duplicatedSection = nextForm.sections.at(-1);
    setSelectedSectionId(duplicatedSection?.id ?? sectionId);
    setBuilderResult("The section and its questions were duplicated.");
  }

  function movePage(pageId: string, direction: -1 | 1) {
    if (!selectedForm) {
      return;
    }
    const index = selectedPages.findIndex((page) => page.id === pageId);
    const target = selectedPages[index + direction];
    if (!target) {
      return;
    }
    updateSelectedForm(reorderPages(selectedForm, pageId, target.id));
  }

  function moveSection(sectionId: string, direction: -1 | 1) {
    if (!selectedForm) {
      return;
    }
    const index = activeSections.findIndex((section) => section.id === sectionId);
    const target = activeSections[index + direction];
    if (!target) {
      return;
    }
    updateSelectedForm(reorderSections(selectedForm, sectionId, target.id));
  }

  function archiveSelectedForm(): void {
    if (!selectedForm) {
      return;
    }
    const nextForm = {
      ...selectedForm,
      status: "archived" as const,
      updatedAt: new Date().toISOString(),
    };
    updateSelectedForm(nextForm);
    setBuilderResult(
      `${nextForm.name} is archived in preview. It remains visible for reference but should not be assigned to new field work.`,
    );
    pushToast({
      title: "Preview form archived",
      description: `${nextForm.name} was archived in the local preview workspace.`,
      tone: "warning",
    });
  }

  function onDragEnd(event: DragEndEvent) {
    if (!selectedForm || !event.over || event.active.id === event.over.id) {
      return;
    }
    updateSelectedForm(
      reorderFields(
        selectedForm,
        String(event.active.id),
        String(event.over.id),
      ),
    );
  }

  const selectedFormWorkbook = selectedForm
    ? toXlsFormWorkbook(selectedForm)
    : null;
  const selectedFormCompatibility = selectedForm
    ? getCollectionCompatibility(selectedForm)
    : null;
  const activeCompatibility =
    serverCompatibilityQuery.data ??
    (selectedFormCompatibility
      ? {
          xlsform_ready: selectedFormCompatibility.xlsFormReady,
          mobile_app_ready: selectedFormCompatibility.mobileAppReady,
          web_form_ready: selectedFormCompatibility.webFormReady,
          media_field_count: selectedFormCompatibility.mediaCount,
          warnings: selectedFormCompatibility.warnings,
        }
      : null);
  const assistantTitle =
    builderAssistantMode === "question"
      ? "Add smart questions"
      : builderAssistantMode === "section"
        ? "Add a ready section"
        : builderAssistantMode === "preview"
          ? "Preview the form"
          : builderAssistantMode === "logic"
            ? "Apply smart logic"
            : "Check readiness";
  const assistantDescription =
    builderAssistantMode === "question"
      ? "Choose what you want to collect. Atlas will add the right field type with beginner-friendly defaults."
      : builderAssistantMode === "section"
        ? "Insert a complete section for common M&E workflows, then edit only what needs to change."
        : builderAssistantMode === "preview"
          ? "Check how the form feels for enumerators or respondents before publishing."
          : builderAssistantMode === "logic"
            ? "Apply a common rule to the selected field without writing code."
            : "Confirm mobile readiness, XLSForm compatibility, media fields, and publish/export actions.";
  const smartCanvasAction = useMemo(() => {
    const fields = selectedForm?.fields ?? [];
    const hasIdentity = fields.some((field) => /name|respondent|beneficiary/i.test(field.label));
    const hasGpsOrEvidence = fields.some((field) =>
      ["gps", "geolocation", "map", "geofence", "photo", "image", "video", "audio", "file", "signature"].includes(field.type),
    );
    const hasLogic = fields.some((field) => field.logic?.length);
    if (!selectedForm || !activeSections.length) {
      return {
        description: "Start with a clear section so questions stay organized.",
        label: "Add first section",
        mode: "section" as BuilderAssistantMode,
        query: "",
      };
    }
    if (!fields.length || !hasIdentity) {
      return {
        description: "Collect the person, beneficiary, or respondent identity first.",
        label: "Add respondent details",
        mode: "question" as BuilderAssistantMode,
        query: "name",
      };
    }
    if (!hasGpsOrEvidence) {
      return {
        description: "Add location or evidence fields before sending teams to the field.",
        label: "Add GPS and evidence",
        mode: "section" as BuilderAssistantMode,
        query: "",
      };
    }
    if (fields.length >= 5 && !hasLogic) {
      return {
        description: "Use smart logic to hide questions, require answers, or simplify branches.",
        label: "Add smart logic",
        mode: "logic" as BuilderAssistantMode,
        query: "",
      };
    }
    return {
      description: "The structure looks ready. Preview it before publishing.",
      label: "Preview form",
      mode: "preview" as BuilderAssistantMode,
      query: "",
    };
  }, [activeSections.length, selectedForm]);
  const formBuilderFocused = builderMode === "builder" && Boolean(selectedForm);

  useEffect(() => {
    if (formBuilderFocused) {
      setSidebarCollapsed(true);
    }
  }, [formBuilderFocused, setSidebarCollapsed]);

  return (
    <section aria-labelledby="forms-title" className={cn("space-y-5", formBuilderFocused && "space-y-3")}>
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Forms
          </p>
          <h1
            id="forms-title"
            className={cn("mt-2 font-semibold tracking-tight", formBuilderFocused ? "text-xl" : "text-2xl")}
          >
            Survey form builder
          </h1>
          <p className={cn("mt-1 max-w-3xl text-sm leading-6 text-muted-foreground", formBuilderFocused && "sr-only")}>
            Select the project and survey first, then build clear, offline-ready
            forms your field team can use confidently on mobile devices.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => {
              if (
                token &&
                !isPreview &&
                !isPersistedSelectedForm
              ) {
                setBuilderResult(
                  "Save this form to the backend before requesting a backend XLSForm export. Draft-only forms can still be reviewed in the on-screen preview.",
                );
                pushToast({
                  title: "Save form first",
                  description:
                    "Backend export is available after the form is saved.",
                  tone: "warning",
                });
                return;
              }
              const surveyRows = selectedFormWorkbook?.survey.length ?? 0;
              setBuilderResult(
                `${selectedForm?.name ?? "Form"} is ready to export with ${surveyRows} survey rows, ${selectedFormWorkbook?.choices.length ?? 0} choices, and XLSForm-compatible settings.`,
              );
              pushToast({
                title: "Export prepared",
                description: `${selectedForm?.name ?? "Form"} is ready as JSON and XLSForm with ${surveyRows} survey rows.`,
                tone: "success",
              });
              if (
                isPersistedSelectedForm &&
                token &&
                !isPreview
              ) {
                void xlsFormQuery.refetch();
              }
            }}
            type="button"
          >
            <FileDown aria-hidden="true" />
            Export
          </Button>
          <Button
            onClick={() => {
              setBuilderResult(
                "Opening the form import workspace for template download, column mapping, validation, and governed import.",
              );
              pushToast({
                title: "Opening import workspace",
                description:
                  "Download the form template, map spreadsheet columns, validate rows, and import clean data.",
                tone: "neutral",
              });
              openImportWorkspace();
            }}
            type="button"
          >
            <FileUp aria-hidden="true" />
            Import
          </Button>
          <Button onClick={() => setBuilderMode("templates")} type="button">
            <Star aria-hidden="true" />
            Template
          </Button>
          <Button onClick={openNewFormDialog} type="button" variant="primary">
            <Plus aria-hidden="true" />
            New form
          </Button>
        </div>
      </div>

      {formBuilderFocused ? (
        <section className="rounded-lg border bg-panel px-3 py-2">
          <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_220px_220px_auto] lg:items-center">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{selectedForm?.name}</p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {selectedProject?.name ?? "Project"} / {selectedSurvey?.title ?? "Survey"} / {selectedForm?.fields.length ?? 0} fields
              </p>
            </div>
            <label className="text-xs">
              <span className="sr-only">Project</span>
              <Select
                value={selectedProject?.id ?? ""}
                onChange={(event) => {
                  setSelectedProjectId(event.target.value);
                  const firstSurvey = surveys.find((survey) => survey.project_id === event.target.value);
                  setSelectedSurveyId(firstSurvey?.id ?? "");
                }}
              >
                {projects.length ? (
                  projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)
                ) : (
                  <option value="">No projects yet</option>
                )}
              </Select>
            </label>
            <label className="text-xs">
              <span className="sr-only">Survey</span>
              <Select
                value={selectedSurvey?.id ?? ""}
                onChange={(event) => setSelectedSurveyId(event.target.value)}
              >
                {projectSurveys.length ? (
                  projectSurveys.map((survey) => <option key={survey.id} value={survey.id}>{survey.title}</option>)
                ) : (
                  <option value="">No surveys in project</option>
                )}
              </Select>
            </label>
            <Badge tone={selectedForm?.status === "published" ? "success" : "neutral"}>
              {selectedForm?.status ?? "draft"}
            </Badge>
          </div>
        </section>
      ) : (
      <section className="surface-premium rounded-2xl p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Required creation flow
            </p>
            <h2 className="mt-2 text-lg font-semibold">
              Project, Survey, Form, Publish, Deploy
            </h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
              Forms are now collection tools inside surveys. This keeps every
              submission connected to the correct project, M&E activity,
              indicator set, team, and report.
            </p>
          </div>
          <div className="grid min-w-0 flex-1 gap-3 md:grid-cols-[1fr_1fr_auto]">
            <label className="text-sm">
              <span className="mb-1 block font-medium">Step 1: Project</span>
              <Select
                value={selectedProject?.id ?? ""}
                onChange={(event) => {
                  setSelectedProjectId(event.target.value);
                  const firstSurvey = surveys.find((survey) => survey.project_id === event.target.value);
                  setSelectedSurveyId(firstSurvey?.id ?? "");
                }}
              >
                {projects.length ? (
                  projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)
                ) : (
                  <option value="">No projects yet</option>
                )}
              </Select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Step 2: Survey</span>
              <Select
                value={selectedSurvey?.id ?? ""}
                onChange={(event) => setSelectedSurveyId(event.target.value)}
              >
                {projectSurveys.length ? (
                  projectSurveys.map((survey) => <option key={survey.id} value={survey.id}>{survey.title}</option>)
                ) : (
                  <option value="">No surveys in project</option>
                )}
              </Select>
            </label>
            <Button
              className="md:self-end"
              onClick={() => setShowWorkflowDetails((current) => !current)}
              type="button"
              variant="secondary"
            >
              <ClipboardList aria-hidden="true" />
              {showWorkflowDetails ? "Hide steps" : "Show steps"}
            </Button>
          </div>
        </div>
        {showWorkflowDetails ? <div className="mt-4 grid gap-2 text-xs text-muted-foreground md:grid-cols-5">
          {["Select project", "Select survey", "Create form", "Publish form", "Deploy to app"].map((step, index) => (
            <div key={step} className="rounded-lg border bg-panel px-3 py-2">
              <span className="font-semibold text-foreground">Step {index + 1}</span>
              <span className="mt-1 block">{step}</span>
            </div>
          ))}
        </div> : null}
      </section>
      )}

      {builderResult ? (
        <section
          className={cn(
            "border border-success/30 bg-success/10",
            formBuilderFocused ? "rounded-lg px-3 py-2" : "rounded-2xl p-4",
          )}
          aria-live="polite"
        >
          <div className="flex items-start gap-2">
            <Check
              aria-hidden="true"
              className="mt-0.5 shrink-0 text-success"
              size={formBuilderFocused ? 15 : 18}
            />
            <div>
              <h2 className={cn("font-semibold", formBuilderFocused ? "sr-only" : "text-sm")}>Builder result</h2>
              <p className={cn("text-muted-foreground", formBuilderFocused ? "line-clamp-1 text-xs" : "mt-1 text-sm leading-6")}>
                {builderResult}
              </p>
            </div>
          </div>
        </section>
      ) : null}

      <Modal
        description="Choose the survey context and how the form will be used. Atlas will create a smart starter form and suggest the next action."
        onOpenChange={setNewFormDialogOpen}
        open={newFormDialogOpen}
        title="Create a new survey form"
      >
        <div className="flex-1 overflow-y-auto p-5 product-scrollbar">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block font-medium">1. Project</span>
              <Select
                value={selectedProject?.id ?? ""}
                onChange={(event) => {
                  setSelectedProjectId(event.target.value);
                  const firstSurvey = surveys.find((survey) => survey.project_id === event.target.value);
                  setSelectedSurveyId(firstSurvey?.id ?? "");
                }}
              >
                {projects.length ? (
                  projects.map((project) => (
                    <option key={project.id} value={project.id}>{project.name}</option>
                  ))
                ) : (
                  <option value="">No projects available</option>
                )}
              </Select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">2. Survey</span>
              <Select
                value={selectedSurvey?.id ?? ""}
                onChange={(event) => setSelectedSurveyId(event.target.value)}
              >
                {projectSurveys.length ? (
                  projectSurveys.map((survey) => (
                    <option key={survey.id} value={survey.id}>{survey.title}</option>
                  ))
                ) : (
                  <option value="">No surveys in this project</option>
                )}
              </Select>
            </label>
          </div>

          <label className="mt-4 block text-sm">
            <span className="mb-1 block font-medium">Form name</span>
            <Input
              onChange={(event) => setNewFormName(event.target.value)}
              placeholder="Example: Baseline household survey"
              value={newFormName}
            />
          </label>

          <label className="mt-4 block text-sm">
            <span className="mb-1 block font-medium">Form description</span>
            <Textarea
              className="min-h-24"
              onChange={(event) => setNewFormDescription(event.target.value)}
              placeholder="Explain what this form collects, who will use it, and what the data will support."
              value={newFormDescription}
            />
          </label>

          <div className="mt-4">
            <p className="text-sm font-medium">3. Distribution channel</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Choose the main way this form will be shared with enumerators or respondents.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {([
                ["survey_app", Smartphone, "Survey App", "Best for trained field teams collecting data on mobile."],
                ["web_link", MonitorSmartphone, "Web link", "Best for browser-based staff collection."],
                ["public_link", FileUp, "Public form", "Best for controlled external respondent access."],
                ["xlsform", FileDown, "XLSForm / ODK", "Best for Kobo or ODK-style migration and review."],
              ] satisfies [DistributionChannel, typeof Type, string, string][]).map(([channel, Icon, label, helper]) => (
                <button
                  className={cn(
                    "rounded-lg border bg-background p-3 text-left transition hover:border-primary/40 hover:bg-primary/5",
                    newFormChannel === channel && "border-primary/50 bg-primary/10",
                  )}
                  key={channel}
                  onClick={() => setNewFormChannel(channel)}
                  type="button"
                >
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <Icon aria-hidden="true" className="text-primary" size={16} />
                    {label}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">{helper}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <p className="text-sm font-medium">4. Recommended starting blocks</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Atlas will add these sections first. You can remove, edit, or add more later.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {sectionTemplates.map((template) => {
                const checked = newFormBlocks.includes(template.id);
                return (
                  <button
                    className={cn(
                      "rounded-lg border bg-background p-3 text-left transition hover:border-primary/40 hover:bg-primary/5",
                      checked && "border-primary/50 bg-primary/10",
                    )}
                    key={template.id}
                    onClick={() =>
                      setNewFormBlocks((current) =>
                        current.includes(template.id)
                          ? current.filter((id) => id !== template.id)
                          : [...current, template.id],
                      )
                    }
                    type="button"
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold">{template.title}</span>
                      {checked ? <Check aria-hidden="true" className="text-primary" size={16} /> : null}
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                      {template.description} · {template.fields.length} fields
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-5 rounded-lg border bg-background p-3">
            <p className="text-sm font-semibold">What happens next</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Atlas creates the starter form, opens the simplified canvas, and shows one next action: add a question, add a section, preview, or check readiness.
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2 border-t px-5 py-4 sm:flex-row sm:justify-end">
          <Button onClick={() => setNewFormDialogOpen(false)} type="button" variant="ghost">
            Cancel
          </Button>
          <Button
            disabled={!selectedProject || !selectedSurvey || !newFormName.trim()}
            onClick={createGuidedForm}
            type="button"
            variant="primary"
          >
            Continue to builder
          </Button>
        </div>
      </Modal>

      <Modal
        contentClassName="max-w-3xl"
        description="Check the required project, survey, controls, workflow, quality, and deployment items before the form is published."
        onOpenChange={setReadinessDialogOpen}
        open={readinessDialogOpen}
        title="Form readiness checklist"
      >
        <div className="flex-1 overflow-y-auto p-5 product-scrollbar">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border bg-primary/5 p-4">
              <p className="text-xs font-medium text-muted-foreground">Readiness progress</p>
              <p className="mt-2 text-2xl font-semibold">
                {readinessCompletedCount}/{readinessItems.length}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Checks complete</p>
            </div>
            <div className="rounded-lg border bg-background p-4">
              <p className="text-xs font-medium text-muted-foreground">Required blockers</p>
              <p className="mt-2 text-2xl font-semibold">{readinessRequiredMissingCount}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {readinessRequiredMissingCount ? "Resolve before publishing" : "Ready to publish"}
              </p>
            </div>
            <div className="rounded-lg border bg-background p-4">
              <p className="text-xs font-medium text-muted-foreground">Form context</p>
              <p className="mt-2 truncate text-sm font-semibold">{selectedForm?.name ?? "No form selected"}</p>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {selectedProject?.name ?? "No project"} / {selectedSurvey?.title ?? "No survey"}
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-2">
            {readinessItems.map((item) => (
              <div
                className={cn(
                  "flex flex-col gap-3 rounded-lg border bg-background p-3 sm:flex-row sm:items-center sm:justify-between",
                  item.complete ? "border-success/20" : item.required ? "border-warning/35 bg-warning/5" : "border-border",
                )}
                key={item.id}
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span
                    className={cn(
                      "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
                      item.complete
                        ? "border-success/25 bg-success/10 text-success"
                        : "border-warning/25 bg-warning/10 text-warning",
                    )}
                  >
                    {item.complete ? <Check aria-hidden="true" size={16} /> : <ClipboardList aria-hidden="true" size={16} />}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold">{item.label}</p>
                      <Badge tone={item.required ? "warning" : "neutral"}>
                        {item.required ? "Required" : "Recommended"}
                      </Badge>
                      {item.complete ? <Badge tone="success">Complete</Badge> : null}
                    </div>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.description}</p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {item.id === "controls" || item.id === "workflow" || item.id === "quality" ? (
                    <Button
                      onClick={() => {
                        setReadinessDialogOpen(false);
                        setFormControlsTab(
                          item.id === "workflow"
                            ? "workflow"
                            : item.id === "quality"
                              ? "quality"
                              : "overview",
                        );
                        setFormControlsDialogOpen(true);
                      }}
                      size="sm"
                      type="button"
                      variant="secondary"
                    >
                      Open controls
                    </Button>
                  ) : null}
                  {item.id === "mobile-preview" && !item.complete ? (
                    <Button
                      onClick={() => {
                        setPreviewMode("mobile");
                        updateSelectedReadiness({ mobilePreviewChecked: true });
                      }}
                      size="sm"
                      type="button"
                      variant="secondary"
                    >
                      Mark checked
                    </Button>
                  ) : null}
                  {item.id === "pilot-test" && !item.complete ? (
                    <Button
                      onClick={() => updateSelectedReadiness({ pilotTestCompleted: true })}
                      size="sm"
                      type="button"
                      variant="secondary"
                    >
                      Mark pilot done
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-lg border bg-panel p-4">
            <div className="flex items-center gap-2">
              <ShieldCheck aria-hidden="true" className="text-primary" size={17} />
              <h3 className="text-sm font-semibold">Manager preparation</h3>
            </div>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {[
                ["enumeratorBriefingReady", "Enumerator briefing is ready"],
                ["importTemplateReviewed", "Excel import template reviewed"],
              ].map(([key, label]) => {
                const stateKey = key as keyof Pick<FormReadinessState, "enumeratorBriefingReady" | "importTemplateReviewed">;
                return (
                  <button
                    className={cn(
                      "flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-left text-sm transition hover:border-primary/40 hover:bg-primary/5",
                      selectedFormReadiness[stateKey] && "border-success/25 bg-success/10",
                    )}
                    key={key}
                    onClick={() =>
                      updateSelectedReadiness(
                        stateKey === "enumeratorBriefingReady"
                          ? { enumeratorBriefingReady: !selectedFormReadiness.enumeratorBriefingReady }
                          : { importTemplateReviewed: !selectedFormReadiness.importTemplateReviewed },
                      )
                    }
                    type="button"
                  >
                    <Check
                      aria-hidden="true"
                      className={selectedFormReadiness[stateKey] ? "text-success" : "text-muted-foreground"}
                      size={16}
                    />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2 border-t px-5 py-4 sm:flex-row sm:justify-between">
          <Button
            onClick={() => {
              setReadinessDialogOpen(false);
              setFormControlsTab("overview");
              setFormControlsDialogOpen(true);
            }}
            type="button"
            variant="secondary"
          >
            <ShieldCheck aria-hidden="true" />
            Open controls
          </Button>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={() => setReadinessDialogOpen(false)} type="button" variant="ghost">
              Close
            </Button>
            <Button onClick={openDeploymentCenter} type="button" variant="secondary">
              <Smartphone aria-hidden="true" />
              Deployment center
            </Button>
            <Button
              disabled={!readinessReadyForPublish || publishMutation.isPending}
              onClick={() => {
                setReadinessDialogOpen(false);
                saveSelectedForm(true);
              }}
              type="button"
              variant="primary"
            >
              <UploadCloud aria-hidden="true" />
              {publishMutation.isPending ? "Publishing" : "Publish form"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        contentClassName="max-w-4xl"
        description="Publish the current form version, choose who receives it, and make it available in the Survey App after sync."
        onOpenChange={setMobileDeployDialogOpen}
        open={mobileDeployDialogOpen}
        title="Publish and deployment center"
      >
        <div className="flex-1 overflow-y-auto p-5 product-scrollbar">
          <div className="grid gap-3 md:grid-cols-4">
            {[
              ["Readiness", `${readinessCompletedCount}/${readinessItems.length}`, readinessRequiredMissingCount ? `${readinessRequiredMissingCount} required left` : "Ready"],
              ["Version", `v${selectedForm?.version ?? 0}`, selectedForm?.status ?? "Draft"],
              ["Audience", mobileDeploymentAudience, mobileDeploymentSyncMode.replace("_", " ")],
              ["Mobile status", selectedMobileDeployment ? "Deployed" : "Not sent", selectedMobileDeployment?.deployedAt ? new Date(selectedMobileDeployment.deployedAt).toLocaleString() : "Pending"],
            ].map(([label, value, helper]) => (
              <div className="rounded-lg border bg-background p-3" key={label}>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-2 truncate text-sm font-semibold">{value}</p>
                <p className="mt-1 truncate text-xs text-muted-foreground">{helper}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-lg border bg-background p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-primary/10 text-primary">
                <Smartphone aria-hidden="true" size={18} />
              </span>
              <div>
                <p className="text-sm font-semibold">
                  {selectedForm?.name ?? "Selected form"}
                </p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {selectedProject?.name ?? "Project"} / {selectedSurvey?.title ?? "Survey"} / {selectedForm?.fields.length ?? 0} questions
                </p>
              </div>
            </div>
          </div>

          <label className="mt-4 block text-sm">
            <span className="mb-1 block font-medium">Who should receive it?</span>
            <Select
              value={mobileDeploymentAudience}
              onChange={(event) => setMobileDeploymentAudience(event.target.value)}
            >
              <option value="All assigned field officers">All assigned field officers</option>
              <option value="Survey team only">Survey team only</option>
              <option value="Supervisors for testing">Supervisors for testing</option>
            </Select>
          </label>

          <div className="mt-4">
            <p className="text-sm font-medium">Mobile sync mode</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {([
                ["offline_first", "Offline first", "Best for field teams with unreliable internet."],
                ["online_required", "Online required", "Use when submissions must be sent immediately."],
              ] satisfies ["offline_first" | "online_required", string, string][]).map(([mode, label, helper]) => (
                <button
                  className={cn(
                    "rounded-lg border bg-background p-3 text-left transition hover:border-primary/40 hover:bg-primary/5",
                    mobileDeploymentSyncMode === mode && "border-primary/50 bg-primary/10",
                  )}
                  key={mode}
                  onClick={() => setMobileDeploymentSyncMode(mode)}
                  type="button"
                >
                  <span className="text-sm font-semibold">{label}</span>
                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">{helper}</span>
                </button>
              ))}
            </div>
          </div>

          <div
            className={cn(
              "mt-4 rounded-lg border p-3",
              readinessReadyForPublish
                ? "border-success/25 bg-success/10"
                : "border-warning/25 bg-warning/10",
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">
                  {readinessReadyForPublish ? "Ready for field rollout" : "Readiness items need attention"}
                </p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {readinessReadyForPublish
                    ? "Publish and deploy this version, then ask field officers to sync the Survey App and open Assigned forms."
                    : "Complete required checks before this form is sent to field teams."}
                </p>
              </div>
              <Button onClick={openReadinessChecklist} size="sm" type="button" variant="secondary">
                View checklist
              </Button>
            </div>
            {!readinessReadyForPublish ? (
              <ul className="mt-3 space-y-1 text-xs leading-5 text-muted-foreground">
                {readinessItems
                  .filter((item) => item.required && !item.complete)
                  .map((item) => (
                    <li key={item.id}>- {item.label}</li>
                  ))}
              </ul>
            ) : null}
          </div>
        </div>
        <div className="flex flex-col gap-2 border-t px-5 py-4 sm:flex-row sm:justify-between">
          <Button
            onClick={openAssignmentWorkspace}
            type="button"
            variant="secondary"
          >
            Assignment workspace
          </Button>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={() => setMobileDeployDialogOpen(false)} type="button" variant="ghost">
              Cancel
            </Button>
            <Button
              disabled={!selectedForm || publishMutation.isPending || !readinessReadyForPublish}
              onClick={deploySelectedFormToMobileApp}
              type="button"
              variant="primary"
            >
              <Smartphone aria-hidden="true" />
              {publishMutation.isPending ? "Deploying" : "Deploy to Survey App"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        contentClassName="max-w-4xl"
        description="Assign this form to the right team, supervisor, location scope, and collection targets before field rollout."
        onOpenChange={setAssignmentWorkspaceDialogOpen}
        open={assignmentWorkspaceDialogOpen}
        title={`Assignment workspace${selectedForm ? `: ${selectedForm.name}` : ""}`}
      >
        <div className="flex-1 overflow-y-auto p-5 product-scrollbar">
          <div className="grid gap-3 md:grid-cols-4">
            {[
              ["Audience", selectedAssignmentPlan.audience, "Who receives the form"],
              ["Team", selectedAssignmentPlan.team, "Collection group"],
              ["Target", String(selectedAssignmentPlan.targetSubmissions), "Expected submissions"],
              ["Briefing", selectedAssignmentPlan.briefingComplete ? "Complete" : "Pending", "Enumerator readiness"],
            ].map(([label, value, helper]) => (
              <div className="rounded-lg border bg-background p-3" key={label}>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-2 truncate text-sm font-semibold">{value}</p>
                <p className="mt-1 truncate text-xs text-muted-foreground">{helper}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-medium">
              Collection team
              <Input
                className="mt-2"
                onChange={(event) => updateAssignmentPlan({ team: event.target.value })}
                value={selectedAssignmentPlan.team}
              />
            </label>
            <label className="block text-sm font-medium">
              Supervisor
              <Input
                className="mt-2"
                onChange={(event) => updateAssignmentPlan({ supervisor: event.target.value })}
                value={selectedAssignmentPlan.supervisor}
              />
            </label>
            <label className="block text-sm font-medium">
              Location scope
              <Input
                className="mt-2"
                onChange={(event) => updateAssignmentPlan({ locationScope: event.target.value })}
                value={selectedAssignmentPlan.locationScope}
              />
            </label>
            <label className="block text-sm font-medium">
              Mobile audience
              <Select
                value={selectedAssignmentPlan.audience}
                onChange={(event) => updateAssignmentPlan({ audience: event.target.value })}
              >
                <option value="All assigned field officers">All assigned field officers</option>
                <option value="Survey team only">Survey team only</option>
                <option value="Supervisors for testing">Supervisors for testing</option>
              </Select>
            </label>
            <label className="block text-sm font-medium">
              Target submissions
              <Input
                className="mt-2"
                min={0}
                onChange={(event) => updateAssignmentPlan({ targetSubmissions: Number(event.target.value) || 0 })}
                type="number"
                value={selectedAssignmentPlan.targetSubmissions}
              />
            </label>
            <label className="block text-sm font-medium">
              Daily target
              <Input
                className="mt-2"
                min={0}
                onChange={(event) => updateAssignmentPlan({ dailyTarget: Number(event.target.value) || 0 })}
                type="number"
                value={selectedAssignmentPlan.dailyTarget}
              />
            </label>
            <label className="block text-sm font-medium md:col-span-2">
              Pilot enumerator
              <Input
                className="mt-2"
                onChange={(event) => updateAssignmentPlan({ pilotEnumerator: event.target.value })}
                value={selectedAssignmentPlan.pilotEnumerator}
              />
            </label>
          </div>

          <button
            className={cn(
              "mt-5 flex w-full items-center gap-3 rounded-lg border bg-background p-3 text-left transition hover:border-primary/40 hover:bg-primary/5",
              selectedAssignmentPlan.briefingComplete && "border-success/25 bg-success/10",
            )}
            onClick={() => updateAssignmentPlan({ briefingComplete: !selectedAssignmentPlan.briefingComplete })}
            type="button"
          >
            <Check
              aria-hidden="true"
              className={selectedAssignmentPlan.briefingComplete ? "text-success" : "text-muted-foreground"}
              size={18}
            />
            <span>
              <span className="block text-sm font-semibold">Enumerator briefing completed</span>
              <span className="mt-1 block text-xs text-muted-foreground">
                Confirm the team understands the form, sync process, correction workflow, and collection targets.
              </span>
            </span>
          </button>
        </div>
        <div className="flex flex-col gap-2 border-t px-5 py-4 sm:flex-row sm:justify-between">
          <Button onClick={openDeploymentCenter} type="button" variant="secondary">
            <Smartphone aria-hidden="true" />
            Deployment center
          </Button>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={() => setAssignmentWorkspaceDialogOpen(false)} type="button" variant="ghost">
              Close
            </Button>
            <Button onClick={saveAssignmentPlan} type="button" variant="primary">
              Save assignment
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        contentClassName="max-w-5xl"
        description="Download a matching spreadsheet template, map columns to form questions, validate records, and import clean data into this form."
        onOpenChange={setImportWorkspaceDialogOpen}
        open={importWorkspaceDialogOpen}
        title={`Import workspace${selectedForm ? `: ${selectedForm.name}` : ""}`}
      >
        <div className="grid min-h-0 flex-1 gap-0 overflow-hidden lg:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="min-h-0 border-b bg-background/70 p-5 lg:border-b-0 lg:border-r">
            <div className="rounded-lg border bg-panel p-4">
              <FileUp aria-hidden="true" className="text-primary" />
              <h3 className="mt-3 text-sm font-semibold">Template and mapping</h3>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Use the template generated from this form so uploaded Excel or CSV files match question names, required fields, and validation rules.
              </p>
              <div className="mt-4 grid gap-2">
                <Button
                  onClick={() => {
                    updateSelectedReadiness({ importTemplateReviewed: true });
                    setBuilderResult(`${selectedForm?.name ?? "Form"} import template is ready with ${selectedFormWorkbook?.survey.length ?? 0} XLSForm survey rows.`);
                    pushToast({
                      title: "Template ready",
                      description: "Use Export for the XLSForm workbook, or validate a spreadsheet from this workspace.",
                      tone: "success",
                    });
                  }}
                  type="button"
                  variant="secondary"
                >
                  <FileDown aria-hidden="true" />
                  Prepare template
                </Button>
                <Button onClick={validateImportTemplate} type="button" variant="primary">
                  <Check aria-hidden="true" />
                  Validate sample file
                </Button>
              </div>
            </div>

            <div className="mt-4 rounded-lg border bg-panel p-4">
              <h3 className="text-sm font-semibold">Import readiness</h3>
              <div className="mt-3 space-y-2 text-sm">
                {[
                  ["Questions", String(selectedForm?.fields.length ?? 0)],
                  ["Required columns", String(selectedForm?.fields.filter((field) => field.required).length ?? 0)],
                  ["XLSForm rows", String(selectedFormWorkbook?.survey.length ?? 0)],
                  ["Template checked", selectedFormReadiness.importTemplateReviewed ? "Yes" : "No"],
                ].map(([label, value]) => (
                  <div className="flex items-center justify-between rounded-md border bg-background px-3 py-2" key={label}>
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-semibold">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          <section className="min-h-0 overflow-y-auto p-5 product-scrollbar">
            <div className="rounded-lg border bg-panel">
              <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
                <div>
                  <h3 className="text-sm font-semibold">Column mapping preview</h3>
                  <p className="mt-1 text-xs text-muted-foreground">Each spreadsheet column should map to one form question.</p>
                </div>
                <Badge tone="accent">{selectedForm?.fields.length ?? 0} fields</Badge>
              </div>
              <div className="max-h-64 overflow-y-auto product-scrollbar">
                {(selectedForm?.fields ?? []).map((field) => (
                  <div className="grid gap-2 border-b px-4 py-3 text-sm md:grid-cols-[minmax(0,1fr)_140px_100px]" key={field.id}>
                    <span className="truncate font-medium">{field.label}</span>
                    <span className="text-muted-foreground">{field.type.replace("_", " ")}</span>
                    <Badge tone={field.required ? "warning" : "neutral"}>{field.required ? "Required" : "Optional"}</Badge>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 rounded-lg border bg-panel">
              <div className="border-b px-4 py-3">
                <h3 className="text-sm font-semibold">Recent import runs</h3>
              </div>
              <div className="divide-y">
                {selectedImportRuns.map((run) => (
                  <div className="grid gap-3 px-4 py-3 md:grid-cols-[minmax(0,1fr)_auto]" key={run.id}>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold">{run.fileName}</p>
                        <Badge tone={getImportStatusTone(run.status)}>{run.status.replace("_", " ")}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {run.rows} rows · {run.mappedColumns} mapped columns · {run.validRows} valid · {run.issueCount} issues · {new Date(run.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <Button
                      disabled={run.status === "imported"}
                      onClick={() => markImportAsImported(run.id)}
                      size="sm"
                      type="button"
                      variant={run.status === "imported" ? "secondary" : "primary"}
                    >
                      {run.status === "imported" ? "Imported" : "Import clean rows"}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
        <div className="flex flex-col gap-2 border-t px-5 py-4 sm:flex-row sm:justify-between">
          <Button onClick={openQualityWorkspace} type="button" variant="secondary">
            <Check aria-hidden="true" />
            Open quality workspace
          </Button>
          <Button onClick={() => setImportWorkspaceDialogOpen(false)} type="button" variant="ghost">
            Close
          </Button>
        </div>
      </Modal>

      <Modal
        contentClassName="max-w-5xl"
        description="Monitor form-level quality flags, assign owners, resolve issues, and move clean records toward reporting."
        onOpenChange={setQualityWorkspaceDialogOpen}
        open={qualityWorkspaceDialogOpen}
        title={`Data quality workspace${selectedForm ? `: ${selectedForm.name}` : ""}`}
      >
        <div className="flex-1 overflow-y-auto p-5 product-scrollbar">
          <div className="grid gap-3 md:grid-cols-4">
            {[
              ["Open flags", selectedQualityFlags.filter((flag) => flag.status !== "resolved").length],
              ["Critical / high", selectedQualityFlags.filter((flag) => ["Critical", "High"].includes(flag.severity)).length],
              ["Needs review", selectedFormReviewRows.filter((submission) => ["submitted", "under_review", "correction_requested"].includes(submission.status)).length],
              ["Approved", selectedFormReviewRows.filter((submission) => submission.status === "approved").length],
            ].map(([label, value]) => (
              <div className="rounded-lg border bg-background p-3" key={label}>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-2 text-2xl font-semibold">{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
            <section className="rounded-lg border bg-panel">
              <div className="border-b px-4 py-3">
                <h3 className="text-sm font-semibold">Quality flags</h3>
              </div>
              <div className="divide-y">
                {selectedQualityFlags.map((flag) => (
                  <div className="grid gap-3 px-4 py-3 md:grid-cols-[minmax(0,1fr)_auto]" key={flag.id}>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold">{flag.label}</p>
                        <Badge tone={getQualitySeverityTone(flag.severity)}>{flag.severity}</Badge>
                        <Badge tone={flag.status === "resolved" ? "success" : "warning"}>{flag.status}</Badge>
                      </div>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        {flag.affectedRecords} affected records · Owner: {flag.owner}. {flag.recommendation}
                      </p>
                    </div>
                    <Button
                      disabled={flag.status === "resolved"}
                      onClick={() => resolveQualityFlag(flag.id)}
                      size="sm"
                      type="button"
                      variant="secondary"
                    >
                      {flag.status === "resolved" ? "Resolved" : "Resolve"}
                    </Button>
                  </div>
                ))}
              </div>
            </section>

            <aside className="rounded-lg border bg-background p-4">
              <h3 className="text-sm font-semibold">Active checks</h3>
              <div className="mt-3 space-y-2">
                {selectedFormControls.data_quality_rules
                  .filter((rule) => rule.enabled)
                  .map((rule) => (
                    <div className="rounded-md border bg-panel px-3 py-2 text-sm" key={rule.id}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{rule.label}</span>
                        <Badge tone={rule.severity === "critical" ? "danger" : rule.severity === "high" ? "warning" : "neutral"}>
                          {rule.severity}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {rule.rule_type.replaceAll("_", " ")}
                        {rule.expression ? ` · ${rule.expression}` : ""}
                      </p>
                    </div>
                  ))}
              </div>
              <Button className="mt-4 w-full" onClick={openSubmissionReviewWorkspace} type="button" variant="primary">
                <Eye aria-hidden="true" />
                Review records
              </Button>
            </aside>
          </div>
        </div>
        <div className="flex flex-col gap-2 border-t px-5 py-4 sm:flex-row sm:justify-between">
          <Button onClick={openImportWorkspace} type="button" variant="secondary">
            <FileUp aria-hidden="true" />
            Import workspace
          </Button>
          <Button onClick={() => setQualityWorkspaceDialogOpen(false)} type="button" variant="ghost">
            Close
          </Button>
        </div>
      </Modal>

      <Modal
        contentClassName="max-w-6xl"
        description="Review synced records for this form, approve clean data, or return records that need correction."
        onOpenChange={setReviewWorkspaceDialogOpen}
        open={reviewWorkspaceDialogOpen}
        title={`Submission review workspace${selectedForm ? `: ${selectedForm.name}` : ""}`}
      >
        <div className="grid min-h-0 flex-1 gap-0 overflow-hidden lg:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="min-h-0 border-b bg-background/70 lg:border-b-0 lg:border-r">
            <div className="grid grid-cols-2 gap-2 border-b p-4">
              {[
                ["Waiting", selectedFormReviewRows.filter((submission) => ["submitted", "under_review", "resubmitted"].includes(submission.status)).length],
                ["Approved", selectedFormReviewRows.filter((submission) => submission.status === "approved").length],
                ["Correction", selectedFormReviewRows.filter((submission) => submission.status === "correction_requested").length],
                ["Offline", selectedFormReviewRows.filter((submission) => submission.offline_created).length],
              ].map(([label, value]) => (
                <div className="rounded-lg border bg-panel p-3" key={label}>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="mt-1 text-xl font-semibold">{value}</p>
                </div>
              ))}
            </div>
            <div className="max-h-[56vh] space-y-2 overflow-y-auto p-4 product-scrollbar">
              {formSubmissionsQuery.isLoading && !isPreview ? (
                <div className="rounded-lg border bg-panel p-4 text-sm text-muted-foreground">Loading submissions...</div>
              ) : null}
              {!selectedFormReviewRows.length && !formSubmissionsQuery.isLoading ? (
                <div className="rounded-lg border bg-panel p-4 text-sm leading-5 text-muted-foreground">
                  No submissions are available for this form yet. Once field officers sync records, they will appear here for review.
                </div>
              ) : null}
              {selectedFormReviewRows.map((submission) => (
                <button
                  className={cn(
                    "w-full rounded-lg border bg-panel p-3 text-left transition hover:border-primary/40 hover:bg-primary/5",
                    selectedReviewSubmission?.id === submission.id && "border-primary/50 bg-primary/10",
                  )}
                  key={submission.id}
                  onClick={() => setSelectedReviewSubmissionId(submission.id)}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{submission.client_submission_id}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(submission.submitted_at).toLocaleString()}
                      </p>
                    </div>
                    <Badge tone={getReviewStatusTone(submission.status)}>
                      {formatReviewStatus(submission.status)}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    GPS {submission.latitude.toFixed(4)}, {submission.longitude.toFixed(4)}
                    {submission.offline_created ? " · offline draft" : ""}
                  </p>
                </button>
              ))}
            </div>
          </aside>

          <section className="min-h-0 overflow-y-auto p-5 product-scrollbar">
            {selectedReviewSubmission ? (
              <div className="space-y-4">
                <div className="flex flex-col gap-3 rounded-lg border bg-panel p-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold">{selectedReviewSubmission.client_submission_id}</h3>
                      <Badge tone={getReviewStatusTone(selectedReviewSubmission.status)}>
                        {formatReviewStatus(selectedReviewSubmission.status)}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Captured {new Date(selectedReviewSubmission.captured_at).toLocaleString()} · Synced {new Date(selectedReviewSubmission.sync_received_at).toLocaleString()}
                    </p>
                  </div>
                  <Button
                    disabled={formReviewMutation.isPending}
                    onClick={() => runFormReviewAction("start_review")}
                    type="button"
                    variant="secondary"
                  >
                    Start review
                  </Button>
                </div>

                <div className="grid gap-3 md:grid-cols-4">
                  {[
                    ["Enumerator", selectedReviewSubmission.field_officer_id],
                    ["Server sequence", String(selectedReviewSubmission.server_sequence)],
                    ["GPS accuracy", selectedReviewSubmission.accuracy ? `${selectedReviewSubmission.accuracy}m` : "Not reported"],
                    ["Offline", selectedReviewSubmission.offline_created ? "Yes" : "No"],
                  ].map(([label, value]) => (
                    <div className="rounded-lg border bg-background p-3" key={label}>
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="mt-2 truncate text-sm font-semibold">{value}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-lg border bg-panel">
                  <div className="border-b px-4 py-3">
                    <p className="text-sm font-semibold">Response values</p>
                  </div>
                  <div className="divide-y">
                    {Object.entries(selectedReviewSubmission.payload_json).map(([key, value]) => (
                      <div className="grid gap-2 px-4 py-3 text-sm md:grid-cols-[220px_minmax(0,1fr)]" key={key}>
                        <span className="font-medium text-muted-foreground">{key}</span>
                        <span className="break-words">
                          {typeof value === "object" && value !== null ? JSON.stringify(value) : String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <label className="block text-sm font-medium">
                  Reviewer note
                  <Textarea
                    className="mt-2 min-h-24"
                    onChange={(event) => setReviewComment(event.target.value)}
                    placeholder="Add a short decision note, especially when returning or rejecting a record."
                    value={reviewComment}
                  />
                </label>

                <div className="flex flex-col gap-2 rounded-lg border bg-background p-3 sm:flex-row sm:justify-end">
                  <Button
                    disabled={formReviewMutation.isPending}
                    onClick={() => runFormReviewAction("request_correction")}
                    type="button"
                    variant="secondary"
                  >
                    Return for correction
                  </Button>
                  <Button
                    disabled={formReviewMutation.isPending}
                    onClick={() => runFormReviewAction("reject")}
                    type="button"
                    variant="danger"
                  >
                    Reject
                  </Button>
                  <Button
                    disabled={formReviewMutation.isPending}
                    onClick={() => runFormReviewAction("approve")}
                    type="button"
                    variant="primary"
                  >
                    Approve record
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex h-full min-h-72 items-center justify-center rounded-lg border bg-panel p-6 text-center">
                <div>
                  <Eye aria-hidden="true" className="mx-auto text-muted-foreground" size={28} />
                  <p className="mt-3 text-sm font-semibold">No record selected</p>
                  <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">
                    Select a synced submission from the queue to inspect values, add a reviewer note, approve clean data, or return records that need correction.
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>
      </Modal>

      <Modal
        contentClassName="max-w-6xl"
        description="Set the reference data, access, review workflow, data quality, audit, and version rules for this specific survey form."
        onOpenChange={setFormControlsDialogOpen}
        open={formControlsDialogOpen}
        title={`Form Controls${selectedForm ? `: ${selectedForm.name}` : ""}`}
      >
        <div className="border-b px-4 py-3">
          <div className="flex gap-1 overflow-x-auto rounded-md border bg-background p-1 product-scrollbar">
            {formControlsTabs.map(([tab, Icon, label]) => (
              <button
                className={cn(
                  "inline-flex h-9 shrink-0 items-center gap-2 rounded px-3 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground",
                  formControlsTab === tab && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                )}
                key={tab}
                onClick={() => setFormControlsTab(tab)}
                type="button"
              >
                <Icon aria-hidden="true" size={14} />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 product-scrollbar">
          {formControlsTab === "overview" ? (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-4">
                {[
                  ["Reference lists", selectedFormControls.reference_bindings.length, "Controlled values attached"],
                  ["Access rules", selectedFormControls.permission_rules.length, "Roles, users, or teams"],
                  ["Workflow stages", selectedFormControls.workflow_stages.length, selectedFormControls.governance.approval_workflow],
                  ["Quality checks", selectedFormControls.data_quality_rules.filter((rule) => rule.enabled).length, "Active controls"],
                ].map(([label, value, helper]) => (
                  <div className="rounded-lg border bg-background p-3" key={label}>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="mt-2 text-2xl font-semibold">{value}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
                  </div>
                ))}
              </div>
              <div className="grid gap-3 lg:grid-cols-3">
                <button
                  className="rounded-lg border bg-emerald-500/5 p-4 text-left transition hover:border-primary/40 hover:bg-primary/5"
                  onClick={() => setFormControlsTab("reference")}
                  type="button"
                >
                  <Database aria-hidden="true" className="text-emerald-700 dark:text-emerald-300" />
                  <p className="mt-3 text-sm font-semibold">Bind official lists</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Attach districts, schools, facilities, communities, beneficiaries, donor codes, or custom master data to form questions.
                  </p>
                </button>
                <button
                  className="rounded-lg border bg-sky-500/5 p-4 text-left transition hover:border-primary/40 hover:bg-primary/5"
                  onClick={() => setFormControlsTab("workflow")}
                  type="button"
                >
                  <Workflow aria-hidden="true" className="text-sky-700 dark:text-sky-300" />
                  <p className="mt-3 text-sm font-semibold">Choose the review path</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Use simple approval, supervisor review, data manager review, or correction workflows before records become approved data.
                  </p>
                </button>
                <button
                  className="rounded-lg border bg-amber-500/5 p-4 text-left transition hover:border-primary/40 hover:bg-primary/5"
                  onClick={() => setFormControlsTab("quality")}
                  type="button"
                >
                  <Check aria-hidden="true" className="text-amber-700 dark:text-amber-300" />
                  <p className="mt-3 text-sm font-semibold">Protect data quality</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Set blocking rules for required fields, GPS, duplicate records, consent, duration, and logical consistency.
                  </p>
                </button>
              </div>
            </div>
          ) : null}

          {formControlsTab === "reference" ? (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
              <section className="rounded-lg border bg-background p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold">Reference data bindings</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Bind form questions to official lists and prevent uncontrolled free text.
                    </p>
                  </div>
                  <Button onClick={() => addReferenceBinding()} size="sm" type="button" variant="primary">
                    <Database aria-hidden="true" />
                    Bind selected question
                  </Button>
                </div>
                <div className="mt-4 space-y-3">
                  {selectedFormControls.reference_bindings.length ? (
                    selectedFormControls.reference_bindings.map((binding) => (
                      <div className="rounded-lg border bg-panel p-3" key={binding.id}>
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{binding.question_label}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {binding.source} · v{binding.version} · {binding.enforce_controlled_values ? "controlled values enforced" : "free text allowed"}
                            </p>
                          </div>
                          <Button
                            aria-label={`Remove reference binding for ${binding.question_label}`}
                            onClick={() =>
                              updateSelectedFormControls((controls) => ({
                                ...controls,
                                reference_bindings: controls.reference_bindings.filter((candidate) => candidate.id !== binding.id),
                              }))
                            }
                            size="icon"
                            type="button"
                            variant="ghost"
                          >
                            <Trash2 aria-hidden="true" />
                          </Button>
                        </div>
                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                          <label className="text-sm font-medium">
                            Reference list
                            <Input
                              className="mt-2"
                              onChange={(event) =>
                                updateSelectedFormControls((controls) => ({
                                  ...controls,
                                  reference_bindings: controls.reference_bindings.map((candidate) =>
                                    candidate.id === binding.id
                                      ? { ...candidate, reference_list_name: event.target.value, changed_since_publish: true }
                                      : candidate,
                                  ),
                                }))
                              }
                              value={binding.reference_list_name}
                            />
                          </label>
                          <label className="text-sm font-medium">
                            Parent list
                            <Input
                              className="mt-2"
                              onChange={(event) =>
                                updateSelectedFormControls((controls) => ({
                                  ...controls,
                                  reference_bindings: controls.reference_bindings.map((candidate) =>
                                    candidate.id === binding.id
                                      ? { ...candidate, parent_reference: event.target.value || null, changed_since_publish: true }
                                      : candidate,
                                  ),
                                }))
                              }
                              placeholder="Example: Region"
                              value={binding.parent_reference ?? ""}
                            />
                          </label>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-lg border border-dashed bg-panel p-5 text-center">
                      <Database aria-hidden="true" className="mx-auto text-primary" />
                      <p className="mt-3 text-sm font-semibold">No reference lists attached yet</p>
                      <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-muted-foreground">
                        Select a district, community, school, facility, beneficiary, or donor-code question, then bind it to an official list.
                      </p>
                    </div>
                  )}
                </div>
              </section>
              <aside className="rounded-lg border bg-panel p-4">
                <h3 className="text-sm font-semibold">Available questions</h3>
                <div className="mt-3 space-y-2">
                  {(selectedForm?.fields ?? []).slice(0, 12).map((field) => (
                    <button
                      className={cn(
                        "w-full rounded-md border bg-background p-2 text-left text-xs transition hover:border-primary/40 hover:bg-primary/5",
                        selectedField?.id === field.id && "border-primary/40 bg-primary/10",
                      )}
                      key={field.id}
                      onClick={() => {
                        setSelectedFieldId(field.id);
                        addReferenceBinding(field);
                      }}
                      type="button"
                    >
                      <span className="block font-semibold">{field.label}</span>
                      <span className="mt-1 block text-muted-foreground">{field.type.replace("_", " ")}</span>
                    </button>
                  ))}
                </div>
              </aside>
            </div>
          ) : null}

          {formControlsTab === "permissions" ? (
            <div className="space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-sm font-semibold">Per-form access control</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Permissions inherit from the project, then M&E Managers can narrow access for this form.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() =>
                      updateSelectedFormControls((controls) => ({
                        ...controls,
                        permission_rules: createDefaultFormControls(selectedForm).permission_rules,
                      }))
                    }
                    size="sm"
                    type="button"
                    variant="secondary"
                  >
                    Standard roles
                  </Button>
                  <Button
                    onClick={() =>
                      updateSelectedFormControls((controls) => ({
                        ...controls,
                        permission_rules: [
                          ...controls.permission_rules,
                          {
                            subject_type: "role",
                            subject_name: "External Reviewer",
                            permissions: ["view_form", "view_submissions"],
                            location_scope: "project",
                            can_approve_own_submission: false,
                            read_only: true,
                          },
                        ],
                      }))
                    }
                    size="sm"
                    type="button"
                    variant="primary"
                  >
                    Add reviewer
                  </Button>
                </div>
              </div>
              <div className="grid gap-3 lg:grid-cols-3">
                {selectedFormControls.permission_rules.map((rule) => (
                  <div className="rounded-lg border bg-background p-4" key={`${rule.subject_type}-${rule.subject_name}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">{rule.subject_name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {rule.subject_type} · {rule.location_scope}
                        </p>
                      </div>
                      <Badge tone={rule.read_only ? "neutral" : "accent"}>{rule.read_only ? "Read only" : "Active"}</Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {rule.permissions.map((permission) => (
                        <span className="rounded-md border bg-panel px-2 py-1 text-[11px] text-muted-foreground" key={permission}>
                          {permission.replaceAll("_", " ")}
                        </span>
                      ))}
                    </div>
                    <label className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                      <input
                        checked={rule.can_approve_own_submission}
                        onChange={(event) =>
                          updateSelectedFormControls((controls) => ({
                            ...controls,
                            permission_rules: controls.permission_rules.map((candidate) =>
                              candidate.subject_name === rule.subject_name
                                ? { ...candidate, can_approve_own_submission: event.target.checked }
                                : candidate,
                            ),
                          }))
                        }
                        type="checkbox"
                      />
                      Allow own submission approval
                    </label>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {formControlsTab === "workflow" ? (
            <div className="space-y-4">
              <div className="grid gap-2 md:grid-cols-3">
                {([
                  ["simple", "Simple", "Submitted to approved or rejected"],
                  ["standard", "Standard", "Supervisor and data manager review"],
                  ["correction", "Correction", "Return, resubmit, review, approve"],
                ] satisfies ["simple" | "standard" | "correction", string, string][]).map(([preset, label, helper]) => (
                  <button
                    className={cn(
                      "rounded-lg border bg-background p-3 text-left transition hover:border-primary/40 hover:bg-primary/5",
                      selectedFormControls.governance.approval_workflow === preset && "border-primary/50 bg-primary/10",
                    )}
                    key={preset}
                    onClick={() => applyWorkflowPreset(preset)}
                    type="button"
                  >
                    <span className="text-sm font-semibold">{label}</span>
                    <span className="mt-1 block text-xs leading-5 text-muted-foreground">{helper}</span>
                  </button>
                ))}
              </div>
              <div className="rounded-lg border bg-background p-4">
                <h3 className="text-sm font-semibold">Workflow stages</h3>
                <div className="mt-4 space-y-3">
                  {selectedFormControls.workflow_stages.map((stage, index) => (
                    <div className="grid gap-3 rounded-lg border bg-panel p-3 md:grid-cols-[40px_minmax(0,1fr)_160px]" key={stage.id}>
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                        {index + 1}
                      </span>
                      <div>
                        <p className="text-sm font-semibold">{stage.name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {stage.reviewer_roles.join(", ")} · {stage.reviewer_location_scope}
                        </p>
                      </div>
                      <label className="text-xs font-medium">
                        SLA hours
                        <Input
                          className="mt-1"
                          min={1}
                          onChange={(event) =>
                            updateSelectedFormControls((controls) => ({
                              ...controls,
                              workflow_stages: controls.workflow_stages.map((candidate) =>
                                candidate.id === stage.id ? { ...candidate, sla_hours: Number(event.target.value) || 1 } : candidate,
                              ),
                            }))
                          }
                          type="number"
                          value={stage.sla_hours}
                        />
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {formControlsTab === "quality" ? (
            <div className="space-y-3">
              {selectedFormControls.data_quality_rules.map((rule) => (
                <div className="grid gap-3 rounded-lg border bg-background p-4 md:grid-cols-[minmax(0,1fr)_160px_120px]" key={rule.id}>
                  <label className="flex items-start gap-3">
                    <input
                      checked={rule.enabled}
                      className="mt-1"
                      onChange={(event) =>
                        updateSelectedFormControls((controls) => ({
                          ...controls,
                          data_quality_rules: controls.data_quality_rules.map((candidate) =>
                            candidate.id === rule.id ? { ...candidate, enabled: event.target.checked } : candidate,
                          ),
                        }))
                      }
                      type="checkbox"
                    />
                    <span>
                      <span className="block text-sm font-semibold">{rule.label}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {rule.rule_type.replaceAll("_", " ")} · {rule.fields.length ? rule.fields.join(", ") : "all relevant fields"}
                      </span>
                    </span>
                  </label>
                  <label className="text-xs font-medium">
                    Severity
                    <Select
                      className="mt-1"
                      onChange={(event) =>
                        updateSelectedFormControls((controls) => ({
                          ...controls,
                          data_quality_rules: controls.data_quality_rules.map((candidate) =>
                            candidate.id === rule.id
                              ? { ...candidate, severity: event.target.value as FormControlsSettings["data_quality_rules"][number]["severity"] }
                              : candidate,
                          ),
                        }))
                      }
                      value={rule.severity}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </Select>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-medium">
                    <input
                      checked={rule.blocking}
                      onChange={(event) =>
                        updateSelectedFormControls((controls) => ({
                          ...controls,
                          data_quality_rules: controls.data_quality_rules.map((candidate) =>
                            candidate.id === rule.id ? { ...candidate, blocking: event.target.checked } : candidate,
                          ),
                        }))
                      }
                      type="checkbox"
                    />
                    Block submit
                  </label>
                </div>
              ))}
            </div>
          ) : null}

          {formControlsTab === "governance" ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <label className="text-sm font-medium">
                Form status
                <Select
                  className="mt-2"
                  onChange={(event) =>
                    updateSelectedFormControls((controls) => ({
                      ...controls,
                      governance: {
                        ...controls.governance,
                        form_status: event.target.value as FormControlsSettings["governance"]["form_status"],
                      },
                    }))
                  }
                  value={selectedFormControls.governance.form_status}
                >
                  <option value="draft">Draft</option>
                  <option value="testing">Testing</option>
                  <option value="published">Published</option>
                  <option value="suspended">Suspended</option>
                  <option value="archived">Archived</option>
                </Select>
              </label>
              <label className="text-sm font-medium">
                Minimum quality score
                <Input
                  className="mt-2"
                  max={100}
                  min={0}
                  onChange={(event) =>
                    updateSelectedFormControls((controls) => ({
                      ...controls,
                      governance: { ...controls.governance, minimum_quality_score: Number(event.target.value) || 0 },
                    }))
                  }
                  type="number"
                  value={selectedFormControls.governance.minimum_quality_score}
                />
              </label>
              <label className="text-sm font-medium">
                Review SLA hours
                <Input
                  className="mt-2"
                  min={1}
                  onChange={(event) =>
                    updateSelectedFormControls((controls) => ({
                      ...controls,
                      governance: { ...controls.governance, review_sla_hours: Number(event.target.value) || 1 },
                    }))
                  }
                  type="number"
                  value={selectedFormControls.governance.review_sla_hours}
                />
              </label>
              <label className="text-sm font-medium">
                Data retention days
                <Input
                  className="mt-2"
                  min={1}
                  onChange={(event) =>
                    updateSelectedFormControls((controls) => ({
                      ...controls,
                      governance: { ...controls.governance, data_retention_days: Number(event.target.value) || 1 },
                    }))
                  }
                  type="number"
                  value={selectedFormControls.governance.data_retention_days}
                />
              </label>
              <div className="rounded-lg border bg-background p-4 lg:col-span-2">
                <h3 className="text-sm font-semibold">Governance switches</h3>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  {([
                    ["require_gps_capture", "Require GPS capture"],
                    ["require_timestamp_capture", "Require timestamp capture"],
                    ["require_enumerator_assignment", "Require enumerator assignment"],
                    ["require_supervisor_review", "Require supervisor review"],
                    ["export_restricted", "Restrict exports"],
                    ["sensitive_field_masking", "Mask sensitive fields"],
                    ["pii_tagging_required", "Require PII tagging"],
                    ["consent_required", "Require consent"],
                    ["auto_lock_after_approval", "Auto-lock after approval"],
                    ["auto_archive_after_project_closure", "Auto-archive after project closure"],
                  ] satisfies [keyof FormControlsSettings["governance"], string][]).map(([key, label]) => (
                    <label className="flex items-center gap-2 rounded-md border bg-panel px-3 py-2 text-sm" key={String(key)}>
                      <input
                        checked={Boolean(selectedFormControls.governance[key])}
                        onChange={(event) =>
                          updateSelectedFormControls((controls) => ({
                            ...controls,
                            governance: { ...controls.governance, [key]: event.target.checked },
                          }))
                        }
                        type="checkbox"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {formControlsTab === "audit" ? (
            <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
              <section className="rounded-lg border bg-background p-4">
                <ShieldCheck aria-hidden="true" className="text-primary" />
                <h3 className="mt-3 text-sm font-semibold">Immutable audit trail</h3>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Audit records cannot be deleted. High-risk events require a reason and exports are restricted to approved roles.
                </p>
                <Badge className="mt-3" tone={selectedFormControls.audit.immutable ? "success" : "danger"}>
                  {selectedFormControls.audit.immutable ? "Immutable" : "Not immutable"}
                </Badge>
              </section>
              <section className="rounded-lg border bg-background p-4">
                <h3 className="text-sm font-semibold">Tracked events</h3>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {selectedFormControls.audit.tracked_events.map((event) => (
                    <span className="rounded-md border bg-panel px-2 py-1 text-[11px] text-muted-foreground" key={event}>
                      {event.replaceAll("_", " ")}
                    </span>
                  ))}
                </div>
                <h3 className="mt-5 text-sm font-semibold">Reason required</h3>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {selectedFormControls.audit.reason_required_events.map((event) => (
                    <span className="rounded-md border border-warning/30 bg-warning/10 px-2 py-1 text-[11px]" key={event}>
                      {event.replaceAll("_", " ")}
                    </span>
                  ))}
                </div>
              </section>
            </div>
          ) : null}

          {formControlsTab === "versions" ? (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
              <section className="rounded-lg border bg-background p-4">
                <h3 className="text-sm font-semibold">Version rules</h3>
                <div className="mt-3 grid gap-2">
                  {([
                    ["editing_published_creates_draft", "Editing a published form creates a new draft"],
                    ["preserve_submission_version_link", "Submissions stay linked to the collected version"],
                    ["compare_versions_enabled", "Version comparison is enabled"],
                    ["reference_lists_version_aware", "Reference lists are version-aware"],
                    ["archived_versions_viewable", "Archived versions stay viewable for audit"],
                  ] satisfies [keyof FormControlsSettings["versioning"], string][]).map(([key, label]) => (
                    <label className="flex items-center gap-2 rounded-md border bg-panel px-3 py-2 text-sm" key={String(key)}>
                      <input
                        checked={selectedFormControls.versioning[key]}
                        onChange={(event) =>
                          updateSelectedFormControls((controls) => ({
                            ...controls,
                            versioning: { ...controls.versioning, [key]: event.target.checked },
                          }))
                        }
                        type="checkbox"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </section>
              <aside className="rounded-lg border bg-panel p-4">
                <h3 className="text-sm font-semibold">Current form history</h3>
                <div className="mt-3 space-y-2">
                  {(selectedForm?.history ?? [{ version: selectedForm?.version ?? 1, status: selectedForm?.status ?? "draft", createdAt: selectedForm?.updatedAt ?? new Date().toISOString(), summary: "Current draft" }]).map((entry) => (
                    <div className="rounded-md border bg-background px-3 py-2 text-xs" key={`${entry.version}-${entry.createdAt}`}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold">Version {entry.version}</span>
                        <Badge tone={entry.status === "published" ? "success" : "neutral"}>{entry.status}</Badge>
                      </div>
                      <p className="mt-1 text-muted-foreground">{entry.summary}</p>
                    </div>
                  ))}
                </div>
              </aside>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 border-t px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Controls are saved per form and apply to publishing, field assignment, review, export, and audit behavior.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={() => setFormControlsDialogOpen(false)} type="button" variant="ghost">
              Cancel
            </Button>
            <Button
              disabled={!selectedForm || updateControlsMutation.isPending}
              onClick={saveSelectedFormControls}
              type="button"
              variant="primary"
            >
              <ShieldCheck aria-hidden="true" />
              {updateControlsMutation.isPending ? "Saving" : "Save controls"}
            </Button>
          </div>
        </div>
      </Modal>

      {builderMode === "templates" ? (
        <section
          className="surface-premium rounded-2xl p-4"
          aria-labelledby="template-picker-title"
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Create Form → Choose Template → Customize → Publish
              </p>
              <h2
                id="template-picker-title"
                className="mt-2 text-xl font-semibold tracking-tight"
              >
                Choose a ready-made form template
              </h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Templates open directly inside the builder, so teams can
                preview, copy, edit, and publish without leaving the form
                workflow.
              </p>
            </div>
            <Button
              onClick={() => setBuilderMode("builder")}
              type="button"
              variant="ghost"
            >
              Back to builder
            </Button>
          </div>
          <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <label className="relative flex-1">
                  <span className="sr-only">Search form templates</span>
                  <Search
                    aria-hidden="true"
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    size={16}
                  />
                  <Input
                    className="pl-9"
                    onChange={(event) => setTemplateQuery(event.target.value)}
                    placeholder="Search farmer, survey, case, school, vaccination..."
                    value={templateQuery}
                  />
                </label>
              </div>
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1 product-scrollbar">
                {formTemplateCategories.map((category) => (
                  <button
                    className={cn(
                      "inline-flex h-9 shrink-0 items-center rounded-lg border px-3 text-sm font-medium transition",
                      templateCategory === category
                        ? "border-primary bg-primary/10 text-primary"
                        : "bg-background/80 text-muted-foreground hover:text-foreground",
                    )}
                    key={category}
                    onClick={() => setTemplateCategory(category)}
                    type="button"
                  >
                    {category}
                  </button>
                ))}
              </div>
              <p className="mt-2 rounded-lg border bg-panel px-3 py-2 text-xs leading-5 text-muted-foreground">
                {templateCategoryDescriptions[templateCategory] ??
                  "Choose templates by the operational workflow your survey needs to support."}
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {visibleTemplates.map((template) => (
                  <button
                    className={cn(
                      "rounded-2xl border bg-background/80 p-4 text-left transition hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-elevated",
                      selectedTemplate?.id === template.id &&
                        "border-primary/45 bg-primary/5",
                    )}
                    key={template.id}
                    onClick={() => setSelectedTemplateId(template.id)}
                    type="button"
                  >
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl border bg-panel text-primary">
                        <MonitorSmartphone aria-hidden="true" size={18} />
                      </span>
                      {template.featured ? (
                        <Badge tone="accent">Recommended</Badge>
                      ) : (
                        <Badge tone="neutral">{template.category}</Badge>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold">{template.name}</h3>
                    <p className="mt-2 line-clamp-3 text-xs leading-5 text-muted-foreground">
                      {template.description}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span>{template.fields} fields</span>
                      <span>{template.minutes} min setup</span>
                      <span>{template.hasGps ? "GPS" : "No GPS"}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            {selectedTemplate ? (
              <aside className="rounded-2xl border bg-background/80 p-4">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  Live preview
                </p>
                <h3 className="mt-2 text-lg font-semibold">
                  {selectedTemplate.name}
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {selectedTemplate.description}
                </p>
                <div className="mt-4 rounded-[28px] border bg-panel p-3 shadow-line">
                  <div className="mx-auto mb-3 h-1.5 w-16 rounded-full bg-muted" />
                  {templateToForm(selectedTemplate)
                    .fields.slice(0, 5)
                    .map((field, index) => (
                      <div
                        className="mb-3 rounded-xl border bg-background p-3"
                        key={field.id}
                      >
                        <p className="text-[11px] text-muted-foreground">
                          Question {index + 1}
                        </p>
                        <p className="mt-1 text-sm font-medium">
                          {field.label}
                        </p>
                        <div className="mt-2 h-7 rounded-lg bg-muted/70" />
                      </div>
                    ))}
                </div>
                <Button
                  className="mt-4 w-full"
                  onClick={() => applyTemplate(selectedTemplate)}
                  type="button"
                  variant="primary"
                >
                  <Copy aria-hidden="true" />
                  Use Template
                </Button>
              </aside>
            ) : null}
          </div>
        </section>
      ) : null}

      {!allForms.length && builderMode !== "templates" ? (
        <section className="rounded-lg border bg-panel p-6 text-center">
          <ClipboardList
            aria-hidden="true"
            className="mx-auto text-primary"
            size={32}
          />
          <h2 className="mt-4 text-lg font-semibold">
            Create your first operational form
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            This organization has no saved forms yet. Start from a proven
            template, create a blank form, or import an existing XLSForm/CSV
            workflow through Data tools.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Button
              onClick={() => setBuilderMode("templates")}
              type="button"
              variant="secondary"
            >
              <Star aria-hidden="true" />
              Choose template
            </Button>
            <Button onClick={openNewFormDialog} type="button" variant="primary">
              <Plus aria-hidden="true" />
              New form
            </Button>
            <Button
              onClick={() => {
                setBuilderResult(
                  "Opening the form import workspace for governed file import, validation, column mapping, and rollback.",
                );
                openImportWorkspace();
              }}
              type="button"
              variant="secondary"
            >
              <FileUp aria-hidden="true" />
              Import file
            </Button>
          </div>
        </section>
      ) : (
        <div
          className={cn(
            "grid gap-4 xl:h-[calc(100vh-190px)] xl:min-h-[680px] xl:grid-cols-[300px_minmax(0,1fr)_360px] xl:overflow-hidden",
            builderMode === "templates" && "hidden",
          )}
        >
          <section className="rounded-lg border bg-panel p-2 xl:hidden">
            <p className="px-1 pb-2 text-xs font-medium text-muted-foreground">
              Builder view
            </p>
            <div className="grid grid-cols-3 gap-1 rounded-md border bg-background p-1">
              {([
                ["build", ClipboardList, "Build", "Questions"],
                ["structure", PanelsTopLeft, "Structure", "Pages"],
                ["preview", Eye, "Preview", "Test"],
              ] satisfies [BuilderFocusPanel, typeof Type, string, string][]).map(([panel, Icon, label, hint]) => (
                <button
                  className={cn(
                    "flex min-h-12 flex-col items-center justify-center rounded px-2 text-center text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground",
                    builderFocusPanel === panel && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                  )}
                  key={panel}
                  onClick={() => setBuilderFocusPanel(panel)}
                  type="button"
                >
                  <Icon aria-hidden="true" size={15} />
                  <span className="mt-1">{label}</span>
                  <span className={cn("text-[10px] font-normal", builderFocusPanel === panel ? "text-primary-foreground/80" : "text-muted-foreground")}>
                    {hint}
                  </span>
                </button>
              ))}
            </div>
          </section>

          <aside
            className={cn(
              "min-h-0 space-y-4 xl:block xl:overflow-y-auto xl:pr-1 product-scrollbar",
              builderFocusPanel !== "structure" && "hidden",
            )}
          >
            <section className="rounded-lg border bg-panel p-3">
              <div className="flex items-center gap-2">
                <PanelsTopLeft aria-hidden="true" size={18} />
                <h2 className="text-sm font-semibold">Builder workspace</h2>
              </div>
              <div className="mt-3 grid gap-1 rounded-md border bg-background p-1">
                {([
                  ["structure", ClipboardList, "Structure"],
                  ["bank", Plus, "Question bank"],
                  ["templates", Star, "Templates"],
                  ["logic", Workflow, "Logic flows"],
                  ["variables", Variable, "Variables"],
                ] satisfies [LeftPanelTab, typeof Type, string][]).map(([tab, Icon, label]) => (
                  <button
                    key={String(tab)}
                    className={cn(
                      "flex h-8 items-center gap-2 rounded px-2 text-left text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground",
                      leftPanelTab === tab && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                    )}
                    onClick={() => setLeftPanelTab(tab as LeftPanelTab)}
                    aria-label={String(label)}
                    title={String(label)}
                    type="button"
                  >
                    <Icon aria-hidden="true" size={15} />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </section>

            {leftPanelTab === "structure" ? (
              <section className="rounded-lg border bg-panel p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-semibold">Survey structure</h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Workspace, program, project, survey, version, responses.
                    </p>
                  </div>
                  <Button aria-label="Add survey page" onClick={addBuilderPage} size="icon" type="button" variant="ghost">
                    <Plus aria-hidden="true" />
                  </Button>
                </div>
                <div className="mt-3 space-y-2 rounded-md border bg-background p-2 text-xs">
                  {["Workspace", selectedProject?.name ?? "Program", selectedProject?.name ?? "Project", selectedSurvey?.title ?? "Survey", `Version ${selectedForm?.version ?? 1}`, `${selectedForm?.fields.length ?? 0} Responses-ready fields`].map((item, index) => (
                    <div className="flex items-center gap-2" key={`${item}-${index}`}>
                      <span className="flex h-5 w-5 items-center justify-center rounded bg-primary/10 text-[10px] font-semibold text-primary">
                        {index + 1}
                      </span>
                      <span className="truncate text-muted-foreground">{item}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                      Pages
                    </p>
                    <Button onClick={addBuilderPage} size="sm" type="button" variant="secondary">
                      <Plus aria-hidden="true" />
                      Page
                    </Button>
                  </div>
                  {selectedPages.map((page, index) => (
                    <div
                      className={cn(
                        "rounded-md border bg-background p-2",
                        activePage?.id === page.id && "border-primary/40 bg-primary/5",
                      )}
                      key={page.id}
                    >
                      <button
                        className="w-full text-left"
                        onClick={() => setSelectedPageId(page.id)}
                        type="button"
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium">{page.title}</span>
                          <Badge tone="neutral">{selectedForm?.sections.filter((section) => section.pageId === page.id).length ?? 0} sections</Badge>
                        </span>
                        <span className="mt-1 block text-xs text-muted-foreground">{page.description}</span>
                      </button>
                      <div className="mt-2 flex gap-1">
                        <Button aria-label={`Move ${page.title} up`} disabled={index === 0} onClick={() => movePage(page.id, -1)} size="icon" type="button" variant="ghost">
                          <ArrowUp aria-hidden="true" />
                        </Button>
                        <Button aria-label={`Move ${page.title} down`} disabled={index === selectedPages.length - 1} onClick={() => movePage(page.id, 1)} size="icon" type="button" variant="ghost">
                          <ArrowDown aria-hidden="true" />
                        </Button>
                        <Button aria-label={`Duplicate ${page.title}`} onClick={() => duplicateBuilderPage(page.id)} size="icon" type="button" variant="ghost">
                          <Copy aria-hidden="true" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                      Sections on {activePage?.title ?? "page"}
                    </p>
                    <Button onClick={addBuilderSection} size="sm" type="button" variant="secondary">
                      <Plus aria-hidden="true" />
                      Section
                    </Button>
                  </div>
                  {activeSections.map((section, index) => (
                    <div
                      className={cn(
                        "rounded-md border bg-background p-2",
                        activeSection?.id === section.id && "border-primary/40 bg-primary/5",
                      )}
                      key={section.id}
                    >
                      <button
                        className="w-full text-left"
                        onClick={() => setSelectedSectionId(section.id)}
                        type="button"
                      >
                        <span className="text-sm font-medium">{section.title}</span>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {selectedForm?.fields.filter((field) => field.sectionId === section.id).length ?? 0} questions
                        </span>
                      </button>
                      <div className="mt-2 flex gap-1">
                        <Button aria-label={`Move ${section.title} up`} disabled={index === 0} onClick={() => moveSection(section.id, -1)} size="icon" type="button" variant="ghost">
                          <ArrowUp aria-hidden="true" />
                        </Button>
                        <Button aria-label={`Move ${section.title} down`} disabled={index === activeSections.length - 1} onClick={() => moveSection(section.id, 1)} size="icon" type="button" variant="ghost">
                          <ArrowDown aria-hidden="true" />
                        </Button>
                        <Button aria-label={`Duplicate ${section.title}`} onClick={() => duplicateBuilderSection(section.id)} size="icon" type="button" variant="ghost">
                          <Copy aria-hidden="true" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {leftPanelTab === "bank" ? (
              <section className="rounded-lg border bg-panel p-3">
                <div className="mb-3 flex items-center gap-2">
                  <Plus aria-hidden="true" size={18} />
                  <h2 className="text-sm font-semibold">Question bank</h2>
                </div>
                <div className="mb-4 rounded-md border bg-background p-2">
                  <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                    Quick presets
                  </p>
                  <div className="grid gap-1.5">
                    {quickFieldPresets.map((preset) => {
                      const Icon = fieldTypeIcons[preset.type];
                      return (
                        <button
                          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition hover:bg-muted"
                          key={preset.id}
                          onClick={() => addPresetField(preset)}
                          type="button"
                        >
                          <Icon aria-hidden="true" className="text-primary" size={14} />
                          <span>
                            <span className="block font-medium">{preset.label}</span>
                            <span className="block text-muted-foreground">{preset.type.replace("_", " ")}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="space-y-4">
                  {fieldCatalog.map((group) => (
                    <div key={group.group}>
                      <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                        {group.group}
                      </p>
                      <div className="space-y-1.5">
                        {group.fields.map((field) => {
                          const Icon = fieldTypeIcons[field.type];
                          return (
                            <button
                              key={field.type}
                              className="flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left text-sm transition hover:bg-muted"
                              onClick={() => addCatalogField(field.type)}
                              type="button"
                            >
                              <Icon aria-hidden="true" className="text-muted-foreground" size={16} />
                              <span>
                                <span className="block font-medium">{field.label}</span>
                                <span className="block text-xs text-muted-foreground">{field.description}</span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {leftPanelTab === "templates" ? (
              <section className="rounded-lg border border-emerald-200/70 bg-emerald-50/45 p-3 dark:border-emerald-900/55 dark:bg-emerald-950/15">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold">Templates</h2>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      Add a section block or replace the form with a full survey template.
                    </p>
                  </div>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Star aria-hidden="true" size={15} />
                  </span>
                </div>
                <label className="relative mt-3 block">
                  <span className="sr-only">Search builder templates</span>
                  <Search aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                  <Input
                    className="h-9 bg-background pl-8 text-xs"
                    onChange={(event) => setTemplateQuery(event.target.value)}
                    placeholder="Search registration, baseline, health..."
                    value={templateQuery}
                  />
                </label>
                <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1 product-scrollbar">
                  {formTemplateCategories.map((category) => (
                    <button
                      className={cn(
                        "inline-flex h-8 shrink-0 items-center rounded-md border px-2.5 text-xs font-medium transition",
                        templateCategory === category
                          ? "border-primary bg-primary text-primary-foreground"
                          : "bg-background text-muted-foreground hover:border-primary/35 hover:text-foreground",
                      )}
                      key={category}
                      onClick={() => setTemplateCategory(category)}
                      type="button"
                    >
                      {category}
                    </button>
                  ))}
                </div>
                <p className="mt-2 rounded-md border bg-background/80 px-3 py-2 text-xs leading-5 text-muted-foreground">
                  {templateCategoryDescriptions[templateCategory] ??
                    "Choose the template category that best matches the survey activity."}
                </p>
                <div className="mt-4 space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
                    Section blocks
                  </p>
                  {sectionTemplates.map((template) => (
                    <button
                      className="w-full rounded-md border bg-background p-3 text-left transition hover:border-primary/35 hover:bg-primary/5"
                      key={template.id}
                      onClick={() => addSectionTemplate(template)}
                      type="button"
                    >
                      <span className="text-sm font-medium">{template.title}</span>
                      <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                        {template.description} · {template.fields.length} fields
                      </span>
                    </button>
                  ))}
                </div>
                <div className="mt-4 space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700 dark:text-sky-300">
                    Full form templates
                  </p>
                  {visibleTemplates.slice(0, 6).map((template) => (
                    <button
                      className={cn(
                        "w-full rounded-md border bg-background p-3 text-left transition hover:border-primary/35 hover:bg-primary/5",
                        selectedTemplate?.id === template.id && "border-primary/50 bg-primary/10",
                      )}
                      key={template.id}
                      onClick={() => {
                        setSelectedTemplateId(template.id);
                        applyTemplate(template);
                      }}
                      type="button"
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">{template.name}</span>
                        {template.featured ? <Badge tone="accent">Top</Badge> : null}
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                        {template.category} · {template.fields} fields · {template.minutes} min
                      </span>
                    </button>
                  ))}
                  {!visibleTemplates.length ? (
                    <div className="rounded-md border border-dashed bg-background/80 p-3 text-xs leading-5 text-muted-foreground">
                      No templates match this search. Clear the search or choose another category.
                    </div>
                  ) : null}
                </div>
                <Button className="mt-3 w-full" onClick={() => setBuilderMode("templates")} type="button" variant="secondary">
                  <Star aria-hidden="true" />
                  Open full template library
                </Button>
              </section>
            ) : null}

            {leftPanelTab === "logic" ? (
              <section className="rounded-lg border bg-panel p-3">
                <h2 className="text-sm font-semibold">Logic flows</h2>
                <div className="mt-3 space-y-2">
                  {(selectedForm?.fields.filter((field) => field.logic?.length) ?? []).length ? (
                    selectedForm?.fields.filter((field) => field.logic?.length).map((field) => (
                      <button
                        className="w-full rounded-md border bg-background p-3 text-left transition hover:bg-muted"
                        key={field.id}
                        onClick={() => {
                          openFieldSettings(field.id, "logic");
                        }}
                        type="button"
                      >
                        <span className="text-sm font-medium">{field.label}</span>
                        <span className="mt-1 block text-xs text-muted-foreground">{field.logic?.length ?? 0} rule(s)</span>
                      </button>
                    ))
                  ) : (
                    <div className="rounded-md border bg-background p-3 text-xs leading-5 text-muted-foreground">
                      Select a field, open Logic Rules, then add show, require, skip, or dynamic choice rules.
                    </div>
                  )}
                </div>
              </section>
            ) : null}

            {leftPanelTab === "variables" ? (
              <section className="rounded-lg border bg-panel p-3">
                <h2 className="text-sm font-semibold">Variables</h2>
                <div className="mt-3 space-y-2">
                  {selectedForm?.fields.map((field) => (
                    <button
                      className="w-full rounded-md border bg-background p-3 text-left transition hover:bg-muted"
                      key={field.id}
                      onClick={() => {
                        openFieldSettings(field.id, "advanced");
                      }}
                      type="button"
                    >
                      <span className="block truncate font-mono text-xs text-primary">${"{"}{field.variableName ?? field.id}{"}"}</span>
                      <span className="mt-1 block truncate text-xs text-muted-foreground">{field.label}</span>
                    </button>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="rounded-lg border bg-panel p-3">
              <div className="mb-3 flex items-center gap-2">
                <ClipboardList aria-hidden="true" size={18} />
                <h2 className="text-sm font-semibold">Forms</h2>
              </div>
              <div className="space-y-2">
                {allForms.map((form) => (
                  <button
                    key={form.id}
                    className={cn(
                      "w-full rounded-md border px-3 py-3 text-left text-sm transition",
                      selectedForm?.id === form.id
                        ? "border-primary/35 bg-primary/10 text-primary"
                        : "bg-background hover:bg-muted/60",
                    )}
                    onClick={() => {
                      setSelectedFormId(form.id);
                      setSelectedFieldId(form.fields[0]?.id ?? "");
                    }}
                    type="button"
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="block font-medium">{form.name}</span>
                      <Badge tone={form.status === "published" ? "success" : "neutral"}>
                        v{form.version}
                      </Badge>
                    </span>
                    <span className="mt-2 block text-xs text-muted-foreground">
                      {form.fields.length ? `${form.fields.length} questions` : "Saved backend form"} · {form.status}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          </aside>

          {selectedForm ? (
            <div
              className={cn(
                "min-h-0 space-y-2 xl:block xl:overflow-y-auto xl:pr-1 product-scrollbar",
                builderFocusPanel !== "build" && "hidden",
              )}
            >
              <section className="rounded-lg border bg-panel px-3 py-2">
                <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <Badge tone="accent">v{selectedForm.version}</Badge>
                    <span className="truncate text-xs text-muted-foreground">
                      Saved {new Date(selectedForm.updatedAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Button
                      disabled={!historyPast.length}
                      onClick={undoLastChange}
                      size="sm"
                      type="button"
                      variant="secondary"
                    >
                      <RotateCcw aria-hidden="true" />
                      Undo
                    </Button>
                    <Button
                      disabled={!historyFuture.length}
                      onClick={redoLastChange}
                      size="sm"
                      type="button"
                      variant="secondary"
                    >
                      <RotateCw aria-hidden="true" />
                      Redo
                    </Button>
                    <Button
                      onClick={() => {
                        saveSelectedForm(false);
                      }}
                      disabled={publishMutation.isPending}
                      size="sm"
                    >
                      <GitBranch aria-hidden="true" />
                      Draft
                    </Button>
                    <Button
                      onClick={archiveSelectedForm}
                      size="sm"
                      type="button"
                      variant="secondary"
                    >
                      <Archive aria-hidden="true" />
                      Archive
                    </Button>
                    <Button
                      onClick={() => {
                        setFormControlsTab("overview");
                        setFormControlsDialogOpen(true);
                      }}
                      size="sm"
                      type="button"
                      variant="secondary"
                    >
                      <ShieldCheck aria-hidden="true" />
                      Controls
                    </Button>
                    <Button
                      onClick={openReadinessChecklist}
                      size="sm"
                      type="button"
                      variant={readinessReadyForPublish ? "secondary" : "primary"}
                    >
                      <ClipboardList aria-hidden="true" />
                      Readiness
                    </Button>
                    <Button
                      onClick={() => {
                        saveSelectedForm(true);
                      }}
                      disabled={publishMutation.isPending}
                      size="sm"
                      variant="primary"
                    >
                      <UploadCloud aria-hidden="true" />
                      Publish
                    </Button>
                    <Button
                      onClick={openDeploymentCenter}
                      disabled={publishMutation.isPending}
                      size="sm"
                      type="button"
                      variant="primary"
                    >
                      <Smartphone aria-hidden="true" />
                      Deploy to app
                    </Button>
                    <Button
                      onClick={openSubmissionReviewWorkspace}
                      size="sm"
                      type="button"
                      variant="secondary"
                    >
                      <Eye aria-hidden="true" />
                      Review data
                    </Button>
                  </div>
                </div>
              </section>

              <section className="rounded-lg border bg-panel px-3 py-2">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex min-w-0 items-start gap-2">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border bg-primary/10 text-primary">
                      <Smartphone aria-hidden="true" size={17} />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold">Mobile deployment</p>
                        <Badge tone={selectedMobileDeployment ? "success" : "warning"}>
                          {selectedMobileDeployment ? "Deployed" : "Not deployed"}
                        </Badge>
                      </div>
                      <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                        {selectedMobileDeployment
                          ? `Survey App · ${selectedMobileDeployment.assignedAudience} · ${selectedMobileDeployment.syncMode.replace("_", " ")}`
                          : "Publish and deploy so field officers see this form after app sync."}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedMobileDeployment ? (
                      <Button
                        onClick={openAssignmentWorkspace}
                        size="sm"
                        type="button"
                        variant="secondary"
                      >
                        Assign officers
                      </Button>
                    ) : null}
                    <Button
                      onClick={openDeploymentCenter}
                      size="sm"
                      type="button"
                      variant={selectedMobileDeployment ? "secondary" : "primary"}
                    >
                      <Smartphone aria-hidden="true" />
                      Deployment center
                    </Button>
                  </div>
                </div>
              </section>

              <section className="rounded-lg border bg-panel px-3 py-2">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex min-w-0 items-start gap-2">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                      <ShieldCheck aria-hidden="true" size={17} />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold">Form controls</p>
                        <Badge tone={formControlsReady ? "success" : "warning"}>
                          {formControlsReady ? "Configured" : "Needs review"}
                        </Badge>
                      </div>
                      <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                        {selectedFormControls.reference_bindings.length} reference lists · {selectedFormControls.permission_rules.length} access rules · {selectedFormControls.workflow_stages.length} workflow stages · {selectedFormControls.data_quality_rules.filter((rule) => rule.enabled).length} quality checks
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => {
                      setFormControlsTab("overview");
                      setFormControlsDialogOpen(true);
                    }}
                    size="sm"
                    type="button"
                    variant={formControlsReady ? "secondary" : "primary"}
                  >
                    <ShieldCheck aria-hidden="true" />
                    Configure controls
                  </Button>
                </div>
              </section>

              <section className="rounded-lg border bg-panel px-3 py-2">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex min-w-0 items-start gap-2">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border bg-sky-500/10 text-sky-700 dark:text-sky-300">
                      <Layers3 aria-hidden="true" size={17} />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold">Operational workspaces</p>
                        <Badge tone="accent">Form-level</Badge>
                      </div>
                      <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                        Assign teams, import records, monitor quality, and review synced submissions without leaving this form.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={openAssignmentWorkspace} size="sm" type="button" variant="secondary">
                      <ShieldCheck aria-hidden="true" />
                      Assign
                    </Button>
                    <Button onClick={openImportWorkspace} size="sm" type="button" variant="secondary">
                      <FileUp aria-hidden="true" />
                      Import
                    </Button>
                    <Button onClick={openQualityWorkspace} size="sm" type="button" variant="secondary">
                      <Check aria-hidden="true" />
                      Quality
                    </Button>
                    <Button onClick={openSubmissionReviewWorkspace} size="sm" type="button" variant="secondary">
                      <Eye aria-hidden="true" />
                      Review
                    </Button>
                  </div>
                </div>
              </section>

              <section className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-start gap-2">
                    <Sparkles aria-hidden="true" className="mt-0.5 shrink-0 text-primary" size={16} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{smartCanvasAction.label}</p>
                      <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{smartCanvasAction.description}</p>
                    </div>
                  </div>
                  <Button
                    className="shrink-0"
                    onClick={() => openBuilderAssistant(smartCanvasAction.mode, smartCanvasAction.query)}
                    size="sm"
                    type="button"
                    variant="primary"
                  >
                    Continue
                  </Button>
                </div>
              </section>

              <Modal
                description={assistantDescription}
                onOpenChange={setBuilderActionDialogOpen}
                open={builderActionDialogOpen}
                title={assistantTitle}
              >
                <div className="flex-1 overflow-y-auto p-5 product-scrollbar">
                  {builderAssistantMode === "question" ? (
                    <div>
                      <label className="relative block">
                        <span className="sr-only">Search smart fields</span>
                        <Search aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={15} />
                        <Input
                          className="pl-9"
                          onChange={(event) => setSmartFieldQuery(event.target.value)}
                          placeholder="Try age, phone, consent, GPS, photo, score..."
                          value={smartFieldQuery}
                        />
                      </label>
                      <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        {smartFieldSuggestions.map((preset) => {
                          const Icon = fieldTypeIcons[preset.type];
                          return (
                            <button
                              className="rounded-lg border bg-background p-3 text-left transition hover:border-primary/40 hover:bg-primary/10"
                              key={`${preset.id}-${preset.type}`}
                              onClick={() => addPresetField(preset)}
                              type="button"
                            >
                              <span className="flex items-center gap-2 text-sm font-semibold">
                                <Icon aria-hidden="true" className="text-primary" size={15} />
                                {preset.label}
                              </span>
                              <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                                {preset.hint}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

                  {builderAssistantMode === "section" ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {sectionTemplates.map((template) => (
                        <button
                          className="rounded-lg border bg-background p-3 text-left transition hover:border-primary/40 hover:bg-primary/10"
                          key={template.id}
                          onClick={() => addSectionTemplate(template)}
                          type="button"
                        >
                          <span className="block text-sm font-semibold">{template.title}</span>
                          <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                            {template.description} · {template.fields.length} smart fields
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {builderAssistantMode === "logic" ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {[
                        ["required", "Require answer", "Make this field mandatory before submission."],
                        ["email", "Email validation", "Convert this to an email field with validation."],
                        ["phone", "Phone validation", "Convert this to a phone field with validation."],
                        ["gps", "GPS evidence", "Require GPS with accuracy control."],
                        ["yes_no", "Yes / No choice", "Use a simple binary response."],
                        ["skip_rule", "Show / hide rule", "Add a starter no-code visibility rule."],
                      ].map(([kind, label, helper]) => (
                        <button
                          className="rounded-lg border bg-background p-3 text-left transition hover:border-primary/40 hover:bg-primary/10"
                          key={kind}
                          onClick={() => applySmartFieldSetup(kind as "required" | "email" | "phone" | "gps" | "yes_no" | "skip_rule")}
                          type="button"
                        >
                          <span className="block text-sm font-semibold">{label}</span>
                          <span className="mt-1 block text-xs leading-5 text-muted-foreground">{helper}</span>
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {builderAssistantMode === "readiness" && selectedFormCompatibility && selectedFormWorkbook ? (
                    <div className="space-y-4">
                      <div className="grid gap-2 sm:grid-cols-2">
                        {[
                          ["XLSForm", activeCompatibility?.xlsform_ready ? "Ready" : "Needs questions"],
                          ["Mobile", activeCompatibility?.mobile_app_ready ? "Offline-ready" : "Check fields"],
                          ["Web", activeCompatibility?.web_form_ready ? "Ready" : "Check scanner fields"],
                          ["Media fields", String(activeCompatibility?.media_field_count ?? 0)],
                          ["XLSForm rows", String(xlsFormQuery.data?.survey.length ?? selectedFormWorkbook.survey.length)],
                        ].map(([label, value]) => (
                          <div className="rounded-lg border bg-background px-3 py-3" key={label}>
                            <p className="text-xs text-muted-foreground">{label}</p>
                            <p className="mt-1 text-sm font-semibold">{value}</p>
                          </div>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          disabled={!isPersistedSelectedForm || !token || token === "preview-token" || xlsFormQuery.isFetching}
                          onClick={() => xlsFormQuery.refetch()}
                          size="sm"
                          type="button"
                          variant="secondary"
                        >
                          <FileDown aria-hidden="true" />
                          {xlsFormQuery.isFetching ? "Checking" : "XLSForm"}
                        </Button>
                        <Button
                          disabled={!isPersistedSelectedForm || !token || token === "preview-token" || publicLinkMutation.isPending}
                          onClick={() => publicLinkMutation.mutate()}
                          size="sm"
                          type="button"
                          variant="secondary"
                        >
                          <FileUp aria-hidden="true" />
                          {publicLinkMutation.isPending ? "Creating" : "Public link"}
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  {builderAssistantMode === "preview" ? (
                    <div>
                      <div className="flex flex-wrap gap-1 rounded-md border bg-background p-1">
                        {(["desktop", "tablet", "mobile", "enumerator", "respondent"] as const).map((mode) => (
                          <button
                            key={mode}
                            className={cn(
                              "rounded px-2.5 py-1 text-xs font-medium",
                              previewMode === mode ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                            )}
                            onClick={() => setPreviewMode(mode)}
                            type="button"
                          >
                            {mode}
                          </button>
                        ))}
                      </div>
                      <div className={cn("mt-3 rounded-xl border bg-background p-4", ["mobile", "enumerator", "respondent"].includes(previewMode) && "mx-auto max-w-sm", previewMode === "tablet" && "mx-auto max-w-2xl")}>
                        <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
                          <Smartphone aria-hidden="true" size={14} />
                          {previewMode === "respondent" ? "Respondent preview" : previewMode === "enumerator" ? "Enumerator preview" : "Device preview"} · {selectedPages.length} page(s) · {selectedForm.fields.length} fields
                        </div>
                        <div className="max-h-[55vh] space-y-4 overflow-y-auto pr-1 product-scrollbar">
                          {selectedPages.map((page, pageIndex) => {
                            const pageSections = selectedForm.sections.filter((section) => section.pageId === page.id);
                            return (
                              <section className="rounded-lg border bg-panel/70 p-3" key={page.id}>
                                <div className="mb-3 flex items-start justify-between gap-3">
                                  <div>
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Page {pageIndex + 1}</p>
                                    <h3 className="mt-1 text-sm font-semibold">{page.title}</h3>
                                    {page.description ? <p className="mt-1 text-xs leading-5 text-muted-foreground">{page.description}</p> : null}
                                  </div>
                                  <Badge tone="neutral">
                                    {selectedForm.fields.filter((field) => field.pageId === page.id).length} fields
                                  </Badge>
                                </div>
                                <div className="space-y-3">
                                  {pageSections.map((section, sectionIndex) => {
                                    const sectionFields = selectedForm.fields.filter((field) => field.sectionId === section.id);
                                    const tone = getSectionTone(sectionIndex);
                                    return (
                                      <div className={cn("overflow-hidden rounded-lg border bg-background", tone.border)} key={section.id}>
                                        <div className={cn("mb-3 border-b px-3 py-2", tone.header)}>
                                          <div className="flex items-center gap-2">
                                            <span className={cn("h-7 w-1.5 rounded-full", tone.rail)} />
                                            <h4 className="text-sm font-semibold">{section.title}</h4>
                                          </div>
                                          {section.description ? <p className="mt-1 text-xs leading-5 text-muted-foreground">{section.description}</p> : null}
                                        </div>
                                        <div className="space-y-3 px-3 pb-3">
                                          {sectionFields.map((field, fieldIndex) => (
                                            <label className="block rounded-lg border bg-panel p-3 text-sm" key={field.id}>
                                              <span className="flex flex-wrap items-center gap-1.5">
                                                <span className="font-mono text-[11px] text-muted-foreground">{fieldIndex + 1}</span>
                                                <span className="font-semibold">{field.label}</span>
                                                {field.required ? <span className="text-danger">*</span> : null}
                                                <Badge tone="neutral">{field.type.replace("_", " ")}</Badge>
                                                {field.logic?.length ? <Badge tone="accent">logic</Badge> : null}
                                                {Object.keys(field.validation ?? {}).length ? <Badge tone="warning">validation</Badge> : null}
                                              </span>
                                              {field.hint ? <span className="mt-1 block text-xs leading-5 text-muted-foreground">{field.hint}</span> : null}
                                              <FieldInputPreview field={field} />
                                            </label>
                                          ))}
                                          {!sectionFields.length ? (
                                            <div className="rounded-md border border-dashed bg-panel px-3 py-2 text-xs text-muted-foreground">
                                              No fields in this section yet.
                                            </div>
                                          ) : null}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </section>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </Modal>

              <section
                className="overflow-hidden rounded-lg border bg-panel"
                aria-labelledby="canvas-title"
              >
                <div className="border-b px-3 py-2">
                  <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <h2 id="canvas-title" className="text-sm font-semibold">
                        Build the form
                      </h2>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Button onClick={() => openBuilderAssistant("question")} size="sm" type="button" variant="primary">
                        <MousePointer2 aria-hidden="true" />
                        Add question
                      </Button>
                      <Button onClick={() => openBuilderAssistant("section")} size="sm" type="button" variant="secondary">
                        <Plus aria-hidden="true" />
                        Add section
                      </Button>
                      <Button onClick={() => openBuilderAssistant("preview")} size="sm" type="button" variant="secondary">
                        <Smartphone aria-hidden="true" />
                        Preview
                      </Button>
                      <Button onClick={() => openBuilderAssistant("readiness")} size="sm" type="button" variant="ghost">
                        <Check aria-hidden="true" />
                        Readiness
                      </Button>
                      <Badge tone="accent">{activePageFields.length} on page</Badge>
                    </div>
                  </div>
                  <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1 product-scrollbar">
                    {selectedPages.map((page) => (
                      <button
                        className={cn(
                          "inline-flex shrink-0 items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs font-medium transition",
                          activePage?.id === page.id
                            ? "border-primary bg-primary text-primary-foreground"
                            : "bg-background text-muted-foreground hover:text-foreground",
                        )}
                        key={page.id}
                        onClick={() => setSelectedPageId(page.id)}
                        type="button"
                      >
                        {page.title}
                        <span className={cn("rounded bg-muted px-1.5 py-0.5 text-[10px]", activePage?.id === page.id && "bg-primary-foreground/20")}>
                          {selectedForm.fields.filter((field) => field.pageId === page.id).length}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                  <SortableContext items={activePageFields.map((field) => field.id)} strategy={verticalListSortingStrategy}>
                    <div className="max-h-[56vh] space-y-2 overflow-y-auto bg-muted/20 p-3 product-scrollbar">
                      {activeSections.map((section, sectionIndex) => {
                        const sectionFields = selectedForm.fields.filter((field) => field.sectionId === section.id);
                        const tone = getSectionTone(sectionIndex);
                        return (
                          <section className={cn("overflow-hidden rounded-lg border bg-background shadow-line", tone.border)} key={section.id}>
                            <div className={cn("flex flex-col gap-2 border-b px-3 py-2 sm:flex-row sm:items-center sm:justify-between", tone.header)}>
                              <button
                                className="flex items-start gap-2 text-left"
                                onClick={() => setSelectedSectionId(section.id)}
                                type="button"
                              >
                                <span className={cn("mt-1 h-8 w-1.5 rounded-full", tone.rail)} />
                                <span>
                                  <h3 className="text-sm font-semibold">{section.title}</h3>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {section.description ?? "No section description"} · {sectionFields.length} questions
                                  </p>
                                </span>
                              </button>
                              <div className="flex gap-1">
                                <Button aria-label={`Duplicate ${section.title}`} onClick={() => duplicateBuilderSection(section.id)} size="icon" type="button" variant="ghost">
                                  <Copy aria-hidden="true" />
                                </Button>
                                <Button
                                  onClick={() => {
                                    setSelectedSectionId(section.id);
                                    openBuilderAssistant("question");
                                  }}
                                  size="sm"
                                  type="button"
                                  variant="secondary"
                                >
                                  <Plus aria-hidden="true" />
                                  Question
                                </Button>
                              </div>
                            </div>
                            {sectionFields.length ? (
                              sectionFields.map((field) => {
                                const globalIndex = selectedForm.fields.findIndex((candidate) => candidate.id === field.id);
                                return (
                                  <SortableField
                                    key={field.id}
                                    field={field}
                                    index={globalIndex}
                                    selected={selectedField?.id === field.id}
                                    canMoveDown={globalIndex < selectedForm.fields.length - 1}
                                    canMoveUp={globalIndex > 0}
                                    onDuplicate={() => updateSelectedForm(duplicateField(selectedForm, field.id))}
                                    onEditSettings={() => openFieldSettings(field.id)}
                                    onLabelChange={(label) => updateSelectedForm(updateField(selectedForm, field.id, { label }))}
                                    onMoveDown={() => moveField(field.id, 1)}
                                    onMoveUp={() => moveField(field.id, -1)}
                                    onRemove={() => updateSelectedForm(removeField(selectedForm, field.id))}
                                    onSelect={() => openFieldSettings(field.id)}
                                    onToggleRequired={(required) => updateSelectedForm(updateField(selectedForm, field.id, { required }))}
                                  />
                                );
                              })
                            ) : (
                              <div className="p-4">
                                <div className="rounded-lg border border-dashed bg-panel/60 p-4">
                                  <div className="text-center text-sm text-muted-foreground">
                                    <Plus aria-hidden="true" className="mx-auto mb-2 text-primary" />
                                    Start this section with a common question
                                  </div>
                                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                                    {quickFieldPresets.slice(0, 4).map((preset) => {
                                      const Icon = fieldTypeIcons[preset.type];
                                      return (
                                        <button
                                          className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-left text-xs transition hover:border-primary/35 hover:bg-primary/5"
                                          key={preset.id}
                                          onClick={() => {
                                            setSelectedSectionId(section.id);
                                            addPresetField(preset, section);
                                          }}
                                          type="button"
                                        >
                                          <Icon aria-hidden="true" className="text-primary" size={14} />
                                          <span className="font-medium">{preset.label}</span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                  <Button
                                    className="mt-3 w-full"
                                    onClick={() => {
                                      setSelectedSectionId(section.id);
                                      openBuilderAssistant("question");
                                    }}
                                    type="button"
                                    variant="secondary"
                                  >
                                    <Plus aria-hidden="true" />
                                    More question types
                                  </Button>
                                </div>
                              </div>
                            )}
                          </section>
                        );
                      })}
                    </div>
                  </SortableContext>
                </DndContext>
              </section>
            </div>
          ) : null}

          {selectedForm && selectedField ? (
            <Modal
              contentClassName="max-w-4xl"
              description="Edit the selected question without losing the live preview of the form."
              onOpenChange={setFieldSettingsDialogOpen}
              open={fieldSettingsDialogOpen}
              title={`Field settings: ${selectedField.label}`}
            >
              <div className="flex-1 overflow-y-auto p-5 product-scrollbar">
              <section className="rounded-lg border bg-panel p-4">
                <div className="flex items-center gap-2">
                  <Settings2 aria-hidden="true" size={17} />
                  <div>
                    <h2 className="text-sm font-semibold">Field settings</h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Configure one selected question at a time.
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-1 rounded-md border bg-background p-1">
                {([
                    ["field", Settings2, "Field"],
                    ["validation", Check, "Validation"],
                    ["logic", Workflow, "Logic"],
                    ["calculation", Sigma, "Formula"],
                    ["appearance", Palette, "Look"],
                    ["advanced", Command, "Advanced"],
                  ] satisfies [RightPanelTab, typeof Type, string][]).map(([tab, Icon, label]) => (
                    <button
                      className={cn(
                        "flex h-8 items-center justify-center rounded text-muted-foreground transition hover:bg-muted hover:text-foreground",
                        rightPanelTab === tab && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                      )}
                      key={String(tab)}
                      onClick={() => setRightPanelTab(tab as RightPanelTab)}
                      aria-label={String(label)}
                      title={String(label)}
                      type="button"
                    >
                      <Icon aria-hidden="true" size={15} />
                    </button>
                  ))}
                </div>
                <div className="mt-4 rounded-md border bg-background p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold">Setup checklist</p>
                    <Badge tone="accent">Selected field</Badge>
                  </div>
                  <div className="mt-3 grid gap-2 text-xs">
                    {[
                      ["Label added", selectedField.label.trim().length > 0],
                      ["Helper text clear", Boolean(selectedField.hint?.trim())],
                      ["Choices ready", !selectedField.options || selectedField.options.length >= 2],
                      ["Validation checked", Boolean(selectedField.validation && Object.keys(selectedField.validation).length)],
                      ["Logic reviewed", Boolean(selectedField.logic?.length)],
                    ].map(([label, done]) => (
                      <div className="flex items-center gap-2" key={String(label)}>
                        <span className={cn("flex h-5 w-5 items-center justify-center rounded-full border", done ? "border-success bg-success/10 text-success" : "border-muted text-muted-foreground")}>
                          <Check aria-hidden="true" size={12} />
                        </span>
                        <span className={done ? "text-foreground" : "text-muted-foreground"}>{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-3 rounded-md border bg-background p-3">
                  <div className="flex items-center gap-2">
                    <Sparkles aria-hidden="true" className="text-primary" size={15} />
                    <p className="text-sm font-semibold">Smart setup</p>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {[
                      ["required", "Require"],
                      ["email", "Email rule"],
                      ["phone", "Phone rule"],
                      ["gps", "GPS rule"],
                      ["yes_no", "Yes / No"],
                      ["skip_rule", "Show rule"],
                    ].map(([kind, label]) => (
                      <Button
                        key={kind}
                        onClick={() => applySmartFieldSetup(kind as "required" | "email" | "phone" | "gps" | "yes_no" | "skip_rule")}
                        size="sm"
                        type="button"
                        variant="secondary"
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                </div>

                {rightPanelTab === "field" ? (
                  <div className="mt-4 space-y-4">
                    <label className="block text-sm font-medium">
                      Field label
                      <Input
                        className="mt-2"
                        value={selectedField.label}
                        onChange={(event) =>
                          updateSelectedForm(updateField(selectedForm, selectedField.id, { label: event.target.value }))
                        }
                      />
                    </label>
                    <label className="block text-sm font-medium">
                      Type
                      <Select
                        className="mt-2"
                        value={selectedField.type}
                        onChange={(event) =>
                          updateSelectedForm(updateField(selectedForm, selectedField.id, { type: event.target.value as FieldType }))
                        }
                      >
                        {!fieldCatalog.flatMap((group) => group.fields).some((field) => field.type === selectedField.type) ? (
                          <option value={selectedField.type}>{selectedField.type}</option>
                        ) : null}
                        {fieldCatalog.flatMap((group) => group.fields).map((field) => (
                          <option key={field.type} value={field.type}>
                            {field.label}
                          </option>
                        ))}
                      </Select>
                    </label>
                    <label className="block text-sm font-medium">
                      Helper text
                      <Input
                        className="mt-2"
                        value={selectedField.hint ?? ""}
                        onChange={(event) => updateSelectedForm(updateField(selectedForm, selectedField.id, { hint: event.target.value }))}
                        placeholder="Explain what the enumerator should capture"
                      />
                    </label>
                    <label className="block text-sm font-medium">
                      Page
                      <Select
                        className="mt-2"
                        value={selectedField.pageId ?? activePage?.id ?? ""}
                        onChange={(event) => updateSelectedForm(moveFieldToPage(selectedForm, selectedField.id, event.target.value))}
                      >
                        {selectedPages.map((page) => (
                          <option key={page.id} value={page.id}>{page.title}</option>
                        ))}
                      </Select>
                    </label>
                    <label className="block text-sm font-medium">
                      Section
                      <Select
                        className="mt-2"
                        value={selectedField.sectionId}
                        onChange={(event) => updateSelectedForm(moveFieldToSection(selectedForm, selectedField.id, event.target.value))}
                      >
                        {selectedForm.sections.map((section: FormSection) => (
                          <option key={section.id} value={section.id}>{section.title}</option>
                        ))}
                      </Select>
                    </label>
                    <label className="flex items-center gap-2 text-sm font-medium">
                      <input
                        checked={selectedField.required}
                        className="h-4 w-4"
                        onChange={(event) => updateSelectedForm(updateField(selectedForm, selectedField.id, { required: event.target.checked }))}
                        type="checkbox"
                      />
                      Required by default
                    </label>
                    {selectedField.options ? (
                      <label className="block text-sm font-medium">
                        Choices
                        <textarea
                          className="mt-2 min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                          value={selectedField.options.join("\n")}
                          onChange={(event) =>
                            updateSelectedForm(
                              updateField(selectedForm, selectedField.id, {
                                options: event.target.value.split("\n").map((option) => option.trim()).filter(Boolean),
                              }),
                            )
                          }
                        />
                      </label>
                    ) : null}
                  </div>
                ) : null}

                {rightPanelTab === "validation" ? (
                  <div className="mt-4 space-y-4">
                    <div className="rounded-md border bg-background p-3 text-xs leading-5 text-muted-foreground">
                      Set rules that protect data quality before submissions reach review.
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <label className="text-sm font-medium">
                        Min
                        <Input
                          className="mt-2"
                          type="number"
                          value={selectedField.validation?.min ?? ""}
                          onChange={(event) => updateSelectedForm(updateField(selectedForm, selectedField.id, { validation: { ...selectedField.validation, min: event.target.value === "" ? undefined : Number(event.target.value) } }))}
                        />
                      </label>
                      <label className="text-sm font-medium">
                        Max
                        <Input
                          className="mt-2"
                          type="number"
                          value={selectedField.validation?.max ?? ""}
                          onChange={(event) => updateSelectedForm(updateField(selectedForm, selectedField.id, { validation: { ...selectedField.validation, max: event.target.value === "" ? undefined : Number(event.target.value) } }))}
                        />
                      </label>
                    </div>
                    <label className="block text-sm font-medium">
                      Regex or format rule
                      <Input
                        className="mt-2"
                        value={selectedField.validation?.pattern ?? ""}
                        onChange={(event) => updateSelectedForm(updateField(selectedForm, selectedField.id, { validation: { ...selectedField.validation, pattern: event.target.value } }))}
                        placeholder="Example: ^[A-Z0-9-]+$"
                      />
                    </label>
                    <label className="block text-sm font-medium">
                      Cross-field expression
                      <Input
                        className="mt-2"
                        value={selectedField.validation?.expression ?? ""}
                        onChange={(event) => updateSelectedForm(updateField(selectedForm, selectedField.id, { validation: { ...selectedField.validation, expression: event.target.value } }))}
                        placeholder="${end_date} >= ${start_date}"
                      />
                    </label>
                    {["gps", "geolocation", "map", "geofence"].includes(selectedField.type) ? (
                      <label className="block text-sm font-medium">
                        Maximum GPS accuracy in meters
                        <Input
                          className="mt-2"
                          type="number"
                          value={selectedField.validation?.accuracyMax ?? ""}
                          onChange={(event) => updateSelectedForm(updateField(selectedForm, selectedField.id, { validation: { ...selectedField.validation, accuracyMax: event.target.value === "" ? undefined : Number(event.target.value) } }))}
                        />
                      </label>
                    ) : null}
                  </div>
                ) : null}

                {rightPanelTab === "logic" ? (
                  <div className="mt-4 space-y-3">
                    <div className="rounded-md border bg-background p-3 text-xs leading-5 text-muted-foreground">
                      Build no-code logic with XLSForm-style expressions. Use AND/OR groups in expressions for complex branching.
                    </div>
                    {(selectedField.logic ?? []).map((rule) => (
                      <div className="rounded-md border bg-background p-3" key={rule.id}>
                        <div className="flex items-center justify-between gap-2">
                          <Badge tone="accent">{rule.kind.replace("_", " ")}</Badge>
                          <Button
                            onClick={() => updateSelectedForm(updateField(selectedForm, selectedField.id, { logic: selectedField.logic?.filter((candidate) => candidate.id !== rule.id) ?? [] }))}
                            aria-label={`Remove ${rule.kind} rule`}
                            size="icon"
                            type="button"
                            variant="ghost"
                          >
                            <Trash2 aria-hidden="true" />
                          </Button>
                        </div>
                        <Input
                          className="mt-3"
                          value={rule.expression}
                          onChange={(event) =>
                            updateSelectedForm(
                              updateField(selectedForm, selectedField.id, {
                                logic: (selectedField.logic ?? []).map((candidate) => candidate.id === rule.id ? { ...candidate, expression: event.target.value } : candidate),
                              }),
                            )
                          }
                          placeholder="${consent} = 'Yes'"
                        />
                        <Input
                          className="mt-2"
                          value={rule.message ?? ""}
                          onChange={(event) =>
                            updateSelectedForm(
                              updateField(selectedForm, selectedField.id, {
                                logic: (selectedField.logic ?? []).map((candidate) => candidate.id === rule.id ? { ...candidate, message: event.target.value } : candidate),
                              }),
                            )
                          }
                          placeholder="Message shown to the team"
                        />
                      </div>
                    ))}
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        ["show", "Show / Hide"],
                        ["required", "Required"],
                        ["skip", "Skip logic"],
                        ["dynamic_choices", "Dynamic choices"],
                      ].map(([kind, label]) => (
                        <Button
                          key={kind}
                          onClick={() =>
                            updateSelectedForm(
                              updateField(selectedForm, selectedField.id, {
                                logic: [
                                  ...(selectedField.logic ?? []),
                                  { id: `${selectedField.id}-${kind}-${Date.now()}`, kind: kind as LogicRule["kind"], expression: "${answer} = 'Yes'", message: String(label) },
                                ],
                              }),
                            )
                          }
                          type="button"
                          variant="secondary"
                        >
                          <Plus aria-hidden="true" />
                          {label}
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {rightPanelTab === "calculation" ? (
                  <div className="mt-4 space-y-4">
                    <label className="block text-sm font-medium">
                      Formula
                      <textarea
                        className="mt-2 min-h-24 w-full rounded-md border bg-background px-3 py-2 font-mono text-sm outline-none focus:border-primary"
                        value={selectedField.calculation?.expression ?? selectedField.logic?.find((rule) => rule.kind === "calculation")?.expression ?? ""}
                        onChange={(event) =>
                          updateSelectedForm(
                            updateField(selectedForm, selectedField.id, {
                              calculation: { ...(selectedField.calculation ?? { preview: "Pending validation" }), expression: event.target.value },
                            }),
                          )
                        }
                        placeholder="(${weight_kg} / (${height_m} * ${height_m}))"
                      />
                    </label>
                    <div className="rounded-md border bg-background p-3">
                      <p className="text-sm font-medium">Formula preview</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        {selectedField.calculation?.preview ?? "Add a formula to validate syntax and preview derived values."}
                      </p>
                    </div>
                  </div>
                ) : null}

                {rightPanelTab === "appearance" ? (
                  <div className="mt-4 space-y-4">
                    <label className="block text-sm font-medium">
                      Width
                      <Select
                        className="mt-2"
                        value={selectedField.appearance?.width ?? "full"}
                        onChange={(event) =>
                          updateSelectedForm(updateField(selectedForm, selectedField.id, { appearance: { ...selectedField.appearance, width: event.target.value as "full" | "half" | "third" } }))
                        }
                      >
                        <option value="full">Full width</option>
                        <option value="half">Half width</option>
                        <option value="third">One third</option>
                      </Select>
                    </label>
                    <label className="block text-sm font-medium">
                      Placeholder
                      <Input
                        className="mt-2"
                        value={selectedField.appearance?.placeholder ?? ""}
                        onChange={(event) => updateSelectedForm(updateField(selectedForm, selectedField.id, { appearance: { ...selectedField.appearance, placeholder: event.target.value } }))}
                      />
                    </label>
                    <label className="block text-sm font-medium">
                      Help text
                      <Input
                        className="mt-2"
                        value={selectedField.appearance?.helpText ?? ""}
                        onChange={(event) => updateSelectedForm(updateField(selectedForm, selectedField.id, { appearance: { ...selectedField.appearance, helpText: event.target.value } }))}
                      />
                    </label>
                  </div>
                ) : null}

                {rightPanelTab === "advanced" ? (
                  <div className="mt-4 space-y-4">
                    <label className="block text-sm font-medium">
                      Variable name
                      <Input
                        className="mt-2 font-mono"
                        value={selectedField.variableName ?? selectedField.id}
                        onChange={(event) => updateSelectedForm(updateField(selectedForm, selectedField.id, { variableName: event.target.value }))}
                      />
                    </label>
                    {selectedField.repeat ? (
                      <div className="grid grid-cols-2 gap-3">
                        <label className="text-sm font-medium">
                          Repeat min
                          <Input
                            className="mt-2"
                            type="number"
                            value={selectedField.repeat.min ?? ""}
                            onChange={(event) => updateSelectedForm(updateField(selectedForm, selectedField.id, { repeat: { ...selectedField.repeat, min: event.target.value === "" ? undefined : Number(event.target.value) } }))}
                          />
                        </label>
                        <label className="text-sm font-medium">
                          Repeat max
                          <Input
                            className="mt-2"
                            type="number"
                            value={selectedField.repeat.max ?? ""}
                            onChange={(event) => updateSelectedForm(updateField(selectedForm, selectedField.id, { repeat: { ...selectedField.repeat, max: event.target.value === "" ? undefined : Number(event.target.value) } }))}
                          />
                        </label>
                      </div>
                    ) : null}
                    {selectedField.matrix ? (
                      <div className="space-y-3">
                        <label className="block text-sm font-medium">
                          Matrix rows
                          <textarea
                            className="mt-2 min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                            value={selectedField.matrix.rows.join("\n")}
                            onChange={(event) => updateSelectedForm(updateField(selectedForm, selectedField.id, { matrix: { rows: event.target.value.split("\n").filter(Boolean), columns: selectedField.matrix?.columns ?? [], scoring: selectedField.matrix?.scoring } }))}
                          />
                        </label>
                        <label className="block text-sm font-medium">
                          Matrix columns
                          <textarea
                            className="mt-2 min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                            value={selectedField.matrix.columns.join("\n")}
                            onChange={(event) => updateSelectedForm(updateField(selectedForm, selectedField.id, { matrix: { rows: selectedField.matrix?.rows ?? [], columns: event.target.value.split("\n").filter(Boolean), scoring: selectedField.matrix?.scoring } }))}
                          />
                        </label>
                      </div>
                    ) : null}
                    <div className="rounded-md border bg-background p-3 text-xs leading-5 text-muted-foreground">
                      Published responses stay attached to their original version. Create a draft version before making breaking changes.
                    </div>
                  </div>
                ) : null}
              </section>

              <section className="rounded-lg border bg-panel p-4">
                <div className="flex items-center gap-2">
                  <Check aria-hidden="true" size={17} />
                  <h2 className="text-sm font-semibold">Offline readiness</h2>
                </div>
                <div className="mt-4 space-y-2">
                  {[
                    "Works without internet",
                    "GPS is captured automatically",
                    "Photos and signatures can retry upload",
                    "Published versions stay stable on mobile",
                  ].map((item) => (
                    <div
                      key={item}
                      className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm"
                    >
                      <Check
                        aria-hidden="true"
                        className="text-success"
                        size={15}
                      />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </section>
              </div>
            </Modal>
          ) : null}

          {selectedForm ? (
            <aside
              className={cn(
                "min-h-0 xl:block xl:overflow-y-auto xl:pr-1 product-scrollbar",
                builderFocusPanel !== "preview" && "hidden",
              )}
            >
              <section className="sticky top-0 rounded-lg border bg-panel p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Eye aria-hidden="true" className="text-primary" size={17} />
                      <h2 className="text-sm font-semibold">Live preview</h2>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {selectedForm.fields.length} fields across {selectedPages.length} page(s)
                    </p>
                  </div>
                  {selectedField ? (
                    <Button
                      onClick={() => setFieldSettingsDialogOpen(true)}
                      size="sm"
                      type="button"
                      variant="secondary"
                    >
                      <Settings2 aria-hidden="true" />
                      Edit
                    </Button>
                  ) : null}
                </div>

                <div className="mt-3 flex flex-wrap gap-1 rounded-md border bg-background p-1">
                  {(["desktop", "tablet", "mobile"] as const).map((mode) => (
                    <button
                      className={cn(
                        "rounded px-2.5 py-1 text-xs font-medium transition",
                        previewMode === mode ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                      key={mode}
                      onClick={() => setPreviewMode(mode)}
                      type="button"
                    >
                      {mode}
                    </button>
                  ))}
                </div>

                <div
                  className={cn(
                    "mt-3 max-h-[calc(100vh-330px)] overflow-y-auto rounded-xl border bg-background p-3 product-scrollbar",
                    previewMode === "mobile" && "mx-auto max-w-[300px]",
                    previewMode === "tablet" && "mx-auto max-w-[520px]",
                  )}
                >
                  <div className="mb-3 rounded-lg border bg-panel px-3 py-2">
                    <p className="truncate text-sm font-semibold">{selectedForm.name}</p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {selectedSurvey?.title ?? "Survey"} / v{selectedForm.version}
                    </p>
                  </div>
                  <div className="space-y-3">
                    {selectedPages.map((page, pageIndex) => {
                      const pageSections = selectedForm.sections.filter((section) => section.pageId === page.id);
                      return (
                        <section className="rounded-lg border bg-panel/60 p-3" key={page.id}>
                          <div className="mb-3">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                              Page {pageIndex + 1}
                            </p>
                            <h3 className="mt-1 text-sm font-semibold">{page.title}</h3>
                          </div>
                          <div className="space-y-3">
                            {pageSections.map((section, sectionIndex) => {
                              const sectionFields = selectedForm.fields.filter((field) => field.sectionId === section.id);
                              const tone = getSectionTone(sectionIndex);
                              return (
                                <div className={cn("overflow-hidden rounded-lg border bg-background", tone.border)} key={section.id}>
                                  <div className={cn("border-b px-3 py-2", tone.header)}>
                                    <div className="flex items-center gap-2">
                                      <span className={cn("h-6 w-1 rounded-full", tone.rail)} />
                                      <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{section.title}</h4>
                                    </div>
                                  </div>
                                  <div className="space-y-2 p-3">
                                    {sectionFields.map((field) => (
                                      <button
                                        className={cn(
                                          "w-full rounded-lg border bg-panel p-2 text-left transition hover:border-primary/40 hover:bg-primary/5",
                                          selectedField?.id === field.id && "border-primary/50 bg-primary/10",
                                        )}
                                        key={field.id}
                                        onClick={() => openFieldSettings(field.id)}
                                        type="button"
                                      >
                                        <span className="flex flex-wrap items-center gap-1.5 text-xs">
                                          <span className="font-semibold text-foreground">{field.label}</span>
                                          {field.required ? <span className="text-danger">*</span> : null}
                                          <Badge tone="neutral">{field.type.replace("_", " ")}</Badge>
                                          {field.logic?.length ? <Badge tone="accent">logic</Badge> : null}
                                        </span>
                                        {field.hint ? (
                                          <span className="mt-1 line-clamp-1 block text-xs text-muted-foreground">{field.hint}</span>
                                        ) : null}
                                        <FieldInputPreview field={field} />
                                      </button>
                                    ))}
                                    {!sectionFields.length ? (
                                      <div className="rounded-md border border-dashed bg-panel px-3 py-2 text-xs text-muted-foreground">
                                        No fields yet.
                                      </div>
                                    ) : null}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </section>
                      );
                    })}
                  </div>
                </div>
              </section>
            </aside>
          ) : null}
        </div>
      )}
    </section>
  );
}
