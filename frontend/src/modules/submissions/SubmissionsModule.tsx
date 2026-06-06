"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Archive,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Download,
  Eye,
  FileArchive,
  FileCheck2,
  FileSearch,
  Flag,
  History,
  MapPin,
  MessageSquareWarning,
  Paperclip,
  RotateCcw,
  Search,
  ShieldAlert,
  UserCheck,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

import { DataTable, type TableColumn } from "@/components/DataTable";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HelpHint } from "@/components/ui/help-hint";
import { Input, Select } from "@/components/ui/input";
import type { CurrentPrincipal } from "@/lib/api";
import { listSubmissions, reviewSubmission } from "@/lib/api";
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

function severityTone(severity: string): BadgeProps["tone"] {
  if (severity === "Critical") return "danger";
  if (severity === "High") return "warning";
  if (severity === "Medium") return "accent";
  return "neutral";
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
  const preview = isPreview(token);
  const canReview = hasAnyPermission(principal, [
    "submissions.review",
    "submissions.approve",
    "submissions.manage",
  ]);
  const canExport = hasAnyPermission(principal, [
    "submissions.export",
    "reports.export",
    "submissions.manage",
  ]);

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

  const submissions = useMemo(
    () =>
      preview
        ? previewRows
        : (submissionsQuery.data ?? []).map(normalizeSubmission),
    [preview, previewRows, submissionsQuery.data],
  );
  const summary = useMemo(
    () => computeSubmissionsSummary(submissions),
    [submissions],
  );
  const visibleSubmissions = useMemo(
    () => filterSubmissions(submissions, activeSection),
    [activeSection, submissions],
  );
  const selectedSubmission =
    submissions.find((submission) => submission.id === selectedSubmissionId) ??
    null;

  const reviewMutation = useMutation({
    mutationFn: ({
      action,
      comment,
      submissionId,
    }: {
      action: Exclude<ReviewAction, "archive">;
      comment: string;
      submissionId: string;
    }) => reviewSubmission(token ?? "", submissionId, { action, comment }),
    onSuccess: async (submission, variables) => {
      setReviewResult(
        `${submission.client_submission_id} is now ${formatSubmissionStatus(submission.status)}. Reviewer note: ${variables.comment}`,
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

    if (preview || action === "archive") {
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

  const columns: TableColumn<SubmissionRecord>[] = [
    {
      key: "submission",
      header: "Submission ID",
      value: (submission) =>
        `${submission.client_submission_id} ${submission.project_name} ${submission.form_name}`,
      render: (submission) => (
        <button
          className="text-left"
          onClick={() => openSubmission(submission)}
          type="button"
        >
          <p className="font-medium text-foreground">
            {submission.client_submission_id}
          </p>
          <p className="text-xs text-muted-foreground">
            {submission.project_name}
          </p>
        </button>
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
      header: "Enumerator",
      value: (submission) => submission.field_officer_id,
      render: (submission) => submission.field_officer_id,
    },
    {
      key: "location",
      header: "Location",
      value: (submission) => submission.location_name,
      render: (submission) => submission.location_name,
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
      key: "actions",
      header: "Actions",
      align: "right",
      render: (submission) => (
        <div className="flex justify-end gap-2">
          <Button
            onClick={() => openSubmission(submission)}
            size="sm"
            variant="secondary"
          >
            <Eye aria-hidden="true" />
            View
          </Button>
          <Button
            disabled={!canReview}
            onClick={() => openSubmission(submission, "Workflow")}
            size="sm"
            variant="ghost"
          >
            Review
          </Button>
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
              onClick={() =>
                downloadCsv(
                  "atlas-submissions.csv",
                  submissions.map((submission) => ({
                    id: submission.client_submission_id,
                    project: submission.project_name,
                    form: submission.form_name,
                    enumerator: submission.field_officer_id,
                    status: submission.status,
                    quality_score: submission.quality_score,
                    submitted_at: submission.submitted_at,
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
          canReview={canReview}
          onApplyReviewAction={applyReviewAction}
          onClose={() => setSelectedSubmissionId(null)}
          reviewComment={reviewComment}
          reviewResult={reviewResult}
          setReviewComment={setReviewComment}
          setTab={setActiveDetailTab}
          submission={selectedSubmission}
          tab={activeDetailTab}
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

      {!selectedSubmission && activeSection !== "dashboard" ? (
        <section className="space-y-4">
          <SectionHeader
            action={
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={!canReview}
                  onClick={() => setActiveSection("pending-review")}
                  variant="primary"
                >
                  <UserCheck aria-hidden="true" />
                  Assign reviewer
                </Button>
                <Button
                  disabled={!canExport || !visibleSubmissions.length}
                  onClick={() =>
                    downloadCsv(
                      "atlas-submission-view.csv",
                      visibleSubmissions.map((submission) => ({
                        id: submission.client_submission_id,
                        status: submission.status,
                        reviewer: submission.reviewer,
                        quality: submission.quality_score,
                      })),
                    )
                  }
                  variant="secondary"
                >
                  <Download aria-hidden="true" />
                  Export view
                </Button>
              </div>
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
          <SubmissionFilters submissions={visibleSubmissions} />
          <DataTable
            columns={columns}
            emptyLabel="No submissions match this view yet"
            rows={visibleSubmissions}
            searchLabel="Search submissions, forms, projects, officers, location"
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
  const cards: {
    icon: LucideIcon;
    label: string;
    tone?: BadgeProps["tone"];
    value: string | number;
  }[] = [
    {
      icon: FileSearch,
      label: "Total Submissions",
      value: summary.total_submissions,
    },
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
    { icon: FileArchive, label: "Archived", value: summary.archived },
    {
      icon: Clock3,
      label: "Today's Submissions",
      value: summary.todays_submissions,
    },
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

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {cards.map((card) => (
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
            {["Grace M.", "Samuel K.", "Data Manager"].map((reviewer) => {
              const count = submissions.filter(
                (submission) => submission.reviewer === reviewer,
              ).length;
              return (
                <Signal
                  key={reviewer}
                  label={reviewer}
                  value={`${count} assigned`}
                />
              );
            })}
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
  canReview,
  onApplyReviewAction,
  onClose,
  reviewComment,
  reviewResult,
  setReviewComment,
  setTab,
  submission,
  tab,
}: {
  canReview: boolean;
  onApplyReviewAction: (action: ReviewAction) => void;
  onClose: () => void;
  reviewComment: string;
  reviewResult: string;
  setReviewComment: (value: string) => void;
  setTab: (tab: SubmissionDetailTab) => void;
  submission: SubmissionRecord;
  tab: SubmissionDetailTab;
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
            {submission.client_submission_id}
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
      {tab === "Responses" ? <ResponsesTab submission={submission} /> : null}
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
        <TimelineRows
          rows={submission.history.map((item) => ({
            label: item.action,
            meta: `${item.actor}${item.comment ? ` · ${item.comment}` : ""}`,
            time: item.created_at,
          }))}
        />
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
  return (
    <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
      <Panel title="Submission Summary">
        <div className="grid gap-3 md:grid-cols-2">
          <Signal
            label="Submission ID"
            value={submission.client_submission_id}
          />
          <Signal label="Project" value={submission.project_name} />
          <Signal label="Form" value={submission.form_name} />
          <Signal label="Form Version" value={`v${submission.form_version}`} />
          <Signal label="Enumerator" value={submission.field_officer_id} />
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
  );
}

function ResponsesTab({ submission }: { submission: SubmissionRecord }) {
  const entries = Object.entries(submission.payload_json);
  const midpoint = Math.ceil(entries.length / 2);
  const sections = [
    ["Core Responses", entries.slice(0, midpoint)],
    ["Evidence and Review Fields", entries.slice(midpoint)],
  ] as const;
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border bg-background/50 p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="font-semibold">Collected responses</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Read-only by default. Editing must follow form governance rules.
          </p>
        </div>
        <label className="relative md:min-w-72">
          <Search
            aria-hidden="true"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            size={15}
          />
          <Input className="pl-9" placeholder="Search responses" />
        </label>
      </div>
      {sections.map(([title, rows]) => (
        <Panel key={title} title={title}>
          <div className="divide-y">
            {rows.map(([key, value]) => (
              <div
                className="grid gap-2 py-3 md:grid-cols-[240px_1fr]"
                key={key}
              >
                <div>
                  <p className="text-sm font-medium">
                    {key.replaceAll("_", " ")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ${"{"}
                    {key}
                    {"}"}
                  </p>
                </div>
                <p className="break-words text-sm">{String(value)}</p>
              </div>
            ))}
            {!rows.length ? (
              <EmptyMini label="No responses in this section." />
            ) : null}
          </div>
        </Panel>
      ))}
    </div>
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
    icon: LucideIcon;
    label: string;
    variant: "primary" | "secondary" | "danger";
  }[] = [
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
          {actions.map(({ action, icon: Icon, label, variant }) => (
            <Button
              disabled={!canReview}
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
  return (
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
        </div>
      </Panel>
      <Panel title="Quality Flags">
        <div className="space-y-3">
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
  return (
    <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
      <Panel title="Location Summary">
        <div className="grid gap-3 md:grid-cols-2">
          <Signal
            label="Coordinates"
            value={`${submission.latitude.toFixed(5)}, ${submission.longitude.toFixed(5)}`}
          />
          <Signal
            label="GPS Accuracy"
            value={`${submission.accuracy ?? "n/a"}m`}
            tone={submission.gps_status === "valid" ? "success" : "warning"}
          />
          <Signal
            label="Administrative Location"
            value={submission.location_name}
          />
          <Signal label="Assigned Area" value={submission.project_name} />
          <Signal
            label="Boundary Validation"
            value={
              submission.gps_status === "valid"
                ? "Inside assigned area"
                : "Needs spatial review"
            }
            tone={submission.gps_status === "valid" ? "success" : "warning"}
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
            <p className="mt-3 font-semibold">{submission.location_name}</p>
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              {submission.latitude.toFixed(5)},{" "}
              {submission.longitude.toFixed(5)}
            </p>
          </div>
        </div>
      </Panel>
    </div>
  );
}

function SubmissionFilters({
  submissions,
}: {
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
  return (
    <div className="grid gap-3 rounded-xl border bg-panel p-3 shadow-line md:grid-cols-2 xl:grid-cols-5">
      <Select>
        <option value="">All projects</option>
        {projects.map((project) => (
          <option key={project} value={project}>
            {project}
          </option>
        ))}
      </Select>
      <Select>
        <option value="">All forms</option>
        {forms.map((form) => (
          <option key={form} value={form}>
            {form}
          </option>
        ))}
      </Select>
      <Select>
        <option value="">All statuses</option>
        <option value="under_review">Pending Review</option>
        <option value="approved">Approved</option>
        <option value="rejected">Rejected</option>
        <option value="correction_requested">Returned</option>
      </Select>
      <Select>
        <option value="">All reviewers</option>
        {reviewers.map((reviewer) => (
          <option key={reviewer} value={reviewer}>
            {reviewer}
          </option>
        ))}
      </Select>
      <Input placeholder="Date range" />
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
