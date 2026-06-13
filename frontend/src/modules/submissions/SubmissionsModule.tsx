"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Archive,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Database,
  Download,
  Edit3,
  Eye,
  FileArchive,
  FileCheck2,
  FileSearch,
  Flag,
  History,
  Link2,
  MapPin,
  MessageSquareWarning,
  Paperclip,
  RotateCcw,
  Save,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  X,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

import { DataTable, type TableColumn } from "@/components/DataTable";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HelpHint } from "@/components/ui/help-hint";
import { Input, Select } from "@/components/ui/input";
import type { CurrentPrincipal, DataFormRead, DataFormSchemaRead, UserRead } from "@/lib/api";
import {
  governExport,
  getFormSchema,
  listFormRepeatRows,
  listForms,
  listSubmissionCorrections,
  listSubmissionHistory,
  listSubmissionRepeatRows,
  listSubmissions,
  listUsers,
  reviewSubmission,
  updateSubmissionResponses,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  submissionDetailTabs,
  submissionSections,
  type SubmissionDetailTab,
  type SubmissionRecord,
  type SubmissionSection,
} from "@/modules/submissions/data";
import {
  applyPreviewReviewAction,
  computeSubmissionsSummary,
  filterSubmissions,
  formatSubmissionStatus,
  getPreviewSubmissions,
  normalizeSubmission,
  qualityTone,
  resolveSubmissionAssignments,
  slaStatus,
  slaTone,
  statusTone,
} from "@/modules/submissions/utils";
import { useWorkspaceStore } from "@/stores/workspace";

type SubmissionsModuleProps = {
  principal?: CurrentPrincipal | null;
  token: string | null;
};

type ReviewAction =
  | "approve"
  | "reject"
  | "request_correction"
  | "start_review"
  | "archive";

type FormFieldMeta = {
  id: string;
  type: string;
  label: string;
  hint?: string | null;
  variable_name?: string | null;
  required?: boolean;
  options?: { label?: string; value?: string; name?: string }[];
};

type FormSectionMeta = {
  id: string;
  title: string;
  fields?: FormFieldMeta[];
};

type ParsedFormSchema = {
  sections?: FormSectionMeta[];
};

type ResponseRow = {
  issues: string[];
  key: string;
  label: string;
  value: unknown;
  type: string;
  sectionTitle: string;
  source: "form" | "uploaded" | "system";
  required: boolean;
  hint?: string | null;
  options?: FormFieldMeta["options"];
  redacted?: boolean;
};

type MobileIntegritySignal = {
  action?: string;
  code: string;
  detectedAt?: string;
  evidence?: Record<string, unknown>;
  message: string;
  severity: "info" | "warning" | "critical";
};

type MobileIntegrityPayload = {
  gpsAccuracyMeters?: number | null;
  gpsCapturedAt?: string | null;
  interviewDurationSeconds?: number | null;
  mediaCount?: number | null;
  offlineStartedAt?: string | null;
  offlineSubmittedAt?: string | null;
  requiredMediaCount?: number | null;
  riskLevel?: "low" | "medium" | "high";
  score?: number | null;
  signals: MobileIntegritySignal[];
};

type BeneficiaryProcessingStatus = {
  action?: string;
  beneficiaryId?: string;
  beneficiaryUid?: string;
  candidateBeneficiaryUid?: string;
  matchedFields?: string[];
  processedAt?: string;
  profileUpdateProposals?: number;
  reason?: string;
  status?: string;
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

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "Not recorded";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Not recorded";
  return parsed.toLocaleString();
}

function displaySubmissionId(submission: Pick<SubmissionRecord, "client_submission_id" | "submitted_at" | "imported_at" | "is_imported">): string {
  const raw = submission.client_submission_id;
  if (/^(MOB|UPL|IMP|SUB|WEB)-\d{4}-[A-Z0-9-]+$/i.test(raw)) return raw.toUpperCase();
  const year = new Date(submission.imported_at ?? submission.submitted_at).getFullYear();
  const suffix = raw.replace(/[^a-z0-9]/gi, "").slice(-6).toUpperCase() || "000001";
  const prefix = submission.is_imported ? "IMP" : raw.startsWith("draft_") || raw.startsWith("submission_") ? "MOB" : "SUB";
  return `${prefix}-${Number.isFinite(year) ? year : new Date().getFullYear()}-${suffix}`;
}

function submissionHasUsableGps(submission: SubmissionRecord): boolean {
  const locationStatus = submission.payload_json?._mobile_location_status;
  if (locationStatus === "not_required_or_missing") return false;
  return Number.isFinite(submission.latitude) && Number.isFinite(submission.longitude) && !(submission.latitude === 0 && submission.longitude === 0);
}

function formatGpsEvidence(submission: SubmissionRecord): string {
  if (!submissionHasUsableGps(submission)) return "No GPS captured";
  const accuracy = submission.accuracy == null ? "accuracy n/a" : `accuracy ${Math.round(submission.accuracy)}m`;
  return `${submission.latitude.toFixed(5)}, ${submission.longitude.toFixed(5)} · ${accuracy}`;
}

function formatDeviceEvidence(submission: SubmissionRecord): string {
  if (submission.is_imported) return "Uploaded/imported";
  return submission.device_id || "Unknown device";
}

function approvalActorLabel(submission: SubmissionRecord): string {
  return submission.approved_by_name || submission.approved_by_user_id || "Not approved yet";
}

function severityTone(severity: string): BadgeProps["tone"] {
  const normalized = severity.toLowerCase();
  if (normalized === "critical") return "danger";
  if (normalized === "high" || normalized === "warning") return "warning";
  if (normalized === "medium") return "accent";
  return "neutral";
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function numberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizedString(value: unknown): string | undefined {
  return stringValue(value)?.toLowerCase();
}

function getMobileIntegrity(submission: SubmissionRecord): MobileIntegrityPayload | null {
  const rawIntegrity = asRecord(submission.payload_json?._mobile_integrity);
  if (!rawIntegrity) return null;

  const rawSignals = Array.isArray(rawIntegrity.signals) ? rawIntegrity.signals : [];
  const signals = rawSignals
    .map((rawSignal): MobileIntegritySignal | null => {
      const signal = asRecord(rawSignal);
      if (!signal) return null;
      const severity = normalizedString(signal.severity);
      return {
        action: stringValue(signal.action),
        code: stringValue(signal.code) ?? "FIELD_INTEGRITY_SIGNAL",
        detectedAt: stringValue(signal.detectedAt) ?? stringValue(signal.detected_at) ?? stringValue(signal.createdAt),
        evidence: asRecord(signal.evidence) ?? undefined,
        message: stringValue(signal.message) ?? "Field integrity signal needs review.",
        severity:
          severity === "critical" || severity === "warning" || severity === "info"
            ? severity
            : "warning",
      };
    })
    .filter((signal): signal is MobileIntegritySignal => Boolean(signal));

  const riskLevel = normalizedString(rawIntegrity.riskLevel) ?? normalizedString(rawIntegrity.risk_level);
  return {
    gpsAccuracyMeters:
      numberValue(rawIntegrity.gpsAccuracyMeters) ?? numberValue(rawIntegrity.gps_accuracy_meters) ?? numberValue(rawIntegrity.gpsAccuracy),
    gpsCapturedAt:
      stringValue(rawIntegrity.gpsCapturedAt) ?? stringValue(rawIntegrity.gps_captured_at) ?? stringValue(rawIntegrity.reviewedAt) ?? null,
    interviewDurationSeconds:
      numberValue(rawIntegrity.interviewDurationSeconds) ?? numberValue(rawIntegrity.interview_duration_seconds) ?? numberValue(rawIntegrity.durationSeconds),
    mediaCount: numberValue(rawIntegrity.mediaCount) ?? numberValue(rawIntegrity.media_count) ?? numberValue(rawIntegrity.mediaEvidenceCount),
    offlineStartedAt:
      stringValue(rawIntegrity.offlineStartedAt) ?? stringValue(rawIntegrity.offline_started_at) ?? null,
    offlineSubmittedAt:
      stringValue(rawIntegrity.offlineSubmittedAt) ?? stringValue(rawIntegrity.offline_submitted_at) ?? null,
    requiredMediaCount:
      numberValue(rawIntegrity.requiredMediaCount) ?? numberValue(rawIntegrity.required_media_count),
    riskLevel:
      riskLevel === "high" || riskLevel === "medium" || riskLevel === "low"
        ? riskLevel
        : signals.some((signal) => signal.severity === "critical")
          ? "high"
          : signals.length
            ? "medium"
            : "low",
    score: numberValue(rawIntegrity.score),
    signals,
  };
}

function getMobileIntegrityStatus(submission: SubmissionRecord): string {
  return stringValue(submission.payload_json?._mobile_integrity_status) ?? "not_evaluated";
}

function getBeneficiaryProcessingStatus(submission: SubmissionRecord): BeneficiaryProcessingStatus | null {
  const raw = asRecord(submission.payload_json?._beneficiary_processing);
  if (!raw) return null;
  const matchedFields = Array.isArray(raw.matched_fields)
    ? raw.matched_fields.filter((field): field is string => typeof field === "string")
    : undefined;
  return {
    action: stringValue(raw.action),
    beneficiaryId: stringValue(raw.beneficiary_id),
    beneficiaryUid: stringValue(raw.beneficiary_uid),
    candidateBeneficiaryUid: stringValue(raw.candidate_beneficiary_uid),
    matchedFields,
    processedAt: stringValue(raw.processed_at),
    profileUpdateProposals: numberValue(raw.profile_update_proposals) ?? undefined,
    reason: stringValue(raw.reason),
    status: stringValue(raw.status),
  };
}

function mobileIntegrityTone(integrity: MobileIntegrityPayload | null): BadgeProps["tone"] {
  if (!integrity) return "neutral";
  if (integrity.riskLevel === "high" || integrity.signals.some((signal) => signal.severity === "critical")) return "danger";
  if (integrity.riskLevel === "medium" || integrity.signals.length) return "warning";
  return "success";
}

function mobileIntegrityLabel(integrity: MobileIntegrityPayload | null): string {
  if (!integrity) return "Not sent";
  if (integrity.riskLevel === "high") return "High risk";
  if (integrity.riskLevel === "medium") return "Review";
  return "Clear";
}

function linkedBeneficiaryLabel(submission: SubmissionRecord): string {
  const links = submission.linked_beneficiaries ?? [];
  const participantLinks = links.filter((link) => link.link_type !== "primary");
  if (!participantLinks.length) return "None";
  const shown = participantLinks.slice(0, 2).map((link) => link.beneficiary_uid);
  const remaining = participantLinks.length - shown.length;
  return remaining > 0 ? `${shown.join(", ")} +${remaining}` : shown.join(", ");
}

function submissionSourceLabel(submission: SubmissionRecord): string {
  if (submission.offline_created) return "Mobile / Field Submitted";
  if (submission.is_imported || submission.import_batch_id || submission.imported_at) return "Uploaded / Imported";
  return "Web Entry";
}

function submissionActorLabel(submission: SubmissionRecord): string {
  if (submission.submitted_by_name) return submission.submitted_by_name;
  if (submission.offline_created) return submission.field_officer_id ?? "Field officer";
  if (submission.is_imported || submission.import_batch_id || submission.imported_at) {
    return submission.imported_by_user_id ?? "Uploaded user";
  }
  return submission.field_officer_id ?? "Web user";
}

function formatDurationSeconds(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return "Not recorded";
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return remainingSeconds ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
}

function downloadCsv(
  filename: string,
  rows: Record<string, string | number | boolean | null | undefined>[],
): void {
  if (!rows.length) return;
  const headers = Object.keys(rows[0] ?? {});
  const csv = [
    headers.join(","),
    ...rows.map((row) =>
      headers.map((header) => JSON.stringify(row[header] ?? "")).join(","),
    ),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function SubmissionsModule({
  principal,
  token,
}: SubmissionsModuleProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [activeSection, setActiveSection] =
    useState<SubmissionSection>("dashboard");
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<
    string | null
  >(null);
  const [activeDetailTab, setActiveDetailTab] =
    useState<SubmissionDetailTab>("Overview");
  const [reviewComment, setReviewComment] = useState("");
  const [reviewResult, setReviewResult] = useState("");
  const [previewRows, setPreviewRows] = useState<SubmissionRecord[]>(() =>
    getPreviewSubmissions(),
  );
  const localSubmissions = useWorkspaceStore((state) => state.localSubmissions);
  const pushToast = useWorkspaceStore((state) => state.pushToast);
  const setActiveView = useWorkspaceStore((state) => state.setActiveView);
  const setPendingMapFeatureId = useWorkspaceStore((state) => state.setPendingMapFeatureId);
  const preview = isPreview(token);
  const canReview = hasAnyPermission(principal, [
    "submissions.review",
    "submissions.approve",
    "submissions.manage",
  ]);
  const [bulkSelectedIds, setBulkSelectedIds] = useState<Set<string>>(new Set());
  const [bulkComment, setBulkComment] = useState("");
  const [bulkRunning, setBulkRunning] = useState(false);
  const [quickRejectSubmission, setQuickRejectSubmission] = useState<SubmissionRecord | null>(null);
  const [quickRejectComment, setQuickRejectComment] = useState("");
  const bulkReviewEnabled = canReview && !preview && Boolean(token);

  useEffect(() => {
    setBulkSelectedIds(new Set());
  }, [activeSection]);

  function isBulkReviewable(submission: SubmissionRecord): boolean {
    return !["approved", "rejected", "archived"].includes(submission.status);
  }

  async function runBulkReview(action: ReviewAction, actionLabel: string): Promise<void> {
    const comment =
      bulkComment.trim() ||
      (action === "approve" ? "Approved from submissions list." : "");
    if (!comment) {
      pushToast({
        title: "Reviewer comment required",
        description: "Add one reason that applies to every selected record.",
        tone: "warning",
      });
      return;
    }
    const ids = Array.from(bulkSelectedIds);
    if (!ids.length || !token) return;
    setBulkRunning(true);
    const failedIds: string[] = [];
    for (const submissionId of ids) {
      try {
        await reviewSubmission(token, submissionId, { action, comment });
      } catch {
        failedIds.push(submissionId);
      }
    }
    setBulkRunning(false);
    setBulkSelectedIds(new Set(failedIds));
    if (!failedIds.length) setBulkComment("");
    pushToast({
      title: failedIds.length
        ? `${actionLabel}: ${ids.length - failedIds.length} done, ${failedIds.length} failed`
        : `${actionLabel}: ${ids.length} record(s) processed`,
      description: failedIds.length
        ? "Failed records stay selected. Check their workflow state and try again."
        : "Each record kept its own audit trail entry.",
      tone: failedIds.length ? "warning" : "success",
    });
    await submissionsQuery.refetch();
  }
  const canExport = hasAnyPermission(principal, [
    "submissions.export",
    "reports.export",
    "submissions.manage",
  ]);
  const canEditResponses = hasAnyPermission(principal, [
    "submissions.edit",
    "submissions.manage",
  ]);

  useEffect(() => {
    const slug = pathname.split("/").filter(Boolean).at(1);
    if (slug && submissionSections.some((section) => section.id === slug)) {
      setActiveSection(slug as SubmissionSection);
    }
    const submissionId = searchParams.get("submissionId");
    const tab = searchParams.get("tab");
    if (submissionId) setSelectedSubmissionId(submissionId);
    if (tab && submissionDetailTabs.includes(tab as SubmissionDetailTab)) {
      setActiveDetailTab(tab as SubmissionDetailTab);
    }
  }, [pathname, searchParams]);

  useEffect(() => {
    if (!localSubmissions.length) return;
    setPreviewRows((current) => [
      ...localSubmissions,
      ...current.filter(
        (submission) =>
          !localSubmissions.some((local) => local.id === submission.id),
      ),
    ]);
  }, [localSubmissions]);

  const submissionsQuery = useQuery({
    queryKey: ["submissions-module", token],
    queryFn: () => listSubmissions(token ?? ""),
    enabled: Boolean(token && !preview),
  });
  const formsQuery = useQuery({
    queryKey: ["submissions-module", "forms", token],
    queryFn: () => listForms(token ?? ""),
    enabled: Boolean(token && !preview),
  });
  const formMap = useMemo(() => {
    const map = new Map<string, DataFormRead>();
    for (const form of formsQuery.data ?? []) {
      map.set(form.id, form);
    }
    return map;
  }, [formsQuery.data]);
  const usersQuery = useQuery({
    queryKey: ["submissions-module", "users", token],
    queryFn: () => listUsers(token ?? ""),
    enabled: Boolean(token && !preview && canReview),
  });
  const userMap = useMemo(() => {
    const map = new Map<string, UserRead>();
    for (const user of usersQuery.data ?? []) {
      map.set(user.id, user);
    }
    return map;
  }, [usersQuery.data]);

  const submissions = useMemo(
    () => {
      if (preview) return previewRows;
      return (submissionsQuery.data ?? []).map((submission) => {
        const normalized = normalizeSubmission(submission);
        const form = formMap.get(submission.form_id);
        const assignments = resolveSubmissionAssignments(submission, userMap);
        const withForm = form
          ? {
              ...normalized,
              form_name: form.name,
              form_version: form.current_version,
              project_name: form.project_id
                ? normalized.project_name
                : "Project link missing",
            }
          : normalized;
        return { ...withForm, ...assignments };
      });
    },
    [formMap, preview, previewRows, submissionsQuery.data, userMap],
  );
  const summary = useMemo(
    () => computeSubmissionsSummary(submissions),
    [submissions],
  );
  const visibleSubmissions = useMemo(
    () => filterSubmissions(submissions, activeSection),
    [activeSection, submissions],
  );
  const [filterProjectName, setFilterProjectName] = useState("");
  const [filterFormName, setFilterFormName] = useState("");
  const [filterReviewer, setFilterReviewer] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const submissionFilters = {
    dateFrom: filterDateFrom,
    dateTo: filterDateTo,
    formName: filterFormName,
    projectName: filterProjectName,
    reviewer: filterReviewer,
  };
  function setSubmissionFilters(patch: Partial<typeof submissionFilters>): void {
    if (patch.projectName !== undefined) setFilterProjectName(patch.projectName);
    if (patch.formName !== undefined) setFilterFormName(patch.formName);
    if (patch.reviewer !== undefined) setFilterReviewer(patch.reviewer);
    if (patch.dateFrom !== undefined) setFilterDateFrom(patch.dateFrom);
    if (patch.dateTo !== undefined) setFilterDateTo(patch.dateTo);
  }
  const filteredSubmissions = useMemo(() => {
    const fromTime = filterDateFrom ? new Date(filterDateFrom).getTime() : null;
    const toTime = filterDateTo ? new Date(filterDateTo).getTime() : null;
    return visibleSubmissions.filter((submission) => {
      if (filterProjectName && submission.project_name !== filterProjectName) return false;
      if (filterFormName && submission.form_name !== filterFormName) return false;
      if (filterReviewer && submission.reviewer !== filterReviewer) return false;
      if (fromTime !== null || toTime !== null) {
        if (!submission.submitted_at) return false;
        const submittedTime = new Date(submission.submitted_at).getTime();
        if (fromTime !== null && submittedTime < fromTime) return false;
        if (toTime !== null && submittedTime > toTime) return false;
      }
      return true;
    });
  }, [filterDateFrom, filterDateTo, filterFormName, filterProjectName, filterReviewer, visibleSubmissions]);
  const selectedSubmission =
    submissions.find((submission) => submission.id === selectedSubmissionId) ??
    null;
  const selectedFormSchemaQuery = useQuery({
    queryKey: ["submission-form-schema", token, selectedSubmission?.form_id],
    queryFn: () => getFormSchema(token ?? "", selectedSubmission?.form_id ?? ""),
    enabled: Boolean(token && !preview && selectedSubmission?.form_id),
  });

  const reviewMutation = useMutation({
    mutationFn: ({
      action,
      comment,
      submissionId,
    }: {
      action: ReviewAction;
      comment: string;
      submissionId: string;
    }) => reviewSubmission(token ?? "", submissionId, { action, comment }),
    onSuccess: async (submission, variables) => {
      const processing = getBeneficiaryProcessingStatus(normalizeSubmission(submission));
      const processingNote =
        variables.action === "approve" && processing?.status === "processed"
          ? processing.action === "created"
            ? ` Beneficiary ${processing.beneficiaryUid ?? ""} was created.`
            : ` Submission was linked to beneficiary ${processing.beneficiaryUid ?? ""}.`
          : variables.action === "approve" && processing?.status === "reconciliation_required"
            ? " Beneficiary processing needs reconciliation before it becomes official entity data."
            : "";
      const approvalNote =
        variables.action === "approve"
          ? " Approved data is now eligible for beneficiary/entity linking, indicators, analysis, and reports."
          : "";
      setReviewResult(
        `${submission.client_submission_id} is now ${formatSubmissionStatus(submission.status)}.${approvalNote}${processingNote} Reviewer note: ${variables.comment}`,
      );
      pushToast({
        title: "Submission updated",
        description: submission.client_submission_id,
        tone: "success",
      });
      await submissionsQuery.refetch();
    },
    onError: () => {
      setReviewResult(
        "Review action failed. Confirm the record is open, comments are complete, and your role can review this submission.",
      );
      pushToast({
        title: "Review action failed",
        description: "Check submission state and permissions.",
        tone: "danger",
      });
    },
  });

  const updateResponsesMutation = useMutation({
    mutationFn: ({
      reason,
      responses,
      submissionId,
    }: {
      reason: string;
      responses: Record<string, unknown>;
      submissionId: string;
    }) =>
      updateSubmissionResponses(token ?? "", submissionId, {
        reason,
        responses,
    }),
    onSuccess: async (submission) => {
      pushToast({
        title: submission.status === "approved" ? "Change request created" : "Responses saved",
        description:
          submission.status === "approved"
            ? `${submission.client_submission_id} is approved and locked. The proposed correction is waiting for review.`
            : submission.client_submission_id,
        tone: "success",
      });
      await submissionsQuery.refetch();
    },
    onError: () => {
      pushToast({
        title: "Could not save responses",
        description: "Check your permission and add a clear edit reason.",
        tone: "danger",
      });
    },
  });

  function openSubmission(
    submission: SubmissionRecord,
    tab: SubmissionDetailTab = "Overview",
  ): void {
    setSelectedSubmissionId(submission.id);
    setActiveDetailTab(tab);
    setReviewComment("");
    setReviewResult("");
  }

  function applyReviewAction(action: ReviewAction): void {
    if (!selectedSubmission) {
      pushToast({
        title: "Select a submission",
        description: "Choose a record before applying a workflow action.",
        tone: "warning",
      });
      return;
    }
    const trimmedComment = reviewComment.trim();
    if (
      (action === "reject" || action === "request_correction") &&
      trimmedComment.length < 8
    ) {
      setReviewResult(
        "Rejecting or returning a submission requires a clear reason so the field team knows what to fix.",
      );
      pushToast({
        title: "Comment required",
        description: "Add a practical reason before rejecting or returning.",
        tone: "warning",
      });
      return;
    }
    const comment =
      trimmedComment || `Reviewer selected ${action.replace("_", " ")}.`;

    if (preview) {
      setPreviewRows((current) =>
        applyPreviewReviewAction(
          current,
          selectedSubmission.id,
          action,
          comment,
        ),
      );
      setReviewResult(
        `${selectedSubmission.client_submission_id} was moved through ${action.replace("_", " ")}. Reviewer note: ${comment}`,
      );
      setReviewComment("");
      pushToast({
        title: "Preview workflow updated",
        description: selectedSubmission.client_submission_id,
        tone: "success",
      });
      return;
    }

    reviewMutation.mutate({
      action,
      comment,
      submissionId: selectedSubmission.id,
    });
  }

  function quickReviewSubmission(
    submission: SubmissionRecord,
    action: "approve" | "reject",
    comment?: string,
  ): void {
    const reviewerComment =
      comment?.trim() ||
      (action === "approve" ? "Approved from submissions list." : "");
    if (action === "reject" && reviewerComment.length < 8) {
      pushToast({
        title: "Reason required",
        description: "Enter a clear rejection reason for the field officer and audit trail.",
        tone: "warning",
      });
      return;
    }
    if (preview) {
      setPreviewRows((current) =>
        applyPreviewReviewAction(current, submission.id, action, reviewerComment),
      );
      setQuickRejectSubmission(null);
      setQuickRejectComment("");
      pushToast({
        title: action === "approve" ? "Preview approved" : "Preview rejected",
        description: displaySubmissionId(submission),
        tone: action === "approve" ? "success" : "warning",
      });
      return;
    }
    reviewMutation.mutate({
      action,
      comment: reviewerComment,
      submissionId: submission.id,
    });
    setQuickRejectSubmission(null);
    setQuickRejectComment("");
  }

  function saveResponses(
    submission: SubmissionRecord,
    responses: Record<string, unknown>,
    reason: string,
  ): void {
    if (preview) {
      setPreviewRows((current) =>
        current.map((row) =>
          row.id === submission.id
            ? {
                ...row,
                audit_events: [
                  ...row.audit_events,
                  {
                    action: "Submission Responses Edited",
                    actor: "Reviewer",
                    created_at: new Date().toISOString(),
                    reason,
                  },
                ],
                history: [
                  ...row.history,
                  {
                    action: "Responses Edited",
                    actor: "Reviewer",
                    comment: reason,
                    created_at: new Date().toISOString(),
                  },
                ],
                payload_json: {
                  ...responses,
                  ...Object.fromEntries(
                    Object.entries(row.payload_json).filter(([key]) =>
                      key.startsWith("_"),
                    ),
                  ),
                },
                server_sequence: row.server_sequence + 1,
              }
            : row,
        ),
      );
      pushToast({
        title: "Preview responses saved",
        description: submission.client_submission_id,
        tone: "success",
      });
      return;
    }
    updateResponsesMutation.mutate({
      reason,
      responses,
      submissionId: submission.id,
    });
  }

  async function exportSubmissionsCsv(
    filename: string,
    rows: SubmissionRecord[],
    filters: Record<string, unknown>,
  ): Promise<void> {
    if (token && token !== "preview-token") {
      await governExport(token, {
        dataset_type: "submissions",
        export_format: "csv",
        anonymized: false,
        record_count: rows.length,
        filters_json: filters,
      }).catch(() => undefined);
    }
    downloadCsv(
      filename,
      rows.map((submission) => ({
        id: displaySubmissionId(submission),
        project: submission.project_name,
        form: submission.form_name,
        source: submissionSourceLabel(submission),
        submitted_or_uploaded_by: submissionActorLabel(submission),
        status: submission.status,
        quality_score: submission.quality_score,
        submitted_at: submission.submitted_at,
      })),
    );
  }

  const columns: TableColumn<SubmissionRecord>[] = [
    {
      key: "submission",
      header: "Submission ID",
      value: (submission) =>
        `${displaySubmissionId(submission)} ${submission.client_submission_id} ${submission.project_name} ${submission.form_name}`,
      render: (submission) => (
        <button
          className="text-left"
          onClick={() => openSubmission(submission)}
          type="button"
        >
          <p className="font-medium text-foreground">
            <span title={submission.client_submission_id}>{displaySubmissionId(submission)}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            {submission.project_name}
          </p>
        </button>
      ),
    },
    {
      key: "beneficiary_code",
      header: "Primary Entity",
      value: (submission) => submission.beneficiary_code ?? "",
      render: (submission) =>
        submission.beneficiary_code ?? <span className="text-muted-foreground">—</span>,
    },
    {
      key: "linked_beneficiaries",
      header: "Participants",
      value: (submission) => linkedBeneficiaryLabel(submission),
      render: (submission) => (
        <span title={(submission.linked_beneficiaries ?? []).map((link) => `${link.beneficiary_uid} ${link.display_name}`).join(", ")}>
          {linkedBeneficiaryLabel(submission)}
        </span>
      ),
    },
    {
      key: "source",
      header: "Source",
      value: (submission) => submissionSourceLabel(submission),
      render: (submission) => (
        <Badge tone={submission.offline_created ? "success" : submission.is_imported ? "warning" : "neutral"}>
          {submissionSourceLabel(submission)}
        </Badge>
      ),
    },
    {
      key: "form",
      header: "Form",
      value: (submission) => submission.form_name,
      render: (submission) => <span>{submission.form_name}</span>,
    },
    {
      key: "enumerator",
      header: "Submitted By",
      value: (submission) => submissionActorLabel(submission),
      render: (submission) => submissionActorLabel(submission),
    },
    {
      key: "location",
      header: "Location",
      value: (submission) => formatGpsEvidence(submission),
      render: (submission) => (
        <div className="whitespace-nowrap">
          <p className={cn(!submissionHasUsableGps(submission) && "text-muted-foreground")}>
            {formatGpsEvidence(submission)}
          </p>
          {submissionHasUsableGps(submission) && submission.accuracy && submission.accuracy > 20 ? (
            <p className="text-xs text-warning">Poor accuracy</p>
          ) : null}
        </div>
      ),
    },
    {
      key: "device",
      header: "Device",
      value: (submission) => formatDeviceEvidence(submission),
      render: (submission) => (
        <div className="max-w-44">
          <p className="truncate font-mono text-[11px]">{formatDeviceEvidence(submission)}</p>
          {submission.offline_created ? <p className="text-xs text-muted-foreground">Mobile offline sync</p> : null}
        </div>
      ),
    },
    {
      key: "submitted",
      header: "Submitted",
      value: (submission) => submission.submitted_at,
      render: (submission) => formatDateTime(submission.submitted_at),
    },
    {
      key: "status",
      header: "Status",
      value: (submission) => submission.status,
      render: (submission) => (
        <Badge tone={statusTone(submission.status)}>
          {formatSubmissionStatus(submission.status)}
        </Badge>
      ),
    },
    {
      key: "stage",
      header: "Review Stage",
      value: (submission) => submission.review_stage,
      render: (submission) => submission.review_stage,
    },
    {
      key: "quality",
      header: "Quality",
      align: "right",
      value: (submission) => String(submission.quality_score),
      render: (submission) => (
        <Badge tone={qualityTone(submission.quality_score)}>
          {submission.quality_score}%
        </Badge>
      ),
    },
    {
      key: "review_quality",
      header: "Review Quality",
      align: "right",
      value: (submission) =>
        submission.review_quality === null || submission.review_quality === undefined
          ? ""
          : String(submission.review_quality),
      render: (submission) =>
        submission.review_quality === null || submission.review_quality === undefined ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <Badge tone={qualityTone(submission.review_quality)}>{submission.review_quality}%</Badge>
        ),
    },
    {
      key: "approved_by",
      header: "Approved By",
      value: (submission) => approvalActorLabel(submission),
      render: (submission) => (
        <span className={!submission.approved_by_name && !submission.approved_by_user_id ? "text-muted-foreground" : undefined}>
          {approvalActorLabel(submission)}
        </span>
      ),
    },
    {
      key: "approved_at",
      header: "Approved At",
      value: (submission) => submission.approved_at ?? "",
      render: (submission) =>
        submission.approved_at ? formatDateTime(submission.approved_at) : <span className="text-muted-foreground">—</span>,
    },
    {
      key: "integrity",
      header: "Integrity",
      align: "right",
      value: (submission) => mobileIntegrityLabel(getMobileIntegrity(submission)),
      render: (submission) => {
        const integrity = getMobileIntegrity(submission);
        return (
          <Badge tone={mobileIntegrityTone(integrity)}>
            {mobileIntegrityLabel(integrity)}
          </Badge>
        );
      },
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (submission) => (
        <div className="flex justify-end gap-1.5">
          <Button
            onClick={() => openSubmission(submission)}
            size="sm"
            variant="secondary"
          >
            <Eye aria-hidden="true" />
            View
          </Button>
          {canReview && submission.status === "approved" ? (
            <>
              <Badge tone="success">Already approved</Badge>
              <Button
                disabled={reviewMutation.isPending}
                onClick={() => {
                  setQuickRejectSubmission(submission);
                  setQuickRejectComment("");
                }}
                size="sm"
                variant="ghost"
              >
                <XCircle aria-hidden="true" />
                Reject
              </Button>
            </>
          ) : canReview && isBulkReviewable(submission) ? (
            <>
              <Button
                disabled={reviewMutation.isPending}
                onClick={() => quickReviewSubmission(submission, "approve")}
                size="sm"
                variant="ghost"
              >
                <CheckCircle2 aria-hidden="true" />
                Approve
              </Button>
              <Button
                disabled={reviewMutation.isPending}
                onClick={() => {
                  setQuickRejectSubmission(submission);
                  setQuickRejectComment("");
                }}
                size="sm"
                variant="ghost"
              >
                <XCircle aria-hidden="true" />
                Reject
              </Button>
            </>
          ) : null}
          {submissionHasUsableGps(submission) ? (
            <Button
              onClick={() => {
                setPendingMapFeatureId(`submission-${submission.id}`);
                setActiveView("map");
              }}
              size="sm"
              variant="ghost"
            >
              <MapPin aria-hidden="true" />
              Map
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <section className="space-y-3">
      <div className="rounded-xl border bg-panel p-3.5 shadow-line">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="collect">OPERATIONS</Badge>
              <Badge tone={summary.quality_alerts ? "warning" : "success"}>
                {summary.quality_alerts
                  ? `${summary.quality_alerts} quality alerts`
                  : "Quality clear"}
              </Badge>
              <Badge tone={summary.pending_review ? "warning" : "neutral"}>
                {summary.pending_review} pending review
              </Badge>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">
                Submissions
              </h1>
              <HelpHint label="About Submissions" title="Submissions">
                Review collected records, manage approval workflows, return
                corrections, inspect quality flags, track SLA bottlenecks, and
                preserve submission audit history.
              </HelpHint>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => setActiveSection("pending-review")}
              variant="primary"
            >
              <ClipboardCheck aria-hidden="true" />
              Review queue
            </Button>
            <Button
              disabled={!canExport || !submissions.length}
              onClick={() => exportSubmissionsCsv("atlas-submissions.csv", submissions, { section: "all" })}
              variant="secondary"
            >
              <Download aria-hidden="true" />
              Export
            </Button>
          </div>
        </div>
        <div
          className="mt-3 flex gap-1.5 overflow-x-auto product-scrollbar"
          aria-label="Submissions sections"
        >
          {submissionSections.map((section) => (
            <button
              className={cn(
                "shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium transition",
                activeSection === section.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-panel hover:bg-muted",
              )}
              key={section.id}
              onClick={() => {
                setSelectedSubmissionId(null);
                setActiveSection(section.id);
              }}
              type="button"
            >
              {section.label}
            </button>
          ))}
        </div>
      </div>

      {selectedSubmission ? (
        <SubmissionDetailWorkspace
          canEditResponses={canEditResponses}
          canReview={canReview}
          formSchema={selectedFormSchemaQuery.data ?? null}
          isSavingResponses={updateResponsesMutation.isPending}
          onApplyReviewAction={applyReviewAction}
          onClose={() => setSelectedSubmissionId(null)}
          onSaveResponses={saveResponses}
          preview={preview}
          reviewComment={reviewComment}
          reviewResult={reviewResult}
          setReviewComment={setReviewComment}
          setTab={setActiveDetailTab}
          submission={selectedSubmission}
          tab={activeDetailTab}
          token={token}
        />
      ) : null}

      {!selectedSubmission && activeSection === "dashboard" ? (
        <SubmissionsDashboard
          onOpenQuality={() => setActiveView("dataQuality")}
          onOpenSubmission={openSubmission}
          onOpenWorkflow={() => setActiveSection("pending-review")}
          submissions={submissions}
          summary={summary}
        />
      ) : null}

      {!selectedSubmission && activeSection === "data" ? (
        <section className="space-y-4">
          <SectionHeader
            description={
              submissionSections.find((section) => section.id === "data")
                ?.description ?? "Spreadsheet view of collected field values"
            }
            route="/submissions/data"
            title="Data Explorer"
          />
          <DataExplorerSection
            forms={formsQuery.data ?? []}
            onOpenSubmission={openSubmission}
            preview={preview}
            submissions={submissions}
            token={token}
          />
        </section>
      ) : null}

      {!selectedSubmission && activeSection !== "dashboard" && activeSection !== "data" ? (
        <section className="space-y-4">
          <SectionHeader
            action={
              <Button
                disabled={!canExport || !filteredSubmissions.length}
                onClick={() =>
                  exportSubmissionsCsv("atlas-submission-view.csv", filteredSubmissions, {
                    section: activeSection,
                    visible_statuses: Array.from(new Set(filteredSubmissions.map((submission) => submission.status))),
                  })
                }
                variant="secondary"
              >
                <Download aria-hidden="true" />
                Export view
              </Button>
            }
            description={
              submissionSections.find((section) => section.id === activeSection)
                ?.description ?? "Manage submissions"
            }
            route={
              submissionSections.find((section) => section.id === activeSection)
                ?.route ?? "/submissions"
            }
            title={
              submissionSections.find((section) => section.id === activeSection)
                ?.label ?? "Submissions"
            }
          />
          <SubmissionFilters
            activeSection={activeSection}
            filters={submissionFilters}
            onChange={setSubmissionFilters}
            submissions={visibleSubmissions}
          />
          {quickRejectSubmission ? (
            <section className="rounded-xl border border-danger/30 bg-danger/8 p-3 shadow-line">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">
                    Reject {displaySubmissionId(quickRejectSubmission)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Enter the exact reason. The field officer will see this comment after sync.
                  </p>
                  <Input
                    autoFocus
                    className="mt-2 h-8 text-xs"
                    disabled={reviewMutation.isPending}
                    onChange={(event) => setQuickRejectComment(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        quickReviewSubmission(quickRejectSubmission, "reject", quickRejectComment);
                      }
                      if (event.key === "Escape") {
                        setQuickRejectSubmission(null);
                        setQuickRejectComment("");
                      }
                    }}
                    placeholder="Example: GPS is outside the assigned village; revisit and correct location."
                    value={quickRejectComment}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    disabled={reviewMutation.isPending || quickRejectComment.trim().length < 8}
                    onClick={() => quickReviewSubmission(quickRejectSubmission, "reject", quickRejectComment)}
                    size="sm"
                    variant="danger"
                  >
                    <XCircle aria-hidden="true" />
                    Reject
                  </Button>
                  <Button
                    disabled={reviewMutation.isPending}
                    onClick={() => {
                      setQuickRejectSubmission(null);
                      setQuickRejectComment("");
                    }}
                    size="sm"
                    variant="ghost"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </section>
          ) : null}
          {bulkReviewEnabled && bulkSelectedIds.size ? (
            <section className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/25 bg-primary/5 p-3">
              <Badge tone="accent">{bulkSelectedIds.size} selected</Badge>
              <Input
                aria-label="Bulk reviewer comment"
                className="h-8 min-w-64 flex-1 text-xs"
                disabled={bulkRunning}
                onChange={(event) => setBulkComment(event.target.value)}
                placeholder="Reason for return/reject. Optional for approval."
                value={bulkComment}
              />
              <Button
                disabled={bulkRunning}
                onClick={() => void runBulkReview("approve", "Bulk approve")}
                size="sm"
                variant="primary"
              >
                {bulkRunning ? "Processing…" : "Approve selected"}
              </Button>
              <Button
                disabled={bulkRunning || !bulkComment.trim()}
                onClick={() => void runBulkReview("request_correction", "Bulk return")}
                size="sm"
                variant="secondary"
              >
                Return selected
              </Button>
              <Button
                disabled={bulkRunning || !bulkComment.trim()}
                onClick={() => void runBulkReview("reject", "Bulk reject")}
                size="sm"
                variant="danger"
              >
                Reject selected
              </Button>
              <Button
                disabled={bulkRunning}
                onClick={() => setBulkSelectedIds(new Set())}
                size="sm"
                variant="ghost"
              >
                Clear
              </Button>
            </section>
          ) : null}
          <DataTable
            columns={columns}
            emptyAction={
              !visibleSubmissions.length
                ? {
                    label: "Open Forms",
                    onClick: () => setActiveView("forms"),
                  }
                : undefined
            }
            emptyDescription={
              visibleSubmissions.length
                ? "Adjust the filters above to see records from other statuses or projects."
                : "Submissions appear here after a published form is assigned and field officers sync collected data."
            }
            emptyLabel="No submissions match this view yet"
            rows={filteredSubmissions}
            searchLabel="Search submissions, forms, projects, officers, location"
            selection={
              bulkReviewEnabled
                ? {
                    isSelectable: isBulkReviewable,
                    isSelected: (submission) => bulkSelectedIds.has(submission.id),
                    onToggle: (submission, checked) =>
                      setBulkSelectedIds((current) => {
                        const next = new Set(current);
                        if (checked) next.add(submission.id);
                        else next.delete(submission.id);
                        return next;
                      }),
                    onToggleAll: (rows, checked) =>
                      setBulkSelectedIds((current) => {
                        const next = new Set(current);
                        for (const row of rows) {
                          if (checked) next.add(row.id);
                          else next.delete(row.id);
                        }
                        return next;
                      }),
                  }
                : undefined
            }
            title="Submission list"
          />
        </section>
      ) : null}
    </section>
  );
}

function SubmissionsDashboard({
  onOpenQuality,
  onOpenSubmission,
  onOpenWorkflow,
  submissions,
  summary,
}: {
  onOpenQuality: () => void;
  onOpenSubmission: (
    submission: SubmissionRecord,
    tab?: SubmissionDetailTab,
  ) => void;
  onOpenWorkflow: () => void;
  submissions: SubmissionRecord[];
  summary: ReturnType<typeof computeSubmissionsSummary>;
}) {
  type MetricCard = {
    icon: LucideIcon;
    label: string;
    tone?: BadgeProps["tone"];
    value: string | number;
  };
  const volumeCards: MetricCard[] = [
    {
      icon: FileSearch,
      label: "Total Submissions",
      value: summary.total_submissions,
    },
    {
      icon: Clock3,
      label: "Today's Submissions",
      value: summary.todays_submissions,
    },
    { icon: FileArchive, label: "Archived", value: summary.archived },
  ];
  const reviewPipelineCards: MetricCard[] = [
    {
      icon: ShieldAlert,
      label: "Pending Review",
      tone: summary.pending_review ? "warning" : "neutral",
      value: summary.pending_review,
    },
    {
      icon: CheckCircle2,
      label: "Approved",
      tone: "success",
      value: summary.approved,
    },
    {
      icon: XCircle,
      label: "Rejected",
      tone: summary.rejected ? "danger" : "neutral",
      value: summary.rejected,
    },
    {
      icon: RotateCcw,
      label: "Returned for Correction",
      tone: summary.returned ? "warning" : "neutral",
      value: summary.returned,
    },
  ];
  const qualityCards: MetricCard[] = [
    {
      icon: Flag,
      label: "Quality Alerts",
      tone: summary.quality_alerts ? "warning" : "success",
      value: summary.quality_alerts,
    },
    {
      icon: BarChart3,
      label: "Average Review Time",
      value: `${summary.average_review_hours}h`,
    },
    {
      icon: FileCheck2,
      label: "Approval Rate",
      tone: summary.approval_rate >= 70 ? "success" : "warning",
      value: `${summary.approval_rate}%`,
    },
  ];
  const cardGroups: { label: string; cards: MetricCard[] }[] = [
    { label: "Volume", cards: volumeCards },
    { label: "Review Pipeline", cards: reviewPipelineCards },
    { label: "Quality & Performance", cards: qualityCards },
  ];
  const reviewQueue = submissions
    .filter((submission) =>
      ["under_review", "submitted", "pending_review", "resubmitted"].includes(
        submission.status,
      ),
    )
    .slice(0, 5);
  const qualityAlerts = submissions
    .flatMap((submission) =>
      submission.quality_flags.map((flag) => ({ flag, submission })),
    )
    .slice(0, 5);
  const recentActions = submissions
    .flatMap((submission) =>
      submission.history.map((item) => ({ item, submission })),
    )
    .sort(
      (left, right) =>
        new Date(right.item.created_at).getTime() -
        new Date(left.item.created_at).getTime(),
    )
    .slice(0, 5);
  const reviewerWorkload = Object.entries(
    submissions.reduce<Record<string, number>>((counts, submission) => {
      counts[submission.reviewer] = (counts[submission.reviewer] ?? 0) + 1;
      return counts;
    }, {}),
  )
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5);

  return (
    <div className="space-y-3">
      <div className="space-y-4">
        {cardGroups.map((group) => (
          <div key={group.label}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {group.label}
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.cards.map((card) => (
                <article
                  className="rounded-xl border bg-panel p-3 shadow-line"
                  key={card.label}
                >
                  <div className="flex items-center justify-between gap-3">
                    <card.icon
                      aria-hidden="true"
                      className="text-primary"
                      size={18}
                    />
                    {card.tone ? <Badge tone={card.tone}>Live</Badge> : null}
                  </div>
                  <p className="mt-4 text-2xl font-semibold">{card.value}</p>
                  <p className="text-xs text-muted-foreground">{card.label}</p>
                </article>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Panel
          title="Review Queue"
          action={
            <Button onClick={onOpenWorkflow} size="sm" variant="secondary">
              Open queue
            </Button>
          }
        >
          <div className="space-y-3">
            {reviewQueue.map((submission) => (
              <button
                className="w-full rounded-xl border bg-background/60 p-3 text-left transition hover:bg-muted/60"
                key={submission.id}
                onClick={() => onOpenSubmission(submission, "Workflow")}
                type="button"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">
                      {submission.client_submission_id}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {submission.form_name} · {submission.reviewer}
                    </p>
                  </div>
                  <Badge tone={slaTone(slaStatus(submission.sla_due_at))}>
                    {slaStatus(submission.sla_due_at)}
                  </Badge>
                </div>
              </button>
            ))}
            {!reviewQueue.length ? (
              <EmptyMini label="No submissions are waiting for review." />
            ) : null}
          </div>
        </Panel>

        <Panel
          title="Quality Alerts"
          action={
            <Button onClick={onOpenQuality} size="sm" variant="secondary">
              Open quality
            </Button>
          }
        >
          <div className="space-y-3">
            {qualityAlerts.map(({ flag, submission }) => (
              <button
                className="w-full rounded-xl border bg-background/60 p-3 text-left transition hover:bg-muted/60"
                key={`${submission.id}-${flag.id}`}
                onClick={() => onOpenSubmission(submission, "Quality")}
                type="button"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{flag.check}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {submission.client_submission_id} · {flag.message}
                    </p>
                  </div>
                  <Badge tone={severityTone(flag.severity)}>
                    {flag.severity}
                  </Badge>
                </div>
              </button>
            ))}
            {!qualityAlerts.length ? (
              <EmptyMini label="No open submission quality alerts." />
            ) : null}
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel title="Submission Activity Feed">
          <TimelineRows
            rows={recentActions.map(({ item, submission }) => ({
              label: item.action,
              meta: `${submission.client_submission_id} · ${item.actor}`,
              time: item.created_at,
            }))}
          />
        </Panel>
        <Panel title="Reviewer Workload">
          <div className="space-y-3">
            {reviewerWorkload.map(([reviewer, count]) => (
              <Signal
                key={reviewer}
                label={reviewer}
                value={`${count} assigned`}
              />
            ))}
            {!reviewerWorkload.length ? (
              <EmptyMini label="No submissions to summarize yet." />
            ) : null}
          </div>
        </Panel>
        <Panel title="Approval Trends">
          <div className="space-y-3">
            <Signal
              label="Approval rate"
              value={`${summary.approval_rate}%`}
              tone={summary.approval_rate >= 70 ? "success" : "warning"}
            />
            <Signal
              label="Returned records"
              value={`${summary.returned}`}
              tone={summary.returned ? "warning" : "success"}
            />
            <Signal
              label="Average review"
              value={`${summary.average_review_hours} hours`}
            />
          </div>
        </Panel>
      </div>
    </div>
  );
}

function SubmissionDetailWorkspace({
  canEditResponses,
  canReview,
  formSchema,
  isSavingResponses,
  onApplyReviewAction,
  onClose,
  onSaveResponses,
  preview,
  reviewComment,
  reviewResult,
  setReviewComment,
  setTab,
  submission,
  tab,
  token,
}: {
  canEditResponses: boolean;
  canReview: boolean;
  formSchema: DataFormSchemaRead | null;
  isSavingResponses: boolean;
  onApplyReviewAction: (action: ReviewAction) => void;
  onClose: () => void;
  onSaveResponses: (
    submission: SubmissionRecord,
    responses: Record<string, unknown>,
    reason: string,
  ) => void;
  preview: boolean;
  reviewComment: string;
  reviewResult: string;
  setReviewComment: (value: string) => void;
  setTab: (tab: SubmissionDetailTab) => void;
  submission: SubmissionRecord;
  tab: SubmissionDetailTab;
  token: string | null;
}) {
  return (
    <section className="space-y-4 rounded-xl border bg-panel p-3.5 shadow-line">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={statusTone(submission.status)}>
              {formatSubmissionStatus(submission.status)}
            </Badge>
            <Badge tone={qualityTone(submission.quality_score)}>
              Quality {submission.quality_score}%
            </Badge>
            <Badge tone={slaTone(slaStatus(submission.sla_due_at))}>
              {slaStatus(submission.sla_due_at)}
            </Badge>
          </div>
          <h2 className="mt-3 text-xl font-semibold">
            <span title={submission.client_submission_id}>{displaySubmissionId(submission)}</span>
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {submission.project_name} · {submission.form_name} · v
            {submission.form_version}
          </p>
        </div>
        <Button onClick={onClose} variant="secondary">
          Back to list
        </Button>
      </div>

      <div className="flex gap-2 overflow-x-auto product-scrollbar">
        {submissionDetailTabs.map((item) => (
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

      {tab === "Overview" ? <OverviewTab submission={submission} /> : null}
      {tab === "Responses" ? (
        <ResponsesTab
          canEdit={canEditResponses}
          formSchema={formSchema}
          isSaving={isSavingResponses}
          onSave={onSaveResponses}
          preview={preview}
          submission={submission}
          token={token}
        />
      ) : null}
      {tab === "Workflow" ? (
        <WorkflowTab
          canReview={canReview}
          onApplyReviewAction={onApplyReviewAction}
          reviewComment={reviewComment}
          reviewResult={reviewResult}
          setReviewComment={setReviewComment}
          submission={submission}
        />
      ) : null}
      {tab === "Quality" ? <QualityTab submission={submission} /> : null}
      {tab === "Attachments" ? (
        <AttachmentsTab submission={submission} />
      ) : null}
      {tab === "Location" ? <LocationTab submission={submission} /> : null}
      {tab === "History" ? (
        <div className="space-y-4">
          <StatusHistoryPanel preview={preview} submission={submission} token={token} />
          <CorrectionsPanel preview={preview} submission={submission} token={token} />
        </div>
      ) : null}
      {tab === "Audit Trail" ? (
        <TimelineRows
          rows={submission.audit_events.map((event) => ({
            label: event.action,
            meta: `${event.actor}${event.reason ? ` · ${event.reason}` : ""}`,
            time: event.created_at,
          }))}
          immutable
        />
      ) : null}
    </section>
  );
}

function OverviewTab({ submission }: { submission: SubmissionRecord }) {
  const integrity = getMobileIntegrity(submission);
  const processing = getBeneficiaryProcessingStatus(submission);
  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Panel title="Submission Summary">
          <div className="grid gap-3 md:grid-cols-2">
            <Signal
              label="Submission ID"
              value={displaySubmissionId(submission)}
            />
            <Signal label="Project" value={submission.project_name} />
            <Signal label="Form" value={submission.form_name} />
            <Signal label="Form Version" value={`v${submission.form_version}`} />
            <Signal label="Source" value={submissionSourceLabel(submission)} tone={submission.offline_created ? "success" : "neutral"} />
            <Signal label="Submitted / Uploaded By" value={submissionActorLabel(submission)} />
            <Signal label="Supervisor" value={submission.supervisor} />
            <Signal
              label="Submitted"
              value={formatDateTime(submission.submitted_at)}
            />
            <Signal
              label="GPS Status"
              value={submission.gps_status}
              tone={submission.gps_status === "valid" ? "success" : "warning"}
            />
          </div>
        </Panel>
        <Panel title="Workflow, Quality, and Notes">
          <div className="grid gap-3 md:grid-cols-2">
            <Signal
              label="Current Status"
              value={formatSubmissionStatus(submission.status)}
              tone={statusTone(submission.status)}
            />
            <Signal label="Review Stage" value={submission.review_stage} />
            <Signal label="Reviewer" value={submission.reviewer} />
            <Signal
              label="Quality Score"
              value={`${submission.quality_score}%`}
              tone={qualityTone(submission.quality_score)}
            />
            <Signal
              label="Quality Flags"
              value={`${submission.quality_flags.filter((flag) => flag.status === "open").length} open`}
              tone={submission.quality_flags.length ? "warning" : "success"}
            />
            <Signal
              label="SLA Due"
              value={formatDateTime(submission.sla_due_at)}
              tone={slaTone(slaStatus(submission.sla_due_at))}
            />
          </div>
        </Panel>
      </div>
      <Panel title="Beneficiary Link">
        {processing ? (
          <div className="mb-3 rounded-xl border bg-background/60 p-3">
            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-sm font-semibold">
                  {processing.status === "processed"
                    ? processing.action === "created"
                      ? "Beneficiary created from approved submission"
                      : "Submission linked to beneficiary"
                    : "Beneficiary reconciliation required"}
                </p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {processing.beneficiaryUid
                    ? `Beneficiary code: ${processing.beneficiaryUid}`
                    : processing.candidateBeneficiaryUid
                      ? `Possible existing beneficiary: ${processing.candidateBeneficiaryUid}`
                      : processing.reason ?? "Approval processing has not produced a beneficiary code yet."}
                </p>
                {processing.profileUpdateProposals ? (
                  <p className="mt-1 text-xs font-medium text-warning">
                    {processing.profileUpdateProposals} profile update proposal(s) need review.
                  </p>
                ) : null}
                {processing.matchedFields?.length ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Matched fields: {processing.matchedFields.join(", ")}
                  </p>
                ) : null}
              </div>
              <Badge tone={processing.status === "processed" ? "success" : "warning"}>
                {humanizeKey(processing.status ?? "pending")}
              </Badge>
            </div>
          </div>
        ) : null}
        {submission.entity_id ? (
          <div className="flex flex-col gap-3 rounded-xl border border-success/30 bg-success/10 p-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Link2 aria-hidden="true" className="text-success" size={16} />
                <p className="text-sm font-semibold">Linked to beneficiary/entity</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {submission.entity_type ?? "Beneficiary"}
                {submission.beneficiary_code ? ` · ${submission.beneficiary_code}` : ` · ${submission.entity_id}`}
              </p>
            </div>
            <Badge tone="success">Timeline ready</Badge>
          </div>
        ) : (
          <div className="rounded-xl border border-warning/30 bg-warning/10 p-3">
            <div className="flex items-center gap-2">
              <ShieldAlert aria-hidden="true" className="text-warning" size={16} />
              <p className="text-sm font-semibold">This submission is not linked to a beneficiary.</p>
            </div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              If this form collects beneficiary data, approve-time processing will send it to Data Quality reconciliation so a data manager can link it to an existing beneficiary or create a controlled new record.
            </p>
          </div>
        )}
        <div className="mt-3 rounded-xl border bg-background/60 p-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-semibold">Other linked participants</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Project-level forms such as trainings, distributions, meetings, and incidents can link to multiple beneficiaries when their answers contain beneficiary codes.
              </p>
            </div>
            <Badge tone={(submission.linked_beneficiaries ?? []).some((link) => link.link_type !== "primary") ? "success" : "neutral"}>
              {linkedBeneficiaryLabel(submission)}
            </Badge>
          </div>
          {(submission.linked_beneficiaries ?? []).filter((link) => link.link_type !== "primary").length ? (
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {(submission.linked_beneficiaries ?? [])
                .filter((link) => link.link_type !== "primary")
                .slice(0, 8)
                .map((link) => (
                  <div className="rounded-lg border bg-panel px-3 py-2 text-xs" key={link.id}>
                    <p className="font-mono font-semibold">{link.beneficiary_uid}</p>
                    <p className="mt-1 text-muted-foreground">{link.display_name} · {link.beneficiary_type}</p>
                  </div>
                ))}
            </div>
          ) : null}
        </div>
      </Panel>
      <MobileIntegrityPanel integrity={integrity} submission={submission} />
    </div>
  );
}

function humanizeKey(value: string): string {
  return value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function optionLabelFor(value: unknown, options?: FormFieldMeta["options"]): string {
  const match = options?.find(
    (option) => String(option.value ?? option.name ?? option.label) === String(value),
  );
  return match?.label ?? humanizeKey(String(value));
}

function formatGeoValue(record: Record<string, unknown>): string | null {
  const lat = record.latitude ?? record.lat;
  const lon = record.longitude ?? record.lng ?? record.lon;
  const latitude = Number(lat);
  const longitude = Number(lon);
  if (lat === undefined || lon === undefined || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }
  const accuracy = record.accuracy ?? record.gps_accuracy;
  return accuracy != null
    ? `${latitude.toFixed(5)}, ${longitude.toFixed(5)} (±${accuracy}m)`
    : `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
}

function formatResponseValue(value: unknown, type?: string, options?: FormFieldMeta["options"]): string {
  if (value === null || value === undefined || value === "") return "Blank";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) {
    if (!value.length) return "Blank";
    if (value.every((item) => item === null || typeof item !== "object")) {
      return value.map((item) => optionLabelFor(item, options)).join(", ");
    }
    return JSON.stringify(value, null, 2);
  }
  if (typeof value === "object") {
    if (type === "gps" || type === "geopoint" || type === "location") {
      const geo = formatGeoValue(value as Record<string, unknown>);
      if (geo) return geo;
    }
    return JSON.stringify(value, null, 2);
  }
  if (options?.length) return optionLabelFor(value, options);
  return String(value);
}

function responseValueToInput(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

function parseEditedResponse(row: ResponseRow, rawValue: string): unknown {
  if (rawValue.trim() === "") {
    return "";
  }
  if (["number", "decimal", "currency", "rating", "nps"].includes(row.type)) {
    const parsed = Number(rawValue);
    return Number.isNaN(parsed) ? rawValue : parsed;
  }
  if (["checkbox", "boolean", "consent"].includes(row.type)) {
    return rawValue === "true";
  }
  if (["multiselect", "ranking", "repeat_group", "repeatable_group", "grid"].includes(row.type)) {
    try {
      return JSON.parse(rawValue) as unknown;
    } catch {
      return rawValue
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }
  if (rawValue.trim().startsWith("{") || rawValue.trim().startsWith("[")) {
    try {
      return JSON.parse(rawValue) as unknown;
    } catch {
      return rawValue;
    }
  }
  return rawValue;
}

function importIssuesByField(payload: Record<string, unknown>): Map<string, string[]> {
  const map = new Map<string, string[]>();
  const rawIssues = payload._import_issues;
  if (!Array.isArray(rawIssues)) return map;
  for (const issue of rawIssues) {
    if (!issue || typeof issue !== "object") continue;
    const fieldName = "field_name" in issue ? String(issue.field_name ?? "") : "";
    const message = "message" in issue ? String(issue.message ?? "") : "";
    if (!fieldName || !message) continue;
    map.set(fieldName, [...(map.get(fieldName) ?? []), message]);
  }
  return map;
}

function normalizedSubmissionAnswers(payload: Record<string, unknown>): Record<string, unknown> {
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

function buildResponseRows(
  payload: Record<string, unknown>,
  formSchema: DataFormSchemaRead | null,
  redactedFields: string[] = [],
): ResponseRow[] {
  const rows: ResponseRow[] = [];
  const usedKeys = new Set<string>();
  const redacted = new Set(redactedFields);
  const answers = normalizedSubmissionAnswers(payload);
  const schema = (formSchema?.schema ?? {}) as ParsedFormSchema;
  const issueMap = importIssuesByField(payload);
  for (const section of schema.sections ?? []) {
    for (const field of section.fields ?? []) {
      const candidates = [field.variable_name, field.id].filter(
        (candidate): candidate is string => Boolean(candidate),
      );
      const payloadKey =
        candidates.find((candidate) =>
          Object.prototype.hasOwnProperty.call(answers, candidate),
        ) ?? candidates[0] ?? field.id;
      usedKeys.add(payloadKey);
      rows.push({
        issues: issueMap.get(payloadKey) ?? issueMap.get(field.variable_name ?? "") ?? issueMap.get(field.id) ?? [],
        key: payloadKey,
        label: field.label || humanizeKey(payloadKey),
        value: answers[payloadKey],
        type: field.type,
        sectionTitle: section.title || "Form responses",
        source: "form",
        required: Boolean(field.required),
        hint: field.hint,
        options: field.options,
        redacted: redacted.has(payloadKey),
      });
    }
  }
  for (const [key, value] of Object.entries(answers)) {
    if (usedKeys.has(key)) continue;
    rows.push({
      issues: issueMap.get(key) ?? [],
      key,
      label: humanizeKey(key),
      value,
      type: typeof value === "number" ? "number" : typeof value === "boolean" ? "boolean" : "text",
      sectionTitle: "Uploaded / legacy fields",
      source: "uploaded",
      required: false,
    });
  }
  for (const [key, value] of Object.entries(payload)) {
    if (!key.startsWith("_") || usedKeys.has(key)) continue;
    rows.push({
      issues: [],
      key,
      label: humanizeKey(key),
      value,
      type: typeof value === "number" ? "number" : typeof value === "boolean" ? "boolean" : "text",
      sectionTitle: "System review metadata",
      source: "system",
      required: false,
    });
  }
  return rows;
}

function ResponsesTab({
  canEdit,
  formSchema,
  isSaving,
  onSave,
  preview,
  submission,
  token,
}: {
  canEdit: boolean;
  formSchema: DataFormSchemaRead | null;
  isSaving: boolean;
  onSave: (
    submission: SubmissionRecord,
    responses: Record<string, unknown>,
    reason: string,
  ) => void;
  preview: boolean;
  submission: SubmissionRecord;
  token: string | null;
}) {
  const rows = useMemo(
    () => buildResponseRows(submission.payload_json, formSchema, submission.redacted_fields),
    [formSchema, submission.payload_json, submission.redacted_fields],
  );
  const [editing, setEditing] = useState(false);
  const [editReason, setEditReason] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [editError, setEditError] = useState("");

  useEffect(() => {
    setEditing(false);
    setEditReason("");
    setEditError("");
    setSearchTerm("");
    setEditValues(
      Object.fromEntries(
        rows
          .filter((row) => row.source !== "system")
          .map((row) => [row.key, responseValueToInput(row.value)]),
      ),
    );
  }, [rows, submission.id]);

  const filteredRows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) =>
      [row.label, row.key, row.sectionTitle, row.type, formatResponseValue(row.value, row.type, row.options)]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [rows, searchTerm]);
  const visibleSections = useMemo(() => {
    const groups = new Map<string, ResponseRow[]>();
    for (const row of filteredRows) {
      const existing = groups.get(row.sectionTitle) ?? [];
      existing.push(row);
      groups.set(row.sectionTitle, existing);
    }
    return Array.from(groups.entries());
  }, [filteredRows]);
  const editableCount = rows.filter((row) => row.source !== "system").length;
  const uploadedCount = rows.filter((row) => row.source === "uploaded").length;
  const issueCount = rows.reduce((total, row) => total + row.issues.length, 0);
  const blankCount = rows.filter(
    (row) => row.value === null || row.value === undefined || row.value === "",
  ).length;
  const approvedLocked = submission.status === "approved";
  const editActionLabel = approvedLocked ? "Request correction" : "Edit responses";
  const saveActionLabel = approvedLocked ? "Submit change request" : "Save edited data";

  function updateEditValue(key: string, value: string): void {
    setEditValues((current) => ({ ...current, [key]: value }));
  }

  function handleSave(): void {
    const reason = editReason.trim();
    if (reason.length < 4) {
      setEditError("Add a short reason before saving response edits.");
      return;
    }
    const responses: Record<string, unknown> = {};
    for (const row of rows) {
      if (row.source === "system") continue;
      responses[row.key] = parseEditedResponse(row, editValues[row.key] ?? "");
    }
    setEditError("");
    onSave(submission, responses, reason);
    setEditing(false);
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border bg-panel p-3 shadow-line">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="collect">Data record</Badge>
              <Badge tone={uploadedCount ? "warning" : "neutral"}>
                {uploadedCount} uploaded / legacy fields
              </Badge>
              <Badge tone={blankCount ? "warning" : "success"}>
                {blankCount} blank
              </Badge>
              <Badge tone={issueCount ? "danger" : "success"}>
                {issueCount} issue{issueCount === 1 ? "" : "s"}
              </Badge>
            </div>
            <h3 className="mt-2 text-base font-semibold">Clean submission data</h3>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Edit staged uploaded rows in a spreadsheet-style workspace. Save edits before confirming imported rows for reports, indicators, and beneficiary/entity records.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={!editableCount}
              onClick={() => downloadCsv(`${submission.client_submission_id}-responses.csv`, rows.map((row) => ({
                field: row.label,
                variable: row.key,
                section: row.sectionTitle,
                source: row.source,
                value: row.redacted ? "Hidden (sensitive)" : formatResponseValue(row.value, row.type, row.options),
              })))}
              size="sm"
              variant="secondary"
            >
              <Download aria-hidden="true" />
              Export fields
            </Button>
            <Button
              disabled={!canEdit || !editableCount}
              onClick={() => setEditing((value) => !value)}
              size="sm"
              variant={editing ? "secondary" : "primary"}
            >
              {editing ? <X aria-hidden="true" /> : <Edit3 aria-hidden="true" />}
              {editing ? "Cancel edit" : editActionLabel}
            </Button>
          </div>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
          <label className="relative">
            <Search
              aria-hidden="true"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              size={15}
            />
            <Input
              className="pl-9"
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search field, value, section, or variable"
              value={searchTerm}
            />
          </label>
          <div className="flex items-center gap-2 rounded-full border bg-panel px-3 py-2 text-xs text-muted-foreground">
            <Database aria-hidden="true" size={14} />
            {rows.length} total fields · {editableCount} {approvedLocked ? "change-request fields" : "editable"}
          </div>
        </div>
      </div>

      {editing ? (
        <div className="sticky top-2 z-30 rounded-xl border border-warning/30 bg-warning/10 p-3 shadow-line backdrop-blur">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
            <label className="block flex-1 text-sm font-medium">
              Reason for editing
              <Input
                className="mt-2"
                onChange={(event) => setEditReason(event.target.value)}
                placeholder="Example: Corrected spelling after supervisor verification"
                value={editReason}
              />
            </label>
            <Button disabled={isSaving} onClick={handleSave} variant="primary">
              <Save aria-hidden="true" />
              {isSaving ? "Saving..." : saveActionLabel}
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {approvedLocked
              ? "Approved records are locked. This will create a change request for review and preserve the approved data until an authorized reviewer accepts the correction."
              : "Edits create a new submission version and audit trail entry. Review approval is still a separate human decision."}
          </p>
          {editError ? (
            <p className="mt-2 text-sm font-medium text-danger">{editError}</p>
          ) : null}
        </div>
      ) : null}

      <div className="rounded-xl border bg-panel shadow-line">
        <div className="max-h-[72vh] overflow-auto product-scrollbar">
          <table className="min-w-[1280px] border-separate border-spacing-0 text-xs">
            <thead>
              <tr className="bg-muted/75 text-left text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                {["Section", "Question", "Variable", "Required", "Source", "Issue", editing ? "Cleaned value" : "Value"].map((header, index) => (
                  <th
                    className={cn(
                      "sticky top-0 z-20 border-b bg-muted/90 px-2.5 py-2 font-semibold",
                      index === 0 ? "left-0 z-30 min-w-44" : "",
                      index === 1 ? "min-w-64" : "",
                      index === 6 ? "min-w-[420px]" : "",
                    )}
                    key={header}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr className="odd:bg-background even:bg-muted/20" key={`${row.sectionTitle}-${row.key}`}>
                  <td className="sticky left-0 z-10 max-w-52 border-b bg-inherit px-2.5 py-2 font-medium">
                    <span className="line-clamp-2">{row.sectionTitle}</span>
                  </td>
                  <td className="border-b px-2.5 py-2 align-top">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-medium">{row.label}</span>
                      {row.hint ? (
                        <HelpHint label={`About ${row.label}`} title={row.label}>
                          <p>{row.hint}</p>
                        </HelpHint>
                      ) : null}
                    </div>
                  </td>
                  <td className="whitespace-nowrap border-b px-2.5 py-2 font-mono text-[11px] text-muted-foreground">{row.key}</td>
                  <td className="border-b px-2.5 py-2">{row.required ? <Badge tone="warning">Required</Badge> : <Badge tone="neutral">Optional</Badge>}</td>
                  <td className="border-b px-2.5 py-2">
                    <Badge tone={row.source === "form" ? "success" : row.source === "uploaded" ? "warning" : "neutral"}>
                      {row.source === "form" ? "Form" : row.source === "uploaded" ? "Uploaded" : "System"}
                    </Badge>
                  </td>
                  <td className="border-b px-2.5 py-2 align-top">
                    <div className="flex max-w-72 flex-wrap gap-1">
                      {row.issues.length ? row.issues.slice(0, 2).map((issue) => (
                        <Badge key={issue} tone="danger">{issue}</Badge>
                      )) : <Badge tone="success">Clean</Badge>}
                      {row.issues.length > 2 ? <Badge tone="warning">+{row.issues.length - 2}</Badge> : null}
                    </div>
                  </td>
                  <td className="border-b px-2.5 py-2 align-top">
                    {row.redacted ? (
                      <div className="flex flex-col gap-1 rounded bg-background/65 p-2">
                        <Badge tone="warning">Hidden (sensitive)</Badge>
                        <span className="text-[11px] text-muted-foreground">
                          Requires data export permission to view or edit.
                        </span>
                      </div>
                    ) : editing && row.source !== "system" ? (
                      <ResponseEditor
                        onChange={(value) => updateEditValue(row.key, value)}
                        row={row}
                        value={editValues[row.key] ?? ""}
                      />
                    ) : (
                      <div className="max-h-24 overflow-auto whitespace-pre-wrap break-words rounded bg-background/65 p-2 leading-relaxed">
                        {formatResponseValue(row.value, row.type, row.options) || <span className="text-muted-foreground">Blank</span>}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filteredRows.length ? (
            <div className="p-10 text-center">
              <Search aria-hidden="true" className="mx-auto text-muted-foreground" size={22} />
              <p className="mt-3 font-medium">No matching fields</p>
              <p className="mt-1 text-sm text-muted-foreground">Clear the search to see every saved field for this submission.</p>
            </div>
          ) : null}
        </div>
      </div>
      {!visibleSections.length ? (
        <div className="hidden rounded-2xl border bg-panel p-8 text-center">
          <Search
            aria-hidden="true"
            className="mx-auto text-muted-foreground"
            size={22}
          />
          <p className="mt-3 font-medium">No matching fields</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Clear the search to see every saved field for this submission.
          </p>
        </div>
      ) : null}
      <RepeatGroupsPanel
        formSchema={formSchema}
        preview={preview}
        submission={submission}
        token={token}
      />
    </div>
  );
}

const DATA_EXPLORER_MAIN_VIEW = "__main__";

function DataExplorerSection({
  forms,
  onOpenSubmission,
  preview,
  submissions,
  token,
}: {
  forms: DataFormRead[];
  onOpenSubmission: (submission: SubmissionRecord) => void;
  preview: boolean;
  submissions: SubmissionRecord[];
  token: string | null;
}) {
  const [selectedFormId, setSelectedFormId] = useState("");
  const [activeView, setActiveView] = useState(DATA_EXPLORER_MAIN_VIEW);

  useEffect(() => {
    if (!selectedFormId && forms.length) {
      setSelectedFormId(forms[0].id);
    }
  }, [forms, selectedFormId]);

  useEffect(() => {
    setActiveView(DATA_EXPLORER_MAIN_VIEW);
  }, [selectedFormId]);

  const formSchemaQuery = useQuery({
    queryKey: ["submissions-module", "data-explorer-schema", token, selectedFormId],
    queryFn: () => getFormSchema(token ?? "", selectedFormId),
    enabled: Boolean(token && !preview && selectedFormId),
  });

  const formRows = useMemo(
    () => submissions.filter((submission) => submission.form_id === selectedFormId),
    [submissions, selectedFormId],
  );

  const fieldColumns = useMemo(() => {
    const schema = (formSchemaQuery.data?.schema ?? {}) as ParsedFormSchema;
    const columns: { key: string; label: string; type: string; options?: FormFieldMeta["options"] }[] = [];
    for (const section of schema.sections ?? []) {
      for (const field of section.fields ?? []) {
        if (field.type === "repeat_group" || field.type === "repeatable_group") continue;
        const key = field.variable_name || field.id;
        columns.push({ key, label: field.label || humanizeKey(key), type: field.type, options: field.options });
      }
    }
    return columns;
  }, [formSchemaQuery.data]);

  const repeatGroups = useMemo(() => {
    const schema = (formSchemaQuery.data?.schema ?? {}) as ParsedFormSchema;
    const groups: { id: string; label: string }[] = [];
    for (const section of schema.sections ?? []) {
      for (const field of section.fields ?? []) {
        if (field.type === "repeat_group" || field.type === "repeatable_group") {
          groups.push({ id: field.id, label: field.label || humanizeKey(field.id) });
        }
      }
    }
    return groups;
  }, [formSchemaQuery.data]);

  const formRepeatRowsQuery = useQuery({
    queryKey: ["submissions-module", "data-explorer-repeat-rows", token, selectedFormId],
    queryFn: () => listFormRepeatRows(token ?? "", selectedFormId),
    enabled: Boolean(token && !preview && selectedFormId && repeatGroups.length > 0),
  });

  const activeRepeatGroup = repeatGroups.find((group) => group.id === activeView) ?? null;

  const repeatRows = useMemo(
    () => (formRepeatRowsQuery.data ?? []).filter((row) => row.field_id === activeView),
    [formRepeatRowsQuery.data, activeView],
  );

  const repeatColumns = useMemo(
    () => Array.from(new Set(repeatRows.flatMap((row) => Object.keys(row.row_json)))),
    [repeatRows],
  );

  function exportMainCsv(): void {
    const rows = formRows.map((submission) => {
      const answers = normalizedSubmissionAnswers(submission.payload_json);
      const redacted = new Set(submission.redacted_fields ?? []);
      const row: Record<string, string | number | boolean | null> = {
        "Submission ID": displaySubmissionId(submission),
        Status: formatSubmissionStatus(submission.status),
        Submitted: formatDateTime(submission.submitted_at),
      };
      for (const column of fieldColumns) {
        row[column.label] = redacted.has(column.key)
          ? "Hidden (sensitive)"
          : formatResponseValue(answers[column.key], column.type, column.options);
      }
      return row;
    });
    downloadCsv(`atlas-data-${selectedFormId || "form"}.csv`, rows);
  }

  function exportRepeatCsv(): void {
    if (!activeRepeatGroup) return;
    const rows = repeatRows.map((repeatRow) => {
      const row: Record<string, string | number | boolean | null> = {
        "Submission ID": repeatRow.parent_submission_key,
        Row: repeatRow.row_index + 1,
      };
      for (const column of repeatColumns) {
        row[humanizeKey(column)] = formatResponseValue(repeatRow.row_json[column]);
      }
      return row;
    });
    downloadCsv(`atlas-data-${selectedFormId || "form"}-${activeRepeatGroup.id}.csv`, rows);
  }

  const exportDisabled =
    activeView === DATA_EXPLORER_MAIN_VIEW
      ? !formRows.length || !fieldColumns.length
      : !repeatRows.length || !repeatColumns.length;

  return (
    <Panel
      action={
        <div className="flex flex-wrap items-center gap-2">
          <Select onChange={(event) => setSelectedFormId(event.target.value)} value={selectedFormId}>
            <option value="">Select a form</option>
            {forms.map((form) => (
              <option key={form.id} value={form.id}>
                {form.name}
              </option>
            ))}
          </Select>
          <Button
            disabled={exportDisabled}
            onClick={activeView === DATA_EXPLORER_MAIN_VIEW ? exportMainCsv : exportRepeatCsv}
            size="sm"
            variant="secondary"
          >
            <Download aria-hidden="true" />
            Export CSV
          </Button>
        </div>
      }
      title="Field data by form"
    >
      {preview ? (
        <p className="rounded-xl border bg-background/60 p-3 text-sm text-muted-foreground">
          Connect to the API to browse field-level submission data.
        </p>
      ) : !selectedFormId ? (
        <EmptyMini label="Select a form to view its collected data." />
      ) : formSchemaQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading form schema…</p>
      ) : (
        <div className="space-y-3">
          {repeatGroups.length ? (
            <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Data Explorer views">
              <button
                aria-selected={activeView === DATA_EXPLORER_MAIN_VIEW}
                className={cn(
                  "shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium transition",
                  activeView === DATA_EXPLORER_MAIN_VIEW
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-panel hover:bg-muted",
                )}
                onClick={() => setActiveView(DATA_EXPLORER_MAIN_VIEW)}
                role="tab"
                type="button"
              >
                Main data
              </button>
              {repeatGroups.map((group) => (
                <button
                  aria-selected={activeView === group.id}
                  className={cn(
                    "shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium transition",
                    activeView === group.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "bg-panel hover:bg-muted",
                  )}
                  key={group.id}
                  onClick={() => setActiveView(group.id)}
                  role="tab"
                  type="button"
                >
                  {group.label} (repeat)
                </button>
              ))}
            </div>
          ) : null}
          {activeView === DATA_EXPLORER_MAIN_VIEW ? (
            !fieldColumns.length ? (
              <EmptyMini label="This form's published schema has no fields yet." />
            ) : !formRows.length ? (
              <EmptyMini label="No submissions recorded for this form yet." />
            ) : (
              <div className="max-h-[72vh] overflow-auto product-scrollbar">
                <table className="min-w-max border-separate border-spacing-0 text-xs">
                  <thead>
                    <tr className="bg-muted/75 text-left text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                      <th className="sticky left-0 top-0 z-30 min-w-44 border-b bg-muted/90 px-2.5 py-2 font-semibold">
                        Submission ID
                      </th>
                      <th className="sticky top-0 z-20 border-b bg-muted/90 px-2.5 py-2 font-semibold">Status</th>
                      <th className="sticky top-0 z-20 whitespace-nowrap border-b bg-muted/90 px-2.5 py-2 font-semibold">
                        Submitted
                      </th>
                      {fieldColumns.map((column) => (
                        <th
                          className="sticky top-0 z-20 min-w-40 border-b bg-muted/90 px-2.5 py-2 font-semibold"
                          key={column.key}
                        >
                          {column.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {formRows.map((submission) => {
                      const answers = normalizedSubmissionAnswers(submission.payload_json);
                      const redacted = new Set(submission.redacted_fields ?? []);
                      return (
                        <tr className="odd:bg-background even:bg-muted/20" key={submission.id}>
                          <td className="sticky left-0 z-10 max-w-52 border-b bg-inherit px-2.5 py-2 font-medium">
                            <button className="text-left text-primary" onClick={() => onOpenSubmission(submission)} type="button">
                              {submission.client_submission_id}
                            </button>
                          </td>
                          <td className="border-b px-2.5 py-2">
                            <Badge tone={statusTone(submission.status)}>{formatSubmissionStatus(submission.status)}</Badge>
                          </td>
                          <td className="whitespace-nowrap border-b px-2.5 py-2 text-muted-foreground">
                            {formatDateTime(submission.submitted_at)}
                          </td>
                          {fieldColumns.map((column) => (
                            <td className="border-b px-2.5 py-2" key={column.key}>
                              {redacted.has(column.key) ? (
                                <Badge tone="warning">Hidden (sensitive)</Badge>
                              ) : (
                                formatResponseValue(answers[column.key], column.type, column.options) || (
                                  <span className="text-muted-foreground">Blank</span>
                                )
                              )}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          ) : formRepeatRowsQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading repeat group rows…</p>
          ) : !repeatRows.length ? (
            <EmptyMini label="No repeat group rows recorded for this form yet." />
          ) : (
            <div className="max-h-[72vh] overflow-auto product-scrollbar">
              <table className="min-w-max border-separate border-spacing-0 text-xs">
                <thead>
                  <tr className="bg-muted/75 text-left text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                    <th className="sticky left-0 top-0 z-30 min-w-44 border-b bg-muted/90 px-2.5 py-2 font-semibold">
                      Submission ID
                    </th>
                    <th className="sticky top-0 z-20 border-b bg-muted/90 px-2.5 py-2 font-semibold">Row</th>
                    {repeatColumns.map((column) => (
                      <th className="sticky top-0 z-20 min-w-40 border-b bg-muted/90 px-2.5 py-2 font-semibold" key={column}>
                        {humanizeKey(column)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {repeatRows.map((row) => {
                    const parentSubmission = formRows.find(
                      (submission) => submission.client_submission_id === row.parent_submission_key,
                    );
                    return (
                      <tr className="odd:bg-background even:bg-muted/20" key={row.id}>
                        <td className="sticky left-0 z-10 max-w-52 border-b bg-inherit px-2.5 py-2 font-medium">
                          {parentSubmission ? (
                            <button className="text-left text-primary" onClick={() => onOpenSubmission(parentSubmission)} type="button">
                              {row.parent_submission_key}
                            </button>
                          ) : (
                            row.parent_submission_key
                          )}
                        </td>
                        <td className="border-b px-2.5 py-2 text-muted-foreground">{row.row_index + 1}</td>
                        {repeatColumns.map((column) => (
                          <td className="border-b px-2.5 py-2" key={column}>
                            {formatResponseValue(row.row_json[column]) || <span className="text-muted-foreground">Blank</span>}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}

function ResponseEditor({
  onChange,
  row,
  value,
}: {
  onChange: (value: string) => void;
  row: ResponseRow;
  value: string;
}) {
  if (["checkbox", "boolean", "consent"].includes(row.type)) {
    return (
      <Select onChange={(event) => onChange(event.target.value)} value={value || "false"}>
        <option value="true">Yes / True</option>
        <option value="false">No / False</option>
      </Select>
    );
  }
  if (row.options?.length) {
    return (
      <Select onChange={(event) => onChange(event.target.value)} value={value}>
        <option value="">Select value</option>
        {row.options.map((option, index) => {
          const optionValue = option.value ?? option.name ?? option.label ?? String(index);
          return (
            <option key={`${optionValue}-${index}`} value={optionValue}>
              {option.label ?? optionValue}
            </option>
          );
        })}
      </Select>
    );
  }
  if (
    ["textarea", "long_text", "repeat_group", "repeatable_group", "grid", "file", "photo", "signature"].includes(row.type) ||
    value.trim().startsWith("{") ||
    value.trim().startsWith("[")
  ) {
    return (
      <textarea
        className="min-h-28 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition focus:border-ring focus:ring-3 focus:ring-ring/15"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    );
  }
  return (
    <Input
      onChange={(event) => onChange(event.target.value)}
      type={["number", "decimal", "currency", "rating", "nps"].includes(row.type) ? "number" : "text"}
      value={value}
    />
  );
}

function WorkflowTab({
  canReview,
  onApplyReviewAction,
  reviewComment,
  reviewResult,
  setReviewComment,
  submission,
}: {
  canReview: boolean;
  onApplyReviewAction: (action: ReviewAction) => void;
  reviewComment: string;
  reviewResult: string;
  setReviewComment: (value: string) => void;
  submission: SubmissionRecord;
}) {
  const actions: {
    action: ReviewAction;
    disabled?: boolean;
    icon: LucideIcon;
    label: string;
    variant: "primary" | "secondary" | "danger";
  }[] =
    submission.status === "approved"
      ? [
          {
            action: "approve",
            disabled: true,
            icon: CheckCircle2,
            label: "Already Approved",
            variant: "secondary",
          },
          { action: "reject", icon: XCircle, label: "Reject Approval", variant: "danger" },
          {
            action: "archive",
            icon: Archive,
            label: "Archive",
            variant: "secondary",
          },
        ]
      : [
          {
            action: "start_review",
            icon: ShieldAlert,
            label: "Start Review",
            variant: "secondary",
          },
          {
            action: "approve",
            icon: CheckCircle2,
            label: "Approve",
            variant: "primary",
          },
          {
            action: "request_correction",
            icon: MessageSquareWarning,
            label: "Return",
            variant: "secondary",
          },
          { action: "reject", icon: XCircle, label: "Reject", variant: "danger" },
          {
            action: "archive",
            icon: Archive,
            label: "Archive",
            variant: "secondary",
          },
        ];
  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
      <Panel title="Workflow Timeline">
        <div className="space-y-3">
          {submission.workflow.map((stage, index) => (
            <div
              className="rounded-xl border bg-background/60 p-3"
              key={`${stage.stage}-${index}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{stage.stage}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {stage.reviewer} · {stage.comments ?? "No comment recorded"}
                  </p>
                </div>
                <Badge tone={slaTone(stage.sla_status)}>
                  {stage.sla_status}
                </Badge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {stage.action_date
                  ? formatDateTime(stage.action_date)
                  : "Waiting for action"}
              </p>
            </div>
          ))}
        </div>
      </Panel>
      <Panel title="Review Decision">
        <label className="block text-sm font-medium">
          Reviewer comment
          <textarea
            className="mt-2 min-h-28 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition focus:border-ring focus:ring-3 focus:ring-ring/15"
            onChange={(event) => setReviewComment(event.target.value)}
            placeholder="Required when rejecting, returning, or escalating."
            value={reviewComment}
          />
        </label>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {actions.map(({ action, disabled, icon: Icon, label, variant }) => (
            <Button
              disabled={!canReview || disabled}
              key={action}
              onClick={() => onApplyReviewAction(action)}
              variant={variant}
            >
              <Icon aria-hidden="true" />
              {label}
            </Button>
          ))}
        </div>
        {reviewResult ? (
          <div
            className="mt-4 rounded-xl border border-success/30 bg-success/10 p-3"
            aria-live="polite"
          >
            <p className="text-sm font-semibold">Workflow outcome</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {reviewResult}
            </p>
          </div>
        ) : null}
      </Panel>
    </div>
  );
}

function QualityTab({ submission }: { submission: SubmissionRecord }) {
  const integrity = getMobileIntegrity(submission);
  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[340px_1fr]">
        <Panel title="Quality Score">
          <div className="rounded-2xl border bg-background/60 p-5 text-center">
            <p className="text-4xl font-semibold">{submission.quality_score}%</p>
            <Badge className="mt-3" tone={qualityTone(submission.quality_score)}>
              {submission.quality_score >= 90
                ? "Excellent"
                : submission.quality_score >= 70
                  ? "Good"
                  : submission.quality_score >= 50
                    ? "Needs Review"
                    : "Critical"}
            </Badge>
          </div>
          <div className="mt-3 space-y-2">
            <Signal
              label="Duplicate risk"
              value={submission.duplicate_risk}
              tone={submission.duplicate_risk === "none" ? "success" : "warning"}
            />
            <Signal
              label="GPS validation"
              value={submission.gps_status}
              tone={submission.gps_status === "valid" ? "success" : "warning"}
            />
            <Signal
              label="Field integrity"
              value={mobileIntegrityLabel(integrity)}
              tone={mobileIntegrityTone(integrity)}
            />
          </div>
        </Panel>
        <Panel title="Quality Flags">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              These checks guide reviewer decisions only. A reviewer must still approve, reject, return, or archive the submission.
            </p>
            {submission.quality_flags.map((flag) => (
              <div
                className="rounded-xl border bg-background/60 p-3"
                key={flag.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{flag.check}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {flag.message}
                    </p>
                  </div>
                  <Badge tone={severityTone(flag.severity)}>
                    {flag.severity}
                  </Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary">
                    Resolve
                  </Button>
                  <Button size="sm" variant="ghost">
                    Override
                  </Button>
                  <Button size="sm" variant="ghost">
                    Add note
                  </Button>
                </div>
              </div>
            ))}
            {!submission.quality_flags.length ? (
              <EmptyMini label="No open quality flags for this submission." />
            ) : null}
          </div>
        </Panel>
      </div>
      <MobileIntegrityPanel integrity={integrity} submission={submission} />
    </div>
  );
}

function MobileIntegrityPanel({
  integrity,
  submission,
}: {
  integrity: MobileIntegrityPayload | null;
  submission: SubmissionRecord;
}) {
  const status = getMobileIntegrityStatus(submission);
  return (
    <Panel
      title="Mobile Field Integrity"
      action={<Badge tone={mobileIntegrityTone(integrity)}>{mobileIntegrityLabel(integrity)}</Badge>}
    >
      {!integrity ? (
        <div className="rounded-xl border border-dashed bg-muted/20 p-4">
          <p className="text-sm font-medium">No mobile integrity package was sent with this submission.</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Older web, import, or legacy records may not include mobile evidence. Review normal quality flags, GPS, source, and responses before approval.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Signal
              label="Integrity score"
              value={integrity.score === null || integrity.score === undefined ? "Not scored" : `${integrity.score}%`}
              tone={mobileIntegrityTone(integrity)}
            />
            <Signal
              label="System status"
              value={humanizeKey(status)}
              tone={mobileIntegrityTone(integrity)}
            />
            <Signal
              label="Interview duration"
              value={formatDurationSeconds(integrity.interviewDurationSeconds)}
              tone={integrity.signals.some((signal) => signal.code === "INTERVIEW_TOO_FAST") ? "warning" : "success"}
            />
            <Signal
              label="GPS accuracy"
              value={integrity.gpsAccuracyMeters === null || integrity.gpsAccuracyMeters === undefined ? "Not recorded" : `${integrity.gpsAccuracyMeters}m`}
              tone={integrity.signals.some((signal) => signal.code.includes("GPS")) ? "warning" : "success"}
            />
            <Signal
              label="Media evidence"
              value={`${integrity.mediaCount ?? 0} of ${integrity.requiredMediaCount ?? 0} required`}
              tone={(integrity.mediaCount ?? 0) >= (integrity.requiredMediaCount ?? 0) ? "success" : "warning"}
            />
            <Signal
              label="Offline started"
              value={formatDateTime(integrity.offlineStartedAt)}
            />
            <Signal
              label="Offline submitted"
              value={formatDateTime(integrity.offlineSubmittedAt)}
            />
            <Signal
              label="GPS captured"
              value={formatDateTime(integrity.gpsCapturedAt)}
            />
          </div>

          <div className="rounded-xl border bg-background/60 p-3">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-medium">Supervisor review guidance</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Integrity signals do not approve or reject the record. They show what the reviewer should verify before making a decision.
                </p>
              </div>
              <Badge tone={integrity.signals.length ? "warning" : "success"}>
                {integrity.signals.length} signal{integrity.signals.length === 1 ? "" : "s"}
              </Badge>
            </div>
            <div className="mt-3 space-y-2">
              {integrity.signals.map((signal) => (
                <div
                  className="rounded-lg border bg-panel p-3"
                  key={`${signal.code}-${signal.detectedAt ?? signal.message}`}
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-sm font-semibold">{humanizeKey(signal.code)}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{signal.message}</p>
                      {signal.action ? (
                        <p className="mt-2 text-xs font-medium text-foreground">
                          Recommended reviewer action: {signal.action}
                        </p>
                      ) : null}
                    </div>
                    <Badge tone={severityTone(signal.severity)}>{humanizeKey(signal.severity)}</Badge>
                  </div>
                  {signal.evidence && Object.keys(signal.evidence).length ? (
                    <pre className="mt-3 max-h-36 overflow-auto rounded-lg bg-muted/45 p-2 text-xs text-muted-foreground">
                      {JSON.stringify(signal.evidence, null, 2)}
                    </pre>
                  ) : null}
                </div>
              ))}
              {!integrity.signals.length ? (
                <EmptyMini label="No unusual mobile integrity signals were detected." />
              ) : null}
            </div>
          </div>
        </div>
      )}
    </Panel>
  );
}

function AttachmentsTab({ submission }: { submission: SubmissionRecord }) {
  return (
    <Panel title="Submission Attachments">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {submission.attachments.map((attachment) => (
          <div
            className="rounded-xl border bg-background/60 p-4"
            key={attachment.id}
          >
            <Paperclip aria-hidden="true" className="text-primary" size={18} />
            <h3 className="mt-3 font-semibold">{attachment.file_name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {attachment.file_type} · {attachment.size_label}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatDateTime(attachment.uploaded_at)}
            </p>
            <div className="mt-4 flex gap-2">
              <Button size="sm" variant="secondary">
                Preview
              </Button>
              <Button size="sm" variant="ghost">
                Download
              </Button>
            </div>
          </div>
        ))}
        {!submission.attachments.length ? (
          <EmptyMini label="No media, files, signatures, or documents were attached." />
        ) : null}
      </div>
    </Panel>
  );
}

function LocationTab({ submission }: { submission: SubmissionRecord }) {
  const hasGps = submissionHasUsableGps(submission);
  return (
    <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
      <Panel title="Location Summary">
        <div className="grid gap-3 md:grid-cols-2">
          <Signal
            label="Coordinates"
            value={hasGps ? `${submission.latitude.toFixed(5)}, ${submission.longitude.toFixed(5)}` : "No GPS captured"}
            tone={hasGps ? "success" : "warning"}
          />
          <Signal
            label="GPS Accuracy"
            value={hasGps ? `${submission.accuracy ?? "n/a"}m` : "Not captured"}
            tone={hasGps && submission.gps_status === "valid" ? "success" : "warning"}
          />
          <Signal
            label="Administrative Location"
            value={submission.location_name}
          />
          <Signal label="Device" value={formatDeviceEvidence(submission)} />
          <Signal label="Assigned Area" value={submission.project_name} />
          <Signal
            label="Boundary Validation"
            value={
              hasGps && submission.gps_status === "valid"
                ? "Inside assigned area"
                : "Needs spatial review"
            }
            tone={hasGps && submission.gps_status === "valid" ? "success" : "warning"}
          />
        </div>
      </Panel>
      <Panel title="Mini Map">
        <div className="flex min-h-72 items-center justify-center rounded-2xl border bg-[radial-gradient(circle_at_35%_35%,rgba(34,197,94,0.18),transparent_30%),linear-gradient(135deg,rgba(14,165,233,0.12),rgba(34,197,94,0.1))]">
          <div className="rounded-2xl border bg-panel/90 p-4 text-center shadow-line">
            <MapPin
              aria-hidden="true"
              className="mx-auto text-primary"
              size={28}
            />
            <p className="mt-3 font-semibold">{hasGps ? "GPS evidence captured" : "No GPS evidence captured"}</p>
            <p className="mt-1 font-mono text-xs text-muted-foreground">{formatGpsEvidence(submission)}</p>
          </div>
        </div>
      </Panel>
    </div>
  );
}

type SubmissionFiltersState = {
  dateFrom: string;
  dateTo: string;
  formName: string;
  projectName: string;
  reviewer: string;
};

function SubmissionFilters({
  activeSection,
  filters,
  onChange,
  submissions,
}: {
  activeSection: SubmissionSection;
  filters: SubmissionFiltersState;
  onChange: (patch: Partial<SubmissionFiltersState>) => void;
  submissions: SubmissionRecord[];
}) {
  const projects = Array.from(
    new Set(submissions.map((submission) => submission.project_name)),
  );
  const forms = Array.from(
    new Set(submissions.map((submission) => submission.form_name)),
  );
  const reviewers = Array.from(
    new Set(submissions.map((submission) => submission.reviewer)),
  );
  const sectionStatusLabel = submissionSections.find((section) => section.id === activeSection)?.label ?? "Current status";
  const hasActiveFilters =
    Boolean(filters.projectName) ||
    Boolean(filters.formName) ||
    Boolean(filters.reviewer) ||
    Boolean(filters.dateFrom) ||
    Boolean(filters.dateTo);
  return (
    <div className="grid gap-3 rounded-xl border bg-panel p-3 shadow-line grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
      <Select
        onChange={(event) => onChange({ projectName: event.target.value })}
        value={filters.projectName}
      >
        <option value="">All projects</option>
        {projects.map((project) => (
          <option key={project} value={project}>
            {project}
          </option>
        ))}
      </Select>
      <Select
        onChange={(event) => onChange({ formName: event.target.value })}
        value={filters.formName}
      >
        <option value="">All forms</option>
        {forms.map((form) => (
          <option key={form} value={form}>
            {form}
          </option>
        ))}
      </Select>
      <Select disabled value={activeSection}>
        <option value={activeSection}>{sectionStatusLabel}</option>
      </Select>
      <Select
        onChange={(event) => onChange({ reviewer: event.target.value })}
        value={filters.reviewer}
      >
        <option value="">All reviewers</option>
        {reviewers.map((reviewer) => (
          <option key={reviewer} value={reviewer}>
            {reviewer}
          </option>
        ))}
      </Select>
      <div className="col-span-2 flex gap-2 md:col-span-1">
        <Input
          aria-label="Submitted from"
          onChange={(event) => onChange({ dateFrom: event.target.value })}
          type="date"
          value={filters.dateFrom}
        />
        <Input
          aria-label="Submitted to"
          onChange={(event) => onChange({ dateTo: event.target.value })}
          type="date"
          value={filters.dateTo}
        />
      </div>
      <Button
        disabled={!hasActiveFilters}
        onClick={() =>
          onChange({ dateFrom: "", dateTo: "", formName: "", projectName: "", reviewer: "" })
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
  route,
  title,
}: {
  action?: ReactNode;
  description: string;
  route: string;
  title: string;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-panel p-3.5 shadow-line xl:flex-row xl:items-start xl:justify-between">
      <div>
        <Badge tone="neutral">{route}</Badge>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-semibold">{title}</h2>
          <HelpHint label={`About ${title}`} title={title}>
            {description}
          </HelpHint>
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

function Panel({
  action,
  children,
  title,
}: {
  action?: ReactNode;
  children: ReactNode;
  title: string;
}) {
  return (
    <section className="rounded-xl border bg-panel p-3.5 shadow-line">
      <div className="mb-4 flex items-start justify-between gap-3">
        <h2 className="font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Signal({
  label,
  tone,
  value,
}: {
  label: string;
  tone?: BadgeProps["tone"];
  value: string;
}) {
  return (
    <div className="rounded-xl border bg-background/60 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold">{value}</p>
      {tone ? (
        <Badge className="mt-2" tone={tone}>
          Status
        </Badge>
      ) : null}
    </div>
  );
}

function StatusHistoryPanel({
  preview,
  submission,
  token,
}: {
  preview: boolean;
  submission: SubmissionRecord;
  token: string | null;
}) {
  const historyQuery = useQuery({
    queryKey: ["submissions-module", "history", submission.id, token],
    queryFn: () => listSubmissionHistory(token ?? "", submission.id),
    enabled: Boolean(token && !preview),
  });
  const history = historyQuery.data ?? [];

  return (
    <Panel title="Status Timeline">
      {preview ? (
        <p className="rounded-xl border bg-background/60 p-3 text-sm text-muted-foreground">
          Connect to the API to view the recorded status history for this submission.
        </p>
      ) : historyQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading status history…</p>
      ) : history.length ? (
        <div className="space-y-3">
          {history.map((entry) => (
            <div className="flex gap-3" key={entry.id}>
              <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border bg-primary/10 text-primary">
                <ArrowRight aria-hidden="true" size={14} />
              </span>
              <div className="min-w-0">
                <p className="font-medium">
                  {entry.from_status ? `${formatSubmissionStatus(entry.from_status)} → ` : ""}
                  {formatSubmissionStatus(entry.to_status)}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {entry.actor_name ?? entry.actor_user_id}
                  {entry.comment ? ` · ${entry.comment}` : ""}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(entry.created_at)}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyMini label="No status changes recorded for this submission yet." />
      )}
    </Panel>
  );
}

function CorrectionsPanel({
  preview,
  submission,
  token,
}: {
  preview: boolean;
  submission: SubmissionRecord;
  token: string | null;
}) {
  const correctionsQuery = useQuery({
    queryKey: ["submissions-module", "corrections", submission.id, token],
    queryFn: () => listSubmissionCorrections(token ?? "", submission.id),
    enabled: Boolean(token && !preview),
  });
  const corrections = correctionsQuery.data ?? [];

  return (
    <Panel title="Correction History">
      {preview ? (
        <p className="rounded-xl border bg-background/60 p-3 text-sm text-muted-foreground">
          Connect to the API to view correction history for this submission.
        </p>
      ) : correctionsQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading corrections…</p>
      ) : corrections.length ? (
        <div className="overflow-x-auto product-scrollbar">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-2 py-1.5">Field</th>
                <th className="px-2 py-1.5">Old Value</th>
                <th className="px-2 py-1.5">New Value</th>
                <th className="px-2 py-1.5">Reason</th>
                <th className="px-2 py-1.5">Corrected By</th>
                <th className="px-2 py-1.5">Corrected At</th>
              </tr>
            </thead>
            <tbody>
              {corrections.map((entry, index) => (
                <tr
                  className="border-t border-border/60"
                  key={`${entry.submission_id}-${entry.corrected_field}-${index}`}
                >
                  <td className="px-2 py-1.5 font-medium">{entry.corrected_field}</td>
                  <td className="px-2 py-1.5 text-muted-foreground">
                    {formatCorrectionValue(entry.old_value)}
                  </td>
                  <td className="px-2 py-1.5">{formatCorrectionValue(entry.new_value)}</td>
                  <td className="px-2 py-1.5 text-muted-foreground">{entry.reason ?? "—"}</td>
                  <td className="px-2 py-1.5 text-muted-foreground">{entry.corrected_by ?? "—"}</td>
                  <td className="px-2 py-1.5 text-muted-foreground">{formatDateTime(entry.corrected_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyMini label="No corrections recorded for this submission." />
      )}
    </Panel>
  );
}

function formatCorrectionValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function RepeatGroupsPanel({
  formSchema,
  preview,
  submission,
  token,
}: {
  formSchema: DataFormSchemaRead | null;
  preview: boolean;
  submission: SubmissionRecord;
  token: string | null;
}) {
  const repeatRowsQuery = useQuery({
    queryKey: ["submissions-module", "repeat-rows", submission.id, token],
    queryFn: () => listSubmissionRepeatRows(token ?? "", submission.id),
    enabled: Boolean(token && !preview),
  });
  const rows = repeatRowsQuery.data ?? [];
  if (preview || repeatRowsQuery.isLoading || !rows.length) {
    return null;
  }

  const schema = (formSchema?.schema ?? {}) as ParsedFormSchema;
  const fieldLabels = new Map<string, string>();
  for (const section of schema.sections ?? []) {
    for (const field of section.fields ?? []) {
      if (field.type === "repeat_group" || field.type === "repeatable_group") {
        fieldLabels.set(field.id, field.label ?? field.id);
      }
    }
  }

  const groups = new Map<string, typeof rows>();
  for (const row of rows) {
    const existing = groups.get(row.field_id) ?? [];
    existing.push(row);
    groups.set(row.field_id, existing);
  }

  return (
    <>
      {Array.from(groups.entries()).map(([fieldId, groupRows]) => {
        const columns = Array.from(
          new Set(groupRows.flatMap((row) => Object.keys(row.row_json))),
        );
        return (
          <Panel key={fieldId} title={`Repeat group: ${fieldLabels.get(fieldId) ?? fieldId}`}>
            <div className="overflow-x-auto product-scrollbar">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-2 py-1.5">#</th>
                    {columns.map((column) => (
                      <th className="px-2 py-1.5" key={column}>
                        {humanizeKey(column)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {groupRows
                    .sort((a, b) => a.row_index - b.row_index)
                    .map((row) => (
                      <tr className="border-t border-border/60" key={row.id}>
                        <td className="px-2 py-1.5 text-muted-foreground">{row.row_index + 1}</td>
                        {columns.map((column) => (
                          <td className="px-2 py-1.5" key={column}>
                            {formatCorrectionValue(row.row_json[column])}
                          </td>
                        ))}
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </Panel>
        );
      })}
    </>
  );
}

function TimelineRows({
  immutable,
  rows,
}: {
  immutable?: boolean;
  rows: { label: string; meta: string; time: string }[];
}) {
  return (
    <Panel title={immutable ? "Immutable Audit Events" : "Submission Timeline"}>
      <div className="space-y-3">
        {immutable ? (
          <p className="rounded-xl border bg-background/60 p-3 text-sm text-muted-foreground">
            Audit records are immutable and integrate with Governance → Audit
            Trail.
          </p>
        ) : null}
        {rows.map((row, index) => (
          <div className="flex gap-3" key={`${row.label}-${row.time}-${index}`}>
            <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border bg-primary/10 text-primary">
              {immutable ? (
                <History aria-hidden="true" size={14} />
              ) : (
                <ArrowRight aria-hidden="true" size={14} />
              )}
            </span>
            <div className="min-w-0">
              <p className="font-medium">{row.label}</p>
              <p className="mt-1 text-sm text-muted-foreground">{row.meta}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatDateTime(row.time)}
              </p>
            </div>
          </div>
        ))}
        {!rows.length ? <EmptyMini label="No timeline records yet." /> : null}
      </div>
    </Panel>
  );
}

function EmptyMini({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-dashed bg-muted/20 p-4 text-center text-sm text-muted-foreground">
      {label}
    </div>
  );
}
