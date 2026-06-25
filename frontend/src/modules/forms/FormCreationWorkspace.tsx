"use client";

import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
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

import { AtlasFieldOpsLogo } from "@/components/brand/AtlasFieldOpsLogo";
import { DynamicForms } from "@/components/DynamicForms";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HelpHint } from "@/components/ui/help-hint";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import {
  createFieldOfficerAssignment,
  createForm,
  createSurvey,
  getFormSchema,
  listEntityCategories,
  listFieldOfficers,
  listProjects,
  listSurveys,
  listTeams,
  updateForm,
  updateFormControls,
  type FieldOfficerRead,
  type FormControlsSettings,
  type EntityCategoryRead,
  type ProjectListItemRead,
  type FormType,
  type SurveyCreate,
  type TeamRead,
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
import { SECTOR_TERMINOLOGY, getSectorTerminology } from "@/lib/sectorTerminology";
import { cn } from "@/lib/utils";
import type { FormListItem } from "@/modules/forms/data";
import { statusTone } from "@/modules/forms/utils";
import { previewProjects } from "@/modules/projects/data";
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
type ControlStep =
  | "essentials"
  | "beneficiaries"
  | "questions"
  | "evidence"
  | "quality"
  | "access"
  | "governance"
  | "advanced";

type PublishSuccessSummary = {
  deliveredOfficerCount: number;
  deliveryErrors: string[];
  formName: string;
  projectName: string;
  selectedOfficerCount: number;
  selectedTeamCount: number;
  version: number;
};

type StarterTemplate = {
  description: string;
  fields: { label: string; required?: boolean; type: FieldType }[];
  formType: string;
  id: string;
  name: string;
  sectorIds: string[];
};

type RecommendedQuestion = {
  label: string;
  options?: string[];
  required?: boolean;
  type: FieldType;
  validation?: FormField["validation"];
};

type EntityTypeOption = {
  attributeCount: number;
  categoryId: string;
  entityType: string;
  label: string;
  path: string | null;
  value: string;
};

type FormControlsDraft = {
  accessibilityMode: "standard" | "large_text" | "high_contrast";
  allowAnonymous: boolean;
  allowManualCoordinates: boolean;
  approvalEscalationHours: number;
  assignmentMode: "assigned_only" | "project_team" | "open_link";
  assignedFieldOfficerIds: string[];
  assignedTeamIds: string[];
  auditTrail: boolean;
  autoAssignmentRule: string;
  backCheckRequired: boolean;
  backCheckSamplePercent: number;
  beneficiarySearch: "required" | "optional" | "disabled";
  blockWithoutConsent: boolean;
  boundaryValidation: boolean;
  businessPurpose: string;
  caseEscalationRule: string;
  changeSummary: string;
  consentMode: "digital" | "written" | "verbal" | "guardian" | "not_required";
  coordinateMasking: boolean;
  dataQualityMode: "standard" | "strict" | "advisory";
  decisionUse: "operational_decision" | "indicator_reporting" | "donor_reporting" | "case_management" | "research_learning";
  dataSourceType: "primary" | "secondary" | "administrative" | "imported" | "mixed";
  dataFreezeRequired: boolean;
  dataRetentionPolicy: "project_life" | "donor_period" | "seven_years" | "custom";
  deviceClockDriftAction: "warn" | "review" | "block";
  disaggregationFields: string[];
  disaggregationRequired: boolean;
  dontKnowPolicy: "optional" | "required_for_sensitive" | "disabled";
  duplicateAction: "block" | "warn" | "review";
  duplicateFields: string[];
  duplicateGpsDetection: boolean;
  duplicateSeverity: "low" | "medium" | "high" | "critical";
  duplicateThreshold: number;
  enumeratorTrainingRequired: boolean;
  entityCategoryId: string;
  entityType: string;
  eventMode: "none" | "creates_event" | "selects_event" | "attendance";
  expectedUse: string;
  exportApprovalMode: "not_required" | "manager_approval" | "data_manager_approval";
  exportRestricted: boolean;
  fileTypes: string;
  fieldGuideText: string;
  formObjective: string;
  frequencyWindow: "none" | "day" | "week" | "month" | "season" | "reporting_period";
  geographicScope: string;
  gpsAccuracy: number;
  indicatorComponent: "none" | "numerator" | "denominator" | "disaggregation" | "evidence";
  indicatorLink: string;
  invalidAgeAction: "warn" | "block" | "review";
  importTemplateMode: "none" | "form_dictionary" | "legacy_mapping";
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
  mobilePackageMode: "standard" | "low_bandwidth" | "large_registry" | "media_heavy";
  offlineEnabled: boolean;
  offlineMaxDays: number;
  offlineMediaCapture: boolean;
  lockApprovedRecords: boolean;
  permissionPreset: "standard" | "restricted" | "open";
  piiHandling: "standard" | "mask_exports" | "encrypt_sensitive" | "restricted";
  parentForm: string;
  partnerDataSharingRule: string;
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
  preventFutureDates: boolean;
  repeatGroupPolicy: "allowed" | "review_large" | "restricted";
  reportingPeriod: "none" | "monthly" | "quarterly" | "seasonal" | "annual" | "donor_schedule";
  respondentIdentification:
    | "existing_beneficiary"
    | "new_registration"
    | "existing_or_new"
    | "anonymous_allowed";
  resultArea: string;
  reviewApprover: "me_manager" | "data_manager" | "supervisor";
  reviewReturner: "supervisor" | "data_manager" | "me_manager";
  reviewComments: string;
  reviewer: "supervisor" | "data_manager" | "me_manager";
  requiresEntity: boolean;
  requiresGps: boolean;
  riskClassification: "low" | "medium" | "high" | "sensitive";
  samplingMethod: "none" | "random" | "stratified" | "cluster" | "purposive" | "systematic";
  sourceOfTruthRule: "registration_controls_profile" | "latest_approved_controls_profile" | "manager_approved_profile_updates";
  staticGpsAction: "warn" | "review" | "block";
  submissionEditPolicy: "before_review" | "returned_only" | "change_request";
  seasonEnd: string;
  seasonName: string;
  seasonStart: string;
  storeConsentVersion: boolean;
  syncRequirement: "manual_allowed" | "daily_required" | "before_new_assignment";
  technicalReviewerName: string;
  testingRequirement: "preview_only" | "test_submission" | "pilot_assignment";
  testingCompletedAt: string;
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

type PublishQuickFixId =
  | "access_defaults"
  | "add_standard_questions"
  | "add_consent_question"
  | "add_gps_question"
  | "add_media_question"
  | "apply_profile_mapping"
  | "baseline_defaults"
  | "duplicate_review_defaults"
  | "evidence_defaults"
  | "fix_broken_logic"
  | "fix_question_variables"
  | "fix_question_wording"
  | "frequency_window_defaults"
  | "governance_defaults"
  | "mark_core_required"
  | "mne_context_defaults"
  | "mobile_readiness_defaults"
  | "monitoring_defaults"
  | "registration_defaults";

type PublishAssistantAdvice = {
  actionLabel: string;
  fix: string;
  id: string;
  item: PublishReadinessItem | null;
  jumpTo?: CreationStage;
  label: string;
  mneTip: string;
  platformAction: string;
  quickFixId?: PublishQuickFixId;
  severity: "Required" | "Warning";
  targetControlStep?: ControlStep;
  why: string;
};

export type FormSetupDraft = {
  collectionMethod: CollectionMethod;
  description: string;
  durationMinutes: number;
  formName: string;
  formType: string;
  language: string;
  owner: string;
  projectId: string;
  projectName: string;
};

type FormCreationWorkspaceProps = {
  existingForms: FormListItem[];
  initialDuplicateFormId?: string | null;
  initialForm?: FormListItem | null;
  onBack: () => void;
  token: string | null;
};

const formTypes = [
  "Registration",
  "Assessment",
  "Inspection",
  "Inventory Count",
  "Sales Visit",
  "Service Visit",
  "Delivery Confirmation",
  "Incident Report",
  "Audit Checklist",
  "Monitoring Visit",
  "Baseline Survey",
  "Endline Survey",
  "Training Attendance",
  "Feedback Form",
  "Custom",
];

export const sectorFormTypeOptions: Record<string, string[]> = {
  agriculture: ["Farmer Registration", "Farm Assessment", "Crop Monitoring", "Yield Survey", "Training Attendance", "Input Distribution", "Custom"],
  assets: ["Asset Registration", "Condition Check", "Maintenance Visit", "Asset Transfer", "Loss Report", "Custom"],
  audits: ["Audit Checklist", "Compliance Review", "Finding Report", "Corrective Action Follow-up", "Risk Assessment", "Custom"],
  education: ["School Registration", "Classroom Observation", "Attendance Check", "Learning Assessment", "Teacher Visit", "Custom"],
  environment: ["Site Registration", "Baseline Environmental Assessment", "Tree Planting Record", "Conservation Activity", "Climate Adaptation Survey", "Endline Assessment", "Custom"],
  governance: ["Citizen Registration", "Service Delivery Scorecard", "Public Facility Assessment", "Civic Education Attendance", "Community Feedback", "Endline Survey", "Custom"],
  health: ["Facility Assessment", "Patient Intake", "Service Visit", "Referral Follow-up", "Quality Checklist", "Custom"],
  hr: ["Employee Profile", "Attendance Check", "Training Record", "Performance Review", "Asset Assignment", "Custom"],
  humanitarian: ["Rapid Household Registration", "Vulnerability Assessment", "Distribution Verification", "Complaint Intake", "Incident Report", "Post-Distribution Monitoring", "Custom"],
  inspections: ["Site Inspection", "Safety Checklist", "Defect Report", "Corrective Action Follow-up", "Compliance Visit", "Custom"],
  inventory: ["Stock Count", "Stock Receipt", "Stock Issue", "Supplier Delivery", "Variance Report", "Custom"],
  livelihoods: ["Participant Registration", "Baseline Income Survey", "Cash Transfer Distribution", "Training Attendance", "Savings Group Monitoring", "Endline Income Survey", "Custom"],
  logistics: ["Delivery Confirmation", "Route Check", "Vehicle Inspection", "Warehouse Count", "Incident Report", "Custom"],
  manufacturing: ["Production Batch", "Quality Check", "Machine Inspection", "Downtime Report", "Waste Record", "Custom"],
  nutrition: ["Child Enrollment", "Anthropometric Screening", "MUAC Screening", "Supplementary Feeding Distribution", "IYCF Counselling", "Discharge Survey", "Custom"],
  protection: ["Case Intake", "Needs Assessment", "Referral Form", "Psychosocial Support Session", "Case Follow-up", "Case Closure", "Custom"],
  research: ["Respondent Listing", "Household Roster", "Baseline Questionnaire", "Follow-up Questionnaire", "Endline Questionnaire", "Consent Form", "Custom"],
  retail: ["Product Registration", "Store Stock Count", "Price Check", "Sales Visit", "Supplier Delivery", "Custom"],
  sales: ["Lead Capture", "Customer Visit", "Opportunity Update", "Order Capture", "Customer Feedback", "Custom"],
  wash: ["Household WASH Survey", "Water Point Assessment", "Hygiene Session Attendance", "Infrastructure Verification", "Sanitation Monitoring", "Custom"],
};

const projectOptions = [
  ...previewProjects.map((project) => project.name),
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
  formType: "Custom",
  language: "English",
  owner: "Operations Manager",
  projectId: "",
  projectName: projectOptions[0] ?? "Project",
};

type PreviewFrame = "mobile" | "tablet" | "web";

function MobileFormPreview({
  form,
  frame = "mobile",
}: {
  form: DynamicForm;
  frame?: PreviewFrame;
}) {
  const pages = form.pages?.length
    ? form.pages
    : [{ id: "default-page", title: "Page 1" }];
  const isWeb = frame === "web";

  const fieldList = (
    <div
      className={cn(
        "mt-3 space-y-3",
        isWeb && "space-y-4",
      )}
    >
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
                  <div
                    className={cn(
                      "mt-3 space-y-3",
                      isWeb && "space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0",
                    )}
                  >
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
          Add a question to see it in preview.
        </div>
      ) : null}
    </div>
  );

  if (isWeb) {
    return (
      <div className="w-full overflow-hidden rounded-xl border bg-background shadow-elevated">
        <div className="flex items-center justify-between border-b bg-panel px-4 py-2.5 text-xs font-semibold">
          <span>{form.name}</span>
          <span className="text-muted-foreground">Preview</span>
        </div>
        <div className="max-h-[72vh] overflow-y-auto bg-muted/30 p-4 product-scrollbar">
          <div className="rounded-xl border bg-panel p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
              Draft form
            </p>
            <h3 className="mt-1 text-base font-semibold">{form.name}</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {form.fields.length} question
              {form.fields.length === 1 ? "" : "s"} ready for testing.
            </p>
          </div>
          {fieldList}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "overflow-hidden border-foreground bg-background shadow-elevated",
        frame === "tablet"
          ? "w-[480px] rounded-2xl border-[6px]"
          : "w-[320px] rounded-[2rem] border-[10px]",
      )}
    >
      <div className="flex items-center justify-between border-b bg-foreground px-4 py-2 text-[11px] font-semibold text-background">
        <span className="flex items-center gap-1.5">
          <AtlasFieldOpsLogo size={24} />
          Atlas FieldOps
        </span>
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
        {fieldList}
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
    created_by: "Operations Manager",
    description: setup.description || form.pages?.[0]?.description || null,
    form_type: setup.formType,
    has_quality_issues: form.fields.length === 0,
    id: form.id,
    name: form.name,
    owner: setup.owner || "Operations Manager",
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

const controlSteps: {
  categories: string[];
  decisions: string[];
  helper: string;
  id: ControlStep;
  label: string;
  mustDo: string;
}[] = [
  {
    categories: ["Form purpose", "Form information", "Purpose"],
    decisions: ["Why are we collecting this?", "Which decision, workflow, or report will use it?", "Which metric or result will use it if needed?"],
    helper: "Purpose, operational use, reporting, metrics, and context.",
    id: "essentials",
    label: "1. Purpose",
    mustDo: "Explain why this form exists and confirm the operational context.",
  },
  {
    categories: ["Entity settings", "Entity identity", "Record linkage", "Submission rules", "Submission frequency"],
    decisions: ["Who or what is this record about?", "Does it create or update an entity?", "How often can it be submitted?"],
    helper: "Entity rules, record search, and profile mappings.",
    id: "beneficiaries",
    label: "2. Entities",
    mustDo: "Decide whether this form creates, updates, or requires a linked record.",
  },
  {
    categories: ["Structure", "Question validation", "Data dictionary", "Logic rules", "Metric mapping"],
    decisions: ["Are questions clear and structured?", "Are variable names and dictionary fields usable?", "Do required and exception answers make sense?"],
    helper: "Question standards, dictionary, required policy, and logic checks.",
    id: "questions",
    label: "3. Questions",
    mustDo: "Confirm the questions are reportable, understandable, and clean enough for field collection.",
  },
  {
    categories: ["Reference data", "GPS", "GPS settings", "Media settings", "Consent", "Offline readiness", "Mapping settings", "Mobile package"],
    decisions: ["What evidence is required?", "Can it work offline?", "What must be downloaded to mobile?"],
    helper: "GPS, consent, media, reference data, and mobile/offline readiness.",
    id: "evidence",
    label: "4. Fieldwork",
    mustDo: "Set field evidence requirements and mobile readiness rules.",
  },
  {
    categories: ["Duplicate prevention", "Data quality", "Enumerator quality", "Duration", "Repeat groups", "Field integrity", "Back-checks"],
    decisions: ["What should block collection?", "What should warn reviewers?", "How should suspicious entries be flagged?"],
    helper: "Duplicate checks, validation behavior, suspicious activity, and back-check rules.",
    id: "quality",
    label: "5. Quality",
    mustDo: "Choose how errors and duplicate risks are handled before review.",
  },
  {
    categories: ["Permissions", "Workflow", "Assignment rules", "Review escalation"],
    decisions: ["Who can collect this form?", "Who reviews and approves?", "When should slow reviews escalate?"],
    helper: "Who can collect, review, approve, and see the form.",
    id: "access",
    label: "6. Access",
    mustDo: "Select the field officers or project team who can use this form.",
  },
  {
    categories: ["Governance", "Version information", "Privacy", "Retention", "Export governance", "Testing", "Source-of-truth"],
    decisions: ["How sensitive is the data?", "Can approved data be edited?", "What approval and export controls apply?"],
    helper: "Risk, locking, audit trail, version notes, and reviewer sign-off.",
    id: "governance",
    label: "7. Governance",
    mustDo: "Make approvals and published-version behavior safe and traceable.",
  },
  {
    categories: ["Tracking", "Sampling", "Localization", "Trigger rules", "Partner rules", "Case escalation"],
    decisions: ["Is this part of a form journey?", "Does it need sampling or waves?", "Should it trigger follow-up work?"],
    helper: "Longitudinal tracking, sampling, translations, triggers, and automation.",
    id: "advanced",
    label: "8. Advanced",
    mustDo: "Add optional study-management settings only when the program needs them.",
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
      "Use a recommended operational structure with identity, date, location, evidence, and quality fields.",
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
    description: "Upload a spreadsheet — the first row becomes your questions, ready to edit in the builder.",
    id: "import",
    label: "Upload a Spreadsheet",
    icon: FileSpreadsheet,
  },
];

const starterTemplates: StarterTemplate[] = [
  {
    description:
      "Register any tracked person, product, asset, site, facility, customer, employee, or project record once with identity, location, and contact details.",
    fields: [
      { label: "Consent confirmed", required: true, type: "radio" },
      { label: "Record name", required: true, type: "text" },
      { label: "Phone number", type: "phone" },
      { label: "Gender", type: "radio" },
      { label: "Date of birth", type: "date" },
      { label: "Location", required: true, type: "text" },
      { label: "External ID", type: "text" },
      { label: "Registration GPS", type: "gps" },
    ],
    formType: "Registration",
    id: "entity-registration",
    name: "Entity / Record Registration",
    sectorIds: ["custom", "agriculture", "health", "education", "wash", "humanitarian", "nutrition", "livelihoods", "protection", "governance", "environment", "research", "retail", "sales", "inventory", "logistics", "manufacturing", "hr", "audits", "inspections", "assets"],
  },
  {
    description:
      "Capture baseline status, household profile, services received, and initial indicator values.",
    fields: [
      { label: "Record code", required: true, type: "text" },
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
    sectorIds: ["agriculture", "health", "education", "wash", "humanitarian", "nutrition", "livelihoods", "protection", "governance", "environment", "research"],
  },
  {
    description:
      "Use for repeated visits, progress checks, training follow-up, and data quality evidence.",
    fields: [
      { label: "Record code", required: true, type: "text" },
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
    sectorIds: ["agriculture", "health", "education", "wash", "humanitarian", "nutrition", "livelihoods", "protection", "governance", "environment", "research", "logistics", "assets"],
  },
  {
    description:
      "Track attendance, inputs, kits, cash, services, or materials delivered to participants.",
    fields: [
      { label: "Record code", required: true, type: "text" },
      { label: "Distribution date", required: true, type: "date" },
      { label: "Item or service received", required: true, type: "select" },
      { label: "Quantity received", type: "number" },
      { label: "Recipient signature", type: "signature" },
      { label: "Distribution GPS", type: "gps" },
    ],
    formType: "Training Attendance",
    id: "attendance-distribution",
    name: "Attendance / Distribution",
    sectorIds: ["education", "health", "humanitarian", "nutrition", "livelihoods", "protection", "governance", "hr"],
  },
  {
    description:
      "Capture feedback, complaints, safeguarding notes, consent, and follow-up routing in a governed response workflow.",
    fields: [
      { label: "Consent confirmed", required: true, type: "radio" },
      { label: "Feedback date", required: true, type: "date" },
      { label: "Feedback type", required: true, type: "select" },
      { label: "Satisfaction rating", type: "rating" },
      { label: "Issue or feedback details", required: true, type: "textarea" },
      { label: "Follow-up requested", required: true, type: "radio" },
      { label: "Contact phone", type: "phone" },
    ],
    formType: "Feedback",
    id: "beneficiary-feedback",
    name: "Beneficiary Feedback",
    sectorIds: ["custom", "humanitarian", "protection", "governance", "health", "education", "livelihoods"],
  },
  {
    description:
      "Count stock, products, supplies, assets, or warehouse items with variance notes and evidence.",
    fields: [
      { label: "Item code", required: true, type: "text" },
      { label: "Item name", required: true, type: "text" },
      { label: "Location or store", required: true, type: "text" },
      { label: "Quantity counted", required: true, type: "number" },
      { label: "Expected quantity", type: "number" },
      { label: "Variance reason", type: "textarea" },
      { label: "Photo evidence", type: "photo" },
    ],
    formType: "Inventory Count",
    id: "inventory-count",
    name: "Inventory Count",
    sectorIds: ["retail", "inventory", "logistics", "manufacturing", "assets"],
  },
  {
    description:
      "Record route, shipment condition, receiver signature, delivery timing, location evidence, and delivery exceptions.",
    fields: [
      { label: "Delivery reference", required: true, type: "text" },
      { label: "Delivery date", required: true, type: "date" },
      { label: "Route or vehicle", required: true, type: "text" },
      { label: "Receiver name", required: true, type: "text" },
      { label: "Delivery condition", required: true, type: "radio" },
      { label: "Receiver signature", type: "signature" },
      { label: "Delivery GPS", required: true, type: "gps" },
      { label: "Photo evidence", type: "photo" },
    ],
    formType: "Delivery Proof",
    id: "delivery-proof",
    name: "Delivery Proof and Route Check",
    sectorIds: ["logistics", "retail", "inventory", "manufacturing", "assets"],
  },
  {
    description:
      "Inspect a site, facility, route, machine, store, asset, or process with findings and corrective action.",
    fields: [
      { label: "Inspection subject", required: true, type: "text" },
      { label: "Inspection date", required: true, type: "date" },
      { label: "Overall status", required: true, type: "radio" },
      { label: "Findings", type: "textarea" },
      { label: "Corrective action needed", required: true, type: "radio" },
      { label: "Inspector signature", type: "signature" },
      { label: "Inspection GPS", type: "gps" },
    ],
    formType: "Inspection",
    id: "inspection-checklist",
    name: "Inspection Checklist",
    sectorIds: ["health", "education", "wash", "logistics", "manufacturing", "audits", "inspections", "assets"],
  },
];

const starterTemplateAliases: Record<string, string> = {
  "tpl-baseline": "baseline",
  "tpl-compliance-audit": "inspection-checklist",
  "tpl-delivery-proof": "delivery-proof",
  "tpl-feedback": "beneficiary-feedback",
  "tpl-monitoring": "monitoring-visit",
  "tpl-retail-stock": "inventory-count",
};

export function resolvePendingStarterTemplateId(
  pendingTemplateId: string | null,
): string | null {
  if (!pendingTemplateId) return null;
  const normalizedTemplateId =
    starterTemplateAliases[pendingTemplateId] ?? pendingTemplateId;
  return (
    starterTemplates.find((template) => template.id === normalizedTemplateId)?.id ??
    null
  );
}

export function resolveStarterTemplateForSector(
  selectedTemplateId: string | null,
  sectorId: string,
): string {
  const resolvedSelectedTemplateId = resolvePendingStarterTemplateId(
    selectedTemplateId,
  );
  if (resolvedSelectedTemplateId) return resolvedSelectedTemplateId;
  const sectorTemplates = starterTemplates.filter((template) =>
    template.sectorIds.includes(sectorId),
  );
  return (sectorTemplates[0] ?? starterTemplates[0])?.id ?? "";
}

export function lifecycleActionState(
  lifecycleStatus: "draft" | "testing" | "review" | "approved" | "published" | "suspended" | "archived",
  testingCompleted = false,
): {
  approveDisabled: boolean;
  approveLabel: string;
  reviewDisabled: boolean;
  reviewLabel: string;
  testingDisabled: boolean;
  testingLabel: string;
} {
  const reviewBlockedUntilTested =
    (lifecycleStatus === "draft" || lifecycleStatus === "testing") && !testingCompleted;
  return {
    approveDisabled: ["approved", "published", "archived"].includes(lifecycleStatus),
    approveLabel:
      lifecycleStatus === "approved" || lifecycleStatus === "published"
        ? "Approved for Publish"
        : "Approve for Publish",
    reviewDisabled:
      reviewBlockedUntilTested ||
      ["review", "approved", "published", "archived"].includes(lifecycleStatus),
    reviewLabel:
      lifecycleStatus === "review"
        ? "Under Review"
        : lifecycleStatus === "approved" || lifecycleStatus === "published"
          ? "Review complete"
          : reviewBlockedUntilTested
            ? "Complete Preview & Test"
          : "Submit for Review",
    testingDisabled: lifecycleStatus !== "draft",
    testingLabel:
      lifecycleStatus === "draft"
        ? "Move to Testing"
        : lifecycleStatus === "testing"
          ? "In Testing"
          : "Testing complete",
  };
}

export function duplicateReviewDefaults(
  current: Pick<
    FormControlsDraft,
    | "duplicateAction"
    | "duplicateFields"
    | "duplicateGpsDetection"
    | "duplicateSeverity"
    | "duplicateThreshold"
  >,
): Pick<
  FormControlsDraft,
  | "duplicateAction"
  | "duplicateFields"
  | "duplicateGpsDetection"
  | "duplicateSeverity"
  | "duplicateThreshold"
> {
  return {
    duplicateAction: "review",
    duplicateFields: current.duplicateFields.length
      ? current.duplicateFields
      : ["phone_number", "household_id", "full_name", "village"],
    duplicateGpsDetection: true,
    duplicateSeverity: "high",
    duplicateThreshold: Math.max(current.duplicateThreshold, 85),
  };
}

export function requiredQuestionsAdviceState(fieldCount: number): {
  fix: string;
  platformAction: string;
  quickFixId?: PublishQuickFixId;
  why: string;
} {
  if (fieldCount <= 0) {
    return {
      fix:
        "Open Builder and add the core questions first. Once they exist, mark identity, date, location, consent, service, or activity questions as required.",
      platformAction:
        "Manager decision needed: the platform can open Builder, but it cannot mark required questions until at least one question exists.",
      why:
        "This form has no questions yet, so there is nothing the platform can safely mark as required. Add the data fields first, then review which ones must block incomplete submissions.",
    };
  }

  return {
    fix:
      "Click Apply platform fix to mark detected consent, identity, date, location, service, and activity questions as required. Then review any sensitive questions manually.",
    platformAction:
      "The platform can mark obvious core questions as required and allow Don't know / Refused metadata for review.",
    quickFixId: "mark_core_required",
    why:
      `None of the ${fieldCount} question${fieldCount === 1 ? "" : "s"} is required, so incomplete submissions could pass into review.`,
  };
}

export function warningQuickFixForItemId(itemId: string): PublishQuickFixId | undefined {
  if (itemId === "standard-questions") return "add_standard_questions";
  if (itemId === "mapping-suggestions") return "apply_profile_mapping";
  if (itemId === "mobile-complexity") return "mobile_readiness_defaults";
  if (
    [
      "offline",
      "mobile-package",
      "reference-data",
      "enumerator-quality",
      "repeat-groups",
      "field-integrity",
      "back-checks",
      "field-officer-training",
    ].includes(itemId)
  ) {
    return "evidence_defaults";
  }
  if (["results-linkage", "dont-know-policy"].includes(itemId)) {
    return "mne_context_defaults";
  }
  if (["export-governance", "privacy", "partner-sharing", "case-escalation"].includes(itemId)) {
    return "governance_defaults";
  }
  return undefined;
}

export function quickSetupReviewDefaults(
  current: Pick<
    FormControlsDraft,
    | "assignedFieldOfficerIds"
    | "assignedTeamIds"
    | "assignmentMode"
    | "changeSummary"
    | "lifecycleStatus"
    | "profileMappings"
    | "profileUpdateMode"
    | "reviewComments"
  >,
  fields: FormField[],
): Pick<
  FormControlsDraft,
  | "assignmentMode"
  | "changeSummary"
  | "lifecycleStatus"
  | "profileMappings"
  | "profileUpdateMode"
  | "reviewComments"
> {
  const suggestedMappings = suggestedProfileMappingsFromFields(fields);
  const profileMappings = {
    ...current.profileMappings,
    ...Object.fromEntries(
      Object.entries(suggestedMappings).filter(([, value]) => Boolean(value)),
    ),
  } as FormControlsDraft["profileMappings"];
  const mappedCount = Object.values(profileMappings).filter(Boolean).length;
  const needsAssignedOfficers =
    current.assignmentMode === "assigned_only" &&
    current.assignedFieldOfficerIds.length === 0 &&
    current.assignedTeamIds.length === 0;

  return {
    assignmentMode: needsAssignedOfficers ? "project_team" : current.assignmentMode,
    changeSummary: current.changeSummary.trim() || "Initial test-ready draft.",
    lifecycleStatus: "testing",
    profileMappings,
    profileUpdateMode:
      current.profileUpdateMode !== "never" && mappedCount < 2
        ? "never"
        : current.profileUpdateMode,
    reviewComments:
      current.reviewComments || "Prepared with recommended defaults and ready for Preview & Test.",
  };
}

export function previewTestReviewDefaults(
  current: Pick<FormControlsDraft, "reviewComments" | "testingCompletedAt">,
  completedAt = new Date().toISOString(),
): Pick<FormControlsDraft, "lifecycleStatus" | "reviewComments" | "testingCompletedAt"> {
  return {
    lifecycleStatus: "review",
    reviewComments:
      current.reviewComments || "Submitted for technical and sector review.",
    testingCompletedAt: current.testingCompletedAt || completedAt,
  };
}

export function approvalActionState(
  lifecycleStatus: FormControlsDraft["lifecycleStatus"],
  criticalFailureCount: number,
  testingCompleted = true,
): {
  canApprove: boolean;
  label: string;
  message: string;
} {
  if (lifecycleStatus === "approved" || lifecycleStatus === "published") {
    return {
      canApprove: false,
      label: "Approved for Publish",
      message: "This form is already approved for publishing.",
    };
  }
  if (lifecycleStatus === "draft" || lifecycleStatus === "testing") {
    return {
      canApprove: false,
      label: "Submit for review first",
      message:
        "Move the form through testing and submit it for review before approving it for publishing.",
    };
  }
  if (!testingCompleted) {
    return {
      canApprove: false,
      label: "Complete Preview & Test",
      message:
        "Complete Preview & Test before approving this form for publishing.",
    };
  }
  if (criticalFailureCount > 0) {
    return {
      canApprove: false,
      label: "Resolve blockers before approval",
      message:
        "Resolve the required readiness blockers before approving this form for publishing.",
    };
  }
  return {
    canApprove: true,
    label: "Approve Form",
    message: "This form is ready for approval.",
  };
}

export function activeLifecycleStepId(
  stage: CreationStage,
  lifecycleStatus: FormControlsDraft["lifecycleStatus"],
  published: boolean,
  criticalFailureCount: number,
): "setup" | "builder" | "controls" | "test" | "review" | "approve" | "publish" {
  if (published) return "publish";
  if (stage === "setup" || stage === "start") return "setup";
  if (stage === "builder") return "builder";
  if (stage === "controls") return "controls";
  if (stage === "preview") return "test";
  if (lifecycleStatus === "approved") {
    return criticalFailureCount > 0 ? "approve" : "publish";
  }
  return "review";
}

function requiredItemsComplete(
  checklist: PublishReadinessItem[],
  jumpTo: CreationStage,
  excludedIds: string[] = [],
): boolean {
  const requiredItems = checklist.filter(
    (item) => item.jumpTo === jumpTo && item.required && !excludedIds.includes(item.id),
  );
  return requiredItems.length > 0 && requiredItems.every((item) => item.complete);
}

export function testingReadinessComplete(
  controls: Pick<FormControlsDraft, "testingCompletedAt" | "testingRequirement">,
): boolean {
  return Boolean(controls.testingRequirement && controls.testingCompletedAt);
}

export function assignmentReadinessState(
  collectionMethod: CollectionMethod,
  controls: Pick<
    FormControlsDraft,
    "assignedFieldOfficerIds" | "assignedTeamIds" | "assignmentMode"
  >,
): { complete: boolean; required: boolean } {
  const mobileCollection = collectionMethod !== "web";
  const assignedTargetSelected =
    controls.assignedFieldOfficerIds.length > 0 || controls.assignedTeamIds.length > 0;
  const assignedOnly = controls.assignmentMode === "assigned_only";
  return {
    complete: assignedOnly ? !mobileCollection || assignedTargetSelected : Boolean(controls.assignmentMode),
    required: assignedOnly && mobileCollection,
  };
}

export function approvalBlockingFailures(
  checklist: PublishReadinessItem[],
): PublishReadinessItem[] {
  return checklist.filter(
    (item) => item.required && !item.complete && item.id !== "lifecycle-approved",
  );
}

export const MINIMUM_PUBLISH_READINESS_SCORE = 60;

const HARD_PUBLISH_BLOCKER_IDS = new Set(["name", "project", "questions", "variables"]);

export function publishBlockingFailures(
  checklist: PublishReadinessItem[],
): PublishReadinessItem[] {
  return checklist.filter(
    (item) => HARD_PUBLISH_BLOCKER_IDS.has(item.id) && !item.complete,
  );
}

export function lifecycleCompletionState(params: {
  checklist: PublishReadinessItem[];
  hasDraft: boolean;
  lifecycleStatus: FormControlsDraft["lifecycleStatus"];
  published: boolean;
  testingCompletedAt: string;
}): Record<(typeof lifecycleSteps)[number]["id"], boolean> {
  const { checklist, hasDraft, lifecycleStatus, published, testingCompletedAt } = params;
  return {
    approve: lifecycleStatus === "approved" || published,
    builder: hasDraft && requiredItemsComplete(checklist, "builder"),
    controls:
      hasDraft && requiredItemsComplete(checklist, "controls", ["lifecycle-approved"]),
    publish: published,
    review:
      lifecycleStatus === "review" || lifecycleStatus === "approved" || published,
    setup: requiredItemsComplete(checklist, "setup"),
    test: Boolean(testingCompletedAt) || published,
  };
}

const defaultControlsDraft: FormControlsDraft = {
  accessibilityMode: "standard",
  allowAnonymous: true,
  allowManualCoordinates: false,
  approvalEscalationHours: 48,
  assignmentMode: "assigned_only",
  assignedFieldOfficerIds: [],
  assignedTeamIds: [],
  auditTrail: true,
  autoAssignmentRule: "",
  backCheckRequired: false,
  backCheckSamplePercent: 10,
  beneficiarySearch: "disabled",
  blockWithoutConsent: false,
  boundaryValidation: false,
  businessPurpose: "Support operational decisions, review, and reporting.",
  caseEscalationRule: "If safeguarding, protection, or urgent-risk answer is selected -> create supervisor alert.",
  changeSummary: "",
  consentMode: "digital",
  coordinateMasking: false,
  dataQualityMode: "standard",
  decisionUse: "operational_decision",
  dataFreezeRequired: true,
  dataSourceType: "primary",
  dataRetentionPolicy: "seven_years",
  deviceClockDriftAction: "review",
  disaggregationFields: [],
  disaggregationRequired: false,
  dontKnowPolicy: "required_for_sensitive",
  duplicateAction: "review",
  duplicateFields: [],
  duplicateGpsDetection: true,
  duplicateSeverity: "high",
  duplicateThreshold: 85,
  enumeratorTrainingRequired: false,
  entityCategoryId: "",
  entityType: "Record",
  eventMode: "none",
  expectedUse: "Approved records feed dashboards, workflows, exports, and reports.",
  exportApprovalMode: "manager_approval",
  exportRestricted: false,
  fileTypes: "jpg,png,pdf",
  fieldGuideText: "Read each question exactly as written, confirm the record context when required, capture evidence when required, and sync when connectivity allows.",
  formObjective: "Collect reliable field evidence for project decisions.",
  frequencyWindow: "none",
  geographicScope: "",
  gpsAccuracy: 20,
  indicatorComponent: "none",
  indicatorLink: "",
  invalidAgeAction: "review",
  importTemplateMode: "form_dictionary",
  lifecycleStatus: "draft",
  linkedOutcome: "",
  linkedOutput: "",
  localizationLanguages: "English",
  maxAttachmentSizeMb: 10,
  maximumDurationMinutes: 90,
  maximumSubmissionsPerDay: 40,
  mediaRequirement: "none",
  meReviewerName: "Business Reviewer",
  minimumDurationMinutes: 5,
  mobilePackageMode: "standard",
  offlineEnabled: true,
  offlineMaxDays: 7,
  offlineMediaCapture: true,
  lockApprovedRecords: true,
  permissionPreset: "standard",
  piiHandling: "mask_exports",
  parentForm: "",
  partnerDataSharingRule: "Approved, permissioned records only; exports require audit logging and manager approval.",
  programObjective: "",
  profileMappings: {
    dob: "",
    fullName: "",
    gender: "",
    gps: "",
    phone: "",
    village: "",
  },
  profileUpdateMode: "never",
  referenceDataRequired: false,
  relatedForms: "",
  requireConsent: false,
  preventFutureDates: true,
  repeatGroupPolicy: "review_large",
  reportingPeriod: "none",
  respondentIdentification: "anonymous_allowed",
  resultArea: "",
  reviewComments: "",
  reviewApprover: "me_manager",
  reviewer: "supervisor",
  reviewReturner: "supervisor",
  requiresEntity: false,
  requiresGps: false,
  riskClassification: "medium",
  samplingMethod: "none",
  sourceOfTruthRule: "manager_approved_profile_updates",
  staticGpsAction: "review",
  submissionEditPolicy: "change_request",
  seasonEnd: "",
  seasonName: "",
  seasonStart: "",
  storeConsentVersion: true,
  syncRequirement: "daily_required",
  technicalReviewerName: "Technical Reviewer",
  testingRequirement: "test_submission",
  testingCompletedAt: "",
  finalApproverName: "Operations Manager",
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

const previewFieldOfficers: FieldOfficerRead[] = [
  {
    device_id: null,
    email: "amina.field@atlas-demo.org",
    employee_code: "FO-001",
    full_name: "Amina Field Officer",
    home_region: "North West",
    id: "preview-officer-amina",
    is_active: true,
    last_latitude: null,
    last_longitude: null,
    last_seen_at: null,
    last_sync_at: null,
    phone_number: "+237 677 000 001",
    supervisor_name: "Demo Supervisor",
    supervisor_user_id: "preview-supervisor-demo",
    user_id: "preview-user-amina",
  },
  {
    device_id: null,
    email: "james.field@atlas-demo.org",
    employee_code: "FO-002",
    full_name: "James Field Officer",
    home_region: "Central",
    id: "preview-officer-james",
    is_active: true,
    last_latitude: null,
    last_longitude: null,
    last_seen_at: null,
    last_sync_at: null,
    phone_number: "+237 677 000 002",
    supervisor_name: "Demo Supervisor",
    supervisor_user_id: "preview-supervisor-demo",
    user_id: "preview-user-james",
  },
];

const previewTeams: TeamRead[] = [
  {
    code: "TEAM-NW",
    created_at: "2024-01-01T00:00:00Z",
    department_id: null,
    id: "preview-team-nw",
    is_active: true,
    manager_user_id: null,
    name: "North West Field Team",
    organization_unit_id: null,
    project_id: null,
    region: "North West",
    team_type: "field",
  },
  {
    code: "TEAM-CE",
    created_at: "2024-01-01T00:00:00Z",
    department_id: null,
    id: "preview-team-ce",
    is_active: true,
    manager_user_id: null,
    name: "Central Field Team",
    organization_unit_id: null,
    project_id: null,
    region: "Central",
    team_type: "field",
  },
];

function variableNameFromLabel(label: string, fallback: string): string {
  const safeFallback =
    fallback
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9_]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .replace(/_+/g, "_")
      .slice(0, 54) || "question";
  return (
    label
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 54) || safeFallback
  );
}

function isValidVariableName(value: string): boolean {
  return /^[a-z_][a-z0-9_]{0,63}$/.test(value);
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

function entityCodeExample(entityType: string): string {
  const compact = entityType.replace(/[^A-Za-z0-9]/g, "").slice(0, 3).toUpperCase() || "ENT";
  return `${compact.padEnd(3, "X")}-${new Date().getFullYear()}-000001`;
}

function entityCategoryPath(
  category: EntityCategoryRead,
  categories: EntityCategoryRead[],
): string {
  const categoryById = new Map(categories.map((item) => [item.id, item]));
  const path: string[] = [];
  const seen = new Set<string>();
  let current: EntityCategoryRead | undefined = category;
  while (current && !seen.has(current.id)) {
    path.unshift(current.name);
    seen.add(current.id);
    current = current.parent_category_id
      ? categoryById.get(current.parent_category_id)
      : undefined;
  }
  return path.join(" / ");
}

function messageFromUnknownError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "The request could not be completed.";
}

function formatClockTime(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(
    new Date(timestamp),
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

function fieldTypeFromEntityAttribute(type: string): FieldType {
  const normalized = type.toLowerCase().replace(/[_\s-]+/g, "_");
  const map: Record<string, FieldType> = {
    barcode: "barcode",
    boolean: "checkbox",
    calculated_field: "calculated",
    checkbox: "checkbox",
    currency: "decimal",
    date: "date",
    datetime: "datetime",
    dropdown: "select",
    email: "email",
    file_upload: "file",
    gps_location: "gps",
    image_upload: "photo",
    long_text: "textarea",
    multi_select: "multiselect",
    number: "number",
    percentage: "decimal",
    phone_number: "phone",
    qr_code: "qr",
    radio_button: "radio",
    signature: "signature",
    text: "text",
    time: "time",
    url: "url",
  };
  return map[normalized] ?? "text";
}

function formOperationalFamily(formType: string): "registration" | "baseline" | "monitoring" | "attendance" | "custom" {
  const normalized = formType.toLowerCase();
  if (/registration|register|intake|enrol/.test(normalized)) return "registration";
  if (/baseline|endline|assessment|evaluation/.test(normalized)) return "baseline";
  if (/monitor|follow|visit|case update/.test(normalized)) return "monitoring";
  if (/attendance|distribution|training|service|input|cash|kit/.test(normalized)) return "attendance";
  return "custom";
}

function apiFormTypeValue(formType: string): FormType {
  const normalized = formType.trim().toLowerCase();
  if (/registration|register|intake|enrol/.test(normalized)) return "registration";
  if (/baseline/.test(normalized)) return "baseline";
  if (/endline/.test(normalized)) return "endline";
  if (/follow[\s_-]?up/.test(normalized)) return "follow_up";
  if (/monitor|visit/.test(normalized)) return "monitoring";
  if (/attendance|training/.test(normalized)) return "attendance";
  if (/distribution|delivery|stock|inventory/.test(normalized)) return "distribution";
  if (/verification|inspect|audit/.test(normalized)) return "verification";
  if (/assessment|evaluation|survey/.test(normalized)) return "assessment";
  if (/case[\s_-]?update/.test(normalized)) return "case_update";
  if (/complaint|feedback|incident/.test(normalized)) return "complaint";
  return "custom";
}

function prefillSourceFieldForProfileTarget(
  target: keyof FormControlsDraft["profileMappings"],
): string | null {
  switch (target) {
    case "fullName":
      return "name";
    case "phone":
      return "phone";
    case "gender":
      return "gender";
    case "dob":
      return "dateOfBirth";
    case "village":
      return "village";
    case "gps":
      return "gps";
    default:
      return null;
  }
}

// Maps a profile control target to the beneficiary profile field the backend resolver
// understands (see _profile_key_from_mapping). These tags, written onto the field's
// help text, are what the backend reads on approval to name/update the entity.
const PROFILE_TARGET_TO_BENEFICIARY_FIELD: Record<keyof FormControlsDraft["profileMappings"], string> = {
  fullName: "full_name",
  phone: "phone",
  gender: "gender",
  dob: "dob",
  village: "village",
  gps: "gps",
};

function stripBeneficiaryProfileTags(text: string): string {
  return text
    .replace(/\[profile-impact:[^\]]*\]/g, "")
    .replace(/\[beneficiary-field:[^\]]*\]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Projects the explicit profile mappings (which question is the entity's name, phone,
 * GPS, …) onto the schema fields so they reach the backend on approval. Without this the
 * mapping lives only in form controls (prefill), and entity naming silently falls back to
 * a variable-name heuristic. Idempotent: re-applies cleanly on every save.
 */
function applyProfileMappingsToForm(form: DynamicForm, controls: FormControlsDraft): DynamicForm {
  const profileFieldByVariable = new Map<string, string>();
  for (const [target, variable] of Object.entries(controls.profileMappings)) {
    const normalizedVariable = (variable ?? "").trim().toLowerCase();
    const profileField = PROFILE_TARGET_TO_BENEFICIARY_FIELD[target as keyof FormControlsDraft["profileMappings"]];
    if (normalizedVariable && profileField) {
      profileFieldByVariable.set(normalizedVariable, profileField);
    }
  }
  return {
    ...form,
    fields: form.fields.map((field) => {
      const variable = (field.variableName ?? "").trim().toLowerCase();
      const profileField = variable ? profileFieldByVariable.get(variable) : undefined;
      // Only touch fields explicitly mapped to a profile target. Fields tagged by other
      // sources (e.g. imported entity-category attributes) are left untouched.
      if (!profileField) return field;
      const base = stripBeneficiaryProfileTags(field.appearance?.helpText ?? "");
      const helpText = `${base} [profile-impact:updates_profile] [beneficiary-field:${profileField}]`.trim();
      return {
        ...field,
        beneficiary: { ...(field.beneficiary ?? {}), profileField, profileImpact: "updates_profile" as const },
        appearance: { ...field.appearance, helpText },
      };
    }),
  };
}

function buildEntityPrefillMappings(
  controls: FormControlsDraft,
  form: DynamicForm,
): Array<{ sourceEntityField: string; targetQuestionId: string; lockBehavior: "ReadOnly" | "Editable" | "EditableWithReason" }> {
  const questionIdsByVariable = new Map(
    form.fields.map((field) => [
      (field.variableName ?? variableNameFromLabel(field.label, field.id)).trim().toLowerCase(),
      field.id,
    ]),
  );
  const lockBehavior =
    controls.profileUpdateMode === "with_supervisor_approval"
      ? "ReadOnly"
      : controls.profileUpdateMode === "after_submission"
        ? "EditableWithReason"
        : "Editable";

  return Object.entries(controls.profileMappings).flatMap(([target, mappedVariable]) => {
    const variable = mappedVariable.trim().toLowerCase();
    const sourceEntityField = prefillSourceFieldForProfileTarget(
      target as keyof FormControlsDraft["profileMappings"],
    );
    const questionId = variable ? questionIdsByVariable.get(variable) : undefined;
    if (!sourceEntityField || !questionId) {
      return [];
    }
    return [{ sourceEntityField, targetQuestionId: questionId, lockBehavior }];
  });
}

function recommendedQuestionsForFormType(
  setup: FormSetupDraft,
  controls: FormControlsDraft,
): RecommendedQuestion[] {
  const common: RecommendedQuestion[] = [
    {
      label: "Submission date",
      required: true,
      type: "date",
      validation: controls.preventFutureDates ? { blockFutureDates: true } : undefined,
    },
  ];
  const family = formOperationalFamily(setup.formType);
  if (family === "registration") {
    return [
      { label: "Consent confirmed", options: ["Yes", "No"], required: true, type: "radio" },
      { label: `${controls.entityType || "Entity"} name`, required: true, type: "text" },
      { label: "Phone number", type: "phone" },
      { label: "Gender", options: ["Female", "Male", "Other", "Prefer not to say"], required: true, type: "radio" },
      {
        label: "Date of birth",
        type: "date",
        validation: controls.preventFutureDates ? { blockFutureDates: true } : undefined,
      },
      { label: "Village", required: true, type: "text" },
      { label: "Household ID", type: "text" },
      { label: "Registration GPS", required: controls.requiresGps, type: "gps", validation: { accuracyMax: controls.gpsAccuracy } },
      ...common,
    ];
  }
  if (family === "baseline") {
    return [
      { label: `${controls.entityType || "Entity"} code`, required: true, type: "text" },
      { label: "Consent confirmed", options: ["Yes", "No"], required: controls.requireConsent, type: "radio" },
      { label: "Baseline interview date", required: true, type: "date", validation: { blockFutureDates: controls.preventFutureDates } },
      { label: "Enumerator notes", type: "textarea" },
      { label: "Baseline GPS", required: controls.requiresGps, type: "gps", validation: { accuracyMax: controls.gpsAccuracy } },
      ...common,
    ];
  }
  if (family === "monitoring") {
    return [
      { label: `${controls.entityType || "Entity"} code`, required: true, type: "text" },
      { label: "Monitoring visit date", required: true, type: "date", validation: { blockFutureDates: controls.preventFutureDates } },
      { label: "Service or activity received", required: true, type: "select", options: ["Training", "Input distribution", "Follow-up visit", "Other"] },
      { label: "Follow-up needed", required: true, type: "radio", options: ["Yes", "No"] },
      { label: "Monitoring GPS", required: controls.requiresGps, type: "gps", validation: { accuracyMax: controls.gpsAccuracy } },
      ...common,
    ];
  }
  if (family === "attendance") {
    return [
      { label: `${controls.entityType || "Entity"} code`, required: true, type: "text" },
      { label: "Event or activity date", required: true, type: "date", validation: { blockFutureDates: controls.preventFutureDates } },
      { label: "Item or service received", required: true, type: "select", options: ["Training", "Input", "Cash", "Service", "Other"] },
      { label: "Quantity received", type: "number", validation: { min: 0 } },
      { label: "Recipient signature", type: "signature" },
      ...common,
    ];
  }
  return common;
}

function fieldLabelMatches(field: FormField, patterns: RegExp[]): boolean {
  const haystack = `${field.label} ${field.variableName ?? ""}`.toLowerCase();
  return patterns.some((pattern) => pattern.test(haystack));
}

function missingRecommendedQuestions(
  form: DynamicForm | null | undefined,
  setup: FormSetupDraft,
  controls: FormControlsDraft,
): RecommendedQuestion[] {
  const fields = form?.fields ?? [];
  return recommendedQuestionsForFormType(setup, controls).filter((question) => {
    const normalized = variableNameFromLabel(question.label, question.label);
    const words = normalized.split("_").filter((word) => word.length > 2);
    return !fields.some((field) =>
      words.some((word) =>
        `${field.label} ${field.variableName ?? ""}`.toLowerCase().includes(word),
      ),
    );
  });
}

function suggestedProfileMappingsFromFields(
  fields: FormField[],
): Partial<FormControlsDraft["profileMappings"]> {
  const findVariable = (patterns: RegExp[]) =>
    fields.find((field) => fieldLabelMatches(field, patterns))?.variableName;
  return {
    dob: findVariable([/\bdob\b/, /date.*birth/, /birth.*date/]),
    fullName: findVariable([/full.*name/, /beneficiary.*name/, /farmer.*name/, /respondent.*name/]),
    gender: findVariable([/gender/, /\bsex\b/]),
    gps: findVariable([/gps/, /location/, /coordinate/]),
    phone: findVariable([/phone/, /mobile/, /contact/]),
    village: findVariable([/village/, /community/, /location/]),
  };
}

function weakQuestionLabels(fields: FormField[]): FormField[] {
  return fields.filter((field) => {
    const label = field.label.trim();
    return (
      !label ||
      /^untitled|^question\s*\d+$/i.test(label) ||
      /\b(and|or)\b/i.test(label) && label.split(/\s+/).length > 10 ||
      /please\s+provide\s+all|describe everything|other information/i.test(label)
    );
  });
}

function improvedQuestionLabel(field: FormField, index: number): string {
  const label = field.label.trim();
  if (!label || /^untitled/i.test(label) || /^question\s*\d+$/i.test(label)) {
    return `Question ${index + 1}: describe the required response`;
  }
  if (/please\s+provide\s+all|describe everything|other information/i.test(label)) {
    return "Additional relevant details";
  }
  if (/\b(and|or)\b/i.test(label) && label.split(/\s+/).length > 10) {
    return label
      .replace(/\s+(and|or)\s+.*$/i, "")
      .replace(/[?.!,;:]+$/g, "")
      .trim();
  }
  return label;
}

function coreRequiredField(field: FormField): boolean {
  return /consent|beneficiary|respondent|name|code|phone|household|village|community|gps|location|date|service|activity|quantity/i.test(
    `${field.label} ${field.variableName ?? ""}`,
  );
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

type WorksheetCell = { reference: string | null; value: string };

/**
 * Place a row's cells into column-indexed slots. Cells normally carry an `r`
 * reference (e.g. "B2"), but some exporters (LibreOffice, streamed writers)
 * omit it — in that case fall back to the next sequential position instead of
 * collapsing every cell onto column A (which would drop all but one column).
 */
export function assembleWorksheetRow(cells: WorksheetCell[]): string[] {
  const values: string[] = [];
  let nextIndex = 0;
  let maxIndex = -1;
  for (const cell of cells) {
    const index = cell.reference ? columnIndexFromCellRef(cell.reference) : nextIndex;
    nextIndex = index + 1;
    maxIndex = Math.max(maxIndex, index);
    values[index] = cell.value;
  }
  // Build a dense array so sparse columns (gaps between cell references) become
  // empty strings instead of holes that `.map` would skip and leave undefined.
  return Array.from({ length: maxIndex + 1 }, (_, index) => values[index] ?? "");
}

function rowsFromWorksheetXml(xml: string, sharedStrings: string[]): string[][] {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  return Array.from(doc.getElementsByTagName("row")).map((row) => {
    const cells: WorksheetCell[] = Array.from(row.getElementsByTagName("c")).map((cell) => {
      const type = cell.getAttribute("t");
      // Inline strings live in <is><t>, shared strings reference an index via <v>.
      const inlineString = type === "inlineStr"
        ? cell.getElementsByTagName("t")[0]?.textContent ?? ""
        : null;
      const rawValue =
        cell.getElementsByTagName("v")[0]?.textContent ??
        cell.getElementsByTagName("t")[0]?.textContent ??
        "";
      const value =
        type === "s"
          ? (sharedStrings[Number(rawValue)] ?? "")
          : inlineString !== null
            ? decodeXmlText(inlineString)
            : decodeXmlText(rawValue);
      return { reference: cell.getAttribute("r"), value };
    });
    return assembleWorksheetRow(cells);
  });
}

export async function readSpreadsheetRows(file: File): Promise<string[][]> {
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
  if (/\bqr(?:\s+code)?\b/.test(label)) return "qr";
  if (/\bbar\s*code\b|\bbarcode\b/.test(label)) return "barcode";
  if (/\b(url|website|web address|link)\b/.test(label)) return "url";
  if (label.includes("photo") || label.includes("image")) return "photo";
  if (label.includes("signature")) return "signature";
  if (/\bgps\s+accuracy\b|\baccuracy\s*\(m\)\b|\baccuracy\s+meters?\b/.test(label)) return "decimal";
  if (/\b(lat|latitude|lon|lng|longitude)\b/.test(label)) return "decimal";
  if (label.includes("gps") || label.includes("coordinate")) return "gps";
  if (/\b(amount|price|cost|budget|revenue|sales value|expenditure|expense|income)\b/.test(label)) return "currency";
  if (/%|\b(percent|percentage|pct)\b/.test(label)) return "decimal";
  if (/\b(date\s*time|datetime|timestamp)\b/.test(label)) return "datetime";
  if (/\btime\b/.test(label)) return "time";
  if (/\b(id|code|sku|serial|account|reference|ref|identifier)\b/.test(label)) return "text";
  if (samples.length && samples.every((value) => /^https?:\/\/|^www\./i.test(value))) return "url";
  if (samples.length && samples.every((value) => /^([01]?\d|2[0-3]):[0-5]\d(:[0-5]\d)?(\s?(am|pm))?$/i.test(value))) return "time";
  if (samples.length && samples.every((value) => /^-?\d+$/.test(value))) return "number";
  if (samples.length && samples.every((value) => /^-?\d+(\.\d+)?$/.test(value))) return "decimal";
  if (samples.length && samples.every((value) => /^-?\d+(\.\d+)?%$/.test(value))) return "decimal";
  if (samples.length > 0 && samples.every((value) => !Number.isNaN(Date.parse(value)) && /\d{1,2}:\d{2}/.test(value))) return "datetime";
  if (label.includes("date") || (samples.length > 0 && samples.every((value) => !Number.isNaN(Date.parse(value))))) return "date";
  const normalized = new Set(samples.map((value) => value.toLowerCase()));
  if (normalized.size > 0 && normalized.size <= 8) {
    if ([...normalized].every((value) => ["yes", "no", "y", "n", "true", "false"].includes(value))) return "radio";
    return "select";
  }
  if (samples.some((value) => value.length > 100)) return "textarea";
  return "text";
}

export function uniqueSpreadsheetOptions(values: string[], limit = 20): string[] {
  const seen = new Set<string>();
  const options: string[] = [];
  for (const value of values) {
    const label = value.trim();
    const key = label.toLowerCase();
    if (!label || seen.has(key)) continue;
    seen.add(key);
    options.push(label);
    if (options.length >= limit) break;
  }
  return options;
}

export function spreadsheetOptionsForType(type: FieldType, samples: string[]): string[] | undefined {
  if (!["select", "radio", "dropdown", "multiselect"].includes(type)) return undefined;
  if (type === "radio") {
    const normalized = new Set(
      samples.map((value) => value.trim().toLowerCase()).filter(Boolean),
    );
    if (
      normalized.size > 0 &&
      [...normalized].every((value) =>
        ["yes", "no", "y", "n", "true", "false"].includes(value),
      )
    ) {
      return ["Yes", "No"];
    }
  }
  return uniqueSpreadsheetOptions(samples);
}

export function createDraftFromSpreadsheetRows(setup: FormSetupDraft, rows: string[], sampleRows: string[][]): DynamicForm {
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
      const options = spreadsheetOptionsForType(type, samples) ?? field.options;
      return {
        ...field,
        hint: `Imported from spreadsheet column ${index + 1}.`,
        label: header,
        options: options?.length ? options : field.options,
        required: false,
        validation:
          /\b(lat|latitude)\b/i.test(header)
            ? { ...field.validation, max: 90, min: -90 }
            : /\b(lon|lng|longitude)\b/i.test(header)
              ? { ...field.validation, max: 180, min: -180 }
              : /%|\b(percent|percentage|pct)\b/i.test(header)
                ? { ...field.validation, max: 100, min: 0 }
                : /\bgps\s+accuracy\b|\baccuracy\s*\(m\)\b|\baccuracy\s+meters?\b/i.test(header)
                  ? { ...field.validation, min: 0 }
                  : field.validation,
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
  formType: string,
): FormControlsSettings {
  const family = formOperationalFamily(formType);
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
  const createsNewEntity =
    controls.respondentIdentification === "new_registration"
    || controls.respondentIdentification === "existing_or_new"
    || (family === "registration" && controls.respondentIdentification !== "existing_beneficiary");
  const requiresExistingEntity =
    controls.requiresEntity
    || controls.respondentIdentification === "existing_beneficiary"
    || (
      ["baseline", "monitoring", "attendance"].includes(family)
      && controls.respondentIdentification !== "new_registration"
      && !controls.allowAnonymous
    );
  const updatesExistingEntity =
    controls.profileUpdateMode !== "never"
    && (requiresExistingEntity || controls.respondentIdentification === "existing_or_new");

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
    collection_access: {
      selection_mode: controls.assignmentMode,
      field_officer_ids:
        controls.assignmentMode === "assigned_only"
          ? controls.assignedFieldOfficerIds
          : [],
      team_ids:
        controls.assignmentMode === "assigned_only"
          ? controls.assignedTeamIds
          : [],
      assigned_at: controls.assignedFieldOfficerIds.length || controls.assignedTeamIds.length
        ? new Date().toISOString()
        : null,
      assigned_by_user_id: null,
      notes: controls.assignedFieldOfficerIds.length || controls.assignedTeamIds.length
        ? "Specific teams or field officers selected in form controls."
        : "No specific team or field officer selection saved.",
    },
    entity_controls: {
      linked_to_entity:
        controls.requiresEntity ||
        controls.profileUpdateMode !== "never" ||
        controls.respondentIdentification !== "anonymous_allowed" ||
        Object.values(controls.profileMappings).some(Boolean),
      entity_category_id: controls.entityCategoryId || null,
      entity_type: controls.entityType,
      creates_new_entity: createsNewEntity,
      updates_existing_entity: updatesExistingEntity,
      requires_existing_entity: requiresExistingEntity,
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
      prefill_mappings: buildEntityPrefillMappings(controls, form),
    },
    permission_rules: [
      {
        subject_type: "role",
        subject_name: "Form Owner",
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
      {
        id: "static_gps_detection",
        label: "Static GPS detection",
        rule_type: "field_integrity",
        enabled: controls.staticGpsAction !== "warn" || controls.duplicateGpsDetection,
        severity: controls.staticGpsAction === "block" ? "critical" : "high",
        blocking: controls.staticGpsAction === "block",
        fields: form.fields
          .filter((field) =>
            ["gps", "geolocation", "map", "geofence"].includes(field.type),
          )
          .map((field) => field.variableName ?? field.id),
        expression: `static_gps_action=${controls.staticGpsAction}`,
      },
      {
        id: "device_clock_drift",
        label: "Device clock drift",
        rule_type: "field_integrity",
        enabled: controls.deviceClockDriftAction !== "warn",
        severity: controls.deviceClockDriftAction === "block" ? "critical" : "medium",
        blocking: controls.deviceClockDriftAction === "block",
        fields: [],
        expression: `device_clock_drift_action=${controls.deviceClockDriftAction}`,
      },
      {
        id: "back_check_sample",
        label: "Back-check sample",
        rule_type: "back_check",
        enabled: controls.backCheckRequired,
        severity: "medium",
        blocking: false,
        fields: [],
        expression: `sample_percent=${controls.backCheckSamplePercent}`,
      },
      {
        id: "repeat_group_volume",
        label: "Repeat group volume review",
        rule_type: "repeat_group",
        enabled: controls.repeatGroupPolicy !== "allowed",
        severity: controls.repeatGroupPolicy === "restricted" ? "high" : "medium",
        blocking: controls.repeatGroupPolicy === "restricted",
        fields: form.fields
          .filter((field) => field.type === "repeat_group")
          .map((field) => field.variableName ?? field.id),
        expression: controls.repeatGroupPolicy,
      },
      {
        id: "pii_protection",
        label: "PII protection",
        rule_type: "privacy",
        enabled: controls.piiHandling !== "standard",
        severity: controls.piiHandling === "restricted" ? "critical" : "high",
        blocking: false,
        fields: dataDictionary
          .filter((entry) => entry.sensitivity === "PII")
          .map((entry) => entry.variable_name),
        expression: controls.piiHandling,
      },
      {
        id: "future_date_prevention",
        label: "Future date prevention",
        rule_type: "date_validation",
        enabled: controls.preventFutureDates,
        severity: "high",
        blocking: controls.dataQualityMode === "strict",
        fields: form.fields
          .filter((field) => field.type === "date")
          .map((field) => field.variableName ?? field.id),
        expression: "date_value <= today",
      },
      {
        id: "invalid_age_review",
        label: "Invalid age review",
        rule_type: "age_validation",
        enabled: controls.invalidAgeAction !== "warn",
        severity: controls.invalidAgeAction === "block" ? "critical" : "high",
        blocking: controls.invalidAgeAction === "block",
        fields: form.fields
          .filter((field) => /age|date of birth|dob/i.test(field.label))
          .map((field) => field.variableName ?? field.id),
        expression: "age between 0 and 120, date_of_birth not in future",
      },
      {
        id: "disaggregation_completeness",
        label: "Disaggregation completeness",
        rule_type: "disaggregation",
        enabled: controls.disaggregationRequired,
        severity: "medium",
        blocking: false,
        fields: controls.disaggregationFields,
        expression: "required for reporting and metric breakdowns",
      },
    ],
    governance: {
      form_status:
        form.status === "published" ? "published" : controls.lifecycleStatus,
      approval_workflow:
        controls.workflowPreset === "two_step_review" ? "standard" : "simple",
      required_review_levels:
        controls.workflowPreset === "two_step_review" ? 2 : 1,
      submitted_records_editable: controls.submissionEditPolicy === "before_review",
      approved_records_editable: false,
      rejected_records_resubmittable: controls.submissionEditPolicy !== "change_request",
      duplicate_submissions_allowed: controls.submissionFrequency === "unlimited",
      duplicate_detection_fields: duplicateFields,
      require_gps_capture: controls.requiresGps,
      require_timestamp_capture: true,
      require_enumerator_assignment: controls.assignmentMode === "assigned_only",
      require_supervisor_review: true,
      data_retention_days:
        controls.dataRetentionPolicy === "seven_years"
          ? 2555
          : controls.dataRetentionPolicy === "donor_period"
            ? 3650
            : controls.dataRetentionPolicy === "project_life"
              ? 1825
              : controls.riskClassification === "sensitive"
                ? 3650
                : 2555,
      export_restricted: controls.exportRestricted,
      sensitive_field_masking:
        controls.riskClassification === "high" ||
        controls.riskClassification === "sensitive",
      pii_tagging_required: controls.riskClassification !== "low",
      consent_required: controls.requireConsent,
      minimum_quality_score: controls.dataQualityMode === "strict" ? 90 : 75,
      review_sla_hours: controls.approvalEscalationHours,
      auto_lock_after_approval: controls.lockApprovedRecords,
      auto_archive_after_project_closure: true,
      export_approval_required: controls.exportApprovalMode !== "not_required",
      export_approval_role:
        controls.exportApprovalMode === "data_manager_approval"
          ? "data_manager"
          : controls.exportApprovalMode === "manager_approval"
            ? "me_manager"
            : null,
      approved_data_freeze_required: controls.dataFreezeRequired,
      decision_use: controls.decisionUse,
      reporting_period: controls.reportingPeriod,
      source_of_truth_rule: controls.sourceOfTruthRule,
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
        decision_use: controls.decisionUse,
        reporting_period: controls.reportingPeriod,
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
          controls.sourceOfTruthRule === "manager_approved_profile_updates" ||
          controls.profileUpdateMode === "with_supervisor_approval"
            ? "require_approval"
            : controls.profileUpdateMode === "after_submission"
              ? "keep_history"
              : "no_update",
        preserve_old_value: true,
        require_reason_for_change: true,
        source_of_truth_rule: controls.sourceOfTruthRule,
      },
      respondent_identity: {
        mode: controls.respondentIdentification,
        beneficiary_search_required: controls.beneficiarySearch === "required",
        allow_new_registration:
          controls.respondentIdentification === "new_registration" ||
          controls.respondentIdentification === "existing_or_new",
        allow_anonymous: controls.allowAnonymous,
      },
      submission_policy: {
        frequency_rule: controls.submissionFrequency,
        frequency_window: controls.frequencyWindow,
        edit_policy: controls.submissionEditPolicy,
        approval_escalation_hours: controls.approvalEscalationHours,
        returned_submission_editable:
          controls.submissionEditPolicy === "returned_only" ||
          controls.submissionEditPolicy === "change_request",
      },
      privacy: {
        pii_handling: controls.piiHandling,
        data_retention_policy: controls.dataRetentionPolicy,
        export_approval_mode: controls.exportApprovalMode,
        data_freeze_required: controls.dataFreezeRequired,
        mask_exports:
          controls.piiHandling === "mask_exports" ||
          controls.piiHandling === "restricted",
        encrypt_sensitive:
          controls.piiHandling === "encrypt_sensitive" ||
          controls.piiHandling === "restricted",
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
      repeat_group_policy: {
        policy: controls.repeatGroupPolicy,
        large_repeat_groups_need_review: controls.repeatGroupPolicy === "review_large",
        restrict_nested_repeat_groups: controls.repeatGroupPolicy === "restricted",
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
        reporting_period: controls.reportingPeriod,
        approved_data_only: controls.dataFreezeRequired,
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
      testing: {
        requirement: controls.testingRequirement,
        completed_at: controls.testingCompletedAt || null,
        preview_required: true,
        test_submission_required:
          controls.testingRequirement === "test_submission" ||
          controls.testingRequirement === "pilot_assignment",
        pilot_assignment_required: controls.testingRequirement === "pilot_assignment",
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
        disaggregation_fields: controls.disaggregationFields,
        decision_use: controls.decisionUse,
      },
      validation_standards: {
        prevent_future_dates: controls.preventFutureDates,
        invalid_age_action: controls.invalidAgeAction,
        disaggregation_required: controls.disaggregationRequired,
        disaggregation_fields: controls.disaggregationFields,
        dont_know_policy: controls.dontKnowPolicy,
      },
      field_guidance: {
        enumerator_instruction: controls.fieldGuideText,
        dont_know_policy: controls.dontKnowPolicy,
        training_required_before_assignment: controls.enumeratorTrainingRequired,
      },
      data_import: {
        template_mode: controls.importTemplateMode,
        template_source: "form_data_dictionary",
        require_column_match: controls.importTemplateMode !== "none",
        legacy_mapping_allowed: controls.importTemplateMode === "legacy_mapping",
      },
      localization: {
        languages: controls.localizationLanguages
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
        default_language: "English",
        translation_status: controls.translationStatus,
      },
      mobile_package: {
        mode: controls.mobilePackageMode,
        offline_enabled: controls.offlineEnabled,
        max_offline_days: controls.offlineMaxDays,
        sync_requirement: controls.syncRequirement,
        media_capture_offline: controls.offlineMediaCapture,
        low_bandwidth_ready: controls.mobilePackageMode === "low_bandwidth",
        large_registry_ready: controls.mobilePackageMode === "large_registry",
      },
      accessibility: {
        mode: controls.accessibilityMode,
        screen_reader_metadata: true,
        accessible_labels_required: true,
      },
      field_integrity: {
        static_gps_action: controls.staticGpsAction,
        device_clock_drift_action: controls.deviceClockDriftAction,
        outside_assigned_area_action: controls.boundaryValidation ? "review" : "warn",
        back_check_required: controls.backCheckRequired,
        back_check_sample_percent: controls.backCheckSamplePercent,
      },
      partner_data_sharing: {
        rule: controls.partnerDataSharingRule,
        approved_data_only: true,
        export_approval_required: controls.exportApprovalMode !== "not_required",
      },
      case_escalation: {
        rule: controls.caseEscalationRule,
        enabled:
          controls.decisionUse === "case_management" ||
          /case|safeguard|risk|alert/i.test(controls.caseEscalationRule),
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

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function numberValue(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function booleanValue(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function stringArrayValue(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function firstRuleText(value: unknown): string {
  const rules = Array.isArray(value) ? value : [];
  const first = asRecord(rules[0]);
  return stringValue(first.rule);
}

function workflowPresetFromControls(
  stages: unknown,
): FormControlsDraft["workflowPreset"] {
  const workflowStages = Array.isArray(stages) ? stages : [];
  if (workflowStages.length >= 3) return "two_step_review";
  const reviewerRoles = workflowStages.flatMap((stage) =>
    stringArrayValue(asRecord(stage).reviewer_roles),
  );
  return reviewerRoles.includes("data_manager")
    ? "data_manager_review"
    : "supervisor_review";
}

function dataQualityModeFromControls(
  rules: unknown,
): FormControlsDraft["dataQualityMode"] {
  const qualityRules = Array.isArray(rules) ? rules.map(asRecord) : [];
  if (qualityRules.some((rule) => booleanValue(rule.blocking, false))) {
    return "strict";
  }
  return qualityRules.some((rule) => stringValue(rule.severity) === "low")
    ? "advisory"
    : "standard";
}

function mediaRequirementFromControls(
  value: unknown,
): FormControlsDraft["mediaRequirement"] {
  const requirement = stringValue(asRecord(value).requirement, "none");
  return ["none", "photo", "signature", "photo_signature", "any_attachment"].includes(
    requirement,
  )
    ? (requirement as FormControlsDraft["mediaRequirement"])
    : "none";
}

function controlStepForReadinessCategory(category: string): ControlStep {
  const normalizedCategory = category.toLowerCase();
  return (
    controlSteps.find((step) =>
      step.categories.some((stepCategory) => {
        const normalizedStepCategory = stepCategory.toLowerCase();
        return (
          normalizedCategory.includes(normalizedStepCategory) ||
          normalizedStepCategory.includes(normalizedCategory)
        );
      }),
    )?.id ?? "essentials"
  );
}

function controlsDraftFromApiControls(
  apiControls: FormListItem["controls_json"] | null | undefined,
): FormControlsDraft {
  const controls = asRecord(apiControls);
  if (!Object.keys(controls).length) return defaultControlsDraft;

  const entity = asRecord(controls.entity_controls);
  const governance = asRecord(controls.governance);
  const collectionAccess = asRecord(controls.collection_access);
  const instrument = asRecord(controls.instrument);
  const purpose = asRecord(instrument.purpose);
  const tracking = asRecord(instrument.tracking);
  const seasonal = asRecord(instrument.seasonal_rules);
  const wave = asRecord(instrument.survey_wave);
  const dataSource = asRecord(instrument.data_source);
  const geographic = asRecord(instrument.geographic_scope);
  const certification = asRecord(instrument.certification);
  const sampling = asRecord(instrument.sampling);
  const localization = asRecord(instrument.localization);
  const accessibility = asRecord(instrument.accessibility);
  const attachment = asRecord(instrument.attachment_governance);
  const duration = asRecord(instrument.interview_duration);
  const enumeratorQuality = asRecord(instrument.enumerator_quality);
  const eventSettings = asRecord(instrument.event_settings);
  const profileHistory = asRecord(instrument.profile_history_policy);
  const respondentIdentity = asRecord(instrument.respondent_identity);
  const submissionPolicy = asRecord(instrument.submission_policy);
  const privacy = asRecord(instrument.privacy);
  const mobilePackage = asRecord(instrument.mobile_package);
  const validationStandards = asRecord(instrument.validation_standards);
  const fieldGuidance = asRecord(instrument.field_guidance);
  const dataImport = asRecord(instrument.data_import);
  const fieldIntegrity = asRecord(instrument.field_integrity);
  const partnerDataSharing = asRecord(instrument.partner_data_sharing);
  const caseEscalation = asRecord(instrument.case_escalation);
  const testing = asRecord(instrument.testing);
  const repeatGroups = asRecord(instrument.repeat_group_policy);
  const indicatorMappings = Array.isArray(instrument.indicator_mappings)
    ? instrument.indicator_mappings.map(asRecord)
    : [];
  const profileRules = Array.isArray(instrument.profile_impact_rules)
    ? instrument.profile_impact_rules.map(asRecord)
    : [];
  const gpsRule = (Array.isArray(controls.data_quality_rules)
    ? controls.data_quality_rules.map(asRecord)
    : []
  ).find((rule) => stringValue(rule.rule_type) === "gps");
  const duplicateRule = (Array.isArray(controls.data_quality_rules)
    ? controls.data_quality_rules.map(asRecord)
    : []
  ).find((rule) => stringValue(rule.rule_type) === "duplicate");
  const firstIndicator = indicatorMappings[0] ?? {};
  const defaultAction = stringValue(profileHistory.default_action);
  const profileUpdateMode: FormControlsDraft["profileUpdateMode"] =
    stringValue(entity.profile_update_mode) === "after_submission" ||
    defaultAction === "keep_history"
      ? "after_submission"
      : stringValue(entity.profile_update_mode) === "never" ||
          defaultAction === "no_update"
        ? "never"
        : "with_supervisor_approval";
  const explicitRespondentIdentification = stringValue(
    respondentIdentity.mode,
  ) as FormControlsDraft["respondentIdentification"];
  const createsNewEntity = booleanValue(entity.creates_new_entity, false);
  const updatesExistingEntity = booleanValue(
    entity.updates_existing_entity,
    false,
  );
  const requiresExistingEntity = booleanValue(
    entity.requires_existing_entity,
    false,
  );
  const allowsAnonymous = booleanValue(entity.allows_anonymous, false);
  const linkedToEntity = booleanValue(entity.linked_to_entity, true);
  const prefillProfile = booleanValue(entity.prefill_profile, true);
  const inferredRespondentIdentification: FormControlsDraft["respondentIdentification"] =
    explicitRespondentIdentification
      ? explicitRespondentIdentification
      : createsNewEntity && updatesExistingEntity
      ? "existing_or_new"
      : createsNewEntity
        ? "new_registration"
        : requiresExistingEntity || updatesExistingEntity
          ? "existing_beneficiary"
          : allowsAnonymous || !linkedToEntity
            ? "anonymous_allowed"
            : defaultControlsDraft.respondentIdentification;
  const beneficiarySearch: FormControlsDraft["beneficiarySearch"] =
    !prefillProfile
      ? "disabled"
      : inferredRespondentIdentification === "existing_beneficiary"
        ? "required"
        : inferredRespondentIdentification === "existing_or_new"
          ? booleanValue(respondentIdentity.beneficiary_search_required, false)
            ? "required"
            : "optional"
          : inferredRespondentIdentification === "new_registration" ||
              inferredRespondentIdentification === "anonymous_allowed"
            ? "disabled"
            : requiresExistingEntity
              ? "required"
              : "optional";
  const profileMappings = { ...defaultControlsDraft.profileMappings };
  for (const rule of profileRules) {
    const impact = asRecord(rule.profile_impact);
    const target = stringValue(impact.target_field);
    const variable = stringValue(rule.variable_name);
    if (target in profileMappings && variable) {
      profileMappings[target as keyof FormControlsDraft["profileMappings"]] =
        variable;
    }
  }

  return {
    ...defaultControlsDraft,
    accessibilityMode: stringValue(
      accessibility.mode,
      defaultControlsDraft.accessibilityMode,
    ) as FormControlsDraft["accessibilityMode"],
    allowAnonymous: booleanValue(
      entity.allows_anonymous,
      defaultControlsDraft.allowAnonymous,
    ),
    approvalEscalationHours: numberValue(
      submissionPolicy.approval_escalation_hours,
      numberValue(
        governance.review_sla_hours,
        defaultControlsDraft.approvalEscalationHours,
      ),
    ),
    assignmentMode:
      stringValue(collectionAccess.selection_mode) === "open_link" ||
      stringValue(collectionAccess.selection_mode) === "project_team" ||
      stringValue(collectionAccess.selection_mode) === "assigned_only"
        ? (stringValue(
            collectionAccess.selection_mode,
          ) as FormControlsDraft["assignmentMode"])
        : booleanValue(
              governance.require_enumerator_assignment,
              defaultControlsDraft.assignmentMode === "assigned_only",
            )
          ? "assigned_only"
          : "project_team",
    assignedFieldOfficerIds: stringArrayValue(collectionAccess.field_officer_ids),
    assignedTeamIds: stringArrayValue(collectionAccess.team_ids),
    auditTrail: booleanValue(controls.audit && asRecord(controls.audit).immutable, true),
    autoAssignmentRule: firstRuleText(instrument.auto_assignment_rules),
    backCheckRequired: booleanValue(
      fieldIntegrity.back_check_required,
      defaultControlsDraft.backCheckRequired,
    ),
    backCheckSamplePercent: numberValue(
      fieldIntegrity.back_check_sample_percent,
      defaultControlsDraft.backCheckSamplePercent,
    ),
    beneficiarySearch,
    blockWithoutConsent: booleanValue(
      governance.consent_required,
      defaultControlsDraft.blockWithoutConsent,
    ),
    boundaryValidation: booleanValue(geographic.boundary_validation, false),
    businessPurpose: stringValue(
      purpose.business_purpose,
      defaultControlsDraft.businessPurpose,
    ),
    caseEscalationRule: stringValue(
      caseEscalation.rule,
      defaultControlsDraft.caseEscalationRule,
    ),
    changeSummary: "",
    consentMode: booleanValue(governance.consent_required, true)
      ? defaultControlsDraft.consentMode
      : "not_required",
    dataQualityMode: dataQualityModeFromControls(controls.data_quality_rules),
    decisionUse: stringValue(
      purpose.decision_use,
      defaultControlsDraft.decisionUse,
    ) as FormControlsDraft["decisionUse"],
    dataFreezeRequired: booleanValue(
      privacy.data_freeze_required,
      booleanValue(governance.approved_data_freeze_required, defaultControlsDraft.dataFreezeRequired),
    ),
    dataSourceType: stringValue(
      dataSource.source_type,
      defaultControlsDraft.dataSourceType,
    ) as FormControlsDraft["dataSourceType"],
    dataRetentionPolicy: stringValue(
      privacy.data_retention_policy,
      defaultControlsDraft.dataRetentionPolicy,
    ) as FormControlsDraft["dataRetentionPolicy"],
    deviceClockDriftAction: stringValue(
      fieldIntegrity.device_clock_drift_action,
      defaultControlsDraft.deviceClockDriftAction,
    ) as FormControlsDraft["deviceClockDriftAction"],
    disaggregationFields:
      stringArrayValue(validationStandards.disaggregation_fields).length > 0
        ? stringArrayValue(validationStandards.disaggregation_fields)
        : defaultControlsDraft.disaggregationFields,
    disaggregationRequired: booleanValue(
      validationStandards.disaggregation_required,
      defaultControlsDraft.disaggregationRequired,
    ),
    dontKnowPolicy: stringValue(
      validationStandards.dont_know_policy,
      stringValue(fieldGuidance.dont_know_policy, defaultControlsDraft.dontKnowPolicy),
    ) as FormControlsDraft["dontKnowPolicy"],
    duplicateAction: stringValue(
      entity.duplicate_action,
      defaultControlsDraft.duplicateAction,
    ) as FormControlsDraft["duplicateAction"],
    duplicateFields:
      stringArrayValue(entity.matching_fields).length > 0
        ? stringArrayValue(entity.matching_fields)
        : stringArrayValue(asRecord(duplicateRule).fields),
    duplicateSeverity: stringValue(
      asRecord(duplicateRule).severity,
      defaultControlsDraft.duplicateSeverity,
    ) as FormControlsDraft["duplicateSeverity"],
    duplicateThreshold: numberValue(
      entity.duplicate_threshold,
      defaultControlsDraft.duplicateThreshold,
    ),
    enumeratorTrainingRequired: booleanValue(
      fieldGuidance.training_required_before_assignment,
      defaultControlsDraft.enumeratorTrainingRequired,
    ),
    entityCategoryId: stringValue(entity.entity_category_id, defaultControlsDraft.entityCategoryId),
    entityType: stringValue(entity.entity_type, defaultControlsDraft.entityType),
    eventMode: stringValue(
      eventSettings.mode,
      defaultControlsDraft.eventMode,
    ) as FormControlsDraft["eventMode"],
    expectedUse: stringValue(purpose.expected_use, defaultControlsDraft.expectedUse),
    exportApprovalMode: stringValue(
      privacy.export_approval_mode,
      defaultControlsDraft.exportApprovalMode,
    ) as FormControlsDraft["exportApprovalMode"],
    exportRestricted: booleanValue(
      governance.export_restricted,
      defaultControlsDraft.exportRestricted,
    ),
    fileTypes: stringArrayValue(attachment.allowed_formats).join(", ") ||
      defaultControlsDraft.fileTypes,
    fieldGuideText: stringValue(
      fieldGuidance.enumerator_instruction,
      defaultControlsDraft.fieldGuideText,
    ),
    formObjective: stringValue(
      purpose.form_objective,
      defaultControlsDraft.formObjective,
    ),
    frequencyWindow: stringValue(
      submissionPolicy.frequency_window,
      defaultControlsDraft.frequencyWindow,
    ) as FormControlsDraft["frequencyWindow"],
    geographicScope: stringValue(geographic.description),
    gpsAccuracy: Number(
      stringValue(asRecord(gpsRule).expression).match(/\d+/)?.[0] ??
        defaultControlsDraft.gpsAccuracy,
    ),
    indicatorComponent: stringValue(
      firstIndicator.indicator_component,
      defaultControlsDraft.indicatorComponent,
    ) as FormControlsDraft["indicatorComponent"],
    indicatorLink: stringValue(firstIndicator.linked_indicator),
    importTemplateMode: stringValue(
      dataImport.template_mode,
      defaultControlsDraft.importTemplateMode,
    ) as FormControlsDraft["importTemplateMode"],
    invalidAgeAction: stringValue(
      validationStandards.invalid_age_action,
      defaultControlsDraft.invalidAgeAction,
    ) as FormControlsDraft["invalidAgeAction"],
    lifecycleStatus: stringValue(
      governance.form_status,
      defaultControlsDraft.lifecycleStatus,
    ) as FormControlsDraft["lifecycleStatus"],
    linkedOutcome: stringValue(purpose.linked_outcome),
    linkedOutput: stringValue(purpose.linked_output),
    localizationLanguages: stringArrayValue(localization.languages).join(", ") ||
      defaultControlsDraft.localizationLanguages,
    lockApprovedRecords: booleanValue(
      governance.auto_lock_after_approval,
      defaultControlsDraft.lockApprovedRecords,
    ),
    maxAttachmentSizeMb: numberValue(
      attachment.maximum_file_size_mb,
      defaultControlsDraft.maxAttachmentSizeMb,
    ),
    maximumDurationMinutes: numberValue(
      duration.maximum_minutes,
      defaultControlsDraft.maximumDurationMinutes,
    ),
    maximumSubmissionsPerDay: numberValue(
      enumeratorQuality.maximum_submissions_per_day,
      defaultControlsDraft.maximumSubmissionsPerDay,
    ),
    mediaRequirement: mediaRequirementFromControls(attachment),
    meReviewerName: stringValue(
      certification.me_reviewer,
      defaultControlsDraft.meReviewerName,
    ),
    minimumDurationMinutes: numberValue(
      duration.minimum_minutes,
      defaultControlsDraft.minimumDurationMinutes,
    ),
    mobilePackageMode: stringValue(
      mobilePackage.mode,
      defaultControlsDraft.mobilePackageMode,
    ) as FormControlsDraft["mobilePackageMode"],
    offlineEnabled: booleanValue(
      mobilePackage.offline_enabled,
      defaultControlsDraft.offlineEnabled,
    ),
    offlineMaxDays: numberValue(
      mobilePackage.max_offline_days,
      defaultControlsDraft.offlineMaxDays,
    ),
    offlineMediaCapture: booleanValue(
      mobilePackage.media_capture_offline,
      defaultControlsDraft.offlineMediaCapture,
    ),
    parentForm: stringValue(tracking.parent_form),
    partnerDataSharingRule: stringValue(
      partnerDataSharing.rule,
      defaultControlsDraft.partnerDataSharingRule,
    ),
    piiHandling: stringValue(
      privacy.pii_handling,
      defaultControlsDraft.piiHandling,
    ) as FormControlsDraft["piiHandling"],
    profileMappings,
    profileUpdateMode,
    preventFutureDates: booleanValue(
      validationStandards.prevent_future_dates,
      defaultControlsDraft.preventFutureDates,
    ),
    programObjective: stringValue(purpose.program_objective),
    referenceDataRequired: Array.isArray(controls.reference_bindings)
      ? controls.reference_bindings.length > 0
      : defaultControlsDraft.referenceDataRequired,
    relatedForms: stringArrayValue(tracking.related_forms).join(", "),
    reportingPeriod: stringValue(
      purpose.reporting_period,
      stringValue(dataSource.reporting_period, defaultControlsDraft.reportingPeriod),
    ) as FormControlsDraft["reportingPeriod"],
    requireConsent: booleanValue(
      governance.consent_required,
      defaultControlsDraft.requireConsent,
    ),
    repeatGroupPolicy: stringValue(
      repeatGroups.policy,
      defaultControlsDraft.repeatGroupPolicy,
    ) as FormControlsDraft["repeatGroupPolicy"],
    respondentIdentification: inferredRespondentIdentification,
    resultArea: stringValue(purpose.result_area),
    reviewApprover: stringValue(
      certification.approver_role,
      defaultControlsDraft.reviewApprover,
    ) as FormControlsDraft["reviewApprover"],
    reviewComments: stringValue(asRecord(instrument.lifecycle).review_comments),
    reviewer: workflowPresetFromControls(controls.workflow_stages) ===
      "data_manager_review"
      ? "data_manager"
      : defaultControlsDraft.reviewer,
    requiresEntity:
      inferredRespondentIdentification === "existing_beneficiary"
        ? true
        : booleanValue(
            entity.requires_existing_entity,
            defaultControlsDraft.requiresEntity,
          ),
    requiresGps: booleanValue(
      governance.require_gps_capture,
      defaultControlsDraft.requiresGps,
    ),
    riskClassification: booleanValue(governance.sensitive_field_masking, false)
      ? "sensitive"
      : defaultControlsDraft.riskClassification,
    samplingMethod: stringValue(
      sampling.sampling_method,
      defaultControlsDraft.samplingMethod,
    ) as FormControlsDraft["samplingMethod"],
    sourceOfTruthRule: stringValue(
      profileHistory.source_of_truth_rule,
      stringValue(governance.source_of_truth_rule, defaultControlsDraft.sourceOfTruthRule),
    ) as FormControlsDraft["sourceOfTruthRule"],
    staticGpsAction: stringValue(
      fieldIntegrity.static_gps_action,
      defaultControlsDraft.staticGpsAction,
    ) as FormControlsDraft["staticGpsAction"],
    submissionEditPolicy: stringValue(
      submissionPolicy.edit_policy,
      defaultControlsDraft.submissionEditPolicy,
    ) as FormControlsDraft["submissionEditPolicy"],
    seasonEnd: stringValue(seasonal.season_end),
    seasonName: stringValue(seasonal.season_name),
    seasonStart: stringValue(seasonal.season_start),
    syncRequirement: stringValue(
      mobilePackage.sync_requirement,
      defaultControlsDraft.syncRequirement,
    ) as FormControlsDraft["syncRequirement"],
    technicalReviewerName: stringValue(
      certification.technical_reviewer,
      defaultControlsDraft.technicalReviewerName,
    ),
    testingRequirement: stringValue(
      testing.requirement,
      defaultControlsDraft.testingRequirement,
    ) as FormControlsDraft["testingRequirement"],
    testingCompletedAt: stringValue(
      testing.completed_at,
      defaultControlsDraft.testingCompletedAt,
    ),
    finalApproverName: stringValue(
      certification.final_approver,
      defaultControlsDraft.finalApproverName,
    ),
    approvalDate: stringValue(certification.approval_date),
    approvalNotes: stringValue(certification.approval_notes),
    submissionFrequency: stringValue(
      entity.submission_frequency,
      defaultControlsDraft.submissionFrequency,
    ) as FormControlsDraft["submissionFrequency"],
    targetSampleSize: numberValue(
      sampling.target_sample_size,
      defaultControlsDraft.targetSampleSize,
    ),
    trackingSeries: stringValue(tracking.tracking_series),
    translationStatus: stringValue(
      localization.translation_status,
      defaultControlsDraft.translationStatus,
    ) as FormControlsDraft["translationStatus"],
    triggerRule: firstRuleText(instrument.trigger_rules),
    workflowPreset: workflowPresetFromControls(controls.workflow_stages),
  };
}

function builderStatusFromListStatus(status: string): DynamicForm["status"] {
  if (status === "published" || status === "archived") {
    return status;
  }
  return "draft";
}

export function backendFormTargetIdForSave(
  initialForm: Pick<FormListItem, "id" | "status"> | null | undefined,
  savedBackendFormId: string | null,
): string | null {
  if (savedBackendFormId) return savedBackendFormId;
  if (initialForm?.status === "published") return null;
  return initialForm?.id ?? null;
}

export function backendDraftNameForSave(
  formName: string,
  initialForm: Pick<FormListItem, "status" | "version"> | null | undefined,
  _savedBackendFormId: string | null,
): string {
  if (initialForm?.status !== "published") return formName;
  const revisionSuffix = `Draft revision v${(initialForm.version || 0) + 1}`;
  return formName.endsWith(revisionSuffix)
    ? formName
    : `${formName} ${revisionSuffix}`;
}

export function surveyContextPayloadForForm(
  setup: Pick<FormSetupDraft, "formName" | "formType">,
  purpose: "draft" | "publish",
): Pick<SurveyCreate, "custom_type_label" | "description" | "survey_type" | "target_population" | "title"> {
  const formType = setup.formType.trim() || "Data collection";
  const formName = setup.formName.trim() || `${formType} Form`;
  return {
    custom_type_label: formType,
    description:
      purpose === "draft"
        ? `Auto-created workspace context for ${formType.toLowerCase()} draft forms.`
        : `Auto-created workspace context for published ${formType.toLowerCase()} forms.`,
    survey_type: "custom",
    target_population: "Project records",
    title: formName,
  };
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
    "Household and entity details",
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
    .map((field) => (field.variableName?.trim() || variableNameFromLabel(field.label, field.id)).trim())
    .filter(Boolean) as string[];
  const uniqueVariableNames = new Set(variableNames);
  const invalidVariableNameCount = variableNames.filter((name) => !isValidVariableName(name)).length;
  const hasGps = fields.some((field) =>
    ["gps", "geolocation", "map", "geofence"].includes(field.type),
  );
  const hasMedia = fields.some((field) =>
    ["photo", "image", "signature", "audio", "video", "file"].includes(
      field.type,
    ),
  );
  const hasRepeatGroup = fields.some((field) => field.type === "repeat_group");
  const hasConsentQuestion = fields.some((field) =>
    /consent|agree|permission/i.test(field.label),
  );
  const mobileCollection = setup.collectionMethod !== "web";
  const hasAgeOrDobField = fields.some((field) =>
    /age|date of birth|dob/i.test(field.label),
  );
  const hasDateField = fields.some((field) => field.type === "date");
  const hasDisaggregationField = fields.some((field) =>
    controls.disaggregationFields.some((disaggregation) =>
      new RegExp(disaggregation.replace(/_/g, " "), "i").test(field.label),
    ),
  );
  const missingStandardQuestions = missingRecommendedQuestions(form, setup, controls);
  const weakLabels = weakQuestionLabels(fields);
  const suggestedProfileMappings = suggestedProfileMappingsFromFields(fields);
  const unmappedSuggestedProfileFields = Object.entries(suggestedProfileMappings).filter(
    ([key, value]) =>
      Boolean(value) &&
      !controls.profileMappings[key as keyof FormControlsDraft["profileMappings"]],
  );
  const mobileRiskScore =
    fields.length +
    (hasMedia ? 12 : 0) +
    (hasRepeatGroup ? 15 : 0) +
    (controls.referenceDataRequired ? 8 : 0);
  const hasBrokenLogic = fields.some((field) =>
    (field.logic ?? []).some(
      (rule) =>
        rule.targetId &&
        !fields.some((candidate) => candidate.id === rule.targetId),
    ),
  );
  const entityRuleSelected =
    controls.requiresEntity ||
    controls.respondentIdentification !== "anonymous_allowed" ||
    controls.profileUpdateMode !== "never";
  const needsEntityMapping =
    controls.requiresEntity || controls.profileUpdateMode !== "never";
  const entityMappings = Object.values(controls.profileMappings).filter(Boolean);
  const assignmentReadiness = assignmentReadinessState(
    setup.collectionMethod,
    controls,
  );

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
      description: "Choose the form type so readiness rules match the selected sector and collection purpose.",
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
        "Managed data collection instruments need an objective, business purpose, and expected use before field deployment.",
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
        "Link the form to a result area, outcome, output, KPI, or operational objective when the project uses structured results tracking.",
      id: "results-linkage",
      jumpTo: "controls",
      label: "Result linkage reviewed",
      required: false,
      warning: true,
    }),
    item({
      category: "Purpose",
      complete: Boolean(controls.decisionUse && controls.reportingPeriod !== "none"),
      description:
        "Define how this form will be used for decisions, metrics, reporting, case management, compliance, operations, or learning, and select its reporting period.",
      id: "decision-use",
      jumpTo: "controls",
      label: "Decision use and reporting period selected",
      required: true,
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
      complete: missingStandardQuestions.length === 0,
      description:
        "The assistant checks the form type against sector-appropriate starter questions such as consent when needed, entity identity, dates, GPS, service details, quantities, observations, and notes.",
      id: "standard-questions",
      jumpTo: "builder",
      label: "Standard sector questions reviewed",
      required: fields.length > 0 && formOperationalFamily(setup.formType) !== "custom",
      warning: fields.length === 0 || formOperationalFamily(setup.formType) === "custom",
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
        uniqueVariableNames.size === variableNames.length &&
        invalidVariableNameCount === 0,
      description:
        "Variable names must be present, unique, stable, lowercase-friendly, and without spaces.",
      id: "variables",
      jumpTo: "builder",
      label: "Variable names are unique",
      required: true,
    }),
    item({
      category: "Question validation",
      complete: weakLabels.length === 0,
      description:
        "Question labels should be specific, neutral, and focused on one answer. Avoid vague, leading, or double-barrelled questions.",
      id: "question-wording",
      jumpTo: "builder",
      label: "Question wording reviewed",
      required: false,
      warning: true,
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
      category: "Data dictionary",
      complete: controls.importTemplateMode !== "none",
      description:
        "Forms that may receive uploaded historical data should generate the Excel template from the same data dictionary used by field submissions.",
      id: "import-template",
      jumpTo: "controls",
      label: "Import template behavior selected",
      required: false,
      warning: true,
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
      category: "Question validation",
      complete: Boolean(controls.dontKnowPolicy),
      description:
        "Define whether field officers can record Don't know, Refused, or Not applicable instead of forcing incorrect answers.",
      id: "dont-know-policy",
      jumpTo: "controls",
      label: "Don&apos;t know/refused policy selected",
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
      complete: !entityRuleSelected || Boolean(controls.entityType.trim()),
      description:
        "Choose whether this form creates, updates, requires, or allows anonymous linked records. Leave entity tracking optional for standalone checklists, transactions, imports, or surveys.",
      id: "entity-settings",
      jumpTo: "controls",
      label: "Entity settings reviewed",
      required: entityRuleSelected,
      warning: !entityRuleSelected,
    }),
    item({
      category: "Entity identity",
      complete:
        controls.respondentIdentification === "anonymous_allowed"
          ? controls.allowAnonymous
          : Boolean(controls.respondentIdentification),
      description:
        "Define whether the collector must select an existing record, create a new registration, or allow anonymous collection.",
      id: "respondent-identity",
      jumpTo: "controls",
      label: "Respondent identity rule selected",
      required: true,
    }),
    item({
      category: "Entity settings",
      complete: !needsEntityMapping || entityMappings.length >= 2,
      description:
        "Entity-linked forms should map key questions such as name, phone, location, external ID, or GPS to the official profile.",
      id: "entity-mapping",
      jumpTo: "controls",
      label: "Entity profile mapping reviewed",
      required: needsEntityMapping,
      warning: !needsEntityMapping,
    }),
    item({
      category: "Entity settings",
      complete: !needsEntityMapping || unmappedSuggestedProfileFields.length === 0,
      description:
        "The platform can suggest profile mappings from question labels such as name, phone, location, external ID, category, and GPS.",
      id: "mapping-suggestions",
      jumpTo: "controls",
      label: "Suggested profile mappings applied",
      required: false,
      warning: true,
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
      category: "Submission rules",
      complete:
        controls.submissionFrequency === "unlimited" ||
        controls.frequencyWindow !== "none",
      description:
        "Periodic or once-per-event forms should define the operating window used for duplicate and frequency checks.",
      id: "frequency-window",
      jumpTo: "controls",
      label: "Frequency window reviewed",
      required: controls.submissionFrequency !== "unlimited",
      warning: controls.submissionFrequency === "unlimited",
    }),
    item({
      category: "Duplicate prevention",
      complete:
        controls.duplicateFields.length > 0 &&
        controls.duplicateThreshold >= 50 &&
        Boolean(controls.duplicateAction),
      description:
        "Duplicate rules protect entity registration, inventory records, inspections, cases, and repeated submissions before they reach reports.",
      id: "duplicate-rules",
      jumpTo: "controls",
      label: "Duplicate prevention configured",
      required: true,
    }),
    item({
      category: "Metric mapping",
      complete:
        !controls.indicatorLink.trim() ||
        controls.indicatorComponent !== "none",
      description:
        "If a form or question is linked to a metric, KPI, or indicator, choose whether it contributes to numerator, denominator, breakdown, or evidence.",
      id: "indicator-mapping",
      jumpTo: "controls",
      label: "Metric mapping reviewed",
      required: false,
      warning: true,
    }),
    item({
      category: "Metric mapping",
      complete:
        !controls.disaggregationRequired ||
        (controls.disaggregationFields.length > 0 && hasDisaggregationField),
      description:
        "Forms used for metrics or external reporting should capture the breakdown fields required by the project, such as location, category, status, product type, sex, age group, or disability.",
      id: "disaggregation",
      jumpTo: "controls",
      label: "Disaggregation fields reviewed",
      required:
        controls.decisionUse === "indicator_reporting" ||
        controls.decisionUse === "donor_reporting",
      warning:
        controls.decisionUse !== "indicator_reporting" &&
        controls.decisionUse !== "donor_reporting",
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
      category: "Field integrity",
      complete:
        controls.staticGpsAction !== "warn" ||
        controls.deviceClockDriftAction !== "warn" ||
        controls.boundaryValidation,
      description:
        "Use field integrity rules to flag static GPS, device clock drift, or outside-area collection before supervisors approve data.",
      id: "field-integrity",
      jumpTo: "controls",
      label: "Field integrity checks reviewed",
      required: false,
      warning: true,
    }),
    item({
      category: "Back-checks",
      complete:
        !controls.backCheckRequired ||
        (controls.backCheckSamplePercent > 0 && controls.backCheckSamplePercent <= 100),
      description:
        "Back-checks let supervisors verify a sample of completed submissions when data risk or field accountability matters.",
      id: "back-checks",
      jumpTo: "controls",
      label: "Supervisor back-check rule reviewed",
      required: false,
      warning: true,
    }),
    item({
      category: "Enumerator quality",
      complete: !controls.enumeratorTrainingRequired || controls.assignmentMode === "assigned_only",
      description:
        "When training or certification is required, restrict collection to assigned users so the platform can enforce who receives the form.",
      id: "field-officer-training",
      jumpTo: "controls",
      label: "Field officer training rule reviewed",
      required: false,
      warning: true,
    }),
    item({
      category: "Repeat groups",
      complete: !hasRepeatGroup || controls.repeatGroupPolicy !== "allowed",
      description:
        "Large repeat groups should have a policy so household members, assets, trainings, or distributions do not overload mobile or reporting.",
      id: "repeat-groups",
      jumpTo: "controls",
      label: "Repeat group handling reviewed",
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
        "Reference data is recommended for location, facility, product, crop, supplier, customer, partner, funder/client, and program lists.",
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
      category: "Data quality",
      complete: !hasDateField || controls.preventFutureDates,
      description:
        "Date questions should normally block or flag future dates unless the form is explicitly scheduling future activities.",
      id: "future-dates",
      jumpTo: "controls",
      label: "Future date prevention reviewed",
      required: hasDateField,
    }),
    item({
      category: "Data quality",
      complete: !hasAgeOrDobField || controls.invalidAgeAction !== "warn",
      description:
        "Age and date-of-birth questions should flag impossible ages and future birth dates before data reaches review.",
      id: "age-validation",
      jumpTo: "controls",
      label: "Age validation reviewed",
      required: hasAgeOrDobField,
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
      category: "Review escalation",
      complete: controls.approvalEscalationHours > 0,
      description:
        "Set the number of hours before an overdue review should be escalated to managers.",
      id: "review-escalation",
      jumpTo: "controls",
      label: "Review escalation time configured",
      required: false,
      warning: true,
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
      complete: assignmentReadiness.complete,
      description:
        mobileCollection
          ? "Mobile or web-and-mobile forms restricted to assigned users must select the field officers or teams who should receive the form."
          : "Choose whether this form is restricted to selected field officers/teams, the project team, or controlled web entry.",
      id: "assignment",
      jumpTo: "controls",
      label: "Field officer or team access configured",
      required: assignmentReadiness.required,
      warning: !assignmentReadiness.required,
    }),
    item({
      category: "Offline readiness",
      complete:
        controls.offlineEnabled &&
        controls.offlineMaxDays > 0 &&
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
      category: "Mobile package",
      complete: Boolean(controls.mobilePackageMode && controls.syncRequirement),
      description:
        "Choose whether the mobile package is standard, low-bandwidth, media-heavy, or built for a large entity registry.",
      id: "mobile-package",
      jumpTo: "controls",
      label: "Mobile package rules reviewed",
      required: false,
      warning: true,
    }),
    item({
      category: "Mobile package",
      complete: !mobileCollection || mobileRiskScore < 95 || controls.mobilePackageMode !== "standard",
      description:
        "Large forms, media, repeat groups, and reference data can be heavy for low-cost Android devices and should use a low-bandwidth, large-registry, or media-heavy package.",
      id: "mobile-complexity",
      jumpTo: "controls",
      label: "Mobile complexity reviewed",
      required: false,
      warning: true,
    }),
    item({
      category: "Privacy",
      complete:
        controls.riskClassification === "low" ||
        controls.piiHandling !== "standard",
      description:
        "Medium, high, or sensitive forms should define masking, encryption, or restricted access for personal data.",
      id: "privacy",
      jumpTo: "controls",
      label: "PII handling reviewed",
      required: controls.riskClassification === "sensitive",
      warning: controls.riskClassification !== "sensitive",
    }),
    item({
      category: "Export governance",
      complete:
        !controls.exportRestricted ||
        controls.exportApprovalMode !== "not_required",
      description:
        "Restricted exports should require manager or data manager approval and be logged.",
      id: "export-governance",
      jumpTo: "controls",
      label: "Export governance configured",
      required: controls.exportRestricted,
    }),
    item({
      category: "Retention",
      complete: Boolean(controls.dataRetentionPolicy),
      description:
        "Set how long approved records are retained or archived for funder, client, legal, and organizational compliance.",
      id: "retention",
      jumpTo: "controls",
      label: "Data retention rule selected",
      required: true,
    }),
    item({
      category: "Testing",
      complete: testingReadinessComplete(controls),
      description:
        "Run Preview & Test before review so the form is checked before approval and publishing.",
      id: "testing",
      jumpTo: "preview",
      label: "Preview testing completed",
      required: true,
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
      category: "Partner rules",
      complete: Boolean(controls.partnerDataSharingRule.trim()),
      description:
        "If partners, suppliers, clients, funders, donors, auditors, or external teams will use the data, define the sharing rule before exports and reporting start.",
      id: "partner-sharing",
      jumpTo: "controls",
      label: "Partner data-sharing rule reviewed",
      required: false,
      warning: true,
    }),
    item({
      category: "Case escalation",
      complete:
        controls.decisionUse !== "case_management" ||
        Boolean(controls.caseEscalationRule.trim()),
      description:
        "Case, protection, health, or safeguarding forms should define what answers create an alert or supervisor follow-up.",
      id: "case-escalation",
      jumpTo: "controls",
      label: "Case escalation rule reviewed",
      required: controls.decisionUse === "case_management",
      warning: controls.decisionUse !== "case_management",
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
        "Technical reviewer, sector/business reviewer, final approver, and approval notes are required for enterprise form certification.",
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
      category: "Governance",
      complete: controls.dataFreezeRequired && controls.sourceOfTruthRule !== undefined,
      description:
        "Official reports should freeze approved data and define which form is allowed to update each entity profile field.",
      id: "source-of-truth",
      jumpTo: "controls",
      label: "Source-of-truth and data freeze rules configured",
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

function humanizeControlValue(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function quickFixForFormType(formType: string): PublishQuickFixId | undefined {
  const normalized = formType.toLowerCase();
  if (/registration|register|intake|enrol/.test(normalized)) {
    return "registration_defaults";
  }
  if (/baseline|endline|assessment|evaluation/.test(normalized)) {
    return "baseline_defaults";
  }
  if (/monitor|follow|visit|case update/.test(normalized)) {
    return "monitoring_defaults";
  }
  return undefined;
}

function buildPublishAssistantAdvice({
  checklist,
  controls,
  fieldOfficerCount,
  form,
  projectLinked,
  setup,
}: {
  checklist: PublishReadinessItem[];
  controls: FormControlsDraft;
  fieldOfficerCount: number;
  form: DynamicForm | null;
  projectLinked: boolean;
  setup: FormSetupDraft;
}): PublishAssistantAdvice[] {
  const fields = form?.fields ?? [];
  const failedItems = publishBlockingFailures(checklist);
  const warningItems = checklist.filter((item) => !item.complete && !failedItems.some((failure) => failure.id === item.id));
  const formTypeQuickFix = quickFixForFormType(setup.formType);
  const missingStandardQuestions = missingRecommendedQuestions(form, setup, controls);
  const weakLabels = weakQuestionLabels(fields);
  const suggestedMappings = suggestedProfileMappingsFromFields(fields);
  const unmappedSuggestedMappings = Object.entries(suggestedMappings).filter(
    ([key, value]) =>
      Boolean(value) &&
      !controls.profileMappings[key as keyof FormControlsDraft["profileMappings"]],
  );
  const entityLabel = controls.entityType.trim() || "Entity";
  const entityLabelLower = entityLabel.toLowerCase();
  const advice: PublishAssistantAdvice[] = [];

  if (!form) {
    advice.push({
      actionLabel: "Start or import a form",
      fix:
        "Choose Blank form, Use template, Duplicate existing form, or Import spreadsheet. Once the questions exist, save the draft before returning to publish.",
      id: "no-draft",
      item: null,
      jumpTo: "start",
      label: "No form draft exists yet",
      mneTip:
        "A published instrument must contain the questionnaire structure that field officers will receive on mobile.",
      platformAction:
        "Use the current Start Method step to create the draft from blank, a template, a duplicate, or spreadsheet import.",
      severity: "Required",
      why:
        "There is no saved form draft in this workspace, so the platform has nothing to validate, approve, version, assign, or send to field officers.",
    });
  }

  if (controls.lifecycleStatus !== "approved") {
    const currentStatus = humanizeControlValue(controls.lifecycleStatus);
    advice.push({
      actionLabel: "Open governance review",
      fix:
        currentStatus === "Review"
          ? "Approval is recommended before rollout, but it is not a hard blocker once readiness is at least 60% and the hard blockers are resolved. Add approval notes when your organization requires formal sign-off."
          : "Move the form through Testing and Review when your organization requires formal governance. Publishing can still proceed once the minimum readiness rule is met.",
      id: "lifecycle-not-approved",
      item: checklist.find((item) => item.id === "lifecycle-approved") ?? null,
      jumpTo: "controls",
      label: `Form is ${currentStatus}, not formally Approved`,
      mneTip:
        `Expert recommendation: publish urgent field tools once the essentials are ready, then complete technical reviewer, sector reviewer, consent, workflow, data quality, and mobile readiness checks as governance follow-up.`,
      platformAction:
        "Manager decision needed: the platform can open Governance controls, but formal approval is optional unless your organization policy requires it.",
      severity: "Warning",
      targetControlStep: "governance",
      why:
        "Publishing creates the official field-ready version. Atlas FieldOps now allows publishing at 60% readiness while keeping approval visible for governance discipline.",
    });
  }

  failedItems.forEach((item) => {
    const fieldCount = fields.length;
    const selectedDuplicateFields = controls.duplicateFields
      .map(humanizeControlValue)
      .join(", ");
    const mappedProfileFields = Object.entries(controls.profileMappings)
      .filter(([, value]) => Boolean(value))
      .map(([key]) => humanizeControlValue(key));
    const base: PublishAssistantAdvice = {
      actionLabel: item.jumpTo === "builder" ? "Open Builder" : "Open this setting",
      fix:
        item.jumpTo === "builder"
          ? `Open Builder and resolve: ${item.label}.`
          : item.jumpTo === "setup"
            ? `Open Basic Information and resolve: ${item.label}.`
            : `Open Controls > ${controlSteps.find((step) => step.id === controlStepForReadinessCategory(item.category))?.label ?? "settings"} and resolve: ${item.label}.`,
      id: item.id,
      item,
      jumpTo: item.jumpTo,
      label: item.label,
      mneTip:
        `Resolve this before publishing so collection, review, ${entityLabelLower} updates, and reporting stay governed.`,
      platformAction:
        item.jumpTo === "builder"
          ? "Open the Builder to fix the question or structure issue."
          : item.jumpTo === "setup"
            ? "Open Basic Information to correct the setup field."
            : "Open the matching Controls tab to update the form rule.",
      severity: "Required",
      why: item.description,
    };

    switch (item.id) {
      case "name":
        advice.push({
          ...base,
          fix:
            `Go to Basic Information and enter a clear form name such as ${entityLabel} Registration, Baseline Survey, Monitoring Visit, or Training Attendance.`,
          mneTip:
            `Expert recommendation: use a short operational name that includes the activity or survey stage, for example ${entityLabel} Registration, Baseline Survey, Monitoring Visit, or Distribution Record.`,
          platformAction:
            "Manager decision needed: the platform can open Basic Information, but the form owner should choose the correct operational name.",
          why:
            "The form has no operational name. Users would struggle to find it in Draft Forms, assignments, mobile sync, and reports.",
        });
        break;
      case "form-type":
        advice.push({
          ...base,
          fix:
            "Select the form type in Basic Information. Registration, Baseline, Monitoring, Attendance, Distribution, Assessment, Complaint, Endline, Follow-up, and Custom forms have different readiness expectations.",
          mneTip:
            "Expert recommendation: choose the form type based on what the submission represents in the program lifecycle, not only by the questions it contains.",
          platformAction:
            "Manager decision needed: the platform can open Basic Information, but the project owner must choose the correct instrument type for this sector.",
          why:
            "The platform cannot apply the right readiness logic until it knows what kind of instrument this is.",
        });
        break;
      case "owner":
        advice.push({
          ...base,
          fix:
            "Add the responsible owner in Basic Information. This is usually the Operations Manager, Data Manager, project lead, or sector specialist accountable for the instrument.",
          mneTip:
            "Expert recommendation: assign ownership to the person accountable for methodology, version changes, data quality, and approval decisions.",
          platformAction:
            "Manager decision needed: the platform can open Basic Information, but the organization must name the accountable owner.",
          why:
            "Every published form needs an accountable person for governance, quality, and future updates.",
        });
        break;
      case "language":
        advice.push({
          ...base,
          fix:
            "Choose the primary language in Basic Information. Add translation settings later if the same instrument will be used in multiple languages.",
          mneTip:
            "Expert recommendation: keep one governed instrument with translations unless the local-language questionnaire truly changes meaning or methodology.",
          platformAction:
            "Manager decision needed: the platform can open Basic Information, but the project owner should confirm the working language for field teams.",
          why:
            "Mobile display, translation completeness, and field training depend on the primary language being known.",
        });
        break;
      case "project":
        advice.push({
          ...base,
          fix: projectLinked
            ? "The project link is detected. Refresh the readiness review and try publishing again."
            : "Select an existing project in Basic Information. If no project exists, create it in Projects first; this form cannot be safely published without a project.",
          mneTip:
            `Expert recommendation: always attach a form to the project that owns the ${entityLabelLower} records, metrics/KPIs, assignments, locations, approvals, and reports.`,
          platformAction:
            "Manager decision needed: the platform can open project selection, but the user must select the correct project context.",
          why:
            "This form is not linked to a project. Published forms must belong to a project so field data does not become disconnected from program operations.",
        });
        break;
      case "purpose":
        advice.push({
          ...base,
          fix:
            "Use Apply platform fix to fill a safe starter purpose, then edit the text to match the project objective. If you prefer manual entry, open Controls > Purpose and complete Form Objective, Business Purpose, and Expected Use.",
          mneTip:
            "Purpose fields help future reviewers understand why the data was collected and how it should be used.",
          platformAction:
            "The platform can fill starter purpose text, then you can edit it to match your project and sector.",
          quickFixId: "mne_context_defaults",
          targetControlStep: "essentials",
          why:
            "The form is missing its business context. A governed instrument needs a reason for collection before it reaches the field.",
        });
        break;
      case "decision-use":
        advice.push({
          ...base,
          fix:
            "Use Apply platform fix to set a practical decision use and reporting period. Choose metric/reporting when answers feed KPIs or formal reports; choose Operational Decision for routine management forms.",
          mneTip:
            `Every field instrument should answer: what decision, report, ${entityLabelLower} action, compliance check, or management review will use this data?`,
          platformAction:
            "The platform can apply a practical decision-use and reporting-period default.",
          quickFixId: "mne_context_defaults",
          targetControlStep: "essentials",
          why:
            "The form does not yet say how the data will be used or what reporting cycle it belongs to, so users cannot judge whether metrics, approvals, and reports are correctly configured.",
        });
        break;
      case "sections":
        advice.push({
          ...base,
          fix:
            "Open Builder and add at least one section, for example Respondent Information, Household Details, Farm Information, Service Received, or Enumerator Notes.",
          mneTip:
            `Expert recommendation: group questions by field workflow, usually Consent when needed, Respondent or ${entityLabel} Details, Location, Service/Measurement/Observation, and Collector Notes.`,
          platformAction:
            "Manager decision needed: the platform can open Builder, but the project owner should choose section names that match the actual field workflow.",
          why:
            "The form has no sections. Field officers would receive an unstructured instrument.",
        });
        break;
      case "questions":
        advice.push({
          ...base,
          fix:
            "Open Builder and add the questions field officers must answer. If you already have an Excel questionnaire, use the spreadsheet import option to create questions faster.",
          mneTip:
            `Expert recommendation: at minimum include consent when needed, identity or ${entityLabelLower} link, date, location where relevant, core measurements, and collector notes.`,
          platformAction:
            "Manager decision needed: the platform can open Builder or import from Excel, but the program team must confirm which data is actually needed.",
          why:
            "The form currently has no questions. A blank form cannot collect data or sync useful responses.",
        });
        break;
      case "standard-questions":
        advice.push({
          ...base,
          fix: missingStandardQuestions.length
            ? `Click Apply platform fix to add these questions now: ${missingStandardQuestions
                .slice(0, 6)
                .map((question) => question.label)
                .join(", ")}. Then check wording in Builder.`
            : "No automatic question insertion is needed. Open Builder only if you want to inspect the structure manually.",
          mneTip:
            "Standard questions protect the basic field loop: consent, identity, date, location, service/activity, and follow-up evidence.",
          platformAction:
            "The platform can add the missing standard sector questions into a new builder section for you to edit.",
          quickFixId: "add_standard_questions",
          why:
            "This form appears to be missing one or more questions normally needed for its selected purpose.",
        });
        break;
      case "variables":
        advice.push({
          ...base,
          fix:
            "Click Apply platform fix to regenerate stable unique variable names from the question labels. Then keep those variable names stable after publishing.",
          mneTip:
            "Variable names are the bridge between form answers, Excel exports, metrics/KPIs, dashboards, and reports.",
          platformAction:
            "The platform can repair missing or duplicate variable names automatically.",
          quickFixId: "fix_question_variables",
          why:
            "One or more questions have missing or duplicate variable names, which can break exports, analytics, and imported data matching.",
        });
        break;
      case "data-dictionary":
        advice.push({
          ...base,
          fix:
            "Open Controls > Questions and review the data dictionary. Make sure each question has a label, variable name, type, allowed values where needed, and sensitivity level.",
          mneTip:
            "A data dictionary helps teams understand what each field means after staff changes or when reports are audited.",
          targetControlStep: "questions",
          why:
            "The data dictionary cannot be generated cleanly because question metadata is incomplete.",
        });
        break;
      case "question-wording":
        advice.push({
          ...base,
          fix: weakLabels.length
            ? `Open Builder and rename these labels: ${weakLabels
                .slice(0, 5)
                .map((field) => field.label)
                .join(", ")}. Make each one neutral, specific, and focused on one answer.`
            : "No wording risk was found. No action is required.",
          mneTip:
            "Poor wording causes inconsistent answers even when the form is technically valid.",
          platformAction:
            "The platform can clean obvious placeholder or overloaded labels, then opens the Builder for final human wording review.",
          quickFixId: "fix_question_wording",
          why:
            "One or more questions may be vague, leading, untitled, or double-barrelled.",
        });
        break;
      case "disaggregation":
        advice.push({
          ...base,
          fix:
            "Use Apply platform fix to add standard breakdown categories. Then make sure the Builder contains matching questions for location, category, status, product type, sex, age group, disability status, or any funder/client-required category.",
          mneTip:
            "Disaggregation should be designed before field rollout so teams do not sort records manually later.",
          platformAction:
            "The platform can set standard disaggregation categories; you still need matching questions in the Builder.",
          quickFixId: "mne_context_defaults",
          targetControlStep: "questions",
          why:
            "This form is intended for reporting, but it does not yet prove that required breakdown categories are captured.",
        });
        break;
      case "required-questions":
        const requiredQuestionsAdvice = requiredQuestionsAdviceState(fieldCount);
        advice.push({
          ...base,
          fix: requiredQuestionsAdvice.fix,
          mneTip:
            "For sensitive questions, add choices such as Don't know or Refused instead of forcing inaccurate answers.",
          platformAction: requiredQuestionsAdvice.platformAction,
          quickFixId: requiredQuestionsAdvice.quickFixId,
          why: requiredQuestionsAdvice.why,
        });
        break;
      case "logic":
        advice.push({
          ...base,
          fix:
            "Click Apply platform fix to remove logic rules that point to deleted questions. Then retest skip logic in Preview.",
          mneTip:
            "Broken skip logic can hide required questions or send field officers to the wrong section.",
          platformAction:
            "The platform can safely remove broken references; it will not invent new logic rules without user confirmation.",
          quickFixId: "fix_broken_logic",
          why:
            "One or more logic rules refer to a question that no longer exists.",
        });
        break;
      case "entity-settings":
        advice.push({
          ...base,
          fix:
            `Use Apply platform fix to set entity behavior for this form type. Then confirm the entity type (currently ${entityLabel}) and whether the form creates a new entity, updates an existing entity, requires an existing entity, or allows anonymous collection.`,
          mneTip:
            `Registration or intake forms usually create a new ${entityLabelLower} record. Follow-up, inspection, monitoring, delivery, training, distribution, audit, or service forms usually require an existing ${entityLabelLower} record.`,
          platformAction:
            `The platform can apply recommended ${entityLabelLower} record rules for this form type, then you can fine-tune the entity type and mappings.`,
          quickFixId: formTypeQuickFix,
          targetControlStep: "beneficiaries",
          why:
            `The ${entityLabelLower}/entity rule is incomplete, so the system cannot know whether approved submissions should create, update, or link to ${entityLabelLower} records.`,
        });
        break;
      case "respondent-identity":
        advice.push({
          ...base,
          fix:
            `Use Apply platform fix to set respondent identification from the form type. Registration should create a new ${entityLabelLower} record; baseline and monitoring should normally require an existing ${entityLabelLower} record.`,
          mneTip:
            `This prevents disconnected submissions and reduces duplicate ${entityLabelLower} records.`,
          platformAction:
            "The platform can set the identification rule based on whether this is registration, intake, assessment, inspection, monitoring, delivery, audit, service, or follow-up.",
          quickFixId: formTypeQuickFix,
          targetControlStep: "beneficiaries",
          why:
            `The collection flow does not yet define how field officers identify the ${entityLabelLower} record being surveyed, inspected, visited, delivered to, audited, or updated.`,
        });
        break;
      case "entity-mapping":
        advice.push({
          ...base,
          fix:
            mappedProfileFields.length > 0
              ? `Add more profile mappings now. You already mapped: ${mappedProfileFields.join(", ")}. At minimum map Full Name plus one strong identifier such as Phone, Household ID, Village, DOB, or GPS.`
              : `Map form questions to ${entityLabelLower} profile fields now: Full Name, Phone, Village, Gender, DOB, and GPS where those questions exist.`,
          mneTip:
            `Approved registration submissions should create one clean ${entityLabelLower} profile with traceable source fields.`,
          targetControlStep: "beneficiaries",
          why:
            `This entity-linked form does not have enough ${entityLabelLower} profile mappings for safe creation or update.`,
        });
        break;
      case "mapping-suggestions":
        advice.push({
          ...base,
          fix: unmappedSuggestedMappings.length
            ? `Click Apply platform fix to map: ${unmappedSuggestedMappings
                .map(([field]) => humanizeControlValue(field))
                .join(", ")}. Then verify the mappings in Controls > Entity Rules.`
            : "No unmapped profile suggestions remain. No action is required.",
          mneTip:
            `Profile mappings let approved submissions update ${entityLabelLower} records with traceable data lineage.`,
          platformAction:
            `The platform can map obvious question labels to ${entityLabelLower} profile fields now.`,
          quickFixId: "apply_profile_mapping",
          targetControlStep: "beneficiaries",
          why:
            `The form contains questions that look like ${entityLabelLower} profile fields but they are not mapped yet.`,
        });
        break;
      case "frequency":
        advice.push({
          ...base,
          fix:
            "Use Apply platform fix to set the frequency rule from the form type. Registration/intake is usually Once Ever, assessment is often Once Per Project or Period, monitoring is monthly/quarterly, and attendance/delivery/inspection is usually Once Per Event.",
          mneTip:
            "Frequency rules stop accidental duplicate records, repeated assessments, and double-counting in reports.",
          platformAction:
            "The platform can set a recommended frequency rule for this form type.",
          quickFixId: formTypeQuickFix,
          targetControlStep: "beneficiaries",
          why:
            `The form does not define how often the same ${entityLabelLower} record or event can be submitted.`,
        });
        break;
      case "frequency-window":
        advice.push({
          ...base,
          fix:
            `Click Apply platform fix to set the operating window for ${humanizeControlValue(controls.submissionFrequency)} submissions. The window is used for duplicate and repeat-submission checks.`,
          mneTip:
            "The window is what the system uses when warning about repeated submissions.",
          platformAction:
            "The platform can infer a safe frequency window from the selected frequency rule.",
          quickFixId: "frequency_window_defaults",
          targetControlStep: "beneficiaries",
          why:
            "A non-unlimited frequency rule needs an operating window so duplicate and frequency checks are meaningful.",
        });
        break;
      case "duplicate-rules":
        advice.push({
          ...base,
          fix: selectedDuplicateFields
            ? `Open Controls > Entity Rules. Current duplicate fields: ${selectedDuplicateFields}. Make sure the threshold is at least 50 and the action is Warn, Block, or Require Review.`
            : "Open Controls > Entity Rules and select duplicate matching fields such as external ID, phone/account ID, parent ID, name + location, date, code, or GPS. Then choose Warn, Block, or Require Review.",
          mneTip:
            "For real programs, Require Review is often safer than automatic creation when phone, ID, or name + village are similar.",
          platformAction:
            "The platform can apply a strong duplicate-review setup using phone, household ID, name, village, and GPS-related checks.",
          quickFixId: "duplicate_review_defaults",
          targetControlStep: "quality",
          why:
            `Duplicate prevention is not configured strongly enough, so approved registration or intake data could create multiple ${entityLabelLower} records for the same real-world record.`,
        });
        break;
      case "duration":
        advice.push({
          ...base,
          fix:
            "Use Apply platform fix to set safe duration and daily-volume defaults, then adjust them if the questionnaire is shorter or longer than usual.",
          mneTip:
            "Very short submissions are useful fraud and quality signals, but thresholds must match the questionnaire length.",
          platformAction:
            "The platform can apply standard duration and daily-volume quality rules that you can adjust for shorter or longer forms.",
          quickFixId: "evidence_defaults",
          targetControlStep: "quality",
          why:
            "Interview duration rules are invalid or missing, so Data Quality cannot flag submissions completed too quickly or unusually slowly.",
        });
        break;
      case "gps-question":
        advice.push({
          ...base,
          fix:
            "Click Apply platform fix to add a GPS question. If this form should not collect location, open Controls > Evidence and turn off GPS Required instead.",
          mneTip:
            "Use GPS for field visits, facility verification, distributions, and household registrations when location matters.",
          platformAction:
            "The platform can add the missing GPS question with the configured accuracy threshold.",
          quickFixId: "add_gps_question",
          targetControlStep: "evidence",
          why:
            "GPS is marked as required, but the questionnaire does not contain a GPS question for field officers to capture.",
        });
        break;
      case "gps-threshold":
        advice.push({
          ...base,
          fix:
            "Use Apply platform fix to set a 20 meter GPS accuracy threshold, then adjust it for rural weak-signal areas if needed.",
          mneTip:
            "Use a relaxed threshold in rural areas with weak signal, and a stricter threshold for facility or asset verification.",
          platformAction:
            "The platform can set a safe rural-friendly GPS and offline evidence default.",
          quickFixId: "evidence_defaults",
          targetControlStep: "evidence",
          why:
            "The GPS accuracy threshold is missing or outside the allowed range.",
        });
        break;
      case "media":
        advice.push({
          ...base,
          fix:
            "Click Apply platform fix to add the required media question. If evidence is not actually required, open Controls > Evidence and set media requirement to None.",
          mneTip:
            "Only require media when it is operationally necessary; large files can slow sync in low-bandwidth field locations.",
          platformAction:
            "The platform can add the missing photo or signature question according to the media rule.",
          quickFixId: "add_media_question",
          targetControlStep: "evidence",
          why:
            "The media rule requires evidence, but the form does not include a matching media capture question.",
        });
        break;
      case "consent":
        advice.push({
          ...base,
          fix:
            "Click Apply platform fix to add a Consent confirmed question. If consent is not required for this instrument, open Controls > Evidence and disable Require Consent.",
          mneTip:
            "Consent should be explicit when collecting personal, household, health, child protection, sensitive, or regulated data.",
          platformAction:
            "The platform can add a consent question and keep consent blocking enabled.",
          quickFixId: "add_consent_question",
          targetControlStep: "evidence",
          why:
            "Consent is required, but the form does not yet have a complete consent configuration.",
        });
        break;
      case "data-quality":
        advice.push({
          ...base,
          fix:
            "Use Apply platform fix to set Standard quality mode. Choose Strict manually for sensitive, regulated, audit-critical, or external-reporting forms; choose Advisory only for pilots.",
          mneTip:
            "Data quality settings decide whether validation issues block field submission or arrive as reviewer warnings.",
          platformAction:
            "The platform can apply standard data quality controls for point-of-entry checks and reviewer warnings.",
          quickFixId: "evidence_defaults",
          targetControlStep: "quality",
          why:
            "The form does not define how missing data, outliers, GPS issues, and validation failures should be handled.",
        });
        break;
      case "future-dates":
        advice.push({
          ...base,
          fix:
            "Use Apply platform fix to enable future-date prevention. If this is a scheduling form with planned future dates, keep it off and document that exception in the form purpose.",
          mneTip:
            "Birth dates, submission dates, training dates, and service dates should almost never be in the future.",
          platformAction:
            "The platform can enable future-date prevention now.",
          quickFixId: "evidence_defaults",
          targetControlStep: "quality",
          why:
            "The form contains date questions but has no protection against impossible future dates.",
        });
        break;
      case "age-validation":
        advice.push({
          ...base,
          fix:
            "Use Apply platform fix to send invalid ages to reviewer decision. Switch to Block manually only when the form is mature and the age rules are certain.",
          mneTip:
            "Age or date errors spread quickly into breakdowns, eligibility, risk scoring, and reports.",
          platformAction:
            "The platform can set invalid age handling to reviewer decision.",
          quickFixId: "evidence_defaults",
          targetControlStep: "quality",
          why:
            "The form asks for age or date of birth but does not yet define how impossible ages should be handled.",
        });
        break;
      case "workflow":
        advice.push({
          ...base,
          fix:
            "Use Apply platform fix to set supervisor review and manager approval. Then change the reviewer roles only if your organization uses a different approval chain.",
          mneTip:
            "The app can flag what looks wrong, but a reviewer should decide whether to approve, return, or reject the data.",
          platformAction:
            "The platform can apply the standard supervisor-review workflow, then you can change reviewer and approver roles.",
          quickFixId: "access_defaults",
          targetControlStep: "access",
          why:
            "The approval workflow is incomplete, so submitted records may not reach the correct reviewer path.",
        });
        break;
      case "permissions":
        advice.push({
          ...base,
          fix:
            `Use Apply platform fix to set standard collection/review permissions. Switch to Restricted manually for sensitive ${entityLabelLower}, health, child protection, compliance, audit, or regulated forms.`,
          mneTip:
            "Permissions protect who can edit, assign, collect, review, approve, export, and archive the form.",
          platformAction:
            "The platform can apply standard form permissions for collection, review, approval, and export governance.",
          quickFixId: "access_defaults",
          targetControlStep: "access",
          why:
            "The form does not yet define its access rules.",
        });
        break;
      case "assignment":
        advice.push({
          ...base,
          actionLabel: "Open field officer access",
          fix:
            fieldOfficerCount > 0
              ? "Use Apply platform fix to select all active field officers, then remove anyone who should not receive the form. If everyone in the project team can collect, change assignment mode to Project Team."
              : "Create or activate field officers in Users & Teams or Field Operations first, then return to this form and select who should receive it.",
          mneTip:
            "A mobile form should not be published to the field without a clear collector list or project-team collection rule.",
          platformAction:
            fieldOfficerCount > 0
              ? "The platform can select all active field officers now; you can remove any who should not receive the form."
              : "The platform is ready for assignments, but there are no active field officers available to select yet.",
          quickFixId: fieldOfficerCount > 0 ? "access_defaults" : undefined,
          targetControlStep: "access",
          why:
            "This form is restricted to assigned users, but no field officer is selected. Mobile sync would have no collector target for this form.",
        });
        break;
      case "export-governance":
        advice.push({
          ...base,
          fix:
            "Use Apply platform fix to require manager-approved exports and audit logging. Change to Data Manager Approval manually if your organization separates operational ownership and data stewardship.",
          mneTip:
            "Export governance is important when datasets include PII, confidential figures, regulated data, or unpublished results.",
          platformAction:
            "The platform can apply manager-approved export governance and audit logging.",
          quickFixId: "governance_defaults",
          targetControlStep: "governance",
          why:
            "Exports are restricted, but no export approval path is configured.",
        });
        break;
      case "retention":
        advice.push({
          ...base,
          fix:
            "Use Apply platform fix to set seven-year retention. Change it manually if the client, funder, donor agreement, contract, or national law requires a different period.",
          mneTip:
            "Retention rules help organizations know when data should stay active, be archived, or be prepared for anonymization.",
          platformAction:
            "The platform can apply a seven-year retention default suitable for many governed programs and operations.",
          quickFixId: "governance_defaults",
          targetControlStep: "governance",
          why:
            "The form does not define how long approved records should be retained.",
        });
        break;
      case "testing":
        advice.push({
          ...base,
          fix:
            "Open Preview & Test, complete a realistic test entry as a field user would, then submit the form for review.",
          mneTip:
            "Test the form before field rollout so skip logic, required fields, reference data, and mobile display problems are found early.",
          platformAction:
            "User action needed: the platform opens the Preview & Test step, then records completion when the form is submitted for review.",
          why:
            "The form has not been tested yet, so approval and publishing should wait until a preview test is completed.",
        });
        break;
      case "lifecycle-approved":
        advice.push({
          ...base,
          fix:
            "Open Controls > Governance, complete certification, move the form to Review, then approve it. After approval, return to Review and publish.",
          mneTip:
            "Keep publishing separate from approval so organizations can sign off before field officers receive the form.",
          targetControlStep: "governance",
          why:
            "The form lifecycle has not reached Approved.",
        });
        break;
      case "certification":
        advice.push({
          ...base,
          fix:
            "Open Controls > Governance and complete Technical Reviewer, Sector Reviewer, Final Approver, and Approval Notes.",
          mneTip:
            `Certification records who checked the questionnaire, methodology, ${entityLabelLower} rules, and approval workflow.`,
          targetControlStep: "governance",
          why:
            "The form does not yet have complete review certification.",
        });
        break;
      case "version":
        advice.push({
          ...base,
          fix:
            "Use Apply platform fix to prepare version metadata, then edit the change summary to describe the real field release or revision.",
          mneTip:
            "Published versions are immutable; version notes protect comparability when questionnaires change over time.",
          platformAction:
            "The platform can prepare version metadata; you should still edit the change summary to describe the real update.",
          quickFixId: "governance_defaults",
          targetControlStep: "governance",
          why:
            "Version information is missing, so the platform cannot create a clear governed publish history.",
        });
        break;
      case "governance":
        advice.push({
          ...base,
          fix:
            "Use Apply platform fix to enable audit trail, approved-record locking, export approval, retention, and source-of-truth defaults.",
          mneTip:
            "This supports auditability, data stewardship, and trustworthy reports.",
          platformAction:
            "The platform can enable audit trail, approved-record locking, retention, and export approval defaults.",
          quickFixId: "governance_defaults",
          targetControlStep: "governance",
          why:
            "Governance defaults are not complete enough for production publishing.",
        });
        break;
      case "source-of-truth":
        advice.push({
          ...base,
          fix:
            "Use Apply platform fix to enable report data freeze and manager-approved profile updates. This keeps identity fields controlled by registration unless a reviewer accepts a later change.",
          mneTip:
            `This prevents past reports and official ${entityLabelLower} profiles from changing silently after approval.`,
          platformAction:
            "The platform can enable approved-data freeze and manager-approved profile updates.",
          quickFixId: "governance_defaults",
          targetControlStep: "governance",
          why:
            `The form does not yet define how approved data contributes to official reports and ${entityLabelLower} profile fields.`,
        });
        break;
      case "mobile-complexity":
        advice.push({
          ...base,
          fix:
            "Use Apply platform fix to switch to safer mobile/offline settings. Then manually reduce media size, repeat-group size, or reference lists if the field package is still heavy.",
          mneTip:
            "A form can be methodologically correct but fail in the field if it is too heavy for weak Android devices or low connectivity.",
          platformAction:
            "The platform can apply mobile reliability defaults for low-bandwidth field collection.",
          quickFixId: "mobile_readiness_defaults",
          targetControlStep: "evidence",
          why:
            "The form has enough questions, media, repeat groups, or reference data to require explicit mobile readiness settings.",
        });
        break;
      case "mapping":
        advice.push({
          ...base,
          fix:
            "Open Controls > Evidence and confirm GPS accuracy settings. If the form includes GPS, set a threshold and review boundary or duplicate GPS settings.",
          mneTip:
            "GPS quality controls help detect static GPS, outside-area collection, and weak location evidence.",
          targetControlStep: "evidence",
          why:
            "The mapping/GPS configuration is incomplete for a form that captures location.",
        });
        break;
      default:
        advice.push(base);
    }
  });

  warningItems.slice(0, 6).forEach((item) => {
    const warningQuickFix: PublishQuickFixId | undefined =
      item.id === "assignment" || item.id === "review-escalation"
        ? "access_defaults"
        : warningQuickFixForItemId(item.id);
    advice.push({
      actionLabel: item.jumpTo === "builder" ? "Review in Builder" : "Review setting",
      fix: item.description,
      id: `warning-${item.id}`,
      item,
      jumpTo: item.jumpTo,
      label: item.label,
      mneTip:
        item.id === "assignment" && controls.assignmentMode === "assigned_only"
          ? fieldOfficerCount > 0
            ? "Select the exact field officers who should receive this form on mobile."
            : "Create or activate field officer accounts before restricting this form to assigned users."
          : warningQuickFix
            ? "Expert recommendation: apply the platform fix first, then confirm the setting matches the project methodology, sector practice, and external requirements."
            : "Expert recommendation: review this item before field rollout because it depends on project design, organizational policy, sector practice, or external expectations.",
      platformAction:
        item.id === "assignment" && fieldOfficerCount > 0
          ? "The platform can select all active field officers now; you can remove users who should not receive the form."
          : warningQuickFix
            ? "The platform can apply a concrete default for this issue, then you can adjust it."
            : item.jumpTo === "builder"
              ? "Manager decision needed: wording, methodology, and structure need human judgement. The platform will open the Builder."
              : item.jumpTo === "setup"
                ? "Manager decision needed: the platform will open Basic Information so you can correct the field."
                : "Manager decision needed: the platform will open the matching Controls tab.",
      quickFixId: warningQuickFix,
      severity: "Warning",
      why: item.description,
    });
  });

  return advice;
}

export function FormCreationWorkspace({
  existingForms,
  initialDuplicateFormId,
  initialForm,
  onBack,
  token,
}: FormCreationWorkspaceProps) {
  const localProjects = useWorkspaceStore((state) => state.localProjects);
  const pendingTemplateId = useWorkspaceStore((state) => state.pendingTemplateId);
  const setPendingTemplateId = useWorkspaceStore((state) => state.setPendingTemplateId);
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
  const fieldOfficersQuery = useQuery({
    enabled: Boolean(token && !preview),
    queryFn: () => listFieldOfficers(token ?? ""),
    queryKey: ["form-builder-field-officers", token],
  });
  const teamsQuery = useQuery({
    enabled: Boolean(token && !preview),
    queryFn: () => listTeams(token ?? ""),
    queryKey: ["form-builder-teams", token],
  });
  const tenantProjects = useMemo(() => projectsQuery.data ?? [], [projectsQuery.data]);
  const tenantSurveys = useMemo(() => surveysQuery.data ?? [], [surveysQuery.data]);
  const fieldOfficerOptions = useMemo(
    () =>
      (preview ? previewFieldOfficers : fieldOfficersQuery.data ?? [])
        .filter((officer) => officer.is_active)
        .sort((first, second) => first.full_name.localeCompare(second.full_name)),
    [fieldOfficersQuery.data, preview],
  );
  const teamOptions = useMemo(
    () =>
      (preview ? previewTeams : teamsQuery.data ?? [])
        .filter((team) => team.is_active)
        .sort((first, second) => first.name.localeCompare(second.name)),
    [teamsQuery.data, preview],
  );
  const formSchemaQuery = useQuery({
    enabled: Boolean(initialForm && token && !preview),
    queryFn: () => getFormSchema(token ?? "", initialForm?.id ?? ""),
    queryKey: ["form-builder-schema", token, initialForm?.id],
  });
  const availableProjectOptions = useMemo(() => {
    const projectsById = new Map<string, Pick<ProjectListItemRead, "id" | "name" | "sector_id" | "sector_name">>();
    const addProject = (project: Pick<ProjectListItemRead, "id" | "name" | "sector_id" | "sector_name">) => {
      if (!project.id || projectsById.has(project.id)) return;
      projectsById.set(project.id, project);
    };

    if (preview) {
      for (const project of localProjects) addProject(project);
      for (const project of previewProjects) addProject(project);
      for (const name of projectOptions) {
        if (Array.from(projectsById.values()).some((project) => project.name === name)) continue;
        projectsById.set(name, { id: name, name, sector_id: null, sector_name: null });
      }
    } else {
      for (const project of tenantProjects) addProject(project);
    }

    return Array.from(projectsById.values()).sort((first, second) =>
      first.name.localeCompare(second.name),
    );
  }, [localProjects, preview, tenantProjects]);
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
            projectId: initialForm.project_id ?? "",
            projectName: initialForm.project_name,
          }
        : {
            ...setupDefaults,
            formName: "New data collection form",
            projectId: "",
            projectName: "",
          },
    [initialForm],
  );
  const [setup, setSetup] = useState<FormSetupDraft>(initialSetup);
  const [stage, setStage] = useState<CreationStage>(
    initialForm ? "builder" : "setup",
  );
  const [startMethod, setStartMethod] = useState<StartMethod>(
    initialDuplicateFormId ? "duplicate" : "blank",
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState(
    starterTemplates[0]?.id ?? "",
  );
  const [selectedDuplicateFormId, setSelectedDuplicateFormId] = useState(
    initialDuplicateFormId ?? existingForms[0]?.id ?? "",
  );
  const [draftForm, setDraftForm] = useState<DynamicForm | null>(initialDraft);
  const [savedBackendFormId, setSavedBackendFormId] = useState<string | null>(
    backendFormTargetIdForSave(initialForm, null),
  );
  const [publishedForm, setPublishedForm] = useState<DynamicForm | null>(null);
  const [controlsDraft, setControlsDraft] =
    useState<FormControlsDraft>(() =>
      controlsDraftFromApiControls(initialForm?.controls_json),
    );
  const [activeControlStep, setActiveControlStep] =
    useState<ControlStep>("essentials");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importMessage, setImportMessage] = useState("");
  const [importBusy, setImportBusy] = useState(false);
  const [importPreview, setImportPreview] = useState<string[] | null>(null);
  const [autoSaveState, setAutoSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const lastPersistedSignatureRef = useRef<string | null>(null);
  const autoSaveInFlightRef = useRef(false);
  const [draftSaving, setDraftSaving] = useState(false);
  const [controlsSaving, setControlsSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishMessage, setPublishMessage] = useState("");
  const [publishHelpOpen, setPublishHelpOpen] = useState(false);
  const [publishSuccessOpen, setPublishSuccessOpen] = useState(false);
  const [publishSuccessSummary, setPublishSuccessSummary] =
    useState<PublishSuccessSummary | null>(null);
  const [previewDeviceMode, setPreviewDeviceMode] =
    useState<PreviewFrame>("mobile");
  const importFileRef = useRef<HTMLInputElement | null>(null);
  const selectedProject = useMemo(
    () => {
      const projects = preview ? [...localProjects, ...previewProjects] : tenantProjects;
      return (
        projects.find((project) => project.id === setup.projectId) ??
        projects.find((project) => project.name === setup.projectName) ??
        null
      );
    },
    [localProjects, preview, setup.projectId, setup.projectName, tenantProjects],
  );
  const selectedProjectId = selectedProject?.id ?? null;
  const sectorTerminology = useMemo(
    () => getSectorTerminology(selectedProject?.sector_id ?? selectedProject?.sector_name ?? null),
    [selectedProject?.sector_id, selectedProject?.sector_name],
  );
  const sectorTemplateOptions = useMemo(() => {
    const sectorId = sectorTerminology.sectorId;
    return [...starterTemplates].sort((first, second) => {
      const firstMatch = first.sectorIds.includes(sectorId);
      const secondMatch = second.sectorIds.includes(sectorId);
      if (firstMatch !== secondMatch) return firstMatch ? -1 : 1;
      if (firstMatch && secondMatch && first.sectorIds.length !== second.sectorIds.length) {
        return first.sectorIds.length - second.sectorIds.length;
      }
      return first.name.localeCompare(second.name);
    });
  }, [sectorTerminology.sectorId]);
  const primaryEntityLabel = sectorTerminology.primaryEntity;
  const primaryEntityPluralLabel = sectorTerminology.primaryEntityPlural;
  const metricLabel = sectorTerminology.metricLabel ?? "Metric";
  const metricPluralLabel = sectorTerminology.metricPluralLabel ?? "Metrics";
  const sectorPrimaryEntityLabels = useMemo(
    () =>
      new Set([
        defaultControlsDraft.entityType,
        ...Object.values(SECTOR_TERMINOLOGY).map((terminology) => terminology.primaryEntity),
      ]),
    [],
  );
  const formTypeOptions = useMemo(() => {
    const sectorOptions = sectorFormTypeOptions[sectorTerminology.sectorId] ?? [];
    const current = setup.formType.trim();
    return Array.from(new Set([...(sectorOptions.length ? sectorOptions : formTypes), ...(current ? [current] : [])]));
  }, [sectorTerminology.sectorId, setup.formType]);
  useEffect(() => {
    setControlsDraft((current) => {
      const currentEntityType = current.entityType.trim();
      const canApplySectorDefault =
        !currentEntityType || sectorPrimaryEntityLabels.has(currentEntityType);
      if (!canApplySectorDefault || currentEntityType === primaryEntityLabel) {
        return current;
      }
      return {
        ...current,
        entityCategoryId: "",
        entityType: primaryEntityLabel,
      };
    });
  }, [primaryEntityLabel, sectorPrimaryEntityLabels]);
  const entityCategoriesQuery = useQuery({
    enabled: Boolean(token && !preview && selectedProjectId),
    queryFn: () =>
      listEntityCategories(token ?? "", {
        include_archived: false,
        project_id: selectedProjectId ?? undefined,
      }),
    queryKey: ["form-builder-entity-categories", token, selectedProjectId],
  });
  const entityTypeOptions = useMemo<EntityTypeOption[]>(() => {
    const activeCategories = (entityCategoriesQuery.data ?? [])
      .filter((category) => category.status !== "archived")
      .sort((first, second) =>
        entityCategoryPath(first, activeCategories).localeCompare(
          entityCategoryPath(second, activeCategories),
        ),
      );
    const categoryOptions: EntityTypeOption[] = activeCategories.map((category) => ({
      attributeCount: category.attributes.length,
      categoryId: category.id,
      entityType: category.name,
      label: entityCategoryPath(category, activeCategories),
      path: entityCategoryPath(category, activeCategories),
      value: `category:${category.id}`,
    }));
    const fallback = [
      primaryEntityLabel,
      "Household",
      "Facility",
      "Site",
      "Asset",
      "Product",
      "Customer",
      "Employee",
      "Custom Entity",
    ];
    const current = controlsDraft.entityType.trim();
    const fallbackOptions = Array.from(
      new Set([...(categoryOptions.length ? [] : fallback), ...(current ? [current] : [])]),
    ).map((type) => ({
      attributeCount: 0,
      categoryId: "",
      entityType: type,
      label: type,
      path: null,
      value: `type:${type}`,
    }));
    if (!categoryOptions.length) return fallbackOptions;
    if (
      current &&
      !categoryOptions.some(
        (option) => option.entityType.toLowerCase() === current.toLowerCase(),
      )
    ) {
      categoryOptions.push({
        attributeCount: 0,
        categoryId: "",
        entityType: current,
        label: `${current} (custom for this form)`,
        path: null,
        value: `type:${current}`,
      });
    }
    return categoryOptions;
  }, [controlsDraft.entityType, entityCategoriesQuery.data, primaryEntityLabel]);
  const selectedEntityTypeOption = useMemo(
    () =>
      entityTypeOptions.find((option) =>
        option.categoryId
          ? option.categoryId === controlsDraft.entityCategoryId
          : option.entityType.toLowerCase() === controlsDraft.entityType.trim().toLowerCase(),
      ) ?? null,
    [controlsDraft.entityCategoryId, controlsDraft.entityType, entityTypeOptions],
  );
  const entityTypeSelectValue =
    selectedEntityTypeOption?.value ??
    entityTypeOptions[0]?.value ??
    `type:${controlsDraft.entityType || primaryEntityLabel}`;
  const selectedEntityCategory = useMemo<EntityCategoryRead | null>(
    () =>
      (entityCategoriesQuery.data ?? []).find(
        (category) =>
          category.status !== "archived" &&
          (category.id === controlsDraft.entityCategoryId ||
            category.name.toLowerCase() === controlsDraft.entityType.trim().toLowerCase()),
      ) ?? null,
    [controlsDraft.entityCategoryId, controlsDraft.entityType, entityCategoriesQuery.data],
  );
  const selectedEntityCategoryPath = useMemo(
    () =>
      selectedEntityCategory
        ? entityCategoryPath(selectedEntityCategory, entityCategoriesQuery.data ?? [])
        : null,
    [entityCategoriesQuery.data, selectedEntityCategory],
  );
  useEffect(() => {
    const activeCategories = (entityCategoriesQuery.data ?? []).filter(
      (category) => category.status !== "archived",
    );
    if (!activeCategories.length) return;
    const current = controlsDraft.entityType.trim().toLowerCase();
    const currentExists = activeCategories.some(
      (category) => category.name.toLowerCase() === current,
    );
    if (currentExists) return;
    if (current && current !== defaultControlsDraft.entityType.toLowerCase()) return;
    const firstCategory = activeCategories[0];
    updateControlsDraft({
      entityCategoryId: firstCategory?.id ?? "",
      entityType: firstCategory?.name ?? controlsDraft.entityType,
    });
  }, [controlsDraft.entityType, entityCategoriesQuery.data]);
  const entityCollectionSummary = useMemo(() => {
    const entityLabel = controlsDraft.entityType.trim() || primaryEntityLabel;
    const categoryRule = selectedEntityCategoryPath
      ? `Project category path: ${selectedEntityCategoryPath}.`
      : selectedProjectId
        ? "No project category is linked yet, so this form is using a form-only entity label."
        : "Select a project first so this form can inherit the right sector or custom entity categories.";
    const searchRule =
      controlsDraft.respondentIdentification === "existing_beneficiary"
        ? `Field officers must search and select an existing ${entityLabel.toLowerCase()} before they collect.`
        : controlsDraft.respondentIdentification === "new_registration"
          ? `Field officers can register a new ${entityLabel.toLowerCase()} directly from this form.`
          : controlsDraft.respondentIdentification === "existing_or_new"
            ? `Field officers can link an existing ${entityLabel.toLowerCase()} or register a new one from the same workflow.`
            : `This form allows anonymous collection when the project does not require a tracked ${entityLabel.toLowerCase()}.`;
    const approvalRule =
      controlsDraft.profileUpdateMode === "never"
        ? `Approved submissions stay linked, but they do not update the official ${entityLabel.toLowerCase()} profile.`
        : controlsDraft.profileUpdateMode === "after_submission"
          ? `Approved submissions can update the official ${entityLabel.toLowerCase()} profile automatically after approval.`
          : `Approved submissions prepare ${entityLabel.toLowerCase()} profile updates for supervisor review before they become official.`;
    const fieldRule = selectedEntityCategory
      ? `${selectedEntityCategory.attributes.length} configured category field(s) are available to add into the Builder.`
      : "Category-specific entity fields are not available yet for this form.";
    return [categoryRule, searchRule, approvalRule, fieldRule];
  }, [
    controlsDraft.entityType,
    controlsDraft.profileUpdateMode,
    controlsDraft.respondentIdentification,
    primaryEntityLabel,
    selectedEntityCategory,
    selectedEntityCategoryPath,
    selectedProjectId,
  ]);
  const entityWorkflowSummary = useMemo(() => {
    const entityLabel = controlsDraft.entityType.trim() || primaryEntityLabel;
    const entityLabelLower = entityLabel.toLowerCase();
    if (controlsDraft.respondentIdentification === "existing_beneficiary") {
      return `follow-up on existing ${entityLabelLower} records`;
    }
    if (controlsDraft.respondentIdentification === "existing_or_new") {
      return `existing or new ${entityLabelLower} workflow`;
    }
    if (controlsDraft.respondentIdentification === "new_registration") {
      return `new ${entityLabelLower} registration workflow`;
    }
    if (controlsDraft.respondentIdentification === "anonymous_allowed") {
      return `anonymous ${entityLabelLower} collection allowed`;
    }
    if (!controlsDraft.requiresEntity) {
      return controlsDraft.allowAnonymous
        ? "anonymous or unlinked collection allowed"
        : "standalone collection without entity linkage";
    }
    return `${entityLabelLower} rule needs review`;
  }, [
    controlsDraft.allowAnonymous,
    controlsDraft.entityType,
    controlsDraft.requiresEntity,
    controlsDraft.respondentIdentification,
    primaryEntityLabel,
  ]);
  const selectedSurvey =
    !preview && selectedProjectId
      ? tenantSurveys.find((survey) => survey.project_id === selectedProjectId)
      : null;
  const projectLinked = preview
    ? Boolean(setup.projectId || setup.projectName.trim())
    : Boolean(selectedProjectId);
  const checklist = useMemo(
    () => validateFormForPublish(draftForm, setup, projectLinked, controlsDraft),
    [controlsDraft, draftForm, projectLinked, setup],
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
  const readinessBelowPublishThreshold = readinessScore < MINIMUM_PUBLISH_READINESS_SCORE;
  const criticalFailures = publishBlockingFailures(checklist);
  const approvalFailures = approvalBlockingFailures(checklist);
  const publishDisabled =
    !draftForm || criticalFailures.length > 0 || readinessBelowPublishThreshold || publishing;
  const publishAssistantAdvice = useMemo(
    () =>
      buildPublishAssistantAdvice({
        checklist,
        controls: controlsDraft,
        fieldOfficerCount: fieldOfficerOptions.length,
        form: draftForm,
        projectLinked,
        setup,
      }),
    [
      checklist,
      controlsDraft,
      draftForm,
      fieldOfficerOptions.length,
      projectLinked,
      setup,
    ],
  );
  const requiredPublishAdvice = publishAssistantAdvice.filter(
    (advice) => advice.severity === "Required",
  );
  const warningPublishAdvice = publishAssistantAdvice.filter(
    (advice) => advice.severity === "Warning",
  );
  const reviewChecklist = useMemo(
    () =>
      [...checklist].sort((a, b) => {
        const rank = (item: PublishReadinessItem) =>
          item.complete ? 2 : item.required ? 0 : 1;
        const rankDifference = rank(a) - rank(b);
        if (rankDifference !== 0) return rankDifference;
        return `${a.category}-${a.label}`.localeCompare(`${b.category}-${b.label}`);
      }),
    [checklist],
  );
  const readinessLabel =
    criticalFailures.length > 0 || readinessBelowPublishThreshold
      ? "Not Ready"
      : readinessScore >= 90
        ? "Ready"
        : "Needs Review";
  const readinessTone =
    criticalFailures.length > 0 || readinessBelowPublishThreshold
      ? "danger"
      : readinessScore >= 90
        ? "success"
        : "warning";
  const activeControlStepIndex = Math.max(
    controlSteps.findIndex((step) => step.id === activeControlStep),
    0,
  );
  const activeControlStepConfig = controlSteps[activeControlStepIndex] ?? controlSteps[0];
  const controlStepReadiness = useMemo(() => {
    return Object.fromEntries(
      controlSteps.map((step) => {
        const items = checklist.filter((item) =>
          step.categories.some((category) =>
            item.category.toLowerCase().includes(category.toLowerCase()),
          ),
        );
        const failures = items.filter((item) => item.required && !item.complete).length;
        const warnings = items.filter((item) => item.status === "warning").length;
        const passed = items.filter((item) => item.status === "passed").length;
        const required = items.some((item) => item.required);
        return [step.id, { failures, items: items.length, passed, required, warnings }];
      }),
    ) as Record<
      ControlStep,
      { failures: number; items: number; passed: number; required: boolean; warnings: number }
    >;
  }, [checklist]);
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
  const missingMneQuestions = useMemo(
    () => missingRecommendedQuestions(draftForm, setup, controlsDraft),
    [controlsDraft, draftForm, setup],
  );
  const wordingRiskFields = useMemo(
    () => weakQuestionLabels(draftForm?.fields ?? []),
    [draftForm],
  );
  const suggestedProfileMappingCount = useMemo(() => {
    const suggestions = suggestedProfileMappingsFromFields(draftForm?.fields ?? []);
    return Object.entries(suggestions).filter(
      ([key, value]) =>
        Boolean(value) &&
        !controlsDraft.profileMappings[key as keyof FormControlsDraft["profileMappings"]],
    ).length;
  }, [controlsDraft.profileMappings, draftForm]);
  const activeLifecycleId = activeLifecycleStepId(
    stage,
    controlsDraft.lifecycleStatus,
    Boolean(publishedForm),
    criticalFailures.length,
  );
  const activeLifecycleIndex = lifecycleSteps.findIndex(
    (step) => step.id === activeLifecycleId,
  );
  const lifecycleCompletion = lifecycleCompletionState({
    checklist,
    hasDraft: Boolean(draftForm),
    lifecycleStatus: controlsDraft.lifecycleStatus,
    published: Boolean(publishedForm),
    testingCompletedAt: controlsDraft.testingCompletedAt,
  });
  const completedLifecycleCount = Object.values(lifecycleCompletion).filter(Boolean).length;
  const lifecycleProgressPercent = Math.round(
    (completedLifecycleCount / lifecycleSteps.length) * 100,
  );
  const nextControlStepConfig = controlSteps[activeControlStepIndex + 1];
  const lifecycleActions = lifecycleActionState(
    controlsDraft.lifecycleStatus,
    Boolean(controlsDraft.testingCompletedAt),
  );
  const approvalAction = approvalActionState(
    controlsDraft.lifecycleStatus,
    approvalFailures.length,
    Boolean(controlsDraft.testingCompletedAt),
  );
  const nextActionHint =
    stage === "setup"
      ? "Next: choose how to start this form (blank, template, duplicate, or import)."
      : stage === "start"
        ? "Next: the Builder opens so you can add and arrange questions."
        : stage === "builder"
          ? "Next: Controls sets who can collect this form, entity rules, and governance — or use Quick setup to apply recommended defaults and continue to Preview & Test."
          : stage === "controls"
            ? nextControlStepConfig
              ? `Next control step: "${nextControlStepConfig.label}" — ${nextControlStepConfig.mustDo}`
              : "Next: Preview & Test lets you try the form as a field officer would before requesting review."
            : stage === "preview"
              ? "Next: Submit for Review locks this draft for reviewer sign-off before approval and publishing."
              : controlsDraft.lifecycleStatus === "approved"
                ? "This version is approved. Publish makes it available to field officers immediately."
                : criticalFailures.length > 0
                  ? "Next: resolve the required review blockers, then approve the form for publishing."
                  : "Next: approve this form to confirm it is ready, then publish it to field officers.";

  function updateSetup(patch: Partial<FormSetupDraft>): void {
    setSetup((current) => ({ ...current, ...patch }));
  }

  function updateControlsDraft(patch: Partial<FormControlsDraft>): void {
    setControlsDraft((current) => ({ ...current, ...patch }));
  }

  function updateRespondentIdentification(
    respondentIdentification: FormControlsDraft["respondentIdentification"],
  ): void {
    setControlsDraft((current) => ({
      ...current,
      allowAnonymous: respondentIdentification === "anonymous_allowed",
      beneficiarySearch:
        respondentIdentification === "existing_beneficiary"
          ? "required"
          : respondentIdentification === "existing_or_new"
            ? current.beneficiarySearch === "required" ? "required" : "optional"
            : "disabled",
      requiresEntity: respondentIdentification === "existing_beneficiary",
      respondentIdentification,
    }));
  }

  function updateRequiresEntity(requiresEntity: boolean): void {
    setControlsDraft((current) => {
      if (requiresEntity) {
        return {
          ...current,
          allowAnonymous: false,
          beneficiarySearch: "required",
          requiresEntity: true,
          respondentIdentification: "existing_beneficiary",
        };
      }
      const respondentIdentification =
        current.allowAnonymous
          ? "anonymous_allowed"
          : current.beneficiarySearch === "disabled"
            ? "new_registration"
            : "existing_or_new";
      return {
        ...current,
        beneficiarySearch:
          respondentIdentification === "existing_or_new" ? "optional" : current.beneficiarySearch,
        requiresEntity: false,
        respondentIdentification,
      };
    });
  }

  function updateAllowAnonymous(allowAnonymous: boolean): void {
    setControlsDraft((current) => {
      if (allowAnonymous) {
        return {
          ...current,
          allowAnonymous: true,
          beneficiarySearch: "disabled",
          requiresEntity: false,
          respondentIdentification: "anonymous_allowed",
        };
      }
      if (current.respondentIdentification !== "anonymous_allowed") {
        return { ...current, allowAnonymous: false };
      }
      const respondentIdentification =
        current.profileUpdateMode !== "never" ? "existing_or_new" : "new_registration";
      return {
        ...current,
        allowAnonymous: false,
        beneficiarySearch:
          respondentIdentification === "existing_or_new" ? "optional" : "disabled",
        requiresEntity: false,
        respondentIdentification,
      };
    });
  }

  function updateBeneficiarySearch(
    beneficiarySearch: FormControlsDraft["beneficiarySearch"],
  ): void {
    setControlsDraft((current) => {
      if (beneficiarySearch === "disabled") {
        return {
          ...current,
          beneficiarySearch: "disabled",
          requiresEntity: false,
          respondentIdentification:
            current.allowAnonymous ? "anonymous_allowed" : "new_registration",
        };
      }
      if (current.respondentIdentification === "existing_beneficiary") {
        return {
          ...current,
          beneficiarySearch,
          requiresEntity: beneficiarySearch === "required",
          respondentIdentification:
            beneficiarySearch === "required" ? "existing_beneficiary" : "existing_or_new",
        };
      }
      return {
        ...current,
        allowAnonymous: false,
        beneficiarySearch,
        requiresEntity: false,
        respondentIdentification: "existing_or_new",
      };
    });
  }

  function addEntityCategoryQuestions(): void {
    if (!selectedEntityCategory) {
      setPublishMessage("Select a project entity category first, then Atlas can add its fields as questions.");
      return;
    }
    if (!draftForm) {
      setPublishMessage("Start a draft first, then add entity category fields to the Builder.");
      setStage("start");
      return;
    }
    const activeAttributes = selectedEntityCategory.attributes
      .filter((attribute) => attribute.status !== "archived")
      .sort((first, second) => (first.order_index ?? 0) - (second.order_index ?? 0));
    if (!activeAttributes.length) {
      setPublishMessage(`${selectedEntityCategory.name} has no active fields to add.`);
      return;
    }
    const existingVariables = new Set(
      draftForm.fields
        .map((field) => field.variableName)
        .filter((value): value is string => Boolean(value)),
    );
    const existingPages = draftForm.pages ?? [];
    const page = existingPages[0] ?? createPage("Page 1");
    const section = createSection(page.id, `${selectedEntityCategory.name} profile fields`);
    const addedFields = activeAttributes
      .filter((attribute) => !existingVariables.has(attribute.field_key))
      .map((attribute) => {
        const field = createField(fieldTypeFromEntityAttribute(attribute.field_type), section.id, page.id);
        existingVariables.add(attribute.field_key);
        return {
          ...field,
          beneficiary: {
            profileField: attribute.field_key,
            profileImpact: "updates_profile" as const,
          },
          appearance: {
            ...field.appearance,
            helpText: `${field.appearance?.helpText ?? ""} [profile-impact:updates_profile] [beneficiary-field:${attribute.field_key}] [lineage-required]`.trim(),
          },
          hint: attribute.description || `Configured field from ${selectedEntityCategory.name}.`,
          label: attribute.label,
          options: attribute.options_json?.length ? attribute.options_json : field.options,
          required: Boolean(attribute.required),
          variableName: attribute.field_key,
        };
      });
    if (!addedFields.length) {
      setPublishMessage("All active entity category fields already exist in this form.");
      return;
    }
    const nextForm: DynamicForm = {
      ...draftForm,
      fields: [...draftForm.fields, ...addedFields],
      pages: existingPages.length ? existingPages : [page],
      sections: [...draftForm.sections, section],
      updatedAt: new Date().toISOString(),
    };
    setDraftForm(nextForm);
    upsertLocalForm(workspaceFormFromDraft(nextForm, setup, selectedProjectId));
    setPublishMessage(`${addedFields.length} ${selectedEntityCategory.name} field${addedFields.length === 1 ? "" : "s"} added to the Builder.`);
    setStage("builder");
  }

  function toggleAssignedFieldOfficer(officerId: string): void {
    setControlsDraft((current) => {
      const selected = new Set(current.assignedFieldOfficerIds);
      if (selected.has(officerId)) {
        selected.delete(officerId);
      } else {
        selected.add(officerId);
      }
      return {
        ...current,
        assignmentMode: "assigned_only",
        assignedFieldOfficerIds: Array.from(selected),
      };
    });
  }

  function selectAllFieldOfficers(): void {
    setControlsDraft((current) => ({
      ...current,
      assignmentMode: "assigned_only",
      assignedFieldOfficerIds: fieldOfficerOptions.map((officer) => officer.id),
    }));
  }

  function clearAssignedFieldOfficers(): void {
    setControlsDraft((current) => ({
      ...current,
      assignedFieldOfficerIds: [],
    }));
  }

  function toggleAssignedTeam(teamId: string): void {
    setControlsDraft((current) => {
      const selected = new Set(current.assignedTeamIds);
      if (selected.has(teamId)) {
        selected.delete(teamId);
      } else {
        selected.add(teamId);
      }
      return {
        ...current,
        assignmentMode: "assigned_only",
        assignedTeamIds: Array.from(selected),
      };
    });
  }

  function selectAllTeams(): void {
    setControlsDraft((current) => ({
      ...current,
      assignmentMode: "assigned_only",
      assignedTeamIds: teamOptions.map((team) => team.id),
    }));
  }

  function clearAssignedTeams(): void {
    setControlsDraft((current) => ({
      ...current,
      assignedTeamIds: [],
    }));
  }

  function applyPublishQuickFix(quickFixId: PublishQuickFixId): void {
    const addQuestionsToDraft = (
      questions: RecommendedQuestion[],
      sectionTitle: string,
      successMessage: string,
    ): void => {
      if (!draftForm) {
        setPublishMessage("Start a draft first, then the assistant can add questions.");
        setStage("start");
        return;
      }
      const existingPages = draftForm.pages ?? [];
      const page = existingPages[0] ?? createPage("Page 1");
      const section = createSection(page.id, sectionTitle);
      const usedVariables = new Set(
        draftForm.fields
          .map((field) => field.variableName)
          .filter((value): value is string => Boolean(value)),
      );
      const addedFields = questions.map((question) => {
        const field = attachStarterField(
          section,
          question.type,
          question.label,
          Boolean(question.required),
        );
        return {
          ...field,
          options: question.options ?? field.options,
          validation: question.validation ?? field.validation,
          variableName: uniqueVariableName(question.label, usedVariables, field.id),
        };
      });
      const nextForm: DynamicForm = {
        ...draftForm,
        fields: [...draftForm.fields, ...addedFields],
        pages: existingPages.length ? existingPages : [page],
        sections: [...draftForm.sections, section],
        updatedAt: new Date().toISOString(),
      };
      setDraftForm(nextForm);
      upsertLocalForm(workspaceFormFromDraft(nextForm, setup, selectedProjectId));
      setPublishMessage(successMessage);
      setStage("builder");
      window.setTimeout(() => {
        window.scrollTo({ behavior: "smooth", top: 0 });
      }, 0);
    };

    if (quickFixId === "add_standard_questions") {
      if (!draftForm) {
        setPublishMessage("Start a draft first, then the assistant can add recommended sector questions.");
        setStage("start");
        return;
      }
      const missingQuestions = missingRecommendedQuestions(draftForm, setup, controlsDraft);
      if (!missingQuestions.length) {
        setPublishMessage("No missing standard questions were detected for this form type.");
        setStage("builder");
        return;
      }
      addQuestionsToDraft(
        missingQuestions,
        "Sector-standard readiness questions",
        `${missingQuestions.length} recommended sector question${missingQuestions.length === 1 ? "" : "s"} added. Review wording and validation in Builder.`,
      );
      return;
    }

    if (quickFixId === "add_gps_question") {
      addQuestionsToDraft(
        [
          {
            label: "Collection GPS",
            required: controlsDraft.requiresGps,
            type: "gps",
            validation: { accuracyMax: controlsDraft.gpsAccuracy },
          },
        ],
        "Location evidence",
        "GPS question added. Review accuracy threshold and wording in Builder.",
      );
      return;
    }

    if (quickFixId === "add_media_question") {
      const mediaQuestion: RecommendedQuestion =
        controlsDraft.mediaRequirement === "signature" ||
        controlsDraft.mediaRequirement === "photo_signature"
          ? { label: "Respondent signature", required: true, type: "signature" }
          : { label: "Evidence photo", required: true, type: "photo" };
      addQuestionsToDraft(
        [mediaQuestion],
        "Media evidence",
        "Required media question added. Review file size and evidence wording in Builder.",
      );
      return;
    }

    if (quickFixId === "add_consent_question") {
      addQuestionsToDraft(
        [{ label: "Consent confirmed", options: ["Yes", "No"], required: true, type: "radio" }],
        "Consent",
        "Consent question added. Review consent text and blocking rule before publishing.",
      );
      return;
    }

    if (quickFixId === "apply_profile_mapping") {
      const suggestedMappings = suggestedProfileMappingsFromFields(draftForm?.fields ?? []);
      setControlsDraft((current) => {
        const respondentIdentification =
          current.respondentIdentification === "new_registration"
            ? "new_registration"
            : current.respondentIdentification === "existing_or_new"
              || current.respondentIdentification === "anonymous_allowed"
              ? "existing_or_new"
              : "existing_beneficiary";
        return {
          ...current,
          allowAnonymous: false,
          beneficiarySearch:
            respondentIdentification === "existing_beneficiary"
              ? "required"
              : respondentIdentification === "existing_or_new"
                ? current.beneficiarySearch === "required" ? "required" : "optional"
                : "disabled",
          profileMappings: {
            ...current.profileMappings,
            ...Object.fromEntries(
              Object.entries(suggestedMappings).filter(([, value]) => Boolean(value)),
            ),
          } as FormControlsDraft["profileMappings"],
          profileUpdateMode:
            current.profileUpdateMode === "never"
              ? "with_supervisor_approval"
              : current.profileUpdateMode,
          requiresEntity: respondentIdentification === "existing_beneficiary",
          respondentIdentification,
        };
      });
      setActiveControlStep("beneficiaries");
      setStage("controls");
      setPublishMessage("Suggested entity profile mappings were applied. Review them before publishing.");
      window.setTimeout(() => {
        window.scrollTo({ behavior: "smooth", top: 0 });
      }, 0);
      return;
    }

    if (quickFixId === "fix_question_variables") {
      if (!draftForm) return;
      const used = new Set<string>();
      const nextForm: DynamicForm = {
        ...draftForm,
        fields: draftForm.fields.map((field, index) => ({
          ...field,
          variableName: uniqueVariableName(field.label, used, `question_${index + 1}`),
        })),
        updatedAt: new Date().toISOString(),
      };
      setDraftForm(nextForm);
      upsertLocalForm(workspaceFormFromDraft(nextForm, setup, selectedProjectId));
      setPublishMessage("Question variable names were repaired and made unique.");
      setStage("builder");
      return;
    }

    if (quickFixId === "fix_question_wording") {
      if (!draftForm) return;
      const nextForm: DynamicForm = {
        ...draftForm,
        fields: draftForm.fields.map((field, index) => ({
          ...field,
          label: improvedQuestionLabel(field, index),
          variableName: variableNameFromLabel(improvedQuestionLabel(field, index), field.id),
        })),
        updatedAt: new Date().toISOString(),
      };
      setDraftForm(nextForm);
      upsertLocalForm(workspaceFormFromDraft(nextForm, setup, selectedProjectId));
      setPublishMessage("Weak question labels were cleaned up. Review the wording in Builder before publishing.");
      setStage("builder");
      return;
    }

    if (quickFixId === "mark_core_required") {
      if (!draftForm) return;
      const nextForm: DynamicForm = {
        ...draftForm,
        fields: draftForm.fields.map((field) => ({
          ...field,
          required: field.required || coreRequiredField(field),
          validation: coreRequiredField(field)
            ? { ...field.validation, allowDontKnow: true, allowRefused: true }
            : field.validation,
        })),
        updatedAt: new Date().toISOString(),
      };
      setDraftForm(nextForm);
      upsertLocalForm(workspaceFormFromDraft(nextForm, setup, selectedProjectId));
      setPublishMessage("Core identification, date, location, service, and consent questions were marked required where detected.");
      setStage("builder");
      return;
    }

    if (quickFixId === "fix_broken_logic") {
      if (!draftForm) return;
      const validFieldIds = new Set(draftForm.fields.map((field) => field.id));
      const nextForm: DynamicForm = {
        ...draftForm,
        fields: draftForm.fields.map((field) => ({
          ...field,
          logic: (field.logic ?? []).filter(
            (rule) => !rule.targetId || validFieldIds.has(rule.targetId),
          ),
        })),
        updatedAt: new Date().toISOString(),
      };
      setDraftForm(nextForm);
      upsertLocalForm(workspaceFormFromDraft(nextForm, setup, selectedProjectId));
      setPublishMessage("Broken logic references were removed. Retest skip logic in Preview before publishing.");
      setStage("builder");
      return;
    }

    setControlsDraft((current) => {
      const commonEntityDefaults: Partial<FormControlsDraft> = {
        allowAnonymous: false,
        duplicateAction: "review",
        duplicateFields: current.duplicateFields.length
          ? current.duplicateFields
          : ["phone_number", "household_id", "full_name", "village"],
        duplicateGpsDetection: true,
        duplicateSeverity: "high",
        duplicateThreshold: Math.max(current.duplicateThreshold, 85),
        entityType: current.entityType || "Entity",
        profileUpdateMode: "with_supervisor_approval",
        requiresEntity: true,
      };

      switch (quickFixId) {
        case "mne_context_defaults": {
          const contextEntityLabel = (current.entityType.trim() || "Entity").toLowerCase();
          return {
            ...current,
            businessPurpose:
              current.businessPurpose ||
              `Support project operations, ${contextEntityLabel} record management, evidence review, and reporting.`,
            decisionUse:
              /donor|report/i.test(current.expectedUse)
                ? "donor_reporting"
                : current.decisionUse || "operational_decision",
            disaggregationFields: current.disaggregationFields.length
              ? current.disaggregationFields
              : ["location", "category", "status"],
            disaggregationRequired: current.disaggregationRequired,
            dontKnowPolicy:
              current.dontKnowPolicy === "disabled"
                ? "required_for_sensitive"
                : current.dontKnowPolicy,
            expectedUse:
              current.expectedUse ||
              `Approved submissions will feed ${contextEntityLabel} history, data quality review, dashboards, metrics, and reports.`,
            formObjective:
              current.formObjective ||
              `Collect reliable ${setup.formType || "field"} data for ${setup.projectName || "the selected project"}.`,
            linkedOutcome:
              current.linkedOutcome || "Improved project performance and accountable service delivery.",
            linkedOutput:
              current.linkedOutput || "Clean, approved field records available for review and reporting.",
            programObjective:
              current.programObjective || "Improve program delivery using timely, verified field evidence.",
            reportingPeriod:
              current.reportingPeriod === "none" ? "quarterly" : current.reportingPeriod,
            resultArea: current.resultArea || setup.formType || "Program Monitoring",
          };
        }
        case "duplicate_review_defaults":
          return {
            ...current,
            ...duplicateReviewDefaults(current),
          };
        case "registration_defaults":
          return {
            ...current,
            ...commonEntityDefaults,
            beneficiarySearch: "disabled",
            frequencyWindow: "none",
            requiresEntity: false,
            respondentIdentification: "new_registration",
            submissionFrequency: "once_ever",
          };
        case "baseline_defaults":
          return {
            ...current,
            ...commonEntityDefaults,
            beneficiarySearch: "required",
            frequencyWindow: "reporting_period",
            respondentIdentification: "existing_beneficiary",
            submissionFrequency: "once_per_project",
          };
        case "monitoring_defaults":
          return {
            ...current,
            ...commonEntityDefaults,
            beneficiarySearch: "required",
            frequencyWindow: "month",
            respondentIdentification: "existing_beneficiary",
            submissionFrequency: "once_per_month",
          };
        case "frequency_window_defaults":
          return {
            ...current,
            frequencyWindow:
              current.submissionFrequency === "once_per_month"
                ? "month"
                : current.submissionFrequency === "once_per_quarter"
                  ? "reporting_period"
                  : current.submissionFrequency === "once_per_season"
                    ? "season"
                    : current.submissionFrequency === "once_per_event"
                      ? "day"
                      : current.submissionFrequency === "once_per_project"
                        ? "reporting_period"
                        : current.frequencyWindow === "none"
                          ? "reporting_period"
                          : current.frequencyWindow,
          };
        case "access_defaults":
          return {
            ...current,
            assignedFieldOfficerIds:
              current.assignmentMode === "assigned_only" && fieldOfficerOptions.length
                ? fieldOfficerOptions.map((officer) => officer.id)
                : current.assignedFieldOfficerIds,
            assignmentMode:
              setup.collectionMethod === "web" ? current.assignmentMode : "assigned_only",
            permissionPreset: current.permissionPreset || "standard",
            reviewApprover: current.reviewApprover || "me_manager",
            reviewReturner: current.reviewReturner || "supervisor",
            reviewer: current.reviewer || "supervisor",
            workflowPreset: current.workflowPreset || "supervisor_review",
          };
        case "evidence_defaults":
          return {
            ...current,
            dataQualityMode: "standard",
            deviceClockDriftAction:
              current.deviceClockDriftAction === "warn" ? "review" : current.deviceClockDriftAction,
            enumeratorTrainingRequired: current.riskClassification === "sensitive"
              ? true
              : current.enumeratorTrainingRequired,
            gpsAccuracy: current.gpsAccuracy > 0 ? current.gpsAccuracy : 20,
            invalidAgeAction: current.invalidAgeAction === "warn" ? "review" : current.invalidAgeAction,
            maximumDurationMinutes: Math.max(current.maximumDurationMinutes, 90),
            maximumSubmissionsPerDay: Math.max(current.maximumSubmissionsPerDay, 40),
            minimumDurationMinutes: current.minimumDurationMinutes > 0 ? current.minimumDurationMinutes : 5,
            mobilePackageMode: current.mobilePackageMode || "standard",
            offlineEnabled: true,
            offlineMaxDays: Math.max(current.offlineMaxDays, 7),
            offlineMediaCapture: true,
            preventFutureDates: true,
            staticGpsAction:
              current.staticGpsAction === "warn" ? "review" : current.staticGpsAction,
            syncRequirement: current.syncRequirement || "daily_required",
          };
        case "mobile_readiness_defaults":
          return {
            ...current,
            dataQualityMode: current.dataQualityMode === "advisory" ? "standard" : current.dataQualityMode,
            maxAttachmentSizeMb: Math.min(current.maxAttachmentSizeMb, 5),
            mediaRequirement:
              current.mediaRequirement === "any_attachment"
                ? "photo"
                : current.mediaRequirement,
            mobilePackageMode:
              draftForm && draftForm.fields.length > 80
                ? "large_registry"
                : current.mediaRequirement !== "none"
                  ? "media_heavy"
                  : "low_bandwidth",
            offlineEnabled: true,
            offlineMaxDays: Math.max(current.offlineMaxDays, 7),
            offlineMediaCapture: current.mediaRequirement !== "none",
            referenceDataRequired: true,
            syncRequirement: "daily_required",
          };
        case "governance_defaults":
          return {
            ...current,
            auditTrail: true,
            backCheckRequired:
              current.riskClassification === "high" ||
              current.riskClassification === "sensitive"
                ? true
                : current.backCheckRequired,
            backCheckSamplePercent: Math.max(current.backCheckSamplePercent, 10),
            changeSummary:
              current.changeSummary ||
              `Prepared ${setup.formType || "form"} for first governed field release.`,
            dataFreezeRequired: true,
            dataRetentionPolicy: current.dataRetentionPolicy || "seven_years",
            exportApprovalMode:
              current.exportApprovalMode === "not_required"
                ? "manager_approval"
                : current.exportApprovalMode,
            exportRestricted: true,
            importTemplateMode:
              current.importTemplateMode === "none"
                ? "form_dictionary"
                : current.importTemplateMode,
            partnerDataSharingRule:
              current.partnerDataSharingRule ||
              "Share only approved, permissioned records; log exports and apply role-based filters.",
            lockApprovedRecords: true,
            riskClassification: current.riskClassification || "medium",
            caseEscalationRule:
              current.decisionUse === "case_management" && !current.caseEscalationRule
                ? "If a critical risk or protection response is selected -> create supervisor alert."
                : current.caseEscalationRule,
            sourceOfTruthRule: "manager_approved_profile_updates",
            storeConsentVersion: true,
            testingRequirement: current.testingRequirement || "test_submission",
            versionNumber: current.versionNumber || "1.0.0",
          };
        default:
          return current;
      }
    });

    const targetStep: ControlStep =
      quickFixId === "access_defaults"
        ? "access"
        : quickFixId === "mobile_readiness_defaults"
          ? "evidence"
          : quickFixId === "duplicate_review_defaults"
            ? "quality"
          : quickFixId === "evidence_defaults"
            ? "quality"
          : quickFixId === "governance_defaults"
            ? "governance"
            : quickFixId === "mne_context_defaults"
              ? "essentials"
              : "beneficiaries";
    setActiveControlStep(targetStep);
    setStage("controls");
    setPublishMessage("Recommended sector-ready settings were applied. Review them, save controls, then run the readiness review again.");
    window.setTimeout(() => {
      window.scrollTo({ behavior: "smooth", top: 0 });
    }, 0);
  }

  function openReadinessItem(item: PublishReadinessItem): void {
    if (item.jumpTo === "controls") {
      setActiveControlStep(controlStepForReadinessCategory(item.category));
    }
    setStage(item.jumpTo);
    window.setTimeout(() => {
      window.scrollTo({ behavior: "smooth", top: 0 });
    }, 0);
  }

  function openPublishAdvice(advice: PublishAssistantAdvice): void {
    if (advice.item && !advice.targetControlStep) {
      openReadinessItem(advice.item);
      return;
    }
    if (advice.targetControlStep) {
      setActiveControlStep(advice.targetControlStep);
    }
    setStage(advice.item?.jumpTo ?? advice.jumpTo ?? "review");
    window.setTimeout(() => {
      window.scrollTo({ behavior: "smooth", top: 0 });
    }, 0);
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
    if (!approvalAction.canApprove) {
      setPublishMessage(approvalAction.message);
      setPublishHelpOpen(true);
      return;
    }
    updateControlsDraft({
      approvalDate:
        controlsDraft.approvalDate || new Date().toISOString().slice(0, 10),
      lifecycleStatus: "approved",
    });
  }

  function applyQuickSetup(): void {
    if (!draftForm) {
      setPublishMessage("Add at least one question in the Builder before using Quick setup.");
      return;
    }
    setControlsDraft((current) => {
      return {
        ...current,
        ...quickSetupReviewDefaults(current, draftForm.fields),
      };
    });
    setStage("preview");
    setPublishMessage(
      "Quick setup applied recommended defaults. Complete Preview & Test, then submit the form for review.",
    );
    window.setTimeout(() => {
      window.scrollTo({ behavior: "smooth", top: 0 });
    }, 0);
  }

  useEffect(() => {
    if (preview || !tenantProjects.length || !initialForm) return;
    if (initialForm.project_id && tenantProjects.some((project) => project.id === initialForm.project_id)) return;
    if (tenantProjects.some((project) => project.name === setup.projectName)) return;
    setSetup((current) => ({
      ...current,
      projectId: initialForm.project_id ?? "",
      projectName: initialForm.project_name ?? "",
    }));
  }, [initialForm, preview, setup.projectName, tenantProjects]);

  useEffect(() => {
    setControlsDraft(controlsDraftFromApiControls(initialForm?.controls_json));
    setPublishedForm(null);
  }, [initialForm?.controls_json, initialForm?.id]);

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

  useEffect(() => {
    if (initialForm || initialDuplicateFormId || !pendingTemplateId) return;
    const matchedTemplateId = resolvePendingStarterTemplateId(pendingTemplateId);
    if (!matchedTemplateId) {
      setPendingTemplateId(null);
      return;
    }
    setStartMethod("template");
    setSelectedTemplateId(matchedTemplateId);
    setPendingTemplateId(null);
  }, [initialDuplicateFormId, initialForm, pendingTemplateId, setPendingTemplateId]);

  useEffect(() => {
    if (startMethod !== "template") return;
    const nextTemplateId = resolveStarterTemplateForSector(
      selectedTemplateId,
      sectorTerminology.sectorId,
    );
    if (!nextTemplateId || nextTemplateId === selectedTemplateId) return;
    setSelectedTemplateId(nextTemplateId);
  }, [
    sectorTerminology.sectorId,
    selectedTemplateId,
    startMethod,
  ]);

  async function handleImportFileSelected(file: File | null): Promise<void> {
    setImportFile(file);
    setImportMessage("");
    setImportPreview(null);
    if (!file) return;
    setImportBusy(true);
    try {
      const rows = await readSpreadsheetRows(file);
      const headers = (rows[0] ?? []).map((header) => header.trim()).filter(Boolean);
      if (!headers.length) {
        setImportMessage("The spreadsheet must have question names in the first row.");
      } else {
        setImportPreview(headers);
        setImportMessage(`Detected ${headers.length} question(s) from the first row.`);
      }
    } catch (error) {
      setImportMessage(error instanceof Error ? error.message : "The spreadsheet could not be read.");
    }
    setImportBusy(false);
  }

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

  // Persist the current draft to the organization workspace (create on first
  // call, update afterwards). Shared by manual "Save draft" and auto-save.
  // Caller guarantees token, non-preview, and a selected project.
  async function persistDraftToBackend(
    formToPersist: DynamicForm | null = draftForm,
  ): Promise<{ ok: boolean; error?: string }> {
    if (!formToPersist || !token || preview || !selectedProjectId) {
      return { ok: false, error: "Sign in and select a project first." };
    }
    try {
      const schema = toMobileSchema(applyProfileMappingsToForm(formToPersist, controlsDraft)) as Record<string, unknown>;
      const backendDraftName = backendDraftNameForSave(
        formToPersist.name,
        initialForm,
        savedBackendFormId,
      );
      const surveyContext = surveyContextPayloadForForm(setup, "draft");
      let saved;
      if (savedBackendFormId) {
        // Update path: no survey is created, so repeated auto-saves never spawn
        // orphan surveys.
        saved = await updateForm(token, savedBackendFormId, {
          description:
            setup.description || formToPersist.sections[0]?.description || null,
          form_type: apiFormTypeValue(setup.formType),
          name: backendDraftName,
          publish: false,
          schema,
        });
      } else {
        const survey =
          selectedSurvey ??
          (await createSurvey(token, {
            code: `FORM-${Date.now().toString(36).toUpperCase()}`,
            description: surveyContext.description,
            geographic_scope: selectedProject?.region ?? null,
            project_id: selectedProjectId,
            status: "active",
            survey_type: surveyContext.survey_type,
            target_population: surveyContext.target_population,
            title: surveyContext.title,
            custom_type_label: surveyContext.custom_type_label,
          }));
        saved = await createForm(token, {
          description:
            setup.description || formToPersist.sections[0]?.description || null,
          form_type: apiFormTypeValue(setup.formType),
          name: backendDraftName,
          project_id: selectedProjectId,
          publish: false,
          schema,
          slug: `${slugFromText(backendDraftName, "form")}-${Date.now().toString(36)}`,
          survey_id: survey.id,
        });
      }
      const savedDraft: DynamicForm = {
        ...formToPersist,
        activeVersion: saved.status === "published" ? saved.current_version : 0,
        id: saved.id,
        status: "draft",
        updatedAt: new Date().toISOString(),
        version: saved.current_version,
      };
      setSavedBackendFormId(saved.id);
      setDraftForm(savedDraft);
      await updateFormControls(
        token,
        saved.id,
        controlsDraftToApiControls(controlsDraft, savedDraft, setup.formType),
      );
      upsertLocalForm(workspaceFormFromDraft(savedDraft, setup, selectedProjectId));
      return { ok: true };
    } catch (error) {
      return { ok: false, error: messageFromUnknownError(error) };
    }
  }

  async function saveDraftLocally(): Promise<void> {
    if (!draftForm) return;
    upsertLocalForm(workspaceFormFromDraft(draftForm, setup, selectedProjectId));
    if (!token || preview || !selectedProjectId) {
      setPublishMessage(
        projectLinked
          ? "Draft saved in this browser. Sign in and save again to store it for the organization."
          : "Draft saved in this browser. Select an existing project before saving it to the organization workspace.",
      );
      return;
    }
    setDraftSaving(true);
    const result = await persistDraftToBackend();
    if (result.ok) {
      lastPersistedSignatureRef.current = draftSignature;
      setAutoSaveState("saved");
      setLastSavedAt(Date.now());
      setPublishMessage("Draft saved to the organization workspace. You can log out and continue it from Draft Forms.");
    } else {
      setAutoSaveState("error");
      setPublishMessage(
        `Draft saved in this browser, but it was not saved to the organization workspace: ${result.error ?? "Unknown error"}`,
      );
    }
    setDraftSaving(false);
  }

  // Content signature for auto-save: excludes volatile fields (id, version,
  // updatedAt, history) so saving — which stamps those — never re-triggers.
  const draftSignature = useMemo(
    () =>
      draftForm
        ? JSON.stringify({
            name: draftForm.name,
            pages: draftForm.pages,
            sections: draftForm.sections,
            fields: draftForm.fields,
            controls: controlsDraft,
          })
        : "",
    [draftForm, controlsDraft],
  );

  const autoSaveEnabled = Boolean(
    stage === "builder" && draftForm && token && !preview && selectedProjectId,
  );

  useEffect(() => {
    if (!autoSaveEnabled || !draftForm) return;
    if (draftSaving || publishing || autoSaveInFlightRef.current) return;
    if (lastPersistedSignatureRef.current === draftSignature) return;
    // Seed the baseline for an already-saved form opened for editing, so we
    // don't re-save an unchanged form on open. A brand-new draft (no backend id)
    // is auto-saved immediately so reaching the builder secures the work.
    if (lastPersistedSignatureRef.current === null && (savedBackendFormId || initialForm)) {
      lastPersistedSignatureRef.current = draftSignature;
      return;
    }
    const timer = window.setTimeout(async () => {
      autoSaveInFlightRef.current = true;
      setAutoSaveState("saving");
      try {
        const result = await persistDraftToBackend();
        if (result.ok) {
          lastPersistedSignatureRef.current = draftSignature;
          setAutoSaveState("saved");
          setLastSavedAt(Date.now());
        } else {
          setAutoSaveState("error");
        }
      } catch {
        setAutoSaveState("error");
      } finally {
        autoSaveInFlightRef.current = false;
      }
    }, 1500);
    return () => window.clearTimeout(timer);
    // persistDraftToBackend is a stable closure over current state; signature drives saves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSaveEnabled, draftSignature, draftSaving, publishing, savedBackendFormId, initialForm]);

  async function saveControlsDraft(): Promise<void> {
    if (!draftForm) return;
    const nextForm: DynamicForm = {
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
      updatedAt: new Date().toISOString(),
    };
    handleBuilderFormChange(nextForm);
    if (token && !preview && selectedProjectId) {
      setControlsSaving(true);
      const result = await persistDraftToBackend(nextForm);
      if (result.ok) {
        setAutoSaveState("saved");
        setLastSavedAt(Date.now());
        setPublishMessage("Controls saved to the form. Continue to preview when ready.");
      } else {
        setAutoSaveState("error");
        setPublishMessage(
          `Controls saved in this browser, but not to the organization workspace: ${result.error ?? "Unknown error"}`,
        );
      }
      setControlsSaving(false);
      return;
    }
    setPublishMessage("Controls saved for this draft. Continue to preview when ready.");
  }

  async function assignPublishedFormToSelectedOfficers(
    formId: string,
    projectId: string,
  ): Promise<{ deliveredOfficerCount: number; deliveryErrors: string[] }> {
    const selectedOfficerIds =
      controlsDraft.assignmentMode === "assigned_only"
        ? controlsDraft.assignedFieldOfficerIds
        : [];
    if (!token || preview || !selectedOfficerIds.length) {
      return { deliveredOfficerCount: 0, deliveryErrors: [] };
    }

    const deliveryErrors: string[] = [];
    let deliveredOfficerCount = 0;
    for (const officerId of selectedOfficerIds) {
      const officer = fieldOfficerOptions.find((option) => option.id === officerId);
      try {
        await createFieldOfficerAssignment(token, {
          form_id: formId,
          is_active: true,
          officer_id: officerId,
          project_id: projectId,
          region: selectedProject?.region ?? null,
        });
        deliveredOfficerCount += 1;
      } catch (error) {
        deliveryErrors.push(
          `${officer?.full_name ?? "Selected field officer"}: ${messageFromUnknownError(error)}`,
        );
      }
    }
    return { deliveredOfficerCount, deliveryErrors };
  }

  async function publishDraft(): Promise<void> {
    if (!draftForm) return;
    if (!projectLinked || !selectedProjectId) {
      setPublishMessage("Select an existing project before publishing. Drafts can be saved without a project, but published forms must be project-linked.");
      setStage("setup");
      return;
    }
    if (criticalFailures.length) {
      setPublishMessage("Resolve the hard publish blockers first: project, form name, at least one question, and valid variable names.");
      return;
    }
    if (readinessBelowPublishThreshold) {
      setPublishMessage(`Complete at least ${MINIMUM_PUBLISH_READINESS_SCORE}% readiness before publishing. Optional governance and advanced controls can be finished later.`);
      return;
    }
    if (token && !preview) {
      setPublishing(true);
      setPublishMessage("");
      try {
        const surveyContext = surveyContextPayloadForForm(setup, "publish");
        const survey =
          selectedSurvey ??
          (await createSurvey(token, {
            code: `FORM-${Date.now().toString(36).toUpperCase()}`,
            description: surveyContext.description,
            geographic_scope: selectedProject?.region ?? null,
            project_id: selectedProjectId,
            status: "active",
            survey_type: surveyContext.survey_type,
            target_population: surveyContext.target_population,
            title: surveyContext.title,
            custom_type_label: surveyContext.custom_type_label,
          }));
        const schema = toMobileSchema(applyProfileMappingsToForm(draftForm, controlsDraft)) as Record<string, unknown>;
        const targetFormId = backendFormTargetIdForSave(initialForm, savedBackendFormId);
        const saved = targetFormId
          ? await updateForm(token, targetFormId, {
              description:
                setup.description || draftForm.sections[0]?.description || null,
              form_type: apiFormTypeValue(setup.formType),
              name: draftForm.name,
              publish: true,
              schema,
            })
          : await createForm(token, {
              description:
                setup.description || draftForm.sections[0]?.description || null,
              form_type: apiFormTypeValue(setup.formType),
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
        setSavedBackendFormId(saved.id);
        await updateFormControls(
          token,
          saved.id,
          controlsDraftToApiControls(controlsDraft, nextPublishedForm, setup.formType),
        );
        const assignmentDelivery = await assignPublishedFormToSelectedOfficers(
          saved.id,
          selectedProjectId,
        );
        setPublishedForm(nextPublishedForm);
        setDraftForm(nextPublishedForm);
        upsertLocalForm(workspaceFormFromDraft(nextPublishedForm, setup, selectedProjectId));
        setPublishSuccessSummary({
          deliveredOfficerCount: assignmentDelivery.deliveredOfficerCount,
          deliveryErrors: assignmentDelivery.deliveryErrors,
          formName: saved.name,
          projectName: selectedProject?.name ?? "the selected project",
          selectedOfficerCount:
            controlsDraft.assignmentMode === "assigned_only"
              ? controlsDraft.assignedFieldOfficerIds.length
              : 0,
          selectedTeamCount:
            controlsDraft.assignmentMode === "assigned_only"
              ? controlsDraft.assignedTeamIds.length
              : 0,
          version: saved.current_version,
        });
        setPublishSuccessOpen(true);
        setPublishMessage(
          assignmentDelivery.deliveryErrors.length
            ? `${saved.name} was published, but ${assignmentDelivery.deliveryErrors.length} field officer assignment needs attention.`
            : controlsDraft.assignmentMode === "assigned_only"
              ? `${saved.name} was published and sent to ${assignmentDelivery.deliveredOfficerCount} selected field officer${assignmentDelivery.deliveredOfficerCount === 1 ? "" : "s"}${controlsDraft.assignedTeamIds.length ? `. ${controlsDraft.assignedTeamIds.length} selected team${controlsDraft.assignedTeamIds.length === 1 ? "" : "s"} will receive access through project/team sync rules.` : ""}`
              : `${saved.name} was published under ${selectedProject?.name ?? "the selected project"}.`,
        );
        setStage("review");
      } catch (error) {
        setPublishMessage(messageFromUnknownError(error));
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
    setPublishSuccessSummary({
      deliveredOfficerCount:
        controlsDraft.assignmentMode === "assigned_only"
          ? controlsDraft.assignedFieldOfficerIds.length
          : 0,
      deliveryErrors: [],
      formName: nextPublishedForm.name,
      projectName: selectedProject?.name ?? "the selected project",
      selectedOfficerCount:
        controlsDraft.assignmentMode === "assigned_only"
          ? controlsDraft.assignedFieldOfficerIds.length
          : 0,
      selectedTeamCount:
        controlsDraft.assignmentMode === "assigned_only"
          ? controlsDraft.assignedTeamIds.length
          : 0,
      version: nextPublishedForm.activeVersion,
    });
    setPublishSuccessOpen(true);
    setPublishMessage(
      `${nextPublishedForm.name} was published locally for preview. Connect to the backend to make it available for live field assignments.`,
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
  const editingPublishedForm = initialForm?.status === "published" && !publishedForm;
  const workspaceTitle = initialForm
    ? editingPublishedForm
      ? "Create New Version"
      : "Edit Form"
    : "Create Form";

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
                <span className="text-sm font-semibold">{workspaceTitle}</span>
              ) : null}
              <Badge tone={statusTone(status)}>{status}</Badge>
              {editingPublishedForm ? (
                <Badge tone="info">Live v{initialForm.version} protected</Badge>
              ) : null}
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
                {workspaceTitle}
              </h1>
              {!compactBuilderMode ? (
                <HelpHint label="About this workflow" title={workspaceTitle}>
                  {editingPublishedForm
                    ? "You are editing the next draft version. The current published version stays available to field officers until you publish this revision."
                    : "Create the draft shell first, then build questions, configure controls, test the form, review readiness, and publish a governed version for field operations."}
                </HelpHint>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {autoSaveEnabled ? (
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
                  autoSaveState === "error"
                    ? "border-danger/30 bg-danger/10 text-danger"
                    : autoSaveState === "saving"
                      ? "border-border bg-muted text-muted-foreground"
                      : "border-success/30 bg-success/10 text-success",
                )}
                title="Drafts auto-save to your organization workspace as you edit."
              >
                {autoSaveState === "saving" ? (
                  <>
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" aria-hidden="true" />
                    Saving…
                  </>
                ) : autoSaveState === "error" ? (
                  <>Auto-save failed — use Save draft</>
                ) : autoSaveState === "saved" || savedBackendFormId ? (
                  <>
                    <CheckCircle2 aria-hidden="true" size={13} />
                    Draft saved{lastSavedAt ? ` · ${formatClockTime(lastSavedAt)}` : ""}
                  </>
                ) : (
                  <>Auto-save on</>
                )}
              </span>
            ) : null}
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
                  disabled={draftSaving}
                  onClick={() => void saveDraftLocally()}
                  size="sm"
                  variant="secondary"
                >
                  {draftSaving ? "Saving draft" : "Save draft"}
                </Button>
                <Button
                  onClick={() => setStage("setup")}
                  size="sm"
                  variant="ghost"
                >
                  Setup
                </Button>
                <Button onClick={applyQuickSetup} size="sm" variant="secondary">
                  Quick setup
                </Button>
                <Button
                  onClick={() => setStage("controls")}
                  size="sm"
                  variant="primary"
                >
                  Next: Configure Controls
                </Button>
                <Button
                  onClick={() => setStage("preview")}
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
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold">Form lifecycle</h2>
              <Badge tone={publishedForm ? "success" : readinessTone}>
                {publishedForm
                  ? "Published"
                  : controlsDraft.lifecycleStatus === "approved"
                    ? "Approved"
                    : readinessLabel}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {completedLifecycleCount} of {lifecycleSteps.length} steps complete ({lifecycleProgressPercent}%)
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{nextActionHint}</p>
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
              <>
                <Button onClick={applyQuickSetup} size="sm" variant="secondary">
                  Quick setup &amp; test
                </Button>
                <Button onClick={() => setStage("controls")} size="sm" variant="primary">
                  Next: Configure Controls
                </Button>
              </>
            ) : null}
            {stage === "controls" ? (
              <Button
                onClick={() => {
                  if (activeControlStepIndex + 1 < controlSteps.length) {
                    setActiveControlStep(
                      controlSteps[activeControlStepIndex + 1]?.id ?? "advanced",
                    );
                    return;
                  }
                  setStage("preview");
                }}
                size="sm"
                variant="primary"
              >
                {activeControlStepIndex + 1 < controlSteps.length
                  ? "Next controls"
                  : "Next: Preview & Test"}
              </Button>
            ) : null}
            {stage === "preview" ? (
              <Button
                onClick={() => {
                  updateControlsDraft(previewTestReviewDefaults(controlsDraft));
                  setStage("review");
                }}
                size="sm"
                variant="primary"
              >
                Submit for Review
              </Button>
            ) : null}
            {stage === "review" ? (
              <>
                {controlsDraft.lifecycleStatus !== "approved" ? (
                  <Button
                    disabled={!approvalAction.canApprove}
                    onClick={approveForPublish}
                    size="sm"
                    variant="secondary"
                  >
                    {approvalAction.label}
                  </Button>
                ) : null}
                <Button
                  disabled={publishDisabled}
                  onClick={publishDraft}
                  size="sm"
                  variant="primary"
                >
                  <Rocket aria-hidden="true" />
                  {publishing ? "Publishing" : "Publish Form"}
                </Button>
                {publishDisabled && !publishing ? (
                  <Button
                    onClick={() => setPublishHelpOpen(true)}
                    size="sm"
                    variant="secondary"
                  >
                    Why can&apos;t I publish?
                  </Button>
                ) : null}
              </>
            ) : null}
          </div>
        </div>
        <div className="mt-3">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-1.5 rounded-full bg-primary transition-all"
              style={{ width: `${lifecycleProgressPercent}%` }}
            />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1">
            {lifecycleSteps.map((step, index) => {
              const isActive = step.id === activeLifecycleId;
              const isComplete = lifecycleCompletion[step.id];
              const isFuture = index > activeLifecycleIndex && !isComplete;
              return (
                <span className="flex items-center gap-1" key={step.id}>
                  <button
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition",
                      isActive
                        ? "border-primary bg-primary text-primary-foreground"
                        : isComplete
                          ? "border-success/30 bg-success/10 text-foreground hover:bg-success/15"
                          : "border-transparent bg-background/60 text-muted-foreground hover:bg-muted/60",
                      isFuture && "text-muted-foreground",
                    )}
                    disabled={step.id !== "setup" && !draftForm}
                    onClick={() => openLifecycleStep(step.id)}
                    title={step.helper}
                    type="button"
                  >
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
                  </button>
                  {index < lifecycleSteps.length - 1 ? (
                    <ChevronRight aria-hidden="true" className="shrink-0 text-muted-foreground/30" size={14} />
                  ) : null}
                </span>
              );
            })}
          </div>
        </div>
      </section>

      {editingPublishedForm ? (
        <section className="rounded-lg border border-info/25 bg-info/12 p-3 text-sm text-info">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-semibold">You are editing the next draft version.</p>
              <p className="mt-1 text-xs">
                Field officers continue using v{initialForm.version}. Save Draft keeps this revision unfinished; Publish Form promotes it to v{initialForm.version + 1} and sends the updated form to selected field officers.
              </p>
            </div>
            <Button onClick={() => setStage("review")} size="sm" variant="secondary">
              Review version readiness
            </Button>
          </div>
        </section>
      ) : null}

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
                  onChange={(event) => {
                    const project = availableProjectOptions.find(
                      (option) => option.id === event.target.value,
                    );
                    updateSetup({
                      projectId: project?.id ?? "",
                      projectName: project?.name ?? "",
                    });
                  }}
                  value={setup.projectId || setup.projectName}
                >
                  <option value="">Choose project when ready to publish</option>
                  {!availableProjectOptions.length ? (
                    <option value="">Create or select a project first</option>
                  ) : null}
                  {availableProjectOptions.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                      {project.sector_id
                        ? ` · ${getSectorTerminology(project.sector_id).sectorName}`
                        : ""}
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
                  {formTypeOptions.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </Select>
                <span className="mt-1 block text-xs text-muted-foreground">
                  Options adapt to {sectorTerminology.sectorName}; choose Custom for any other workflow.
                </span>
              </label>
              <div className="rounded-lg border bg-background/70 p-3 text-sm md:col-span-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="support">{sectorTerminology.sectorName}</Badge>
                  <Badge tone="neutral">{primaryEntityPluralLabel}</Badge>
                  <Badge tone="neutral">{metricPluralLabel}</Badge>
                </div>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  This form uses the selected project context. Entity tracking, {metricPluralLabel.toLowerCase()},
                  reporting, and approval controls are configurable modules; leave them off when this is a simple
                  checklist, transaction, inspection, inventory, sales, HR, or custom operational form.
                </p>
                {sectorTerminology.optionalModules?.length ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Common modules: {sectorTerminology.optionalModules.join(", ")}.
                  </p>
                ) : null}
              </div>
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
                  Templates are recommended from the selected project sector
                  first. You can still choose another template and edit every
                  question before publishing.
                </HelpHint>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Showing best matches for {sectorTerminology.sectorName}. Change
                the project in Basic Information to get a different sector list.
              </p>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {sectorTemplateOptions.map((template) => {
                  const recommended = template.sectorIds.includes(
                    sectorTerminology.sectorId,
                  );
                  return (
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
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          {recommended ? (
                            <Badge tone="success">Recommended</Badge>
                          ) : null}
                          <Badge tone="neutral">
                            {template.fields.length} fields
                          </Badge>
                        </div>
                      </div>
                      <p className="mt-2 text-[11px] text-muted-foreground">
                        {template.formType}
                      </p>
                    </button>
                  );
                })}
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
                  onChange={(event) => void handleImportFileSelected(event.target.files?.[0] ?? null)}
                  ref={importFileRef}
                  type="file"
                />
                <Button
                  onClick={() => importFileRef.current?.click()}
                  type="button"
                  variant="secondary"
                >
                  <UploadCloud aria-hidden="true" />
                  {importFile ? "Choose another file" : "Choose file"}
                </Button>
              </div>
              {importMessage ? (
                <div className="mt-3 rounded-lg border bg-panel px-3 py-2 text-sm text-muted-foreground">
                  {importMessage}
                </div>
              ) : null}
              {importPreview?.length ? (
                <div className="mt-3 rounded-lg border bg-panel p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Questions detected from the first row
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {importPreview.slice(0, 24).map((header, index) => (
                      <span
                        className="rounded-full border bg-background px-2.5 py-1 text-xs font-medium"
                        key={`${header}-${index}`}
                      >
                        {header}
                      </span>
                    ))}
                    {importPreview.length > 24 ? (
                      <span className="rounded-full border bg-background px-2.5 py-1 text-xs text-muted-foreground">
                        +{importPreview.length - 24} more
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Continue to the builder to edit labels, types, options, and required status.
                  </p>
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
                (startMethod === "template" && !selectedTemplateId) ||
                (startMethod === "import" && !importFile)
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

      {stage === "controls" ? (
        <section className="space-y-3">
          <StagePanel
            action={
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={controlsSaving}
                  onClick={() => void saveControlsDraft()}
                  variant="secondary"
                >
                  {controlsSaving ? "Saving controls" : "Save controls"}
                </Button>
                <Button
                  onClick={() => {
                    if (activeControlStepIndex + 1 < controlSteps.length) {
                      setActiveControlStep(
                        controlSteps[activeControlStepIndex + 1]?.id ?? "advanced",
                      );
                      return;
                    }
                    setStage("preview");
                  }}
                  variant="primary"
                >
                  {activeControlStepIndex + 1 < controlSteps.length
                    ? "Next controls"
                    : "Next: Preview & Test"}
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
                linkage, the selected sector or custom context, access rules,
                review workflow, permissions, version notes, and audit-safe
                governance settings. Entity, metric, and reporting controls are
                required only when this project uses those modules.
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
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground">
                  Sector-aware form checks
                </p>
                <h3 className="mt-1 text-base font-semibold">
                  Practical form problems the platform can help solve
                </h3>
                <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                  These checks look for missing standard questions, {primaryEntityLabel.toLowerCase()} mapping opportunities,
                  weak wording, and mobile-readiness risks before the form reaches collectors.
                </p>
              </div>
              <Badge tone={missingMneQuestions.length || suggestedProfileMappingCount || wordingRiskFields.length ? "warning" : "success"}>
                {missingMneQuestions.length + suggestedProfileMappingCount + wordingRiskFields.length} item(s)
              </Badge>
            </div>
            <div className="mt-3 grid gap-2 lg:grid-cols-4">
              <div className="rounded-lg border bg-background/70 p-3">
                <p className="text-sm font-semibold">Standard questions</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {missingMneQuestions.length
                    ? `${missingMneQuestions.length} recommended question(s) are missing for ${setup.formType}.`
                    : "Core questions match this form type."}
                </p>
                {missingMneQuestions.length ? (
                  <Button
                    className="mt-3"
                    onClick={() => applyPublishQuickFix("add_standard_questions")}
                    size="sm"
                    variant="secondary"
                  >
                    Add missing questions
                  </Button>
                ) : null}
              </div>
              <div className="rounded-lg border bg-background/70 p-3">
                <p className="text-sm font-semibold">Profile mapping</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {suggestedProfileMappingCount
                    ? `${suggestedProfileMappingCount} entity mapping suggestion(s) can be applied.`
                    : "No obvious unmapped profile fields detected."}
                </p>
                {suggestedProfileMappingCount ? (
                  <Button
                    className="mt-3"
                    onClick={() => applyPublishQuickFix("apply_profile_mapping")}
                    size="sm"
                    variant="secondary"
                  >
                    Apply mappings
                  </Button>
                ) : null}
              </div>
              <div className="rounded-lg border bg-background/70 p-3">
                <p className="text-sm font-semibold">Question wording</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {wordingRiskFields.length
                    ? `${wordingRiskFields.length} question label(s) need human wording review.`
                    : "No wording risks detected."}
                </p>
                {wordingRiskFields.length ? (
                  <Button
                    className="mt-3"
                    onClick={() => setStage("builder")}
                    size="sm"
                    variant="secondary"
                  >
                    Review wording
                  </Button>
                ) : null}
              </div>
              <div className="rounded-lg border bg-background/70 p-3">
                <p className="text-sm font-semibold">Mobile reliability</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Use low-bandwidth settings for large forms, media-heavy forms, or weak connectivity.
                </p>
                <Button
                  className="mt-3"
                  onClick={() => applyPublishQuickFix("mobile_readiness_defaults")}
                  size="sm"
                  variant="secondary"
                >
                  Apply mobile defaults
                </Button>
              </div>
            </div>
          </section>
          <section className="rounded-xl border bg-panel p-3.5 shadow-line">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground">
                  Control setup progress
                </p>
                <h3 className="mt-1 text-base font-semibold">
                  {activeControlStepConfig.label}
                </h3>
                <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                  {activeControlStepConfig.mustDo}
                </p>
              </div>
              <Badge tone="neutral">
                Step {activeControlStepIndex + 1} of {controlSteps.length}
              </Badge>
            </div>
            <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
              {controlSteps.map((step, index) => {
                const stepReadiness = controlStepReadiness[step.id];
                const tone =
                  stepReadiness.failures > 0
                    ? "danger"
                    : stepReadiness.warnings > 0
                      ? "warning"
                      : stepReadiness.items > 0
                        ? "success"
                        : "neutral";
                return (
                  <button
                    aria-current={activeControlStep === step.id ? "step" : undefined}
                    className={cn(
                      "rounded-lg border bg-background px-3 py-2 text-left transition hover:border-primary/40 hover:bg-primary/5",
                      activeControlStep === step.id &&
                        "border-primary/50 bg-primary/10 shadow-line",
                    )}
                    key={step.id}
                    onClick={() => setActiveControlStep(step.id)}
                    type="button"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold">{step.label}</span>
                      <Badge tone={tone}>
                        {stepReadiness.failures > 0
                          ? `${stepReadiness.failures} fix`
                          : stepReadiness.warnings > 0
                            ? `${stepReadiness.warnings} warn`
                            : stepReadiness.items > 0
                              ? "OK"
                              : "Later"}
                      </Badge>
                    </div>
                    <p
                      className={cn(
                        "mt-1 text-[10px] font-semibold uppercase tracking-wide",
                        stepReadiness.required ? "text-danger/70" : "text-muted-foreground/60",
                      )}
                    >
                      {stepReadiness.required ? "Required for publish" : "Optional"}
                    </p>
                    <p className="mt-1 min-h-[2.5rem] text-xs text-muted-foreground">
                      {step.helper}
                    </p>
                    <div className="mt-2 h-1 rounded-full bg-muted">
                      <div
                        className={cn(
                          "h-1 rounded-full",
                          tone === "danger"
                            ? "bg-danger"
                            : tone === "warning"
                              ? "bg-warning"
                              : tone === "success"
                                ? "bg-success"
                                : "bg-muted-foreground/40",
                        )}
                        style={{
                          width: `${
                            stepReadiness.items
                              ? Math.max(
                                  16,
                                  Math.round(
                                    (stepReadiness.passed / stepReadiness.items) * 100,
                                  ),
                                )
                              : index < activeControlStepIndex
                                ? 100
                                : 16
                          }%`,
                        }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="mt-3 rounded-lg border bg-background/70 p-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                What to decide now
              </p>
              <div className="mt-2 grid gap-2 md:grid-cols-3">
                {activeControlStepConfig.decisions.map((decision) => (
                  <div
                    className="rounded-md border bg-panel px-3 py-2 text-xs text-muted-foreground"
                    key={decision}
                  >
                    {decision}
                  </div>
                ))}
              </div>
            </div>
          </section>
          <section className="rounded-xl border bg-panel p-3.5 shadow-line">
            <div className="flex items-center gap-2">
              <Sparkles aria-hidden="true" className="text-primary" size={18} />
              <h3 className="font-semibold">Operational Form Management</h3>
              <HelpHint
                label="About operational form management"
                title="Operational Form Management"
              >
                These controls turn a form into a managed operational data
                collection tool with purpose, {metricPluralLabel.toLowerCase()},
                data dictionary, tracking series, sampling, translations, and
                trigger rules when those modules apply.
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
                    Testing and approval are recommended governance steps.
                    Publishing is allowed once the minimum readiness rule passes.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    disabled={lifecycleActions.testingDisabled}
                    onClick={() => {
                      updateControlsDraft({
                        lifecycleStatus: "testing",
                        reviewComments:
                          controlsDraft.reviewComments ||
                          "Moved to testing for preview, logic, validation, and reference data checks.",
                      });
                      setStage("preview");
                    }}
                    size="sm"
                    type="button"
                    variant="secondary"
                  >
                    {lifecycleActions.testingLabel}
                  </Button>
                  <Button
                    disabled={lifecycleActions.reviewDisabled}
                    onClick={() =>
                      updateControlsDraft({
                        lifecycleStatus: "review",
                        reviewComments:
                          controlsDraft.reviewComments ||
                          "Submitted for technical and sector review.",
                      })
                    }
                    size="sm"
                    type="button"
                    variant="secondary"
                  >
                    {lifecycleActions.reviewLabel}
                  </Button>
                  <Button
                    disabled={!approvalAction.canApprove}
                    onClick={approveForPublish}
                    size="sm"
                    type="button"
                    variant="primary"
                  >
                    {approvalAction.label}
                  </Button>
                  {!approvalAction.canApprove ? (
                    <Button
                      onClick={() => setPublishHelpOpen(true)}
                      size="sm"
                      type="button"
                      variant="secondary"
                    >
                      Why can&apos;t I approve?
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="mt-3 grid gap-3 xl:grid-cols-2">
              <details
                className={cn(
                  "rounded-lg border bg-background/70 p-3",
                  activeControlStep !== "essentials" && "hidden",
                )}
                open
              >
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
                  <label className="text-sm font-medium">
                    Decision use
                    <Select
                      className="mt-2"
                      onChange={(event) =>
                        updateControlsDraft({
                          decisionUse:
                            event.target.value as FormControlsDraft["decisionUse"],
                        })
                      }
                      value={controlsDraft.decisionUse}
                    >
                      <option value="operational_decision">Operational decision</option>
                      <option value="indicator_reporting">{metricLabel} reporting</option>
                      <option value="donor_reporting">External / funder reporting</option>
                      <option value="case_management">Case management</option>
                      <option value="research_learning">Research / learning</option>
                    </Select>
                  </label>
                  <label className="text-sm font-medium">
                    Reporting period
                    <Select
                      className="mt-2"
                      onChange={(event) =>
                        updateControlsDraft({
                          reportingPeriod:
                            event.target.value as FormControlsDraft["reportingPeriod"],
                        })
                      }
                      value={controlsDraft.reportingPeriod}
                    >
                      <option value="none">Not used for reporting</option>
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="seasonal">Seasonal</option>
                      <option value="annual">Annual</option>
                      <option value="donor_schedule">External reporting schedule</option>
                    </Select>
                  </label>
                </div>
              </details>

              <details
                className={cn(
                  "rounded-lg border bg-background/70 p-3",
                  activeControlStep !== "questions" && "hidden",
                )}
                open
              >
                <summary className="cursor-pointer text-sm font-semibold">
                  Question standards and data dictionary
                </summary>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="text-sm font-medium">
                    Linked {metricLabel.toLowerCase()}
                    <Input
                      className="mt-2"
                      onChange={(event) =>
                        updateControlsDraft({ indicatorLink: event.target.value })
                      }
                      placeholder={`Example: ${metricLabel} name, KPI, indicator, or report field`}
                      value={controlsDraft.indicatorLink}
                    />
                  </label>
                  <label className="text-sm font-medium">
                    {metricLabel} component
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
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input
                      checked={controlsDraft.disaggregationRequired}
                      onChange={(event) =>
                        updateControlsDraft({
                          disaggregationRequired: event.target.checked,
                        })
                      }
                      type="checkbox"
                    />
                    Require breakdown / disaggregation review
                  </label>
                  <label className="text-sm font-medium">
                    Breakdown fields
                    <Input
                      className="mt-2"
                      onChange={(event) =>
                        updateControlsDraft({
                          disaggregationFields: event.target.value
                            .split(",")
                            .map((value) => value.trim())
                            .filter(Boolean),
                        })
                      }
                      placeholder="location, category, status, store, product_type, sex, age_group"
                      value={controlsDraft.disaggregationFields.join(", ")}
                    />
                  </label>
                  <label className="text-sm font-medium">
                    Don&apos;t know / refused policy
                    <Select
                      className="mt-2"
                      onChange={(event) =>
                        updateControlsDraft({
                          dontKnowPolicy:
                            event.target.value as FormControlsDraft["dontKnowPolicy"],
                        })
                      }
                      value={controlsDraft.dontKnowPolicy}
                    >
                      <option value="optional">Optional per question</option>
                      <option value="required_for_sensitive">
                        Required for sensitive or entity-identifying questions
                      </option>
                      <option value="disabled">Do not add exception answers</option>
                    </Select>
                  </label>
                  <label className="text-sm font-medium">
                    Excel/import template mode
                    <Select
                      className="mt-2"
                      onChange={(event) =>
                        updateControlsDraft({
                          importTemplateMode:
                            event.target.value as FormControlsDraft["importTemplateMode"],
                        })
                      }
                      value={controlsDraft.importTemplateMode}
                    >
                      <option value="none">No import template</option>
                      <option value="form_dictionary">
                        Generate from this form dictionary
                      </option>
                      <option value="legacy_mapping">
                        Allow legacy-column mapping
                      </option>
                    </Select>
                  </label>
                </div>
              </details>

              <details
                className={cn(
                  "rounded-lg border bg-background/70 p-3",
                  activeControlStep !== "advanced" && "hidden",
                )}
                open={activeControlStep === "advanced"}
              >
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
                      <option value="none">Entity or record form</option>
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

              <details
                className={cn(
                  "rounded-lg border bg-background/70 p-3",
                  activeControlStep !== "advanced" && "hidden",
                )}
                open={activeControlStep === "advanced"}
              >
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

              <details
                className={cn(
                  "rounded-lg border bg-background/70 p-3 xl:col-span-2",
                  activeControlStep !== "advanced" && "hidden",
                )}
                open={activeControlStep === "advanced"}
              >
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
                    Sector/business reviewer
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
                    Approval notes required before approval
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
                  <label className="text-sm font-medium">
                    Partner/sub-grantee sharing rule
                    <Textarea
                      className="mt-2"
                      onChange={(event) =>
                        updateControlsDraft({
                          partnerDataSharingRule: event.target.value,
                        })
                      }
                      value={controlsDraft.partnerDataSharingRule}
                    />
                  </label>
                  <label className="text-sm font-medium">
                    Case or safeguarding escalation rule
                    <Textarea
                      className="mt-2"
                      onChange={(event) =>
                        updateControlsDraft({
                          caseEscalationRule: event.target.value,
                        })
                      }
                      value={controlsDraft.caseEscalationRule}
                    />
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
            <section
              className={cn(
                "rounded-xl border bg-panel p-3.5 shadow-line",
                activeControlStep !== "access" && "hidden",
              )}
            >
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
                        assignedFieldOfficerIds:
                          event.target.value === "assigned_only"
                            ? controlsDraft.assignedFieldOfficerIds
                            : [],
                        assignedTeamIds:
                          event.target.value === "assigned_only"
                            ? controlsDraft.assignedTeamIds
                            : [],
                      })
                    }
                    value={controlsDraft.assignmentMode}
                  >
                    <option value="assigned_only">Assigned users only</option>
                    <option value="project_team">Project team can collect</option>
                    <option value="open_link">Open link for controlled web entry</option>
                  </Select>
                </label>
                {controlsDraft.assignmentMode === "assigned_only" ? (
                  <div className="sm:col-span-2 rounded-lg border bg-background p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold">
                          Field officers who can see this form
                        </p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                          Only selected field officers will be prepared to
                          collect this form through field assignments and
                          mobile sync.
                        </p>
                      </div>
                      <Badge tone={controlsDraft.assignedFieldOfficerIds.length ? "success" : "warning"}>
                        {controlsDraft.assignedFieldOfficerIds.length} selected
                      </Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        disabled={!fieldOfficerOptions.length}
                        onClick={selectAllFieldOfficers}
                        size="sm"
                        type="button"
                        variant="secondary"
                      >
                        Select all
                      </Button>
                      <Button
                        disabled={!controlsDraft.assignedFieldOfficerIds.length}
                        onClick={clearAssignedFieldOfficers}
                        size="sm"
                        type="button"
                        variant="ghost"
                      >
                        Clear
                      </Button>
                    </div>
                    <div className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1 product-scrollbar">
                      {fieldOfficersQuery.isLoading && !preview ? (
                        <div className="rounded-md border border-dashed bg-panel/70 p-3 text-sm text-muted-foreground">
                          Loading field officers...
                        </div>
                      ) : fieldOfficerOptions.length ? (
                        fieldOfficerOptions.map((officer) => (
                          <label
                            className="flex cursor-pointer items-start gap-3 rounded-md border bg-panel px-3 py-2 transition hover:border-primary/40 hover:bg-primary/5"
                            key={officer.id}
                          >
                            <input
                              checked={controlsDraft.assignedFieldOfficerIds.includes(officer.id)}
                              className="mt-1 h-4 w-4"
                              onChange={() => toggleAssignedFieldOfficer(officer.id)}
                              type="checkbox"
                            />
                            <span className="min-w-0">
                              <span className="block text-sm font-semibold">
                                {officer.full_name}
                              </span>
                              <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                                {[officer.employee_code, officer.email, officer.home_region]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </span>
                            </span>
                          </label>
                        ))
                      ) : (
                        <div className="rounded-md border border-dashed bg-panel/70 p-3 text-sm text-muted-foreground">
                          No active field officers found. Create field officer
                          users in Users & Teams or Field Operations before
                          assigning this form.
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}
                {controlsDraft.assignmentMode === "assigned_only" ? (
                  <div className="sm:col-span-2 rounded-lg border bg-background p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold">
                          Teams who can collect this form
                        </p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                          Everyone on a selected team will be prepared to
                          collect this form, in addition to any field
                          officers picked above.
                        </p>
                      </div>
                      <Badge tone={controlsDraft.assignedTeamIds.length ? "success" : "warning"}>
                        {controlsDraft.assignedTeamIds.length} selected
                      </Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        disabled={!teamOptions.length}
                        onClick={selectAllTeams}
                        size="sm"
                        type="button"
                        variant="secondary"
                      >
                        Select all
                      </Button>
                      <Button
                        disabled={!controlsDraft.assignedTeamIds.length}
                        onClick={clearAssignedTeams}
                        size="sm"
                        type="button"
                        variant="ghost"
                      >
                        Clear
                      </Button>
                    </div>
                    <div className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1 product-scrollbar">
                      {teamsQuery.isLoading && !preview ? (
                        <div className="rounded-md border border-dashed bg-panel/70 p-3 text-sm text-muted-foreground">
                          Loading teams...
                        </div>
                      ) : teamOptions.length ? (
                        teamOptions.map((team) => (
                          <label
                            className="flex cursor-pointer items-start gap-3 rounded-md border bg-panel px-3 py-2 transition hover:border-primary/40 hover:bg-primary/5"
                            key={team.id}
                          >
                            <input
                              checked={controlsDraft.assignedTeamIds.includes(team.id)}
                              className="mt-1 h-4 w-4"
                              onChange={() => toggleAssignedTeam(team.id)}
                              type="checkbox"
                            />
                            <span className="min-w-0">
                              <span className="block text-sm font-semibold">
                                {team.name}
                              </span>
                              <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                                {[team.code, team.team_type, team.region]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </span>
                            </span>
                          </label>
                        ))
                      ) : (
                        <div className="rounded-md border border-dashed bg-panel/70 p-3 text-sm text-muted-foreground">
                          No active teams found. Create teams in Users & Teams
                          before assigning this form.
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            </section>

            <section
              className={cn(
                "rounded-xl border bg-panel p-3.5 shadow-line",
                activeControlStep !== "access" && "hidden",
              )}
            >
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
                    <option value="me_manager">{sectorTerminology.reportOwnerRole}</option>
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
                    <option value="me_manager">{sectorTerminology.reportOwnerRole}</option>
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
                    <option value="me_manager">{sectorTerminology.reportOwnerRole}</option>
                  </Select>
                </label>
                <label className="text-sm font-medium">
                  Escalate review after hours
                  <Input
                    className="mt-2"
                    min={1}
                    onChange={(event) =>
                      updateControlsDraft({
                        approvalEscalationHours: Number(event.target.value) || 1,
                      })
                    }
                    type="number"
                    value={controlsDraft.approvalEscalationHours}
                  />
                </label>
                <label className="text-sm font-medium">
                  Returned/edit policy
                  <Select
                    className="mt-2"
                    onChange={(event) =>
                      updateControlsDraft({
                        submissionEditPolicy:
                          event.target.value as FormControlsDraft["submissionEditPolicy"],
                      })
                    }
                    value={controlsDraft.submissionEditPolicy}
                  >
                    <option value="before_review">Editable before review</option>
                    <option value="returned_only">Editable only when returned</option>
                    <option value="change_request">Approved data needs change request</option>
                  </Select>
                </label>
              </div>
            </section>

            <section
              className={cn(
                "rounded-xl border bg-panel p-3.5 shadow-line",
                activeControlStep !== "quality" && "hidden",
              )}
            >
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
                <label className="text-sm font-medium">
                  Repeat group handling
                  <Select
                    className="mt-2"
                    onChange={(event) =>
                      updateControlsDraft({
                        repeatGroupPolicy:
                          event.target.value as FormControlsDraft["repeatGroupPolicy"],
                      })
                    }
                    value={controlsDraft.repeatGroupPolicy}
                  >
                    <option value="allowed">Allow repeat groups normally</option>
                    <option value="review_large">Review large repeat groups</option>
                    <option value="restricted">Restrict large or nested repeat groups</option>
                  </Select>
                </label>
                <label className="text-sm font-medium">
                  Maximum submissions per officer/day
                  <Input
                    className="mt-2"
                    min={1}
                    onChange={(event) =>
                      updateControlsDraft({
                        maximumSubmissionsPerDay: Number(event.target.value) || 1,
                      })
                    }
                    type="number"
                    value={controlsDraft.maximumSubmissionsPerDay}
                  />
                </label>
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    checked={controlsDraft.preventFutureDates}
                    onChange={(event) =>
                      updateControlsDraft({
                        preventFutureDates: event.target.checked,
                      })
                    }
                    type="checkbox"
                  />
                  Prevent future dates for date questions
                </label>
                <label className="text-sm font-medium">
                  Invalid age handling
                  <Select
                    className="mt-2"
                    onChange={(event) =>
                      updateControlsDraft({
                        invalidAgeAction:
                          event.target.value as FormControlsDraft["invalidAgeAction"],
                      })
                    }
                    value={controlsDraft.invalidAgeAction}
                  >
                    <option value="warn">Warn collector only</option>
                    <option value="review">Send to reviewer decision</option>
                    <option value="block">Block impossible ages</option>
                  </Select>
                </label>
                <label className="text-sm font-medium">
                  Static GPS handling
                  <Select
                    className="mt-2"
                    onChange={(event) =>
                      updateControlsDraft({
                        staticGpsAction:
                          event.target.value as FormControlsDraft["staticGpsAction"],
                      })
                    }
                    value={controlsDraft.staticGpsAction}
                  >
                    <option value="warn">Warn reviewer</option>
                    <option value="review">Require review</option>
                    <option value="block">Block if repeated GPS is confirmed</option>
                  </Select>
                </label>
                <label className="text-sm font-medium">
                  Device clock drift handling
                  <Select
                    className="mt-2"
                    onChange={(event) =>
                      updateControlsDraft({
                        deviceClockDriftAction:
                          event.target.value as FormControlsDraft["deviceClockDriftAction"],
                      })
                    }
                    value={controlsDraft.deviceClockDriftAction}
                  >
                    <option value="warn">Warn reviewer</option>
                    <option value="review">Require review</option>
                    <option value="block">Block suspicious device time</option>
                  </Select>
                </label>
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    checked={controlsDraft.backCheckRequired}
                    onChange={(event) =>
                      updateControlsDraft({ backCheckRequired: event.target.checked })
                    }
                    type="checkbox"
                  />
                  Require supervisor back-check sample
                </label>
                <label className="text-sm font-medium">
                  Back-check sample %
                  <Input
                    className="mt-2"
                    max={100}
                    min={0}
                    onChange={(event) =>
                      updateControlsDraft({
                        backCheckSamplePercent: Number(event.target.value) || 0,
                      })
                    }
                    type="number"
                    value={controlsDraft.backCheckSamplePercent}
                  />
                </label>
                <label className="flex items-center gap-2 text-sm font-medium sm:col-span-2">
                  <input
                    checked={controlsDraft.enumeratorTrainingRequired}
                    onChange={(event) =>
                      updateControlsDraft({
                        enumeratorTrainingRequired: event.target.checked,
                      })
                    }
                    type="checkbox"
                  />
                  Require field officer training/certification before assignment
                </label>
              </div>
            </section>

            <section
              className={cn(
                "rounded-xl border bg-panel p-3.5 shadow-line",
                activeControlStep !== "beneficiaries" && "hidden",
              )}
            >
              <div className="flex items-center gap-2">
                <Fingerprint aria-hidden="true" className="text-primary" size={18} />
                <h3 className="font-semibold">Entity & Duplicate Controls</h3>
                <HelpHint label="About entity controls" title="Entity & Duplicate Controls">
                  Link submissions to {primaryEntityPluralLabel.toLowerCase()}, products,
                  assets, facilities, customers, employees, sites, or any custom
                  entity so records can be tracked over time when the project needs it.
                </HelpHint>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    checked={controlsDraft.requiresEntity}
                    onChange={(event) => updateRequiresEntity(event.target.checked)}
                    type="checkbox"
                  />
                  Require existing entity record
                </label>
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    checked={controlsDraft.allowAnonymous}
                    onChange={(event) => updateAllowAnonymous(event.target.checked)}
                    type="checkbox"
                  />
                  Allow anonymous submission
                </label>
                <label className="text-sm font-medium">
                  Entity type
                  <Select
                    className="mt-2"
                    onChange={(event) => {
                      const selectedOption = entityTypeOptions.find(
                        (option) => option.value === event.target.value,
                      );
                      updateControlsDraft({
                        entityCategoryId: selectedOption?.categoryId ?? "",
                        entityType: selectedOption?.entityType ?? event.target.value.replace(/^type:/, ""),
                      });
                    }}
                    value={entityTypeSelectValue}
                  >
                    {entityTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                  <span className="mt-1 block text-xs font-normal text-muted-foreground">
                    {selectedEntityCategory
                      ? `Linked to the project category path “${selectedEntityCategoryPath}”.`
                      : selectedProjectId
                        ? "No matching active project category found; add one in Project settings if this should be tracked as an entity."
                        : "Select a project first to use its sector or custom entity categories."}
                  </span>
                </label>
                <div className="rounded-lg border bg-background/70 p-3 text-xs leading-5 text-muted-foreground">
                  <p className="font-semibold text-foreground">Collection behavior</p>
                  <div className="mt-2 space-y-1.5">
                    {entityCollectionSummary.map((line) => (
                      <p key={line}>{line}</p>
                    ))}
                  </div>
                </div>
                <div className="rounded-lg border bg-background/70 p-3 text-xs leading-5 text-muted-foreground">
                  <p className="font-semibold text-foreground">Official entity code</p>
                  <p className="mt-1">
                    Atlas uses the selected project&apos;s entity code format when approved submissions create new records.
                    Set it in Projects → Entity Configuration; keep this form focused on whether it creates, updates, or requires a record.
                  </p>
                  <p className="mt-2">
                    Example for this form: <span className="font-semibold text-foreground">{entityCodeExample(selectedEntityCategory?.name ?? controlsDraft.entityType)}</span>
                  </p>
                </div>
                <div className="rounded-lg border bg-background/70 p-3 text-xs leading-5 text-muted-foreground sm:col-span-2">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold text-foreground">Entity profile questions</p>
                      <p className="mt-1">
                        Add the selected category&apos;s configured fields as editable Builder questions.
                      </p>
                      {selectedEntityCategory ? (
                        <p className="mt-1 text-muted-foreground">
                          {selectedEntityCategory.attributes.length} configured field(s) available from {selectedEntityCategoryPath ?? selectedEntityCategory.name}.
                        </p>
                      ) : null}
                    </div>
                    <Button
                      disabled={!selectedEntityCategory || !selectedEntityCategory.attributes.length}
                      onClick={addEntityCategoryQuestions}
                      type="button"
                      variant="secondary"
                    >
                      Add category fields
                    </Button>
                  </div>
                </div>
                <label className="text-sm font-medium">
                  Respondent identity rule
                  <Select
                    className="mt-2"
                    onChange={(event) =>
                      updateRespondentIdentification(
                        event.target.value as FormControlsDraft["respondentIdentification"],
                      )
                    }
                    value={controlsDraft.respondentIdentification}
                  >
                    <option value="existing_beneficiary">Select existing {primaryEntityLabel.toLowerCase()}</option>
                    <option value="new_registration">Create new registration</option>
                    <option value="existing_or_new">Existing or new {primaryEntityLabel.toLowerCase()}</option>
                    <option value="anonymous_allowed">Anonymous allowed</option>
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
                  {primaryEntityLabel} search
                  <Select
                    className="mt-2"
                    onChange={(event) =>
                      updateBeneficiarySearch(
                        event.target.value as FormControlsDraft["beneficiarySearch"],
                      )
                    }
                    value={controlsDraft.beneficiarySearch}
                  >
                    <option value="required">Required before collection</option>
                    <option value="optional">Optional</option>
                    <option value="disabled">Disabled for new records</option>
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
                <label className="text-sm font-medium">
                  Frequency window
                  <Select
                    className="mt-2"
                    onChange={(event) =>
                      updateControlsDraft({
                        frequencyWindow:
                          event.target.value as FormControlsDraft["frequencyWindow"],
                      })
                    }
                    value={controlsDraft.frequencyWindow}
                  >
                    <option value="none">No fixed window</option>
                    <option value="day">Per day</option>
                    <option value="week">Per week</option>
                    <option value="month">Per month</option>
                    <option value="season">Per season</option>
                    <option value="reporting_period">Per reporting period</option>
                  </Select>
                </label>
              </div>
            </section>

            <section
              className={cn(
                "rounded-xl border bg-panel p-3.5 shadow-line",
                activeControlStep !== "beneficiaries" && "hidden",
              )}
            >
              <div className="flex items-center gap-2">
                <ListChecks aria-hidden="true" className="text-primary" size={18} />
                <h3 className="font-semibold">{primaryEntityLabel} Profile Mapping</h3>
                <HelpHint label="About profile mapping" title={`${primaryEntityLabel} Profile Mapping`}>
                  Tell Atlas which question controls each {primaryEntityLabel.toLowerCase()} profile
                  field. Approved submissions can create update proposals
                  without silently overwriting the registry. Leave this unmapped
                  when the form is only an event, checklist, transaction, or survey record.
                </HelpHint>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {(
                  [
                    ["fullName", "Primary name / display name"],
                    ["phone", "Phone"],
                    ["village", "Village / location"],
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

            <section
              className={cn(
                "rounded-xl border bg-panel p-3.5 shadow-line",
                activeControlStep !== "evidence" && "hidden",
              )}
            >
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

            <section
              className={cn(
                "rounded-xl border bg-panel p-3.5 shadow-line",
                activeControlStep !== "evidence" && "hidden",
              )}
            >
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

            <section
              className={cn(
                "rounded-xl border bg-panel p-3.5 shadow-line",
                activeControlStep !== "evidence" && "hidden",
              )}
            >
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
                <label className="text-sm font-medium">
                  Mobile package mode
                  <Select
                    className="mt-2"
                    onChange={(event) =>
                      updateControlsDraft({
                        mobilePackageMode:
                          event.target.value as FormControlsDraft["mobilePackageMode"],
                      })
                    }
                    value={controlsDraft.mobilePackageMode}
                  >
                    <option value="standard">Standard field package</option>
                    <option value="low_bandwidth">Low bandwidth package</option>
                    <option value="large_registry">Large entity registry</option>
                    <option value="media_heavy">Media-heavy collection</option>
                  </Select>
                </label>
                <label className="text-sm font-medium">
                  Maximum offline days
                  <Input
                    className="mt-2"
                    min={1}
                    onChange={(event) =>
                      updateControlsDraft({
                        offlineMaxDays: Number(event.target.value) || 1,
                      })
                    }
                    type="number"
                    value={controlsDraft.offlineMaxDays}
                  />
                </label>
                <label className="text-sm font-medium sm:col-span-2">
                  Sync requirement
                  <Select
                    className="mt-2"
                    onChange={(event) =>
                      updateControlsDraft({
                        syncRequirement:
                          event.target.value as FormControlsDraft["syncRequirement"],
                      })
                    }
                    value={controlsDraft.syncRequirement}
                  >
                    <option value="manual_allowed">Manual sync allowed</option>
                    <option value="daily_required">Sync required daily</option>
                    <option value="before_new_assignment">Sync before new assignment</option>
                  </Select>
                </label>
                <label className="text-sm font-medium sm:col-span-2">
                  Field officer guidance shown with the form
                  <Textarea
                    className="mt-2"
                    onChange={(event) =>
                      updateControlsDraft({ fieldGuideText: event.target.value })
                    }
                    value={controlsDraft.fieldGuideText}
                  />
                </label>
              </div>
            </section>

            <section
              className={cn(
                "rounded-xl border bg-panel p-3.5 shadow-line",
                activeControlStep !== "governance" && "hidden",
              )}
            >
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
                <label className="text-sm font-medium">
                  PII handling
                  <Select
                    className="mt-2"
                    onChange={(event) =>
                      updateControlsDraft({
                        piiHandling:
                          event.target.value as FormControlsDraft["piiHandling"],
                      })
                    }
                    value={controlsDraft.piiHandling}
                  >
                    <option value="standard">Standard access</option>
                    <option value="mask_exports">Mask personal data in exports</option>
                    <option value="encrypt_sensitive">Encrypt sensitive fields</option>
                    <option value="restricted">Restricted sensitive form</option>
                  </Select>
                </label>
                <label className="text-sm font-medium">
                  Data retention
                  <Select
                    className="mt-2"
                    onChange={(event) =>
                      updateControlsDraft({
                        dataRetentionPolicy:
                          event.target.value as FormControlsDraft["dataRetentionPolicy"],
                      })
                    }
                    value={controlsDraft.dataRetentionPolicy}
                  >
                    <option value="project_life">Keep for project life</option>
                    <option value="donor_period">Keep for external compliance period</option>
                    <option value="seven_years">Keep for seven years</option>
                    <option value="custom">Custom retention rule</option>
                  </Select>
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

            <section
              className={cn(
                "rounded-xl border bg-panel p-3.5 shadow-line",
                activeControlStep !== "governance" && "hidden",
              )}
            >
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
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    checked={controlsDraft.dataFreezeRequired}
                    onChange={(event) =>
                      updateControlsDraft({
                        dataFreezeRequired: event.target.checked,
                      })
                    }
                    type="checkbox"
                  />
                  Freeze approved data used in reports
                </label>
                <label className="text-sm font-medium">
                  {primaryEntityLabel} profile source of truth
                  <Select
                    className="mt-2"
                    onChange={(event) =>
                      updateControlsDraft({
                        sourceOfTruthRule:
                          event.target.value as FormControlsDraft["sourceOfTruthRule"],
                      })
                    }
                    value={controlsDraft.sourceOfTruthRule}
                  >
                    <option value="registration_controls_profile">
                      Registration form controls identity profile
                    </option>
                    <option value="latest_approved_controls_profile">
                      Latest approved submission updates profile
                    </option>
                    <option value="manager_approved_profile_updates">
                      Manager-approved profile updates only
                    </option>
                  </Select>
                </label>
                <label className="text-sm font-medium">
                  Export approval
                  <Select
                    className="mt-2"
                    onChange={(event) =>
                      updateControlsDraft({
                        exportApprovalMode:
                          event.target.value as FormControlsDraft["exportApprovalMode"],
                      })
                    }
                    value={controlsDraft.exportApprovalMode}
                  >
                    <option value="not_required">No additional approval</option>
                    <option value="manager_approval">{sectorTerminology.reportOwnerRole} approval</option>
                    <option value="data_manager_approval">Data manager approval</option>
                  </Select>
                </label>
                <label className="text-sm font-medium">
                  Testing before review
                  <Select
                    className="mt-2"
                    onChange={(event) =>
                      updateControlsDraft({
                        testingRequirement:
                          event.target.value as FormControlsDraft["testingRequirement"],
                      })
                    }
                    value={controlsDraft.testingRequirement}
                  >
                    <option value="preview_only">Preview only</option>
                    <option value="test_submission">Require test submission</option>
                    <option value="pilot_assignment">Require pilot assignment</option>
                  </Select>
                </label>
                <div className="rounded-lg border bg-background/70 p-3 text-xs text-muted-foreground">
                  Current control summary: {controlsDraft.permissionPreset} permissions,
                  {" "}{controlsDraft.workflowPreset.replaceAll("_", " ")},
                  {" "}{controlsDraft.dataQualityMode} quality mode,
                  {" "}{entityWorkflowSummary}.
                </div>
              </div>
            </section>
          </div>
          <section className="flex flex-col gap-3 rounded-xl border bg-panel p-3.5 shadow-line md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold">
                {activeControlStepIndex + 1 < controlSteps.length
                  ? `Next: ${controlSteps[activeControlStepIndex + 1]?.label}`
                  : "Controls complete"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {activeControlStepIndex + 1 < controlSteps.length
                  ? controlSteps[activeControlStepIndex + 1]?.mustDo
                  : "Save the controls, then preview and test the form before review."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={activeControlStepIndex === 0}
                onClick={() =>
                  setActiveControlStep(
                    controlSteps[Math.max(activeControlStepIndex - 1, 0)]?.id ??
                      "essentials",
                  )
                }
                type="button"
                variant="secondary"
              >
                Previous controls
              </Button>
              {activeControlStepIndex + 1 < controlSteps.length ? (
                <Button
                  onClick={() =>
                    setActiveControlStep(
                      controlSteps[
                        Math.min(activeControlStepIndex + 1, controlSteps.length - 1)
                      ]?.id ?? "advanced",
                    )
                  }
                  type="button"
                  variant="primary"
                >
                  Next controls
                </Button>
              ) : (
                <Button onClick={() => setStage("preview")} type="button" variant="primary">
                  Continue to Preview
                </Button>
              )}
            </div>
          </section>
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
                  updateControlsDraft(previewTestReviewDefaults(controlsDraft));
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
          <div className="flex flex-wrap gap-1.5 rounded-lg border bg-panel p-1.5">
            {(
              [
                ["web", MonitorSmartphone, "Web"],
                ["tablet", TabletSmartphone, "Tablet"],
                ["mobile", Smartphone, "Mobile"],
              ] satisfies [PreviewFrame, LucideIcon, string][]
            ).map(([mode, Icon, label]) => (
              <button
                className={cn(
                  "flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition",
                  previewDeviceMode === mode
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-transparent bg-background hover:border-primary/40 hover:bg-primary/5",
                )}
                key={mode}
                onClick={() => setPreviewDeviceMode(mode)}
                type="button"
              >
                <Icon aria-hidden="true" size={15} />
                {label}
              </button>
            ))}
          </div>
          {draftForm?.fields.length ? (
            <div className="flex justify-center">
              <MobileFormPreview form={draftForm} frame={previewDeviceMode} />
            </div>
          ) : (
            <div className="rounded-lg border border-dashed bg-muted/30 px-3 py-10 text-center text-sm text-muted-foreground">
              No questions yet. Return to Builder and add questions.
            </div>
          )}
        </section>
      ) : null}

      {stage === "review" ? (
        <section className="space-y-3">
          <StagePanel
            action={
              <div className="flex flex-wrap gap-2">
                {controlsDraft.lifecycleStatus !== "approved" ? (
                  <Button
                    disabled={!approvalAction.canApprove}
                    onClick={approveForPublish}
                    variant="secondary"
                  >
                    {approvalAction.label}
                  </Button>
                ) : null}
                <Button
                  disabled={publishDisabled}
                  onClick={publishDraft}
                  variant="primary"
                >
                  <Rocket aria-hidden="true" />
                  {publishing ? "Publishing" : "Publish Form"}
                </Button>
                {publishDisabled && !publishing ? (
                  <Button
                    onClick={() => setPublishHelpOpen(true)}
                    variant="secondary"
                  >
                    Why can&apos;t I publish?
                  </Button>
                ) : null}
              </div>
            }
            icon={ListChecks}
            route="/forms/:formId/review"
            title="Review Before Publish"
            lines={[
              `Publishing is allowed at ${MINIMUM_PUBLISH_READINESS_SCORE}% readiness when hard blockers are resolved.`,
              "Approval remains available for organizations that require formal governance before rollout.",
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
                  : readinessBelowPublishThreshold
                    ? `Complete at least ${MINIMUM_PUBLISH_READINESS_SCORE}% readiness before publishing. Optional governance and advanced controls can be finished later.`
                    : "This form can be published now. Review warnings if needed, then publish the field-ready version."}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {criticalFailures.map((item) => (
                  <button
                    className="rounded-full border border-danger/25 bg-danger/10 px-2 py-1 text-xs font-medium text-danger"
                    key={item.id}
                    onClick={() => openReadinessItem(item)}
                    type="button"
                  >
                    Fix {item.label}
                  </button>
                ))}
                {!criticalFailures.length && !readinessBelowPublishThreshold ? (
                  <Badge tone="success">
                    {controlsDraft.lifecycleStatus === "approved"
                      ? "Approved and ready to publish"
                      : "Ready to publish; approval optional"}
                  </Badge>
                ) : null}
              </div>
            </section>
          </div>
          <section className="overflow-hidden rounded-xl border bg-panel shadow-line">
            <div className="flex flex-col gap-2 border-b bg-background/70 px-3 py-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-sm font-semibold">Readiness review list</h3>
                <p className="text-xs text-muted-foreground">
                  Failures and warnings are shown first. Click any row to open the exact setup area.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge tone="danger">{criticalFailures.length} failed</Badge>
                <Badge tone="warning">{readinessWarnings.length} warnings</Badge>
                <Badge tone="success">{readinessPassedCount} passed</Badge>
              </div>
            </div>
            <div className="divide-y">
              {reviewChecklist.map((item) => {
              const passed = item.complete;
              const tone = passed
                ? "success"
                : item.required
                  ? "danger"
                  : "warning";
              return (
                <button
                  className="grid w-full gap-2 px-3 py-2 text-left transition hover:bg-primary/5 md:grid-cols-[140px_minmax(180px,0.75fr)_minmax(260px,1fr)_90px] md:items-center"
                  key={item.id}
                  onClick={() => openReadinessItem(item)}
                  type="button"
                >
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge tone={tone}>
                      {passed
                        ? "Passed"
                        : item.required
                          ? "Failed"
                          : "Warning"}
                    </Badge>
                    <Badge tone="neutral">{item.category}</Badge>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold">{item.label}</span>
                      <HelpHint label={`About ${item.label}`} title={item.label}>
                        {item.description}
                      </HelpHint>
                    </div>
                  </div>
                  <p className="overflow-hidden text-ellipsis whitespace-nowrap text-xs text-muted-foreground">
                    {item.description}
                  </p>
                  <div className="flex items-center gap-2 text-xs font-semibold text-primary md:justify-end">
                    {passed ? (
                      <CheckCircle2 aria-hidden="true" className="text-success" size={16} />
                    ) : (
                      <XCircle aria-hidden="true" className="text-danger" size={16} />
                    )}
                    {item.jumpTo === "controls"
                      ? controlSteps.find(
                          (step) =>
                            step.id === controlStepForReadinessCategory(item.category),
                        )?.label ?? "Open"
                      : item.jumpTo === "builder"
                        ? "Builder"
                        : item.jumpTo === "setup"
                          ? "Setup"
                          : "Open"}
                  </div>
                </button>
              );
              })}
            </div>
          </section>
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

      <Modal
        contentClassName="max-w-3xl"
        description="Smart guidance that explains exact publish blockers and the next fix."
        onOpenChange={setPublishHelpOpen}
        open={publishHelpOpen}
        title="Publish readiness assistant"
      >
        <div className="space-y-4 p-5">
          <div className="flex gap-3 rounded-xl border border-primary/25 bg-primary/10 p-3 text-sm">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Sparkles aria-hidden="true" size={16} />
            </div>
            <div>
              <p className="font-semibold text-foreground">
                I checked {(draftForm?.name ?? setup.formName) || "this form"} against the {sectorTerminology.sectorName.toLowerCase()} publish rules.
              </p>
              <p className="mt-1 text-muted-foreground">
                {requiredPublishAdvice.length
                  ? `I found ${requiredPublishAdvice.length} required ${requiredPublishAdvice.length === 1 ? "fix" : "fixes"} before this form can be published. Start with ${requiredPublishAdvice[0]?.label}.`
                  : warningPublishAdvice.length
                    ? `No required blockers are detected, but ${warningPublishAdvice.length} warning ${warningPublishAdvice.length === 1 ? "needs" : "need"} review before rollout.`
                    : "No blockers are currently detected. If the publish button is still disabled, save the draft and refresh the review."}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                This assistant supports form readiness and sector-standard operations. It applies safe platform fixes where possible, and gives expert recommendations where the final decision depends on the project, workflow, reporting method, customer requirement, external funder, or organization policy.
              </p>
            </div>
          </div>
          {publishAssistantAdvice.length ? (
            <div className="max-h-[58vh] space-y-2 overflow-y-auto pr-1">
              {publishAssistantAdvice.slice(0, 10).map((advice, index) => (
                <div
                  className={cn(
                    "rounded-lg border bg-background/70 p-3",
                    advice.severity === "Required"
                      ? "border-danger/25"
                      : "border-warning/25",
                  )}
                  key={`${advice.id}-${index}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-2">
                      {advice.severity === "Required" ? (
                        <AlertTriangle
                          aria-hidden="true"
                          className="mt-0.5 shrink-0 text-danger"
                          size={16}
                        />
                      ) : (
                        <ClipboardCheck
                          aria-hidden="true"
                          className="mt-0.5 shrink-0 text-warning"
                          size={16}
                        />
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Item {index + 1} of {Math.min(publishAssistantAdvice.length, 10)}
                        </p>
                        <p className="text-sm font-semibold">{advice.label}</p>
                      </div>
                    </div>
                    <Badge tone={advice.severity === "Required" ? "danger" : "warning"}>
                      {advice.severity}
                    </Badge>
                  </div>
                  <div className="mt-2 grid gap-3 text-xs text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <p className="font-semibold text-foreground">Why</p>
                      <p className="mt-1">{advice.why}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Direct fix</p>
                      <p className="mt-1">{advice.fix}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">M&amp;E expert recommendation</p>
                      <p className="mt-1">{advice.mneTip}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">
                        {advice.quickFixId
                          ? "What the platform will do"
                          : "Project-specific decision"}
                      </p>
                      <p className="mt-1">{advice.platformAction}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      onClick={() => {
                        setPublishHelpOpen(false);
                        openPublishAdvice(advice);
                      }}
                      size="sm"
                      variant="secondary"
                    >
                      {advice.actionLabel}
                    </Button>
                    {advice.quickFixId ? (
                      <Button
                        onClick={() => {
                          const quickFixId = advice.quickFixId;
                          if (!quickFixId) return;
                          setPublishHelpOpen(false);
                          applyPublishQuickFix(quickFixId);
                        }}
                        size="sm"
                        variant="primary"
                      >
                        Apply platform fix
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-success/25 bg-success/10 p-3 text-sm text-success">
              No blockers are currently detected. Try publishing again.
            </div>
          )}
          {publishAssistantAdvice[0] ? (
            <Button
              onClick={() => {
                const firstAdvice = publishAssistantAdvice[0];
                setPublishHelpOpen(false);
                if (firstAdvice) openPublishAdvice(firstAdvice);
              }}
              variant="primary"
            >
              Go fix the first issue
            </Button>
          ) : null}
        </div>
      </Modal>

      <Modal
        contentClassName="max-w-2xl"
        description="Confirmation that the governed form version is published and available for the selected field team."
        onOpenChange={setPublishSuccessOpen}
        open={publishSuccessOpen}
        title="Form published successfully"
      >
        {publishSuccessSummary ? (
          <div className="space-y-4 p-5">
            <div className="rounded-xl border border-success/30 bg-success/10 p-5 text-center">
              <CheckCircle2
                aria-hidden="true"
                className="mx-auto text-success"
                size={48}
              />
              <h2 className="mt-3 text-2xl font-semibold">
                Form published successfully
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {publishSuccessSummary.formName} is now published as version{" "}
                {publishSuccessSummary.version} for{" "}
                {publishSuccessSummary.projectName}.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border bg-background/70 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Published version
                </p>
                <p className="mt-1 text-xl font-semibold">
                  v{publishSuccessSummary.version}
                </p>
              </div>
              <div className="rounded-lg border bg-background/70 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Selected officers
                </p>
                <p className="mt-1 text-xl font-semibold">
                  {publishSuccessSummary.selectedOfficerCount}
                </p>
              </div>
              <div className="rounded-lg border bg-background/70 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Selected teams
                </p>
                <p className="mt-1 text-xl font-semibold">
                  {publishSuccessSummary.selectedTeamCount}
                </p>
              </div>
              <div className="rounded-lg border bg-background/70 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Sent to mobile
                </p>
                <p className="mt-1 text-xl font-semibold">
                  {publishSuccessSummary.deliveredOfficerCount}
                </p>
              </div>
            </div>
            {publishSuccessSummary.deliveryErrors.length ? (
              <div className="rounded-lg border border-warning/30 bg-warning/10 p-3">
                <p className="text-sm font-semibold">
                  Some field officer assignments need attention
                </p>
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {publishSuccessSummary.deliveryErrors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {publishSuccessSummary.selectedTeamCount ? (
              <div className="rounded-lg border bg-background/70 p-3 text-sm text-muted-foreground">
                {publishSuccessSummary.selectedTeamCount} selected team
                {publishSuccessSummary.selectedTeamCount === 1 ? "" : "s"}{" "}
                will receive this form through project/team mobile sync rules.
                Direct mobile assignment count above only includes individually
                selected field officers.
              </div>
            ) : null}
            {!publishSuccessSummary.deliveryErrors.length && !publishSuccessSummary.selectedTeamCount ? (
              <div className="rounded-lg border bg-background/70 p-3 text-sm text-muted-foreground">
                The published form is available for the selected field officers
                through Field Operations and mobile sync.
              </div>
            ) : null}
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                onClick={() => setPublishSuccessOpen(false)}
                variant="secondary"
              >
                Continue editing controls
              </Button>
              <Button
                onClick={() => {
                  setPublishSuccessOpen(false);
                  onBack();
                }}
                variant="primary"
              >
                View forms
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
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
