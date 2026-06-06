import type { FieldOfficerRead, OperationsSummary } from "@/lib/api";

export type FieldOperationsSection =
  | "dashboard"
  | "assignments"
  | "field-officers"
  | "supervisors"
  | "work-plans"
  | "targets"
  | "field-monitoring";

export type AssignmentStatus = "Draft" | "Assigned" | "In Progress" | "Completed" | "Overdue" | "Cancelled";
export type Priority = "Low" | "Normal" | "High" | "Urgent";

export type FieldAssignment = {
  id: string;
  name: string;
  assignmentType: "Form only" | "Form + Location" | "Form + Entity list" | "Form + Target group" | "Form + Event";
  project: string;
  form: string;
  supervisor: string;
  fieldOfficers: string[];
  location: string;
  startDate: string;
  endDate: string;
  targetCount: number;
  completedCount: number;
  assignedEntityIds?: string[];
  priority: Priority;
  status: AssignmentStatus;
  description: string;
};

export type SupervisorProfile = {
  id: string;
  name: string;
  team: string;
  assignedLocations: string[];
  assignedProjects: string[];
  managedOfficers: number;
  status: "Active" | "Inactive" | "Suspended" | "On Leave";
  teamCompletionRate: number;
  teamDataQualityScore: number;
  teamCoverageRate: number;
  reviewSlaHours: number;
  approvalRate: number;
};

export type WorkPlan = {
  id: string;
  name: string;
  project: string;
  startDate: string;
  endDate: string;
  objectives: string;
  locations: string[];
  assignedTeams: string[];
  deliverables: string[];
  progress: number;
  view: "Calendar" | "Timeline" | "Gantt" | "Table";
};

export type OperationalTarget = {
  id: string;
  name: string;
  type: "Daily" | "Weekly" | "Monthly" | "Project";
  project: string;
  indicator: string;
  team: string;
  assignedStaff: string[];
  value: number;
  achieved: number;
  deadline: string;
};

export type FieldActivity = {
  id: string;
  actor: string;
  assignment: string;
  activityType: string;
  status: string;
  location: string;
  timestamp: string;
};

export type FieldOperationsSummary = {
  activeAssignments: number;
  assignedFieldOfficers: number;
  activeSupervisors: number;
  coverageProgress: number;
  dailyCollectionProgress: number;
  assignmentCompletionRate: number;
  teamProductivity: number;
  overdueAssignments: number;
  upcomingDeadlines: number;
};

const nowIso = new Date().toISOString();
const tomorrowIso = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
const nextWeekIso = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

export const fieldOperationsSections: {
  id: FieldOperationsSection;
  label: string;
  route: string;
  description: string;
}[] = [
  { id: "dashboard", label: "Overview", route: "/field-operations", description: "Today’s field execution, coverage, teams, deadlines, alerts, and performance." },
  { id: "assignments", label: "Assignments", route: "/field-operations/assignments", description: "Create, assign, monitor, reassign, pause, close, and bulk-manage field work." },
  { id: "field-officers", label: "Field Officers", route: "/field-operations/field-officers", description: "Manage enumerator access, status, sync health, performance, and assigned locations." },
  { id: "supervisors", label: "Supervisors", route: "/field-operations/supervisors", description: "Monitor supervisors, managed teams, review SLA, approvals, and coverage performance." },
  { id: "work-plans", label: "Work Plans", route: "/field-operations/work-plans", description: "Plan daily, weekly, and project field activities with objectives, teams, locations, and deliverables." },
  { id: "targets", label: "Targets", route: "/field-operations/targets", description: "Manage operational targets, deadlines, achievement rates, and trend signals." },
  { id: "field-monitoring", label: "Field Monitoring", route: "/field-operations/field-monitoring", description: "Monitor live activity, assignment progress, GPS status, sync health, quality alerts, and map readiness." },
];

export const previewOfficers: FieldOfficerRead[] = [
  {
    device_id: "android-field-7781",
    email: "amina.field@example.com",
    employee_code: "FO-128",
    full_name: "Amina Diallo",
    home_region: "Northwest",
    id: "officer-001",
    is_active: true,
    last_latitude: 5.9631,
    last_longitude: 10.1591,
    last_seen_at: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    last_sync_at: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    phone_number: "+237 600 000 121",
    user_id: "user-001",
  },
  {
    device_id: "android-field-8842",
    email: "joseph.field@example.com",
    employee_code: "FO-141",
    full_name: "Joseph Mbarga",
    home_region: "Littoral",
    id: "officer-002",
    is_active: true,
    last_latitude: 4.0511,
    last_longitude: 9.7679,
    last_seen_at: new Date(Date.now() - 51 * 60 * 1000).toISOString(),
    last_sync_at: new Date(Date.now() - 74 * 60 * 1000).toISOString(),
    phone_number: "+237 600 000 122",
    user_id: "user-002",
  },
  {
    device_id: null,
    email: "nora.field@example.com",
    employee_code: "FO-156",
    full_name: "Nora Talla",
    home_region: "West",
    id: "officer-003",
    is_active: false,
    last_latitude: null,
    last_longitude: null,
    last_seen_at: null,
    last_sync_at: null,
    phone_number: "+237 600 000 123",
    user_id: "user-003",
  },
];

export const previewAssignments: FieldAssignment[] = [
  {
    completedCount: 86,
    description: "Register farmers and confirm GPS evidence before baseline analysis.",
    endDate: nextWeekIso,
    assignedEntityIds: ["FRM-2026-000001", "BEN-2026-000044", "FRM-2026-000137"],
    assignmentType: "Form + Entity list",
    fieldOfficers: ["Amina Diallo", "Joseph Mbarga"],
    form: "Farmer Registration Form",
    id: "assignment-farmer-registration",
    location: "Northwest / Mezam",
    name: "Farmer registration sweep",
    priority: "High",
    project: "Agricultural Resilience Program",
    startDate: nowIso,
    status: "In Progress",
    supervisor: "Grace M.",
    targetCount: 120,
  },
  {
    completedCount: 42,
    description: "Collect school facility readiness data for district review.",
    endDate: tomorrowIso,
    assignedEntityIds: ["SCH-2026-000005"],
    assignmentType: "Form + Entity list",
    fieldOfficers: ["Nora Talla"],
    form: "School Facility Assessment",
    id: "assignment-school-facility",
    location: "Littoral / Wouri",
    name: "School facility assessment",
    priority: "Urgent",
    project: "Education Access Program",
    startDate: nowIso,
    status: "Overdue",
    supervisor: "Samuel K.",
    targetCount: 75,
  },
  {
    completedCount: 60,
    description: "Verify beneficiary household status before transfer release.",
    endDate: nextWeekIso,
    assignedEntityIds: ["HH-2026-000001", "BEN-2026-000044"],
    assignmentType: "Form + Entity list",
    fieldOfficers: ["Amina Diallo"],
    form: "Household Verification Form",
    id: "assignment-household-verification",
    location: "West / Mifi",
    name: "Household verification round",
    priority: "Normal",
    project: "Social Protection Response",
    startDate: nowIso,
    status: "Assigned",
    supervisor: "Grace M.",
    targetCount: 90,
  },
];

export const previewSupervisors: SupervisorProfile[] = [
  { approvalRate: 93, assignedLocations: ["Northwest", "West"], assignedProjects: ["Agricultural Resilience Program"], id: "supervisor-grace", managedOfficers: 12, name: "Grace M.", reviewSlaHours: 18, status: "Active", team: "Survey Team A", teamCompletionRate: 72, teamCoverageRate: 68, teamDataQualityScore: 87 },
  { approvalRate: 88, assignedLocations: ["Littoral"], assignedProjects: ["Education Access Program"], id: "supervisor-samuel", managedOfficers: 9, name: "Samuel K.", reviewSlaHours: 31, status: "Active", team: "Enumerator Team B", teamCompletionRate: 56, teamCoverageRate: 61, teamDataQualityScore: 79 },
];

export const previewWorkPlans: WorkPlan[] = [
  { assignedTeams: ["Survey Team A"], deliverables: ["120 farmer records", "GPS coverage map", "Daily supervisor review"], endDate: nextWeekIso, id: "workplan-registration", locations: ["Northwest", "West"], name: "Farmer registration sprint", objectives: "Complete farmer registration for baseline sampling frame.", progress: 72, project: "Agricultural Resilience Program", startDate: nowIso, view: "Timeline" },
  { assignedTeams: ["Enumerator Team B"], deliverables: ["75 school assessments", "Exception report", "Photo evidence"], endDate: tomorrowIso, id: "workplan-school", locations: ["Littoral"], name: "School readiness visits", objectives: "Verify facility readiness before district planning meeting.", progress: 56, project: "Education Access Program", startDate: nowIso, view: "Calendar" },
];

export const previewTargets: OperationalTarget[] = [
  { achieved: 86, assignedStaff: ["Amina Diallo", "Joseph Mbarga"], deadline: nextWeekIso, id: "target-households", indicator: "Households Registered", name: "120 farmer households", project: "Agricultural Resilience Program", team: "Survey Team A", type: "Weekly", value: 120 },
  { achieved: 42, assignedStaff: ["Nora Talla"], deadline: tomorrowIso, id: "target-schools", indicator: "Schools Assessed", name: "75 school assessments", project: "Education Access Program", team: "Enumerator Team B", type: "Daily", value: 75 },
  { achieved: 60, assignedStaff: ["Amina Diallo"], deadline: nextWeekIso, id: "target-beneficiaries", indicator: "Beneficiaries Verified", name: "90 household verifications", project: "Social Protection Response", team: "Survey Team A", type: "Project", value: 90 },
];

export const previewActivities: FieldActivity[] = [
  { activityType: "Submission synced", actor: "Amina Diallo", assignment: "Farmer registration sweep", id: "activity-1", location: "Mezam", status: "synced", timestamp: new Date(Date.now() - 9 * 60 * 1000).toISOString() },
  { activityType: "GPS evidence received", actor: "Joseph Mbarga", assignment: "Farmer registration sweep", id: "activity-2", location: "Wouri", status: "healthy", timestamp: new Date(Date.now() - 28 * 60 * 1000).toISOString() },
  { activityType: "Supervisor review overdue", actor: "Samuel K.", assignment: "School facility assessment", id: "activity-3", location: "Wouri", status: "attention", timestamp: new Date(Date.now() - 83 * 60 * 1000).toISOString() },
];

export const previewOperationsSummary: OperationsSummary = {
  active_programs: 3,
  beneficiaries: 1284,
  indicators: 18,
  offline_ready: true,
  open_cases: 4,
  quality_flags: 3,
  sync_health_percent: 91,
};
