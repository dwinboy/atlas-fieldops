"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CalendarDays,
  ClipboardList,
  Download,
  MapPinned,
  Plus,
  RadioTower,
  RefreshCw,
  Route,
  ShieldCheck,
  Target,
  UploadCloud,
  UserPlus,
  UsersRound,
} from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useRef, useState } from "react";

import { DataTable, type TableColumn } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HelpHint } from "@/components/ui/help-hint";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import {
  getOperationsSummary,
  importFieldOfficers,
  inviteFieldOfficer,
  listFieldOfficers,
  type CurrentPrincipal,
  type FieldOfficerInvite,
  type FieldOfficerRead,
  type OperationsSummary,
} from "@/lib/api";
import { cn } from "@/lib/utils";
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

type ModalMode = "assignment" | "invite" | "work-plan" | "target" | null;

const defaultAssignmentDraft: Omit<FieldAssignment, "id" | "completedCount"> = {
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
  temporary_password: "ChangeMe12345!",
};

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
  name: "",
  project: "",
  team: "",
  type: "Weekly",
  value: 0,
};

function isPreview(token: string | null): boolean {
  return !token || token === "preview-token";
}

function splitList(value: string): string[] {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function downloadCsv(filename: string, rows: Record<string, string | number | boolean | null | undefined>[]): void {
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
  tone = "neutral",
  value,
}: {
  icon: ReactNode;
  label: string;
  tone?: "danger" | "neutral" | "success" | "warning";
  value: string | number;
}) {
  return (
    <article className="surface-premium rounded-2xl p-4">
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
            tone === "success" && "border-success/20 bg-success/10 text-success",
            tone === "warning" && "border-warning/20 bg-warning/10 text-warning",
            tone === "neutral" && "border-border bg-muted text-muted-foreground",
          )}
        >
          {icon}
        </span>
      </div>
    </article>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs font-medium">
        <span className="text-muted-foreground">Progress</span>
        <span>{value}%</span>
      </div>
      <div className="h-2 rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, value)}%` }} />
      </div>
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
          <HelpHint label={`About ${title}`} title={title}>{description}</HelpHint>
        </div>
      </div>
      {children}
    </section>
  );
}

export function FieldOperationsModule({ principal, token }: FieldOperationsModuleProps) {
  const [activeSection, setActiveSection] = useState<FieldOperationsSection>("dashboard");
  const [assignments, setAssignments] = useState<FieldAssignment[]>(previewAssignments);
  const [workPlans, setWorkPlans] = useState<WorkPlan[]>(previewWorkPlans);
  const [targets, setTargets] = useState<OperationalTarget[]>(previewTargets);
  const [officerPreviewRows, setOfficerPreviewRows] = useState<FieldOfficerRead[]>(previewOfficers);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [assignmentDraft, setAssignmentDraft] = useState(defaultAssignmentDraft);
  const [inviteDraft, setInviteDraft] = useState(defaultInviteDraft);
  const [workPlanDraft, setWorkPlanDraft] = useState(defaultWorkPlanDraft);
  const [targetDraft, setTargetDraft] = useState(defaultTargetDraft);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pushToast = useWorkspaceStore((state) => state.pushToast);
  const setActiveView = useWorkspaceStore((state) => state.setActiveView);
  const preview = isPreview(token);
  const enabled = Boolean(token && !preview);
  const canManageFieldOperations = Boolean(
    principal?.platform_admin ||
      principal?.permissions?.some((permission) =>
        ["officers.manage", "assignments.manage", "projects.manage"].includes(permission),
      ),
  );

  const officersQuery = useQuery({ queryKey: ["field-officers", token], queryFn: () => listFieldOfficers(token ?? ""), enabled });
  const summaryQuery = useQuery({ queryKey: ["operations", "summary", token], queryFn: () => getOperationsSummary(token ?? ""), enabled });
  const officers = officersQuery.data?.length ? officersQuery.data : officerPreviewRows;
  const operationsSummary: OperationsSummary = summaryQuery.data ?? previewOperationsSummary;
  const supervisors = previewSupervisors;
  const activities = previewActivities;
  const summary = computeFieldOperationsSummary({ assignments, officers, operationsSummary, supervisors, targets });

  const inviteMutation = useMutation({
    mutationFn: () => inviteFieldOfficer(token ?? "", inviteDraft),
    onSuccess: async (officer) => {
      setOfficerPreviewRows((current) => [officer, ...current]);
      setInviteDraft(defaultInviteDraft);
      setModalMode(null);
      await officersQuery.refetch();
      pushToast({ title: "Field officer invited", description: `${officer.full_name} can receive assignments and sync forms.`, tone: "success" });
    },
    onError: () => pushToast({ title: "Invite failed", description: "Check the email, role permission, and backend availability.", tone: "danger" }),
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
    onError: () => pushToast({ title: "Officer import failed", description: "Use CSV with email and full_name columns.", tone: "danger" }),
  });

  const assignmentColumns: TableColumn<FieldAssignment>[] = [
    { key: "assignment", header: "Assignment", value: (assignment) => `${assignment.name} ${assignment.project} ${assignment.form}`, render: (assignment) => <div><p className="font-medium">{assignment.name}</p><p className="text-xs text-muted-foreground">{assignment.project} · {assignment.form}</p></div> },
    { key: "status", header: "Status", value: (assignment) => assignment.status, render: (assignment) => <Badge tone={statusTone(assignment.status)}>{assignment.status}</Badge> },
    { key: "supervisor", header: "Supervisor", value: (assignment) => assignment.supervisor, render: (assignment) => assignment.supervisor },
    { key: "location", header: "Location", value: (assignment) => assignment.location, render: (assignment) => assignment.location },
    { key: "progress", header: "Target", value: (assignment) => String(progressPercent(assignment.completedCount, assignment.targetCount)), render: (assignment) => <ProgressBar value={progressPercent(assignment.completedCount, assignment.targetCount)} /> },
    { key: "priority", header: "Priority", value: (assignment) => assignment.priority, render: (assignment) => <Badge tone={priorityTone(assignment.priority)}>{assignment.priority}</Badge> },
    { key: "deadline", header: "Deadline", value: (assignment) => assignment.endDate, render: (assignment) => formatDate(assignment.endDate) },
    { key: "actions", header: "Actions", align: "right", render: () => <div className="flex justify-end gap-2"><Button disabled={!canManageFieldOperations} size="sm" variant="secondary">View</Button><Button disabled={!canManageFieldOperations} size="sm" variant="ghost">Reassign</Button></div> },
  ];

  const officerColumns: TableColumn<FieldOfficerRead>[] = [
    { key: "officer", header: "Officer", value: (officer) => `${officer.full_name} ${officer.email} ${officer.employee_code ?? ""}`, render: (officer) => <div><p className="font-medium">{officer.full_name}</p><p className="text-xs text-muted-foreground">{officer.email}</p></div> },
    { key: "region", header: "Location", value: (officer) => officer.home_region ?? "", render: (officer) => officer.home_region ?? "Unassigned" },
    { key: "sync", header: "Last Sync", value: (officer) => officer.last_sync_at ?? "", render: (officer) => <div><p className="font-medium">{formatTime(officer.last_sync_at)}</p><p className="text-xs text-muted-foreground">{officer.device_id ?? "No device paired"}</p></div> },
    { key: "gps", header: "GPS", value: (officer) => `${officer.last_latitude ?? ""},${officer.last_longitude ?? ""}`, render: (officer) => officer.last_latitude && officer.last_longitude ? <span className="font-mono text-xs">{officer.last_latitude.toFixed(4)}, {officer.last_longitude.toFixed(4)}</span> : <span className="text-muted-foreground">Unavailable</span> },
    { key: "status", header: "Status", value: (officer) => officer.is_active ? "Active" : "Inactive", render: (officer) => <Badge tone={officer.is_active ? "success" : "danger"}>{officer.is_active ? "Active" : "Inactive"}</Badge> },
  ];

  const supervisorColumns: TableColumn<SupervisorProfile>[] = [
    { key: "supervisor", header: "Supervisor", value: (supervisor) => `${supervisor.name} ${supervisor.team}`, render: (supervisor) => <div><p className="font-medium">{supervisor.name}</p><p className="text-xs text-muted-foreground">{supervisor.team}</p></div> },
    { key: "locations", header: "Locations", value: (supervisor) => supervisor.assignedLocations.join(" "), render: (supervisor) => supervisor.assignedLocations.join(", ") },
    { key: "officers", header: "Officers", value: (supervisor) => String(supervisor.managedOfficers), render: (supervisor) => supervisor.managedOfficers },
    { key: "completion", header: "Completion", value: (supervisor) => String(supervisor.teamCompletionRate), render: (supervisor) => <ProgressBar value={supervisor.teamCompletionRate} /> },
    { key: "quality", header: "Quality", value: (supervisor) => String(supervisor.teamDataQualityScore), render: (supervisor) => `${supervisor.teamDataQualityScore}%` },
    { key: "sla", header: "Review SLA", value: (supervisor) => String(supervisor.reviewSlaHours), render: (supervisor) => `${supervisor.reviewSlaHours}h` },
  ];

  const workPlanColumns: TableColumn<WorkPlan>[] = [
    { key: "plan", header: "Work Plan", value: (plan) => `${plan.name} ${plan.project}`, render: (plan) => <div><p className="font-medium">{plan.name}</p><p className="text-xs text-muted-foreground">{plan.project}</p></div> },
    { key: "dates", header: "Period", value: (plan) => `${plan.startDate} ${plan.endDate}`, render: (plan) => `${formatDate(plan.startDate)} - ${formatDate(plan.endDate)}` },
    { key: "teams", header: "Teams", value: (plan) => plan.assignedTeams.join(" "), render: (plan) => plan.assignedTeams.join(", ") },
    { key: "locations", header: "Locations", value: (plan) => plan.locations.join(" "), render: (plan) => plan.locations.join(", ") },
    { key: "progress", header: "Progress", value: (plan) => String(plan.progress), render: (plan) => <ProgressBar value={plan.progress} /> },
    { key: "view", header: "View", value: (plan) => plan.view, render: (plan) => <Badge tone="accent">{plan.view}</Badge> },
  ];

  const targetColumns: TableColumn<OperationalTarget>[] = [
    { key: "target", header: "Target", value: (target) => `${target.name} ${target.indicator}`, render: (target) => <div><p className="font-medium">{target.name}</p><p className="text-xs text-muted-foreground">{target.indicator}</p></div> },
    { key: "type", header: "Type", value: (target) => target.type, render: (target) => <Badge tone="neutral">{target.type}</Badge> },
    { key: "team", header: "Team", value: (target) => target.team, render: (target) => target.team },
    { key: "progress", header: "Achievement", value: (target) => String(progressPercent(target.achieved, target.value)), render: (target) => <ProgressBar value={progressPercent(target.achieved, target.value)} /> },
    { key: "deadline", header: "Deadline", value: (target) => target.deadline, render: (target) => formatDate(target.deadline) },
  ];

  const activityColumns: TableColumn<FieldActivity>[] = [
    { key: "activity", header: "Activity", value: (activity) => `${activity.actor} ${activity.activityType}`, render: (activity) => <div><p className="font-medium">{activity.activityType}</p><p className="text-xs text-muted-foreground">{activity.actor} · {activity.assignment}</p></div> },
    { key: "status", header: "Status", value: (activity) => activity.status, render: (activity) => <Badge tone={statusTone(activity.status)}>{activity.status}</Badge> },
    { key: "location", header: "Location", value: (activity) => activity.location, render: (activity) => activity.location },
    { key: "time", header: "Time", value: (activity) => activity.timestamp, render: (activity) => formatTime(activity.timestamp) },
  ];

  function submitAssignment(): void {
    setAssignments((current) => [
      {
        ...assignmentDraft,
        completedCount: 0,
        fieldOfficers: assignmentDraft.fieldOfficers.length ? assignmentDraft.fieldOfficers : ["Unassigned"],
        id: `assignment-${Date.now()}`,
        status: "Assigned",
      },
      ...current,
    ]);
    setAssignmentDraft(defaultAssignmentDraft);
    setModalMode(null);
    pushToast({ title: "Assignment created", description: "The assignment is ready for supervisor and officer coordination.", tone: "success" });
  }

  function submitWorkPlan(): void {
    setWorkPlans((current) => [{ ...workPlanDraft, id: `workplan-${Date.now()}`, progress: 0, view: "Timeline" }, ...current]);
    setWorkPlanDraft(defaultWorkPlanDraft);
    setModalMode(null);
    pushToast({ title: "Work plan created", description: "Teams can now use this plan to coordinate field activities.", tone: "success" });
  }

  function submitTarget(): void {
    setTargets((current) => [{ ...targetDraft, achieved: 0, id: `target-${Date.now()}` }, ...current]);
    setTargetDraft(defaultTargetDraft);
    setModalMode(null);
    pushToast({ title: "Target created", description: "Progress will appear in Field Operations and monitoring views.", tone: "success" });
  }

  return (
    <section className="space-y-3">
      <div className="rounded-xl border bg-panel p-3.5 shadow-line">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="collect">OPERATIONS</Badge>
              <Badge tone={summary.overdueAssignments ? "warning" : "success"}>
                {summary.overdueAssignments ? `${summary.overdueAssignments} overdue` : "Field work on track"}
              </Badge>
              {preview ? <Badge tone="neutral">Preview data</Badge> : null}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">Field Operations</h1>
              <HelpHint label="About Field Operations" title="Field Operations">
                Coordinate assignments, field officers, supervisors, work plans, targets, and live monitoring so managers know what is happening in the field today.
              </HelpHint>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button disabled={!canManageFieldOperations} onClick={() => setModalMode("assignment")} variant="primary">
              <Plus aria-hidden="true" />
              Create assignment
            </Button>
            <Button onClick={() => setActiveView("map")} variant="secondary">
              <MapPinned aria-hidden="true" />
              Open mapping
            </Button>
            <Button
              onClick={() =>
                downloadCsv("atlas-field-assignments.csv", assignments.map((assignment) => ({
                  assignment: assignment.name,
                  project: assignment.project,
                  form: assignment.form,
                  supervisor: assignment.supervisor,
                  location: assignment.location,
                  status: assignment.status,
                  progress: progressPercent(assignment.completedCount, assignment.targetCount),
                })))
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
                activeSection === section.id ? "border-primary bg-primary text-primary-foreground" : "bg-panel hover:bg-muted",
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
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
            <MetricCard icon={<ClipboardList aria-hidden="true" />} label="Active Assignments" tone="success" value={summary.activeAssignments} />
            <MetricCard icon={<UsersRound aria-hidden="true" />} label="Assigned Field Officers" tone="success" value={summary.assignedFieldOfficers} />
            <MetricCard icon={<ShieldCheck aria-hidden="true" />} label="Active Supervisors" tone="success" value={summary.activeSupervisors} />
            <MetricCard icon={<MapPinned aria-hidden="true" />} label="Coverage Progress" tone={summary.coverageProgress >= 70 ? "success" : "warning"} value={`${summary.coverageProgress}%`} />
            <MetricCard icon={<AlertTriangle aria-hidden="true" />} label="Overdue Assignments" tone={summary.overdueAssignments ? "danger" : "success"} value={summary.overdueAssignments} />
            <MetricCard icon={<RadioTower aria-hidden="true" />} label="Daily Collection Progress" tone="success" value={`${summary.dailyCollectionProgress}%`} />
            <MetricCard icon={<Target aria-hidden="true" />} label="Assignment Completion" tone="warning" value={`${summary.assignmentCompletionRate}%`} />
            <MetricCard icon={<Route aria-hidden="true" />} label="Team Productivity" tone="success" value={`${summary.teamProductivity}%`} />
            <MetricCard icon={<CalendarDays aria-hidden="true" />} label="Upcoming Deadlines" tone={summary.upcomingDeadlines ? "warning" : "success"} value={summary.upcomingDeadlines} />
            <MetricCard icon={<AlertTriangle aria-hidden="true" />} label="Quality Alerts" tone={operationsSummary.quality_flags ? "warning" : "success"} value={operationsSummary.quality_flags} />
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <SectionPanel description="Assignment progress, overdue work, and field workload in one operational view." title="Assignment status">
              <div className="space-y-4">
                {assignments.slice(0, 3).map((assignment) => (
                  <div className="rounded-xl border bg-muted/20 p-3" key={assignment.id}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-medium">{assignment.name}</p>
                        <p className="text-xs text-muted-foreground">{assignment.location} · {assignment.supervisor}</p>
                      </div>
                      <Badge tone={statusTone(assignment.status)}>{assignment.status}</Badge>
                    </div>
                    <div className="mt-3">
                      <ProgressBar value={progressPercent(assignment.completedCount, assignment.targetCount)} />
                    </div>
                  </div>
                ))}
              </div>
            </SectionPanel>
            <SectionPanel description="Field Operations consumes map services for assigned areas and coverage previews. GIS analysis remains in Mapping." title="Geographic coverage snapshot">
              <div className="rounded-2xl border bg-[linear-gradient(135deg,hsl(var(--primary)/0.14),hsl(var(--muted)))] p-5">
                <div className="flex items-center gap-3">
                  <MapPinned aria-hidden="true" className="text-primary" />
                  <div>
                    <p className="font-medium">{summary.coverageProgress}% coverage achieved</p>
                    <p className="mt-1 text-sm text-muted-foreground">{officers.filter((officer) => officer.last_latitude && officer.last_longitude).length} officers have recent GPS evidence.</p>
                  </div>
                </div>
                <Button className="mt-5" onClick={() => setActiveView("map")} variant="secondary">
                  <MapPinned aria-hidden="true" />
                  Open Mapping
                </Button>
              </div>
            </SectionPanel>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <DataTable columns={activityColumns} emptyLabel="No field activity yet." rows={activities} searchLabel="Search activity" title="Activity timeline" />
            <DataTable columns={supervisorColumns} emptyLabel="No supervisors assigned." rows={supervisors} searchLabel="Search supervisors" title="Performance rankings" />
          </div>
        </>
      ) : null}

      {activeSection === "assignments" ? (
        <DataTable columns={assignmentColumns} emptyLabel="No assignments yet. Create one to start coordinating field work." rows={assignments} searchLabel="Search assignments" title="Assignments management" />
      ) : null}

      {activeSection === "field-officers" ? (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button disabled={!canManageFieldOperations} onClick={() => setModalMode("invite")} variant="primary">
              <UserPlus aria-hidden="true" />
              Invite officer
            </Button>
            <Button disabled={!token || preview || importMutation.isPending} onClick={() => fileInputRef.current?.click()} variant="secondary">
              <UploadCloud aria-hidden="true" />
              {importMutation.isPending ? "Importing" : "Import CSV"}
            </Button>
            <Button disabled={officersQuery.isFetching} onClick={() => officersQuery.refetch()} variant="secondary">
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
          <DataTable columns={officerColumns} emptyLabel="No field officers yet. Invite one officer or import a CSV roster." rows={officers} searchLabel="Search field officers" title="Field officer roster" />
        </div>
      ) : null}

      {activeSection === "supervisors" ? (
        <DataTable columns={supervisorColumns} emptyLabel="No supervisors configured." rows={supervisors} searchLabel="Search supervisors" title="Supervisor management" />
      ) : null}

      {activeSection === "work-plans" ? (
        <div className="space-y-4">
          <Button disabled={!canManageFieldOperations} onClick={() => setModalMode("work-plan")} variant="primary">
            <Plus aria-hidden="true" />
            Create work plan
          </Button>
          <DataTable columns={workPlanColumns} emptyLabel="No work plans yet." rows={workPlans} searchLabel="Search work plans" title="Work plans" />
        </div>
      ) : null}

      {activeSection === "targets" ? (
        <div className="space-y-4">
          <Button disabled={!canManageFieldOperations} onClick={() => setModalMode("target")} variant="primary">
            <Target aria-hidden="true" />
            Create target
          </Button>
          <DataTable columns={targetColumns} emptyLabel="No operational targets yet." rows={targets} searchLabel="Search targets" title="Operational targets" />
        </div>
      ) : null}

      {activeSection === "field-monitoring" ? (
        <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
          <DataTable columns={activityColumns} emptyLabel="No monitoring activity yet." rows={activities} searchLabel="Search monitoring activity" title="Live activity feed" />
          <SectionPanel description="Real-time field health signals. GPS analysis opens in Mapping; submission review opens in Submissions." title="Monitoring dashboard">
            <div className="grid gap-3 sm:grid-cols-2">
              <MetricCard icon={<RadioTower aria-hidden="true" />} label="Sync Health" tone="success" value={`${operationsSummary.sync_health_percent}%`} />
              <MetricCard icon={<ShieldCheck aria-hidden="true" />} label="Offline Ready" tone={operationsSummary.offline_ready ? "success" : "warning"} value={operationsSummary.offline_ready ? "Yes" : "No"} />
              <MetricCard icon={<AlertTriangle aria-hidden="true" />} label="Quality Alerts" tone={operationsSummary.quality_flags ? "warning" : "success"} value={operationsSummary.quality_flags} />
              <MetricCard icon={<MapPinned aria-hidden="true" />} label="GPS Active" tone="success" value={officers.filter((officer) => officer.last_latitude && officer.last_longitude).length} />
            </div>
          </SectionPanel>
        </div>
      ) : null}

      <section className="rounded-xl border bg-panel p-3.5 shadow-line">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-sm font-semibold">Field Operations boundaries</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
              This module manages assignments, teams, field officers, supervisors, work plans, targets, and live execution. Form design stays in Forms, submission review stays in Submissions, GIS analysis stays in Mapping, and audit policy stays in Governance.
            </p>
          </div>
          <Badge tone="collect">{fieldOperationsSections.find((section) => section.id === activeSection)?.route}</Badge>
        </div>
      </section>

      <Modal description="Assign work to a project, form, supervisor, field team, location, and target." open={modalMode === "assignment"} onOpenChange={(open) => setModalMode(open ? "assignment" : null)} title="Create assignment">
        <form className="space-y-4 overflow-y-auto p-5 product-scrollbar" onSubmit={(event) => { event.preventDefault(); submitAssignment(); }}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium">Assignment name<Input className="mt-2" required value={assignmentDraft.name} onChange={(event) => setAssignmentDraft((current) => ({ ...current, name: event.target.value }))} /></label>
            <label className="text-sm font-medium">Project<Input className="mt-2" required value={assignmentDraft.project} onChange={(event) => setAssignmentDraft((current) => ({ ...current, project: event.target.value }))} /></label>
            <label className="text-sm font-medium">Form<Input className="mt-2" required value={assignmentDraft.form} onChange={(event) => setAssignmentDraft((current) => ({ ...current, form: event.target.value }))} /></label>
            <label className="text-sm font-medium">Supervisor<Input className="mt-2" required value={assignmentDraft.supervisor} onChange={(event) => setAssignmentDraft((current) => ({ ...current, supervisor: event.target.value }))} /></label>
            <label className="text-sm font-medium">Field officers<Input className="mt-2" placeholder="Comma separated names" value={assignmentDraft.fieldOfficers.join(", ")} onChange={(event) => setAssignmentDraft((current) => ({ ...current, fieldOfficers: splitList(event.target.value) }))} /></label>
            <label className="text-sm font-medium">Location<Input className="mt-2" required value={assignmentDraft.location} onChange={(event) => setAssignmentDraft((current) => ({ ...current, location: event.target.value }))} /></label>
            <label className="text-sm font-medium">Start date<Input className="mt-2" type="date" value={assignmentDraft.startDate.slice(0, 10)} onChange={(event) => setAssignmentDraft((current) => ({ ...current, startDate: event.target.value }))} /></label>
            <label className="text-sm font-medium">End date<Input className="mt-2" type="date" value={assignmentDraft.endDate.slice(0, 10)} onChange={(event) => setAssignmentDraft((current) => ({ ...current, endDate: event.target.value }))} /></label>
            <label className="text-sm font-medium">Target count<Input className="mt-2" min={0} type="number" value={assignmentDraft.targetCount} onChange={(event) => setAssignmentDraft((current) => ({ ...current, targetCount: Number(event.target.value) }))} /></label>
            <label className="text-sm font-medium">Priority<Select className="mt-2" value={assignmentDraft.priority} onChange={(event) => setAssignmentDraft((current) => ({ ...current, priority: event.target.value as Priority }))}><option value="Low">Low</option><option value="Normal">Normal</option><option value="High">High</option><option value="Urgent">Urgent</option></Select></label>
          </div>
          <label className="block text-sm font-medium">Description<Textarea className="mt-2" value={assignmentDraft.description} onChange={(event) => setAssignmentDraft((current) => ({ ...current, description: event.target.value }))} /></label>
          <div className="flex justify-end gap-2 border-t pt-4"><Button onClick={() => setModalMode(null)} variant="secondary">Cancel</Button><Button variant="primary" type="submit">Create assignment</Button></div>
        </form>
      </Modal>

      <Modal description="Invite one enumerator. Use CSV import for large teams." open={modalMode === "invite"} onOpenChange={(open) => setModalMode(open ? "invite" : null)} title="Invite field officer">
        <form className="space-y-4 p-5" onSubmit={(event) => { event.preventDefault(); if (preview) { const officer: FieldOfficerRead = { device_id: null, email: inviteDraft.email, employee_code: `FO-${Date.now().toString().slice(-4)}`, full_name: inviteDraft.full_name, home_region: inviteDraft.home_region ?? null, id: `preview-officer-${Date.now()}`, is_active: true, last_latitude: null, last_longitude: null, last_seen_at: null, last_sync_at: null, phone_number: inviteDraft.phone_number ?? null, user_id: `preview-user-${Date.now()}` }; setOfficerPreviewRows((current) => [officer, ...current]); setModalMode(null); setInviteDraft(defaultInviteDraft); pushToast({ title: "Preview officer added", description: `${officer.full_name} was added to the roster.`, tone: "success" }); return; } inviteMutation.mutate(); }}>
          <label className="block text-sm font-medium">Full name<Input className="mt-2" required value={inviteDraft.full_name} onChange={(event) => setInviteDraft((current) => ({ ...current, full_name: event.target.value }))} /></label>
          <label className="block text-sm font-medium">Email<Input className="mt-2" required type="email" value={inviteDraft.email} onChange={(event) => setInviteDraft((current) => ({ ...current, email: event.target.value }))} /></label>
          <label className="block text-sm font-medium">Phone<Input className="mt-2" value={inviteDraft.phone_number ?? ""} onChange={(event) => setInviteDraft((current) => ({ ...current, phone_number: event.target.value }))} /></label>
          <label className="block text-sm font-medium">Assigned location<Input className="mt-2" value={inviteDraft.home_region ?? ""} onChange={(event) => setInviteDraft((current) => ({ ...current, home_region: event.target.value }))} /></label>
          <div className="flex justify-end gap-2 border-t pt-4"><Button onClick={() => setModalMode(null)} variant="secondary">Cancel</Button><Button disabled={inviteMutation.isPending} variant="primary" type="submit"><UserPlus aria-hidden="true" />Invite officer</Button></div>
        </form>
      </Modal>

      <Modal description="Plan operational activities with objectives, locations, teams, deliverables, and dates." open={modalMode === "work-plan"} onOpenChange={(open) => setModalMode(open ? "work-plan" : null)} title="Create work plan">
        <form className="space-y-4 p-5" onSubmit={(event) => { event.preventDefault(); submitWorkPlan(); }}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium">Name<Input className="mt-2" required value={workPlanDraft.name} onChange={(event) => setWorkPlanDraft((current) => ({ ...current, name: event.target.value }))} /></label>
            <label className="text-sm font-medium">Project<Input className="mt-2" required value={workPlanDraft.project} onChange={(event) => setWorkPlanDraft((current) => ({ ...current, project: event.target.value }))} /></label>
            <label className="text-sm font-medium">Start date<Input className="mt-2" type="date" value={workPlanDraft.startDate.slice(0, 10)} onChange={(event) => setWorkPlanDraft((current) => ({ ...current, startDate: event.target.value }))} /></label>
            <label className="text-sm font-medium">End date<Input className="mt-2" type="date" value={workPlanDraft.endDate.slice(0, 10)} onChange={(event) => setWorkPlanDraft((current) => ({ ...current, endDate: event.target.value }))} /></label>
            <label className="text-sm font-medium">Locations<Input className="mt-2" placeholder="Comma separated" value={workPlanDraft.locations.join(", ")} onChange={(event) => setWorkPlanDraft((current) => ({ ...current, locations: splitList(event.target.value) }))} /></label>
            <label className="text-sm font-medium">Teams<Input className="mt-2" placeholder="Comma separated" value={workPlanDraft.assignedTeams.join(", ")} onChange={(event) => setWorkPlanDraft((current) => ({ ...current, assignedTeams: splitList(event.target.value) }))} /></label>
          </div>
          <label className="block text-sm font-medium">Objectives<Textarea className="mt-2" required value={workPlanDraft.objectives} onChange={(event) => setWorkPlanDraft((current) => ({ ...current, objectives: event.target.value }))} /></label>
          <label className="block text-sm font-medium">Deliverables<Input className="mt-2" placeholder="Comma separated" value={workPlanDraft.deliverables.join(", ")} onChange={(event) => setWorkPlanDraft((current) => ({ ...current, deliverables: splitList(event.target.value) }))} /></label>
          <div className="flex justify-end gap-2 border-t pt-4"><Button onClick={() => setModalMode(null)} variant="secondary">Cancel</Button><Button variant="primary" type="submit">Create work plan</Button></div>
        </form>
      </Modal>

      <Modal description="Define a daily, weekly, monthly, or project target for teams and staff." open={modalMode === "target"} onOpenChange={(open) => setModalMode(open ? "target" : null)} title="Create target">
        <form className="space-y-4 p-5" onSubmit={(event) => { event.preventDefault(); submitTarget(); }}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium">Target name<Input className="mt-2" required value={targetDraft.name} onChange={(event) => setTargetDraft((current) => ({ ...current, name: event.target.value }))} /></label>
            <label className="text-sm font-medium">Type<Select className="mt-2" value={targetDraft.type} onChange={(event) => setTargetDraft((current) => ({ ...current, type: event.target.value as OperationalTarget["type"] }))}><option value="Daily">Daily</option><option value="Weekly">Weekly</option><option value="Monthly">Monthly</option><option value="Project">Project</option></Select></label>
            <label className="text-sm font-medium">Project<Input className="mt-2" required value={targetDraft.project} onChange={(event) => setTargetDraft((current) => ({ ...current, project: event.target.value }))} /></label>
            <label className="text-sm font-medium">Indicator<Input className="mt-2" required value={targetDraft.indicator} onChange={(event) => setTargetDraft((current) => ({ ...current, indicator: event.target.value }))} /></label>
            <label className="text-sm font-medium">Team<Input className="mt-2" value={targetDraft.team} onChange={(event) => setTargetDraft((current) => ({ ...current, team: event.target.value }))} /></label>
            <label className="text-sm font-medium">Value<Input className="mt-2" min={0} type="number" value={targetDraft.value} onChange={(event) => setTargetDraft((current) => ({ ...current, value: Number(event.target.value) }))} /></label>
            <label className="text-sm font-medium">Assigned staff<Input className="mt-2" placeholder="Comma separated" value={targetDraft.assignedStaff.join(", ")} onChange={(event) => setTargetDraft((current) => ({ ...current, assignedStaff: splitList(event.target.value) }))} /></label>
            <label className="text-sm font-medium">Deadline<Input className="mt-2" type="date" value={targetDraft.deadline.slice(0, 10)} onChange={(event) => setTargetDraft((current) => ({ ...current, deadline: event.target.value }))} /></label>
          </div>
          <div className="flex justify-end gap-2 border-t pt-4"><Button onClick={() => setModalMode(null)} variant="secondary">Cancel</Button><Button variant="primary" type="submit">Create target</Button></div>
        </form>
      </Modal>
    </section>
  );
}
