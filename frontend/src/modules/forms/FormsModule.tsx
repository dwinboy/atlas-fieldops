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
  Pencil,
  Plus,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  Table2,
  UploadCloud,
  Workflow,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { KeyboardEvent, ReactNode, RefCallback } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { DataTable, type TableColumn } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HelpHint } from "@/components/ui/help-hint";
import { Input, Select } from "@/components/ui/input";
import type { BeneficiaryRead, CurrentPrincipal, DataFormSchemaRead, SubmissionRead } from "@/lib/api";
import { ApiError, archiveForm, confirmImportedFormDataRows, getFormSchema, governExport, importFormDataRows, listBeneficiaries, listForms, listFormTemplates, listProjects, listSubmissions, restoreForm, returnImportedFormDataRows, updateForm, updateSubmissionResponses } from "@/lib/api";
import { cn } from "@/lib/utils";
import { fieldOperationsAssignmentRoute } from "@/modules/field-operations/data";
import { FormCreationWorkspace, readSpreadsheetRows } from "@/modules/forms/FormCreationWorkspace";
import {
  formDetailTabs,
  formsSectionFromPath,
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

export function formsTemplateBuilderRoute(): string {
  return "/forms/create";
}

export function formsWorkspaceBoundaryRoute(
  target: "data-quality" | "mapping" | "submissions",
): string {
  switch (target) {
    case "data-quality":
      return "/data-quality";
    case "mapping":
      return "/mapping";
    case "submissions":
      return "/submissions";
  }
}

export function canAssignForm(form: Pick<FormListItem, "status">): boolean {
  return form.status === "published";
}

export function formEditActionLabel(form: Pick<FormListItem, "status">): string {
  return form.status === "published" ? "New Version" : "Edit";
}

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
  required?: boolean;
  sensitivityLevel?: string | null;
  sourceOfTruth?: string | null;
  type: string;
  section: string;
};

const IMPORT_SOURCE_SYSTEMS = new Set([
  "form spreadsheet upload",
  "uploaded",
  "imported",
  "historical import",
  "migration import",
]);

export function isImportedSubmission(submission: SubmissionRead | SubmissionRecord): boolean {
  const sourceSystem = (submission.source_system ?? "").trim().toLowerCase();
  return Boolean(
      submission.is_imported ||
      submission.import_batch_id ||
      submission.imported_at ||
      IMPORT_SOURCE_SYSTEMS.has(sourceSystem),
  );
}

export function submissionSourceLabel(submission: SubmissionRead | SubmissionRecord): string {
  if (submission.offline_created) return "Mobile";
  if (isImportedSubmission(submission)) {
    const sourceSystem = (submission.source_system ?? "").toLowerCase();
    if (sourceSystem.includes("import")) return "Imported";
    return "Uploaded";
  }
  if ((submission.source_system ?? "").toLowerCase() === "web entry") return "Web Entry";
  return "Field Submitted";
}

function submissionActorLabel(submission: SubmissionRead | SubmissionRecord): string {
  if (isImportedSubmission(submission)) {
    return submission.imported_by_name || submission.imported_by_user_id || "Uploaded by unknown user";
  }
  return submission.submitted_by_name || submission.field_officer_id || "Unassigned collector";
}

// Full attribution for the actor cell tooltip: who, from which file, and why.
function submissionActorDetail(submission: SubmissionRead | SubmissionRecord): string {
  if (!isImportedSubmission(submission)) {
    return `Submitted by ${submissionActorLabel(submission)}`;
  }
  const parts = [`Uploaded by ${submissionActorLabel(submission)}`];
  const attribution = submission.payload_json?._source_attribution;
  if (attribution && typeof attribution === "object" && !Array.isArray(attribution)) {
    const record = attribution as Record<string, unknown>;
    if (record.sourceName) parts.push(`from ${String(record.sourceName)}`);
    if (record.importReason) parts.push(`reason: ${String(record.importReason)}`);
  }
  return parts.join(" · ");
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
      required?: boolean;
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
      required: Boolean(field.required),
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
        required: false,
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

function questionTypeLabel(type: string): string {
  return type
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function importIssueTypeLabel(issueType: unknown): string {
  switch (String(issueType ?? "")) {
    case "missing_value":
      return "Missing value";
    case "missing_column":
      return "Missing column";
    case "invalid_option":
      return "Invalid option";
    default:
      return "Issue";
  }
}

function compactValuePreview(value: string, maxLength = 72): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) return "Blank";
  return normalized.length > maxLength
    ? `${normalized.slice(0, maxLength - 1)}…`
    : normalized;
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  const gpsValue = formatGpsAnswer(value);
  if (gpsValue) return gpsValue;
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function responseValueToEditorInput(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

function parseQuestionOptions(question: FormGridQuestion): { label: string; value: string }[] {
  const raw = question.allowedValues?.trim();
  if (!raw) return [];
  return raw
    .split(/\r?\n|;|,/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const separator = item.includes("=") ? "=" : item.includes(":") ? ":" : null;
      if (!separator) return { label: item, value: item };
      const [value, ...labelParts] = item.split(separator);
      const normalizedValue = value.trim();
      const normalizedLabel = labelParts.join(separator).trim();
      return {
        label: normalizedLabel || normalizedValue,
        value: normalizedValue,
      };
    });
}

function questionValueMatchesAllowedOptions(
  question: FormGridQuestion,
  value: unknown,
): boolean {
  const options = parseQuestionOptions(question);
  if (!options.length || isBlankEditedValue(value)) return true;
  const allowedValues = new Set(
    options.flatMap((option) => [
      option.value.trim().toLowerCase(),
      option.label.trim().toLowerCase(),
    ]),
  );
  if (Array.isArray(value)) {
    return value.every((item) =>
      allowedValues.has(String(item).trim().toLowerCase()),
    );
  }
  return allowedValues.has(String(value).trim().toLowerCase());
}

function parseEditedQuestionValue(question: FormGridQuestion, rawValue: string): unknown {
  const trimmed = rawValue.trim();
  if (trimmed === "") return "";
  if (["checkbox", "boolean", "consent"].includes(question.type)) {
    return ["true", "yes", "1"].includes(trimmed.toLowerCase());
  }
  if (["number", "decimal", "currency", "rating", "nps", "integer", "percentage"].includes(question.type)) {
    const parsed = Number(rawValue);
    return Number.isNaN(parsed) ? rawValue : parsed;
  }
  if (
    ["multiselect", "multi_select", "ranking", "repeat_group", "repeatable_group", "grid"].includes(question.type) ||
    trimmed.startsWith("[")
  ) {
    try {
      return JSON.parse(trimmed) as unknown;
    } catch {
      return trimmed
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }
  if (trimmed.startsWith("{")) {
    try {
      return JSON.parse(trimmed) as unknown;
    } catch {
      return rawValue;
    }
  }
  return rawValue;
}

function isBlankEditedValue(value: unknown): boolean {
  if (value === null || value === undefined || value === "") return true;
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

function buildPreviewImportIssues(
  questions: FormGridQuestion[],
  answers: Record<string, unknown>,
): Record<string, unknown>[] {
  const issues: Record<string, unknown>[] = [];
  questions.forEach((question, index) => {
    const answer = answers[question.key];
    if (question.required && isBlankEditedValue(answer)) {
      issues.push({
        field_name: question.key,
        issue_type: "missing_value",
        message: `${question.label} (${question.key}) is missing for this imported row.`,
        question_label: question.label,
        row_number: 1,
        severity: "warning",
        suggested_fix: "Add the value before confirming the imported row for platform use.",
        sort_index: index,
      });
      return;
    }
    if (!questionValueMatchesAllowedOptions(question, answer)) {
      issues.push({
        field_name: question.key,
        issue_type: "invalid_option",
        message: `${question.label} (${question.key}) must match one of the allowed values for this form.`,
        question_label: question.label,
        row_number: 1,
        severity: "warning",
        suggested_fix: "Choose one of the listed allowed values before confirming the imported row.",
        sort_index: index,
      });
    }
  });
  return issues;
}

function requiredFieldProgress(
  questions: FormGridQuestion[],
  answers: Record<string, unknown>,
): { completed: number; percent: number; total: number } {
  const requiredQuestions = questions.filter((question) => question.required);
  const total = requiredQuestions.length;
  if (!total) {
    return { completed: 0, percent: 100, total: 0 };
  }
  const completed = requiredQuestions.filter(
    (question) => !isBlankEditedValue(answers[question.key]),
  ).length;
  return {
    completed,
    percent: Math.round((completed / total) * 100),
    total,
  };
}

function inputTypeForQuestion(question: FormGridQuestion): "date" | "datetime-local" | "number" | "text" | "time" {
  if (question.type === "date") return "date";
  if (["datetime", "date_time", "datetime_local"].includes(question.type)) return "datetime-local";
  if (question.type === "time") return "time";
  if (["number", "decimal", "currency", "rating", "nps", "integer", "percentage"].includes(question.type)) return "number";
  return "text";
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
  const importIssues = submission.payload_json?._import_issues;
  if (canCleanImportedSubmission(submission)) {
    warnings.add(
      Array.isArray(importIssues) && importIssues.length
        ? "Needs cleaning"
        : "Ready to confirm",
    );
  }
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
  if (submission.payload_json?._duplicate_submission_signal) warnings.add("Possible duplicate");
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
    if (missingFields.length) {
      warnings.add(`Missing: ${missingFields.join(", ")}`);
    }
    const invalidOptionFields = importIssues
      .filter((issue) => {
        if (!issue || typeof issue !== "object") return false;
        const issueType = "issue_type" in issue ? issue.issue_type : null;
        return issueType === "invalid_option";
      })
      .map((issue) => {
        if (!issue || typeof issue !== "object") return "";
        const label = "question_label" in issue ? issue.question_label : null;
        const field = "field_name" in issue ? issue.field_name : null;
        return String(label || field || "").trim();
      })
      .filter(Boolean)
      .slice(0, 3);
    if (invalidOptionFields.length) {
      warnings.add(`Invalid option: ${invalidOptionFields.join(", ")}`);
    }
    if (!missingFields.length && !invalidOptionFields.length) {
      warnings.add("Import warning");
    }
  }
  return Array.from(warnings);
}

function stagedImportIssueCount(
  submission: SubmissionRead | SubmissionRecord,
): number {
  const importIssues = submission.payload_json?._import_issues;
  const importIssueCount = Array.isArray(importIssues) ? importIssues.length : 0;
  return Math.max(importIssueCount, importBlockingIssues(submission).length);
}

function stagedImportIssueBreakdown(
  submission: SubmissionRead | SubmissionRecord,
): { invalidOption: number; missing: number } {
  const importIssues = submission.payload_json?._import_issues;
  let missing = 0;
  let invalidOption = 0;
  if (Array.isArray(importIssues)) {
    importIssues.forEach((issue) => {
      if (!issue || typeof issue !== "object") return;
      const issueType = "issue_type" in issue ? String(issue.issue_type ?? "") : "";
      if (issueType === "missing_column" || issueType === "missing_value") {
        missing += 1;
      }
      if (issueType === "invalid_option") {
        invalidOption += 1;
      }
    });
  }
  return { invalidOption, missing };
}

function stagedImportActionLabel(
  submission: SubmissionRead | SubmissionRecord,
): string {
  const breakdown = stagedImportIssueBreakdown(submission);
  if (!breakdown.missing && !breakdown.invalidOption) {
    return "Review clean row";
  }
  if (breakdown.missing && breakdown.invalidOption) {
    return `Fix ${breakdown.missing} missing, ${breakdown.invalidOption} invalid`;
  }
  if (breakdown.missing) {
    return `Fix ${breakdown.missing} missing`;
  }
  return `Fix ${breakdown.invalidOption} invalid option${breakdown.invalidOption === 1 ? "" : "s"}`;
}

function stagedImportNextStepHint(
  submission: SubmissionRead | SubmissionRecord,
): string {
  const breakdown = stagedImportIssueBreakdown(submission);
  if (!breakdown.missing && !breakdown.invalidOption) {
    return "Next step: review the cleaned values, then confirm this row.";
  }
  if (breakdown.missing && breakdown.invalidOption) {
    return "Next step: fill the missing values and replace invalid option values.";
  }
  if (breakdown.missing) {
    return "Next step: fill the missing values, save the row, then confirm it.";
  }
  return "Next step: replace the invalid option values, save the row, then confirm it.";
}

function importBlockingIssues(submission: SubmissionRead | SubmissionRecord): string[] {
  const validationIssues = submission.payload_json?._validation_issues;
  if (Array.isArray(validationIssues) && validationIssues.length) {
    return validationIssues.map((issue) => String(issue)).filter(Boolean);
  }
  return [];
}

function importIssuesForQuestion(
  submission: SubmissionRead | SubmissionRecord,
  question: FormGridQuestion,
): string[] {
  const issues = new Set<string>();
  const importIssues = submission.payload_json?._import_issues;
  if (Array.isArray(importIssues)) {
    importIssues.forEach((issue) => {
      if (!issue || typeof issue !== "object") return;
      const fieldName =
        "field_name" in issue && typeof issue.field_name === "string"
          ? issue.field_name
          : "variable_name" in issue && typeof issue.variable_name === "string"
            ? issue.variable_name
            : null;
      const questionLabel =
        "question_label" in issue && typeof issue.question_label === "string"
          ? issue.question_label
          : null;
      if (fieldName !== question.key && questionLabel !== question.label) return;
      const message =
        "message" in issue && typeof issue.message === "string"
          ? issue.message
          : `${question.label} needs attention.`;
      const issueTypeLabel = importIssueTypeLabel(
        "issue_type" in issue ? issue.issue_type : null,
      );
      issues.add(
        issueTypeLabel === "Issue" ? message : `${issueTypeLabel}: ${message}`,
      );
    });
  }
  const validationIssues = submission.payload_json?._validation_issues;
  if (Array.isArray(validationIssues)) {
    validationIssues.forEach((issue) => {
      const message = String(issue ?? "").trim();
      if (!message) return;
      if (message.includes(question.key) || message.includes(question.label)) {
        issues.add(message);
      }
    });
  }
  return Array.from(issues);
}

function importIssueSummary(issues: string[]): string {
  if (!issues.length) return "";
  if (issues.length === 1) return issues[0] ?? "";
  return `${issues[0] ?? ""} + ${issues.length - 1} more`;
}

function spreadsheetColumnLabel(index: number): string {
  let label = "";
  let current = Math.max(index, 0) + 1;
  while (current > 0) {
    const remainder = (current - 1) % 26;
    label = String.fromCharCode(65 + remainder) + label;
    current = Math.floor((current - 1) / 26);
  }
  return label || "A";
}

function canCleanImportedSubmission(submission: SubmissionRead | SubmissionRecord): boolean {
  return isImportedSubmission(submission) && ["import_staged", "under_review"].includes(submission.status);
}

function nextStagedSubmissionId(
  stagedImportRows: (SubmissionRead | SubmissionRecord)[],
  currentSubmissionId: string,
): string | null {
  const currentIndex = stagedImportRows.findIndex(
    (submission) => submission.id === currentSubmissionId,
  );
  if (currentIndex === -1) return null;
  return stagedImportRows[currentIndex + 1]?.id ?? null;
}

function previousStagedSubmissionId(
  stagedImportRows: (SubmissionRead | SubmissionRecord)[],
  currentSubmissionId: string,
): string | null {
  const currentIndex = stagedImportRows.findIndex(
    (submission) => submission.id === currentSubmissionId,
  );
  if (currentIndex <= 0) return null;
  return stagedImportRows[currentIndex - 1]?.id ?? null;
}

function adjacentStagedSubmissionId(
  stagedImportRows: (SubmissionRead | SubmissionRecord)[],
  currentSubmissionId: string,
  direction: 1 | -1,
  matcher?: (submission: SubmissionRead | SubmissionRecord) => boolean,
): string | null {
  const currentIndex = stagedImportRows.findIndex(
    (submission) => submission.id === currentSubmissionId,
  );
  if (currentIndex === -1) return null;
  for (
    let index = currentIndex + direction;
    index >= 0 && index < stagedImportRows.length;
    index += direction
  ) {
    const candidate = stagedImportRows[index];
    if (!candidate) continue;
    if (!matcher || matcher(candidate)) return candidate.id;
  }
  return null;
}

function firstIssueFieldKey(
  questions: FormGridQuestion[],
  answers: Record<string, unknown>,
): string | null {
  const firstIssue = buildPreviewImportIssues(questions, answers).find(
    (issue) => typeof issue.field_name === "string",
  );
  return firstIssue && typeof firstIssue.field_name === "string"
    ? firstIssue.field_name
    : null;
}

function editingValuesForSubmission(
  questions: FormGridQuestion[],
  submission: SubmissionRead | SubmissionRecord,
): Record<string, string> {
  const answers = submissionAnswerMap(submission);
  return Object.fromEntries(
    questions.map((question) => [
      question.key,
      responseValueToEditorInput(answers[question.key]),
    ]),
  );
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
  const [activeSection, setActiveSection] = useState<FormsSection>(() => formsSectionFromPath(pathname ?? "/forms") ?? "dashboard");
  const [activeTab, setActiveTab] = useState<FormDetailTab>("Overview");
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [creationOpen, setCreationOpen] = useState(false);
  const [builderFormId, setBuilderFormId] = useState<string | null>(null);
  const [duplicateSourceFormId, setDuplicateSourceFormId] = useState<string | null>(null);
  const localForms = useWorkspaceStore((state) => state.localForms);
  const localSubmissions = useWorkspaceStore((state) => state.localSubmissions);
  const setPendingTemplateId = useWorkspaceStore((state) => state.setPendingTemplateId);
  const preview = isPreview(token);
  const enabled = Boolean(token && !preview);
  const canManageForms = hasAnyPermission(principal, [
    "forms.manage",
    "forms.create",
    "forms.edit",
    "forms.publish",
  ]);
  const canAssignForms = hasAnyPermission(principal, [
    "assignments.manage",
    "forms.manage",
    "forms.publish",
    "officers.manage",
    "projects.manage",
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
    const routeSection = formsSectionFromPath(normalizedPath);
    if (routeSection) {
      setSelectedFormId(null);
      if (routeSection !== activeSection) {
        setActiveSection(routeSection);
      }
    }
  }, [activeSection, pathname]);

  function openForm(form: FormListItem, tab: FormDetailTab = "Overview"): void {
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
          {canAssignForm(form) ? (
            <Button onClick={() => openFormData(form.id, "source=uploaded")} size="sm" variant="secondary">
              <UploadCloud aria-hidden="true" />
              Upload
            </Button>
          ) : null}
          {canAssignForm(form) ? (
            <Button disabled={!canAssignForms} onClick={() => router.push(fieldOperationsAssignmentRoute(form.id))} size="sm" variant="secondary">
              Assign
            </Button>
          ) : null}
          <Button
            onClick={() => openFormBuilder(form)}
            size="sm"
            variant="ghost"
          >
            {formEditActionLabel(form)}
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
          onOpenDataQuality={() => router.push(formsWorkspaceBoundaryRoute("data-quality"))}
          onOpenMapping={() => router.push(formsWorkspaceBoundaryRoute("mapping"))}
          onOpenSubmissions={() => router.push(formsWorkspaceBoundaryRoute("submissions"))}
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
              canAssignForms={canAssignForms}
              canManageForms={canManageForms}
              forms={filteredForms}
              onAssign={(form) => {
                router.push(fieldOperationsAssignmentRoute(form.id));
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
            router.push(formsTemplateBuilderRoute());
          }}
          onUseTemplate={(templateId) => {
            setPendingTemplateId(templateId);
            router.push(formsTemplateBuilderRoute());
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
  canAssignForms,
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
  canAssignForms: boolean;
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
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
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
            className="rounded-lg border bg-panel p-2.5 shadow-line transition hover:border-primary/35 hover:shadow-soft"
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
              <div className="mt-2 grid gap-1.5 text-xs md:grid-cols-2">
                <Signal label="Project" value={form.project_name || "Not attached"} />
                <Signal label="Last updated" value={formatDate(form.updated_at)} />
                <Signal label="Sections" value={`${form.sections}`} />
                <Signal label="Questions" value={`${form.questions}`} />
              </div>
              {isDraft ? (
                <div className="mt-2 rounded-lg border bg-background/60 p-2.5">
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
                <div className="mt-2 grid gap-1.5 grid-cols-2 xl:grid-cols-4">
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
            <div className="mt-2.5 flex flex-wrap gap-1.5 border-t pt-2">
              {isDraft ? (
                <>
                  <Button disabled={!canManageForms} onClick={() => onEdit(form)} size="sm" variant="primary">
                    Continue Editing
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
                  <Button onClick={() => onOpenData(form, "status=approved")} size="sm" variant="primary">
                    <Table2 aria-hidden="true" />
                    View Data
                  </Button>
                  <Button onClick={() => onOpenData(form, "source=uploaded")} size="sm" variant="secondary">
                    <UploadCloud aria-hidden="true" />
                    Upload Data
                  </Button>
                  <Button disabled={!canAssignForms} onClick={() => onAssign(form)} size="sm" variant="secondary">
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
  const preview = isPreview(token);
  const [search, setSearch] = useState("");
  const [showDictionary, setShowDictionary] = useState(false);
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") ?? "all");
  const [sourceFilter, setSourceFilter] = useState(searchParams.get("source") ?? "all");
  const [stagedQueueFilter, setStagedQueueFilter] = useState<
    "all" | "needs_cleaning" | "ready_to_confirm"
  >("all");
  const [uploading, setUploading] = useState(false);
  const [confirmingImports, setConfirmingImports] = useState(false);
  const [confirmingSubmissionId, setConfirmingSubmissionId] = useState<string | null>(null);
  const [returningImports, setReturningImports] = useState(false);
  const [returnComment, setReturnComment] = useState("");
  const [editingSubmissionId, setEditingSubmissionId] = useState<string | null>(null);
  const [editingCellKey, setEditingCellKey] = useState<string | null>(null);
  const [pendingNextSubmissionId, setPendingNextSubmissionId] = useState<string | null>(null);
  const [editingReason, setEditingReason] = useState("");
  const [editingValues, setEditingValues] = useState<Record<string, string>>({});
  const editingCellRefs = useRef<Record<string, HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null>>({});
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
  const updateImportedRowMutation = useMutation({
    mutationFn: (variables: {
      keepEditing?: boolean;
      preferredCellKey?: string | null;
      reason: string;
      responses: Record<string, unknown>;
      submissionId: string;
    }) =>
      updateSubmissionResponses(token ?? "", variables.submissionId, {
        reason: variables.reason,
        responses: variables.responses,
      }),
    onSuccess: async (updatedSubmission, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["forms-module", "submissions", token] });
      if (variables.keepEditing) {
        setPendingNextSubmissionId(null);
        openSubmissionForEditing(
          updatedSubmission,
          variables.preferredCellKey ?? undefined,
        );
      } else {
        cancelRowEdit({ force: true, keepPendingNext: true });
      }
      pushToast({
        title: "Imported row updated",
        description: variables.keepEditing
          ? "The row was saved and stays open so you can continue editing."
          : pendingNextSubmissionId
          ? stagedQueueFilter === "needs_cleaning"
            ? "The cleaned row was saved. Opening the next row that still needs cleaning."
            : stagedQueueFilter === "ready_to_confirm"
              ? "The row was saved. Opening the next row that is still ready to confirm."
              : "The cleaned row was saved. Opening the next staged row."
          : "The cleaned row was saved and revalidated.",
        tone: "success",
      });
    },
    onError: () => {
      pushToast({
        title: "Could not save the row",
        description: "Check the edited values and try again.",
        tone: "danger",
      });
      setPendingNextSubmissionId(null);
    },
  });
  const baseFilteredSubmissions = useMemo(() => {
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
  const filteredSubmissions = useMemo(
    () =>
      baseFilteredSubmissions.filter((submission) => {
        if (stagedQueueFilter === "all") return true;
        if (!canCleanImportedSubmission(submission)) return true;
        const hasIssues = importBlockingIssues(submission).length > 0;
        return stagedQueueFilter === "needs_cleaning" ? hasIssues : !hasIssues;
      }),
    [baseFilteredSubmissions, stagedQueueFilter],
  );
  const visibleStagedImportRows = baseFilteredSubmissions.filter(canCleanImportedSubmission);
  const stagedImportRows = filteredSubmissions.filter(canCleanImportedSubmission);
  const confirmableImportRows = stagedImportRows.filter((submission) => !importBlockingIssues(submission).length);
  const stagedRowsNeedingCleaning = visibleStagedImportRows.filter(
    (submission) => importBlockingIssues(submission).length > 0,
  ).length;
  const stagedRowsReadyToConfirm =
    visibleStagedImportRows.length - stagedRowsNeedingCleaning;
  const stagedIssueCountTotal = visibleStagedImportRows.reduce(
    (total, submission) => total + stagedImportIssueCount(submission),
    0,
  );
  const stagedIssueBreakdownTotal = visibleStagedImportRows.reduce(
    (totals, submission) => {
      const breakdown = stagedImportIssueBreakdown(submission);
      return {
        invalidOption: totals.invalidOption + breakdown.invalidOption,
        missing: totals.missing + breakdown.missing,
      };
    },
    { invalidOption: 0, missing: 0 },
  );
  const stagedQueueReadyPercent = visibleStagedImportRows.length
    ? Math.round((stagedRowsReadyToConfirm / visibleStagedImportRows.length) * 100)
    : 0;
  const firstQueuedStagedRow = useMemo(() => {
    if (!stagedImportRows.length) return null;
    if (stagedQueueFilter === "needs_cleaning") {
      return (
        stagedImportRows.find(
          (submission) => importBlockingIssues(submission).length > 0,
        ) ?? stagedImportRows[0]
      );
    }
    if (stagedQueueFilter === "ready_to_confirm") {
      return (
        stagedImportRows.find(
          (submission) => importBlockingIssues(submission).length === 0,
        ) ?? stagedImportRows[0]
      );
    }
    return (
      stagedImportRows.find(
        (submission) => importBlockingIssues(submission).length > 0,
      ) ?? stagedImportRows[0]
    );
  }, [stagedImportRows, stagedQueueFilter]);
  const queueFilteredEmpty =
    stagedQueueFilter !== "all" &&
    !stagedImportRows.length &&
    visibleStagedImportRows.length > 0;
  const stats = buildFormStats(submissions).get(formId) ?? emptyStats();
  const canUploadData = form?.status === "published";
  const currentEditingSubmission = editingSubmissionId
    ? filteredSubmissions.find((submission) => submission.id === editingSubmissionId) ?? null
    : null;
  const emptyGridTitle = queueFilteredEmpty
    ? stagedQueueFilter === "needs_cleaning"
      ? "No staged rows still need cleaning"
      : "No staged rows are ready to confirm"
    : "No data rows match this view";
  const emptyGridDescription = queueFilteredEmpty
    ? stagedQueueFilter === "needs_cleaning"
      ? "Everything in the staged queue is already clean. Switch to Ready to confirm or All staged."
      : "There are no fully cleaned staged rows in this queue yet. Fix missing values or invalid options, or switch back to Needs cleaning."
    : "Upload historical data, sync mobile submissions, or clear the filters.";
  const currentEditingIssues = useMemo(
    () =>
      currentEditingSubmission
        ? buildPreviewImportIssues(
            questions,
            Object.fromEntries(
              questions.map((question) => [
                question.key,
                parseEditedQuestionValue(
                  question,
                  editingValues[question.key] ??
                    responseValueToEditorInput(submissionAnswerMap(currentEditingSubmission)[question.key]),
                ),
              ]),
            ),
          )
        : [],
    [currentEditingSubmission, editingValues, questions],
  );
  const currentEditingIssueKeys = currentEditingIssues
    .map((issue) =>
      typeof issue.field_name === "string" ? issue.field_name : null,
    )
    .filter((value): value is string => Boolean(value));
  const currentEditingIssueTargets = useMemo(
    () =>
      currentEditingIssues
        .map((issue) => {
          const fieldKey =
            typeof issue.field_name === "string" ? issue.field_name : null;
          const label =
            typeof issue.question_label === "string"
              ? issue.question_label
              : fieldKey;
          const message =
            typeof issue.message === "string" ? issue.message : null;
          const issueTypeLabel = importIssueTypeLabel(
            issue && typeof issue === "object" && "issue_type" in issue
              ? issue.issue_type
              : null,
          );
          if (!fieldKey || !label) return null;
          return { fieldKey, issueTypeLabel, label, message };
        })
        .filter(
          (
            issue,
          ): issue is {
            fieldKey: string;
            issueTypeLabel: string;
            label: string;
            message: string | null;
          } =>
            issue !== null,
        ),
    [currentEditingIssues],
  );
  const currentEditingIssueCount = currentEditingIssues.length;
  const currentEditingIssueSummary = useMemo(() => {
    if (!currentEditingIssueTargets.length) return null;
    const visibleLabels = currentEditingIssueTargets
      .slice(0, 3)
      .map((issue) =>
        issue.issueTypeLabel === "Issue"
          ? issue.label
          : `${issue.issueTypeLabel}: ${issue.label}`,
      );
    const remaining = currentEditingIssueTargets.length - visibleLabels.length;
    return `Still needs attention: ${visibleLabels.join(", ")}${
      remaining > 0 ? ` + ${remaining} more` : ""
    }.`;
  }, [currentEditingIssueTargets]);
  const currentEditingIssueBreakdown = useMemo(() => {
    let missing = 0;
    let invalidOption = 0;
    currentEditingIssues.forEach((issue) => {
      const issueType =
        issue && typeof issue === "object" && "issue_type" in issue
          ? String(issue.issue_type ?? "")
          : "";
      if (issueType === "missing_value" || issueType === "missing_column") {
        missing += 1;
      }
      if (issueType === "invalid_option") {
        invalidOption += 1;
      }
    });
    return { invalidOption, missing };
  }, [currentEditingIssues]);
  const activeEditingIssueTarget = useMemo(() => {
    if (!editingCellKey) return null;
    return (
      currentEditingIssueTargets.find((issue) => issue.fieldKey === editingCellKey) ??
      null
    );
  }, [currentEditingIssueTargets, editingCellKey]);
  const nextEditingIssueTarget = currentEditingIssueTargets[0] ?? null;
  const currentEditingQueueMovementHint =
    stagedQueueFilter === "needs_cleaning" && currentEditingIssueCount === 0
      ? "Saving this row will move it into Ready to confirm."
      : stagedQueueFilter === "ready_to_confirm" && currentEditingIssueCount > 0
        ? "Saving this row will move it back into Needs cleaning until the row issues are fixed."
        : null;
  const currentEditingQueueLabel =
    stagedQueueFilter === "needs_cleaning"
      ? "Queue: Needs cleaning"
      : stagedQueueFilter === "ready_to_confirm"
        ? "Queue: Ready to confirm"
        : "Queue: All staged";
  const currentEditingRowStateLabel =
    currentEditingIssueCount > 0
      ? "Row state: Needs cleaning"
      : "Row state: Ready to confirm";
  const currentEditingAfterSaveQueueLabel =
    stagedQueueFilter === "needs_cleaning" && currentEditingIssueCount === 0
      ? "After save: Ready to confirm"
      : stagedQueueFilter === "ready_to_confirm" && currentEditingIssueCount > 0
        ? "After save: Needs cleaning"
        : null;
  const currentEditingSaveLabel =
    stagedQueueFilter === "all"
      ? "Save & keep editing"
      : stagedQueueFilter === "needs_cleaning"
        ? currentEditingIssueCount > 0
          ? "Save & keep cleaning"
          : "Save & move to ready"
        : currentEditingIssueCount > 0
          ? "Save & move to needs cleaning"
          : "Save & keep ready";
  const currentEditingSaveShortcutHint =
    stagedQueueFilter === "all"
      ? "saves and keeps this row open."
      : stagedQueueFilter === "needs_cleaning"
        ? currentEditingIssueCount > 0
          ? "saves and keeps this row in Needs cleaning."
          : "saves and moves this row into Ready to confirm."
        : currentEditingIssueCount > 0
          ? "saves and moves this row back into Needs cleaning."
          : "saves and keeps this row ready to confirm.";
  const currentEditingPreviousRowLabel =
    stagedQueueFilter === "needs_cleaning"
      ? "Previous issue row"
      : stagedQueueFilter === "ready_to_confirm"
        ? "Previous ready row"
        : "Previous row";
  const currentEditingNextRowLabel =
    stagedQueueFilter === "needs_cleaning"
      ? "Next issue row"
      : stagedQueueFilter === "ready_to_confirm"
        ? "Next ready row"
        : "Next row";
  const currentEditingSaveNextLabel =
    stagedQueueFilter === "needs_cleaning"
      ? "Save & next issue row"
      : stagedQueueFilter === "ready_to_confirm"
        ? "Save & next ready row"
        : "Save & next row";
  const currentEditingSaveNextShortcutHint =
    stagedQueueFilter === "needs_cleaning"
      ? "saves and opens the next row that still needs cleaning."
      : stagedQueueFilter === "ready_to_confirm"
        ? "saves and opens the next row that is still ready to confirm."
        : "saves and opens the next staged row.";
  const currentEditingConfirmNextLabel =
    stagedQueueFilter === "needs_cleaning"
      ? "Confirm & next issue row"
      : stagedQueueFilter === "ready_to_confirm"
        ? "Confirm & next ready row"
        : "Confirm & next row";
  const currentEditingConfirmShortcutHint =
    stagedQueueFilter === "ready_to_confirm"
      ? "confirms this ready row."
      : "confirms this row.";
  const currentEditingConfirmNextShortcutHint =
    stagedQueueFilter === "needs_cleaning"
      ? "confirms it and opens the next row that still needs cleaning."
      : stagedQueueFilter === "ready_to_confirm"
        ? "confirms it and opens the next row that is still ready to confirm."
        : "confirms it and opens the next staged row.";
  const currentEditingPreviousSubmissionId = currentEditingSubmission
    ? previousStagedSubmissionId(stagedImportRows, currentEditingSubmission.id)
    : null;
  const currentEditingNextSubmissionId = currentEditingSubmission
    ? nextStagedSubmissionId(stagedImportRows, currentEditingSubmission.id)
    : null;
  const currentEditingPreviousIssueSubmissionId = currentEditingSubmission
    ? adjacentStagedSubmissionId(
        stagedImportRows,
        currentEditingSubmission.id,
        -1,
        (submission) => importBlockingIssues(submission).length > 0,
      )
    : null;
  const currentEditingNextIssueSubmissionId = currentEditingSubmission
    ? adjacentStagedSubmissionId(
        stagedImportRows,
        currentEditingSubmission.id,
        1,
        (submission) => importBlockingIssues(submission).length > 0,
      )
    : null;
  const activeEditingQuestion = editingCellKey
    ? questions.find((question) => question.key === editingCellKey) ?? null
    : null;
  const activeEditingQuestionOptions = useMemo(
    () =>
      activeEditingQuestion ? parseQuestionOptions(activeEditingQuestion) : [],
    [activeEditingQuestion],
  );
  const activeEditingCurrentValue = useMemo(() => {
    if (!activeEditingQuestion || !currentEditingSubmission) return "";
    const currentAnswers = submissionAnswerMap(currentEditingSubmission);
    const originalValue = responseValueToEditorInput(
      currentAnswers[activeEditingQuestion.key],
    );
    return editingValues[activeEditingQuestion.key] ?? originalValue;
  }, [activeEditingQuestion, currentEditingSubmission, editingValues]);
  const activeEditingOptionsPreview = activeEditingQuestionOptions.length
    ? `${activeEditingQuestionOptions
        .slice(0, 4)
        .map((option) => option.label)
        .join(", ")}${
        activeEditingQuestionOptions.length > 4
          ? ` + ${activeEditingQuestionOptions.length - 4} more`
          : ""
      }`
    : null;
  const activeEditingQuestionIndex = editingCellKey
    ? questions.findIndex((question) => question.key === editingCellKey)
    : -1;
  const activeEditingCellDirty = useMemo(() => {
    if (!activeEditingQuestion || !currentEditingSubmission) return false;
    const currentAnswers = submissionAnswerMap(currentEditingSubmission);
    const originalValue = responseValueToEditorInput(
      currentAnswers[activeEditingQuestion.key],
    );
    const editedValue = editingValues[activeEditingQuestion.key] ?? originalValue;
    return editedValue !== originalValue;
  }, [activeEditingQuestion, currentEditingSubmission, editingValues]);
  const activeEditingOriginalValuePreview = useMemo(() => {
    if (!activeEditingQuestion || !currentEditingSubmission) return null;
    const currentAnswers = submissionAnswerMap(currentEditingSubmission);
    return compactValuePreview(
      responseValueToEditorInput(currentAnswers[activeEditingQuestion.key]),
    );
  }, [activeEditingQuestion, currentEditingSubmission]);
  const activeEditingEditedValuePreview = useMemo(() => {
    if (!activeEditingQuestion || !currentEditingSubmission) return null;
    return compactValuePreview(activeEditingCurrentValue);
  }, [activeEditingCurrentValue, activeEditingQuestion, currentEditingSubmission]);
  const activeEditingIssueIndex =
    editingCellKey && currentEditingIssueKeys.includes(editingCellKey)
      ? currentEditingIssueKeys.indexOf(editingCellKey) + 1
      : null;
  const currentEditingCellIssues = useMemo(() => {
    if (!editingCellKey) return [];
    return currentEditingIssues
      .filter((issue) => {
        if (!issue || typeof issue !== "object") return false;
        const fieldName =
          "field_name" in issue && typeof issue.field_name === "string"
            ? issue.field_name
            : null;
        return fieldName === editingCellKey;
      })
      .map((issue) => {
        const message =
          issue && typeof issue === "object" && "message" in issue
            ? String(issue.message ?? "").trim()
            : "";
        const issueTypeLabel = importIssueTypeLabel(
          issue && typeof issue === "object" && "issue_type" in issue
            ? issue.issue_type
            : null,
        );
        return issueTypeLabel === "Issue" || !message
          ? message
          : `${issueTypeLabel}: ${message}`;
      })
      .filter(Boolean);
  }, [currentEditingIssues, editingCellKey]);
  const currentEditingRowIndex = currentEditingSubmission
    ? stagedImportRows.findIndex((submission) => submission.id === currentEditingSubmission.id)
    : -1;
  const currentEditingCellReference =
    activeEditingQuestionIndex >= 0 && currentEditingRowIndex >= 0
      ? `${spreadsheetColumnLabel(activeEditingQuestionIndex)}${currentEditingRowIndex + 1}`
      : null;
  const currentEditingRequiredProgress = useMemo(
    () =>
      currentEditingSubmission
        ? requiredFieldProgress(
            questions,
            Object.fromEntries(
              questions.map((question) => [
                question.key,
                parseEditedQuestionValue(
                  question,
                  editingValues[question.key] ??
                    responseValueToEditorInput(
                      submissionAnswerMap(currentEditingSubmission)[question.key],
                    ),
                ),
              ]),
            ),
          )
        : { completed: 0, percent: 0, total: 0 },
    [currentEditingSubmission, editingValues, questions],
  );
  const currentEditingMissingRequiredCount = Math.max(
    currentEditingRequiredProgress.total - currentEditingRequiredProgress.completed,
    0,
  );
  const isEditingDirty = useMemo(() => {
    if (!currentEditingSubmission) return false;
    if (editingReason.trim()) return true;
    const currentAnswers = submissionAnswerMap(currentEditingSubmission);
    return questions.some((question) => {
      const originalValue = responseValueToEditorInput(currentAnswers[question.key]);
      const editedValue = editingValues[question.key] ?? originalValue;
      return editedValue !== originalValue;
    });
  }, [currentEditingSubmission, editingReason, editingValues, questions]);
  const currentEditingConfirmActionLabel = isEditingDirty
    ? "Save & confirm row"
    : "Confirm row";
  const currentEditingConfirmNextActionLabel = isEditingDirty
    ? stagedQueueFilter === "needs_cleaning"
      ? "Save & confirm & next issue row"
      : stagedQueueFilter === "ready_to_confirm"
        ? "Save & confirm & next ready row"
        : "Save & confirm & next row"
    : currentEditingConfirmNextLabel;
  const currentEditingConfirmActionHint = isEditingDirty
    ? "saves your clean edits and confirms this row."
    : currentEditingConfirmShortcutHint;
  const currentEditingConfirmNextActionHint = isEditingDirty
    ? stagedQueueFilter === "needs_cleaning"
      ? "saves your clean edits, confirms this row, and opens the next row that still needs cleaning."
      : stagedQueueFilter === "ready_to_confirm"
        ? "saves your clean edits, confirms this row, and opens the next row that is still ready to confirm."
        : "saves your clean edits, confirms this row, and opens the next staged row."
    : currentEditingConfirmNextShortcutHint;

  useEffect(() => {
    if (!editingSubmissionId) return;
    if (filteredSubmissions.some((submission) => submission.id === editingSubmissionId)) return;
    setEditingSubmissionId(null);
    setEditingCellKey(null);
    setEditingReason("");
    setEditingValues({});
  }, [editingSubmissionId, filteredSubmissions]);

  useEffect(() => {
    if (!editingSubmissionId || !editingCellKey) return;
    const nextTarget = editingCellRefs.current[editingCellKey];
    if (!nextTarget) return;
    const focusTimer = window.setTimeout(() => {
      const cellElement = nextTarget.closest("td");
      if (cellElement instanceof HTMLElement) {
        cellElement.scrollIntoView({
          block: "nearest",
          inline: "center",
        });
      }
      nextTarget.focus();
      if (nextTarget instanceof HTMLInputElement || nextTarget instanceof HTMLTextAreaElement) {
        const cursorPosition = nextTarget.value.length;
        nextTarget.setSelectionRange?.(cursorPosition, cursorPosition);
      }
    }, 0);
    return () => window.clearTimeout(focusTimer);
  }, [editingCellKey, editingSubmissionId]);

  useEffect(() => {
    if (!isEditingDirty) return;
    function handleBeforeUnload(event: BeforeUnloadEvent): void {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isEditingDirty]);

  const openSubmissionForEditing = useCallback((
    submission: SubmissionRead | SubmissionRecord,
    preferredCellKey?: string,
  ): void => {
    const answers = submissionAnswerMap(submission);
    const firstIssueKey = firstIssueFieldKey(questions, answers);
    setEditingSubmissionId(submission.id);
    setEditingCellKey(preferredCellKey ?? firstIssueKey ?? questions[0]?.key ?? null);
    setEditingReason("");
    setEditingValues(editingValuesForSubmission(questions, submission));
  }, [questions]);

  const startRowEdit = useCallback((
    submission: SubmissionRead | SubmissionRecord,
    preferredCellKey?: string,
  ): void => {
    if (editingSubmissionId && editingSubmissionId !== submission.id) {
      pushToast({
        title: "Finish the current row first",
        description: isEditingDirty
          ? "You have unsaved row edits. Save or cancel them before opening another imported row."
          : "Save or cancel the row you are editing before moving to another imported row.",
        tone: "warning",
      });
      return;
    }
    openSubmissionForEditing(submission, preferredCellKey);
  }, [editingSubmissionId, isEditingDirty, openSubmissionForEditing, pushToast]);

  useEffect(() => {
    if (!pendingNextSubmissionId || editingSubmissionId) return;
    const nextSubmission = filteredSubmissions.find(
      (submission) =>
        submission.id === pendingNextSubmissionId && canCleanImportedSubmission(submission),
    );
    setPendingNextSubmissionId(null);
    if (!nextSubmission) return;
    startRowEdit(nextSubmission);
  }, [editingSubmissionId, filteredSubmissions, pendingNextSubmissionId, startRowEdit]);

  function cancelRowEdit(options?: { force?: boolean; keepPendingNext?: boolean }): void {
    if (!options?.force && isEditingDirty) {
      const confirmed = window.confirm("Discard the unsaved edits for this imported row?");
      if (!confirmed) return;
    }
    setEditingSubmissionId(null);
    setEditingCellKey(null);
    setEditingReason("");
    setEditingValues({});
    if (!options?.keepPendingNext) setPendingNextSubmissionId(null);
  }

  function updateEditingCell(questionKey: string, value: string): void {
    setEditingValues((current) => ({ ...current, [questionKey]: value }));
  }

  function buildEditedRowDraft(submission: SubmissionRead | SubmissionRecord): {
    importIssues: Record<string, unknown>[];
    nextResponses: Record<string, unknown>;
    reason: string;
    updatedSubmission: SubmissionRead | SubmissionRecord;
  } {
    const currentAnswers = submissionAnswerMap(submission);
    const nextResponses: Record<string, unknown> = { ...currentAnswers };
    questions.forEach((question) => {
      nextResponses[question.key] = parseEditedQuestionValue(
        question,
        editingValues[question.key] ?? responseValueToEditorInput(currentAnswers[question.key]),
      );
    });
    const importIssues = buildPreviewImportIssues(questions, nextResponses);
    const reason = editingReason.trim() || "Cleaned imported row from the form data grid.";
    return {
      importIssues,
      nextResponses,
      reason,
      updatedSubmission: {
        ...submission,
        payload_json: {
          ...submission.payload_json,
          ...nextResponses,
          _import_issues: importIssues,
          _validation_issues: importIssues
            .map((issue) => String(issue.message ?? ""))
            .filter(Boolean),
          _quality_status: importIssues.length
            ? "needs_review"
            : "cleaned_ready_for_confirmation",
          _review_required: Boolean(importIssues.length),
        },
      },
    };
  }

  function resetEditingRow(): void {
    if (!currentEditingSubmission) return;
    if (isEditingDirty) {
      const confirmed = window.confirm(
        "Reset all unsaved edits in this row back to the original imported values?",
      );
      if (!confirmed) return;
    }
    openSubmissionForEditing(currentEditingSubmission);
  }

  function resetEditingCell(): void {
    if (!activeEditingQuestion || !currentEditingSubmission) return;
    if (activeEditingCellDirty) {
      const confirmed = window.confirm(
        `Reset ${activeEditingQuestion.label} back to its original imported value?`,
      );
      if (!confirmed) return;
    }
    const currentAnswers = submissionAnswerMap(currentEditingSubmission);
    updateEditingCell(
      activeEditingQuestion.key,
      responseValueToEditorInput(currentAnswers[activeEditingQuestion.key]),
    );
  }

  function openAdjacentEditingRow(direction: -1 | 1): void {
    if (!currentEditingSubmission) return;
    const targetSubmissionId =
      direction < 0 ? currentEditingPreviousSubmissionId : currentEditingNextSubmissionId;
    if (!targetSubmissionId) return;
    if (isEditingDirty) {
      const confirmed = window.confirm(
        "Discard the unsaved edits for this row and open another staged row?",
      );
      if (!confirmed) return;
    }
    const targetSubmission = stagedImportRows.find(
      (submission) => submission.id === targetSubmissionId,
    );
    if (!targetSubmission) return;
    setPendingNextSubmissionId(null);
    openSubmissionForEditing(targetSubmission);
  }

  function openAdjacentIssueRow(direction: -1 | 1): void {
    if (!currentEditingSubmission) return;
    const targetSubmissionId =
      direction < 0
        ? currentEditingPreviousIssueSubmissionId
        : currentEditingNextIssueSubmissionId;
    if (!targetSubmissionId) return;
    if (isEditingDirty) {
      const confirmed = window.confirm(
        "Discard the unsaved edits for this row and open another row that still needs cleaning?",
      );
      if (!confirmed) return;
    }
    const targetSubmission = stagedImportRows.find(
      (submission) => submission.id === targetSubmissionId,
    );
    if (!targetSubmission) return;
    setPendingNextSubmissionId(null);
    openSubmissionForEditing(targetSubmission);
  }

  function jumpToEditingIssue(direction: 1 | -1 = 1): void {
    if (!currentEditingIssueKeys.length) return;
    const currentIndex = editingCellKey ? currentEditingIssueKeys.indexOf(editingCellKey) : -1;
    const nextKey =
      currentIndex >= 0
        ? currentEditingIssueKeys[
            (currentIndex + direction + currentEditingIssueKeys.length) %
              currentEditingIssueKeys.length
          ]
        : direction === -1
          ? currentEditingIssueKeys[currentEditingIssueKeys.length - 1]
          : currentEditingIssueKeys[0];
    setEditingCellKey(nextKey);
  }

  function openFirstQueuedStagedRow(): void {
    const targetSubmission = firstQueuedStagedRow;
    if (!targetSubmission) return;
    startRowEdit(targetSubmission);
  }

  function registerEditingCellRef(
    questionKey: string,
    element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null,
  ): void {
    editingCellRefs.current[questionKey] = element;
  }

  function moveEditingCell(currentKey: string, direction: 1 | -1): void {
    const currentIndex = questions.findIndex((question) => question.key === currentKey);
    if (currentIndex === -1) return;
    const nextIndex = Math.min(Math.max(currentIndex + direction, 0), questions.length - 1);
    setEditingCellKey(questions[nextIndex]?.key ?? currentKey);
  }

  function handleEditingCellKeyDown(
    event: KeyboardEvent<HTMLElement>,
    question: FormGridQuestion,
  ): void {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
      event.preventDefault();
      if (!currentEditingSubmission) return;
      void saveEditedRow(currentEditingSubmission, {
        advanceToNext: event.shiftKey && Boolean(currentEditingNextSubmissionId),
      });
      return;
    }
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      if (!currentEditingSubmission || currentEditingIssueCount) return;
      void confirmSingleImportedRow(currentEditingSubmission, {
        advanceToNext: event.shiftKey && Boolean(currentEditingNextSubmissionId),
      });
      return;
    }
    const target = event.currentTarget;
    if (event.key === "Enter") {
      event.preventDefault();
      moveEditingCell(question.key, event.shiftKey ? -1 : 1);
      return;
    }
    if (event.key === "Tab") {
      event.preventDefault();
      moveEditingCell(question.key, event.shiftKey ? -1 : 1);
      return;
    }
    if (event.key === "ArrowUp") {
      if (target instanceof HTMLSelectElement) return;
      event.preventDefault();
      moveEditingCell(question.key, -1);
      return;
    }
    if (event.key === "ArrowDown") {
      if (target instanceof HTMLSelectElement) return;
      event.preventDefault();
      moveEditingCell(question.key, 1);
      return;
    }
    if (event.key === "ArrowLeft") {
      if (target instanceof HTMLTextAreaElement) return;
      if (target instanceof HTMLSelectElement) {
        event.preventDefault();
        moveEditingCell(question.key, -1);
        return;
      }
      if (
        target instanceof HTMLInputElement &&
        (target.selectionStart ?? 0) === 0 &&
        (target.selectionEnd ?? 0) === 0
      ) {
        event.preventDefault();
        moveEditingCell(question.key, -1);
        return;
      }
    }
    if (event.key === "ArrowRight") {
      if (target instanceof HTMLTextAreaElement) return;
      if (target instanceof HTMLSelectElement) {
        event.preventDefault();
        moveEditingCell(question.key, 1);
        return;
      }
      if (
        target instanceof HTMLInputElement &&
        (target.selectionStart ?? target.value.length) === target.value.length &&
        (target.selectionEnd ?? target.value.length) === target.value.length
      ) {
        event.preventDefault();
        moveEditingCell(question.key, 1);
        return;
      }
    }
    if (event.key === "Escape") {
      event.preventDefault();
      cancelRowEdit();
    }
  }

  async function saveEditedRow(
    submission: SubmissionRead | SubmissionRecord,
    options?: { advanceToNext?: boolean },
  ): Promise<void> {
    const { importIssues, nextResponses, reason } = buildEditedRowDraft(submission);
    const willRemainInCurrentQueue =
      stagedQueueFilter === "all"
        ? true
        : stagedQueueFilter === "needs_cleaning"
          ? importIssues.length > 0
          : importIssues.length === 0;
    const keepEditing = !options?.advanceToNext && willRemainInCurrentQueue;
    const nextSubmissionId = options?.advanceToNext
      ? nextStagedSubmissionId(stagedImportRows, submission.id)
      : stagedQueueFilter === "needs_cleaning" && importIssues.length === 0
        ? adjacentStagedSubmissionId(
            stagedImportRows,
            submission.id,
            1,
            (candidate) => importBlockingIssues(candidate).length > 0,
          )
        : stagedQueueFilter === "ready_to_confirm" && importIssues.length > 0
          ? adjacentStagedSubmissionId(
              stagedImportRows,
              submission.id,
              1,
              (candidate) => importBlockingIssues(candidate).length === 0,
            )
          : null;
    setPendingNextSubmissionId(nextSubmissionId);
    if (preview) {
      const submissionRecord = submission as SubmissionRecord;
      const preservedMetadata = Object.fromEntries(
        Object.entries(submissionRecord.payload_json).filter(
          ([key]) =>
            key.startsWith("_") &&
            !["_import_issues", "_validation_issues", "_quality_status", "_review_required"].includes(key),
        ),
      );
      upsertLocalSubmission({
        ...submissionRecord,
        audit_events: [
          ...submissionRecord.audit_events,
          {
            action: "Imported Row Cleaned",
            actor: "Current user",
            created_at: new Date().toISOString(),
            reason,
          },
        ],
        history: [
          ...submissionRecord.history,
          {
            action: "Imported Row Cleaned",
            actor: "Current user",
            comment: reason,
            created_at: new Date().toISOString(),
          },
        ],
        payload_json: {
          ...nextResponses,
          ...preservedMetadata,
          _import_issues: importIssues,
          _validation_issues: importIssues.map((issue) => String(issue.message ?? "")).filter(Boolean),
          _quality_status: importIssues.length ? "needs_review" : "cleaned_ready_for_confirmation",
          _review_required: Boolean(importIssues.length),
        },
        server_sequence: submissionRecord.server_sequence + 1,
      });
      if (keepEditing) {
        setPendingNextSubmissionId(null);
        openSubmissionForEditing(
          {
            ...submissionRecord,
            audit_events: [
              ...submissionRecord.audit_events,
              {
                action: "Imported Row Cleaned",
                actor: "Current user",
                created_at: new Date().toISOString(),
                reason,
              },
            ],
            history: [
              ...submissionRecord.history,
              {
                action: "Imported Row Cleaned",
                actor: "Current user",
                comment: reason,
                created_at: new Date().toISOString(),
              },
            ],
            payload_json: {
              ...nextResponses,
              ...preservedMetadata,
              _import_issues: importIssues,
              _validation_issues: importIssues.map((issue) => String(issue.message ?? "")).filter(Boolean),
              _quality_status: importIssues.length ? "needs_review" : "cleaned_ready_for_confirmation",
              _review_required: Boolean(importIssues.length),
            },
            server_sequence: submissionRecord.server_sequence + 1,
          },
          editingCellKey ?? undefined,
        );
      } else {
        cancelRowEdit({ force: true, keepPendingNext: true });
      }
      pushToast({
        title: "Preview row updated",
        description: keepEditing
          ? "The row was saved and stays open so you can continue editing."
          : nextSubmissionId
          ? stagedQueueFilter === "needs_cleaning" && importIssues.length === 0
            ? "The cleaned row was saved. Opening the next row that still needs cleaning."
            : stagedQueueFilter === "ready_to_confirm" && importIssues.length > 0
              ? "The row was saved. Opening the next row that is still ready to confirm."
              : "The cleaned row was saved. Opening the next staged row."
          : "The cleaned row was saved in the local preview grid.",
        tone: "success",
      });
      return;
    }
    updateImportedRowMutation.mutate({
      keepEditing,
      preferredCellKey: editingCellKey,
      reason,
      responses: nextResponses,
      submissionId: submission.id,
    });
  }

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
    if (!canUploadData) {
      pushToast({
        title: "Publish the form first",
        description: "Data can only be uploaded to published forms. Publish this form to start collecting and uploading records.",
        tone: "warning",
      });
      return;
    }
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
        const blockingIssues = response.issues.filter((issue) => issue.severity !== "info");
        const sampleIssues = blockingIssues
          .slice(0, 3)
          .map(
            (issue) =>
              `${importIssueTypeLabel(issue.issue_type)}: ${
                issue.question_label ?? issue.field_name ?? "Field"
              } on row ${issue.row_number}`,
          )
          .join("; ");
        pushToast({
          title: "Form data imported",
          description: sampleIssues
            ? `${response.imported_rows} row(s) staged for cleaning. Form issues found: ${sampleIssues}${blockingIssues.length > 3 ? "..." : ""}`
            : `${response.imported_rows} row(s) staged for cleaning with no blocking form issues detected. Confirm them when ready.`,
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
        buildPreviewImportIssues(questions, payload).forEach((issue) => {
          const alreadyExists = importIssues.some(
            (existingIssue) =>
              existingIssue.field_name === issue.field_name &&
              existingIssue.issue_type === issue.issue_type,
          );
          if (alreadyExists) return;
          importIssues.push({
            ...issue,
            row_number: rowIndex + 1,
          });
        });
        for (const question of questions) {
          if (Object.prototype.hasOwnProperty.call(payload, question.key)) continue;
          const alreadyTrackedForField = importIssues.some(
            (issue) => issue.field_name === question.key,
          );
          if (alreadyTrackedForField) continue;
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
        description: `${importedCount} row(s) were matched to this form and added to the data grid for review. Resolve any staged form issues before confirming them.`,
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
    await confirmImportedRows(confirmableImportRows, {
      comment: "Cleaned uploaded form data confirmed for platform use.",
      emptyDescription:
        "Open staged rows, fix missing values or invalid options, save edits, then confirm again.",
      successDescription: (confirmedRows, skippedRows) =>
        `${confirmedRows} row(s) are now approved and ready for dashboards, reports, metrics, and entity linkage.${skippedRows ? ` ${skippedRows} row(s) still need cleaning.` : ""}`,
      successTitle: "Imported data confirmed",
    });
  }

  async function confirmSingleImportedRow(
    submission: SubmissionRead | SubmissionRecord,
    options?: { advanceToNext?: boolean },
  ): Promise<void> {
    const nextSubmissionId = options?.advanceToNext
      ? nextStagedSubmissionId(stagedImportRows, submission.id)
      : null;
    setPendingNextSubmissionId(nextSubmissionId);
    setConfirmingSubmissionId(submission.id);
    try {
      let confirmationSubmission = submission;
      if (editingSubmissionId === submission.id && isEditingDirty) {
        const { importIssues, nextResponses, reason, updatedSubmission } =
          buildEditedRowDraft(submission);
        if (importIssues.length) {
          pushToast({
            title: "This row still has issues",
            description:
              "Fix the remaining flagged cells, then confirm the row again.",
            tone: "warning",
          });
          setPendingNextSubmissionId(null);
          return;
        }
        if (!preview && token) {
          await updateSubmissionResponses(token, submission.id, {
            reason,
            responses: nextResponses,
          });
          await queryClient.invalidateQueries({
            queryKey: ["forms-module", "submissions", token],
          });
        }
        confirmationSubmission = updatedSubmission;
      }
      const confirmed = await confirmImportedRows([confirmationSubmission], {
        comment: "Single uploaded row confirmed for platform use.",
        emptyDescription: "This row still has issues. Save the edits first, then confirm it.",
        successDescription: () => "This uploaded row is now approved and ready for platform use.",
        successTitle: "Row confirmed",
      });
      if (!confirmed) {
        setPendingNextSubmissionId(null);
        return;
      }
      if (editingSubmissionId === submission.id) {
        cancelRowEdit({ force: true, keepPendingNext: true });
      }
    } finally {
      if (!nextSubmissionId) setPendingNextSubmissionId(null);
      setConfirmingSubmissionId(null);
    }
  }

  async function confirmImportedRows(
    targetRows: (SubmissionRead | SubmissionRecord)[],
    options: {
      comment: string;
      emptyDescription: string;
      successDescription: (confirmedRows: number, skippedRows: number) => string;
      successTitle: string;
    },
  ): Promise<boolean> {
    if (!token || token === "preview-token") {
      if (!targetRows.length) {
        pushToast({
          title: "No cleaned rows ready",
          description: options.emptyDescription,
          tone: "warning",
        });
        return false;
      }
      const now = new Date().toISOString();
      targetRows.forEach((submission) => {
        const submissionRecord = submission as SubmissionRecord;
        upsertLocalSubmission({
          ...submissionRecord,
          approved_at: now,
          approved_by_name: "Current user",
          audit_events: [
            ...submissionRecord.audit_events,
            {
              action: "Imported Row Confirmed",
              actor: "Current user",
              created_at: now,
              reason: options.comment,
            },
          ],
          history: [
            ...submissionRecord.history,
            {
              action: "Imported Row Confirmed",
              actor: "Current user",
              comment: options.comment,
              created_at: now,
            },
          ],
          payload_json: {
            ...submissionRecord.payload_json,
            _import_issues: [],
            _quality_status: "approved",
            _review_required: false,
            _validation_issues: [],
          },
          review_stage: "Approved",
          reviewer: "Current user",
          status: "approved",
          workflow: [
            ...submissionRecord.workflow,
            {
              action_date: now,
              reviewer: "Current user",
              sla_status: "On Time",
              stage: "Approved",
            },
          ],
        });
      });
      setStatusFilter("approved");
      setSourceFilter("uploaded");
      pushToast({
        title: options.successTitle,
        description: options.successDescription(targetRows.length, 0),
        tone: "success",
      });
      return true;
    }
    const cleanRows = targetRows.filter(
      (submission) => !importBlockingIssues(submission).length,
    );
    if (!cleanRows.length) {
      pushToast({
        title: "No cleaned rows ready",
        description: options.emptyDescription,
        tone: "warning",
      });
      return false;
    }
    setConfirmingImports(true);
    try {
      const response = await confirmImportedFormDataRows(token, formId, {
        comment: options.comment,
        submission_ids: cleanRows.map((submission) => submission.id),
      });
      await queryClient.invalidateQueries({ queryKey: ["forms-module", "submissions", token] });
      setStatusFilter("approved");
      setSourceFilter("uploaded");
      pushToast({
        title: options.successTitle,
        description: options.successDescription(response.confirmed_rows, response.skipped_rows),
        tone: response.skipped_rows ? "warning" : "success",
      });
      return response.confirmed_rows > 0;
    } catch (error) {
      pushToast({
        title: "Could not confirm import",
        description: error instanceof Error ? error.message : "Clean staged rows and try again.",
        tone: "danger",
      });
      return false;
    } finally {
      setConfirmingImports(false);
    }
  }

  async function returnStagedRowsToSource(): Promise<void> {
    if (!token || token === "preview-token") {
      pushToast({
        title: "Preview rows stay local",
        description: "Sign in to return uploaded rows to source for correction.",
        tone: "warning",
      });
      return;
    }
    if (!stagedImportRows.length) {
      pushToast({
        title: "No staged rows to return",
        description: "There are no staged uploaded rows to return to source.",
        tone: "warning",
      });
      return;
    }
    setReturningImports(true);
    try {
      const response = await returnImportedFormDataRows(token, formId, {
        comment: returnComment.trim() || "Returned to source for correction and re-upload.",
        submission_ids: stagedImportRows.map((submission) => submission.id),
      });
      await queryClient.invalidateQueries({ queryKey: ["forms-module", "submissions", token] });
      setReturnComment("");
      setStatusFilter("returned");
      setSourceFilter("uploaded");
      pushToast({
        title: "Rows returned to source",
        description: `${response.returned_rows} uploaded row(s) returned for correction.${response.skipped_rows ? ` ${response.skipped_rows} row(s) were skipped.` : ""}`,
        tone: "success",
      });
    } catch (error) {
      pushToast({
        title: "Could not return rows",
        description: error instanceof Error ? error.message : "Try again.",
        tone: "danger",
      });
    } finally {
      setReturningImports(false);
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
            {statusFilter === "approved" ? (
              <p className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-success/35 bg-success/10 px-2.5 py-1 text-xs text-success">
                <CheckCircle2 aria-hidden="true" size={13} />
                Clean dataset: approved field submissions and confirmed (cleaned) uploads. Use the status filter to inspect pending or returned rows.
              </p>
            ) : null}
            {form && !canUploadData ? (
              <p className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-warning/35 bg-warning/10 px-2.5 py-1 text-xs text-warning">
                <UploadCloud aria-hidden="true" size={13} />
                {form.status === "draft"
                  ? "Data upload is available once this form is published."
                  : "Data upload is only available while a form is published."}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={onBack} variant="secondary">
              <ArrowLeft aria-hidden="true" />
              Back to forms
            </Button>
            {canUploadData ? (
              <>
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
                  disabled={confirmingImports || !confirmableImportRows.length || Boolean(editingSubmissionId)}
                  onClick={() => void confirmCleanedImportedRows()}
                  variant="primary"
                >
                  <CheckCircle2 aria-hidden="true" />
                  {confirmingImports ? "Confirming" : "Confirm cleaned rows"}
                </Button>
                {stagedImportRows.length ? (
                  <>
                    <Input
                      className="h-9 w-56"
                      onChange={(event) => setReturnComment(event.target.value)}
                      placeholder="Reason to return (optional)"
                      value={returnComment}
                    />
                    <Button
                      disabled={returningImports || !stagedImportRows.length}
                      onClick={() => void returnStagedRowsToSource()}
                      variant="secondary"
                    >
                      <ArrowLeft aria-hidden="true" />
                      {returningImports ? "Returning" : `Return ${stagedImportRows.length} to source`}
                    </Button>
                  </>
                ) : null}
                <input
                  accept=".csv,.tsv,.txt,.xlsx"
                  className="hidden"
                  onChange={(event) =>
                    void handleFormDataUpload(event.target.files?.[0] ?? null)
                  }
                  ref={fileInputRef}
                  type="file"
                />
              </>
            ) : null}
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

      {visibleStagedImportRows.length ? (
        <div className="rounded-xl border border-warning/30 bg-warning/8 p-3 text-sm">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-semibold">
                {visibleStagedImportRows.length} uploaded row(s) are staged for cleaning.
              </p>
              <p className="text-muted-foreground">
                Clean rows with missing values or invalid options, then confirm cleaned rows before they feed dashboards, reports, metrics, or entity profiles.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Click any staged response cell to load it into the editor bar above the sheet. Keep the sheet for scanning; keep the warnings and editing at the top.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Shortcuts: <span className="font-medium text-foreground">Enter</span> or <span className="font-medium text-foreground">Tab</span> moves across cells, <span className="font-medium text-foreground">arrow keys</span> move between selected cells, and <span className="font-medium text-foreground">Esc</span> cancels the row.
              </p>
	              <p className="mt-1 text-xs text-muted-foreground">
	                Save shortcuts: <span className="font-medium text-foreground">Ctrl/Cmd + S</span> saves the current row, and <span className="font-medium text-foreground">Ctrl/Cmd + Shift + S</span> saves and opens the next staged row.
	              </p>
	              <p className="mt-1 text-xs text-muted-foreground">
	                Confirm shortcuts: <span className="font-medium text-foreground">Ctrl/Cmd + Enter</span> confirms a clean row, and <span className="font-medium text-foreground">Ctrl/Cmd + Shift + Enter</span> confirms it and opens the next staged row.
	              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Button
                  onClick={() => {
                    setSourceFilter("uploaded");
                    setStatusFilter("import_staged");
                    setStagedQueueFilter("all");
                  }}
                  size="sm"
                  variant={stagedQueueFilter === "all" ? "primary" : "ghost"}
                >
                  All staged ({visibleStagedImportRows.length})
                </Button>
                <Button
                  onClick={() => {
                    setSourceFilter("uploaded");
                    setStatusFilter("import_staged");
                    setStagedQueueFilter("needs_cleaning");
                  }}
                  size="sm"
                  variant={stagedQueueFilter === "needs_cleaning" ? "primary" : "ghost"}
                >
                  Needs cleaning ({stagedRowsNeedingCleaning})
                </Button>
                <Button
                  onClick={() => {
                    setSourceFilter("uploaded");
                    setStatusFilter("import_staged");
                    setStagedQueueFilter("ready_to_confirm");
                  }}
                  size="sm"
                  variant={stagedQueueFilter === "ready_to_confirm" ? "primary" : "ghost"}
                >
                  Ready to confirm ({stagedRowsReadyToConfirm})
                </Button>
              </div>
              <div className="mt-2 max-w-xl space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">
                    Queue ready progress
                  </span>
                  <span className="font-medium text-foreground">
                    {stagedQueueReadyPercent}% ready
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-success transition-all"
                    style={{ width: `${stagedQueueReadyPercent}%` }}
                  />
                </div>
                <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                  <span>
                    <span className="font-medium text-foreground">
                      {stagedRowsReadyToConfirm}
                    </span>{" "}
                    ready to confirm
                  </span>
                  <span>
                    <span className="font-medium text-foreground">
                      {stagedRowsNeedingCleaning}
                    </span>{" "}
                    still need cleaning
                  </span>
                  <span>
                    <span className="font-medium text-foreground">
                      {stagedIssueCountTotal}
                    </span>{" "}
                    total issue{stagedIssueCountTotal === 1 ? "" : "s"} remaining
                  </span>
                  {stagedIssueBreakdownTotal.missing > 0 ? (
                    <span>
                      <span className="font-medium text-foreground">
                        {stagedIssueBreakdownTotal.missing}
                      </span>{" "}
                      missing value{stagedIssueBreakdownTotal.missing === 1 ? "" : "s"}
                    </span>
                  ) : null}
                  {stagedIssueBreakdownTotal.invalidOption > 0 ? (
                    <span>
                      <span className="font-medium text-foreground">
                        {stagedIssueBreakdownTotal.invalidOption}
                      </span>{" "}
                      invalid option{stagedIssueBreakdownTotal.invalidOption === 1 ? "" : "s"}
                    </span>
                  ) : null}
                </div>
              </div>
              {stagedQueueFilter !== "all" ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Showing {stagedImportRows.length} row(s) in the{" "}
                  <span className="font-medium text-foreground">
                    {stagedQueueFilter === "needs_cleaning"
                      ? "Needs cleaning"
                      : "Ready to confirm"}
                  </span>{" "}
                  queue.
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={!stagedImportRows.length || Boolean(editingSubmissionId)}
                onClick={openFirstQueuedStagedRow}
                size="sm"
                variant="secondary"
              >
                <Pencil aria-hidden="true" />
                {stagedQueueFilter === "needs_cleaning"
                  ? `Open first issue row (${stagedImportRows.length})`
                  : stagedQueueFilter === "ready_to_confirm"
                    ? `Open first ready row (${stagedImportRows.length})`
                    : `Open first priority row (${stagedImportRows.length})`}
              </Button>
              <Button
                disabled={confirmingImports || !confirmableImportRows.length || Boolean(editingSubmissionId)}
                onClick={() => void confirmCleanedImportedRows()}
                size="sm"
                variant="primary"
              >
                <CheckCircle2 aria-hidden="true" />
                Confirm {confirmableImportRows.length} cleaned
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {showDictionary ? (
        <DataDictionaryPanel
          onExport={exportDictionary}
          questions={questions}
        />
      ) : null}

      {currentEditingSubmission && canCleanImportedSubmission(currentEditingSubmission) ? (
        <div className="rounded-xl border bg-panel p-3 shadow-line">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
            <div className="space-y-2">
              <div>
                <p className="text-sm font-semibold">Spreadsheet editor</p>
                <p className="text-xs text-muted-foreground">
                  Warnings stay here. Click any cell in the active staged row to load it into this editor.
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5 text-[10px]">
                {currentEditingCellReference ? (
                  <Badge tone="accent">Cell {currentEditingCellReference}</Badge>
                ) : null}
                {currentEditingRowIndex >= 0 ? (
                  <Badge tone="neutral">
                    Row {currentEditingRowIndex + 1} of {stagedImportRows.length}
                  </Badge>
                ) : null}
                {activeEditingQuestion ? (
                  <Badge tone="neutral">Field: {activeEditingQuestion.label}</Badge>
                ) : null}
                {activeEditingQuestion ? (
                  <Badge tone="neutral">Variable: {activeEditingQuestion.key}</Badge>
                ) : null}
                {activeEditingQuestion ? (
                  <Badge tone="neutral">
                    Type: {questionTypeLabel(activeEditingQuestion.type)}
                  </Badge>
                ) : null}
                {activeEditingQuestion ? (
                  <Badge tone={activeEditingQuestion.required ? "warning" : "neutral"}>
                    {activeEditingQuestion.required ? "Required" : "Optional"}
                  </Badge>
                ) : null}
                <Badge tone={isEditingDirty ? "warning" : "success"}>
                  {isEditingDirty ? "Unsaved changes" : "Saved locally"}
                </Badge>
                <Badge tone={currentEditingIssueCount > 0 ? "warning" : "success"}>
                  {currentEditingRowStateLabel}
                </Badge>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Button
                disabled={!currentEditingPreviousSubmissionId}
                onClick={() => openAdjacentEditingRow(-1)}
                size="sm"
                variant="ghost"
              >
                {currentEditingPreviousRowLabel}
              </Button>
              <Button
                disabled={!currentEditingIssueCount}
                onClick={() => jumpToEditingIssue(-1)}
                size="sm"
                variant="ghost"
              >
                Previous issue
              </Button>
              <Button
                disabled={!currentEditingIssueCount}
                onClick={() => jumpToEditingIssue(1)}
                size="sm"
                variant="ghost"
              >
                Next issue
              </Button>
              <Button
                disabled={!currentEditingNextSubmissionId}
                onClick={() => openAdjacentEditingRow(1)}
                size="sm"
                variant="ghost"
              >
                {currentEditingNextRowLabel}
              </Button>
              <Button
                disabled={updateImportedRowMutation.isPending}
                onClick={() => void saveEditedRow(currentEditingSubmission)}
                size="sm"
                variant="secondary"
              >
                <Save aria-hidden="true" />
                {updateImportedRowMutation.isPending ? "Saving" : currentEditingSaveLabel}
              </Button>
              <Button
                disabled={updateImportedRowMutation.isPending || !currentEditingNextSubmissionId}
                onClick={() =>
                  void saveEditedRow(currentEditingSubmission, { advanceToNext: true })
                }
                size="sm"
                variant="secondary"
              >
                {currentEditingSaveNextLabel}
              </Button>
              {!currentEditingIssueCount ? (
                <>
                  <Button
                    disabled={
                      confirmingImports ||
                      confirmingSubmissionId === currentEditingSubmission.id ||
                      updateImportedRowMutation.isPending ||
                      !currentEditingNextSubmissionId
                    }
                    onClick={() =>
                      void confirmSingleImportedRow(currentEditingSubmission, {
                        advanceToNext: true,
                      })
                    }
                    size="sm"
                    variant="secondary"
                  >
                    <CheckCircle2 aria-hidden="true" />
                    {currentEditingConfirmNextActionLabel}
                  </Button>
                  <Button
                    disabled={
                      confirmingImports ||
                      confirmingSubmissionId === currentEditingSubmission.id ||
                      updateImportedRowMutation.isPending
                    }
                    onClick={() => void confirmSingleImportedRow(currentEditingSubmission)}
                    size="sm"
                    variant="primary"
                  >
                    <CheckCircle2 aria-hidden="true" />
                    {confirmingSubmissionId === currentEditingSubmission.id
                      ? "Confirming"
                      : currentEditingConfirmActionLabel}
                  </Button>
                </>
              ) : null}
              <Button onClick={() => cancelRowEdit()} size="sm" variant="secondary">
                <X aria-hidden="true" />
                Close editor
              </Button>
            </div>
          </div>

          <div className="mt-3 rounded-lg border border-warning/30 bg-warning/8 p-3">
            {currentEditingIssueCount ? (
              <div className="space-y-1">
                <p className="text-[11px] font-medium text-warning">
                  {currentEditingIssueCount} cell
                  {currentEditingIssueCount === 1 ? "" : "s"} still need attention in this row.
                </p>
                {currentEditingIssueSummary ? (
                  <p className="text-[10px] text-muted-foreground">
                    {currentEditingIssueSummary}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="text-[11px] text-success">
                {isEditingDirty
                  ? "This row is clean. Confirm row will save your edits and approve it."
                  : "This row is clean and ready to confirm."}
              </p>
            )}
            {currentEditingQueueMovementHint ? (
              <p className="mt-1 text-[10px] text-muted-foreground">
                {currentEditingQueueMovementHint}
              </p>
            ) : null}
            {activeEditingIssueTarget?.message ? (
              <p className="mt-1 text-[10px] text-warning">
                <span className="font-medium">Selected cell warning:</span>{" "}
                {activeEditingIssueTarget.issueTypeLabel === "Issue"
                  ? activeEditingIssueTarget.label
                  : `${activeEditingIssueTarget.issueTypeLabel}: ${activeEditingIssueTarget.label}`}
                {activeEditingIssueTarget.message
                  ? ` - ${activeEditingIssueTarget.message}`
                  : ""}
              </p>
            ) : nextEditingIssueTarget?.message ? (
              <p className="mt-1 text-[10px] text-warning">
                <span className="font-medium">Next warning:</span>{" "}
                {nextEditingIssueTarget.issueTypeLabel === "Issue"
                  ? nextEditingIssueTarget.label
                  : `${nextEditingIssueTarget.issueTypeLabel}: ${nextEditingIssueTarget.label}`}
                {nextEditingIssueTarget.message
                  ? ` - ${nextEditingIssueTarget.message}`
                  : ""}
              </p>
            ) : null}
          </div>

          <div className="mt-3 grid gap-3 xl:grid-cols-[260px_minmax(0,1fr)]">
            <div className="space-y-3">
              <Input
                className="h-8"
                onChange={(event) => setEditingReason(event.target.value)}
                placeholder="Cleaning note (optional)"
                value={editingReason}
              />
              {currentEditingRequiredProgress.total ? (
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-[10px]">
                    <span className="text-muted-foreground">Required fields ready</span>
                    <span className="font-medium text-foreground">
                      {currentEditingRequiredProgress.completed}/
                      {currentEditingRequiredProgress.total}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        currentEditingRequiredProgress.percent === 100
                          ? "bg-success"
                          : "bg-warning",
                      )}
                      style={{ width: `${currentEditingRequiredProgress.percent}%` }}
                    />
                  </div>
                </div>
              ) : null}
              {activeEditingOptionsPreview ? (
                <p className="text-[10px] text-muted-foreground">
                  <span className="font-medium text-foreground">Allowed values:</span>{" "}
                  {activeEditingOptionsPreview}
                </p>
              ) : null}
              {activeEditingEditedValuePreview ? (
                <div className="space-y-1 text-[10px] text-muted-foreground">
                  {activeEditingCellDirty && activeEditingOriginalValuePreview ? (
                    <p>
                      <span className="font-medium text-foreground">Original:</span>{" "}
                      {activeEditingOriginalValuePreview}
                    </p>
                  ) : null}
                  <p>
                    <span className="font-medium text-foreground">
                      {activeEditingCellDirty ? "Edited:" : "Current value:"}
                    </span>{" "}
                    {activeEditingEditedValuePreview}
                  </p>
                </div>
              ) : null}
              <div className="flex flex-wrap gap-1.5">
                <Button
                  disabled={!activeEditingQuestion || activeEditingCurrentValue === ""}
                  onClick={() =>
                    activeEditingQuestion
                      ? updateEditingCell(activeEditingQuestion.key, "")
                      : undefined
                  }
                  size="sm"
                  variant="ghost"
                >
                  Clear cell
                </Button>
                <Button
                  disabled={!activeEditingCellDirty}
                  onClick={resetEditingCell}
                  size="sm"
                  variant="ghost"
                >
                  Reset cell
                </Button>
                <Button
                  disabled={!isEditingDirty}
                  onClick={resetEditingRow}
                  size="sm"
                  variant="ghost"
                >
                  Reset row
                </Button>
              </div>
            </div>
            <div className="space-y-3">
              <div className="rounded-lg border bg-background p-2.5">
                {activeEditingQuestion ? (
                  <InlineGridCellEditor
                    active
                    issues={currentEditingCellIssues}
                    onChange={(value) => updateEditingCell(activeEditingQuestion.key, value)}
                    onFocus={() => setEditingCellKey(activeEditingQuestion.key)}
                    onKeyDown={(event) =>
                      handleEditingCellKeyDown(event, activeEditingQuestion)
                    }
                    question={activeEditingQuestion}
                    registerRef={(element) =>
                      registerEditingCellRef(activeEditingQuestion.key, element)
                    }
                    value={activeEditingCurrentValue}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Select a cell in the staged row to edit it here.
                  </p>
                )}
              </div>
              {currentEditingIssueTargets.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {currentEditingIssueTargets.map((issue) => (
                    <button
                      className={cn(
                        "rounded-full border px-2 py-1 text-[10px] transition",
                        editingCellKey === issue.fieldKey
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-warning/40 bg-warning/10 text-warning hover:border-warning hover:bg-warning/15",
                      )}
                      key={`${issue.fieldKey}-${issue.label}`}
                      onClick={() => setEditingCellKey(issue.fieldKey)}
                      title={issue.message ?? issue.label}
                      type="button"
                    >
                      {issue.issueTypeLabel}: {issue.label}
                    </button>
                  ))}
                </div>
              ) : null}
              <div className="text-[10px] text-muted-foreground">
                <span className="font-medium text-foreground">Ctrl/Cmd+S</span>{" "}
                {currentEditingSaveShortcutHint}
                {currentEditingNextSubmissionId ? (
                  <>
                    {" "}
                    <span className="font-medium text-foreground">
                      Ctrl/Cmd+Shift+S
                    </span>{" "}
                    {currentEditingSaveNextShortcutHint}
                  </>
                ) : null}
                {!currentEditingIssueCount ? (
                  <>
                    {" "}
                    <span className="font-medium text-foreground">
                      Ctrl/Cmd+Enter
                    </span>{" "}
                    {currentEditingConfirmActionHint}
                    {currentEditingNextSubmissionId ? (
                      <>
                        {" "}
                        <span className="font-medium text-foreground">
                          Ctrl/Cmd+Shift+Enter
                        </span>{" "}
                        {currentEditingConfirmNextActionHint}
                      </>
                    ) : null}
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="rounded-xl border bg-panel shadow-line">
        <div className="max-h-[72vh] overflow-auto product-scrollbar">
          <table className="min-w-[1180px] border-separate border-spacing-0 text-[11px]">
            <thead>
              <tr className="bg-muted/70 text-left text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                {["Submission ID", "Source", "Quality Flags", "Submitted / Uploaded By", "Submitted / Uploaded At", "Status", "Approval", "Primary Entity", "Participants", "GPS Evidence", "Device", "Project", "Version", "Actions"].map((header, index) => (
                  <th
                    className={cn(
                      "sticky top-0 z-20 whitespace-nowrap border-b px-2 py-1.5 font-semibold",
                      index === 0 ? "left-0 z-30 bg-muted" : "bg-muted/70",
                    )}
                    key={header}
                  >
                    {header}
                  </th>
                ))}
	                {questions.map((question, questionIndex) => (
	                  <th className="sticky top-0 z-10 min-w-[10rem] border-b bg-muted/70 px-2 py-1.5 font-semibold" key={question.key}>
	                    <div className="flex items-center gap-1.5">
                          <span className="rounded border border-border/70 bg-background/80 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                            {spreadsheetColumnLabel(questionIndex)}
                          </span>
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
                      {question.required ? " · required" : ""}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredSubmissions.map((submission) => (
                (() => {
                  const importIssueBreakdown = stagedImportIssueBreakdown(submission);
                  return (
                <tr
                  className={cn(
                    "odd:bg-background even:bg-muted/20",
                    editingSubmissionId === submission.id && "bg-primary/5 ring-1 ring-inset ring-primary/20",
                  )}
                  key={submission.id}
                >
                  <td className="sticky left-0 z-10 whitespace-nowrap border-b bg-inherit px-2 py-1.5 font-medium">
                    <span title={submission.client_submission_id}>{displaySubmissionId(submission)}</span>
                  </td>
                  <td className="border-b px-2 py-1.5">
                    <Badge tone={isImportedSubmission(submission) ? "warning" : "success"}>
                      {submissionSourceLabel(submission)}
                    </Badge>
                    {submission.source_system ? (
                      <p className="mt-1 text-xs text-muted-foreground">{submission.source_system}</p>
                    ) : null}
                  </td>
                  <td className="border-b px-2 py-1.5">
                    <div className="flex max-w-64 flex-wrap gap-1">
                      {rowQualityWarnings(submission).map((warning) => (
	                        <Badge
	                          key={warning}
	                          tone={
	                            warning === "Beneficiary created" ||
                                warning === "Beneficiary linked" ||
                                warning === "Ready to confirm"
	                              ? "success"
	                              : warning === "Pending review" ||
                                    warning === "Profile update review" ||
                                    warning === "Needs cleaning"
	                                ? "warning"
	                                : "danger"
	                          }
                        >
                          {warning}
                        </Badge>
                      ))}
                      {canCleanImportedSubmission(submission) &&
                      stagedImportIssueCount(submission) > 0 ? (
                        <Badge tone="warning">
                          {stagedImportIssueCount(submission)} issue
                          {stagedImportIssueCount(submission) === 1 ? "" : "s"} to fix
                        </Badge>
                      ) : null}
                      {canCleanImportedSubmission(submission) &&
                      importIssueBreakdown.missing > 0 ? (
                        <Badge tone="warning">
                          {importIssueBreakdown.missing} missing
                        </Badge>
                      ) : null}
                      {canCleanImportedSubmission(submission) &&
                      importIssueBreakdown.invalidOption > 0 ? (
                        <Badge tone="warning">
                          {importIssueBreakdown.invalidOption} invalid option
                          {importIssueBreakdown.invalidOption === 1 ? "" : "s"}
                        </Badge>
                      ) : null}
                      {!rowQualityWarnings(submission).length ? <Badge tone="success">Clean</Badge> : null}
                    </div>
                  </td>
                  <td className="whitespace-nowrap border-b px-2 py-1.5" title={submissionActorDetail(submission)}>{submissionActorLabel(submission)}</td>
                  <td className="whitespace-nowrap border-b px-2 py-1.5">{formatDateTime(submission.imported_at ?? submission.submitted_at)}</td>
                  <td className="border-b px-2 py-1.5">
                    <Badge tone={statusTone(submission.status)}>{submission.status}</Badge>
                  </td>
                  <td className="whitespace-nowrap border-b px-2 py-1.5">
                    <span className={!submission.approved_at ? "text-muted-foreground" : undefined}>
                      {approvalCellLabel(submission)}
                    </span>
                  </td>
                  <td className="whitespace-nowrap border-b px-2 py-1.5">{submissionEntityCode(submission, beneficiaryCodes)}</td>
                  <td className="max-w-56 whitespace-nowrap border-b px-2 py-1.5">
                    <span title={(submission.linked_beneficiaries ?? []).map((link) => `${link.beneficiary_uid} ${link.display_name}`).join(", ")}>
                      {linkedBeneficiaryLabel(submission)}
                    </span>
                  </td>
                  <td className="whitespace-nowrap border-b px-2 py-1.5">
                    <span className={cn(!submissionHasUsableGps(submission) && "text-muted-foreground")}>
                      {formatSubmissionGpsEvidence(submission)}
                    </span>
                    {submissionHasUsableGps(submission) && submission.accuracy && submission.accuracy > 20 ? (
                      <p className="mt-1 text-[11px] text-warning">Poor accuracy; review location evidence.</p>
                    ) : null}
                  </td>
                  <td className="whitespace-nowrap border-b px-2 py-1.5">
                    <p className="max-w-44 truncate font-mono text-[11px]">{formatSubmissionDeviceEvidence(submission)}</p>
                    {submission.offline_created ? <p className="text-[11px] text-muted-foreground">Mobile offline sync</p> : null}
                  </td>
                  <td className="whitespace-nowrap border-b px-2 py-1.5">{form?.project_name ?? submission.project_id ?? "Project missing"}</td>
                  <td className="whitespace-nowrap border-b px-2 py-1.5">v{submission.server_sequence}</td>
                  <td className="whitespace-nowrap border-b px-2 py-1.5">
                    {canCleanImportedSubmission(submission) ? (
	                      editingSubmissionId === submission.id ? (
	                        <div className="min-w-[200px] space-y-1">
                            <Badge tone="accent">Editing in top workspace</Badge>
                            <p className="text-[10px] text-muted-foreground">
                              Click any response cell in this row to load it into the editor above.
                            </p>
                            <Button
                              onClick={() =>
                                router.push(`/submissions/all?submissionId=${submission.id}&tab=Responses`)
                              }
                              size="sm"
                              variant="ghost"
                            >
                              <ClipboardPenLine aria-hidden="true" />
                              Full review
                            </Button>
                        </div>
                      ) : (
                        <div className="flex min-w-[250px] flex-col gap-1.5">
                          <div className="flex flex-wrap gap-1.5">
	                            <Button
	                              onClick={() => startRowEdit(submission)}
	                              size="sm"
                                  title={stagedImportActionLabel(submission)}
	                              variant="secondary"
	                            >
	                              <Pencil aria-hidden="true" />
	                              {stagedImportActionLabel(submission)}
	                            </Button>
                                {!importBlockingIssues(submission).length ? (
                                  <Button
                                    disabled={confirmingImports || confirmingSubmissionId === submission.id}
                                    onClick={() => void confirmSingleImportedRow(submission)}
                                    size="sm"
                                    variant="primary"
                                  >
                                    <CheckCircle2 aria-hidden="true" />
                                    {confirmingSubmissionId === submission.id ? "Confirming" : "Confirm row"}
                                  </Button>
                                ) : null}
	                            <Button
	                              onClick={() => router.push(`/submissions/all?submissionId=${submission.id}&tab=Responses`)}
	                              size="sm"
                              variant="ghost"
                            >
                              <ClipboardPenLine aria-hidden="true" />
                              Full review
                            </Button>
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            {stagedImportNextStepHint(submission)}
                          </p>
                        </div>
                      )
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
	                    <td className="max-w-52 border-b px-1.5 py-1 align-top" key={`${submission.id}-${question.key}`}>
                          {(() => {
                            const cellIssues = importIssuesForQuestion(submission, question);
                            const hasIssues = cellIssues.length > 0;
                            return canCleanImportedSubmission(submission) ? (
                        <button
                          className={cn(
                            "block w-full rounded border border-dashed bg-background/65 px-1.5 py-1 text-left leading-snug transition hover:border-primary/25 hover:bg-primary/5",
                            hasIssues ? "border-warning/45 bg-warning/8" : "border-transparent",
                            editingSubmissionId === submission.id && editingCellKey === question.key
                              ? "border-primary bg-primary/8 shadow-[0_0_0_2px_rgba(15,118,110,0.12)]"
                              : "",
                          )}
                          onClick={() =>
                            editingSubmissionId === submission.id
                              ? setEditingCellKey(question.key)
                              : startRowEdit(submission, question.key)
                          }
                          title={hasIssues ? cellIssues.join("\n") : undefined}
                          type="button"
                        >
                          <div className="max-h-16 overflow-auto whitespace-pre-wrap break-words">
                            {formatCell(submissionAnswerMap(submission)[question.key]) || <span className="text-muted-foreground">Blank</span>}
                          </div>
                        </button>
	                      ) : (
                        <div
                          className={cn(
                            "max-h-16 overflow-auto whitespace-pre-wrap break-words rounded bg-background/65 px-1.5 py-1 leading-snug",
                            hasIssues && "border border-warning/45 bg-warning/8",
                          )}
                          title={hasIssues ? cellIssues.join("\n") : undefined}
                        >
                          {formatCell(submissionAnswerMap(submission)[question.key]) || <span className="text-muted-foreground">Blank</span>}
                        </div>
                            );
                          })()}
	                    </td>
	                  ))}
                </tr>
                  );
                })()
              ))}
            </tbody>
          </table>
          {!filteredSubmissions.length ? (
            <div className="p-10 text-center">
              <Table2 aria-hidden="true" className="mx-auto text-muted-foreground" size={24} />
              <p className="mt-3 font-medium">{emptyGridTitle}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {emptyGridDescription}
              </p>
              {queueFilteredEmpty ? (
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <Button
                    onClick={() => setStagedQueueFilter("all")}
                    size="sm"
                    variant="secondary"
                  >
                    Show all staged
                  </Button>
                  <Button
                    onClick={() =>
                      setStagedQueueFilter(
                        stagedQueueFilter === "needs_cleaning"
                          ? "ready_to_confirm"
                          : "needs_cleaning",
                      )
                    }
                    size="sm"
                    variant="ghost"
                  >
                    {stagedQueueFilter === "needs_cleaning"
                      ? "Show ready to confirm"
                      : "Show needs cleaning"}
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function InlineGridCellEditor({
  active,
  issues,
  onChange,
  onFocus,
  onKeyDown,
  question,
  registerRef,
  value,
}: {
  active: boolean;
  issues: string[];
  onChange: (value: string) => void;
  onFocus: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  question: FormGridQuestion;
  registerRef: RefCallback<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>;
  value: string;
}) {
  const options = parseQuestionOptions(question);
  const editorClassName = cn(
    "w-full rounded-md border bg-background px-2 py-1.5 text-[11px] outline-none transition",
    active
      ? "border-primary shadow-[0_0_0_3px_rgba(15,118,110,0.14)]"
      : issues.length
        ? "border-warning/55 bg-warning/8 focus:border-warning focus:ring-3 focus:ring-warning/15"
        : "border-input focus:border-ring focus:ring-3 focus:ring-ring/15",
  );
  if (["checkbox", "boolean", "consent"].includes(question.type)) {
    return (
      <div className="space-y-1">
        <select
          className={editorClassName}
          onChange={(event) => onChange(event.target.value)}
          onFocus={onFocus}
          onKeyDown={onKeyDown}
          ref={registerRef}
          value={value || "false"}
        >
          <option value="true">Yes / True</option>
          <option value="false">No / False</option>
        </select>
        {issues.length ? <p className="text-[10px] text-warning">{issues[0]}</p> : null}
      </div>
    );
  }
  if (options.length) {
    return (
      <div className="space-y-1">
        <select
          className={editorClassName}
          onChange={(event) => onChange(event.target.value)}
          onFocus={onFocus}
          onKeyDown={onKeyDown}
          ref={registerRef}
          value={value}
        >
          <option value="">Select value</option>
          {options.map((option) => (
            <option key={`${option.value}-${option.label}`} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {issues.length ? <p className="text-[10px] text-warning">{issues[0]}</p> : null}
      </div>
    );
  }
  if (
    ["textarea", "long_text", "repeat_group", "repeatable_group", "grid", "file", "photo", "signature", "gps", "geopoint", "location"].includes(question.type) ||
    value.trim().startsWith("{") ||
    value.trim().startsWith("[")
  ) {
    return (
      <div className="space-y-1">
        <textarea
          className={cn(editorClassName, "min-h-16")}
          onChange={(event) => onChange(event.target.value)}
          onFocus={onFocus}
          onKeyDown={onKeyDown}
          ref={registerRef}
          value={value}
        />
        {issues.length ? <p className="text-[10px] text-warning">{issues[0]}</p> : null}
      </div>
    );
  }
  return (
    <div className="space-y-1">
      <input
        className={editorClassName}
        onChange={(event) => onChange(event.target.value)}
        onFocus={onFocus}
        onKeyDown={onKeyDown}
        ref={registerRef}
        type={inputTypeForQuestion(question)}
        value={value}
      />
      {issues.length ? <p className="text-[10px] text-warning">{issues[0]}</p> : null}
    </div>
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
  onUseTemplate,
  projectSectors,
  templates,
}: {
  onOpenBuilder: () => void;
  onUseTemplate: (templateId: string) => void;
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
              onClick={() => onUseTemplate(template.id)}
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
