"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  ClipboardPenLine,
  Copy,
  Database,
  Download,
  FileStack,
  Gauge,
  GitBranch,
  History,
  Languages,
  Link2,
  MapPinned,
  Plus,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  Table2,
  UploadCloud,
  Workflow,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import { DataTable, type TableColumn } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HelpHint } from "@/components/ui/help-hint";
import { Input, Select } from "@/components/ui/input";
import type { BeneficiaryRead, CurrentPrincipal, DataFormSchemaRead, SubmissionRead } from "@/lib/api";
import { ApiError, archiveForm, confirmImportedFormDataRows, getFormSchema, governExport, importFormDataRows, listBeneficiaries, listForms, listFormTemplates, listProjects, listSubmissions, restoreForm, updateForm } from "@/lib/api";
import { cn } from "@/lib/utils";
import { FormCreationWorkspace, readSpreadsheetRows } from "@/modules/forms/FormCreationWorkspace";
import {
  formDetailTabs,
  formsSections,
  normalizeBackendForm,
  previewForms,
  previewTemplates,
  type FormDetailTab,
  type FormListItem,
  type FormsSection,
} from "@/modules/forms/data";
import {
  computeFormsSummary,
  filterForms,
  formatDate,
  qualityTone,
  statusTone,
  toCsv,
} from "@/modules/forms/utils";
import { useWorkspaceStore, type LocalWorkspaceForm } from "@/stores/workspace";
import { getPreviewSubmissions } from "@/modules/submissions/utils";
import type { SubmissionRecord } from "@/modules/submissions/data";
import { previewEntities } from "@/modules/beneficiaries/data";

type FormsModuleProps = {
  principal?: CurrentPrincipal | null;
  token: string | null;
};

function isPreview(token: string | null): boolean {
  return !token || token === "preview-token";
}

function hasAnyPermission(
  principal: CurrentPrincipal | null | undefined,
  permissions: string[],
): boolean {
  if (!principal || principal.platform_admin) return true;
  return permissions.some((permission) =>
    principal.permissions?.includes(permission),
  );
}

function downloadCsv(
  filename: string,
  rows: Record<string, string | number | boolean | null | undefined>[],
): void {
  const csv = toCsv(rows);
  if (!csv) return;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "Not recorded";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Not recorded";
  return parsed.toLocaleString();
}

function displaySubmissionId(submission: Pick<SubmissionRead, "client_submission_id" | "submitted_at" | "imported_at" | "is_imported">): string {
  const raw = submission.client_submission_id;
  if (/^(MOB|UPL|IMP|SUB|WEB)-\d{4}-[A-Z0-9-]+$/i.test(raw)) return raw.toUpperCase();
  const year = new Date(submission.imported_at ?? submission.submitted_at).getFullYear();
  const suffix = raw.replace(/[^a-z0-9]/gi, "").slice(-6).toUpperCase() || "000001";
  const prefix = submission.is_imported ? "IMP" : raw.startsWith("draft_") || raw.startsWith("submission_") ? "MOB" : "SUB";
  return `${prefix}-${Number.isFinite(year) ? year : new Date().getFullYear()}-${suffix}`;
}

function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function toLocalWorkspaceForm(form: FormListItem, status: string): LocalWorkspaceForm {
  return {
    active_assignments: form.active_assignments,
    created_by: form.created_by,
    description: form.description,
    form_type: form.form_type,
    has_quality_issues: form.has_quality_issues,
    id: form.id,
    owner: form.owner,
    pending_approval: form.pending_approval,
    project_id: form.project_id,
    project_name: form.project_name,
    quality_score: form.quality_score,
    questions: form.questions,
    recently_updated: form.recently_updated,
    sections: form.sections,
    slug: form.slug,
    status,
    survey_name: form.survey_name,
    total_submissions: form.total_submissions,
    updated_at: new Date().toISOString(),
    version: form.version,
    name: form.name,
  };
}

async function readFormUploadRows(file: File): Promise<string[][]> {
  return readSpreadsheetRows(file);
}

type FormStats = {
  approved_submissions: number;
  field_submitted_records: number;
  last_submission_at: string | null;
  linked_beneficiaries: number;
  pending_review_submissions: number;
  rejected_returned_submissions: number;
  total_submissions: number;
  uploaded_records: number;
};

type FormGridQuestion = {
  allowedValues?: string | null;
  definition?: string | null;
  indicatorMapping?: string | null;
  key: string;
  label: string;
  profileField?: string | null;
  profileImpact?: string | null;
  sensitivityLevel?: string | null;
  sourceOfTruth?: string | null;
  type: string;
  section: string;
};

function isImportedSubmission(submission: SubmissionRead | SubmissionRecord): boolean {
  return Boolean(
    submission.is_imported ||
      submission.import_batch_id ||
      submission.imported_at ||
      submission.source_system,
  );
}

function submissionSourceLabel(submission: SubmissionRead | SubmissionRecord): string {
  if (submission.offline_created) return "Mobile";
  if (isImportedSubmission(submission)) {
    const sourceSystem = (submission.source_system ?? "").toLowerCase();
    if (sourceSystem && sourceSystem !== "form spreadsheet upload") return "Imported";
    return "Uploaded";
  }
  return "Field Submitted";
}

function submissionActorLabel(submission: SubmissionRead | SubmissionRecord): string {
  if (isImportedSubmission(submission)) {
    return submission.imported_by_user_id ?? "Uploaded user";
  }
  return submission.field_officer_id ?? "Unassigned collector";
}

function beneficiaryCodeMap(
  beneficiaries: BeneficiaryRead[] | null | undefined,
  preview: boolean,
): Map<string, string> {
  const map = new Map<string, string>();
  if (preview) {
    for (const entity of previewEntities) {
      map.set(entity.id, entity.entityId);
    }
    return map;
  }
  for (const beneficiary of beneficiaries ?? []) {
    map.set(beneficiary.id, beneficiary.beneficiary_uid);
  }
  return map;
}

function submissionEntityCode(
  submission: SubmissionRead | SubmissionRecord,
  beneficiaryCodes: Map<string, string>,
): string {
  const processing = submission.payload_json?._beneficiary_processing;
  const processedCode =
    processing && typeof processing === "object" && !Array.isArray(processing)
      ? String(
          (processing as Record<string, unknown>).beneficiary_uid ??
            (processing as Record<string, unknown>).candidate_beneficiary_uid ??
            "",
        )
      : "";
  if (!submission.entity_id) return processedCode || "Not linked";
  return beneficiaryCodes.get(submission.entity_id) ?? (processedCode || submission.entity_id);
}

function linkedBeneficiaryLabel(submission: SubmissionRead | SubmissionRecord): string {
  const links = submission.linked_beneficiaries ?? [];
  const participantLinks = links.filter((link) => link.link_type !== "primary");
  if (!participantLinks.length) return "None";
  const shown = participantLinks.slice(0, 3).map((link) => link.beneficiary_uid);
  const remaining = participantLinks.length - shown.length;
  return remaining > 0 ? `${shown.join(", ")} +${remaining}` : shown.join(", ");
}

function submissionAnswerMap(submission: SubmissionRead | SubmissionRecord): Record<string, unknown> {
  const payload = submission.payload_json ?? {};
  const answers: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (!key.startsWith("_") && key !== "responses") answers[key] = value;
  }
  const responseRows = Array.isArray(payload.responses)
    ? payload.responses
    : Array.isArray(payload._mobile_responses)
      ? payload._mobile_responses
      : [];
  for (const row of responseRows) {
    if (!row || typeof row !== "object") continue;
    const response = row as { questionId?: unknown; question_id?: unknown; variableName?: unknown; variable_name?: unknown; value?: unknown };
    const key = String(response.variableName ?? response.variable_name ?? response.questionId ?? response.question_id ?? "").trim();
    if (key) answers[key] = response.value;
  }
  return answers;
}

function statusBucket(status: string): "approved" | "pending" | "rejectedReturned" | "other" {
  if (status === "approved") return "approved";
  if (["import_staged", "submitted", "under_review", "pending_review", "resubmitted"].includes(status)) return "pending";
  if (["rejected", "correction_requested", "needs_correction", "returned"].includes(status)) return "rejectedReturned";
  return "other";
}

function emptyStats(): FormStats {
  return {
    approved_submissions: 0,
    field_submitted_records: 0,
    last_submission_at: null,
    linked_beneficiaries: 0,
    pending_review_submissions: 0,
    rejected_returned_submissions: 0,
    total_submissions: 0,
    uploaded_records: 0,
  };
}

function statValue(form: FormListItem, key: keyof FormStats): number {
  const value = form[key];
  return typeof value === "number" ? value : 0;
}

function buildFormStats(submissions: (SubmissionRead | SubmissionRecord)[]): Map<string, FormStats> {
  const map = new Map<string, FormStats>();
  for (const submission of submissions) {
    const stats = map.get(submission.form_id) ?? emptyStats();
    stats.total_submissions += 1;
    if (isImportedSubmission(submission)) {
      stats.uploaded_records += 1;
    } else {
      stats.field_submitted_records += 1;
    }
    const bucket = statusBucket(submission.status);
    if (bucket === "approved") stats.approved_submissions += 1;
    if (bucket === "pending") stats.pending_review_submissions += 1;
    if (bucket === "rejectedReturned") stats.rejected_returned_submissions += 1;
    if (submission.entity_id) stats.linked_beneficiaries += 1;
    const date = submission.imported_at ?? submission.submitted_at ?? submission.sync_received_at;
    if (
      date &&
      (!stats.last_submission_at ||
        new Date(date).getTime() > new Date(stats.last_submission_at).getTime())
    ) {
      stats.last_submission_at = date;
    }
    map.set(submission.form_id, stats);
  }
  return map;
}

function safeRate(numerator: number, denominator: number): number {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 100);
}

function numericAverage(values: unknown[]): string {
  const numeric = values
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));
  if (!numeric.length) return "N/A";
  return (numeric.reduce((sum, value) => sum + value, 0) / numeric.length).toFixed(1);
}

function formSubmissionsFor(
  submissions: (SubmissionRead | SubmissionRecord)[],
  formId: string,
): (SubmissionRead | SubmissionRecord)[] {
  return submissions.filter((submission) => submission.form_id === formId);
}

function formCompletionRate(form: FormListItem, submissions: (SubmissionRead | SubmissionRecord)[]): number {
  const completed = submissions.filter((submission) =>
    ["approved", "under_review", "submitted", "resubmitted"].includes(submission.status),
  ).length;
  const started = Math.max(completed, form.total_submissions, submissions.length);
  return safeRate(completed, started);
}

function submissionDurationMinutes(submission: SubmissionRead | SubmissionRecord): number | null {
  const captured = submission.captured_at ? new Date(submission.captured_at).getTime() : null;
  const submitted = submission.submitted_at ? new Date(submission.submitted_at).getTime() : null;
  if (!captured || !submitted || submitted <= captured) return null;
  return Math.round((submitted - captured) / 60000);
}

function medianDuration(submissions: (SubmissionRead | SubmissionRecord)[]): string {
  const durations = submissions
    .map(submissionDurationMinutes)
    .filter((value): value is number => value !== null)
    .sort((left, right) => left - right);
  if (!durations.length) return "N/A";
  const middle = Math.floor(durations.length / 2);
  return `${durations.length % 2 ? durations[middle] : Math.round((durations[middle - 1] + durations[middle]) / 2)}m`;
}

function averageDuration(submissions: (SubmissionRead | SubmissionRecord)[]): string {
  const durations = submissions
    .map(submissionDurationMinutes)
    .filter((value): value is number => value !== null);
  if (!durations.length) return "N/A";
  return `${Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length)}m`;
}

function buildQuestionAnalytics(submissions: (SubmissionRead | SubmissionRecord)[]) {
  const questionKeys = new Set<string>();
  submissions.forEach((submission) => {
    Object.keys(submissionAnswerMap(submission)).forEach((key) => questionKeys.add(key));
  });
  return Array.from(questionKeys).map((key) => {
    const values = submissions.map((submission) => submissionAnswerMap(submission)[key]);
    const answered = values.filter((value) => value !== null && value !== undefined && value !== "");
    const missing = submissions.length - answered.length;
    const counts = new Map<string, number>();
    answered.forEach((value) => {
      const label = formatCell(value);
      counts.set(label, (counts.get(label) ?? 0) + 1);
    });
    const common = Array.from(counts.entries()).sort((left, right) => right[1] - left[1])[0];
    return {
      key,
      average: numericAverage(answered),
      missing,
      mostCommon: common ? `${common[0]} (${common[1]})` : "N/A",
      outliers: answered.filter((value) => {
        const numeric = Number(value);
        return Number.isFinite(numeric) && (numeric < 0 || numeric > 1000000);
      }).length,
      responseCount: answered.length,
      skipRate: safeRate(missing, submissions.length),
      validationFailures: submissions.filter((submission) => {
        const issues = submission.payload_json?._validation_issues;
        return Array.isArray(issues) && issues.some((issue) => String(issue).includes(key));
      }).length,
    };
  });
}

function formJourneyRank(form: FormListItem): number {
  const text = `${form.form_type} ${form.name}`.toLowerCase();
  if (text.includes("registration")) return 1;
  if (text.includes("baseline")) return 2;
  if (text.includes("training") || text.includes("attendance")) return 3;
  if (text.includes("distribution")) return 4;
  if (text.includes("monitoring") || text.includes("follow")) return 5;
  if (text.includes("endline")) return 6;
  return 7;
}

function relatedFormsFor(form: FormListItem, forms: FormListItem[]): FormListItem[] {
  return forms
    .filter((candidate) => candidate.project_id && candidate.project_id === form.project_id)
    .sort((left, right) => formJourneyRank(left) - formJourneyRank(right));
}

function offlineReadinessIssues(form: FormListItem): string[] {
  const issues: string[] = [];
  if (form.questions > 80) issues.push("Large form: split into sections and test on low-end Android devices.");
  if (form.sections < 1) issues.push("No sections configured.");
  if (form.has_quality_issues) issues.push("Resolve quality warnings before field deployment.");
  if (!form.project_id) issues.push("Attach form to a project before mobile assignments.");
  if (form.status !== "published") issues.push("Only published forms are available for mobile sync.");
  return issues;
}

function translationCompleteness(form: FormListItem, language: string): number {
  const seed = form.name.length + language.length + form.questions + form.version;
  return Math.max(12, Math.min(100, 55 + (seed % 45)));
}

function questionsFromSchema(schema: DataFormSchemaRead | null): FormGridQuestion[] {
  const sections = ((schema?.schema as { sections?: unknown })?.sections ?? []) as {
    title?: string;
    fields?: {
      allowed_values_definition?: string | null;
      definition?: string | null;
      id?: string;
      indicator_mapping?: string | null;
      beneficiary?: {
        profileField?: string | null;
        profileImpact?: string | null;
      };
      variable_name?: string | null;
      label?: string;
      sensitivity_level?: string | null;
      source_of_truth?: string | null;
      type?: string;
    }[];
  }[];
  return sections.flatMap((section) =>
    (section.fields ?? []).map((field) => ({
      allowedValues: field.allowed_values_definition ?? null,
      definition: field.definition ?? null,
      indicatorMapping: field.indicator_mapping ?? null,
      key: field.variable_name || field.id || "field",
      label: field.label || field.variable_name || field.id || "Field",
      profileField: field.beneficiary?.profileField ?? null,
      profileImpact: field.beneficiary?.profileImpact ?? null,
      sensitivityLevel: field.sensitivity_level ?? "standard",
      sourceOfTruth: field.source_of_truth ?? "form_response",
      section: section.title || "Form questions",
      type: field.type || "text",
    })),
  );
}

function payloadColumns(submissions: (SubmissionRead | SubmissionRecord)[]): FormGridQuestion[] {
  const keys = new Map<string, FormGridQuestion>();
  for (const submission of submissions) {
    for (const [key, value] of Object.entries(submissionAnswerMap(submission))) {
      if (keys.has(key)) continue;
      keys.set(key, {
        key,
        label: key.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()),
        section: "Uploaded / legacy fields",
        sensitivityLevel: "standard",
        sourceOfTruth: "legacy_upload",
        type: typeof value === "number" ? "number" : typeof value === "boolean" ? "boolean" : "text",
      });
    }
  }
  return Array.from(keys.values());
}

function questionDictionaryLines(question: FormGridQuestion): string[] {
  return [
    `Variable: ${question.key}`,
    `Type: ${question.type}`,
    `Definition: ${question.definition || "No formal definition recorded yet."}`,
    `Allowed values: ${question.allowedValues || "Defined by the response type or reference list."}`,
    `Metric mapping: ${question.indicatorMapping || "Not mapped to a metric yet."}`,
    `Entity profile field: ${question.profileField || "Not mapped to an entity profile field."}`,
    `Sensitivity: ${question.sensitivityLevel || "standard"}`,
    `Source of truth: ${question.sourceOfTruth || "form_response"}`,
  ];
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  const gpsValue = formatGpsAnswer(value);
  if (gpsValue) return gpsValue;
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function numberFromUnknown(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

function formatGpsAnswer(value: unknown): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const latitude = numberFromUnknown(record.latitude);
  const longitude = numberFromUnknown(record.longitude);
  if (latitude === null || longitude === null) return null;
  const accuracy = numberFromUnknown(record.accuracy);
  const timestamp = typeof record.timestamp === "string" ? record.timestamp : null;
  return [
    `GPS captured: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
    accuracy !== null ? `accuracy ${Math.round(accuracy)}m` : null,
    timestamp ? `at ${formatDate(timestamp)}` : null,
  ].filter(Boolean).join(" · ");
}

function submissionHasUsableGps(submission: SubmissionRead | SubmissionRecord): boolean {
  const locationStatus = submission.payload_json?._mobile_location_status;
  if (locationStatus === "not_required_or_missing") return false;
  return Number.isFinite(submission.latitude) && Number.isFinite(submission.longitude) && !(submission.latitude === 0 && submission.longitude === 0);
}

function formatSubmissionGpsEvidence(submission: SubmissionRead | SubmissionRecord): string {
  if (!submissionHasUsableGps(submission)) return "No GPS captured";
  const accuracy = submission.accuracy == null ? "accuracy n/a" : `accuracy ${Math.round(submission.accuracy)}m`;
  return `${submission.latitude.toFixed(5)}, ${submission.longitude.toFixed(5)} · ${accuracy}`;
}

function formatSubmissionDeviceEvidence(submission: SubmissionRead | SubmissionRecord): string {
  if (isImportedSubmission(submission)) return "Uploaded/imported";
  return submission.device_id || "Unknown device";
}

function approvalActorLabel(submission: SubmissionRead | SubmissionRecord): string {
  return submission.approved_by_name || submission.approved_by_user_id || "Not approved yet";
}

function approvalCellLabel(submission: SubmissionRead | SubmissionRecord): string {
  if (!submission.approved_at) return approvalActorLabel(submission);
  return `${approvalActorLabel(submission)} · ${formatDateTime(submission.approved_at)}`;
}

function rowQualityWarnings(submission: SubmissionRead | SubmissionRecord): string[] {
  const warnings = new Set<string>();
  if (submission.status !== "approved") warnings.add("Pending review");
  const processing = submission.payload_json?._beneficiary_processing;
  if (processing && typeof processing === "object" && !Array.isArray(processing)) {
    const processingRecord = processing as Record<string, unknown>;
    const status = String(processingRecord.status ?? "");
    const action = String(processingRecord.action ?? "");
    const proposals = Number(processingRecord.profile_update_proposals ?? 0);
    if (status === "reconciliation_required") warnings.add("Reconciliation required");
    if (status === "processed" && action === "created") warnings.add("Beneficiary created");
    if (status === "processed" && action === "linked") warnings.add("Beneficiary linked");
    if (proposals > 0) warnings.add("Profile update review");
  }
  if (!submissionHasUsableGps(submission)) warnings.add("Missing GPS");
  if (submission.accuracy && submission.accuracy > 20) warnings.add("Low GPS accuracy");
  if ("duplicate_risk" in submission && submission.duplicate_risk && submission.duplicate_risk !== "none") warnings.add("Duplicate risk");
  if ("quality_flags" in submission) {
    for (const flag of submission.quality_flags ?? []) {
      if (flag.status === "open") warnings.add(flag.check);
    }
  }
  const validationIssues = submission.payload_json?._validation_issues;
  if (Array.isArray(validationIssues) && validationIssues.length) warnings.add("Validation issue");
  const importIssues = submission.payload_json?._import_issues;
  if (Array.isArray(importIssues) && importIssues.length) {
    const missingFields = importIssues
      .filter((issue) => {
        if (!issue || typeof issue !== "object") return false;
        const issueType = "issue_type" in issue ? issue.issue_type : null;
        return issueType === "missing_column" || issueType === "missing_value";
      })
      .map((issue) => {
        if (!issue || typeof issue !== "object") return "";
        const label = "question_label" in issue ? issue.question_label : null;
        const field = "field_name" in issue ? issue.field_name : null;
        return String(label || field || "").trim();
      })
      .filter(Boolean)
      .slice(0, 3);
    warnings.add(missingFields.length ? `Missing: ${missingFields.join(", ")}` : "Import warning");
  }
  return Array.from(warnings);
}

function importBlockingIssues(submission: SubmissionRead | SubmissionRecord): string[] {
  const validationIssues = submission.payload_json?._validation_issues;
  if (Array.isArray(validationIssues) && validationIssues.length) {
    return validationIssues.map((issue) => String(issue)).filter(Boolean);
  }
  return [];
}

function isImportStagedSubmission(submission: SubmissionRead | SubmissionRecord): boolean {
  return isImportedSubmission(submission) && submission.status === "import_staged";
}

function previewSubmissionFormId(submission: SubmissionRecord): string {
  const formName = submission.form_name.toLowerCase();
  if (submission.form_id.includes("farmer") || formName.includes("farmer")) {
    return "preview-farmer-registration";
  }
  if (submission.form_id.includes("baseline") || formName.includes("baseline")) {
    return "preview-baseline-household";
  }
  if (submission.form_id.includes("health") || formName.includes("health")) {
    return "preview-health-monitoring";
  }
  return submission.form_id;
}

export function FormsModule({ principal, token }: FormsModuleProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeSection, setActiveSection] = useState<FormsSection>("dashboard");
  const [activeTab, setActiveTab] = useState<FormDetailTab>("Overview");
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [creationOpen, setCreationOpen] = useState(false);
  const [builderFormId, setBuilderFormId] = useState<string | null>(null);
  const [duplicateSourceFormId, setDuplicateSourceFormId] = useState<string | null>(null);
  const localForms = useWorkspaceStore((state) => state.localForms);
  const localSubmissions = useWorkspaceStore((state) => state.localSubmissions);
  const setActiveView = useWorkspaceStore((state) => state.setActiveView);
  const preview = isPreview(token);
  const enabled = Boolean(token && !preview);
  const canManageForms = hasAnyPermission(principal, [
    "forms.manage",
    "forms.create",
    "forms.edit",
    "forms.publish",
  ]);

  const formsQuery = useQuery({
    queryKey: ["forms-module", token],
    queryFn: () => listForms(token ?? ""),
    enabled,
  });
  const submissionsQuery = useQuery({
    queryKey: ["forms-module", "submissions", token],
    queryFn: () => listSubmissions(token ?? ""),
    enabled,
  });
  const beneficiariesQuery = useQuery({
    queryKey: ["forms-module", "beneficiary-codes", token],
    queryFn: () => listBeneficiaries(token ?? ""),
    enabled,
  });
  const templatesQuery = useQuery({
    queryKey: ["forms-module", "templates", token],
    queryFn: () => listFormTemplates(token ?? ""),
    enabled,
  });
  const projectsQuery = useQuery({
    queryKey: ["forms-module", "projects", token],
    queryFn: () => listProjects(token ?? ""),
    enabled,
  });

  const formSubmissions = useMemo<(SubmissionRead | SubmissionRecord)[]>(
    () =>
      preview
        ? [
            ...localSubmissions,
            ...getPreviewSubmissions().map((submission) => ({
              ...submission,
              form_id: previewSubmissionFormId(submission),
            })),
          ]
        : (submissionsQuery.data ?? []),
    [localSubmissions, preview, submissionsQuery.data],
  );
  const linkedBeneficiaryCodes = useMemo(
    () => beneficiaryCodeMap(beneficiariesQuery.data, preview),
    [beneficiariesQuery.data, preview],
  );
  const formStats = useMemo(() => buildFormStats(formSubmissions), [formSubmissions]);
  const projectNameById = useMemo(
    () =>
      new Map(
        (projectsQuery.data ?? []).map((project) => [project.id, project.name]),
      ),
    [projectsQuery.data],
  );
  const forms = useMemo<FormListItem[]>(() => {
    const backendForms = (formsQuery.data ?? []).map(normalizeBackendForm);
    const rawForms = preview
      ? [...previewForms, ...localForms]
      : backendForms;
    const baseForms = Array.from(
      new Map(rawForms.map((form) => [form.id, form])).values(),
    );
    return baseForms.map((form) => {
      const stats = formStats.get(form.id);
      const projectName =
        form.project_id && projectNameById.has(form.project_id)
          ? (projectNameById.get(form.project_id) ?? form.project_name)
          : form.project_name;
      if (!stats) return { ...form, project_name: projectName };
      return {
        ...form,
        project_name: projectName,
        ...stats,
      };
    });
  }, [formStats, formsQuery.data, localForms, preview, projectNameById]);
  const templates = preview ? previewTemplates : (templatesQuery.data ?? []);
  const summary = computeFormsSummary(forms);
  const visibleForms = useMemo(
    () => filterForms(forms, activeSection),
    [activeSection, forms],
  );
  const [filterProjectName, setFilterProjectName] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterOwner, setFilterOwner] = useState("");
  const [filterFormType, setFilterFormType] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const formFilters = {
    formType: filterFormType,
    owner: filterOwner,
    projectName: filterProjectName,
    status: filterStatus,
    dateFrom: filterDateFrom,
    dateTo: filterDateTo,
  };
  function setFormFilters(patch: Partial<typeof formFilters>): void {
    if (patch.projectName !== undefined) setFilterProjectName(patch.projectName);
    if (patch.status !== undefined) setFilterStatus(patch.status);
    if (patch.owner !== undefined) setFilterOwner(patch.owner);
    if (patch.formType !== undefined) setFilterFormType(patch.formType);
    if (patch.dateFrom !== undefined) setFilterDateFrom(patch.dateFrom);
    if (patch.dateTo !== undefined) setFilterDateTo(patch.dateTo);
  }
  const filteredForms = useMemo(() => {
    const fromTime = filterDateFrom ? new Date(filterDateFrom).getTime() : null;
    const toTime = filterDateTo ? new Date(filterDateTo).getTime() : null;
    return visibleForms.filter((form) => {
      if (filterProjectName && form.project_name !== filterProjectName) return false;
      if (filterStatus && form.status !== filterStatus) return false;
      if (filterOwner && form.owner !== filterOwner) return false;
      if (filterFormType && form.form_type !== filterFormType) return false;
      if (fromTime !== null || toTime !== null) {
        if (!form.updated_at) return false;
        const updatedTime = new Date(form.updated_at).getTime();
        if (fromTime !== null && updatedTime < fromTime) return false;
        if (toTime !== null && updatedTime > toTime) return false;
      }
      return true;
    });
  }, [filterDateFrom, filterDateTo, filterFormType, filterOwner, filterProjectName, filterStatus, visibleForms]);
  const selectedForm = forms.find((form) => form.id === selectedFormId) ?? null;
  const isCreateRoute =
    (pathname ?? "").replace(/\/+$/, "") === "/forms/create";
  const dataRouteMatch = pathname?.match(/^\/forms\/([^/]+)\/data\/?$/);
  const dataFormId = dataRouteMatch?.[1] ? decodeURIComponent(dataRouteMatch[1]) : null;
  const dataForm = dataFormId ? forms.find((form) => form.id === dataFormId) ?? null : null;

  useEffect(() => {
    if (!isCreateRoute) {
      return;
    }
    setSelectedFormId(null);
    setBuilderFormId(null);
    setCreationOpen(true);
  }, [isCreateRoute]);

  useEffect(() => {
    const normalizedPath = (pathname ?? "").replace(/\/+$/, "");
    const sectionFromPath = formsSections.find((section) => section.route === normalizedPath);
    if (sectionFromPath) {
      setSelectedFormId(null);
      setActiveSection(sectionFromPath.id);
    }
  }, [pathname]);

  function openForm(form: FormListItem, tab: FormDetailTab = "Overview"): void {
    if (["all", "published", "archived"].includes(activeSection)) {
      router.push(`/forms/${form.id}/data`);
      return;
    }
    setSelectedFormId(form.id);
    setActiveTab(tab);
  }

  function openFormsSection(section: FormsSection): void {
    const route = formsSections.find((item) => item.id === section)?.route ?? "/forms";
    router.push(route);
    setSelectedFormId(null);
    setActiveSection(section);
  }

  function openFormData(formId: string, query?: string): void {
    router.push(`/forms/${formId}/data${query ? `?${query}` : ""}`);
  }

  function openFormBuilder(form: FormListItem): void {
    setSelectedFormId(null);
    setBuilderFormId(form.id);
    setCreationOpen(true);
  }

  const columns: TableColumn<FormListItem>[] = [
    {
      key: "name",
      header: "Form",
      value: (form) => `${form.name} ${form.slug}`,
      render: (form) => (
        <button
          className="text-left"
          onClick={() => openForm(form)}
          type="button"
        >
          <p className="font-medium text-foreground">{form.name}</p>
          <p className="text-xs text-muted-foreground">{form.slug}</p>
        </button>
      ),
    },
    {
      key: "project",
      header: "Project",
      value: (form) => form.project_name,
      render: (form) => form.project_name,
    },
    {
      key: "version",
      header: "Version",
      value: (form) => String(form.version),
      render: (form) => `v${form.version}`,
    },
    {
      key: "status",
      header: "Status",
      value: (form) => form.status,
      render: (form) => (
        <Badge tone={statusTone(form.status)}>{form.status}</Badge>
      ),
    },
    {
      key: "owner",
      header: "Owner",
      value: (form) => form.owner,
      render: (form) => form.owner,
    },
    {
      key: "questions",
      header: "Questions",
      value: (form) => String(form.questions),
      render: (form) => form.questions,
    },
    {
      key: "updated",
      header: "Last Updated",
      value: (form) => form.updated_at,
      render: (form) => formatDate(form.updated_at),
    },
    {
      key: "assignments",
      header: "Assignments",
      value: (form) => String(form.active_assignments),
      render: (form) => form.active_assignments,
    },
    {
      key: "submissions",
      header: "Submissions",
      value: (form) => String(form.total_submissions),
      render: (form) => form.total_submissions,
    },
    {
      key: "source",
      header: "Source Split",
      value: (form) =>
        `${statValue(form, "uploaded_records")} ${statValue(form, "field_submitted_records")}`,
      render: (form) => (
        <div className="space-y-1 text-xs">
          <p>{statValue(form, "field_submitted_records")} field/mobile</p>
          <p className="text-muted-foreground">
            {statValue(form, "uploaded_records")} uploaded
          </p>
        </div>
      ),
    },
    {
      key: "approval",
      header: "Approval",
      value: (form) =>
        `${statValue(form, "approved_submissions")} ${statValue(form, "pending_review_submissions")} ${statValue(form, "rejected_returned_submissions")}`,
      render: (form) => (
        <div className="flex flex-wrap gap-1">
          <Badge tone="success">{statValue(form, "approved_submissions")} approved</Badge>
          <Badge tone="warning">{statValue(form, "pending_review_submissions")} pending</Badge>
          <Badge tone={statValue(form, "rejected_returned_submissions") ? "danger" : "neutral"}>
            {statValue(form, "rejected_returned_submissions")} returned/rejected
          </Badge>
        </div>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (form) => (
        <div className="flex justify-end gap-2">
          <Button onClick={() => openForm(form)} size="sm" variant="secondary">
            View data
          </Button>
          <Button onClick={() => openFormData(form.id, "source=uploaded")} size="sm" variant="secondary">
            <UploadCloud aria-hidden="true" />
            Upload
          </Button>
          <Button
            onClick={() => openFormBuilder(form)}
            size="sm"
            variant="ghost"
          >
            Edit
          </Button>
        </div>
      ),
    },
  ];

  if (creationOpen) {
    const builderForm = builderFormId
      ? forms.find((form) => form.id === builderFormId)
      : null;
    return (
      <FormCreationWorkspace
        existingForms={forms}
        initialDuplicateFormId={duplicateSourceFormId}
        initialForm={builderForm}
        onBack={() => {
          if (
            typeof window !== "undefined" &&
            window.location.pathname.replace(/\/+$/, "") === "/forms/create"
          ) {
            window.history.replaceState(null, "", "/forms");
          }
          setCreationOpen(false);
          setBuilderFormId(null);
          setDuplicateSourceFormId(null);
        }}
        token={token}
      />
    );
  }

  if (dataFormId) {
    return (
      <FormDataGridWorkspace
        canExport={hasAnyPermission(principal, ["submissions.export", "reports.export", "forms.manage"])}
        beneficiaryCodes={linkedBeneficiaryCodes}
        form={dataForm}
        formId={dataFormId}
        onBack={() => router.push("/forms/all")}
        searchParams={searchParams}
        submissions={formSubmissions.filter((submission) => submission.form_id === dataFormId)}
        token={token}
      />
    );
  }

  return (
    <section className="space-y-3">
      <div className="rounded-xl border bg-panel p-3.5 shadow-line">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="collect">OPERATIONS</Badge>
              <Badge
                tone={summary.forms_with_quality_issues ? "warning" : "success"}
              >
                {summary.forms_with_quality_issues
                  ? `${summary.forms_with_quality_issues} quality alerts`
                  : "Forms healthy"}
              </Badge>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">Forms</h1>
              <HelpHint label="About Forms" title="Forms">
                Design, publish, version, govern, and manage survey/data
                collection forms with reference data, workflow, quality,
                mapping, permissions, and audit controls.
              </HelpHint>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={!canManageForms}
              onClick={() => {
                setBuilderFormId(null);
                setCreationOpen(true);
              }}
              variant="primary"
            >
              <Plus aria-hidden="true" />
              Create form
            </Button>
            <Button
              onClick={() =>
                downloadCsv(
                  "atlas-forms.csv",
                  forms.map((form) => ({
                    name: form.name,
                    project: form.project_name,
                    version: form.version,
                    status: form.status,
                    owner: form.owner,
                    questions: form.questions,
                    submissions: form.total_submissions,
                  })),
                )
              }
              variant="secondary"
            >
              <Download aria-hidden="true" />
              Export
            </Button>
          </div>
        </div>
        <div
          className="mt-3 flex gap-1.5 overflow-x-auto product-scrollbar"
          aria-label="Forms sections"
        >
          {formsSections.map((section) => (
            <button
              className={cn(
                "shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium transition",
                activeSection === section.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-panel hover:bg-muted",
              )}
              key={section.id}
              onClick={() => openFormsSection(section.id)}
              type="button"
            >
              {section.label}
            </button>
          ))}
        </div>
      </div>

      {selectedForm ? (
        <FormDetailWorkspace
          form={selectedForm}
          forms={forms}
          onClose={() => setSelectedFormId(null)}
          onOpenBuilder={() => {
            openFormBuilder(selectedForm);
          }}
          onOpenDataQuality={() => setActiveView("dataQuality")}
          onOpenMapping={() => setActiveView("map")}
          onOpenSubmissions={() => setActiveView("submissions")}
          submissions={formSubmissionsFor(formSubmissions, selectedForm.id)}
          tab={activeTab}
          setTab={setActiveTab}
        />
      ) : null}

      {!selectedForm && activeSection === "dashboard" ? (
        <FormsDashboard
          forms={forms}
          onOpenForm={openForm}
          onOpenSection={openFormsSection}
          summary={summary}
        />
      ) : null}

      {!selectedForm && activeSection === "analytics" ? (
        <FormsAnalyticsSection
          forms={forms}
          onOpenForm={openForm}
          submissions={formSubmissions}
        />
      ) : null}

      {!selectedForm &&
      ["all", "draft", "published", "archived"].includes(activeSection) ? (
        <section className="space-y-4">
          <SectionHeader
            description={
              formsSections.find((section) => section.id === activeSection)
                ?.description ?? "Manage forms"
            }
            title={
              formsSections.find((section) => section.id === activeSection)
                ?.label ?? "Forms"
            }
          />
          <FormFilters filters={formFilters} forms={visibleForms} onChange={setFormFilters} />
          {activeSection === "all" ? (
            <DataTable
              columns={columns}
              emptyAction={
                canManageForms
                  ? {
                      label: "Create form",
                      onClick: () => {
                        setBuilderFormId(null);
                        setCreationOpen(true);
                      },
                    }
                  : undefined
              }
              emptyDescription="Create a data collection form, publish it, and assign it to field officers to start collecting."
              emptyLabel="No forms match this view yet"
              rows={filteredForms}
              searchLabel="Search forms, projects, owners, status"
              title="Form list"
            />
          ) : (
            <FormStatusCards
              canManageForms={canManageForms}
              forms={filteredForms}
              onAssign={(form) => {
                setActiveView("officers");
                router.push(`/field-operations?formId=${encodeURIComponent(form.id)}`);
              }}
              onDuplicate={(form) => {
                setBuilderFormId(null);
                setDuplicateSourceFormId(form.id);
                setCreationOpen(true);
              }}
              onEdit={(form) => {
                openFormBuilder(form);
              }}
              onOpenData={(form, query) => openFormData(form.id, query)}
              preview={preview}
              section={activeSection}
              token={token}
            />
          )}
        </section>
      ) : null}

      {!selectedForm && activeSection === "templates" ? (
        <TemplatesSection
          onOpenBuilder={() => {
            setBuilderFormId(null);
            setCreationOpen(true);
          }}
          projectSectors={(projectsQuery.data ?? [])
            .map((project) => project.sector_name)
            .filter((sector): sector is string => Boolean(sector))}
          templates={templates}
        />
      ) : null}

      {!selectedForm && activeSection === "reference-data" ? (
        <ReferenceDataSection
          onOpenBuilder={() => {
            setBuilderFormId(null);
            setCreationOpen(true);
          }}
        />
      ) : null}

      {!selectedForm && activeSection === "governance-dashboard" ? (
        <FormsGovernanceDashboard
          forms={forms}
          onOpenForm={openForm}
          onOpenSection={openFormsSection}
        />
      ) : null}
    </section>
  );
}

function FormsDashboard({
  forms,
  onOpenForm,
  onOpenSection,
  summary,
}: {
  forms: FormListItem[];
  onOpenForm: (form: FormListItem, tab?: FormDetailTab) => void;
  onOpenSection: (section: FormsSection) => void;
  summary: ReturnType<typeof computeFormsSummary>;
}) {
  const cards = [
    { icon: FileStack, label: "Total Forms", section: "all" as FormsSection, value: summary.total_forms },
    {
      icon: ClipboardPenLine,
      label: "Draft Forms",
      section: "draft" as FormsSection,
      value: summary.draft_forms,
    },
    {
      icon: Smartphone,
      label: "Published Forms",
      section: "published" as FormsSection,
      value: summary.published_forms,
    },
    { icon: Archive, label: "Archived Forms", section: "archived" as FormsSection, value: summary.archived_forms },
    {
      icon: ClipboardCheck,
      label: "Pending Approval",
      section: "draft" as FormsSection,
      value: summary.pending_approval_forms,
    },
    {
      icon: CheckCircle2,
      label: "Active Collection",
      section: "published" as FormsSection,
      value: summary.active_collection_forms,
    },
    {
      icon: ShieldCheck,
      label: "Quality Issues",
      section: "all" as FormsSection,
      value: summary.forms_with_quality_issues,
    },
    {
      icon: History,
      label: "Recently Updated",
      section: "all" as FormsSection,
      value: summary.recently_updated_forms,
    },
  ];
  const recentlyPublished = forms
    .filter((form) => form.status === "published")
    .slice(0, 4);
  const mostUsed = [...forms]
    .sort((left, right) => right.total_submissions - left.total_submissions)
    .slice(0, 4);
  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <button
            className="rounded-xl border bg-panel p-3 text-left shadow-line transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-soft"
            key={card.label}
            onClick={() => onOpenSection(card.section)}
            type="button"
          >
            <card.icon aria-hidden="true" className="text-primary" size={18} />
            <p className="mt-4 text-2xl font-semibold">{card.value}</p>
            <p className="text-xs text-muted-foreground">{card.label}</p>
          </button>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-xl border bg-panel p-3.5 shadow-line">
          <h2 className="font-semibold">Most Used Forms</h2>
          <div className="mt-4 space-y-3">
            {mostUsed.map((form, index) => (
              <button
                className="w-full rounded-xl border bg-background/50 p-3 text-left transition hover:bg-muted/50"
                key={`${form.id}-most-used-${index}`}
                onClick={() => onOpenForm(form)}
                type="button"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{form.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {form.project_name} · v{form.version}
                    </p>
                  </div>
                  <Badge tone={qualityTone(form.quality_score)}>
                    {form.quality_score}%
                  </Badge>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                  <span>{form.questions} questions</span>
                  <span>{form.active_assignments} assignments</span>
                  <span>{form.total_submissions} submissions</span>
                </div>
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-xl border bg-panel p-3.5 shadow-line">
          <h2 className="font-semibold">Governance Alerts</h2>
          <div className="mt-4 space-y-3">
            <Signal
              label="Forms pending approval"
              value={`${summary.pending_approval_forms}`}
              tone={summary.pending_approval_forms ? "warning" : "success"}
            />
            <Signal
              label="Forms with quality issues"
              value={`${summary.forms_with_quality_issues}`}
              tone={summary.forms_with_quality_issues ? "warning" : "success"}
            />
            <Signal
              label="Active collection forms"
              value={`${summary.active_collection_forms}`}
            />
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-muted/40 p-3 text-sm font-medium">
            Form governance
            <HelpHint label="About form governance" title="Form governance">
              Form governance remains form-level: permissions, workflow, data
              quality, mapping settings, versions, and audit trail belong here.
            </HelpHint>
          </div>
        </div>
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <InsightCard
          icon={History}
          title="Recent Form Activity"
          lines={forms
            .slice(0, 4)
            .map(
              (form) => `${form.name} updated ${formatDate(form.updated_at)}`,
            )}
        />
        <InsightCard
          icon={Smartphone}
          title="Recently Published"
          lines={recentlyPublished.map(
            (form) => `${form.name} · ${form.active_assignments} assignment(s)`,
          )}
        />
        <InsightCard
          icon={GitBranch}
          title="Version Activity"
          lines={forms
            .slice(0, 4)
            .map((form) => `${form.name}: v${form.version} · ${form.status}`)}
        />
      </div>
    </div>
  );
}

function FormsAnalyticsSection({
  forms,
  onOpenForm,
  submissions,
}: {
  forms: FormListItem[];
  onOpenForm: (form: FormListItem, tab?: FormDetailTab) => void;
  submissions: (SubmissionRead | SubmissionRecord)[];
}) {
  const totalSubmissions = submissions.length;
  const approved = submissions.filter((submission) => submission.status === "approved").length;
  const mobile = submissions.filter((submission) => submission.offline_created).length;
  const imported = submissions.filter(isImportedSubmission).length;
  const gpsCompliant = submissions.filter((submission) => submission.latitude && submission.longitude).length;
  const highQualityForms = forms.filter((form) => form.quality_score >= 85).length;
  const topForms = [...forms].sort((left, right) => right.total_submissions - left.total_submissions).slice(0, 6);

  return (
    <section className="space-y-4">
      <SectionHeader
        description="Monitor form completion, source split, approval performance, GPS compliance, question behavior, mobile usage, and data quality from one operational view."
        title="Form Operations Analytics"
      />
      <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
        <MetricCard icon={FileStack} label="Submissions" value={totalSubmissions} />
        <MetricCard icon={CheckCircle2} label="Approval rate" value={`${safeRate(approved, totalSubmissions)}%`} />
        <MetricCard icon={Smartphone} label="Mobile share" value={`${safeRate(mobile, totalSubmissions)}%`} />
        <MetricCard icon={UploadCloud} label="Uploaded records" value={imported} />
        <MetricCard icon={MapPinned} label="GPS compliance" value={`${safeRate(gpsCompliant, totalSubmissions)}%`} />
        <MetricCard icon={ShieldCheck} label="High quality forms" value={highQualityForms} />
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-xl border bg-panel p-3.5 shadow-line">
          <div className="flex items-center gap-2">
            <BarChart3 aria-hidden="true" className="text-primary" size={18} />
            <h3 className="font-semibold">Most active forms</h3>
          </div>
          <div className="mt-3 overflow-auto product-scrollbar">
            <table className="min-w-full border-separate border-spacing-0 text-xs">
              <thead>
                <tr className="bg-muted/60 text-left text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                  {["Form", "Completion", "Approval", "GPS", "Mobile", "Quality"].map((header) => (
                    <th className="border-b px-2 py-2 font-semibold" key={header}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topForms.map((form, index) => {
                  const rows = formSubmissionsFor(submissions, form.id);
                  const approvedRows = rows.filter((submission) => submission.status === "approved").length;
                  const gpsRows = rows.filter((submission) => submission.latitude && submission.longitude).length;
                  const mobileRows = rows.filter((submission) => submission.offline_created).length;
                  return (
                    <tr className="odd:bg-background even:bg-muted/20" key={`${form.id}-top-form-${index}`}>
                      <td className="border-b px-2 py-2">
                        <button className="text-left font-medium hover:text-primary" onClick={() => onOpenForm(form, "Analytics")} type="button">
                          {form.name}
                        </button>
                        <p className="text-[11px] text-muted-foreground">{form.project_name}</p>
                      </td>
                      <td className="border-b px-2 py-2">{formCompletionRate(form, rows)}%</td>
                      <td className="border-b px-2 py-2">{safeRate(approvedRows, rows.length)}%</td>
                      <td className="border-b px-2 py-2">{safeRate(gpsRows, rows.length)}%</td>
                      <td className="border-b px-2 py-2">{safeRate(mobileRows, rows.length)}%</td>
                      <td className="border-b px-2 py-2">
                        <Badge tone={qualityTone(form.quality_score)}>{form.quality_score}%</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
        <section className="rounded-xl border bg-panel p-3.5 shadow-line">
          <div className="flex items-center gap-2">
            <Gauge aria-hidden="true" className="text-primary" size={18} />
            <h3 className="font-semibold">Operational signals</h3>
          </div>
          <div className="mt-3 space-y-2">
            <Signal label="Average duration" value={averageDuration(submissions)} />
            <Signal label="Median duration" value={medianDuration(submissions)} />
            <Signal label="Question analytics source" value="Submitted and uploaded payloads" />
            <Signal label="Clickable drill-down" value="Open any form analytics row" />
          </div>
        </section>
      </div>
    </section>
  );
}

function FormsGovernanceDashboard({
  forms,
  onOpenForm,
  onOpenSection,
}: {
  forms: FormListItem[];
  onOpenForm: (form: FormListItem, tab?: FormDetailTab) => void;
  onOpenSection: (section: FormsSection) => void;
}) {
  const missingApproval = forms.filter((form) => form.pending_approval);
  const missingIndicatorMapping = forms.filter((form) => form.questions > 0 && form.quality_score < 85);
  const missingBeneficiaryMapping = forms.filter((form) => form.form_type.toLowerCase().includes("registration") && !form.linked_beneficiaries);
  const missingWorkflow = forms.filter((form) => form.status === "draft" && form.pending_approval);
  const duplicateControls = forms.filter((form) => form.has_quality_issues);
  const outdated = forms.filter((form) => form.version <= 1 && form.status === "published");
  const notUsedRecently = forms.filter((form) => !form.total_submissions);
  const groups = [
    { forms: missingApproval, label: "Missing approval", tab: "Configuration" as FormDetailTab },
    { forms: missingIndicatorMapping, label: "Missing metric mapping", tab: "Configuration" as FormDetailTab },
    { forms: missingBeneficiaryMapping, label: "Missing entity mapping", tab: "Relationships" as FormDetailTab },
    { forms: missingWorkflow, label: "Workflow needs review", tab: "Configuration" as FormDetailTab },
    { forms: duplicateControls, label: "Quality or duplicate controls", tab: "Configuration" as FormDetailTab },
    { forms: outdated, label: "Outdated version", tab: "Comparison" as FormDetailTab },
    { forms: notUsedRecently, label: "Not used recently", tab: "Analytics" as FormDetailTab },
  ];

  return (
    <section className="space-y-4">
      <SectionHeader
        action={<Button onClick={() => onOpenSection("draft")} variant="secondary">Review drafts</Button>}
        description="Find forms that need approval, metric mapping, entity mapping, duplicate controls, workflow setup, version review, or usage follow-up before field deployment."
        title="Forms Governance Dashboard"
      />
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        {groups.slice(0, 4).map((group) => (
          <MetricCard
            icon={ShieldCheck}
            key={group.label}
            label={group.label}
            value={group.forms.length}
          />
        ))}
      </div>
      <div className="grid gap-3 xl:grid-cols-2">
        {groups.map((group) => (
          <section className="rounded-xl border bg-panel p-3.5 shadow-line" key={group.label}>
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold">{group.label}</h3>
              <Badge tone={group.forms.length ? "warning" : "success"}>{group.forms.length}</Badge>
            </div>
            <div className="mt-3 space-y-2">
              {group.forms.slice(0, 5).map((form, index) => (
                <button
                  className="flex w-full items-center justify-between gap-3 rounded-lg border bg-background/70 p-2 text-left transition hover:border-primary/35 hover:bg-primary/5"
                  key={`${form.id}-${group.label}-${index}`}
                  onClick={() => onOpenForm(form, group.tab)}
                  type="button"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{form.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">{form.project_name} · v{form.version}</span>
                  </span>
                  <Badge tone={statusTone(form.status)}>{form.status}</Badge>
                </button>
              ))}
              {!group.forms.length ? (
                <p className="rounded-lg border border-dashed bg-background/50 p-3 text-sm text-muted-foreground">
                  No forms currently need attention in this category.
                </p>
              ) : null}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}

function FormStatusCards({
  canManageForms,
  forms,
  onAssign,
  onDuplicate,
  onEdit,
  onOpenData,
  preview,
  section,
  token,
}: {
  canManageForms: boolean;
  forms: FormListItem[];
  onAssign: (form: FormListItem) => void;
  onDuplicate: (form: FormListItem) => void;
  onEdit: (form: FormListItem) => void;
  onOpenData: (form: FormListItem, query?: string) => void;
  preview: boolean;
  section: FormsSection;
  token: string | null;
}) {
  const pushToast = useWorkspaceStore((state) => state.pushToast);
  const upsertLocalForm = useWorkspaceStore((state) => state.upsertLocalForm);
  const queryClient = useQueryClient();

  const publishMutation = useMutation({
    mutationFn: async (form: FormListItem) => {
      if (preview || !token) {
        upsertLocalForm(toLocalWorkspaceForm(form, "published"));
        return;
      }
      const schemaResult = await getFormSchema(token, form.id);
      await updateForm(token, form.id, {
        name: form.name,
        description: form.description ?? null,
        schema: schemaResult.schema,
        publish: true,
      });
    },
    onSuccess: async (_data, form) => {
      pushToast({
        title: "Form published",
        description: `"${form.name}" is now available for field collection.`,
        tone: "success",
      });
      if (!preview && token) await queryClient.invalidateQueries({ queryKey: ["forms-module", token] });
    },
    onError: (_error, form) => {
      pushToast({
        title: "Publish failed",
        description: `Could not publish "${form.name}". Try again.`,
        tone: "danger",
      });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async (form: FormListItem) => {
      if (preview || !token) {
        upsertLocalForm(toLocalWorkspaceForm(form, "archived"));
        return;
      }
      await archiveForm(token, form.id);
    },
    onSuccess: async (_data, form) => {
      pushToast({
        title: "Form archived",
        description: `"${form.name}" was moved to Archived.`,
        tone: "success",
      });
      if (!preview && token) await queryClient.invalidateQueries({ queryKey: ["forms-module", token] });
    },
    onError: (_error, form) => {
      pushToast({
        title: "Archive failed",
        description: `Could not archive "${form.name}". Try again.`,
        tone: "danger",
      });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async (form: FormListItem) => {
      if (preview || !token) {
        upsertLocalForm(toLocalWorkspaceForm(form, "published"));
        return;
      }
      await restoreForm(token, form.id);
    },
    onSuccess: async (_data, form) => {
      pushToast({
        title: "Form restored",
        description: `"${form.name}" was moved back to Published.`,
        tone: "success",
      });
      if (!preview && token) await queryClient.invalidateQueries({ queryKey: ["forms-module", token] });
    },
    onError: (_error, form) => {
      pushToast({
        title: "Restore failed",
        description: `Could not restore "${form.name}". Try again.`,
        tone: "danger",
      });
    },
  });

  async function handleExport(form: FormListItem): Promise<void> {
    try {
      const schema = !preview && token ? await getFormSchema(token, form.id) : null;
      downloadJson(`${form.slug}-v${form.version}-archive.json`, schema ? { form, schema } : { form });
      pushToast({
        title: "Form exported",
        description: `"${form.name}" was downloaded as JSON.`,
        tone: "success",
      });
    } catch {
      pushToast({
        title: "Export failed",
        description: `Could not export "${form.name}". Try again.`,
        tone: "danger",
      });
    }
  }

  if (!forms.length) {
    return (
      <div className="rounded-xl border border-dashed bg-panel p-8 text-center">
        <FileStack aria-hidden="true" className="mx-auto text-muted-foreground" size={24} />
        <p className="mt-3 font-medium">No {section} forms yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Forms will appear here when they match this status.
        </p>
      </div>
    );
  }
  return (
    <div className="grid gap-2 md:grid-cols-2 2xl:grid-cols-3">
      {forms.map((form, index) => {
        const readiness = Math.max(
          20,
          Math.min(100, Math.round((form.quality_score + (form.project_id ? 15 : -15)) / 1.15)),
        );
        const isDraft = section === "draft";
        const isPublished = section === "published";
        const isArchived = section === "archived";
        const openPrimary = () => {
          if (isDraft) {
            onEdit(form);
          } else {
            onOpenData(form);
          }
        };
        return (
          <article
            className="rounded-lg border bg-panel p-3 shadow-line transition hover:border-primary/35 hover:shadow-soft"
            key={`${form.id}-card-${index}`}
            onClick={(event) => {
              if ((event.target as HTMLElement).closest("button, a, input, select, textarea")) return;
              openPrimary();
            }}
            onKeyDown={(event) => {
              if (event.key !== "Enter" && event.key !== " ") return;
              event.preventDefault();
              openPrimary();
            }}
            role="button"
            tabIndex={0}
          >
            <div className="block w-full text-left">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={statusTone(form.status)}>{form.status}</Badge>
                    <Badge tone={form.project_id ? "success" : "warning"}>
                    {form.project_id ? "Project attached" : "Project not attached"}
                    </Badge>
                    {isArchived ? <Badge tone="neutral">Read only</Badge> : null}
                  </div>
                  <button
                    className="mt-2 line-clamp-1 text-left text-sm font-semibold transition hover:text-primary"
                    onClick={openPrimary}
                    type="button"
                  >
                    {form.name}
                  </button>
                  <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                    {form.form_type} · {form.owner}
                  </p>
                </div>
                <div className="rounded-lg bg-muted/50 px-2.5 py-1.5 text-right">
                  <p className="text-sm font-semibold">v{form.version}</p>
                  <p className="text-[10px] text-muted-foreground">version</p>
                </div>
              </div>
              <div className="mt-3 grid gap-1.5 text-xs md:grid-cols-2">
                <Signal label="Project" value={form.project_name || "Not attached"} />
                <Signal label="Last updated" value={formatDate(form.updated_at)} />
                <Signal label="Sections" value={`${form.sections}`} />
                <Signal label="Questions" value={`${form.questions}`} />
              </div>
              {isDraft ? (
                <div className="mt-3 rounded-lg border bg-background/60 p-2.5">
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="font-medium">Readiness</span>
                    <span>{readiness}%</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${readiness}%` }} />
                  </div>
                  {!form.project_id ? (
                    <p className="mt-2 text-xs text-warning">
                      Attach this form to a project before publishing if governance requires project context.
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className="mt-3 grid gap-1.5 sm:grid-cols-2 xl:grid-cols-4">
                  <MiniStat label="Total" value={statValue(form, "total_submissions")} onClick={() => onOpenData(form, "filter=all")} />
                  <MiniStat label="Approved" value={statValue(form, "approved_submissions")} onClick={() => onOpenData(form, "status=approved")} />
                  <MiniStat label="Pending" value={statValue(form, "pending_review_submissions")} onClick={() => onOpenData(form, "status=pending_review")} />
                  <MiniStat label="Uploaded" value={statValue(form, "uploaded_records")} onClick={() => onOpenData(form, "source=uploaded")} />
                  <MiniStat label="Field" value={statValue(form, "field_submitted_records")} onClick={() => onOpenData(form, "source=field")} />
                  <MiniStat label="Returned" value={statValue(form, "rejected_returned_submissions")} onClick={() => onOpenData(form, "status=returned")} />
                  <MiniStat label="Entities" value={statValue(form, "linked_beneficiaries")} onClick={() => onOpenData(form, "entity=linked")} />
                  <MiniStat label="Last" value={form.last_submission_at ? formatDate(form.last_submission_at) : "None"} onClick={() => onOpenData(form)} />
                </div>
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5 border-t pt-2.5">
              {isDraft ? (
                <>
                  <Button disabled={!canManageForms} onClick={() => onEdit(form)} size="sm" variant="primary">
                    Continue Editing
                  </Button>
                  <Button onClick={() => onOpenData(form, "source=uploaded")} size="sm" variant="secondary">
                    <UploadCloud aria-hidden="true" />
                    Upload Data
                  </Button>
                  <Button
                    disabled={!canManageForms || !form.project_id || publishMutation.isPending}
                    onClick={() => publishMutation.mutate(form)}
                    size="sm"
                    variant="secondary"
                  >
                    {publishMutation.isPending && publishMutation.variables?.id === form.id ? "Publishing…" : "Publish"}
                  </Button>
                </>
              ) : null}
              {isPublished ? (
                <>
                  <Button onClick={() => onOpenData(form)} size="sm" variant="primary">
                    <Table2 aria-hidden="true" />
                    View Data
                  </Button>
                  <Button onClick={() => onOpenData(form, "source=uploaded")} size="sm" variant="secondary">
                    <UploadCloud aria-hidden="true" />
                    Upload Data
                  </Button>
                  <Button disabled={!canManageForms} onClick={() => onAssign(form)} size="sm" variant="secondary">
                    Assign
                  </Button>
                  <Button disabled={!canManageForms} onClick={() => onEdit(form)} size="sm" variant="secondary">
                    New Version
                  </Button>
                  <Button disabled={!canManageForms} onClick={() => onDuplicate(form)} size="sm" variant="secondary">
                    Duplicate
                  </Button>
                  <Button
                    disabled={!canManageForms || archiveMutation.isPending}
                    onClick={() => archiveMutation.mutate(form)}
                    size="sm"
                    variant="secondary"
                  >
                    {archiveMutation.isPending && archiveMutation.variables?.id === form.id ? "Archiving…" : "Archive"}
                  </Button>
                </>
              ) : null}
              {isArchived ? (
                <>
                  <Button onClick={() => onOpenData(form)} size="sm" variant="primary">
                    View Historical Data
                  </Button>
                  <Button
                    disabled={!canManageForms || restoreMutation.isPending}
                    onClick={() => restoreMutation.mutate(form)}
                    size="sm"
                    variant="secondary"
                  >
                    {restoreMutation.isPending && restoreMutation.variables?.id === form.id ? "Restoring…" : "Restore"}
                  </Button>
                  <Button disabled={!canManageForms} onClick={() => onDuplicate(form)} size="sm" variant="secondary">
                    Duplicate
                  </Button>
                  <Button onClick={() => handleExport(form)} size="sm" variant="secondary">
                    <Download aria-hidden="true" />
                    Export
                  </Button>
                </>
              ) : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}

function MiniStat({
  label,
  onClick,
  value,
}: {
  label: string;
  onClick: () => void;
  value: string | number;
}) {
  return (
    <button
      className="rounded-md border bg-background/70 p-1.5 text-left transition hover:border-primary/40 hover:bg-primary/5"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      type="button"
    >
      <p className="text-sm font-semibold leading-tight">{value}</p>
      <p className="line-clamp-1 text-[10px] text-muted-foreground">{label}</p>
    </button>
  );
}

function DataDictionaryPanel({ onExport, questions }: { onExport: () => void; questions: FormGridQuestion[] }) {
  const sensitiveCount = questions.filter((question) => question.sensitivityLevel && question.sensitivityLevel !== "standard").length;
  const mappedCount = questions.filter((question) => question.indicatorMapping).length;
  return (
    <section className="rounded-xl border bg-panel p-3.5 shadow-line">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="governance">DATA DICTIONARY</Badge>
            <Badge tone="neutral">{questions.length} fields</Badge>
            <Badge tone={sensitiveCount ? "warning" : "success"}>{sensitiveCount} sensitive</Badge>
            <Badge tone={mappedCount ? "success" : "neutral"}>{mappedCount} metric mapped</Badge>
          </div>
          <h2 className="mt-3 text-lg font-semibold">Question dictionary</h2>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Review variable names, definitions, allowed values, metric mapping, sensitivity, and source-of-truth rules before exporting or reporting this form data.
          </p>
        </div>
        <Button onClick={onExport} type="button" variant="secondary">
          <Download aria-hidden="true" />
          Export dictionary
        </Button>
      </div>
      <div className="mt-4 overflow-auto product-scrollbar">
        <table className="min-w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr className="bg-muted/70 text-left text-xs uppercase text-muted-foreground">
              {["Question", "Variable", "Type", "Definition", "Allowed Values", "Metric", "Sensitivity", "Source of Truth"].map((header) => (
                <th className="border-b px-3 py-2 font-semibold" key={header}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {questions.map((question) => (
              <tr className="odd:bg-background even:bg-muted/20" key={question.key}>
                <td className="border-b px-3 py-2 font-medium">{question.label}</td>
                <td className="border-b px-3 py-2 font-mono text-xs">{question.key}</td>
                <td className="border-b px-3 py-2">{question.type}</td>
                <td className="max-w-80 border-b px-3 py-2 text-muted-foreground">{question.definition || "Not defined yet"}</td>
                <td className="max-w-72 border-b px-3 py-2 text-muted-foreground">{question.allowedValues || "Response type or reference list"}</td>
                <td className="border-b px-3 py-2">{question.indicatorMapping || "Not mapped"}</td>
                <td className="border-b px-3 py-2">
                  <Badge tone={question.sensitivityLevel === "restricted" || question.sensitivityLevel === "pii" ? "danger" : question.sensitivityLevel && question.sensitivityLevel !== "standard" ? "warning" : "neutral"}>
                    {question.sensitivityLevel || "standard"}
                  </Badge>
                </td>
                <td className="border-b px-3 py-2">{question.sourceOfTruth || "form_response"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function FormDataGridWorkspace({
  canExport,
  beneficiaryCodes,
  form,
  formId,
  onBack,
  searchParams,
  submissions,
  token,
}: {
  canExport: boolean;
  beneficiaryCodes: Map<string, string>;
  form: FormListItem | null;
  formId: string;
  onBack: () => void;
  searchParams: ReturnType<typeof useSearchParams>;
  submissions: (SubmissionRead | SubmissionRecord)[];
  token: string | null;
}) {
  const [search, setSearch] = useState("");
  const [showDictionary, setShowDictionary] = useState(false);
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") ?? "all");
  const [sourceFilter, setSourceFilter] = useState(searchParams.get("source") ?? "all");
  const [uploading, setUploading] = useState(false);
  const [confirmingImports, setConfirmingImports] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const queryClient = useQueryClient();
  const router = useRouter();
  const pushToast = useWorkspaceStore((state) => state.pushToast);
  const upsertLocalSubmission = useWorkspaceStore((state) => state.upsertLocalSubmission);
  const schemaQuery = useQuery({
    enabled: Boolean(token && token !== "preview-token" && formId),
    queryFn: () => getFormSchema(token ?? "", formId),
    queryKey: ["forms", "data-grid", "schema", token, formId],
  });
  const schemaQuestions = questionsFromSchema(schemaQuery.data ?? null);
  const allQuestionMap = new Map<string, FormGridQuestion>();
  for (const question of [...schemaQuestions, ...payloadColumns(submissions)]) {
    if (!allQuestionMap.has(question.key)) allQuestionMap.set(question.key, question);
  }
  const questions = Array.from(allQuestionMap.values());
  const filteredSubmissions = useMemo(() => {
    const term = search.trim().toLowerCase();
    return submissions.filter((submission) => {
      const source = submissionSourceLabel(submission);
      const entityCode = submissionEntityCode(submission, beneficiaryCodes);
      if (sourceFilter === "uploaded" && !isImportedSubmission(submission)) return false;
      if (sourceFilter === "field" && isImportedSubmission(submission)) return false;
      if (statusFilter !== "all") {
        if (statusFilter === "pending_review") {
          if (!["import_staged", "submitted", "under_review", "pending_review", "resubmitted"].includes(submission.status)) return false;
        } else if (statusFilter === "returned") {
          if (!["rejected", "correction_requested", "needs_correction", "returned"].includes(submission.status)) return false;
        } else if (submission.status !== statusFilter) {
          return false;
        }
      }
      if (!term) return true;
      return [
        displaySubmissionId(submission),
        submission.client_submission_id,
        source,
        submissionActorLabel(submission),
        submission.status,
        entityCode,
        linkedBeneficiaryLabel(submission),
        ...Object.values(submissionAnswerMap(submission)).map(formatCell),
      ].join(" ").toLowerCase().includes(term);
    });
  }, [beneficiaryCodes, search, sourceFilter, statusFilter, submissions]);
  const stagedImportRows = filteredSubmissions.filter(isImportStagedSubmission);
  const confirmableImportRows = stagedImportRows.filter((submission) => !importBlockingIssues(submission).length);
  const stats = buildFormStats(submissions).get(formId) ?? emptyStats();

  async function exportGrid(): Promise<void> {
    if (token && token !== "preview-token") {
      await governExport(token, {
        dataset_type: "form_data_grid",
        export_format: "csv",
        anonymized: false,
        record_count: filteredSubmissions.length,
        filters_json: {
          form_id: formId,
          form_name: form?.name,
          status: statusFilter,
          source: sourceFilter,
          search,
          visible_columns: questions.map((question) => question.key),
        },
      }).catch(() => undefined);
    }
    downloadCsv(
      `${form?.slug ?? formId}-data.csv`,
      filteredSubmissions.map((submission) => ({
        submission_id: displaySubmissionId(submission),
        source: submissionSourceLabel(submission),
        quality_flags: rowQualityWarnings(submission).join("; "),
        submitted_or_uploaded_by: submissionActorLabel(submission),
        submitted_or_uploaded_at: formatDateTime(submission.imported_at ?? submission.submitted_at),
        status: submission.status,
        approved_by: approvalActorLabel(submission),
        approved_at: submission.approved_at ? formatDateTime(submission.approved_at) : "",
        entity_code: submissionEntityCode(submission, beneficiaryCodes),
        linked_participants: linkedBeneficiaryLabel(submission),
        project: form?.project_name ?? submission.project_id ?? "",
        form_version: submission.server_sequence,
        gps_evidence: formatSubmissionGpsEvidence(submission),
        device: formatSubmissionDeviceEvidence(submission),
        ...Object.fromEntries(
          questions.map((question) => [
            question.label,
            formatCell(submissionAnswerMap(submission)[question.key]),
          ]),
        ),
      })),
    );
  }

  function exportDictionary(): void {
    downloadCsv(
      `${form?.slug ?? formId}-data-dictionary.csv`,
      questions.map((question) => ({
        allowed_values: question.allowedValues || "Defined by response type or reference list",
        definition: question.definition || "",
        indicator_mapping: question.indicatorMapping || "",
        label: question.label,
        profile_field: question.profileField || "",
        profile_impact: question.profileImpact || "",
        section: question.section,
        sensitivity_level: question.sensitivityLevel || "standard",
        source_of_truth: question.sourceOfTruth || "form_response",
        type: question.type,
        variable_name: question.key,
      })),
    );
  }

  function downloadTemplate(): void {
    const headers = [
      "entity_code",
      "submitted_at",
      ...questions.map((question) => question.key),
    ];
    downloadCsv(
      `${form?.slug ?? formId}-upload-template.csv`,
      [
        Object.fromEntries(headers.map((header) => [header, ""])) as Record<
          string,
          string
        >,
      ],
    );
    pushToast({
      title: "Form template downloaded",
      description:
        "Fill the CSV in Excel, keep the column headers unchanged, then upload it back to this form.",
      tone: "success",
    });
  }

  async function handleFormDataUpload(file: File | null): Promise<void> {
    if (!file) return;
    setUploading(true);
    try {
      const rows = await readFormUploadRows(file);
      const headers = rows[0]?.map((header) => header.trim()) ?? [];
      const dataRows = rows.slice(1).filter((row) =>
        row.some((value) => value.trim().length > 0),
      );
      if (!headers.length || !dataRows.length) {
        throw new Error("The uploaded file must include headers and at least one data row.");
      }
      const rowObjects = dataRows.map((row) =>
        Object.fromEntries(headers.map((header, columnIndex) => [header, row[columnIndex]?.trim() ?? ""])),
      );
      const questionLookup = new Map<string, FormGridQuestion>();
      for (const question of questions) {
        questionLookup.set(question.key.toLowerCase(), question);
        questionLookup.set(question.label.toLowerCase(), question);
      }
      if (token && token !== "preview-token") {
        const response = await importFormDataRows(token, formId, {
          import_reason: `Form-level upload for ${form?.name ?? formId}`,
          rows: rowObjects,
          source_name: file.name,
          source_system: "Form spreadsheet upload",
        });
        await queryClient.invalidateQueries({ queryKey: ["forms-module", "submissions", token] });
        setSourceFilter("uploaded");
        const missingIssues = response.issues.filter((issue) =>
          issue.issue_type === "missing_column" || issue.issue_type === "missing_value",
        );
        const sampleMissing = missingIssues
          .slice(0, 3)
          .map((issue) => `${issue.question_label ?? issue.field_name ?? "Field"} on row ${issue.row_number}`)
          .join("; ");
        pushToast({
          title: "Form data imported",
          description: sampleMissing
            ? `${response.imported_rows} row(s) staged for cleaning. Missing data found: ${sampleMissing}${missingIssues.length > 3 ? "..." : ""}`
            : `${response.imported_rows} row(s) staged for cleaning with no missing form fields detected. Confirm them when ready.`,
          tone: response.error_count ? "danger" : response.warning_count ? "warning" : "success",
        });
        return;
      }
      const now = new Date().toISOString();
      let importedCount = 0;
      dataRows.forEach((row, rowIndex) => {
        const payload: Record<string, unknown> = {};
        const importIssues: Record<string, unknown>[] = [];
        headers.forEach((header, columnIndex) => {
          const normalizedHeader = header.toLowerCase();
          const question = questionLookup.get(normalizedHeader);
          const value = row[columnIndex]?.trim() ?? "";
          if (!question) return;
          if (!value) {
            importIssues.push({
              field_name: question.key,
              issue_type: "missing_value",
              message: `${question.label} (${question.key}) is missing for this imported row.`,
              question_label: question.label,
              row_number: rowIndex + 1,
              severity: "warning",
              suggested_fix: "Add the value if it exists. The row was still imported for review.",
            });
            return;
          }
          payload[question.key] = value;
        });
        for (const question of questions) {
          if (Object.prototype.hasOwnProperty.call(payload, question.key)) continue;
          importIssues.push({
            field_name: question.key,
            issue_type: "missing_column",
            message: `${question.label} (${question.key}) is missing for this imported row.`,
            question_label: question.label,
            row_number: rowIndex + 1,
            severity: "info",
            suggested_fix: "Add a matching column if the data exists. The row was still imported for review.",
          });
        }
        importedCount += 1;
        const submittedAt =
          row[headers.findIndex((header) => header.toLowerCase() === "submitted_at")] ||
          now;
        const entityCode =
          row[headers.findIndex((header) => header.toLowerCase() === "entity_code")] ||
          null;
        const localId = `upload-${formId}-${Date.now()}-${rowIndex}`;
        const record: SubmissionRecord = {
          accuracy: null,
          approval_rate_hint: 0,
          archived_at: null,
          attachments: [],
          audit_events: [
            {
              action: "Uploaded to form",
              actor: "Current user",
              created_at: now,
              new_value: file.name,
              reason: "Form-level spreadsheet upload",
            },
          ],
          captured_at: submittedAt,
          client_submission_id: `UPL-${new Date().getFullYear()}-${String(rowIndex + 1).padStart(4, "0")}`,
          device_id: "web-form-upload",
          duplicate_risk: "none",
          entity_id: entityCode,
          field_officer_id: "Uploaded file",
          form_id: formId,
          form_name: form?.name ?? "Uploaded form",
          form_version: form?.version ?? 1,
          gps_status: "missing",
          history: [
            {
              action: "Uploaded",
              actor: "Current user",
              comment: file.name,
              created_at: now,
            },
          ],
          id: localId,
          import_batch_id: `local-${Date.now()}`,
          imported_at: now,
          imported_by_user_id: "Current user",
          is_imported: true,
          latitude: 0,
          location_name: "Not captured",
          longitude: 0,
          offline_created: false,
          payload_json: {
            ...payload,
            _import_issues: importIssues,
            _validation_issues: importIssues
              .filter((issue) => issue.severity !== "info")
              .map((issue) => issue.message),
            _quality_status: importIssues.some((issue) => issue.severity !== "info") ? "needs_review" : "ready_for_review",
            _review_required: true,
          },
          project_id: form?.project_id ?? null,
          project_name: form?.project_name ?? "Project not attached",
          quality_flags: [],
          quality_score: 80,
          review_stage: "Pending Review",
          reviewer: "Data reviewer",
          server_sequence: form?.version ?? 1,
          sla_due_at: now,
          source_form_id: formId,
          source_record_id: String(rowIndex + 2),
          source_system: "Form spreadsheet upload",
          status: "import_staged",
          submitted_at: submittedAt,
          supervisor: "Data reviewer",
          survey_id: null,
          sync_received_at: now,
          workflow: [
            {
              action_date: now,
              reviewer: "System",
              sla_status: "On Time",
              stage: "Submitted",
            },
            {
              reviewer: "Data reviewer",
              sla_status: "On Time",
              stage: "Pending Review",
            },
          ],
        };
        upsertLocalSubmission(record);
      });
      if (!importedCount) {
        throw new Error("No uploaded columns matched this form's variable names.");
      }
      setSourceFilter("uploaded");
      pushToast({
        title: "Form data uploaded",
        description: `${importedCount} row(s) were matched to this form and added to the data grid for review.`,
        tone: "success",
      });
    } catch (error) {
      const permissionMessage =
        error instanceof ApiError && error.status === 403
          ? "You need the Data Import permission (data.import) to upload data into forms. Ask an organization owner or admin to open Users & Teams > Permissions, select your profile, and assign a role such as Data Manager or Operations Manager with data.import."
          : null;
      pushToast({
        title: "Upload could not be imported",
        description: permissionMessage ?? (error instanceof Error ? error.message : "Check the file and try again."),
        tone: "danger",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function confirmCleanedImportedRows(): Promise<void> {
    if (!token || token === "preview-token") {
      pushToast({
        title: "Preview import confirmed",
        description: "Preview rows stay local. Sign in to confirm imported form data in the platform.",
        tone: "warning",
      });
      return;
    }
    if (!confirmableImportRows.length) {
      pushToast({
        title: "No cleaned rows ready",
        description: "Open staged rows, fill required missing fields, save edits, then confirm again.",
        tone: "warning",
      });
      return;
    }
    setConfirmingImports(true);
    try {
      const response = await confirmImportedFormDataRows(token, formId, {
        comment: "Cleaned uploaded form data confirmed for platform use.",
        submission_ids: confirmableImportRows.map((submission) => submission.id),
      });
      await queryClient.invalidateQueries({ queryKey: ["forms-module", "submissions", token] });
      setStatusFilter("approved");
      setSourceFilter("uploaded");
      pushToast({
        title: "Imported data confirmed",
        description: `${response.confirmed_rows} row(s) are now approved and ready for dashboards, reports, metrics, and entity linkage.${response.skipped_rows ? ` ${response.skipped_rows} row(s) still need cleaning.` : ""}`,
        tone: response.skipped_rows ? "warning" : "success",
      });
    } catch (error) {
      pushToast({
        title: "Could not confirm import",
        description: error instanceof Error ? error.message : "Clean staged rows and try again.",
        tone: "danger",
      });
    } finally {
      setConfirmingImports(false);
    }
  }

  return (
    <section className="space-y-3">
      <div className="rounded-xl border bg-panel p-3.5 shadow-line">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="collect">FORM DATA</Badge>
              <Badge tone={form?.status === "published" ? "success" : "neutral"}>
                {form?.status ?? "Unknown form"}
              </Badge>
              <Badge tone="accent">{filteredSubmissions.length} visible rows</Badge>
            </div>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight">
              {form?.name ?? "Form data"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Spreadsheet-style view of submissions, uploaded records, approval
              status, source attribution, and every question response.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={onBack} variant="secondary">
              <ArrowLeft aria-hidden="true" />
              Back to forms
            </Button>
            <Button onClick={downloadTemplate} variant="secondary">
              <Download aria-hidden="true" />
              Download sample
            </Button>
            <Button
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              variant="secondary"
            >
              <UploadCloud aria-hidden="true" />
              {uploading ? "Uploading" : "Upload data"}
            </Button>
            <Button
              disabled={confirmingImports || !confirmableImportRows.length}
              onClick={() => void confirmCleanedImportedRows()}
              variant="primary"
            >
              <CheckCircle2 aria-hidden="true" />
              {confirmingImports ? "Confirming" : "Confirm cleaned rows"}
            </Button>
            <input
              accept=".csv,.tsv,.txt,.xlsx"
              className="hidden"
              onChange={(event) =>
                void handleFormDataUpload(event.target.files?.[0] ?? null)
              }
              ref={fileInputRef}
              type="file"
            />
            <Button disabled={!canExport || !filteredSubmissions.length} onClick={exportGrid} variant="secondary">
              <Download aria-hidden="true" />
              Export grid
            </Button>
            <Button onClick={() => setShowDictionary((value) => !value)} variant="secondary">
              <Database aria-hidden="true" />
              Data dictionary
            </Button>
          </div>
        </div>
        <div className="mt-4 grid gap-2 md:grid-cols-4">
          <MiniStat label="Total submissions" value={stats.total_submissions} onClick={() => setStatusFilter("all")} />
          <MiniStat label="Approved" value={stats.approved_submissions} onClick={() => setStatusFilter("approved")} />
          <MiniStat label="Uploaded / imported" value={stats.uploaded_records} onClick={() => setSourceFilter("uploaded")} />
          <MiniStat label="Field submitted" value={stats.field_submitted_records} onClick={() => setSourceFilter("field")} />
        </div>
      </div>

      <div className="rounded-xl border bg-panel p-3.5 shadow-line">
        <div className="grid gap-3 xl:grid-cols-[1fr_180px_180px]">
          <label className="relative">
            <Database aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={15} />
            <Input className="pl-9" onChange={(event) => setSearch(event.target.value)} placeholder="Search any response, submission ID, source, officer, or status" value={search} />
          </label>
          <Select onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}>
            <option value="all">All statuses</option>
            <option value="import_staged">Import staged</option>
            <option value="pending_review">Pending review</option>
            <option value="approved">Approved</option>
            <option value="returned">Returned/rejected</option>
          </Select>
          <Select onChange={(event) => setSourceFilter(event.target.value)} value={sourceFilter}>
            <option value="all">All sources</option>
            <option value="field">Field/mobile</option>
            <option value="uploaded">Uploaded/imported</option>
          </Select>
        </div>
      </div>

      {stagedImportRows.length ? (
        <div className="rounded-xl border border-warning/30 bg-warning/8 p-3 text-sm">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-semibold">{stagedImportRows.length} uploaded row(s) are staged for cleaning.</p>
              <p className="text-muted-foreground">
                Clean rows with missing required fields, then confirm cleaned rows before they feed dashboards, reports, metrics, or entity profiles.
              </p>
            </div>
            <Button
              disabled={confirmingImports || !confirmableImportRows.length}
              onClick={() => void confirmCleanedImportedRows()}
              size="sm"
              variant="primary"
            >
              <CheckCircle2 aria-hidden="true" />
              Confirm {confirmableImportRows.length} cleaned
            </Button>
          </div>
        </div>
      ) : null}

      {showDictionary ? (
        <DataDictionaryPanel
          onExport={exportDictionary}
          questions={questions}
        />
      ) : null}

      <div className="rounded-xl border bg-panel shadow-line">
        <div className="max-h-[72vh] overflow-auto product-scrollbar">
          <table className="min-w-[1180px] border-separate border-spacing-0 text-xs">
            <thead>
              <tr className="bg-muted/70 text-left text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                {["Submission ID", "Source", "Quality Flags", "Submitted / Uploaded By", "Submitted / Uploaded At", "Status", "Approval", "Primary Entity", "Participants", "GPS Evidence", "Device", "Project", "Version", "Actions"].map((header, index) => (
                  <th
                    className={cn(
                      "sticky top-0 z-20 whitespace-nowrap border-b px-2.5 py-2 font-semibold",
                      index === 0 ? "left-0 z-30 bg-muted" : "bg-muted/70",
                    )}
                    key={header}
                  >
                    {header}
                  </th>
                ))}
                {questions.map((question) => (
                  <th className="sticky top-0 z-10 min-w-44 border-b bg-muted/70 px-2.5 py-2 font-semibold" key={question.key}>
                    <div className="flex items-center gap-1.5">
                      <span className="line-clamp-1 normal-case tracking-normal text-foreground">{question.label}</span>
                      <HelpHint label={`About ${question.label}`} title="Data dictionary">
                        <div className="space-y-1">
                          {questionDictionaryLines(question).map((line) => (
                            <p key={line}>{line}</p>
                          ))}
                        </div>
                      </HelpHint>
                    </div>
                    <div className="mt-0.5 truncate normal-case tracking-normal text-muted-foreground">
                      {question.key} · {question.type}
                    </div>
                    {question.sensitivityLevel && question.sensitivityLevel !== "standard" ? (
                      <Badge tone={question.sensitivityLevel === "restricted" || question.sensitivityLevel === "pii" ? "danger" : "warning"}>
                        {question.sensitivityLevel}
                      </Badge>
                    ) : null}
                    {question.profileField ? (
                      <Badge tone="success">Profile: {question.profileField}</Badge>
                    ) : null}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredSubmissions.map((submission) => (
                <tr className="odd:bg-background even:bg-muted/20" key={submission.id}>
                  <td className="sticky left-0 z-10 whitespace-nowrap border-b bg-inherit px-2.5 py-2 font-medium">
                    <span title={submission.client_submission_id}>{displaySubmissionId(submission)}</span>
                  </td>
                  <td className="border-b px-2.5 py-2">
                    <Badge tone={isImportedSubmission(submission) ? "warning" : "success"}>
                      {submissionSourceLabel(submission)}
                    </Badge>
                    {submission.source_system ? (
                      <p className="mt-1 text-xs text-muted-foreground">{submission.source_system}</p>
                    ) : null}
                  </td>
                  <td className="border-b px-2.5 py-2">
                    <div className="flex max-w-64 flex-wrap gap-1">
                      {rowQualityWarnings(submission).map((warning) => (
                        <Badge
                          key={warning}
                          tone={
                            warning === "Beneficiary created" || warning === "Beneficiary linked"
                              ? "success"
                              : warning === "Pending review" || warning === "Profile update review"
                                ? "warning"
                                : "danger"
                          }
                        >
                          {warning}
                        </Badge>
                      ))}
                      {!rowQualityWarnings(submission).length ? <Badge tone="success">Clean</Badge> : null}
                    </div>
                  </td>
                  <td className="whitespace-nowrap border-b px-2.5 py-2">{submissionActorLabel(submission)}</td>
                  <td className="whitespace-nowrap border-b px-2.5 py-2">{formatDateTime(submission.imported_at ?? submission.submitted_at)}</td>
                  <td className="border-b px-2.5 py-2">
                    <Badge tone={statusTone(submission.status)}>{submission.status}</Badge>
                  </td>
                  <td className="whitespace-nowrap border-b px-2.5 py-2">
                    <span className={!submission.approved_at ? "text-muted-foreground" : undefined}>
                      {approvalCellLabel(submission)}
                    </span>
                  </td>
                  <td className="whitespace-nowrap border-b px-2.5 py-2">{submissionEntityCode(submission, beneficiaryCodes)}</td>
                  <td className="max-w-56 whitespace-nowrap border-b px-2.5 py-2">
                    <span title={(submission.linked_beneficiaries ?? []).map((link) => `${link.beneficiary_uid} ${link.display_name}`).join(", ")}>
                      {linkedBeneficiaryLabel(submission)}
                    </span>
                  </td>
                  <td className="whitespace-nowrap border-b px-2.5 py-2">
                    <span className={cn(!submissionHasUsableGps(submission) && "text-muted-foreground")}>
                      {formatSubmissionGpsEvidence(submission)}
                    </span>
                    {submissionHasUsableGps(submission) && submission.accuracy && submission.accuracy > 20 ? (
                      <p className="mt-1 text-[11px] text-warning">Poor accuracy; review location evidence.</p>
                    ) : null}
                  </td>
                  <td className="whitespace-nowrap border-b px-2.5 py-2">
                    <p className="max-w-44 truncate font-mono text-[11px]">{formatSubmissionDeviceEvidence(submission)}</p>
                    {submission.offline_created ? <p className="text-[11px] text-muted-foreground">Mobile offline sync</p> : null}
                  </td>
                  <td className="whitespace-nowrap border-b px-2.5 py-2">{form?.project_name ?? submission.project_id ?? "Project missing"}</td>
                  <td className="whitespace-nowrap border-b px-2.5 py-2">v{submission.server_sequence}</td>
                  <td className="whitespace-nowrap border-b px-2.5 py-2">
                    {isImportStagedSubmission(submission) ? (
                      <Button
                        onClick={() => router.push(`/submissions/all?submissionId=${submission.id}&tab=Responses`)}
                        size="sm"
                        variant="secondary"
                      >
                        <ClipboardPenLine aria-hidden="true" />
                        Clean row
                      </Button>
                    ) : (
                      <Button
                        onClick={() => router.push(`/submissions/all?submissionId=${submission.id}`)}
                        size="sm"
                        variant="ghost"
                      >
                        View
                      </Button>
                    )}
                  </td>
                  {questions.map((question) => (
                    <td className="max-w-60 border-b px-2.5 py-2 align-top" key={`${submission.id}-${question.key}`}>
                      <div className="max-h-20 overflow-auto whitespace-pre-wrap break-words rounded bg-background/65 p-1.5 leading-relaxed">
                        {formatCell(submissionAnswerMap(submission)[question.key]) || <span className="text-muted-foreground">Blank</span>}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {!filteredSubmissions.length ? (
            <div className="p-10 text-center">
              <Table2 aria-hidden="true" className="mx-auto text-muted-foreground" size={24} />
              <p className="mt-3 font-medium">No data rows match this view</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Upload historical data, sync mobile submissions, or clear the filters.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function FormDetailWorkspace({
  form,
  forms,
  onClose,
  onOpenBuilder,
  onOpenDataQuality,
  onOpenMapping,
  onOpenSubmissions,
  setTab,
  submissions,
  tab,
}: {
  form: FormListItem;
  forms: FormListItem[];
  onClose: () => void;
  onOpenBuilder: () => void;
  onOpenDataQuality: () => void;
  onOpenMapping: () => void;
  onOpenSubmissions: () => void;
  setTab: (tab: FormDetailTab) => void;
  submissions: (SubmissionRead | SubmissionRecord)[];
  tab: FormDetailTab;
}) {
  return (
    <section className="space-y-4 rounded-xl border bg-panel p-3.5 shadow-line">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={statusTone(form.status)}>{form.status}</Badge>
            <Badge tone={qualityTone(form.quality_score)}>
              Quality {form.quality_score}%
            </Badge>
            <Badge tone="collect">v{form.version}</Badge>
          </div>
          <h2 className="mt-3 text-xl font-semibold">{form.name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {form.project_name} · {form.survey_name} · {form.owner}
          </p>
        </div>
        <Button onClick={onClose} variant="secondary">
          Back to list
        </Button>
      </div>
      <div className="flex gap-2 overflow-x-auto product-scrollbar">
        {formDetailTabs.map((item) => (
          <button
            className={cn(
              "shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium",
              tab === item
                ? "border-primary bg-primary text-primary-foreground"
                : "hover:bg-muted",
            )}
            key={item}
            onClick={() => setTab(item)}
            type="button"
          >
            {item}
          </button>
        ))}
      </div>
      {tab === "Overview" ? <FormOverview form={form} /> : null}
      {tab === "Analytics" ? (
        <FormAnalyticsPanel form={form} submissions={submissions} />
      ) : null}
      {tab === "Configuration" ? (
        <FormConfigurationGrid
          form={form}
          onOpenBuilder={onOpenBuilder}
          onOpenDataQuality={onOpenDataQuality}
          onOpenMapping={onOpenMapping}
          onOpenSubmissions={onOpenSubmissions}
        />
      ) : null}
      {tab === "Relationships" ? (
        <FormRelationshipsPanel form={form} forms={forms} submissions={submissions} />
      ) : null}
      {tab === "Translations" ? <FormTranslationsPanel form={form} /> : null}
      {tab === "Offline Readiness" ? <FormOfflineReadinessPanel form={form} /> : null}
      {tab === "Comparison" ? <FormComparisonPanel form={form} /> : null}
    </section>
  );
}

function FormConfigurationGrid({
  form,
  onOpenBuilder,
  onOpenDataQuality,
  onOpenMapping,
  onOpenSubmissions,
}: {
  form: FormListItem;
  onOpenBuilder: () => void;
  onOpenDataQuality: () => void;
  onOpenMapping: () => void;
  onOpenSubmissions: () => void;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      <FormTabCard
        actionLabel="Open Builder"
        icon={ClipboardPenLine}
        onAction={onOpenBuilder}
        title="Professional Survey Builder"
        lines={[
          "Approved route: /forms/:formId/builder.",
          "Question library, templates, drag-and-drop ordering, inline editing, validation, logic, calculations, preview, import, and deployment all live in the builder.",
          `${form.questions} questions across ${form.sections} section(s).`,
        ]}
      />
      <FormTabCard
        actionLabel="Open Builder"
        icon={ClipboardPenLine}
        onAction={onOpenBuilder}
        title="Question Structure"
        lines={[
          "Questions are managed through the canonical builder so there is no duplicate form designer.",
          "Use sections, groups, repeat groups, variable names, validation, option lists, reference bindings, and logic from the builder.",
          "Published versions remain protected; edits create draft versions before publishing.",
        ]}
      />
      <FormTabCard
        actionLabel="Manage in Builder"
        icon={Database}
        onAction={onOpenBuilder}
        title="Reference Data Binding"
        lines={[
          "Bind fields to countries, regions, districts, communities, facilities, funders, entities, and custom lists.",
          "Support controlled values, hierarchy, active/inactive values, effective dates, and version-aware warnings.",
          "Prevent invalid free-text values when controlled lists are required.",
        ]}
      />
      <FormTabCard
        actionLabel="Manage Permissions"
        icon={ShieldCheck}
        onAction={onOpenBuilder}
        title="Form Access Control"
        lines={[
          "Configure role, user, team, project, and location-level access.",
          "Control view, edit, publish, archive, assign, export, review, approve, and manage controls permissions.",
          "Field officers should only see assigned published forms.",
        ]}
      />
      <FormTabCard
        actionLabel="Configure Workflow"
        icon={Workflow}
        onAction={onOpenBuilder}
        title="Approval Workflow"
        lines={[
          "Simple, standard, and correction workflows are configurable per form.",
          "Reviewer role, team, location scope, required comments, and SLA rules are form-level settings.",
          "Submission decisions remain in Submissions, with form workflow determining the path.",
        ]}
      />
      <FormTabCard
        actionLabel="Open Data Quality"
        icon={ClipboardCheck}
        onAction={onOpenDataQuality}
        title="Data Quality Rules"
        lines={[
          "Required fields, ranges, duplicate detection, outliers, GPS validation, consent checks, duration rules, and severity controls.",
          "Critical rules can block submission or route records for correction.",
          "Detailed investigation belongs in Data Quality.",
        ]}
      />
      <FormTabCard
        actionLabel="Manage Governance"
        icon={ShieldCheck}
        onAction={onOpenBuilder}
        title="Form Governance"
        lines={[
          "Set status, consent, edits after approval, duplicate prevention, retention, masking, export restrictions, and record locking.",
          "High-risk changes require reason capture and immutable audit evidence.",
          "Governance Administration remains outside Forms; this is form-level governance only.",
        ]}
      />
      <FormTabCard
        actionLabel="Open Mapping"
        icon={MapPinned}
        onAction={onOpenMapping}
        title="Form Mapping Settings"
        lines={[
          "Require GPS, set accuracy thresholds, boundary validation, allowed collection areas, coordinate masking, and duplicate GPS detection.",
          "GIS analysis remains in Mapping; Forms only defines collection behavior.",
          "Submission GPS evidence stays tied to the form version used in the field.",
        ]}
      />
      <FormTabCard
        actionLabel="Open Preview Flow"
        icon={Smartphone}
        onAction={onOpenBuilder}
        title="Preview & Test"
        lines={[
          "Approved route: /forms/:formId/preview.",
          "Test web, tablet, mobile, enumerator, and respondent modes before publishing.",
          "Preview runs are test-only and do not count as real submissions.",
        ]}
      />
      <FormTabCard
        actionLabel="Open Publish Review"
        icon={ClipboardCheck}
        onAction={onOpenBuilder}
        title="Publish Readiness Review"
        lines={[
          "Approved route: /forms/:formId/review.",
          "Publishing is blocked when critical checks fail: missing project, no questions, duplicate variables, invalid logic, or unreviewed controls.",
          "Publishing creates an immutable version and makes the form available for field assignments.",
        ]}
      />
      <FormTabCard
        actionLabel="Open Builder"
        icon={GitBranch}
        onAction={onOpenBuilder}
        title="Version History"
        lines={[
          `Current version: v${form.version}.`,
          "Published forms are never overwritten silently.",
          "Old submissions remain linked to the exact version used during collection.",
        ]}
      />
      <FormTabCard
        actionLabel="Open Submissions"
        icon={History}
        onAction={onOpenSubmissions}
        title="Audit Trail"
        lines={[
          "Track form created, question changes, rule changes, permissions, workflow, publish, archive, export, and submission events.",
          "Audit records are immutable and integrate with Governance Audit Trail.",
          "Authorized users can filter/export logs for form accountability.",
        ]}
      />
    </div>
  );
}

function FormOverview({ form }: { form: FormListItem }) {
  return (
    <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
      <div className="rounded-2xl border bg-background/50 p-5">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">Form Overview</h3>
          <HelpHint label="About this form" title="Form Overview">
            {form.description ?? "No description has been added yet."}
          </HelpHint>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Signal label="Project" value={form.project_name} />
          <Signal label="Owner" value={form.owner} />
          <Signal label="Current Version" value={`v${form.version}`} />
          <Signal label="Status" value={form.status} />
          <Signal
            label="Active Assignments"
            value={`${form.active_assignments}`}
          />
          <Signal
            label="Total Submissions"
            value={`${form.total_submissions}`}
          />
        </div>
      </div>
      <div className="rounded-2xl border bg-background/50 p-5">
        <h3 className="font-semibold">Builder & Governance Summary</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Signal label="Questions" value={`${form.questions}`} />
          <Signal label="Sections" value={`${form.sections}`} />
          <Signal
            label="Workflow Status"
            value={form.pending_approval ? "Pending approval" : "Configured"}
            tone={form.pending_approval ? "warning" : "success"}
          />
          <Signal
            label="Quality Score"
            value={`${form.quality_score}%`}
            tone={form.quality_score >= 70 ? "success" : "warning"}
          />
        </div>
      </div>
    </div>
  );
}

function FormAnalyticsPanel({
  form,
  submissions,
}: {
  form: FormListItem;
  submissions: (SubmissionRead | SubmissionRecord)[];
}) {
  const approved = submissions.filter((submission) => submission.status === "approved").length;
  const returned = submissions.filter((submission) =>
    ["rejected", "correction_requested", "needs_correction", "returned"].includes(submission.status),
  ).length;
  const corrected = submissions.filter((submission) =>
    "history" in submission &&
    submission.history?.some((event) => event.action.toLowerCase().includes("correct")),
  ).length;
  const gps = submissions.filter((submission) => submission.latitude && submission.longitude).length;
  const photo = submissions.filter((submission) =>
    "attachments" in submission && submission.attachments?.length,
  ).length;
  const questionAnalytics = buildQuestionAnalytics(submissions).slice(0, 10);

  return (
    <div className="space-y-4">
      <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
        <MetricCard icon={FileStack} label="Total submissions" value={submissions.length} />
        <MetricCard icon={CheckCircle2} label="Completion" value={`${formCompletionRate(form, submissions)}%`} />
        <MetricCard icon={ShieldCheck} label="Approval rate" value={`${safeRate(approved, submissions.length)}%`} />
        <MetricCard icon={ClipboardCheck} label="Returned/rejected" value={`${safeRate(returned, submissions.length)}%`} />
        <MetricCard icon={MapPinned} label="GPS compliance" value={`${safeRate(gps, submissions.length)}%`} />
        <MetricCard icon={UploadCloud} label="Photo/file compliance" value={`${safeRate(photo, submissions.length)}%`} />
      </div>
      <div className="grid gap-4 xl:grid-cols-[1fr_0.85fr]">
        <section className="rounded-xl border bg-background/50 p-3.5">
          <div className="flex items-center gap-2">
            <BarChart3 aria-hidden="true" className="text-primary" size={18} />
            <h3 className="font-semibold">Question analytics</h3>
          </div>
          <div className="mt-3 overflow-auto product-scrollbar">
            <table className="min-w-full border-separate border-spacing-0 text-xs">
              <thead>
                <tr className="bg-muted/60 text-left text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                  {["Question", "Responses", "Missing", "Skip Rate", "Validation", "Common Answer", "Average", "Outliers"].map((header) => (
                    <th className="border-b px-2 py-2 font-semibold" key={header}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {questionAnalytics.map((question) => (
                  <tr className="odd:bg-background even:bg-muted/20" key={question.key}>
                    <td className="border-b px-2 py-2 font-medium">{question.key.replaceAll("_", " ")}</td>
                    <td className="border-b px-2 py-2">{question.responseCount}</td>
                    <td className="border-b px-2 py-2">{question.missing}</td>
                    <td className="border-b px-2 py-2">{question.skipRate}%</td>
                    <td className="border-b px-2 py-2">{question.validationFailures}</td>
                    <td className="border-b px-2 py-2">{question.mostCommon}</td>
                    <td className="border-b px-2 py-2">{question.average}</td>
                    <td className="border-b px-2 py-2">{question.outliers}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!questionAnalytics.length ? (
              <p className="rounded-lg border border-dashed bg-panel p-4 text-sm text-muted-foreground">
                Question analytics will appear after this form receives submissions or uploaded rows.
              </p>
            ) : null}
          </div>
        </section>
        <section className="rounded-xl border bg-background/50 p-3.5">
          <div className="flex items-center gap-2">
            <Gauge aria-hidden="true" className="text-primary" size={18} />
            <h3 className="font-semibold">Usage analytics</h3>
          </div>
          <div className="mt-3 grid gap-2">
            <Signal label="Projects using form" value={form.project_name || "Not attached"} />
            <Signal label="Assignments using form" value={`${form.active_assignments}`} />
            <Signal label="Mobile vs web" value={`${submissions.filter((submission) => submission.offline_created).length} mobile · ${submissions.filter((submission) => !submission.offline_created && !isImportedSubmission(submission)).length} web/field`} />
            <Signal label="Uploaded/imported" value={`${submissions.filter(isImportedSubmission).length}`} />
            <Signal label="Average duration" value={averageDuration(submissions)} />
            <Signal label="Median duration" value={medianDuration(submissions)} />
            <Signal label="Correction rate" value={`${safeRate(corrected, submissions.length)}%`} />
            <Signal label="Data quality score" value={`${form.quality_score}%`} tone={form.quality_score >= 70 ? "success" : "warning"} />
          </div>
        </section>
      </div>
    </div>
  );
}

function FormRelationshipsPanel({
  form,
  forms,
  submissions,
}: {
  form: FormListItem;
  forms: FormListItem[];
  submissions: (SubmissionRead | SubmissionRecord)[];
}) {
  const related = relatedFormsFor(form, forms);
  const currentIndex = Math.max(0, related.findIndex((candidate) => candidate.id === form.id));
  const triggerRules = [
    {
      action: "Create baseline assignment",
      condition: "Registration approved",
      delay: "Immediately",
      target: related.find((candidate) => formJourneyRank(candidate) === 2)?.name ?? "Baseline form",
    },
    {
      action: "Schedule follow-up",
      condition: "Monitoring risk score is high",
      delay: "7 days",
      target: "Field officer task",
    },
    {
      action: "Create alert",
      condition: "Critical data quality flag",
      delay: "Immediately",
      target: "Data Quality queue",
    },
  ];

  return (
    <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
      <section className="rounded-xl border bg-background/50 p-3.5">
        <div className="flex items-center gap-2">
          <Link2 aria-hidden="true" className="text-primary" size={18} />
          <h3 className="font-semibold">Related form chain</h3>
        </div>
        <div className="mt-4 space-y-2">
          {related.map((candidate, index) => (
            <div
              className={cn(
                "rounded-lg border bg-panel p-3",
                candidate.id === form.id && "border-primary bg-primary/5",
              )}
              key={candidate.id}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">
                    Step {index + 1}: {candidate.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {candidate.form_type} · {candidate.status} · {candidate.total_submissions} records
                  </p>
                </div>
                <Badge tone={index < currentIndex ? "success" : index === currentIndex ? "accent" : "neutral"}>
                  {index < currentIndex ? "Prerequisite" : index === currentIndex ? "Current" : "Follow-up"}
                </Badge>
              </div>
            </div>
          ))}
          {!related.length ? (
            <p className="rounded-lg border border-dashed bg-panel p-4 text-sm text-muted-foreground">
              Related forms will appear when this project has a registration, baseline, monitoring, or endline chain.
            </p>
          ) : null}
        </div>
      </section>
      <section className="rounded-xl border bg-background/50 p-3.5">
        <div className="flex items-center gap-2">
          <Zap aria-hidden="true" className="text-primary" size={18} />
          <h3 className="font-semibold">Longitudinal and trigger rules</h3>
        </div>
        <div className="mt-3 grid gap-2">
          <Signal label="Tracking series" value={`${form.project_name} journey`} />
          <Signal label="Beneficiaries with records" value={`${new Set(submissions.map((submission) => submission.entity_id).filter(Boolean)).size}`} />
          <Signal label="Expected next step" value={related[currentIndex + 1]?.name ?? "End of chain"} />
        </div>
        <div className="mt-4 space-y-2">
          {triggerRules.map((rule) => (
            <div className="rounded-lg border bg-panel p-2 text-sm" key={`${rule.condition}-${rule.action}`}>
              <p className="font-medium">{rule.condition}</p>
              <p className="text-xs text-muted-foreground">
                Then {rule.action.toLowerCase()} for {rule.target} · {rule.delay}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function FormTranslationsPanel({ form }: { form: FormListItem }) {
  const languages = ["English", "French", "Arabic", "Swahili", "Spanish", "Portuguese"];
  return (
    <section className="rounded-xl border bg-background/50 p-3.5">
      <div className="flex items-center gap-2">
        <Languages aria-hidden="true" className="text-primary" size={18} />
        <h3 className="font-semibold">Translation management</h3>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        One form can carry multiple language layers. Missing translations are tracked without duplicating the form.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {languages.map((language) => {
          const completeness = language === "English" ? 100 : translationCompleteness(form, language);
          return (
            <div className="rounded-lg border bg-panel p-3" key={language}>
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">{language}</p>
                <Badge tone={completeness === 100 ? "success" : completeness >= 75 ? "accent" : "warning"}>
                  {completeness}%
                </Badge>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${completeness}%` }} />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {completeness === 100 ? "Ready for field use." : `${Math.max(0, form.questions - Math.round((form.questions * completeness) / 100))} question labels or options need translation.`}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function FormOfflineReadinessPanel({ form }: { form: FormListItem }) {
  const issues = offlineReadinessIssues(form);
  const estimatedSize = Math.max(1, Math.round((form.questions * 0.18 + form.sections * 0.35 + (form.active_assignments ? 2 : 0)) * 10) / 10);
  const unsupported = form.questions > 120 ? ["Very large repeat groups need field testing"] : [];
  return (
    <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
      <section className="rounded-xl border bg-background/50 p-3.5">
        <div className="flex items-center gap-2">
          <Smartphone aria-hidden="true" className="text-primary" size={18} />
          <h3 className="font-semibold">Offline package readiness</h3>
        </div>
        <div className="mt-3 grid gap-2">
          <Signal label="Offline compatible" value={issues.length ? "Needs review" : "Yes"} tone={issues.length ? "warning" : "success"} />
          <Signal label="Estimated download size" value={`${estimatedSize} MB`} />
          <Signal label="Reference data size" value={form.questions > 50 ? "Medium" : "Small"} />
          <Signal label="Required permissions" value="Network, storage, GPS if mapped, camera if media" />
          <Signal label="Media requirements" value={form.form_type.toLowerCase().includes("evidence") ? "Photo/signature likely" : "Optional"} />
        </div>
      </section>
      <section className="rounded-xl border bg-background/50 p-3.5">
        <h3 className="font-semibold">Readiness findings</h3>
        <div className="mt-3 space-y-2">
          {[...issues, ...unsupported].map((issue) => (
            <div className="rounded-lg border border-warning/25 bg-warning/10 p-2 text-sm text-muted-foreground" key={issue}>
              {issue}
            </div>
          ))}
          {!issues.length && !unsupported.length ? (
            <div className="rounded-lg border border-success/25 bg-success/10 p-3 text-sm text-muted-foreground">
              This form is ready to package for assigned mobile field officers.
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function FormComparisonPanel({ form }: { form: FormListItem }) {
  const changes = [
    ["Questions added", Math.max(0, Math.round(form.questions * 0.08))],
    ["Questions removed", form.version > 1 ? 1 : 0],
    ["Question labels changed", Math.max(1, Math.round(form.questions * 0.12))],
    ["Variable names changed", form.version > 1 ? 0 : "N/A"],
    ["Validation changed", Math.max(1, Math.round(form.questions * 0.1))],
    ["Logic changed", form.sections > 3 ? 2 : 0],
    ["Reference data changed", form.has_quality_issues ? 2 : 0],
    ["Entity or metric mapping changed", form.pending_approval ? 3 : 1],
  ] satisfies [string, string | number][];
  return (
    <section className="rounded-xl border bg-background/50 p-3.5">
      <div className="flex items-center gap-2">
        <GitBranch aria-hidden="true" className="text-primary" size={18} />
        <h3 className="font-semibold">Version comparison</h3>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Compare the current governed version with the prior version before publishing, assigning, or reporting.
      </p>
      <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        {changes.map(([label, value]) => (
          <Signal key={label} label={label} value={String(value)} tone={value === 0 || value === "N/A" ? "success" : "warning"} />
        ))}
      </div>
      <div className="mt-4 rounded-lg border bg-panel p-3 text-sm text-muted-foreground">
        Current comparison: v{Math.max(1, form.version - 1)} to v{form.version}. Detailed schema comparison will use saved form version records when the backend comparison endpoint is connected.
      </div>
    </section>
  );
}

function TemplatesSection({
  onOpenBuilder,
  projectSectors,
  templates,
}: {
  onOpenBuilder: () => void;
  projectSectors: string[];
  templates: typeof previewTemplates;
}) {
  const uniqueSectors = Array.from(new Set(projectSectors)).slice(0, 6);
  return (
    <section className="space-y-4">
      <SectionHeader
        action={
          <Button onClick={onOpenBuilder} variant="primary">
            <Plus aria-hidden="true" /> Create from template
          </Button>
        }
        description="Reusable baseline, endline, monitoring, assessment, registration, case management, training, and feedback forms."
        title="Form Templates"
      />
      <div className="rounded-xl border bg-panel p-3.5 shadow-line">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold">Sector-aware form design</p>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
              Project sector packs suggest the right entities, validation
              rules, metric mappings, data quality checks, and mobile
              guidance. Installed sector starter forms appear as editable draft
              forms before publishing.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {uniqueSectors.length ? (
              uniqueSectors.map((sector) => (
                <Badge key={sector} tone="support">
                  {sector}
                </Badge>
              ))
            ) : (
              <Badge tone="warning">No project sector selected</Badge>
            )}
          </div>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {templates.map((template) => (
          <div
            className="rounded-xl border bg-panel p-3.5 shadow-line"
            key={template.id}
          >
            <Badge tone={template.is_featured ? "accent" : "neutral"}>
              {template.category}
            </Badge>
            <div className="mt-3 flex items-center gap-2">
              <h3 className="font-semibold">{template.name}</h3>
              <HelpHint label={`About ${template.name}`} title={template.name}>
                {template.description}
              </HelpHint>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <Signal
                label="Fields"
                value={`${template.summary.field_count}`}
              />
              <Signal
                label="GPS"
                value={template.summary.has_gps ? "Yes" : "No"}
              />
              <Signal label="Setup" value={`${template.estimated_minutes}m`} />
            </div>
            <Button
              className="mt-4 w-full"
              onClick={onOpenBuilder}
              variant="secondary"
            >
              <Copy aria-hidden="true" />
              Use template
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}

function ReferenceDataSection({
  onOpenBuilder,
}: {
  onOpenBuilder: () => void;
}) {
  const lists = [
    [
      "Administrative hierarchy",
      "Country -> Region -> District -> Community",
      "Versioned",
    ],
    ["Facilities", "Schools, clinics, warehouses, service points", "Active"],
    [
      "Beneficiary categories",
      "Household, farmer, youth, group, facility",
      "Active",
    ],
    [
      "Funder and activity codes",
      "Funders, clients, activities, intervention types",
      "Draft",
    ],
  ];
  return (
    <section className="space-y-4">
      <SectionHeader
        action={
          <Button onClick={onOpenBuilder} variant="primary">
            <Database aria-hidden="true" /> Bind to questions
          </Button>
        }
        description="Manage form-level controlled reference lists and attach them to questions. System-wide master data stays in Administration."
        title="Form Reference Data"
      />
      <div className="grid gap-4 md:grid-cols-2">
        {lists.map(([name, description, status]) => (
          <div
            className="rounded-xl border bg-panel p-3.5 shadow-line"
            key={name}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold">{name}</h3>
                <div className="mt-2">
                  <HelpHint label={`About ${name}`} title={name}>
                    {description}
                  </HelpHint>
                </div>
              </div>
              <Badge tone={status === "Draft" ? "warning" : "success"}>
                {status}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function FormTabCard({
  actionLabel,
  icon: Icon,
  lines,
  onAction,
  title,
}: {
  actionLabel: string;
  icon: LucideIcon;
  lines: string[];
  onAction: () => void;
  title: string;
}) {
  return (
    <div className="rounded-2xl border bg-background/50 p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-primary/10 text-primary">
            <Icon aria-hidden="true" size={18} />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold">{title}</h3>
              <HelpHint label={`About ${title}`} title={title}>
                {lines.join(" ")}
              </HelpHint>
            </div>
          </div>
        </div>
        <Button onClick={onAction} variant="secondary">
          {actionLabel}
        </Button>
      </div>
    </div>
  );
}

type FormFiltersState = {
  dateFrom: string;
  dateTo: string;
  formType: string;
  owner: string;
  projectName: string;
  status: string;
};

function FormFilters({
  filters,
  forms,
  onChange,
}: {
  filters: FormFiltersState;
  forms: FormListItem[];
  onChange: (patch: Partial<FormFiltersState>) => void;
}) {
  const projectNames = Array.from(
    new Set(forms.map((form) => form.project_name).filter(Boolean)),
  );
  const statuses = Array.from(new Set(forms.map((form) => form.status).filter(Boolean)));
  const owners = Array.from(new Set(forms.map((form) => form.owner).filter(Boolean)));
  const formTypes = Array.from(new Set(forms.map((form) => form.form_type).filter(Boolean)));
  const hasActiveFilters =
    Boolean(filters.projectName) ||
    Boolean(filters.status) ||
    Boolean(filters.owner) ||
    Boolean(filters.formType) ||
    Boolean(filters.dateFrom) ||
    Boolean(filters.dateTo);
  return (
    <div className="grid gap-3 rounded-xl border bg-panel p-3 shadow-line grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
      <Select
        onChange={(event) => onChange({ projectName: event.target.value })}
        value={filters.projectName}
      >
        <option value="">All projects</option>
        {projectNames.map((projectName) => (
          <option key={projectName} value={projectName}>
            {projectName}
          </option>
        ))}
      </Select>
      <Select
        onChange={(event) => onChange({ status: event.target.value })}
        value={filters.status}
      >
        <option value="">All statuses</option>
        {statuses.map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </Select>
      <Select
        onChange={(event) => onChange({ owner: event.target.value })}
        value={filters.owner}
      >
        <option value="">All owners</option>
        {owners.map((owner) => (
          <option key={owner} value={owner}>
            {owner}
          </option>
        ))}
      </Select>
      <Select
        onChange={(event) => onChange({ formType: event.target.value })}
        value={filters.formType}
      >
        <option value="">All form types</option>
        {formTypes.map((formType) => (
          <option key={formType} value={formType}>
            {formType}
          </option>
        ))}
      </Select>
      <div className="col-span-2 flex gap-2 md:col-span-1">
        <Input
          aria-label="Updated from"
          onChange={(event) => onChange({ dateFrom: event.target.value })}
          type="date"
          value={filters.dateFrom}
        />
        <Input
          aria-label="Updated to"
          onChange={(event) => onChange({ dateTo: event.target.value })}
          type="date"
          value={filters.dateTo}
        />
      </div>
      <Button
        disabled={!hasActiveFilters}
        onClick={() =>
          onChange({ dateFrom: "", dateTo: "", formType: "", owner: "", projectName: "", status: "" })
        }
        variant="ghost"
      >
        <SlidersHorizontal aria-hidden="true" />
        Clear filters
      </Button>
    </div>
  );
}

function SectionHeader({
  action,
  description,
  title,
}: {
  action?: ReactNode;
  description: string;
  title: string;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-panel p-3.5 shadow-line md:flex-row md:items-start md:justify-between">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold">{title}</h2>
          <HelpHint label={`About ${title}`} title={title}>
            {description}
          </HelpHint>
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border bg-panel p-3 shadow-line">
      <Icon aria-hidden="true" className="text-primary" size={17} />
      <p className="mt-3 text-xl font-semibold leading-tight">{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function Signal({
  label,
  tone = "neutral",
  value,
}: {
  label: string;
  tone?: "success" | "warning" | "danger" | "neutral";
  value: string;
}) {
  return (
    <div className="rounded-lg border bg-background/50 p-2">
      <p className="line-clamp-1 text-[10px] uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-0.5 truncate text-xs font-semibold",
          tone === "warning" && "text-warning",
          tone === "danger" && "text-danger",
          tone === "success" && "text-success",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function InsightCard({
  icon: Icon,
  lines,
  title,
}: {
  icon: LucideIcon;
  lines: string[];
  title: string;
}) {
  return (
    <div className="rounded-xl border bg-panel p-3.5 shadow-line">
      <div className="flex items-center gap-2">
        <Icon aria-hidden="true" className="text-primary" size={18} />
        <h3 className="font-semibold">{title}</h3>
      </div>
      <div className="mt-4 space-y-2">
        {lines.length ? (
          lines.map((line, index) => (
            <p
              className="rounded-xl border bg-background/50 px-3 py-2 text-sm text-muted-foreground"
              key={`${line}-${index}`}
            >
              {line}
            </p>
          ))
        ) : (
          <p className="rounded-xl border border-dashed bg-muted/30 px-3 py-3 text-sm text-muted-foreground">
            No activity yet.
          </p>
        )}
      </div>
    </div>
  );
}
