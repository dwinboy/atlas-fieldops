"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2, Download, MapPin, MessageSquareWarning, RotateCcw, ShieldAlert, XCircle } from "lucide-react";
import { useMemo, useState } from "react";

import { ActivityTimeline } from "@/components/ActivityTimeline";
import { DataTable, type TableColumn } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { listSubmissions, reviewSubmission, type SubmissionRead } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/stores/workspace";

type SubmissionReviewProps = {
  token: string | null;
};

const previewSubmissions: SubmissionRead[] = [
  {
    id: "sub-001",
    client_submission_id: "mobile-2026-0001",
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
    payload_json: { farmer_name: "Musa Kamga", crop: "Maize", acreage: 2.4, photo_count: 3 }
  },
  {
    id: "sub-002",
    client_submission_id: "mobile-2026-0002",
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
    payload_json: { household_id: "HH-2281", respondent: "Grace N.", notes: "Photo missing boundary marker" }
  }
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
  resubmitted: "accent"
} as const;

const reviewMetrics = [
  ["Under review", (submission: SubmissionRead) => submission.status === "under_review", ShieldAlert],
  ["Approved", (submission: SubmissionRead) => submission.status === "approved", CheckCircle2],
  ["Corrections", (submission: SubmissionRead) => submission.status === "correction_requested", MessageSquareWarning],
  ["Offline captured", (submission: SubmissionRead) => submission.offline_created, RotateCcw]
] as const;

const reviewActions = [
  ["approve", CheckCircle2, "primary"],
  ["request_correction", MessageSquareWarning, "secondary"],
  ["reject", XCircle, "danger"],
  ["start_review", ShieldAlert, "secondary"]
] as const;

export function SubmissionReview({ token }: SubmissionReviewProps) {
  const [selectedId, setSelectedId] = useState(previewSubmissions[0]?.id ?? "");
  const pushToast = useWorkspaceStore((state) => state.pushToast);

  const submissionsQuery = useQuery({
    queryKey: ["submissions", token],
    queryFn: () => listSubmissions(token ?? ""),
    enabled: Boolean(token && token !== "preview-token")
  });

  const submissions = submissionsQuery.data?.length ? submissionsQuery.data : previewSubmissions;
  const selected = useMemo(
    () => submissions.find((submission) => submission.id === selectedId) ?? submissions[0],
    [selectedId, submissions]
  );

  const reviewMutation = useMutation({
    mutationFn: (payload: { action: "approve" | "reject" | "request_correction" | "start_review"; comment: string }) =>
      reviewSubmission(token ?? "", selected?.id ?? "", payload),
    onSuccess: async (_submission, variables) => {
      pushToast({ title: `Submission ${variables.action.replace("_", " ")}`, description: selected?.client_submission_id, tone: "success" });
      await submissionsQuery.refetch();
    }
  });

  const columns: TableColumn<SubmissionRead>[] = [
    {
      key: "submission",
      header: "Submission",
      value: (submission) => `${submission.client_submission_id} ${submission.status}`,
      render: (submission) => (
        <button className="text-left" onClick={() => setSelectedId(submission.id)} type="button">
          <span className="block font-medium">{submission.client_submission_id}</span>
          <span className="mt-0.5 block text-xs text-muted-foreground">v{submission.server_sequence} · {submission.form_id}</span>
        </button>
      )
    },
    {
      key: "status",
      header: "Status",
      value: (submission) => submission.status,
      render: (submission) => (
        <Badge tone={statusTone[submission.status as keyof typeof statusTone] ?? "neutral"}>{submission.status.replace("_", " ")}</Badge>
      )
    },
    {
      key: "captured",
      header: "Captured",
      value: (submission) => submission.captured_at,
      render: (submission) => new Date(submission.captured_at).toLocaleString()
    },
    {
      key: "gps",
      header: "GPS",
      value: (submission) => `${submission.latitude},${submission.longitude}`,
      render: (submission) => (
        <span className="font-mono text-xs">
          {submission.latitude.toFixed(4)}, {submission.longitude.toFixed(4)}
        </span>
      )
    }
  ];

  function runPreviewAction(action: "approve" | "reject" | "request_correction" | "start_review") {
    if (token === "preview-token") {
      pushToast({ title: `Preview ${action.replace("_", " ")}`, description: selected?.client_submission_id, tone: "success" });
      return;
    }
    reviewMutation.mutate({ action, comment: `Reviewer selected ${action}` });
  }

  return (
    <section aria-labelledby="review-title" className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Review queue</p>
          <h1 id="review-title" className="mt-2 text-2xl font-semibold tracking-tight">
            Submission review
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            Inspect incoming field submissions, verify automatic GPS/device metadata, and route corrections back to mobile officers.
          </p>
        </div>
        <Button>
          <Download aria-hidden="true" />
          Export reviewed data
        </Button>
      </div>

      <div className="grid gap-3 lg:grid-cols-4">
        {reviewMetrics.map(([label, predicate, Icon]) => (
          <article key={label} className="rounded-lg border bg-panel p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{label}</p>
              <Icon aria-hidden="true" className="text-muted-foreground" size={17} />
            </div>
            <p className="mt-3 text-2xl font-semibold tracking-tight">{submissions.filter(predicate).length}</p>
          </article>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
        <DataTable columns={columns} emptyLabel="No submissions yet" rows={submissions} searchLabel="Search submissions" title="Incoming submissions" />

        <aside className="rounded-lg border bg-panel">
          <div className="border-b p-4">
            <h2 className="text-sm font-semibold">Review details</h2>
            <p className="mt-1 text-xs text-muted-foreground">{selected?.client_submission_id ?? "No submission selected"}</p>
          </div>
          {selected ? (
            <div className="space-y-4 p-4">
              <div className="flex items-center justify-between">
                <Badge tone={statusTone[selected.status as keyof typeof statusTone] ?? "neutral"}>{selected.status.replace("_", " ")}</Badge>
                <span className="text-xs text-muted-foreground">v{selected.server_sequence}</span>
              </div>
              <div className="rounded-md border bg-background p-3">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <MapPin aria-hidden="true" size={15} />
                  Automatic location
                </div>
                <p className="font-mono text-xs text-muted-foreground">
                  {selected.latitude.toFixed(5)}, {selected.longitude.toFixed(5)} · accuracy {selected.accuracy ?? "n/a"}m
                </p>
              </div>
              <div className="space-y-2">
                {Object.entries(selected.payload_json).map(([key, value]) => (
                  <div key={key} className="grid grid-cols-[140px_1fr] gap-3 border-t pt-2 text-sm first:border-t-0 first:pt-0">
                    <span className="text-muted-foreground">{key.replaceAll("_", " ")}</span>
                    <span className="font-medium">{String(value)}</span>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2">
                {reviewActions.map(([action, Icon, variant]) => (
                  <Button
                    key={action}
                    className={cn(action === "request_correction" && "col-span-2")}
                    disabled={reviewMutation.isPending}
                    onClick={() => runPreviewAction(action)}
                    variant={variant}
                  >
                    <Icon aria-hidden="true" />
                    {action.replace("_", " ")}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}
        </aside>
      </div>

      <ActivityTimeline />
    </section>
  );
}
