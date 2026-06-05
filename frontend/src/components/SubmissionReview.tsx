"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileSearch,
  MapPin,
  MessageSquareWarning,
  RotateCcw,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";

import { ActivityTimeline } from "@/components/ActivityTimeline";
import { DataTable, type TableColumn } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  listSubmissions,
  reviewSubmission,
  type SubmissionRead,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/stores/workspace";

type SubmissionReviewProps = {
  token: string | null;
};

const previewSubmissions: SubmissionRead[] = [
  {
    id: "sub-001",
    client_submission_id: "mobile-2026-0001",
    project_id: "preview-agriculture",
    survey_id: "preview-baseline",
    form_id: "vehicle-inspection",
    field_officer_id: "officer-001",
    status: "under_review",
    server_sequence: 2,
    captured_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    submitted_at: new Date(Date.now() - 70 * 60 * 1000).toISOString(),
    sync_received_at: new Date(Date.now() - 65 * 60 * 1000).toISOString(),
    offline_created: true,
    latitude: 5.9631,
    longitude: 10.1591,
    accuracy: 8.4,
    payload_json: {
      farmer_name: "Musa Kamga",
      crop: "Maize",
      acreage: 2.4,
      photo_count: 3,
    },
  },
  {
    id: "sub-002",
    client_submission_id: "mobile-2026-0002",
    project_id: "preview-agriculture",
    survey_id: "preview-registration",
    form_id: "site-survey",
    field_officer_id: "officer-002",
    status: "correction_requested",
    server_sequence: 1,
    captured_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    submitted_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    sync_received_at: new Date(Date.now() - 115 * 60 * 1000).toISOString(),
    offline_created: false,
    latitude: 4.0511,
    longitude: 9.7679,
    accuracy: 14.2,
    payload_json: {
      household_id: "HH-2281",
      respondent: "Grace N.",
      notes: "Photo missing boundary marker",
    },
  },
];

const statusTone = {
  draft: "neutral",
  pending_sync: "warning",
  synced: "accent",
  submitted: "accent",
  under_review: "warning",
  approved: "success",
  rejected: "danger",
  correction_requested: "warning",
  resubmitted: "accent",
} as const;

const reviewMetrics = [
  [
    "Need review",
    (submission: SubmissionRead) => submission.status === "under_review",
    ShieldAlert,
  ],
  [
    "Approved",
    (submission: SubmissionRead) => submission.status === "approved",
    CheckCircle2,
  ],
  [
    "Need correction",
    (submission: SubmissionRead) =>
      submission.status === "correction_requested",
    MessageSquareWarning,
  ],
  [
    "Collected offline",
    (submission: SubmissionRead) => submission.offline_created,
    RotateCcw,
  ],
] as const;

const reviewActions = [
  ["approve", "Approve", CheckCircle2, "primary"],
  [
    "request_correction",
    "Ask for correction",
    MessageSquareWarning,
    "secondary",
  ],
  ["reject", "Reject", XCircle, "danger"],
  ["start_review", "Start review", ShieldAlert, "secondary"],
] as const;

const reviewWorkflow = [
  {
    title: "Select the record",
    description:
      "Start with submissions under review, correction requests, or records linked to a quality flag.",
    icon: FileSearch,
  },
  {
    title: "Check the evidence",
    description:
      "Review answers, GPS accuracy, media evidence, beneficiary links, duplicates, and audit context.",
    icon: MapPin,
  },
  {
    title: "Write the decision note",
    description:
      "Use plain field language so the next person understands exactly what changed or what must be fixed.",
    icon: MessageSquareWarning,
  },
  {
    title: "Apply the decision",
    description:
      "Approve clean data, request correction for fixable records, or reject records that should not continue.",
    icon: ClipboardCheck,
  },
] as const;

function formatStatus(status: string) {
  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function SubmissionReview({ token }: SubmissionReviewProps) {
  const [selectedId, setSelectedId] = useState(previewSubmissions[0]?.id ?? "");
  const [previewRows, setPreviewRows] =
    useState<SubmissionRead[]>(previewSubmissions);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewResult, setReviewResult] = useState("");
  const [exportResult, setExportResult] = useState("");
  const pushToast = useWorkspaceStore((state) => state.pushToast);
  const setActiveView = useWorkspaceStore((state) => state.setActiveView);

  const submissionsQuery = useQuery({
    queryKey: ["submissions", token],
    queryFn: () => listSubmissions(token ?? ""),
    enabled: Boolean(token && token !== "preview-token"),
  });

  const isPreview = token === "preview-token";
  const submissions = useMemo(
    () => (isPreview ? previewRows : (submissionsQuery.data ?? [])),
    [isPreview, previewRows, submissionsQuery.data],
  );
  const selected = useMemo(
    () =>
      submissions.find((submission) => submission.id === selectedId) ??
      submissions[0],
    [selectedId, submissions],
  );

  const reviewMutation = useMutation({
    mutationFn: (payload: {
      action: "approve" | "reject" | "request_correction" | "start_review";
      comment: string;
    }) => reviewSubmission(token ?? "", selected?.id ?? "", payload),
    onSuccess: async (submission, variables) => {
      setReviewResult(
        `${submission.client_submission_id} is now ${formatStatus(submission.status)}. Reviewer note: ${variables.comment}`,
      );
      pushToast({
        title: `Submission ${variables.action.replace("_", " ")}`,
        description: selected?.client_submission_id,
        tone: "success",
      });
      await submissionsQuery.refetch();
    },
    onError: () => {
      setReviewResult(
        "Review action failed. Confirm the submission is still open, add a clear comment when requesting correction, and check your review permission.",
      );
      pushToast({
        title: "Review action failed",
        description: "Check submission status and review permission.",
        tone: "danger",
      });
    },
  });

  const columns: TableColumn<SubmissionRead>[] = [
    {
      key: "submission",
      header: "Submission",
      value: (submission) =>
        `${submission.client_submission_id} ${submission.status}`,
      render: (submission) => (
        <button
          className="text-left"
          onClick={() => setSelectedId(submission.id)}
          type="button"
        >
          <span className="block font-medium">
            {submission.client_submission_id}
          </span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            Version {submission.server_sequence} · {submission.form_id}
          </span>
        </button>
      ),
    },
    {
      key: "status",
      header: "Status",
      value: (submission) => submission.status,
      render: (submission) => (
        <Badge
          tone={
            statusTone[submission.status as keyof typeof statusTone] ??
            "neutral"
          }
        >
          {formatStatus(submission.status)}
        </Badge>
      ),
    },
    {
      key: "captured",
      header: "Captured",
      value: (submission) => submission.captured_at,
      render: (submission) => new Date(submission.captured_at).toLocaleString(),
    },
    {
      key: "gps",
      header: "GPS",
      value: (submission) => `${submission.latitude},${submission.longitude}`,
      render: (submission) => (
        <span className="font-mono text-xs">
          {submission.latitude.toFixed(4)}, {submission.longitude.toFixed(4)}
        </span>
      ),
    },
  ];

  function runPreviewAction(
    action: "approve" | "reject" | "request_correction" | "start_review",
  ) {
    const nextStatus = {
      approve: "approved",
      reject: "rejected",
      request_correction: "correction_requested",
      start_review: "under_review",
    }[action];
    const trimmedComment = reviewComment.trim();

    if (
      (action === "request_correction" || action === "reject") &&
      trimmedComment.length < 8
    ) {
      setReviewResult(
        "Write a clear reviewer comment before requesting correction or rejecting a submission. The field team needs a specific reason to act on.",
      );
      pushToast({
        title: "Reviewer comment required",
        description:
          "Add a practical reason before returning or rejecting the record.",
        tone: "warning",
      });
      return;
    }

    const comment =
      trimmedComment || `Reviewer selected ${action.replace("_", " ")}`;

    if (isPreview) {
      setPreviewRows((current) =>
        current.map((submission) =>
          submission.id === selected?.id
            ? {
                ...submission,
                status: nextStatus,
                server_sequence: submission.server_sequence + 1,
                payload_json: {
                  ...submission.payload_json,
                  reviewer_note: comment,
                },
              }
            : submission,
        ),
      );
      setReviewResult(
        `${selected?.client_submission_id} is now ${formatStatus(nextStatus)}. Reviewer note: ${comment}`,
      );
      setReviewComment("");
      pushToast({
        title: `Preview ${action.replace("_", " ")}`,
        description: selected?.client_submission_id,
        tone: "success",
      });
      return;
    }
    if (!selected) {
      setReviewResult("Select a submission before applying a review decision.");
      pushToast({
        title: "No submission selected",
        description: "Choose a submission from the review queue first.",
        tone: "warning",
      });
      return;
    }
    reviewMutation.mutate({ action, comment });
  }

  return (
    <section aria-labelledby="review-title" className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Review queue
          </p>
          <h1
            id="review-title"
            className="mt-2 text-2xl font-semibold tracking-tight"
          >
            Submission review
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            Check incoming field data, approve good submissions, and send clear
            correction requests back to the field.
          </p>
        </div>
        <Button
          onClick={() => {
            const approved = submissions.filter(
              (submission) => submission.status === "approved",
            ).length;
            const corrections = submissions.filter(
              (submission) => submission.status === "correction_requested",
            ).length;
            if (!submissions.length) {
              setExportResult(
                "There are no submissions to export yet. Collect and review field data before preparing supervisor or donor exports.",
              );
              pushToast({
                title: "No reviewed data yet",
                description: "Collect and review submissions before exporting.",
                tone: "warning",
              });
              return;
            }
            if (!approved) {
              setExportResult(
                `${corrections} correction request${corrections === 1 ? "" : "s"} found, but no approved submissions are ready for export yet. Approve clean submissions first.`,
              );
              pushToast({
                title: "No approved submissions",
                description:
                  "Approve submissions before creating a reviewed export.",
                tone: "warning",
              });
              return;
            }
            setExportResult(
              `${approved} approved submission${approved === 1 ? "" : "s"} and ${corrections} correction request${corrections === 1 ? "" : "s"} are ready. Use Data tools to create the governed export package.`,
            );
            pushToast({
              title: "Open Data tools for export",
              description: "Create governed export packages from Data tools.",
              tone: "neutral",
            });
            setActiveView("data");
          }}
          type="button"
        >
          <Download aria-hidden="true" />
          Export reviewed data
        </Button>
      </div>

      <div className="grid gap-3 lg:grid-cols-4">
        {reviewMetrics.map(([label, predicate, Icon]) => (
          <article key={label} className="rounded-lg border bg-panel p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{label}</p>
              <Icon
                aria-hidden="true"
                className="text-muted-foreground"
                size={17}
              />
            </div>
            <p className="mt-3 text-2xl font-semibold tracking-tight">
              {submissions.filter(predicate).length}
            </p>
          </article>
        ))}
      </div>

      <section
        aria-labelledby="review-workflow-title"
        className="rounded-lg border bg-panel p-4"
      >
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Issue resolution workflow
            </p>
            <h2
              id="review-workflow-title"
              className="mt-2 text-sm font-semibold"
            >
              Decide what happens before data enters reports
            </h2>
          </div>
          <Badge tone="accent">Evidence first</Badge>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {reviewWorkflow.map((step, index) => {
            const Icon = step.icon;
            return (
              <article
                className="rounded-lg border bg-background p-3"
                key={step.title}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg border bg-panel text-primary">
                    <Icon aria-hidden="true" size={16} />
                  </span>
                  {index < reviewWorkflow.length - 1 ? (
                    <ArrowRight
                      aria-hidden="true"
                      className="text-muted-foreground"
                      size={15}
                    />
                  ) : (
                    <CheckCircle2
                      aria-hidden="true"
                      className="text-success"
                      size={15}
                    />
                  )}
                </div>
                <h3 className="mt-3 text-sm font-semibold">
                  {index + 1}. {step.title}
                </h3>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  {step.description}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
        <DataTable
          columns={columns}
          emptyLabel="No submissions yet"
          rows={submissions}
          searchLabel="Search submissions"
          title="Incoming submissions"
        />

        <aside className="rounded-lg border bg-panel">
          <div className="border-b p-4">
            <h2 className="text-sm font-semibold">Review details</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {selected?.client_submission_id ?? "No submission selected"}
            </p>
          </div>
          {selected ? (
            <div className="space-y-4 p-4">
              <div className="flex items-center justify-between">
                <Badge
                  tone={
                    statusTone[selected.status as keyof typeof statusTone] ??
                    "neutral"
                  }
                >
                  {formatStatus(selected.status)}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Version {selected.server_sequence}
                </span>
              </div>
              <div className="rounded-md border bg-background p-3">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <MapPin aria-hidden="true" size={15} />
                  Automatic location
                </div>
                <p className="font-mono text-xs text-muted-foreground">
                  {selected.latitude.toFixed(5)},{" "}
                  {selected.longitude.toFixed(5)} · accuracy{" "}
                  {selected.accuracy ?? "n/a"}m
                </p>
              </div>
              <div className="space-y-2">
                {Object.entries(selected.payload_json).map(([key, value]) => (
                  <div
                    key={key}
                    className="grid grid-cols-[140px_1fr] gap-3 border-t pt-2 text-sm first:border-t-0 first:pt-0"
                  >
                    <span className="text-muted-foreground">
                      {key.replaceAll("_", " ")}
                    </span>
                    <span className="font-medium">{String(value)}</span>
                  </div>
                ))}
              </div>
              <label className="block text-sm font-medium">
                Review comment
                <textarea
                  className="mt-2 min-h-24 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition focus:border-ring focus:ring-3 focus:ring-ring/15"
                  onChange={(event) => setReviewComment(event.target.value)}
                  placeholder="Explain the approval, rejection, or correction request in clear field language."
                  value={reviewComment}
                />
              </label>
              <div className="grid grid-cols-2 gap-2 pt-2">
                {reviewActions.map(([action, label, Icon, variant]) => (
                  <Button
                    key={action}
                    className={cn(
                      action === "request_correction" && "col-span-2",
                    )}
                    disabled={!selected || reviewMutation.isPending}
                    onClick={() => runPreviewAction(action)}
                    variant={variant}
                  >
                    <Icon aria-hidden="true" />
                    {label}
                  </Button>
                ))}
              </div>
              {reviewResult ? (
                <div
                  className="rounded-lg border border-success/30 bg-success/10 p-3"
                  aria-live="polite"
                >
                  <p className="text-sm font-semibold">Review outcome</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {reviewResult}
                  </p>
                </div>
              ) : null}
              {exportResult ? (
                <div
                  className="rounded-lg border bg-background p-3"
                  aria-live="polite"
                >
                  <p className="text-sm font-semibold">Export package</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {exportResult}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}
        </aside>
      </div>

      {submissions.length || isPreview ? (
        <ActivityTimeline />
      ) : (
        <section className="rounded-lg border bg-panel p-4">
          <h2 className="text-sm font-semibold">No review activity yet</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            New organizations will show submissions here after field officers
            collect and sync data. Until then, the queue stays empty so managers
            do not mistake demo records for live data.
          </p>
        </section>
      )}
    </section>
  );
}
