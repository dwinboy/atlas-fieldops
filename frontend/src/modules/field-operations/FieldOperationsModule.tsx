"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CalendarDays,
  ClipboardList,
  Download,
  FileText,
  MapPinned,
  Plus,
  QrCode,
  RadioTower,
  RefreshCw,
  Route,
  ShieldCheck,
  Target,
  UploadCloud,
  UserPlus,
  UsersRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import { DataTable, type TableColumn } from "@/components/DataTable";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ActionMenu, type ActionMenuItem } from "@/components/ui/dropdown-menu";
import { HelpHint } from "@/components/ui/help-hint";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { UserProfileLink } from "@/components/ui/user-link";
import {
  createFieldOfficerAssignment,
  createFieldWorkAssignment,
  createFieldWorkPlan,
  createOperationalTarget,
  listFieldWorkAssignments,
  listFieldWorkPlans,
  listIndicators,
  listOperationalTargets,
  setFieldWorkAssignmentStatus,
  updateFieldWorkAssignment,
  updateOperationalTarget,
  getOperationalActivityReport,
  getFieldOfficerProfile,
  getOperationsSummary,
  importFieldOfficers,
  inviteFieldOfficer,
  listBeneficiaries,
  listForms,
  listActivityMediaEvidence,
  listFieldOfficers,
  listFieldVisitRequests,
  listUsers,
  listProjects,
  resetUserPassword,
  reviewOperationalActivityOutcome,
  reviewFieldVisitRequest,
  updateFieldOfficerProfile,
  type CurrentPrincipal,
  type FieldOfficerActivityEventRead,
  type FieldOfficerAssignmentDetailRead,
  type FieldOfficerDeviceDetailRead,
  type FieldOfficerInvite,
  type FieldOfficerPermissionRead,
  type FieldOfficerProfileDetailRead,
  type FieldOfficerProfileUpdate,
  type FieldOfficerRead,
  type FieldOfficerSubmissionDetailRead,
  type FieldVisitRequestRead,
  type FieldVisitOutcomeReview,
  type MediaEvidenceRead,
  type OperationsSummary,
  type OperationalActivityReportType,
  type UserRead,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  mapBeneficiaryRead,
  previewEntities,
  type BeneficiaryEntity,
  type EntityStatus,
} from "@/modules/beneficiaries/data";
import { formatEntityDate } from "@/modules/beneficiaries/utils";
import {
  fieldOperationsSections,
  previewActivities,
  previewAssignments,
  previewOfficers,
  previewOperationsSummary,
  previewSupervisors,
  previewTargets,
  previewWorkPlans,
  type AssignmentStatus,
  type FieldActivity,
  type FieldAssignment,
  type FieldOperationsSection,
  type OperationalTarget,
  type Priority,
  type SupervisorProfile,
  type WorkPlan,
} from "@/modules/field-operations/data";
import {
  computeFieldOperationsSummary,
  deriveFieldActivities,
  deriveSupervisors,
  formatDate,
  formatTime,
  priorityTone,
  progressPercent,
  statusTone,
  toCsv,
} from "@/modules/field-operations/utils";
import { useWorkspaceStore } from "@/stores/workspace";

type FieldOperationsModuleProps = {
  principal?: CurrentPrincipal | null;
  token: string | null;
};

type ModalMode =
  | "assignment"
  | "assignment-view"
  | "invite"
  | "work-plan"
  | "target"
  | null;

const defaultAssignmentDraft: Omit<FieldAssignment, "id" | "completedCount"> = {
  assignedEntityIds: [],
  assignmentType: "Form + Location",
  description: "",
  endDate: "",
  fieldOfficers: [],
  form: "",
  location: "",
  name: "",
  priority: "Normal",
  project: "",
  startDate: "",
  status: "Draft",
  supervisor: "",
  targetCount: 0,
};

const defaultInviteDraft: FieldOfficerInvite = {
  email: "",
  full_name: "",
  home_region: "",
  temporary_password: "",
};

function generateTemporaryPassword(): string {
  const words = ["Field", "Atlas", "Green", "Swift", "Clear", "Smart", "Signal", "Survey", "Active", "Verify"];
  const word = words[Math.floor(Math.random() * words.length)];
  const digits = String(Math.floor(100000 + Math.random() * 900000));
  return `${word}${digits}!`;
}

const defaultWorkPlanDraft: Omit<WorkPlan, "id" | "progress" | "view"> = {
  assignedTeams: [],
  deliverables: [],
  endDate: "",
  locations: [],
  name: "",
  objectives: "",
  project: "",
  startDate: "",
};

const defaultTargetDraft: Omit<OperationalTarget, "achieved" | "id"> = {
  assignedStaff: [],
  deadline: "",
  indicator: "",
  indicatorId: "",
  name: "",
  project: "",
  team: "",
  type: "Weekly",
  value: 0,
};

function isPreview(token: string | null): boolean {
  return !token || token === "preview-token";
}

function initialFieldOperationsSection(): FieldOperationsSection {
  if (typeof window === "undefined") return "dashboard";
  const path = window.location.pathname;
  const section = fieldOperationsSections.find((item) => path.endsWith(item.route));
  return section?.id ?? "dashboard";
}

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
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

function MetricCard({
  icon,
  label,
  onClick,
  tone = "neutral",
  value,
}: {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  tone?: "danger" | "neutral" | "success" | "warning";
  value: string | number;
}) {
  const Component = onClick ? "button" : "article";
  return (
    <Component
      className={cn(
        "surface-premium w-full rounded-2xl p-4 text-left",
        onClick && "transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-line focus:outline-none focus:ring-2 focus:ring-primary/30",
      )}
      onClick={onClick}
      type={onClick ? "button" : undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
        </div>
        <span
          className={cn(
            "rounded-xl border p-2",
            tone === "danger" && "border-danger/20 bg-danger/10 text-danger",
            tone === "success" &&
              "border-success/20 bg-success/10 text-success",
            tone === "warning" &&
              "border-warning/20 bg-warning/10 text-warning",
            tone === "neutral" &&
              "border-border bg-muted text-muted-foreground",
          )}
        >
          {icon}
        </span>
      </div>
    </Component>
  );
}

function caseStatusTone(status: EntityStatus): BadgeProps["tone"] {
  if (status === "Active") return "success";
  if (status === "Duplicate") return "danger";
  if (status === "Moved" || status === "Deceased") return "warning";
  return "neutral";
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs font-medium">
        <span className="text-muted-foreground">Progress</span>
        <span>{value}%</span>
      </div>
      <div className="h-2 rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </div>
    </div>
  );
}

function DetailSignal({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border bg-background px-3 py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-right text-xs font-semibold">{value}</span>
    </div>
  );
}

function TargetProgressEditor({
  disabled,
  onSave,
  target,
}: {
  disabled: boolean;
  onSave: (value: number) => void;
  target: OperationalTarget;
}) {
  const [value, setValue] = useState(String(target.achieved));
  useEffect(() => {
    setValue(String(target.achieved));
  }, [target.achieved]);
  const parsed = Number.parseInt(value, 10);
  const valid = Number.isFinite(parsed) && parsed >= 0;
  return (
    <div className="flex items-center justify-end gap-1.5">
      <Input
        aria-label={`Achieved value for ${target.name}`}
        className="h-8 w-24 text-right text-xs tabular-nums"
        disabled={disabled}
        inputMode="numeric"
        onChange={(event) => setValue(event.target.value)}
        value={value}
      />
      <Button
        disabled={disabled || !valid || parsed === target.achieved}
        onClick={() => onSave(parsed)}
        size="sm"
        type="button"
        variant="secondary"
      >
        Save
      </Button>
    </div>
  );
}

function SectionHeader({ action, description, title }: { action?: ReactNode; description: string; title: string }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-panel p-3.5 shadow-line md:flex-row md:items-start md:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold">{title}</h2>
        <HelpHint label={`About ${title}`} title={title}>{description}</HelpHint>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

function SectionPanel({
  children,
  description,
  title,
}: {
  children: ReactNode;
  description: string;
  title: string;
}) {
  return (
    <section className="rounded-xl border bg-panel p-3.5 shadow-line">
      <div className="mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold">{title}</h2>
          <HelpHint label={`About ${title}`} title={title}>
            {description}
          </HelpHint>
        </div>
      </div>
      {children}
    </section>
  );
}

type OfficerProfileTab =
  | "overview"
  | "work"
  | "submissions"
  | "performance"
  | "devices-activity"
  | "permissions-security"
  | "audit";

const officerProfileTabs: { id: OfficerProfileTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "work", label: "Work" },
  { id: "submissions", label: "Submissions & Entities" },
  { id: "performance", label: "Performance & Quality" },
  { id: "devices-activity", label: "Devices & Activity" },
  { id: "permissions-security", label: "Permissions & Security" },
  { id: "audit", label: "Audit Trail" },
];

function ProfileSignal({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-background p-2.5">
      <p className="text-[11px] font-medium uppercase text-muted-foreground">{label}</p>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </div>
  );
}

function asText(value: unknown): string {
  if (value === null || value === undefined || value === "") return "Not set";
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function titleCase(value: string): string {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const operationalReportOptions: Array<{ label: string; value: OperationalActivityReportType }> = [
  { label: "Monthly operations", value: "monthly_operations" },
  { label: "Officer movement", value: "field_officer_movement" },
  { label: "Incidents", value: "incident_report" },
  { label: "Supervisor approvals", value: "supervisor_approval" },
  { label: "GPS exceptions", value: "gps_exception" },
];

function OperationalActivityDetail({
  activity,
  canApprove,
  canReviewOutcome,
  mediaEvidence,
  officerName,
  onClose,
  onOutcomeReview,
  onReview,
  outcomeReviewPending,
  reviewPending,
}: {
  activity: FieldVisitRequestRead;
  canApprove: boolean;
  canReviewOutcome: boolean;
  mediaEvidence: MediaEvidenceRead[];
  officerName: string;
  onClose: () => void;
  onOutcomeReview: (action: FieldVisitOutcomeReview["action"]) => void;
  onReview: (action: "approve" | "reject" | "request_changes") => void;
  outcomeReviewPending: boolean;
  reviewPending: boolean;
}) {
  const reviewHistory = Array.isArray(activity.metadata_json.reviews)
    ? activity.metadata_json.reviews.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    : [];
  const canReview = canApprove && ["pending", "change_requested"].includes(activity.status);
  const canMakeOutcomeDecision = canReviewOutcome && ["checked_in", "completed", "flagged", "change_requested"].includes(activity.status);
  const outcomeStatus = typeof activity.metadata_json.outcomeStatus === "string" ? activity.metadata_json.outcomeStatus : null;
  return (
    <section className="rounded-xl border bg-panel p-4 shadow-line">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={activity.activity_scope === "organization" ? "accent" : "neutral"}>
              {titleCase(activity.activity_scope)}
            </Badge>
            <Badge tone={activity.status === "completed" || activity.status === "approved" ? "success" : activity.status === "flagged" || activity.status === "rejected" ? "danger" : "warning"}>
              {titleCase(activity.status)}
            </Badge>
            <Badge tone={activity.requires_approval ? "warning" : "success"}>
              {activity.requires_approval ? "Approval required" : "Direct log"}
            </Badge>
            {outcomeStatus ? <Badge tone="accent">Outcome: {titleCase(outcomeStatus)}</Badge> : null}
          </div>
          <h2 className="mt-3 text-xl font-semibold tracking-tight">{activity.title}</h2>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            {activity.purpose ?? "No purpose was provided by the field officer."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canReview ? (
            <>
              <Button disabled={reviewPending} onClick={() => onReview("approve")} size="sm" variant="primary">
                Approve
              </Button>
              <Button disabled={reviewPending} onClick={() => onReview("request_changes")} size="sm" variant="secondary">
                Request changes
              </Button>
              <Button disabled={reviewPending} onClick={() => onReview("reject")} size="sm" variant="ghost">
                Reject
              </Button>
            </>
          ) : null}
          {canMakeOutcomeDecision ? (
            <>
              <Button disabled={outcomeReviewPending} onClick={() => onOutcomeReview("verify")} size="sm" variant="primary">
                Mark verified
              </Button>
              <Button disabled={outcomeReviewPending} onClick={() => onOutcomeReview("accept_with_exception")} size="sm" variant="secondary">
                Accept exception
              </Button>
              <Button disabled={outcomeReviewPending} onClick={() => onOutcomeReview("request_correction")} size="sm" variant="secondary">
                Request correction
              </Button>
              <Button disabled={outcomeReviewPending} onClick={() => onOutcomeReview("flag")} size="sm" variant="ghost">
                Flag
              </Button>
            </>
          ) : null}
          <Button onClick={onClose} size="sm" variant="ghost">
            Close
          </Button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <DetailSignal label="Field officer" value={officerName} />
        <DetailSignal label="Activity type" value={titleCase(activity.activity_type)} />
        <DetailSignal label="Location" value={activity.location_name} />
        <DetailSignal label="Evidence files" value={mediaEvidence.length} />
        <DetailSignal label="Priority" value={titleCase(activity.priority)} />
        <DetailSignal label="Start" value={formatTime(activity.requested_start_at)} />
        <DetailSignal label="End" value={formatTime(activity.requested_end_at)} />
        <DetailSignal label="GPS verification" value={titleCase(activity.verification_status)} />
        <DetailSignal label="Supervisor outcome" value={outcomeStatus ? titleCase(outcomeStatus) : "Not reviewed"} />
        <DetailSignal
          label="Distance from plan"
          value={activity.distance_from_planned_meters === null ? "Not checked in" : `${Math.round(activity.distance_from_planned_meters)}m`}
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <div className="rounded-xl border bg-background p-3">
          <h3 className="text-sm font-semibold">GPS and movement evidence</h3>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <DetailSignal
              label="Planned point"
              value={activity.latitude === null || activity.longitude === null ? "Not provided" : `${activity.latitude.toFixed(5)}, ${activity.longitude.toFixed(5)}`}
            />
            <DetailSignal
              label="Check-in point"
              value={activity.check_in_latitude === null || activity.check_in_longitude === null ? "No check-in yet" : `${activity.check_in_latitude.toFixed(5)}, ${activity.check_in_longitude.toFixed(5)}`}
            />
            <DetailSignal label="Check-in time" value={formatTime(activity.check_in_at)} />
            <DetailSignal label="Check-in accuracy" value={activity.check_in_accuracy === null ? "Not captured" : `${Math.round(activity.check_in_accuracy)}m`} />
            <DetailSignal
              label="Check-out point"
              value={activity.check_out_latitude === null || activity.check_out_longitude === null ? "No check-out yet" : `${activity.check_out_latitude.toFixed(5)}, ${activity.check_out_longitude.toFixed(5)}`}
            />
            <DetailSignal label="Check-out time" value={formatTime(activity.check_out_at)} />
          </div>
          {activity.verification_status !== "verified" && activity.verification_status !== "not_checked_in" ? (
            <p className="mt-3 rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-warning-foreground">
              Supervisor review recommended: this activity has a GPS warning. Use the evidence above before deciding whether the activity was valid.
            </p>
          ) : null}
        </div>
        <div className="rounded-xl border bg-background p-3">
          <h3 className="text-sm font-semibold">Approval and activity history</h3>
          <div className="mt-3 space-y-2">
            <div className="rounded-lg border bg-panel p-2.5 text-xs">
              <p className="font-semibold">Requested</p>
              <p className="text-muted-foreground">{formatTime(activity.created_at)} by {officerName}</p>
            </div>
            {reviewHistory.map((review, index) => (
              <div className="rounded-lg border bg-panel p-2.5 text-xs" key={`${activity.id}-review-${index}`}>
                <p className="font-semibold">{titleCase(String(review.action ?? "review"))}</p>
                <p className="text-muted-foreground">{String(review.comment ?? "No comment")}</p>
                <p className="mt-1 text-muted-foreground">{String(review.reviewedAt ?? "")}</p>
              </div>
            ))}
            {activity.check_in_at ? (
              <div className="rounded-lg border bg-panel p-2.5 text-xs">
                <p className="font-semibold">Checked in</p>
                <p className="text-muted-foreground">{formatTime(activity.check_in_at)} · {titleCase(activity.verification_status)}</p>
              </div>
            ) : null}
            {activity.check_out_at ? (
              <div className="rounded-lg border bg-panel p-2.5 text-xs">
                <p className="font-semibold">Completed</p>
                <p className="text-muted-foreground">{formatTime(activity.check_out_at)} · {activity.check_out_summary ?? "No summary"}</p>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-xl border bg-background p-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold">Activity attachments</h3>
            <p className="text-xs text-muted-foreground">
              Photos, signatures, video, audio, and file evidence captured by the field officer.
            </p>
          </div>
          <Badge tone={mediaEvidence.length ? "success" : "neutral"}>{mediaEvidence.length} evidence item(s)</Badge>
        </div>
        {mediaEvidence.length ? (
          <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {mediaEvidence.map((item) => (
              <a
                className="rounded-lg border bg-panel p-3 text-sm transition hover:border-primary/40 hover:bg-primary/5"
                href={item.storage_url}
                key={item.id}
                rel="noreferrer"
                target="_blank"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{item.file_name}</span>
                  <Badge tone="neutral">{titleCase(item.media_type)}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{item.mime_type} · {Math.round(item.size_bytes / 1024)} KB</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Captured {item.captured_at ? formatTime(item.captured_at) : formatTime(item.created_at)}
                </p>
                {item.latitude !== null && item.longitude !== null ? (
                  <p className="mt-1 text-xs text-muted-foreground">{item.latitude.toFixed(5)}, {item.longitude.toFixed(5)}</p>
                ) : null}
              </a>
            ))}
          </div>
        ) : (
          <p className="mt-3 rounded-lg border border-dashed bg-panel p-3 text-xs text-muted-foreground">
            No evidence has been attached yet. For deliveries, trainings, meetings, and incidents, ask the field officer to attach a photo, signature, or file evidence from the mobile app.
          </p>
        )}
      </div>
    </section>
  );
}

function OfficerProfileWorkspace({
  canManage,
  detail,
  loading,
  onClose,
  onNavigate,
  onUpdateProfile,
  onResetPassword,
  profileUpdatePending,
  resetPending,
  temporaryPassword,
  users,
}: {
  canManage: boolean;
  detail?: FieldOfficerProfileDetailRead;
  loading: boolean;
  onClose: () => void;
  onNavigate: (route: string) => void;
  onUpdateProfile: (payload: FieldOfficerProfileUpdate) => void;
  onResetPassword: () => void;
  profileUpdatePending: boolean;
  resetPending: boolean;
  temporaryPassword: string | null;
  users: UserRead[];
}) {
  const [tab, setTab] = useState<OfficerProfileTab>("overview");
  const [mobileQrCodeUrl, setMobileQrCodeUrl] = useState<string | null>(null);
  const [profileDraft, setProfileDraft] = useState({
    employee_code: "",
    home_region: "",
    is_active: true,
    phone_number: "",
    supervisor_user_id: "",
  });

  useEffect(() => {
    setTab("overview");
  }, [detail?.officer.id]);

  useEffect(() => {
    if (!detail) return;
    setProfileDraft({
      employee_code: detail.officer.employee_code ?? "",
      home_region: detail.officer.home_region ?? "",
      is_active: detail.officer.is_active,
      phone_number: detail.officer.phone_number ?? "",
      supervisor_user_id: detail.officer.supervisor_user_id ?? "",
    });
  }, [detail]);

  useEffect(() => {
    let cancelled = false;
    const payload = detail?.security.mobile_qr_login_payload;
    if (!payload) {
      setMobileQrCodeUrl(null);
      return;
    }
    QRCode.toDataURL(payload, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 220,
    })
      .then((dataUrl) => {
        if (!cancelled) {
          setMobileQrCodeUrl(dataUrl);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMobileQrCodeUrl(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [detail?.security.mobile_qr_login_payload]);

  const assignmentColumns: TableColumn<FieldOfficerAssignmentDetailRead>[] = [
    {
      key: "assignment",
      header: "Assignment",
      value: (assignment) => `${assignment.project_name} ${assignment.form_name ?? ""}`,
      render: (assignment) => (
        <div>
          <p className="font-medium">{assignment.form_name ?? "Project access"}</p>
          <p className="text-xs text-muted-foreground">{assignment.project_name}</p>
        </div>
      ),
    },
    { key: "location", header: "Location", value: (assignment) => assignment.region ?? "", render: (assignment) => assignment.region ?? "Project area" },
    { key: "status", header: "Status", value: (assignment) => assignment.status, render: (assignment) => <Badge tone={statusTone(assignment.status)}>{assignment.status}</Badge> },
    { key: "updated", header: "Updated", value: (assignment) => assignment.updated_at, render: (assignment) => formatTime(assignment.updated_at) },
  ];

  const submissionColumns: TableColumn<FieldOfficerSubmissionDetailRead>[] = [
    { key: "submission", header: "Submission", value: (submission) => submission.client_submission_id, render: (submission) => <span className="font-mono text-xs">{submission.client_submission_id}</span> },
    { key: "form", header: "Form", value: (submission) => submission.form_name ?? "", render: (submission) => submission.form_name ?? "Form" },
    { key: "project", header: "Project", value: (submission) => submission.project_name ?? "", render: (submission) => submission.project_name ?? "Not linked" },
    { key: "source", header: "Source", value: (submission) => submission.source, render: (submission) => <Badge tone="collect">{submission.source}</Badge> },
    { key: "status", header: "Status", value: (submission) => submission.status, render: (submission) => <Badge tone={statusTone(submission.status)}>{submission.status}</Badge> },
    { key: "date", header: "Date", value: (submission) => submission.submitted_at, render: (submission) => formatTime(submission.submitted_at) },
  ];

  const deviceColumns: TableColumn<FieldOfficerDeviceDetailRead>[] = [
    { key: "device", header: "Device", value: (device) => `${device.device_name} ${device.device_id}`, render: (device) => <div><p className="font-medium">{device.device_name}</p><p className="font-mono text-xs text-muted-foreground">{device.device_id}</p></div> },
    { key: "platform", header: "Platform", value: (device) => `${device.platform} ${device.os_version ?? ""}`, render: (device) => `${device.platform}${device.os_version ? ` · ${device.os_version}` : ""}` },
    { key: "version", header: "App", value: (device) => device.app_version ?? "", render: (device) => device.app_version ?? "Unknown" },
    { key: "sync", header: "Last Sync", value: (device) => device.last_sync_at ?? "", render: (device) => formatTime(device.last_sync_at) },
    { key: "status", header: "Status", value: (device) => device.status, render: (device) => <Badge tone={statusTone(device.status)}>{device.status}</Badge> },
  ];

  const activityColumns: TableColumn<FieldOfficerActivityEventRead>[] = [
    { key: "event", header: "Event", value: (event) => `${event.action} ${event.detail}`, render: (event) => <div><p className="font-medium">{event.action}</p><p className="text-xs text-muted-foreground">{event.detail}</p></div> },
    { key: "device", header: "Device", value: (event) => event.device_id ?? "", render: (event) => event.device_id ?? "Not recorded" },
    { key: "status", header: "Status", value: (event) => event.status, render: (event) => <Badge tone={statusTone(event.status)}>{event.status}</Badge> },
    { key: "date", header: "Date", value: (event) => event.created_at, render: (event) => formatTime(event.created_at) },
  ];

  const permissionColumns: TableColumn<FieldOfficerPermissionRead>[] = [
    { key: "permission", header: "Permission", value: (permission) => permission.label, render: (permission) => permission.label },
    { key: "source", header: "Source", value: (permission) => permission.source, render: (permission) => permission.source },
    { key: "status", header: "Status", value: (permission) => (permission.enabled ? "Allowed" : "Restricted"), render: (permission) => <Badge tone={permission.enabled ? "success" : "warning"}>{permission.enabled ? "Allowed" : "Restricted"}</Badge> },
  ];

  if (!detail) {
    return (
      <section className="rounded-xl border bg-panel p-4 shadow-line">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Field officer profile</h2>
            <p className="text-sm text-muted-foreground">{loading ? "Loading profile..." : "Select a field officer to open their operational profile."}</p>
          </div>
          <Button onClick={onClose} variant="secondary">Close</Button>
        </div>
      </section>
    );
  }

  const officer = detail.officer;
  const performance = detail.performance;
  const dataQuality = detail.data_quality;
  const supervisorCandidates = users.filter((user) => {
    const roleName = String(user.role_name ?? "").toLowerCase();
    return ["supervisor", "district_supervisor", "regional_manager", "project_manager", "me_manager", "national_admin", "owner", "organization_owner"].includes(roleName);
  });

  return (
    <section className="rounded-xl border bg-panel p-3.5 shadow-line">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
            {officer.full_name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold">{officer.full_name}</h2>
              <Badge tone={officer.is_active ? "success" : "danger"}>{detail.status}</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {officer.employee_code ?? "No employee ID"} · {officer.email} · {officer.phone_number ?? "No phone"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {detail.organization_name ?? "Organization"} · {detail.team ?? "No team"} · Supervisor:{" "}
              {detail.supervisor ? (
                <UserProfileLink userId={officer.supervisor_user_id}>{detail.supervisor}</UserProfileLink>
              ) : (
                "Not assigned"
              )}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => onNavigate(`/users-teams/role-profiles/${officer.user_id}`)} variant="secondary">
            Manage account &amp; access
          </Button>
          <Button disabled={!canManage} onClick={onResetPassword} variant="secondary">
            {resetPending ? "Generating..." : "Generate temporary password"}
          </Button>
          <Button onClick={onClose} variant="ghost">Close profile</Button>
        </div>
      </div>

      {temporaryPassword ? (
        <div className="mt-3 rounded-lg border border-success/30 bg-success/10 p-3" aria-live="polite">
          <p className="text-sm font-semibold">Temporary credential generated — show once</p>
          <pre className="mt-2 whitespace-pre-wrap rounded bg-background p-3 text-xs leading-6 font-mono">
{`Email:    ${officer.email}
Password: ${temporaryPassword}`}
          </pre>
          <p className="mt-2 text-xs text-muted-foreground">Share this directly with the officer. Stored passwords and hashes are never displayed.</p>
        </div>
      ) : null}

      <div className="mt-3 flex gap-1.5 overflow-x-auto product-scrollbar">
        {officerProfileTabs.map((item) => (
          <button
            className={cn(
              "shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium transition",
              tab === item.id ? "border-primary bg-primary text-primary-foreground" : "bg-panel hover:bg-muted",
            )}
            key={item.id}
            onClick={() => setTab(item.id)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {tab === "overview" ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
              {detail.metrics.map((metric) => (
                <MetricCard
                  key={metric.label}
                  icon={<ShieldCheck aria-hidden="true" />}
                  label={metric.label}
                  onClick={metric.route ? () => onNavigate(metric.route ?? "") : undefined}
                  tone={metric.tone ?? "neutral"}
                  value={metric.label === "Last Sync" && metric.value !== "Never" ? formatTime(metric.value) : metric.value}
                />
              ))}
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <ProfileSignal label="Username" value={detail.security.username} />
              <ProfileSignal label="Home Location" value={officer.home_region ?? "Unassigned"} />
              <ProfileSignal label="Device" value={officer.device_id ?? "No device paired"} />
            </div>
            {canManage ? (
              <div className="rounded-xl border bg-background p-3">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                  <label className="grid flex-1 gap-1.5 text-xs font-medium text-muted-foreground">
                    Supervisor
                    <Select
                      value={profileDraft.supervisor_user_id}
                      onChange={(event) => setProfileDraft((current) => ({ ...current, supervisor_user_id: event.target.value }))}
                    >
                      <option value="">No supervisor assigned</option>
                      {supervisorCandidates.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.full_name} · {user.role_name ?? "manager"}
                        </option>
                      ))}
                    </Select>
                  </label>
                  <label className="grid flex-1 gap-1.5 text-xs font-medium text-muted-foreground">
                    Field location/team
                    <Input
                      value={profileDraft.home_region}
                      onChange={(event) => setProfileDraft((current) => ({ ...current, home_region: event.target.value }))}
                      placeholder="District, region, or field team"
                    />
                  </label>
                  <label className="grid flex-1 gap-1.5 text-xs font-medium text-muted-foreground">
                    Phone
                    <Input
                      value={profileDraft.phone_number}
                      onChange={(event) => setProfileDraft((current) => ({ ...current, phone_number: event.target.value }))}
                      placeholder="Phone number"
                    />
                  </label>
                  <Button
                    disabled={profileUpdatePending}
                    onClick={() =>
                      onUpdateProfile({
                        employee_code: profileDraft.employee_code || null,
                        home_region: profileDraft.home_region || null,
                        phone_number: profileDraft.phone_number || null,
                        supervisor_user_id: profileDraft.supervisor_user_id || null,
                        is_active: profileDraft.is_active,
                      })
                    }
                    type="button"
                    variant="primary"
                  >
                    {profileUpdatePending ? "Saving..." : "Save profile"}
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {tab === "work" ? (
          <div className="space-y-4">
            <DataTable columns={assignmentColumns} emptyLabel="No assignments for this officer." rows={detail.assignments} searchLabel="Search assignments" title="Assignments" />
            <DataTable columns={assignmentColumns} emptyLabel="No project access assigned." rows={detail.projects} searchLabel="Search projects" title="Project access" />
            <DataTable columns={assignmentColumns} emptyLabel="No forms assigned." rows={detail.forms} searchLabel="Search forms" title="Available forms" />
            <div>
              <h3 className="mb-2 text-sm font-semibold">Locations</h3>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {(detail.locations.length ? detail.locations : ["No assigned locations"]).map((location) => (
                  <ProfileSignal key={location} label="Assigned location" value={location} />
                ))}
              </div>
            </div>
          </div>
        ) : null}
        {tab === "submissions" ? (
          <div className="space-y-4">
            <DataTable columns={submissionColumns} emptyLabel="No submissions from this officer yet." rows={detail.submissions} searchLabel="Search submissions" title="Submissions" />
            <DataTable
              columns={[
                { key: "code", header: "Code", value: (row) => asText(row.beneficiary_code), render: (row) => <span className="font-mono text-xs">{asText(row.beneficiary_code)}</span> },
                { key: "name", header: "Name", value: (row) => asText(row.name), render: (row) => asText(row.name) },
                { key: "type", header: "Type", value: (row) => asText(row.type), render: (row) => asText(row.type) },
                { key: "location", header: "Location", value: (row) => asText(row.location), render: (row) => asText(row.location) },
                { key: "status", header: "Status", value: (row) => asText(row.status), render: (row) => <Badge tone={statusTone(asText(row.status))}>{asText(row.status)}</Badge> },
              ]}
              emptyLabel="No entity records linked through this officer's submissions yet."
              rows={detail.beneficiaries}
              searchLabel="Search entities"
              title="Assigned and linked entities"
            />
          </div>
        ) : null}
        {tab === "performance" ? (
          <div className="space-y-4">
            <div>
              <h3 className="mb-2 text-sm font-semibold">Performance</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {Object.entries(performance).map(([key, value]) => (
                  <ProfileSignal key={key} label={key.replaceAll("_", " ")} value={asText(value)} />
                ))}
              </div>
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold">Data Quality</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {Object.entries(dataQuality).map(([key, value]) => (
                  <ProfileSignal key={key} label={key.replaceAll("_", " ")} value={typeof value === "object" ? JSON.stringify(value) : asText(value)} />
                ))}
              </div>
            </div>
          </div>
        ) : null}
        {tab === "devices-activity" ? (
          <div className="space-y-4">
            <DataTable columns={deviceColumns} emptyLabel="No registered devices for this officer." rows={detail.devices} searchLabel="Search devices" title="Mobile devices" />
            <DataTable columns={activityColumns} emptyLabel="No activity recorded yet." rows={detail.activity} searchLabel="Search activity" title="Activity timeline" />
          </div>
        ) : null}
        {tab === "permissions-security" ? (
          <div className="space-y-4">
            <DataTable columns={permissionColumns} emptyLabel="No effective permissions available." rows={detail.permissions} searchLabel="Search permissions" title="Effective permissions" />
            <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <ProfileSignal label="Username" value={detail.security.username} />
              <ProfileSignal label="Email" value={detail.security.email} />
              <ProfileSignal label="Account Status" value={<Badge tone={statusTone(detail.security.account_status)}>{detail.security.account_status}</Badge>} />
              <ProfileSignal label="Role" value={detail.security.role ?? "Not set"} />
              <ProfileSignal label="Scope" value={detail.security.scope_type ?? "Not set"} />
              <ProfileSignal label="Last Login" value={formatTime(detail.security.last_login_at)} />
              <ProfileSignal label="Password Last Changed" value={formatTime(detail.security.password_last_changed_at)} />
              <ProfileSignal label="Failed Login Attempts" value={detail.security.failed_login_attempts} />
            </div>
            <div className="rounded-lg border bg-background p-3">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <QrCode aria-hidden="true" className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Mobile QR login</p>
                    <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                      Field officers can scan this code from the Atlas FieldOps mobile app instead of typing credentials. The code never contains the password and becomes invalid after a password reset, account suspension, or profile deactivation.
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge tone={detail.security.mobile_qr_login_enabled ? "success" : "warning"}>
                        {detail.security.mobile_qr_login_enabled ? "Ready for mobile login" : "QR login unavailable"}
                      </Badge>
                      <Badge tone="neutral">Field officer only</Badge>
                    </div>
                  </div>
                </div>
                {detail.security.mobile_qr_login_payload && canManage ? (
                  <Button
                    onClick={() => {
                      void navigator.clipboard?.writeText(detail.security.mobile_qr_login_payload ?? "");
                    }}
                    variant="secondary"
                  >
                    Copy QR payload
                  </Button>
                ) : null}
              </div>
              {detail.security.mobile_qr_login_payload ? (
                <div className="mt-3 flex flex-col gap-3 rounded-lg border bg-muted/20 p-3 md:flex-row md:items-center">
                  {mobileQrCodeUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt={`Mobile QR login for ${officer.full_name}`}
                      className="h-40 w-40 rounded-lg border bg-white p-2"
                      src={mobileQrCodeUrl}
                    />
                  ) : (
                    <div className="flex h-40 w-40 items-center justify-center rounded-lg border bg-panel text-center text-xs text-muted-foreground">
                      QR preview unavailable
                    </div>
                  )}
                  <div className="max-w-xl text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">How to use</p>
                    <p className="mt-1">
                      Open the mobile app, choose <span className="font-semibold text-foreground">Scan QR code</span>, and scan this code. If scanning is not possible, reset the password and share temporary credentials instead.
                    </p>
                  </div>
                </div>
              ) : (
                <p className="mt-3 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning-foreground">
                  {detail.security.mobile_qr_login_enabled
                    ? "QR login is active, but only users with officer management permission can display or copy the scannable code."
                    : "QR login will appear when the officer account, organization membership, and field officer profile are active."}
                </p>
              )}
            </div>
            <div className="rounded-lg border bg-background p-3">
              <p className="text-sm font-semibold">Account, role &amp; access</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Role assignment, permission scope, password resets, and account status are managed from this person&apos;s profile in Users &amp; Teams.
              </p>
              <Button className="mt-3" onClick={() => onNavigate(`/users-teams/role-profiles/${officer.user_id}`)} variant="primary">
                Manage account &amp; access
              </Button>
            </div>
            </div>
          </div>
        ) : null}
        {tab === "audit" ? <DataTable columns={activityColumns} emptyLabel="No audit events for this officer yet." rows={detail.audit_trail} searchLabel="Search audit trail" title="Audit trail" /> : null}
      </div>
    </section>
  );
}

export function FieldOperationsModule({
  principal,
  token,
}: FieldOperationsModuleProps) {
  const router = useRouter();
  const preview = isPreview(token);
  const [activeSection, setActiveSection] =
    useState<FieldOperationsSection>("dashboard");
  const [assignments, setAssignments] =
    useState<FieldAssignment[]>(() => (preview ? previewAssignments : []));
  const [workPlans, setWorkPlans] = useState<WorkPlan[]>(() => (preview ? previewWorkPlans : []));
  const [targets, setTargets] = useState<OperationalTarget[]>(() => (preview ? previewTargets : []));
  const [officerPreviewRows, setOfficerPreviewRows] =
    useState<FieldOfficerRead[]>(() => (preview ? previewOfficers : []));
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [lastInviteCredentials, setLastInviteCredentials] = useState<{ email: string; password: string; organizationCode: string } | null>(null);
  const [selectedOfficerId, setSelectedOfficerId] = useState<string | null>(null);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [activityReportType, setActivityReportType] = useState<OperationalActivityReportType>("monthly_operations");
  const [profileTemporaryPassword, setProfileTemporaryPassword] = useState<string | null>(null);
  const [assignmentDraft, setAssignmentDraft] = useState(
    defaultAssignmentDraft,
  );
  const [assignmentEditingId, setAssignmentEditingId] = useState<string | null>(
    null,
  );
  const [viewAssignment, setViewAssignment] = useState<FieldAssignment | null>(
    null,
  );
  const [assignmentSaving, setAssignmentSaving] = useState(false);
  const [inviteDraft, setInviteDraft] = useState(defaultInviteDraft);
  const [workPlanDraft, setWorkPlanDraft] = useState(defaultWorkPlanDraft);
  const [targetDraft, setTargetDraft] = useState(defaultTargetDraft);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const officerProfileRef = useRef<HTMLDivElement | null>(null);
  const localAssignments = useWorkspaceStore((state) => state.localAssignments);
  const localForms = useWorkspaceStore((state) => state.localForms);
  const localProjects = useWorkspaceStore((state) => state.localProjects);
  const pushToast = useWorkspaceStore((state) => state.pushToast);
  const setActiveView = useWorkspaceStore((state) => state.setActiveView);
  const upsertLocalAssignment = useWorkspaceStore(
    (state) => state.upsertLocalAssignment,
  );
  const enabled = Boolean(token && !preview);
  const hasAnyPermission = (permissions: string[]) =>
    Boolean(principal?.platform_admin || principal?.permissions?.some((permission) => permissions.includes(permission)));
  const canManageFieldOperations =
    preview ||
    Boolean(
      principal?.platform_admin ||
      principal?.permissions?.some((permission) =>
        ["officers.manage", "assignments.manage", "projects.manage", "operations.activities.manage"].includes(
          permission,
        ),
      ),
    );
  const canViewOperationalActivities = preview || hasAnyPermission(["operations.activities.view"]);
  const canApproveOperationalActivities = preview || hasAnyPermission(["operations.activities.approve", "operations.activities.manage"]);
  const canReviewOperationalOutcomes = preview || hasAnyPermission(["operations.activities.review_outcome", "operations.activities.manage"]);
  const canViewOperationalEvidence = preview || hasAnyPermission(["operations.evidence.view", "operations.activities.manage"]);
  const canViewOperationalReports = preview || hasAnyPermission(["operations.reports.view", "operations.activities.manage"]);

  useEffect(() => {
    setActiveSection(initialFieldOperationsSection());
  }, []);

  const officersQuery = useQuery({
    queryKey: ["field-officers", token],
    queryFn: () => listFieldOfficers(token ?? ""),
    enabled,
  });
  const officerProfileQuery = useQuery({
    queryKey: ["field-officer-profile", token, selectedOfficerId],
    queryFn: () => getFieldOfficerProfile(token ?? "", selectedOfficerId ?? ""),
    enabled: enabled && Boolean(selectedOfficerId),
  });
  const summaryQuery = useQuery({
    queryKey: ["operations", "summary", token],
    queryFn: () => getOperationsSummary(token ?? ""),
    enabled,
  });
  const projectsQuery = useQuery({
    queryKey: ["field-operations", "projects", token],
    queryFn: () => listProjects(token ?? ""),
    enabled,
  });
  const formsQuery = useQuery({
    queryKey: ["field-operations", "forms", token],
    queryFn: () => listForms(token ?? ""),
    enabled,
  });
  const workAssignmentsQuery = useQuery({
    queryKey: ["field-operations", "work-assignments", token],
    queryFn: () => listFieldWorkAssignments(token ?? ""),
    enabled,
  });
  const workPlansQuery = useQuery({
    queryKey: ["field-operations", "work-plans", token],
    queryFn: () => listFieldWorkPlans(token ?? ""),
    enabled,
  });
  const targetsQuery = useQuery({
    queryKey: ["field-operations", "targets", token],
    queryFn: () => listOperationalTargets(token ?? ""),
    enabled,
  });
  const indicatorsQuery = useQuery({
    queryKey: ["field-operations", "indicators", token],
    queryFn: () => listIndicators(token ?? ""),
    enabled,
  });
  const entitiesQuery = useQuery({
    queryKey: ["field-operations", "beneficiaries", token],
    queryFn: () => listBeneficiaries(token ?? ""),
    enabled,
  });
  const usersQuery = useQuery({
    queryKey: ["field-operations", "users", token],
    queryFn: () => listUsers(token ?? ""),
    enabled: enabled && canManageFieldOperations,
  });
  const visitRequestsQuery = useQuery({
    queryKey: ["field-operations", "visit-requests", token],
    queryFn: () => listFieldVisitRequests(token ?? ""),
    enabled: enabled && canViewOperationalActivities,
  });
  const activityMediaQuery = useQuery({
    queryKey: ["field-operations", "activity-media", token, selectedActivityId],
    queryFn: () => listActivityMediaEvidence(token ?? "", selectedActivityId ?? ""),
    enabled: enabled && canViewOperationalEvidence && Boolean(selectedActivityId),
  });
  const activityReportQuery = useQuery({
    queryKey: ["field-operations", "activity-report", token, activityReportType],
    queryFn: () => getOperationalActivityReport(token ?? "", activityReportType),
    enabled: enabled && canViewOperationalReports && activeSection === "visit-requests",
  });
  useEffect(() => {
    if (preview) return;
    setAssignments([]);
    setWorkPlans([]);
    setTargets([]);
    setOfficerPreviewRows([]);
  }, [preview]);

  const officers = useMemo(
    () => (preview ? officerPreviewRows : (officersQuery.data ?? [])),
    [officerPreviewRows, officersQuery.data, preview],
  );
  const officersByName = useMemo(() => {
    const map = new Map<string, string>();
    for (const officer of officers) map.set(officer.full_name, officer.user_id);
    return map;
  }, [officers]);
  const selectedPreviewOfficer = preview
    ? officerPreviewRows.find((officer) => officer.id === selectedOfficerId)
    : undefined;
  const previewOfficerProfile = useMemo<FieldOfficerProfileDetailRead | undefined>(() => {
    if (!selectedPreviewOfficer) return undefined;
    return {
      activity: [],
      assignments: [],
      audit_trail: [],
      beneficiaries: [],
      data_quality: { score: 100, issue_count: 0 },
      devices: selectedPreviewOfficer.device_id
        ? [{
            app_version: "Preview",
            device_id: selectedPreviewOfficer.device_id,
            device_name: selectedPreviewOfficer.device_id,
            last_seen_at: selectedPreviewOfficer.last_seen_at,
            last_sync_at: selectedPreviewOfficer.last_sync_at,
            os_version: null,
            platform: "Android",
            status: "Active",
          }]
        : [],
      forms: [],
      locations: selectedPreviewOfficer.home_region ? [selectedPreviewOfficer.home_region] : [],
      metrics: [
        { label: "Projects", value: "0", tone: "neutral" },
        { label: "Assignments", value: "0", tone: "neutral" },
        { label: "Entities", value: "0", tone: "neutral" },
        { label: "Submissions", value: "0", tone: "neutral" },
        { label: "Approval Rate", value: "0%", tone: "neutral" },
        { label: "Data Quality", value: "100%", tone: "success" },
        { label: "Last Sync", value: selectedPreviewOfficer.last_sync_at ?? "Never", tone: "neutral" },
      ],
      officer: selectedPreviewOfficer,
      organization_name: principal?.organization_name ?? "Preview organization",
      performance: { total_submissions: 0, approval_rate: 0, data_quality_score: 100 },
      permissions: [
        { enabled: true, key: "collect_data", label: "Can collect assigned data", source: "Preview role" },
        { enabled: false, key: "export_data", label: "Can export own data", source: "Restricted by governance" },
      ],
      projects: [],
      security: {
        account_status: selectedPreviewOfficer.is_active ? "Active" : "Inactive",
        credential_actions: ["Generate temporary password", "Reset password", "Suspend account"],
        email: selectedPreviewOfficer.email,
        failed_login_attempts: 0,
        geography_id: null,
        last_login_at: selectedPreviewOfficer.last_seen_at,
        mobile_qr_login_enabled: false,
        mobile_qr_login_payload: null,
        password_last_changed_at: null,
        project_id: null,
        role: "field_officer",
        scope_type: "assigned",
        temporary_password_issued: false,
        username: selectedPreviewOfficer.email.split("@")[0],
      },
      status: selectedPreviewOfficer.is_active ? "Active" : "Inactive",
      submissions: [],
      supervisor: null,
      team: selectedPreviewOfficer.home_region ?? "Preview field team",
    };
  }, [principal?.organization_name, selectedPreviewOfficer]);
  const selectedOfficerProfile = preview ? previewOfficerProfile : officerProfileQuery.data;

  const openOfficerProfile = (officerId: string) => {
    setActiveSection("field-officers");
    setSelectedOfficerId(officerId);
    setProfileTemporaryPassword(null);
    window.setTimeout(() => {
      officerProfileRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 0);
  };
  const availableProjects = useMemo(() => {
    const byId = new Map<string, (typeof localProjects)[number]>();
    for (const project of (preview ? localProjects : (projectsQuery.data ?? []))) {
      byId.set(project.id, project);
    }
    return Array.from(byId.values());
  }, [localProjects, preview, projectsQuery.data]);
  const availableForms = useMemo(() => {
    const byId = new Map<string, (typeof localForms)[number]>();
    for (const form of (preview ? localForms : [])) {
      byId.set(form.id, form);
    }
    for (const form of formsQuery.data ?? []) {
      byId.set(form.id, {
        active_assignments: 0,
        created_by: "",
        description: form.description,
        form_type: "Field data collection",
        has_quality_issues: false,
        id: form.id,
        owner: "",
        pending_approval: false,
        project_id: form.project_id,
        project_name:
          availableProjects.find((project) => project.id === form.project_id)?.name ??
          "",
        quality_score: 100,
        questions: 0,
        recently_updated: false,
        sections: 0,
        slug: form.slug,
        status: form.status,
        survey_name: "",
        total_submissions: 0,
        updated_at: new Date().toISOString(),
        version: form.current_version,
        name: form.name,
      });
    }
    return Array.from(byId.values());
  }, [availableProjects, formsQuery.data, localForms, preview]);
  useEffect(() => {
    if (preview || !workPlansQuery.data) return;
    setWorkPlans(
      workPlansQuery.data.map((record) => ({
        id: record.id,
        name: record.name,
        project: record.project ?? "",
        startDate: record.start_date ?? "",
        endDate: record.end_date ?? "",
        objectives: record.objectives ?? "",
        locations: record.locations,
        assignedTeams: record.assigned_teams,
        deliverables: record.deliverables,
        progress: record.progress,
        view: (record.view as WorkPlan["view"]) ?? "Timeline",
      })),
    );
  }, [preview, workPlansQuery.data]);

  useEffect(() => {
    if (preview || !targetsQuery.data) return;
    setTargets(
      targetsQuery.data.map((record) => ({
        id: record.id,
        name: record.name,
        type: (record.target_type as OperationalTarget["type"]) ?? "Project",
        project: record.project ?? "",
        indicator: record.indicator ?? "",
        indicatorId: record.indicator_id,
        team: record.team ?? "",
        assignedStaff: record.assigned_staff,
        value: record.target_value,
        achieved: record.achieved_value,
        achievedSource: record.achieved_source === "indicator" ? "indicator" : "manual",
        deadline: record.deadline ?? "",
      })),
    );
  }, [preview, targetsQuery.data]);

  useEffect(() => {
    if (preview || !workAssignmentsQuery.data) return;
    const users = usersQuery.data ?? [];
    setAssignments(
      workAssignmentsQuery.data.map((record) => ({
        id: record.id,
        name: record.name,
        assignmentType:
          (record.assignment_type as FieldAssignment["assignmentType"]) ?? "Form only",
        project:
          availableProjects.find((project) => project.id === record.project_id)?.name ?? "",
        form: availableForms.find((form) => form.id === record.form_id)?.name ?? "",
        supervisor:
          users.find((user) => user.id === record.supervisor_user_id)?.full_name ?? "",
        fieldOfficers: record.officer_ids.map(
          (officerId) =>
            officers.find((officer) => officer.id === officerId)?.full_name ?? "Officer",
        ),
        location: record.location ?? "",
        startDate: record.start_date ?? "",
        endDate: record.end_date ?? "",
        targetCount: record.target_count,
        completedCount: record.completed_count,
        assignedEntityIds: record.assigned_entity_ids,
        priority: record.priority as Priority,
        status: record.status as AssignmentStatus,
        description: record.description ?? "",
      })),
    );
  }, [availableForms, availableProjects, officers, preview, usersQuery.data, workAssignmentsQuery.data]);

  const availableIndicators = useMemo(
    () => (preview ? [] : (indicatorsQuery.data ?? [])),
    [indicatorsQuery.data, preview],
  );

  const caseEntities = useMemo<BeneficiaryEntity[]>(
    () =>
      preview
        ? previewEntities
        : (entitiesQuery.data ?? []).map(mapBeneficiaryRead),
    [entitiesQuery.data, preview],
  );
  const casesByEntityId = useMemo(
    () => new Map(caseEntities.map((entity) => [entity.entityId, entity])),
    [caseEntities],
  );
  const operationsSummary: OperationsSummary =
    preview ? (summaryQuery.data ?? previewOperationsSummary) : (summaryQuery.data ?? {
      active_programs: 0,
      beneficiaries: 0,
      indicators: 0,
      offline_ready: false,
      open_cases: 0,
      quality_flags: 0,
      sync_health_percent: 0,
    });
  const visitRequests = useMemo(
    () => (preview ? [] : (visitRequestsQuery.data ?? [])),
    [preview, visitRequestsQuery.data],
  );
  const supervisors = useMemo(
    () => (preview ? previewSupervisors : deriveSupervisors(officers, visitRequests)),
    [preview, officers, visitRequests],
  );
  const activities = useMemo(
    () => (preview ? previewActivities : deriveFieldActivities(officers, visitRequests)),
    [preview, officers, visitRequests],
  );
  const selectedActivity = visitRequests.find((activity) => activity.id === selectedActivityId) ?? null;
  const selectedActivityEvidence = activityMediaQuery.data ?? [];
  const activityReport = activityReportQuery.data;
  const supervisorActionVisits = useMemo(
    () =>
      visitRequests
        .filter((activity) =>
          ["pending", "change_requested", "flagged"].includes(activity.status) ||
          ["outside_planned_area", "poor_gps_accuracy", "warning_distance"].includes(activity.verification_status),
        )
        .slice(0, 5),
    [visitRequests],
  );
  const activityAnalytics = useMemo(() => {
    const total = visitRequests.length;
    const pending = visitRequests.filter((activity) => activity.status === "pending").length;
    const approved = visitRequests.filter((activity) => ["approved", "scheduled", "checked_in"].includes(activity.status)).length;
    const completed = visitRequests.filter((activity) => activity.status === "completed").length;
    const rejected = visitRequests.filter((activity) => activity.status === "rejected").length;
    const flagged = visitRequests.filter((activity) => activity.status === "flagged").length;
    const gpsVerified = visitRequests.filter((activity) => activity.verification_status === "verified").length;
    const organizationScoped = visitRequests.filter((activity) => activity.activity_scope === "organization").length;
    const projectScoped = visitRequests.filter((activity) => activity.activity_scope === "project").length;
    const approvalRate = total ? Math.round(((approved + completed) / total) * 100) : 0;
    const byType = Object.entries(
      visitRequests.reduce<Record<string, number>>((acc, activity) => {
        acc[activity.activity_type] = (acc[activity.activity_type] ?? 0) + 1;
        return acc;
      }, {}),
    ).sort((a, b) => b[1] - a[1]);
    const byOfficer = Object.entries(
      visitRequests.reduce<Record<string, number>>((acc, activity) => {
        const officerName = officers.find((officer) => officer.id === activity.field_officer_id)?.full_name ?? "Unassigned officer";
        acc[officerName] = (acc[officerName] ?? 0) + 1;
        return acc;
      }, {}),
    ).sort((a, b) => b[1] - a[1]);
    return {
      approvalRate,
      approved,
      byOfficer,
      byType,
      completed,
      flagged,
      gpsVerified,
      organizationScoped,
      pending,
      projectScoped,
      rejected,
      total,
    };
  }, [officers, visitRequests]);
  const summary = computeFieldOperationsSummary({
    assignments,
    officers,
    operationsSummary,
    supervisors,
    targets,
  });
  const projectOptions = useMemo(
    () =>
      Array.from(
        new Set(
          [
            ...availableProjects.map((project) => project.name),
            ...assignments.map((assignment) => assignment.project),
            ...workPlans.map((plan) => plan.project),
            ...targets.map((target) => target.project),
          ].filter(Boolean),
        ),
      ),
    [assignments, availableProjects, targets, workPlans],
  );
  const formOptions = useMemo(
    () => {
      const selectedProject = availableProjects.find(
        (project) => project.name === assignmentDraft.project,
      );
      return Array.from(
        new Set(
          [
            ...availableForms
              .filter((form) => {
                const isPublished = String(form.status).toLowerCase() === "published";
                const matchesProject =
                  !selectedProject ||
                  form.project_id === selectedProject.id ||
                  form.project_name === selectedProject.name;
                return isPublished && matchesProject;
              })
              .map((form) => form.name),
            ...assignments.map((assignment) => assignment.form),
          ].filter(Boolean),
        ),
      );
    },
    [assignmentDraft.project, assignments, availableForms, availableProjects],
  );

  function projectTeamMembers(
    project: string,
    excludeAssignmentId?: string | null,
  ): Set<string> {
    const names = new Set<string>();
    for (const assignment of assignments) {
      if (assignment.project !== project) continue;
      if (excludeAssignmentId && assignment.id === excludeAssignmentId) continue;
      for (const officer of assignment.fieldOfficers) names.add(officer);
    }
    return names;
  }

  useEffect(() => {
    if (!preview || !localAssignments.length) return;
    setAssignments((current) => [
      ...localAssignments,
      ...current.filter(
        (assignment) =>
          !localAssignments.some(
            (localAssignment) => localAssignment.id === assignment.id,
          ),
      ),
    ]);
  }, [localAssignments, preview]);

  const inviteMutation = useMutation({
    mutationFn: (temporaryPassword: string) =>
      inviteFieldOfficer(token ?? "", { ...inviteDraft, temporary_password: temporaryPassword }),
    onSuccess: async (officer, temporaryPassword) => {
      setOfficerPreviewRows((current) => [officer, ...current]);
      setLastInviteCredentials({
        email: officer.email,
        password: temporaryPassword,
        organizationCode: principal?.organization_slug ?? "",
      });
      setInviteDraft(defaultInviteDraft);
      setModalMode(null);
      await officersQuery.refetch();
      pushToast({
        title: "Field officer invited",
        description: `Share the sign-in credentials with ${officer.full_name}.`,
        tone: "success",
      });
    },
    onError: () =>
      pushToast({
        title: "Invite failed",
        description:
          "Check the email, role permission, and backend availability.",
        tone: "danger",
      }),
  });

  const importMutation = useMutation({
    mutationFn: (file: File) => importFieldOfficers(token ?? "", file),
    onSuccess: async (response) => {
      setOfficerPreviewRows((current) => [...response.officers, ...current]);
      await officersQuery.refetch();
      pushToast({
        title: "Officer import complete",
        description: `${response.created_count} created, ${response.skipped_count} skipped.`,
        tone: response.error_count ? "warning" : "success",
      });
    },
    onError: () =>
      pushToast({
        title: "Officer import failed",
        description: "Use CSV with email and full_name columns.",
        tone: "danger",
      }),
  });

  const resetProfilePasswordMutation = useMutation({
    mutationFn: (userId: string) => resetUserPassword(token ?? "", userId),
    onSuccess: async (response) => {
      setProfileTemporaryPassword(response.temporary_password);
      await officerProfileQuery.refetch();
      pushToast({
        title: "Temporary password generated",
        description: "Share it directly with the field officer. It is shown once.",
        tone: "success",
      });
    },
    onError: () =>
      pushToast({
        title: "Password reset failed",
        description: "Check your permission and try again.",
        tone: "danger",
      }),
  });

  const updateOfficerProfileMutation = useMutation({
    mutationFn: (payload: FieldOfficerProfileUpdate) =>
      updateFieldOfficerProfile(token ?? "", selectedOfficerId ?? "", payload),
    onSuccess: async () => {
      await Promise.all([officerProfileQuery.refetch(), officersQuery.refetch()]);
      pushToast({
        title: "Field officer profile updated",
        description: "Supervisor, status, contact, and location settings are now saved.",
        tone: "success",
      });
    },
    onError: () =>
      pushToast({
        title: "Could not update field officer",
        description: "Check supervisor role, officer management permission, and try again.",
        tone: "danger",
      }),
  });

  const reviewVisitMutation = useMutation({
    mutationFn: ({
      action,
      visitRequestId,
    }: {
      action: "approve" | "reject" | "request_changes";
      visitRequestId: string;
    }) =>
      reviewFieldVisitRequest(token ?? "", visitRequestId, {
        action,
        comment:
          action === "approve"
            ? "Approved for planned field movement."
            : action === "reject"
              ? "Not approved. Review timing, location, or project need."
              : "Please update the visit purpose, timing, or location details.",
      }),
    onSuccess: async () => {
      const result = await visitRequestsQuery.refetch();
      if (selectedActivityId && !result.data?.some((activity) => activity.id === selectedActivityId)) {
        setSelectedActivityId(null);
      }
      pushToast({
        title: "Operational activity updated",
        description: "The field officer will see the updated supervisor decision after mobile sync.",
        tone: "success",
      });
    },
    onError: () =>
      pushToast({
        title: "Visit review failed",
        description: "Check your supervisor permission and try again.",
        tone: "danger",
      }),
  });
  const outcomeReviewMutation = useMutation({
    mutationFn: ({
      action,
      visitRequestId,
    }: {
      action: FieldVisitOutcomeReview["action"];
      visitRequestId: string;
    }) => {
      const guidance: Record<FieldVisitOutcomeReview["action"], { comment: string; quality_score: number; supervisor_instructions: string }> = {
        accept_with_exception: {
          comment: "Activity accepted with a documented exception. Supervisor reviewed the GPS, timing, and evidence.",
          quality_score: 75,
          supervisor_instructions: "Exception accepted. Keep stronger GPS and evidence on the next activity.",
        },
        flag: {
          comment: "Activity flagged for supervisor investigation because evidence, GPS, or timing needs follow-up.",
          quality_score: 35,
          supervisor_instructions: "This activity needs review. Provide clarification or additional evidence.",
        },
        request_correction: {
          comment: "Correction requested. The field officer must update evidence, notes, or activity details before final acceptance.",
          quality_score: 50,
          supervisor_instructions: "Please correct the activity record and sync again.",
        },
        verify: {
          comment: "Activity verified. GPS, timing, and evidence are acceptable for operational reporting.",
          quality_score: 95,
          supervisor_instructions: "Activity verified by supervisor.",
        },
      };
      return reviewOperationalActivityOutcome(token ?? "", visitRequestId, {
        action,
        ...guidance[action],
      });
    },
    onSuccess: async () => {
      await visitRequestsQuery.refetch();
      await activityReportQuery.refetch();
      pushToast({
        title: "Activity outcome recorded",
        description: "The supervisor decision is now part of the activity record and reports.",
        tone: "success",
      });
    },
    onError: () =>
      pushToast({
        title: "Outcome review failed",
        description: "The activity outcome could not be saved. Check the activity status and try again.",
        tone: "danger",
      }),
  });

  const assignmentColumns: TableColumn<FieldAssignment>[] = [
    {
      key: "assignment",
      header: "Assignment",
      value: (assignment) =>
        `${assignment.name} ${assignment.project} ${assignment.form}`,
      render: (assignment) => (
        <div>
          <p className="font-medium">{assignment.name}</p>
      <p className="text-xs text-muted-foreground">
            {assignment.project} · {assignment.form} · {assignment.assignmentType}
          </p>
        </div>
      ),
    },
    {
      key: "entities",
      header: "Entities",
      value: (assignment) => (assignment.assignedEntityIds ?? []).join(" "),
      render: (assignment) =>
        assignment.assignedEntityIds?.length ? (
          <Badge tone="collect">
            {assignment.assignedEntityIds.length} assigned
          </Badge>
        ) : (
          <span className="text-muted-foreground">By location</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      value: (assignment) => assignment.status,
      render: (assignment) => (
        <Badge tone={statusTone(assignment.status)}>{assignment.status}</Badge>
      ),
    },
    {
      key: "supervisor",
      header: "Supervisor",
      value: (assignment) => assignment.supervisor,
      render: (assignment) => assignment.supervisor,
    },
    {
      key: "location",
      header: "Location",
      value: (assignment) => assignment.location,
      render: (assignment) => assignment.location,
    },
    {
      key: "progress",
      header: "Target",
      value: (assignment) =>
        String(
          progressPercent(assignment.completedCount, assignment.targetCount),
        ),
      render: (assignment) => (
        <div>
          <ProgressBar
            value={progressPercent(
              assignment.completedCount,
              assignment.targetCount,
            )}
          />
          <p className="mt-1 text-[11px] tabular-nums text-muted-foreground">
            {assignment.completedCount.toLocaleString()} /{" "}
            {assignment.targetCount.toLocaleString()} collected
          </p>
        </div>
      ),
    },
    {
      key: "priority",
      header: "Priority",
      value: (assignment) => assignment.priority,
      render: (assignment) => (
        <Badge tone={priorityTone(assignment.priority)}>
          {assignment.priority}
        </Badge>
      ),
    },
    {
      key: "deadline",
      header: "Deadline",
      value: (assignment) => assignment.endDate,
      render: (assignment) => formatDate(assignment.endDate),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (assignment) => (
        <div className="flex justify-end gap-2">
          <Button
            disabled={!canManageFieldOperations}
            onClick={() => {
              setViewAssignment(assignment);
              setModalMode("assignment-view");
            }}
            size="sm"
            variant="secondary"
          >
            View
          </Button>
          <Button
            disabled={!canManageFieldOperations}
            onClick={() => openAssignmentModal(assignment)}
            size="sm"
            variant="primary"
          >
            Edit assignment
          </Button>
          <ActionMenu
            items={assignmentStatusActions(assignment)}
            label={`Status actions for ${assignment.name}`}
          />
        </div>
      ),
    },
  ];

  const officerColumns: TableColumn<FieldOfficerRead>[] = [
    {
      key: "officer",
      header: "Officer",
      value: (officer) =>
        `${officer.full_name} ${officer.email} ${officer.employee_code ?? ""}`,
      render: (officer) => (
        <div>
          <p className="font-medium">
            <UserProfileLink userId={officer.user_id}>{officer.full_name}</UserProfileLink>
          </p>
          <p className="text-xs text-muted-foreground">{officer.email}</p>
        </div>
      ),
    },
    {
      key: "region",
      header: "Location",
      value: (officer) => officer.home_region ?? "",
      render: (officer) => officer.home_region ?? "Unassigned",
    },
    {
      key: "sync",
      header: "Last Sync",
      value: (officer) => officer.last_sync_at ?? "",
      render: (officer) => (
        <div>
          <p className="font-medium">{formatTime(officer.last_sync_at)}</p>
          <p className="text-xs text-muted-foreground">
            {officer.device_id ?? "No device paired"}
          </p>
        </div>
      ),
    },
    {
      key: "gps",
      header: "GPS",
      value: (officer) =>
        `${officer.last_latitude ?? ""},${officer.last_longitude ?? ""}`,
      render: (officer) =>
        officer.last_latitude && officer.last_longitude ? (
          <span className="font-mono text-xs">
            {officer.last_latitude.toFixed(4)},{" "}
            {officer.last_longitude.toFixed(4)}
          </span>
        ) : (
          <span className="text-muted-foreground">Unavailable</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      value: (officer) => (officer.is_active ? "Active" : "Inactive"),
      render: (officer) => (
        <Badge tone={officer.is_active ? "success" : "danger"}>
          {officer.is_active ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      value: (officer) => officer.id,
      render: (officer) => (
        <Button
          onClick={() => openOfficerProfile(officer.id)}
          size="sm"
          variant="secondary"
        >
          View profile
        </Button>
      ),
    },
  ];

  const supervisorColumns: TableColumn<SupervisorProfile>[] = [
    {
      key: "supervisor",
      header: "Supervisor",
      value: (supervisor) => `${supervisor.name} ${supervisor.team}`,
      render: (supervisor) => (
        <div>
          <p className="font-medium">{supervisor.name}</p>
          <p className="text-xs text-muted-foreground">{supervisor.team}</p>
        </div>
      ),
    },
    {
      key: "locations",
      header: "Locations",
      value: (supervisor) => supervisor.assignedLocations.join(" "),
      render: (supervisor) => supervisor.assignedLocations.join(", "),
    },
    {
      key: "officers",
      header: "Officers",
      value: (supervisor) => String(supervisor.managedOfficers),
      render: (supervisor) => supervisor.managedOfficers,
    },
    {
      key: "completion",
      header: "Completion",
      value: (supervisor) => String(supervisor.teamCompletionRate),
      render: (supervisor) => (
        <ProgressBar value={supervisor.teamCompletionRate} />
      ),
    },
    {
      key: "quality",
      header: "Quality",
      value: (supervisor) => String(supervisor.teamDataQualityScore),
      render: (supervisor) => `${supervisor.teamDataQualityScore}%`,
    },
    {
      key: "sla",
      header: "Review SLA",
      value: (supervisor) => String(supervisor.reviewSlaHours),
      render: (supervisor) => `${supervisor.reviewSlaHours}h`,
    },
  ];

  const workPlanColumns: TableColumn<WorkPlan>[] = [
    {
      key: "plan",
      header: "Work Plan",
      value: (plan) => `${plan.name} ${plan.project}`,
      render: (plan) => (
        <div>
          <p className="font-medium">{plan.name}</p>
          <p className="text-xs text-muted-foreground">{plan.project}</p>
        </div>
      ),
    },
    {
      key: "dates",
      header: "Period",
      value: (plan) => `${plan.startDate} ${plan.endDate}`,
      render: (plan) =>
        `${formatDate(plan.startDate)} - ${formatDate(plan.endDate)}`,
    },
    {
      key: "teams",
      header: "Teams",
      value: (plan) => plan.assignedTeams.join(" "),
      render: (plan) => plan.assignedTeams.join(", "),
    },
    {
      key: "locations",
      header: "Locations",
      value: (plan) => plan.locations.join(" "),
      render: (plan) => plan.locations.join(", "),
    },
    {
      key: "progress",
      header: "Progress",
      value: (plan) => String(plan.progress),
      render: (plan) => <ProgressBar value={plan.progress} />,
    },
    {
      key: "view",
      header: "View",
      value: (plan) => plan.view,
      render: (plan) => <Badge tone="accent">{plan.view}</Badge>,
    },
  ];

  const targetColumns: TableColumn<OperationalTarget>[] = [
    {
      key: "target",
      header: "Target",
      value: (target) => `${target.name} ${target.indicator}`,
      render: (target) => (
        <div>
          <p className="font-medium">{target.name}</p>
          <p className="text-xs text-muted-foreground">{target.indicator}</p>
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      value: (target) => target.type,
      render: (target) => <Badge tone="neutral">{target.type}</Badge>,
    },
    {
      key: "team",
      header: "Team",
      value: (target) => target.team,
      render: (target) => target.team,
    },
    {
      key: "progress",
      header: "Achievement",
      value: (target) => String(progressPercent(target.achieved, target.value)),
      render: (target) => (
        <ProgressBar value={progressPercent(target.achieved, target.value)} />
      ),
    },
    {
      key: "deadline",
      header: "Deadline",
      value: (target) => target.deadline,
      render: (target) => formatDate(target.deadline),
    },
    {
      key: "record",
      header: "Record progress",
      align: "right",
      render: (target) =>
        target.achievedSource === "indicator" ? (
          <div className="flex justify-end">
            <Badge tone="success">Auto from indicator</Badge>
          </div>
        ) : (
          <TargetProgressEditor
            disabled={!canManageFieldOperations}
            onSave={(value) => void recordTargetProgress(target, value)}
            target={target}
          />
        ),
    },
  ];

  const activityColumns: TableColumn<FieldActivity>[] = [
    {
      key: "activity",
      header: "Activity",
      value: (activity) => `${activity.actor} ${activity.activityType}`,
      render: (activity) => (
        <div>
          <p className="font-medium">{activity.activityType}</p>
          <p className="text-xs text-muted-foreground">
            {activity.actor} · {activity.assignment}
          </p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      value: (activity) => activity.status,
      render: (activity) => (
        <Badge tone={statusTone(activity.status)}>{activity.status}</Badge>
      ),
    },
    {
      key: "location",
      header: "Location",
      value: (activity) => activity.location,
      render: (activity) => activity.location,
    },
    {
      key: "time",
      header: "Time",
      value: (activity) => activity.timestamp,
      render: (activity) => formatTime(activity.timestamp),
    },
  ];

  const visitRequestColumns: TableColumn<FieldVisitRequestRead>[] = [
    {
      key: "visit",
      header: "Activity",
      value: (visit) => `${visit.title} ${visit.location_name} ${visit.activity_type} ${visit.activity_scope} ${visit.purpose ?? ""}`,
      render: (visit) => {
        const officer = officers.find((candidate) => candidate.id === visit.field_officer_id);
        return (
          <div>
            <p className="font-medium">{visit.title}</p>
            <p className="text-xs text-muted-foreground">
              {officer?.full_name ?? "Field officer"} · {visit.activity_type.replaceAll("_", " ")} · {visit.activity_scope}
            </p>
          </div>
        );
      },
    },
    {
      key: "scope",
      header: "Scope",
      value: (visit) => visit.activity_scope,
      render: (visit) => (
        <div>
          <Badge tone={visit.activity_scope === "organization" ? "accent" : "neutral"}>
            {visit.activity_scope}
          </Badge>
          <p className="mt-1 text-xs text-muted-foreground">{visit.location_name}</p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      value: (visit) => visit.status,
      render: (visit) => <Badge tone={visit.status === "approved" || visit.status === "completed" ? "success" : visit.status === "flagged" || visit.status === "rejected" ? "danger" : "warning"}>{visit.status.replaceAll("_", " ")}</Badge>,
    },
    {
      key: "time",
      header: "Requested time",
      value: (visit) => `${visit.requested_start_at} ${visit.requested_end_at}`,
      render: (visit) => (
        <div>
          <p className="font-medium">{formatDate(visit.requested_start_at)}</p>
          <p className="text-xs text-muted-foreground">
            {formatTime(visit.requested_start_at)} - {formatTime(visit.requested_end_at)}
          </p>
        </div>
      ),
    },
    {
      key: "verification",
      header: "GPS evidence",
      value: (visit) => `${visit.verification_status} ${visit.distance_from_planned_meters ?? ""}`,
      render: (visit) => (
        <div>
          <Badge tone={visit.verification_status === "verified" ? "success" : visit.verification_status === "not_checked_in" ? "neutral" : visit.verification_status === "outside_planned_area" || visit.verification_status === "poor_gps_accuracy" ? "danger" : "warning"}>
            {visit.verification_status.replaceAll("_", " ")}
          </Badge>
          <p className="mt-1 text-xs text-muted-foreground">
            {visit.distance_from_planned_meters === null
              ? "No check-in distance yet"
              : `${Math.round(visit.distance_from_planned_meters)}m from planned point`}
          </p>
          {visit.verification_status === "outside_planned_area" || visit.verification_status === "poor_gps_accuracy" ? (
            <p className="mt-1 text-xs font-medium text-danger">Supervisor review needed</p>
          ) : null}
        </div>
      ),
    },
    {
      key: "priority",
      header: "Priority",
      value: (visit) => visit.priority,
      render: (visit) => <Badge tone={visit.priority === "urgent" || visit.priority === "high" ? "warning" : "neutral"}>{visit.priority}</Badge>,
    },
    {
      key: "actions",
      header: "Supervisor action",
      align: "right",
      value: (visit) => visit.id,
      render: (visit) => {
        const reviewDisabled = !canApproveOperationalActivities || reviewVisitMutation.isPending || !["pending", "change_requested"].includes(visit.status);
        return (
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              onClick={() => setSelectedActivityId(visit.id)}
              size="sm"
              variant="secondary"
            >
              View details
            </Button>
            <ActionMenu
              label={`Review actions for ${visit.id}`}
              items={[
                {
                  key: "approve",
                  label: "Approve",
                  disabled: reviewDisabled,
                  onSelect: () => reviewVisitMutation.mutate({ action: "approve", visitRequestId: visit.id }),
                },
                {
                  key: "request-changes",
                  label: "Request changes",
                  disabled: reviewDisabled,
                  onSelect: () => reviewVisitMutation.mutate({ action: "request_changes", visitRequestId: visit.id }),
                },
                {
                  key: "reject",
                  label: "Reject",
                  tone: "danger",
                  disabled: reviewDisabled,
                  onSelect: () => reviewVisitMutation.mutate({ action: "reject", visitRequestId: visit.id }),
                },
              ]}
            />
          </div>
        );
      },
    },
  ];

  async function submitAssignment(): Promise<void> {
    if (!assignmentDraft.project || !assignmentDraft.form) {
      pushToast({
        title: "Project and form required",
        description:
          "Create or select a project and form before assigning field work.",
        tone: "warning",
      });
      return;
    }
    const selectedProject = availableProjects.find(
      (project) => project.name === assignmentDraft.project,
    );
    const selectedForm = availableForms.find(
      (form) =>
        form.name === assignmentDraft.form &&
        (!selectedProject ||
          form.project_id === selectedProject.id ||
          form.project_name === selectedProject.name),
    );
    const selectedOfficers = officers.filter((officer) =>
      assignmentDraft.fieldOfficers.includes(officer.full_name),
    );
    if (!preview && (!selectedProject || !selectedForm || !selectedOfficers.length)) {
      pushToast({
        title: "Select saved records",
        description:
          "Mobile assignments must use a saved project, published form, and at least one active field officer.",
        tone: "warning",
      });
      return;
    }
    setAssignmentSaving(true);
    let assignmentId = `assignment-${Date.now()}`;
    try {
      if (!preview && token && selectedProject && selectedForm) {
        const supervisorUser = (usersQuery.data ?? []).find(
          (user) => user.full_name === assignmentDraft.supervisor,
        );
        const workPayload = {
          form_id: selectedForm.id,
          supervisor_user_id: supervisorUser?.id ?? null,
          name: assignmentDraft.name,
          description: assignmentDraft.description || null,
          assignment_type: assignmentDraft.assignmentType,
          officer_ids: selectedOfficers.map((officer) => officer.id),
          assigned_entity_ids: assignmentDraft.assignedEntityIds ?? [],
          location: assignmentDraft.location || null,
          start_date: assignmentDraft.startDate || null,
          end_date: assignmentDraft.endDate || null,
          target_count: assignmentDraft.targetCount,
          priority: assignmentDraft.priority,
        };
        const isBackendEdit = Boolean(
          assignmentEditingId && !assignmentEditingId.startsWith("assignment-"),
        );
        const savedWorkAssignment = isBackendEdit
          ? await updateFieldWorkAssignment(token, assignmentEditingId as string, workPayload)
          : await createFieldWorkAssignment(token, {
              project_id: selectedProject.id,
              ...workPayload,
            });
        assignmentId = savedWorkAssignment.id;
        await Promise.all(
          selectedOfficers.map((officer) =>
            createFieldOfficerAssignment(token, {
              officer_id: officer.id,
              project_id: selectedProject.id,
              form_id: selectedForm.id,
              region: assignmentDraft.location || null,
              is_active: true,
            }),
          ),
        );
        void workAssignmentsQuery.refetch();
      }
    } catch (error) {
      pushToast({
        title: "Assignment could not be saved",
        description:
          error instanceof Error
            ? error.message
            : "Publish the form and check your assignment permissions.",
        tone: "danger",
      });
      setAssignmentSaving(false);
      return;
    }
    const editingAssignment = assignmentEditingId
      ? assignments.find((assignment) => assignment.id === assignmentEditingId)
      : null;
    const nextAssignment: FieldAssignment = {
      ...assignmentDraft,
      completedCount: editingAssignment?.completedCount ?? 0,
      fieldOfficers: assignmentDraft.fieldOfficers.length
        ? assignmentDraft.fieldOfficers
        : ["Unassigned"],
      id: assignmentEditingId ?? assignmentId,
      status: editingAssignment?.status ?? "Assigned",
    };
    setAssignments((current) => [
      nextAssignment,
      ...current.filter((assignment) => assignment.id !== nextAssignment.id),
    ]);
    upsertLocalAssignment(nextAssignment);
    setAssignmentDraft(defaultAssignmentDraft);
    setAssignmentEditingId(null);
    setModalMode(null);
    pushToast({
      title: assignmentEditingId ? "Assignment updated" : "Assignment created",
      description:
        "Selected field officers will receive the published form on the next mobile sync.",
      tone: "success",
    });
    setAssignmentSaving(false);
  }

  async function updateAssignmentStatus(
    assignment: FieldAssignment,
    status: AssignmentStatus,
  ): Promise<void> {
    const isBackendRecord =
      !preview && Boolean(token) && !assignment.id.startsWith("assignment-");
    if (isBackendRecord) {
      try {
        await setFieldWorkAssignmentStatus(token as string, assignment.id, status);
        void workAssignmentsQuery.refetch();
      } catch (error) {
        pushToast({
          title: "Status change failed",
          description:
            error instanceof Error
              ? error.message
              : "The assignment status could not be updated. Try again.",
          tone: "danger",
        });
        return;
      }
    }
    const next = { ...assignment, status };
    setAssignments((current) =>
      current.map((item) => (item.id === assignment.id ? next : item)),
    );
    upsertLocalAssignment(next);
    pushToast({
      title: `Assignment ${status.toLowerCase()}`,
      description: `"${assignment.name}" is now ${status.toLowerCase()}. Field officers see the change on their next sync.`,
      tone: status === "Cancelled" ? "warning" : "success",
    });
  }

  function assignmentStatusActions(assignment: FieldAssignment): ActionMenuItem[] {
    const transitions: { label: string; status: AssignmentStatus; tone?: "danger" }[] = [];
    if (assignment.status === "Assigned" || assignment.status === "Draft") {
      transitions.push({ label: "Start collection", status: "In Progress" });
    }
    if (["Assigned", "In Progress", "Overdue"].includes(assignment.status)) {
      transitions.push({ label: "Mark completed", status: "Completed" });
      transitions.push({ label: "Cancel assignment", status: "Cancelled", tone: "danger" });
    }
    if (assignment.status === "Completed" || assignment.status === "Cancelled") {
      transitions.push({ label: "Reopen", status: "In Progress" });
    }
    return transitions.map((transition) => ({
      disabled: !canManageFieldOperations,
      key: transition.status + transition.label,
      label: transition.label,
      onSelect: () => void updateAssignmentStatus(assignment, transition.status),
      tone: transition.tone,
    }));
  }

  function openAssignmentModal(assignment?: FieldAssignment): void {
    if (assignment) {
      setAssignmentEditingId(assignment.id);
      setAssignmentDraft(assignment);
      setModalMode("assignment");
      return;
    }
    const latestForm = availableForms.find(
      (form) => String(form.status).toLowerCase() === "published",
    );
    const latestProject = latestForm
      ? availableProjects.find(
          (project) =>
            project.id === latestForm.project_id ||
            project.name === latestForm.project_name,
        )
      : availableProjects[0];
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    setAssignmentDraft({
      ...defaultAssignmentDraft,
      endDate: nextWeek.toISOString().slice(0, 10),
      form: latestForm?.name ?? formOptions[0] ?? "",
      location: latestProject?.region ?? latestProject?.country ?? "",
      name: latestForm ? `${latestForm.name} field collection` : "",
      project:
        latestForm?.project_name ??
        latestProject?.name ??
        projectOptions[0] ??
        "",
      startDate: today.toISOString().slice(0, 10),
      supervisor: supervisors[0]?.name ?? "",
      targetCount: 100,
    });
    setAssignmentEditingId(null);
    setModalMode("assignment");
  }

  async function submitWorkPlan(): Promise<void> {
    if (!preview && token) {
      try {
        await createFieldWorkPlan(token, {
          name: workPlanDraft.name,
          project: workPlanDraft.project || null,
          objectives: workPlanDraft.objectives || null,
          locations: workPlanDraft.locations,
          assigned_teams: workPlanDraft.assignedTeams,
          deliverables: workPlanDraft.deliverables,
          start_date: workPlanDraft.startDate || null,
          end_date: workPlanDraft.endDate || null,
          view: "Timeline",
        });
        void workPlansQuery.refetch();
      } catch (error) {
        pushToast({
          title: "Work plan could not be saved",
          description: error instanceof Error ? error.message : "Try again.",
          tone: "danger",
        });
        return;
      }
    } else {
      setWorkPlans((current) => [
        {
          ...workPlanDraft,
          id: `workplan-${Date.now()}`,
          progress: 0,
          view: "Timeline",
        },
        ...current,
      ]);
    }
    setWorkPlanDraft(defaultWorkPlanDraft);
    setModalMode(null);
    pushToast({
      title: "Work plan created",
      description:
        "Teams can now use this plan to coordinate field activities.",
      tone: "success",
    });
  }

  async function submitTarget(): Promise<void> {
    if (!preview && token) {
      try {
        await createOperationalTarget(token, {
          name: targetDraft.name,
          target_type: targetDraft.type,
          project: targetDraft.project || null,
          indicator: targetDraft.indicator || null,
          indicator_id: targetDraft.indicatorId || null,
          team: targetDraft.team || null,
          assigned_staff: targetDraft.assignedStaff,
          target_value: targetDraft.value,
          deadline: targetDraft.deadline || null,
        });
        void targetsQuery.refetch();
      } catch (error) {
        pushToast({
          title: "Target could not be saved",
          description: error instanceof Error ? error.message : "Try again.",
          tone: "danger",
        });
        return;
      }
    } else {
      setTargets((current) => [
        { ...targetDraft, achieved: 0, id: `target-${Date.now()}` },
        ...current,
      ]);
    }
    setTargetDraft(defaultTargetDraft);
    setModalMode(null);
    pushToast({
      title: "Target created",
      description:
        "Progress will appear in Field Operations and monitoring views.",
      tone: "success",
    });
  }

  async function recordTargetProgress(
    target: OperationalTarget,
    achieved: number,
  ): Promise<void> {
    if (!preview && token && !target.id.startsWith("target-")) {
      try {
        await updateOperationalTarget(token, target.id, { achieved_value: achieved });
        void targetsQuery.refetch();
      } catch (error) {
        pushToast({
          title: "Progress could not be saved",
          description: error instanceof Error ? error.message : "Try again.",
          tone: "danger",
        });
        return;
      }
    }
    setTargets((current) =>
      current.map((item) =>
        item.id === target.id ? { ...item, achieved } : item,
      ),
    );
    pushToast({
      title: "Target progress recorded",
      description: `"${target.name}" is now at ${achieved.toLocaleString()} of ${target.value.toLocaleString()}.`,
      tone: "success",
    });
  }

  return (
    <section className="space-y-3">
      <div className="rounded-xl border bg-panel p-3.5 shadow-line">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="collect">OPERATIONS</Badge>
              <Badge tone={summary.overdueAssignments ? "warning" : "success"}>
                {summary.overdueAssignments
                  ? `${summary.overdueAssignments} overdue`
                  : "Field work on track"}
              </Badge>
              {preview ? <Badge tone="neutral">Preview data</Badge> : null}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">
                Field Operations
              </h1>
              <HelpHint label="About Field Operations" title="Field Operations">
                Coordinate assignments, field officers, supervisors, work plans,
                targets, and live monitoring so managers know what is happening
                in the field today.
              </HelpHint>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={!canManageFieldOperations}
              onClick={() => openAssignmentModal()}
              variant="primary"
            >
              <Plus aria-hidden="true" />
              Create assignment
            </Button>
            <Button onClick={() => setActiveView("map")} variant="secondary">
              <MapPinned aria-hidden="true" />
              Open mapping
            </Button>
            <Button
              onClick={() =>
                downloadCsv(
                  "atlas-field-assignments.csv",
                  assignments.map((assignment) => ({
                    assignment: assignment.name,
                    project: assignment.project,
                    form: assignment.form,
                    supervisor: assignment.supervisor,
                    location: assignment.location,
                    status: assignment.status,
                    progress: progressPercent(
                      assignment.completedCount,
                      assignment.targetCount,
                    ),
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
        <div className="mt-3 flex gap-1.5 overflow-x-auto product-scrollbar">
          {fieldOperationsSections.map((section) => (
            <button
              className={cn(
                "shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium transition",
                activeSection === section.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-panel hover:bg-muted",
              )}
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              type="button"
            >
              {section.label}
            </button>
          ))}
        </div>
      </div>

      {activeSection === "dashboard" ? (
        <>
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Field Force</p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <MetricCard
                  icon={<UsersRound aria-hidden="true" />}
                  label="Assigned Field Officers"
                  onClick={() => setActiveSection("field-officers")}
                  tone="success"
                  value={summary.assignedFieldOfficers}
                />
                <MetricCard
                  icon={<ShieldCheck aria-hidden="true" />}
                  label="Active Supervisors"
                  onClick={() => setActiveSection("supervisors")}
                  tone="success"
                  value={summary.activeSupervisors}
                />
                <MetricCard
                  icon={<Route aria-hidden="true" />}
                  label="Team Productivity"
                  onClick={() => setActiveSection("field-officers")}
                  tone="success"
                  value={`${summary.teamProductivity}%`}
                />
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Assignments &amp; Targets</p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard
                  icon={<ClipboardList aria-hidden="true" />}
                  label="Active Assignments"
                  onClick={() => setActiveSection("assignments")}
                  tone="success"
                  value={summary.activeAssignments}
                />
                <MetricCard
                  icon={<Target aria-hidden="true" />}
                  label="Assignment Completion"
                  onClick={() => setActiveSection("assignments")}
                  tone="warning"
                  value={`${summary.assignmentCompletionRate}%`}
                />
                <MetricCard
                  icon={<AlertTriangle aria-hidden="true" />}
                  label="Overdue Assignments"
                  onClick={() => setActiveSection("assignments")}
                  tone={summary.overdueAssignments ? "danger" : "success"}
                  value={summary.overdueAssignments}
                />
                <MetricCard
                  icon={<CalendarDays aria-hidden="true" />}
                  label="Upcoming Deadlines"
                  onClick={() => setActiveSection("work-plans")}
                  tone={summary.upcomingDeadlines ? "warning" : "success"}
                  value={summary.upcomingDeadlines}
                />
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Coverage &amp; Activity</p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard
                  icon={<CalendarDays aria-hidden="true" />}
                  label="Operational Activities"
                  onClick={() => setActiveSection("visit-requests")}
                  tone={visitRequests.filter((visit) => visit.status === "pending").length ? "warning" : "success"}
                  value={visitRequests.length}
                />
                <MetricCard
                  icon={<MapPinned aria-hidden="true" />}
                  label="Coverage Progress"
                  onClick={() => setActiveSection("field-monitoring")}
                  tone={summary.coverageProgress >= 70 ? "success" : "warning"}
                  value={`${summary.coverageProgress}%`}
                />
                <MetricCard
                  icon={<RadioTower aria-hidden="true" />}
                  label="Daily Collection Progress"
                  onClick={() => setActiveSection("field-monitoring")}
                  tone="success"
                  value={`${summary.dailyCollectionProgress}%`}
                />
                <MetricCard
                  icon={<AlertTriangle aria-hidden="true" />}
                  label="Quality Alerts"
                  onClick={() => router.push("/data-quality")}
                  tone={operationsSummary.quality_flags ? "warning" : "success"}
                  value={operationsSummary.quality_flags}
                />
              </div>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <SectionPanel
              description="Assignment progress, overdue work, and field workload in one operational view."
              title="Assignment status"
            >
              <div className="space-y-4">
                {assignments.slice(0, 3).map((assignment) => (
                  <div
                    className="rounded-xl border bg-muted/20 p-3"
                    key={assignment.id}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-medium">{assignment.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {assignment.location} · {assignment.supervisor}
                        </p>
                      </div>
                      <Badge tone={statusTone(assignment.status)}>
                        {assignment.status}
                      </Badge>
                    </div>
                    <div className="mt-3">
                      <ProgressBar
                        value={progressPercent(
                          assignment.completedCount,
                          assignment.targetCount,
                        )}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </SectionPanel>
            <SectionPanel
              description="Field Operations consumes map services for assigned areas and coverage previews. GIS analysis remains in Mapping."
              title="Geographic coverage snapshot"
            >
              <div className="rounded-2xl border bg-[linear-gradient(135deg,hsl(var(--primary)/0.14),hsl(var(--muted)))] p-5">
                <div className="flex items-center gap-3">
                  <MapPinned aria-hidden="true" className="text-primary" />
                  <div>
                    <p className="font-medium">
                      {summary.coverageProgress}% coverage achieved
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {
                        officers.filter(
                          (officer) =>
                            officer.last_latitude && officer.last_longitude,
                        ).length
                      }{" "}
                      officers have recent GPS evidence.
                    </p>
                  </div>
                </div>
                <Button
                  className="mt-5"
                  onClick={() => setActiveView("map")}
                  variant="secondary"
                >
                  <MapPinned aria-hidden="true" />
                  Open Mapping
                </Button>
              </div>
            </SectionPanel>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <DataTable
              columns={activityColumns}
              emptyLabel="No field activity yet."
              rows={activities}
              searchLabel="Search activity"
              title="Activity timeline"
            />
            <DataTable
              columns={supervisorColumns}
              emptyLabel="No supervisors assigned."
              rows={supervisors}
              searchLabel="Search supervisors"
              title="Performance rankings"
            />
          </div>
        </>
      ) : null}

      {activeSection === "assignments" ? (
        <div className="space-y-4">
          <SectionHeader
            action={
              <Button
                disabled={!assignments.length}
                onClick={() =>
                  downloadCsv(
                    "atlas-field-assignments.csv",
                    assignments.map((assignment) => ({
                      name: assignment.name,
                      project: assignment.project,
                      form: assignment.form,
                      status: assignment.status,
                      priority: assignment.priority,
                      field_officers: assignment.fieldOfficers.join("; "),
                      supervisor: assignment.supervisor,
                      location: assignment.location,
                      start_date: assignment.startDate,
                      end_date: assignment.endDate,
                      target: assignment.targetCount,
                      completed: assignment.completedCount,
                    })),
                  )
                }
                size="sm"
                variant="secondary"
              >
                Export view
              </Button>
            }
            description={fieldOperationsSections.find((section) => section.id === "assignments")?.description ?? ""}
            title="Assignments management"
          />
          <DataTable
            columns={assignmentColumns}
            emptyAction={
              canManageFieldOperations
                ? { label: "Create assignment", onClick: () => openAssignmentModal() }
                : undefined
            }
            emptyDescription="Assignments connect a published form, field officers, and a location so teams know exactly what to collect."
            emptyLabel="No assignments yet. Create one to start coordinating field work."
            rows={assignments}
            searchLabel="Search assignments"
            title="Assignments management"
          />
        </div>
      ) : null}

      {activeSection === "field-officers" ? (
        <div className="space-y-4">
          <SectionHeader
            action={
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={!canManageFieldOperations}
                  onClick={() => setModalMode("invite")}
                  variant="primary"
                >
                  <UserPlus aria-hidden="true" />
                  Invite officer
                </Button>
                <Button
                  disabled={!token || preview || importMutation.isPending}
                  onClick={() => fileInputRef.current?.click()}
                  variant="secondary"
                >
                  <UploadCloud aria-hidden="true" />
                  {importMutation.isPending ? "Importing" : "Import CSV"}
                </Button>
                <Button
                  disabled={officersQuery.isFetching}
                  onClick={() => officersQuery.refetch()}
                  variant="secondary"
                >
                  <RefreshCw aria-hidden="true" />
                  Refresh status
                </Button>
                <input
                  accept=".csv"
                  className="sr-only"
                  disabled={!token || preview || importMutation.isPending}
                  onChange={(event) => {
                    const file = event.currentTarget.files?.[0];
                    if (file) importMutation.mutate(file);
                    event.currentTarget.value = "";
                  }}
                  ref={fileInputRef}
                  type="file"
                />
              </div>
            }
            description={fieldOperationsSections.find((section) => section.id === "field-officers")?.description ?? ""}
            title="Field officer roster"
          />
          <div ref={officerProfileRef}>
            {selectedOfficerId ? (
              officerProfileQuery.isError && !preview ? (
                <section className="rounded-xl border border-danger/30 bg-danger/5 p-4 shadow-line">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h2 className="text-lg font-semibold">Field officer profile could not open</h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {officerProfileQuery.error instanceof Error
                          ? officerProfileQuery.error.message
                          : "The profile request failed. Refresh the roster and try again."}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={() => officerProfileQuery.refetch()} variant="secondary">
                        <RefreshCw aria-hidden="true" />
                        Retry
                      </Button>
                      <Button
                        onClick={() => {
                          setSelectedOfficerId(null);
                          setProfileTemporaryPassword(null);
                        }}
                        variant="ghost"
                      >
                        Close
                      </Button>
                    </div>
                  </div>
                </section>
              ) : (
                <OfficerProfileWorkspace
                  canManage={canManageFieldOperations}
                  detail={selectedOfficerProfile}
                  loading={officerProfileQuery.isFetching}
                  onClose={() => {
                    setSelectedOfficerId(null);
                    setProfileTemporaryPassword(null);
                  }}
                  onNavigate={(route) => router.push(route)}
                  onUpdateProfile={(payload) => {
                    if (preview) {
                      pushToast({
                        title: "Preview profile updated",
                        description: "Connect to the backend to save field officer supervisor changes.",
                        tone: "success",
                      });
                      return;
                    }
                    updateOfficerProfileMutation.mutate(payload);
                  }}
                  onResetPassword={() => {
                    if (preview && selectedPreviewOfficer) {
                      const password = generateTemporaryPassword();
                      setProfileTemporaryPassword(password);
                      pushToast({
                        title: "Temporary password generated",
                        description: "Preview credential generated locally.",
                        tone: "success",
                      });
                      return;
                    }
                    if (selectedOfficerProfile?.officer.user_id) {
                      resetProfilePasswordMutation.mutate(selectedOfficerProfile.officer.user_id);
                    }
                  }}
                  profileUpdatePending={updateOfficerProfileMutation.isPending}
                  resetPending={resetProfilePasswordMutation.isPending}
                  temporaryPassword={profileTemporaryPassword}
                  users={usersQuery.data ?? []}
                />
              )
            ) : null}
          </div>
          {lastInviteCredentials ? (
            <div className="rounded-lg border border-success/30 bg-success/10 p-4" aria-live="polite">
              <p className="text-sm font-semibold">Field officer invited — share these sign-in details</p>
              <pre className="mt-2 whitespace-pre-wrap rounded bg-background p-3 text-xs leading-6 text-foreground font-mono">
{`Organization code: ${lastInviteCredentials.organizationCode}
Email:             ${lastInviteCredentials.email}
Password:          ${lastInviteCredentials.password}`}
              </pre>
              <p className="mt-2 text-xs text-muted-foreground">
                The field officer enters these details in the Atlas FieldOps mobile app. Share them directly — this password cannot be retrieved again.
              </p>
              <button
                className="mt-2 text-xs font-medium text-muted-foreground underline"
                onClick={() => setLastInviteCredentials(null)}
                type="button"
              >
                Dismiss
              </button>
            </div>
          ) : null}
          <DataTable
            columns={officerColumns}
            emptyLabel="No field officers yet. Invite one officer or import a CSV roster."
            rows={officers}
            searchLabel="Search field officers"
            title="Field officer roster"
          />
        </div>
      ) : null}

      {activeSection === "supervisors" ? (
        <div className="space-y-4">
          <SectionHeader
            description={fieldOperationsSections.find((section) => section.id === "supervisors")?.description ?? ""}
            title="Supervisor management"
          />
          <DataTable
            columns={supervisorColumns}
            emptyLabel="No supervisors configured."
            rows={supervisors}
            searchLabel="Search supervisors"
            title="Supervisor management"
          />
        </div>
      ) : null}

      {activeSection === "visit-requests" ? (
        <div className="space-y-4">
          <SectionPanel
            description="Field officers request organization activities, project visits, meetings, deliveries, incidents, and support work from mobile. Supervisors approve, reject, or request changes. GPS check-in evidence syncs back here after the activity."
            title="Operational activity approvals"
          >
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                icon={<ClipboardList aria-hidden="true" />}
                label="Total Activities"
                tone="neutral"
                value={activityAnalytics.total}
              />
              <MetricCard
                icon={<CalendarDays aria-hidden="true" />}
                label="Pending"
                tone={activityAnalytics.pending ? "warning" : "success"}
                value={activityAnalytics.pending}
              />
              <MetricCard
                icon={<ShieldCheck aria-hidden="true" />}
                label="Approved"
                tone="success"
                value={activityAnalytics.approved}
              />
              <MetricCard
                icon={<Target aria-hidden="true" />}
                label="Completed"
                tone="success"
                value={activityAnalytics.completed}
              />
              <MetricCard
                icon={<MapPinned aria-hidden="true" />}
                label="GPS Verified"
                tone="success"
                value={activityAnalytics.gpsVerified}
              />
              <MetricCard
                icon={<AlertTriangle aria-hidden="true" />}
                label="Flagged"
                tone={activityAnalytics.flagged ? "danger" : "success"}
                value={activityAnalytics.flagged}
              />
              <MetricCard
                icon={<Route aria-hidden="true" />}
                label="Organization Scope"
                tone="neutral"
                value={activityAnalytics.organizationScoped}
              />
              <MetricCard
                icon={<RadioTower aria-hidden="true" />}
                label="Approval Rate"
                tone={activityAnalytics.approvalRate >= 70 ? "success" : "warning"}
                value={`${activityAnalytics.approvalRate}%`}
              />
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border bg-background p-3">
                <h3 className="text-sm font-semibold">Activities by type</h3>
                <div className="mt-3 space-y-2">
                  {(activityAnalytics.byType.length ? activityAnalytics.byType : [["No activity yet", 0] as [string, number]]).slice(0, 6).map(([label, count]) => (
                    <div className="flex items-center justify-between rounded-lg border bg-panel px-3 py-2 text-sm" key={String(label)}>
                      <span className="font-medium">{titleCase(String(label))}</span>
                      <Badge tone="neutral">{count}</Badge>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border bg-background p-3">
                <h3 className="text-sm font-semibold">Activity load by officer</h3>
                <div className="mt-3 space-y-2">
                  {(activityAnalytics.byOfficer.length ? activityAnalytics.byOfficer : [["No officer activity yet", 0] as [string, number]]).slice(0, 6).map(([label, count]) => (
                    <div className="flex items-center justify-between rounded-lg border bg-panel px-3 py-2 text-sm" key={String(label)}>
                      <span className="font-medium">{label}</span>
                      <Badge tone="neutral">{count}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-4 rounded-xl border bg-background p-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <FileText aria-hidden="true" className="size-4 text-primary" />
                    <h3 className="text-sm font-semibold">Activity reports</h3>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Generate practical operations reports from activity requests, supervisor decisions, GPS evidence, and attachments.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {operationalReportOptions.map((option) => (
                    <Button
                      key={option.value}
                      onClick={() => setActivityReportType(option.value)}
                      size="sm"
                      variant={activityReportType === option.value ? "primary" : "secondary"}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>
              {activityReport ? (
                <div className="mt-4 space-y-3">
                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
                    <DetailSignal label="Activities" value={activityReport.total_activities} />
                    <DetailSignal label="Completed" value={activityReport.completed} />
                    <DetailSignal label="Pending approval" value={activityReport.pending} />
                    <DetailSignal label="Attachments" value={activityReport.attachment_count} />
                    <DetailSignal label="Approval rate" value={`${activityReport.approval_rate}%`} />
                    <DetailSignal label="GPS exceptions" value={`${activityReport.gps_exception_rate}%`} />
                  </div>
                  {activityReport.recommendations.length ? (
                    <div className="rounded-lg border border-warning/30 bg-warning/10 p-3">
                      <p className="text-xs font-semibold text-warning-foreground">M&E recommendations</p>
                      <ul className="mt-2 space-y-1 text-xs text-warning-foreground">
                        {activityReport.recommendations.map((recommendation) => (
                          <li key={recommendation}>{recommendation}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="min-w-full text-left text-xs">
                      <thead className="bg-muted/60 text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2 font-semibold">Activity</th>
                          <th className="px-3 py-2 font-semibold">Type</th>
                          <th className="px-3 py-2 font-semibold">Status</th>
                          <th className="px-3 py-2 font-semibold">Supervisor decision</th>
                          <th className="px-3 py-2 font-semibold">GPS</th>
                          <th className="px-3 py-2 font-semibold">Location</th>
                          <th className="px-3 py-2 font-semibold">Start</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activityReport.rows.slice(0, 8).map((row) => (
                          <tr className="border-t" key={String(row.id)}>
                            <td className="px-3 py-2 font-medium">{asText(row.title)}</td>
                            <td className="px-3 py-2">{titleCase(asText(row.activityType))}</td>
                            <td className="px-3 py-2">{titleCase(asText(row.status))}</td>
                            <td className="px-3 py-2">{asText(row.supervisorDecision)}</td>
                            <td className="px-3 py-2">{titleCase(asText(row.verificationStatus))}</td>
                            <td className="px-3 py-2">{asText(row.locationName)}</td>
                            <td className="px-3 py-2">{formatTime(typeof row.requestedStartAt === "string" ? row.requestedStartAt : null)}</td>
                          </tr>
                        ))}
                        {activityReport.rows.length === 0 ? (
                          <tr>
                            <td className="px-3 py-4 text-muted-foreground" colSpan={7}>
                              No activities match this report.
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <p className="mt-4 rounded-lg border border-dashed bg-panel p-3 text-xs text-muted-foreground">
                  {activityReportQuery.isLoading ? "Generating report..." : "Report data is not available yet."}
                </p>
              )}
            </div>
          </SectionPanel>
          {selectedActivity ? (
            <OperationalActivityDetail
              activity={selectedActivity}
              canApprove={canApproveOperationalActivities}
              canReviewOutcome={canReviewOperationalOutcomes}
              mediaEvidence={selectedActivityEvidence}
              officerName={officers.find((officer) => officer.id === selectedActivity.field_officer_id)?.full_name ?? "Field officer"}
              onClose={() => setSelectedActivityId(null)}
              onOutcomeReview={(action) => outcomeReviewMutation.mutate({ action, visitRequestId: selectedActivity.id })}
              onReview={(action) => reviewVisitMutation.mutate({ action, visitRequestId: selectedActivity.id })}
              outcomeReviewPending={outcomeReviewMutation.isPending}
              reviewPending={reviewVisitMutation.isPending}
            />
          ) : null}
          <div className="rounded-xl border bg-panel p-3">
            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div>
                <h3 className="text-sm font-semibold">Needs supervisor action</h3>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Pending requests, change requests, and GPS exceptions appear here first so supervisors know what to approve or investigate.
                </p>
              </div>
              <Badge tone={supervisorActionVisits.length ? "warning" : "success"}>
                {supervisorActionVisits.length ? `${supervisorActionVisits.length} item(s)` : "Clear"}
              </Badge>
            </div>
            <div className="mt-3 grid gap-2">
              {supervisorActionVisits.length ? (
                supervisorActionVisits.map((visit) => (
                  <div className="flex flex-col gap-3 rounded-lg border bg-background px-3 py-2 md:flex-row md:items-center md:justify-between" key={visit.id}>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold">{visit.title}</p>
                        <Badge tone={visit.status === "flagged" ? "danger" : "warning"}>{visit.status.replaceAll("_", " ")}</Badge>
                        <Badge tone={visit.verification_status === "outside_planned_area" || visit.verification_status === "poor_gps_accuracy" ? "danger" : "neutral"}>
                          {visit.verification_status.replaceAll("_", " ")}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {visit.location_name} · {formatTime(visit.requested_start_at)} · {visit.distance_from_planned_meters === null ? "No check-in distance" : `${Math.round(visit.distance_from_planned_meters)}m from planned point`}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={() => setSelectedActivityId(visit.id)} size="sm" variant="secondary">
                        Review evidence
                      </Button>
                      {["pending", "change_requested"].includes(visit.status) ? (
                        <Button
                          disabled={!canApproveOperationalActivities || reviewVisitMutation.isPending}
                          onClick={() => reviewVisitMutation.mutate({ action: "approve", visitRequestId: visit.id })}
                          size="sm"
                          variant="primary"
                        >
                          Approve
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))
              ) : (
                <p className="rounded-lg border border-dashed bg-background p-3 text-xs text-muted-foreground">
                  No pending movement approvals or GPS exceptions right now.
                </p>
              )}
            </div>
          </div>
          <DataTable
            columns={visitRequestColumns}
            emptyLabel="No operational activities yet. Field officers can request organization or project activities from the mobile app."
            rows={visitRequests}
            searchLabel="Search activities"
            title="Operational activity queue"
          />
        </div>
      ) : null}

      {activeSection === "work-plans" ? (
        <div className="space-y-4">
          <SectionHeader
            action={
              <Button
                disabled={!canManageFieldOperations}
                onClick={() => setModalMode("work-plan")}
                variant="primary"
              >
                <Plus aria-hidden="true" />
                Create work plan
              </Button>
            }
            description={fieldOperationsSections.find((section) => section.id === "work-plans")?.description ?? ""}
            title="Work plans"
          />
          <DataTable
            columns={workPlanColumns}
            emptyLabel="No work plans yet."
            rows={workPlans}
            searchLabel="Search work plans"
            title="Work plans"
          />
        </div>
      ) : null}

      {activeSection === "targets" ? (
        <div className="space-y-4">
          <SectionHeader
            action={
              <Button
                disabled={!canManageFieldOperations}
                onClick={() => setModalMode("target")}
                variant="primary"
              >
                <Target aria-hidden="true" />
                Create target
              </Button>
            }
            description={fieldOperationsSections.find((section) => section.id === "targets")?.description ?? ""}
            title="Operational targets"
          />
          <DataTable
            columns={targetColumns}
            emptyLabel="No operational targets yet."
            rows={targets}
            searchLabel="Search targets"
            title="Operational targets"
          />
        </div>
      ) : null}

      {activeSection === "field-monitoring" ? (
        <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
          <DataTable
            columns={activityColumns}
            emptyLabel="No monitoring activity yet."
            rows={activities}
            searchLabel="Search monitoring activity"
            title="Live activity feed"
          />
          <SectionPanel
            description="Real-time field health signals. GPS analysis opens in Mapping; submission review opens in Submissions."
            title="Monitoring dashboard"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <MetricCard
                icon={<RadioTower aria-hidden="true" />}
                label="Sync Health"
                tone="success"
                value={`${operationsSummary.sync_health_percent}%`}
              />
              <MetricCard
                icon={<ShieldCheck aria-hidden="true" />}
                label="Offline Ready"
                tone={operationsSummary.offline_ready ? "success" : "warning"}
                value={operationsSummary.offline_ready ? "Yes" : "No"}
              />
              <MetricCard
                icon={<AlertTriangle aria-hidden="true" />}
                label="Quality Alerts"
                tone={operationsSummary.quality_flags ? "warning" : "success"}
                value={operationsSummary.quality_flags}
              />
              <MetricCard
                icon={<MapPinned aria-hidden="true" />}
                label="GPS Active"
                tone="success"
                value={
                  officers.filter(
                    (officer) =>
                      officer.last_latitude && officer.last_longitude,
                  ).length
                }
              />
            </div>
          </SectionPanel>
        </div>
      ) : null}

      <section className="rounded-xl border bg-panel p-3.5 shadow-line">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-sm font-semibold">
              Field Operations boundaries
            </h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
              This module manages assignments, teams, field officers,
              supervisors, work plans, targets, and live execution. Form design
              stays in Forms, submission review stays in Submissions, GIS
              analysis stays in Mapping, and audit policy stays in Governance.
            </p>
          </div>
          <Badge tone="collect">
            {
              fieldOperationsSections.find(
                (section) => section.id === activeSection,
              )?.route
            }
          </Badge>
        </div>
      </section>

      <Modal
        description="Assign work to a project, form, supervisor, field team, location, and target."
        open={modalMode === "assignment"}
        onOpenChange={(open) => {
          setModalMode(open ? "assignment" : null);
          if (!open) setAssignmentEditingId(null);
        }}
        title={assignmentEditingId ? "Edit assignment" : "Create assignment"}
      >
        <form
          className="space-y-4 overflow-y-auto p-5 product-scrollbar"
          onSubmit={(event) => {
            event.preventDefault();
            void submitAssignment();
          }}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium">
              Assignment name
              <Input
                className="mt-2"
                required
                value={assignmentDraft.name}
                onChange={(event) =>
                  setAssignmentDraft((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
              />
            </label>
            <label className="text-sm font-medium">
              Project
              <Select
                className="mt-2"
                value={assignmentDraft.project}
                onChange={(event) =>
                  setAssignmentDraft((current) => ({
                    ...current,
                    project: event.target.value,
                  }))
                }
              >
                {projectOptions.length ? (
                  projectOptions.map((project) => (
                    <option key={project} value={project}>
                      {project}
                    </option>
                  ))
                ) : (
                  <option value="">Create a project first</option>
                )}
              </Select>
            </label>
            <label className="text-sm font-medium">
              Form
              <Select
                className="mt-2"
                value={assignmentDraft.form}
                onChange={(event) =>
                  setAssignmentDraft((current) => ({
                    ...current,
                    form: event.target.value,
                  }))
                }
              >
                {formOptions.length ? (
                  formOptions.map((form) => (
                    <option key={form} value={form}>
                      {form}
                    </option>
                  ))
                ) : (
                  <option value="">Create or publish a form first</option>
                )}
              </Select>
            </label>
            <label className="text-sm font-medium">
              Supervisor
              <Input
                className="mt-2"
                required
                value={assignmentDraft.supervisor}
                onChange={(event) =>
                  setAssignmentDraft((current) => ({
                    ...current,
                    supervisor: event.target.value,
                  }))
                }
              />
            </label>
            <div className="text-sm font-medium">
              Field officers
              <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border bg-background p-2 product-scrollbar">
                {(() => {
                  const activeOfficers = officers.filter(
                    (officer) => officer.is_active,
                  );
                  const renderOfficer = (
                    officer: FieldOfficerRead,
                    crossProject: boolean,
                  ) => {
                    const checked = assignmentDraft.fieldOfficers.includes(
                      officer.full_name,
                    );
                    return (
                      <label
                        className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-muted"
                        key={officer.id}
                      >
                        <input
                          checked={checked}
                          className="h-4 w-4"
                          onChange={(event) =>
                            setAssignmentDraft((current) => ({
                              ...current,
                              fieldOfficers: event.target.checked
                                ? [
                                    ...current.fieldOfficers,
                                    officer.full_name,
                                  ]
                                : current.fieldOfficers.filter(
                                    (name) => name !== officer.full_name,
                                  ),
                            }))
                          }
                          type="checkbox"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">
                            {officer.full_name}
                          </span>
                          <span className="block truncate text-muted-foreground">
                            {officer.email}
                          </span>
                        </span>
                        {crossProject ? (
                          <Badge tone="accent">Cross-project</Badge>
                        ) : null}
                      </label>
                    );
                  };

                  if (!assignmentDraft.project) {
                    return activeOfficers.map((officer) =>
                      renderOfficer(officer, false),
                    );
                  }

                  const projectTeam = projectTeamMembers(
                    assignmentDraft.project,
                    assignmentEditingId,
                  );
                  const teamOfficers = activeOfficers.filter((officer) =>
                    projectTeam.has(officer.full_name),
                  );
                  const otherOfficers = activeOfficers.filter(
                    (officer) => !projectTeam.has(officer.full_name),
                  );

                  return (
                    <>
                      <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        On {assignmentDraft.project}
                      </p>
                      {teamOfficers.length ? (
                        teamOfficers.map((officer) =>
                          renderOfficer(officer, false),
                        )
                      ) : (
                        <p className="px-2 pb-2 text-xs text-muted-foreground">
                          No officers assigned to this project yet.
                        </p>
                      )}
                      <p className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        Other organization staff
                      </p>
                      {otherOfficers.length ? (
                        otherOfficers.map((officer) =>
                          renderOfficer(officer, true),
                        )
                      ) : (
                        <p className="px-2 pb-2 text-xs text-muted-foreground">
                          No other active officers available.
                        </p>
                      )}
                    </>
                  );
                })()}
                {!officers.filter((officer) => officer.is_active).length ? (
                  <p className="p-2 text-xs text-muted-foreground">
                    Invite a field officer before creating assignments.
                  </p>
                ) : null}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {assignmentDraft.fieldOfficers.length} selected
              </p>
            </div>
            <label className="text-sm font-medium">
              Location
              <Input
                className="mt-2"
                required
                value={assignmentDraft.location}
                onChange={(event) =>
                  setAssignmentDraft((current) => ({
                    ...current,
                    location: event.target.value,
                  }))
                }
              />
            </label>
            <label className="text-sm font-medium">
              Start date
              <Input
                className="mt-2"
                type="date"
                value={assignmentDraft.startDate.slice(0, 10)}
                onChange={(event) =>
                  setAssignmentDraft((current) => ({
                    ...current,
                    startDate: event.target.value,
                  }))
                }
              />
            </label>
            <label className="text-sm font-medium">
              End date
              <Input
                className="mt-2"
                type="date"
                value={assignmentDraft.endDate.slice(0, 10)}
                onChange={(event) =>
                  setAssignmentDraft((current) => ({
                    ...current,
                    endDate: event.target.value,
                  }))
                }
              />
            </label>
            <label className="text-sm font-medium">
              Target count
              <Input
                className="mt-2"
                min={0}
                type="number"
                value={assignmentDraft.targetCount}
                onChange={(event) =>
                  setAssignmentDraft((current) => ({
                    ...current,
                    targetCount: Number(event.target.value),
                  }))
                }
              />
            </label>
            <label className="text-sm font-medium">
              Priority
              <Select
                className="mt-2"
                value={assignmentDraft.priority}
                onChange={(event) =>
                  setAssignmentDraft((current) => ({
                    ...current,
                    priority: event.target.value as Priority,
                  }))
                }
              >
                <option value="Low">Low</option>
                <option value="Normal">Normal</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </Select>
            </label>
          </div>
          <label className="block text-sm font-medium">
            Description
            <Textarea
              className="mt-2"
              value={assignmentDraft.description}
              onChange={(event) =>
                setAssignmentDraft((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
            />
          </label>
          <div className="flex justify-end gap-2 border-t pt-4">
            <Button onClick={() => setModalMode(null)} variant="secondary">
              Cancel
            </Button>
            <Button
              disabled={
                assignmentSaving ||
                !assignmentDraft.project ||
                !assignmentDraft.form ||
                (!preview && !assignmentDraft.fieldOfficers.length)
              }
              variant="primary"
              type="submit"
            >
              {assignmentSaving
                ? "Saving..."
                : assignmentEditingId
                  ? "Save assignment"
                  : "Create assignment"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        description="Review the selected field assignment and use Edit assignment to change who receives it."
        open={modalMode === "assignment-view"}
        onOpenChange={(open) => {
          if (!open) {
            setModalMode(null);
            setViewAssignment(null);
          }
        }}
        title="Assignment details"
      >
        <div className="space-y-3 p-5">
          {viewAssignment ? (
            <>
              <DetailSignal label="Assignment" value={viewAssignment.name} />
              <DetailSignal label="Project" value={viewAssignment.project} />
              <DetailSignal label="Form" value={viewAssignment.form} />
              <DetailSignal
                label="Field officers"
                value={
                  viewAssignment.fieldOfficers.length ? (
                    <span className="flex flex-wrap justify-end gap-1.5">
                      {(() => {
                        const projectTeam = projectTeamMembers(
                          viewAssignment.project,
                          viewAssignment.id,
                        );
                        return viewAssignment.fieldOfficers.map((name) => (
                          <span className="flex items-center gap-1" key={name}>
                            <UserProfileLink userId={officersByName.get(name)}>{name}</UserProfileLink>
                            {!projectTeam.has(name) ? (
                              <Badge tone="accent">Cross-project</Badge>
                            ) : null}
                          </span>
                        ));
                      })()}
                    </span>
                  ) : (
                    "Unassigned"
                  )
                }
              />
              <DetailSignal label="Location" value={viewAssignment.location} />
              <DetailSignal label="Status" value={viewAssignment.status} />
              <div className="space-y-2 border-t pt-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Assigned cases ({viewAssignment.assignedEntityIds?.length ?? 0})
                </p>
                {viewAssignment.assignedEntityIds?.length ? (
                  <div className="space-y-2">
                    {viewAssignment.assignedEntityIds.map((entityId) => {
                      const entity = casesByEntityId.get(entityId);
                      if (!entity) {
                        return (
                          <div
                            className="rounded-lg border border-dashed bg-muted/30 px-3 py-2 text-xs text-muted-foreground"
                            key={entityId}
                          >
                            {entityId} · Not found in entity registry
                          </div>
                        );
                      }
                      return (
                        <div className="rounded-lg border bg-background p-3" key={entityId}>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-semibold">
                              {entity.fullName || entity.entityId}
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              <Badge tone="neutral">{entity.entityType}</Badge>
                              <Badge tone={caseStatusTone(entity.status)}>
                                {entity.status}
                              </Badge>
                            </div>
                          </div>
                          <p className="mt-1.5 text-xs text-muted-foreground">
                            Last visit {formatEntityDate(entity.lastVisit)} ·{" "}
                            {entity.formsCompleted} form
                            {entity.formsCompleted === 1 ? "" : "s"} completed
                          </p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="rounded-lg border border-dashed bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                    No cases assigned to this assignment yet.
                  </p>
                )}
                <Button
                  onClick={() => router.push("/beneficiaries")}
                  size="sm"
                  variant="ghost"
                >
                  Open Entities registry
                </Button>
              </div>
            </>
          ) : null}
        </div>
        <div className="flex justify-end gap-2 border-t px-5 py-4">
          <Button onClick={() => setModalMode(null)} variant="ghost">
            Close
          </Button>
          {viewAssignment ? (
            <Button
              onClick={() => openAssignmentModal(viewAssignment)}
              variant="primary"
            >
              Edit assignment
            </Button>
          ) : null}
        </div>
      </Modal>

      <Modal
        description="Invite one enumerator. Use CSV import for large teams."
        open={modalMode === "invite"}
        onOpenChange={(open) => setModalMode(open ? "invite" : null)}
        title="Invite field officer"
      >
        <form
          className="space-y-4 p-5"
          onSubmit={(event) => {
            event.preventDefault();
            if (preview) {
              const officer: FieldOfficerRead = {
                device_id: null,
                email: inviteDraft.email,
                employee_code: `FO-${Date.now().toString().slice(-4)}`,
                full_name: inviteDraft.full_name,
                home_region: inviteDraft.home_region ?? null,
                id: `preview-officer-${Date.now()}`,
                is_active: true,
                last_latitude: null,
                last_longitude: null,
                last_seen_at: null,
                last_sync_at: null,
                phone_number: inviteDraft.phone_number ?? null,
                supervisor_name: null,
                supervisor_user_id: null,
                user_id: `preview-user-${Date.now()}`,
              };
              setOfficerPreviewRows((current) => [officer, ...current]);
              setModalMode(null);
              setInviteDraft(defaultInviteDraft);
              pushToast({
                title: "Preview officer added",
                description: `${officer.full_name} was added to the roster.`,
                tone: "success",
              });
              return;
            }
            inviteMutation.mutate(generateTemporaryPassword());
          }}
        >
          <label className="block text-sm font-medium">
            Full name
            <Input
              className="mt-2"
              required
              value={inviteDraft.full_name}
              onChange={(event) =>
                setInviteDraft((current) => ({
                  ...current,
                  full_name: event.target.value,
                }))
              }
            />
          </label>
          <label className="block text-sm font-medium">
            Email
            <Input
              className="mt-2"
              required
              type="email"
              value={inviteDraft.email}
              onChange={(event) =>
                setInviteDraft((current) => ({
                  ...current,
                  email: event.target.value,
                }))
              }
            />
          </label>
          <label className="block text-sm font-medium">
            Phone
            <Input
              className="mt-2"
              value={inviteDraft.phone_number ?? ""}
              onChange={(event) =>
                setInviteDraft((current) => ({
                  ...current,
                  phone_number: event.target.value,
                }))
              }
            />
          </label>
          <label className="block text-sm font-medium">
            Assigned location
            <Input
              className="mt-2"
              value={inviteDraft.home_region ?? ""}
              onChange={(event) =>
                setInviteDraft((current) => ({
                  ...current,
                  home_region: event.target.value,
                }))
              }
            />
          </label>
          <div className="flex justify-end gap-2 border-t pt-4">
            <Button onClick={() => setModalMode(null)} variant="secondary">
              Cancel
            </Button>
            <Button
              disabled={inviteMutation.isPending}
              variant="primary"
              type="submit"
            >
              <UserPlus aria-hidden="true" />
              Invite officer
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        description="Plan operational activities with objectives, locations, teams, deliverables, and dates."
        open={modalMode === "work-plan"}
        onOpenChange={(open) => setModalMode(open ? "work-plan" : null)}
        title="Create work plan"
      >
        <form
          className="space-y-4 p-5"
          onSubmit={(event) => {
            event.preventDefault();
            void submitWorkPlan();
          }}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium">
              Name
              <Input
                className="mt-2"
                required
                value={workPlanDraft.name}
                onChange={(event) =>
                  setWorkPlanDraft((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
              />
            </label>
            <label className="text-sm font-medium">
              Project
              <Input
                className="mt-2"
                required
                value={workPlanDraft.project}
                onChange={(event) =>
                  setWorkPlanDraft((current) => ({
                    ...current,
                    project: event.target.value,
                  }))
                }
              />
            </label>
            <label className="text-sm font-medium">
              Start date
              <Input
                className="mt-2"
                type="date"
                value={workPlanDraft.startDate.slice(0, 10)}
                onChange={(event) =>
                  setWorkPlanDraft((current) => ({
                    ...current,
                    startDate: event.target.value,
                  }))
                }
              />
            </label>
            <label className="text-sm font-medium">
              End date
              <Input
                className="mt-2"
                type="date"
                value={workPlanDraft.endDate.slice(0, 10)}
                onChange={(event) =>
                  setWorkPlanDraft((current) => ({
                    ...current,
                    endDate: event.target.value,
                  }))
                }
              />
            </label>
            <label className="text-sm font-medium">
              Locations
              <Input
                className="mt-2"
                placeholder="Comma separated"
                value={workPlanDraft.locations.join(", ")}
                onChange={(event) =>
                  setWorkPlanDraft((current) => ({
                    ...current,
                    locations: splitList(event.target.value),
                  }))
                }
              />
            </label>
            <label className="text-sm font-medium">
              Teams
              <Input
                className="mt-2"
                placeholder="Comma separated"
                value={workPlanDraft.assignedTeams.join(", ")}
                onChange={(event) =>
                  setWorkPlanDraft((current) => ({
                    ...current,
                    assignedTeams: splitList(event.target.value),
                  }))
                }
              />
            </label>
          </div>
          <label className="block text-sm font-medium">
            Objectives
            <Textarea
              className="mt-2"
              required
              value={workPlanDraft.objectives}
              onChange={(event) =>
                setWorkPlanDraft((current) => ({
                  ...current,
                  objectives: event.target.value,
                }))
              }
            />
          </label>
          <label className="block text-sm font-medium">
            Deliverables
            <Input
              className="mt-2"
              placeholder="Comma separated"
              value={workPlanDraft.deliverables.join(", ")}
              onChange={(event) =>
                setWorkPlanDraft((current) => ({
                  ...current,
                  deliverables: splitList(event.target.value),
                }))
              }
            />
          </label>
          <div className="flex justify-end gap-2 border-t pt-4">
            <Button onClick={() => setModalMode(null)} variant="secondary">
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Create work plan
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        description="Define a daily, weekly, monthly, or project target for teams and staff."
        open={modalMode === "target"}
        onOpenChange={(open) => setModalMode(open ? "target" : null)}
        title="Create target"
      >
        <form
          className="space-y-4 p-5"
          onSubmit={(event) => {
            event.preventDefault();
            void submitTarget();
          }}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium">
              Target name
              <Input
                className="mt-2"
                required
                value={targetDraft.name}
                onChange={(event) =>
                  setTargetDraft((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
              />
            </label>
            <label className="text-sm font-medium">
              Type
              <Select
                className="mt-2"
                value={targetDraft.type}
                onChange={(event) =>
                  setTargetDraft((current) => ({
                    ...current,
                    type: event.target.value as OperationalTarget["type"],
                  }))
                }
              >
                <option value="Daily">Daily</option>
                <option value="Weekly">Weekly</option>
                <option value="Monthly">Monthly</option>
                <option value="Project">Project</option>
              </Select>
            </label>
            <label className="text-sm font-medium">
              Project
              <Input
                className="mt-2"
                required
                value={targetDraft.project}
                onChange={(event) =>
                  setTargetDraft((current) => ({
                    ...current,
                    project: event.target.value,
                  }))
                }
              />
            </label>
            <label className="text-sm font-medium">
              Linked indicator
              <Select
                className="mt-2"
                onChange={(event) => {
                  const indicatorId = event.target.value;
                  const linked = availableIndicators.find(
                    (indicator) => indicator.id === indicatorId,
                  );
                  setTargetDraft((current) => ({
                    ...current,
                    indicatorId: indicatorId || "",
                    indicator: linked?.name ?? current.indicator,
                  }));
                }}
                value={targetDraft.indicatorId ?? ""}
              >
                <option value="">Manual progress (no linked indicator)</option>
                {availableIndicators.map((indicator) => (
                  <option key={indicator.id} value={indicator.id}>
                    {indicator.code} · {indicator.name}
                  </option>
                ))}
              </Select>
              <p className="mt-1 text-xs font-normal text-muted-foreground">
                Linking an indicator computes achievement automatically from
                approved submissions.
              </p>
            </label>
            {!targetDraft.indicatorId ? (
              <label className="text-sm font-medium">
                Indicator label
                <Input
                  className="mt-2"
                  required
                  value={targetDraft.indicator}
                  onChange={(event) =>
                    setTargetDraft((current) => ({
                      ...current,
                      indicator: event.target.value,
                    }))
                  }
                />
              </label>
            ) : null}
            <label className="text-sm font-medium">
              Team
              <Input
                className="mt-2"
                value={targetDraft.team}
                onChange={(event) =>
                  setTargetDraft((current) => ({
                    ...current,
                    team: event.target.value,
                  }))
                }
              />
            </label>
            <label className="text-sm font-medium">
              Value
              <Input
                className="mt-2"
                min={0}
                type="number"
                value={targetDraft.value}
                onChange={(event) =>
                  setTargetDraft((current) => ({
                    ...current,
                    value: Number(event.target.value),
                  }))
                }
              />
            </label>
            <label className="text-sm font-medium">
              Assigned staff
              <Input
                className="mt-2"
                placeholder="Comma separated"
                value={targetDraft.assignedStaff.join(", ")}
                onChange={(event) =>
                  setTargetDraft((current) => ({
                    ...current,
                    assignedStaff: splitList(event.target.value),
                  }))
                }
              />
            </label>
            <label className="text-sm font-medium">
              Deadline
              <Input
                className="mt-2"
                type="date"
                value={targetDraft.deadline.slice(0, 10)}
                onChange={(event) =>
                  setTargetDraft((current) => ({
                    ...current,
                    deadline: event.target.value,
                  }))
                }
              />
            </label>
          </div>
          <div className="flex justify-end gap-2 border-t pt-4">
            <Button onClick={() => setModalMode(null)} variant="secondary">
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Create target
            </Button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
