import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  BookOpenCheck,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  ClipboardList,
  Clock,
  DatabaseZap,
  FileText,
  Gauge,
  HelpCircle,
  MapPinned,
  Network,
  Plus,
  ShieldCheck,
  Target,
  UploadCloud,
  UserRoundCheck,
  UserPlus,
  UsersRound,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

import { ActivityTimeline } from "@/components/ActivityTimeline";
import {
  ApprovalStatusChart,
  FormResponseChart,
} from "@/components/dashboard/DashboardCharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HelpHint } from "@/components/ui/help-hint";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusDot } from "@/components/ui/status-dot";
import {
  getOperationsSummary,
  listDataQualitySignals,
  listFieldOfficers,
  listFieldVisitRequests,
  listUsers,
  listForms,
  listSubmissions,
  type CurrentPrincipal,
} from "@/lib/api";
import {
  getActiveFormPerformance,
  getDashboardApprovalOverview,
  getDashboardCommandMetrics,
  getDashboardCoverageOverview,
  getDashboardQualityScore,
  getFormPerformanceTotals,
} from "@/lib/dashboard";
import { cn } from "@/lib/utils";
import { useWorkspaceStore, type WorkspaceView } from "@/stores/workspace";

const icons = [Activity, Clock, CheckCircle2, AlertTriangle];

type DashboardProps = {
  token: string | null;
  principal?: CurrentPrincipal | null;
};

type AttentionItem = readonly [
  item: string,
  count: string,
  sla: string,
  tone: "success" | "warning" | "danger" | "neutral",
  view: WorkspaceView,
  result: string,
];

type ManagementStep = {
  title: string;
  description: string;
  view: WorkspaceView;
  action: string;
  complete: boolean;
  icon: typeof Plus;
};

type RoleAction = {
  label: string;
  result: string;
  view: WorkspaceView;
};

type RoleGuidance = {
  title: string;
  badge: string;
  description: string;
  focus: string[];
  icon: typeof Plus;
  actions: RoleAction[];
};

type QualityWorkflowStep = {
  title: string;
  description: string;
  view: WorkspaceView;
  action: string;
  icon: typeof Plus;
};

type DashboardAlert = {
  detail: string;
  label: string;
  tone: "danger" | "neutral" | "success" | "warning";
  value: string;
  view: WorkspaceView;
};

function getRoleGuidance(principal?: CurrentPrincipal | null): RoleGuidance {
  const roles = new Set(
    (principal?.roles ?? []).map((role) => role.toLowerCase()),
  );

  if (principal?.platform_admin && !principal.support_mode) {
    return {
      title: "Platform owner",
      badge: "Super admin",
      description:
        "Manage organizations, support tenant setup, review platform readiness, and investigate production issues without acting as a normal tenant user.",
      focus: [
        "Check tenant readiness before support calls.",
        "Use support mode only for real troubleshooting.",
        "Review audit and runtime health before changing access.",
      ],
      icon: ShieldCheck,
      actions: [
        {
          label: "Open platform console",
          view: "platform",
          result:
            "Opening the platform console so you can manage tenants, support sessions, audit logs, and production readiness.",
        },
        {
          label: "Read operator guide",
          view: "help",
          result:
            "Opening the help guide for platform super admin responsibilities and safe support procedures.",
        },
      ],
    };
  }

  if (principal?.platform_admin && principal.support_mode) {
    return {
      title: "Tenant support operator",
      badge: "Support mode",
      description:
        "Troubleshoot this organization with a clear support purpose, keep tenant actions auditable, and return to the platform console when the issue is resolved.",
      focus: [
        "Confirm the tenant problem before changing records or settings.",
        "Use the same menu a tenant user sees to reproduce the issue.",
        "Document what was checked before leaving support mode.",
      ],
      icon: ShieldCheck,
      actions: [
        {
          label: "Check team access",
          view: "organizations",
          result:
            "Opening Team and access so support can confirm whether roles, scopes, and user status explain the tenant issue.",
        },
        {
          label: "Open help guide",
          view: "help",
          result:
            "Opening the help guide so support actions can stay aligned with documented tenant workflows.",
        },
      ],
    };
  }

  if (
    roles.has("organization_admin") ||
    roles.has("organization_owner") ||
    roles.has("org_admin")
  ) {
    return {
      title: "Organization setup owner",
      badge: "Admin",
      description:
        "Set up the operating structure so every user, project, form, import, and approval path has clear ownership.",
      focus: [
        "Invite users with the smallest role that fits their work.",
        "Complete readiness before large field deployment.",
        "Keep workflows simple enough for supervisors to follow.",
      ],
      icon: UserRoundCheck,
      actions: [
        {
          label: "Manage team access",
          view: "organizations",
          result:
            "Opening Team and access so you can invite users, assign roles, and confirm each person sees the correct workspace.",
        },
        {
          label: "Configure approvals",
          view: "workflows",
          result:
            "Opening approvals so you can define review stages, correction paths, and escalation ownership.",
        },
      ],
    };
  }

  if (roles.has("regional_manager") || roles.has("district_supervisor")) {
    return {
      title: "Regional operations lead",
      badge: "Supervisor",
      description:
        "Monitor field coverage, officer readiness, review queues, corrections, and location evidence for your assigned area.",
      focus: [
        "Start with review and sync exceptions.",
        "Check field officer status before assigning new work.",
        "Use maps to confirm coverage gaps and GPS quality.",
      ],
      icon: Network,
      actions: [
        {
          label: "Review submissions",
          view: "submissions",
          result:
            "Opening the review queue so supervisors can approve clean records and return unclear records with specific correction notes.",
        },
        {
          label: "Check field team",
          view: "officers",
          result:
            "Opening field teams so you can confirm officer assignments, sync health, device status, and deployment coverage.",
        },
      ],
    };
  }

  if (roles.has("me_manager") || roles.has("project_manager")) {
    return {
      title: "M&E management lead",
      badge: "M&E",
      description:
        "Connect programs, indicators, collection forms, reviewed submissions, and reports into a credible monitoring workflow.",
      focus: [
        "Define indicators before reporting begins.",
        "Connect forms to the right project and data source.",
        "Report from approved data, not raw submissions.",
      ],
      icon: Target,
      actions: [
        {
          label: "Manage indicators",
          view: "indicators",
          result:
            "Opening indicators so you can confirm baselines, targets, data sources, formulas, and reporting periods.",
        },
        {
          label: "Open reports",
          view: "analytics",
          result:
            "Opening reports so approved data can be reviewed against indicators and management questions.",
        },
      ],
    };
  }

  if (roles.has("data_reviewer") || roles.has("data_analyst")) {
    return {
      title: "Data quality reviewer",
      badge: "Data",
      description:
        "Protect data quality by checking evidence, resolving import issues, documenting review decisions, and exporting only trusted records.",
      focus: [
        "Fix validation and duplicate issues before analysis.",
        "Write correction notes that field officers can act on.",
        "Keep exports traceable to approved records.",
      ],
      icon: DatabaseZap,
      actions: [
        {
          label: "Open data tools",
          view: "data",
          result:
            "Opening Data tools so you can import, validate, deduplicate, and export governed datasets.",
        },
        {
          label: "Open review queue",
          view: "submissions",
          result:
            "Opening submissions so you can inspect evidence, add reviewer comments, and apply the correct decision.",
        },
      ],
    };
  }

  if (roles.has("field_officer") || roles.has("collector")) {
    return {
      title: "Field collection user",
      badge: "Field",
      description:
        "Use assigned forms, collect complete evidence, save safely offline, and sync work as soon as connectivity is available.",
      focus: [
        "Use only forms assigned to your project or area.",
        "Capture required GPS, photos, signatures, and notes.",
        "Respond quickly when corrections are requested.",
      ],
      icon: ClipboardList,
      actions: [
        {
          label: "Open forms",
          view: "forms",
          result:
            "Opening forms so field users can find assigned collection tools and complete records correctly.",
        },
        {
          label: "Check sync",
          view: "connectivity",
          result:
            "Opening sync health so offline work can be uploaded and retry issues can be resolved.",
        },
      ],
    };
  }

  return {
    title: "Workspace user",
    badge: "Role-based",
    description:
      "Use your assigned menu items to complete the next operational task and ask an administrator for access if an expected workspace is missing.",
    focus: [
      "Start from Dashboard to understand active form activity and priorities.",
      "Follow the guided setup or review task shown on screen.",
      "Use Help when a workflow or status is unclear.",
    ],
    icon: BookOpenCheck,
    actions: [
      {
        label: "Open help guide",
        view: "help",
        result:
          "Opening the help guide so you can understand the workflow connected to your account permissions.",
      },
    ],
  };
}

export function Dashboard({ token, principal }: DashboardProps) {
  const [dashboardResult, setDashboardResult] = useState("");
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [learnOpenOverride, setLearnOpenOverride] = useState<boolean | null>(
    null,
  );
  const setActiveView = useWorkspaceStore((state) => state.setActiveView);
  const setLastActionResult = useWorkspaceStore(
    (state) => state.setLastActionResult,
  );
  const localAssignments = useWorkspaceStore((state) => state.localAssignments);
  const localForms = useWorkspaceStore((state) => state.localForms);
  const localProjects = useWorkspaceStore((state) => state.localProjects);
  const pushToast = useWorkspaceStore((state) => state.pushToast);
  const preview = !token || token === "preview-token";
  const summaryQuery = useQuery({
    queryKey: ["operations-summary", token],
    queryFn: () => getOperationsSummary(token ?? ""),
    enabled: Boolean(token && !preview),
  });
  const formsQuery = useQuery({
    queryKey: ["dashboard-forms", token],
    queryFn: () => listForms(token ?? ""),
    enabled: Boolean(token && !preview),
  });
  const submissionsQuery = useQuery({
    queryKey: ["dashboard-submissions", token],
    queryFn: () => listSubmissions(token ?? ""),
    enabled: Boolean(token && !preview),
  });
  const usersQuery = useQuery({
    queryKey: ["dashboard-users", token],
    queryFn: () => listUsers(token ?? ""),
    enabled: Boolean(token && !preview),
  });
  const fieldOfficersQuery = useQuery({
    queryKey: ["dashboard-field-officers", token],
    queryFn: () => listFieldOfficers(token ?? ""),
    enabled: Boolean(token && !preview),
  });
  const visitRequestsQuery = useQuery({
    queryKey: ["dashboard-visit-requests", token],
    queryFn: () => listFieldVisitRequests(token ?? ""),
    enabled: Boolean(token && !preview),
  });
  const qualitySignalsQuery = useQuery({
    queryKey: ["dashboard-quality-signals", token],
    queryFn: () => listDataQualitySignals(token ?? "", { status: "open" }),
    enabled: Boolean(token && !preview),
  });
  const dashboardForms = formsQuery.data ?? [];
  const dashboardSubmissions = submissionsQuery.data ?? [];
  const dashboardUsers = usersQuery.data ?? [];
  const dashboardFieldOfficers = fieldOfficersQuery.data ?? [];
  const dashboardVisitRequests = visitRequestsQuery.data ?? [];
  const dashboardQualitySignals = qualitySignalsQuery.data ?? [];
  const draftForms = dashboardForms.filter(
    (form) => form.is_active && form.status.toLowerCase() !== "published",
  );
  const formPerformance = getActiveFormPerformance(
    dashboardForms,
    dashboardSubmissions,
  );
  const selectedForm =
    formPerformance.find((item) => item.form.id === selectedFormId) ??
    formPerformance[0] ??
    null;
  const formPerformanceTotals = getFormPerformanceTotals(formPerformance);
  const formResponseChartData = formPerformance
    .filter((item) => item.totalSubmissions > 0)
    .slice(0, 6)
    .map((item) => ({
      name:
        item.form.name.length > 22
          ? `${item.form.name.slice(0, 21)}…`
          : item.form.name,
      responses: item.totalSubmissions,
    }));
  const formStatsLoading = formsQuery.isLoading || submissionsQuery.isLoading;
  const dashboardLoading =
    summaryQuery.isLoading ||
    formsQuery.isLoading ||
    submissionsQuery.isLoading ||
    fieldOfficersQuery.isLoading ||
    visitRequestsQuery.isLoading ||
    qualitySignalsQuery.isLoading;
  const summaryMetrics = summaryQuery.data
    ? [
        {
          label: "Entities",
          value: summaryQuery.data.beneficiaries.toLocaleString(),
          delta: "live",
          tone: "good" as const,
        },
        {
          label: "Active programs",
          value: summaryQuery.data.active_programs.toLocaleString(),
          delta: "live",
          tone: "good" as const,
        },
        {
          label: "Indicators",
          value: summaryQuery.data.indicators.toLocaleString(),
          delta: "live",
          tone: "good" as const,
        },
        {
          label: "Open cases",
          value: summaryQuery.data.open_cases.toLocaleString(),
          delta: "needs review",
          tone: summaryQuery.data.open_cases
            ? ("warn" as const)
            : ("good" as const),
        },
      ]
    : [
        {
          label: "Entities",
          value: "0",
          delta: summaryQuery.isLoading ? "loading" : "not started",
          tone: "neutral" as const,
        },
        {
          label: "Active programs",
          value: "0",
          delta: summaryQuery.isLoading ? "loading" : "not started",
          tone: "neutral" as const,
        },
        {
          label: "Indicators",
          value: "0",
          delta: summaryQuery.isLoading ? "loading" : "not started",
          tone: "neutral" as const,
        },
        {
          label: "Open cases",
          value: "0",
          delta: summaryQuery.isLoading ? "loading" : "clear",
          tone: "good" as const,
        },
      ];
  const hasFormActivity = Boolean(
    formPerformance.length ||
    formPerformanceTotals.submissions ||
    (preview && (localForms.length || localAssignments.length)),
  );
  const hasOperationalData = Boolean(
    hasFormActivity ||
    (preview && localProjects.length) ||
    (summaryQuery.data &&
      (summaryQuery.data.beneficiaries ||
        summaryQuery.data.active_programs ||
        summaryQuery.data.indicators ||
        summaryQuery.data.open_cases ||
        summaryQuery.data.quality_flags)),
  );
  const learnExpanded = learnOpenOverride ?? !hasOperationalData;
  const setupSteps: ManagementStep[] = [
    {
      title: "Create team access",
      description:
        "Invite managers, reviewers, field officers, and admins with practical roles and scopes.",
      view: "organizations",
      action: "Open Team and access",
      complete: false,
      icon: UserPlus,
    },
    {
      title: "Create programs",
      description:
        "Add projects, donors, regions, milestones, and reporting ownership.",
      view: "programs",
      action: "Open Projects",
      complete: Boolean(
        summaryQuery.data?.active_programs || localProjects.length,
      ),
      icon: Network,
    },
    {
      title: "Create surveys",
      description:
        "Create baseline, registration, monitoring, verification, or evaluation surveys inside each project before building forms.",
      view: "surveys",
      action: "Open Surveys",
      complete: hasOperationalData,
      icon: ClipboardList,
    },
    {
      title: "Add indicators",
      description:
        "Define baselines, targets, survey data sources, and reporting periods for M&E tracking.",
      view: "indicators",
      action: "Open Indicators",
      complete: Boolean(summaryQuery.data?.indicators),
      icon: Target,
    },
    {
      title: "Import existing data",
      description:
        "Bring entities, regions, officers, indicators, or historical records into the system.",
      view: "data",
      action: "Open Data tools",
      complete: Boolean(summaryQuery.data?.beneficiaries),
      icon: DatabaseZap,
    },
    {
      title: "Publish first form",
      description:
        "Open the form builder, choose a categorized template or blank canvas, customize labels and validation, then assign it to field teams.",
      view: "forms",
      action: "Open Form builder",
      complete: hasOperationalData,
      icon: ClipboardList,
    },
  ];
  const completedSetupSteps = setupSteps.filter((step) => step.complete).length;
  const setupProgress = Math.round(
    (completedSetupSteps / setupSteps.length) * 100,
  );
  const nextSetupStep =
    setupSteps.find((step) => !step.complete) ??
    setupSteps[setupSteps.length - 1];
  const roleGuidance = getRoleGuidance(principal);
  const RoleGuidanceIcon = roleGuidance.icon;
  const accountLabel =
    principal?.full_name?.trim() ||
    principal?.email?.trim() ||
    "Current workspace user";
  const accountScope = principal?.support_mode
    ? "Platform support session"
    : principal?.scope_type
      ? `${principal.scope_type.replaceAll("_", " ")} scope`
      : principal?.platform_admin
        ? "Platform access"
        : "Organization access";
  const dataQualityStatus = summaryQuery.data?.quality_flags
    ? "Needs review"
    : hasOperationalData
      ? "Clean"
      : "Not started";
  const managementHealth = [
    {
      label: "Setup readiness",
      value: `${setupProgress}%`,
      status:
        setupProgress >= 80
          ? "Ready"
          : setupProgress >= 40
            ? "In progress"
            : "Needs setup",
      tone:
        setupProgress >= 80
          ? ("success" as const)
          : setupProgress >= 40
            ? ("warning" as const)
            : ("neutral" as const),
      detail: `${completedSetupSteps} of ${setupSteps.length} core setup steps complete.`,
    },
    {
      label: "Data quality",
      value: summaryQuery.data?.quality_flags?.toLocaleString() ?? "0",
      status: dataQualityStatus,
      tone: summaryQuery.data?.quality_flags
        ? ("warning" as const)
        : hasOperationalData
          ? ("success" as const)
          : ("neutral" as const),
      detail: summaryQuery.data?.quality_flags
        ? "Resolve validation issues before reporting."
        : "No open quality flags from live summary.",
    },
    {
      label: "M&E reporting",
      value: summaryQuery.data?.indicators?.toLocaleString() ?? "0",
      status: summaryQuery.data?.indicators ? "Trackable" : "Needs indicators",
      tone: summaryQuery.data?.indicators
        ? ("success" as const)
        : ("neutral" as const),
      detail:
        "Indicators connect field data to targets, progress, and donor reporting.",
    },
    {
      label: "Sync readiness",
      value: summaryQuery.data
        ? `${summaryQuery.data.sync_health_percent}%`
        : "0%",
      status: summaryQuery.data?.offline_ready
        ? "Offline ready"
        : "Prepare devices",
      tone: summaryQuery.data?.offline_ready
        ? ("success" as const)
        : ("warning" as const),
      detail:
        "Offline readiness protects field collection when internet is unreliable.",
    },
  ];
  const managerQuestions = [
    {
      question: "Who can do the work?",
      answer:
        "Invite users, assign roles, and limit access by project, region, district, or own records.",
      view: "organizations" as WorkspaceView,
    },
    {
      question: "What will we measure?",
      answer:
        "Create indicators with targets, baselines, survey data sources, and reporting periods.",
      view: "indicators" as WorkspaceView,
    },
    {
      question: "Which survey is this work for?",
      answer:
        "Use Survey Management to connect each form, enumerator, submission, indicator, and report to the right M&E activity.",
      view: "surveys" as WorkspaceView,
    },
    {
      question: "Is the data safe to use?",
      answer:
        "Use Data tools to preview imports, fix row issues, detect duplicates, and export clean records.",
      view: "data" as WorkspaceView,
    },
    {
      question: "What needs action today?",
      answer:
        "Use submissions, cases, sync health, and quality flags to decide the next management action.",
      view: "submissions" as WorkspaceView,
    },
  ];
  const qualityWorkflow: QualityWorkflowStep[] = [
    {
      title: "Prevent bad data",
      description:
        "Create the survey first, then use form validation, required evidence, clear labels, and mobile preview before publishing.",
      view: "surveys",
      action: "Set survey context",
      icon: ClipboardList,
    },
    {
      title: "Detect issues early",
      description:
        "Watch quality flags, sync gaps, duplicate records, and incomplete imports before managers report figures.",
      view: "data",
      action: "Open quality tools",
      icon: DatabaseZap,
    },
    {
      title: "Correct with evidence",
      description:
        "Return records with a precise note when field teams can fix the problem, or reject records that should not move forward.",
      view: "submissions",
      action: "Review evidence",
      icon: ShieldCheck,
    },
    {
      title: "Report only approved data",
      description:
        "Use reports after submissions, imports, and indicators have passed the agreed review path.",
      view: "analytics",
      action: "Open reports",
      icon: BarChart3,
    },
  ];
  const quickActions: {
    label: string;
    hint: string;
    result: string;
    view: WorkspaceView;
    icon: typeof Plus;
  }[] = [
    {
      label: "Create survey",
      hint: "Set the M&E activity before forms",
      result:
        "Opening Survey Management. Select the project, create the survey, then build forms and assign enumerators inside that survey.",
      view: "surveys",
      icon: Plus,
    },
    {
      label: "Review submissions",
      hint: "Approve, reject, or request corrections",
      result:
        "Opening the review queue. Start with submissions under review, add a reviewer comment, then approve or request corrections.",
      view: "submissions",
      icon: ShieldCheck,
    },
    {
      label: "Invite officer",
      hint: "Add someone to the field team",
      result:
        "Opening field teams. Invite an officer, assign their region, and check sync/device status after they start collecting.",
      view: "officers",
      icon: UserPlus,
    },
    {
      label: "Import data",
      hint: "Upload spreadsheets and fix issues",
      result:
        "Opening data tools. Upload a file, save mappings, fix validation issues, and apply clean records to the registry.",
      view: "data",
      icon: UploadCloud,
    },
    {
      label: "Read help guide",
      hint: "Learn how to use the platform",
      result:
        "Opening the help guide. Use the beginner walkthroughs to understand forms, collection, review, data, reports, and admin workflows.",
      view: "help",
      icon: HelpCircle,
    },
  ];
  const attentionItems: AttentionItem[] = hasOperationalData
    ? [
        [
          "Open cases need follow-up",
          `${summaryQuery.data?.open_cases ?? 0} cases`,
          "Open cases",
          (summaryQuery.data?.open_cases ?? 0) ? "warning" : "success",
          "cases",
          "Opening cases so managers can review follow-ups and close resolved work.",
        ],
        [
          "Data quality flags",
          `${summaryQuery.data?.quality_flags ?? 0} flags`,
          "Check data",
          (summaryQuery.data?.quality_flags ?? 0) ? "danger" : "success",
          "data",
          "Opening data tools so validation flags can be checked and resolved.",
        ],
        [
          "Reporting baseline",
          `${summaryQuery.data?.indicators ?? 0} indicators`,
          "Track indicators",
          "neutral",
          "indicators",
          "Opening indicators so the team can confirm targets, baselines, and current progress.",
        ],
      ]
    : [
        [
          "Set up team access",
          "No users imported yet",
          "Invite or import",
          "neutral",
          "organizations",
          "Opening Team and access so you can invite managers, reviewers, and field officers.",
        ],
        [
          "Bring existing records",
          "No data imported yet",
          "Upload file",
          "neutral",
          "data",
          "Opening Data tools so you can upload CSV or Excel files and review mappings before applying records.",
        ],
        [
          "Prepare first collection form",
          "No submissions yet",
          "Create survey",
          "neutral",
          "surveys",
          "Opening Survey Management so you can create the first survey before adding mobile-ready forms.",
        ],
      ];
  const activeProjectCount =
    (summaryQuery.data?.active_programs ??
      new Set(
        dashboardForms
          .map((form) => form.project_id)
          .filter((projectId): projectId is string => Boolean(projectId)),
      ).size) +
    (preview
      ? new Set(
          [
            ...localProjects.map((project) => project.name),
            ...localForms.map((form) => form.project_name),
            ...localAssignments.map((assignment) => assignment.project),
          ].filter(Boolean),
        ).size
      : 0);
  const liveFieldOfficerUsers = dashboardUsers.filter((user) =>
    ["field_officer", "collector", "enumerator"].includes((user.role_name ?? "").toLowerCase()),
  ).length;
  const fieldOfficerActivity = liveFieldOfficerUsers || (
    new Set(
      dashboardSubmissions
        .map((submission) => submission.field_officer_id)
        .filter(Boolean),
    ).size +
    (preview ? new Set(localAssignments.flatMap((assignment) => assignment.fieldOfficers)).size : 0)
  );
  const coverageOverview = getDashboardCoverageOverview(dashboardSubmissions);
  const approvalOverview = getDashboardApprovalOverview(
    dashboardSubmissions,
    formPerformanceTotals,
  );
  const reviewCompletionPercent = approvalOverview.total
    ? Math.round(
        ((approvalOverview.approved +
          approvalOverview.rejected +
          approvalOverview.returned) /
          approvalOverview.total) *
          100,
      )
    : 0;
  const syncProgressPercent = dashboardSubmissions.length
    ? Math.round(
        (formPerformanceTotals.syncedRecords / dashboardSubmissions.length) *
          100,
      )
    : 0;
  const dashboardQualityScore = getDashboardQualityScore(
    summaryQuery.data,
    formPerformanceTotals,
  );
  const commandMetrics = getDashboardCommandMetrics({
    activeForms:
      formPerformance.length +
      (preview
        ? localForms.filter(
            (form) => form.status === "published" || form.active_assignments > 0,
          ).length
        : 0),
    activeProjects: activeProjectCount,
    coveragePercent: coverageOverview.coveragePercent,
    fieldOfficers: fieldOfficerActivity,
    indicators: summaryQuery.data?.indicators ?? 0,
    pendingReviews: formPerformanceTotals.pendingReview,
    qualityScore: dashboardQualityScore,
    totalSubmissions:
      dashboardSubmissions.length || formPerformanceTotals.submissions,
  });
  const commandMetricViews: WorkspaceView[] = [
    "programs",
    "forms",
    "submissions",
    "submissions",
    "dataQuality",
    "map",
    "officers",
    "indicators",
  ];
  const commandMetricIcons: (typeof Plus)[] = [
    Network,
    ClipboardList,
    DatabaseZap,
    ClipboardCheck,
    ShieldCheck,
    MapPinned,
    UsersRound,
    Target,
  ];
  const nowMs = Date.now();
  const staleSyncThresholdMs = 48 * 60 * 60 * 1000;
  const activeOfficerCount =
    dashboardFieldOfficers.filter((officer) => officer.is_active).length ||
    fieldOfficerActivity;
  const recentlySeenOfficerCount = dashboardFieldOfficers.filter((officer) => {
    const seenValue = officer.last_seen_at ?? officer.last_sync_at;
    if (!seenValue) return false;
    const seenMs = new Date(seenValue).getTime();
    return Number.isFinite(seenMs) && nowMs - seenMs <= staleSyncThresholdMs;
  }).length;
  const staleSyncCount = dashboardFieldOfficers.filter((officer) => {
    if (!officer.is_active) return false;
    if (!officer.last_sync_at) return true;
    const syncMs = new Date(officer.last_sync_at).getTime();
    return !Number.isFinite(syncMs) || nowMs - syncMs > staleSyncThresholdMs;
  }).length;
  const roleProfileCount = dashboardUsers.reduce(
    (total, user) => total + (user.operational_profiles?.length ?? 0),
    0,
  );
  const pendingVisitRequests = dashboardVisitRequests.filter((request) =>
    ["pending", "change_requested"].includes(request.status.toLowerCase()),
  ).length;
  const activeVisitRequests = dashboardVisitRequests.filter((request) =>
    ["approved", "scheduled", "checked_in"].includes(request.status.toLowerCase()),
  ).length;
  const openQualitySignalCount =
    dashboardQualitySignals.length || summaryQuery.data?.quality_flags || 0;
  const pendingManagerActions =
    approvalOverview.pending +
    pendingVisitRequests +
    openQualitySignalCount +
    staleSyncCount;
  const managerCommandCards: {
    action: string;
    detail: string;
    icon: typeof Plus;
    label: string;
    result: string;
    tone: "accent" | "danger" | "neutral" | "success" | "warning";
    value: string;
    view: WorkspaceView;
  }[] = [
    {
      action: "Open field operations",
      detail: `${activeOfficerCount.toLocaleString()} active officer(s), ${recentlySeenOfficerCount.toLocaleString()} seen or synced recently.`,
      icon: UsersRound,
      label: "Field officer activity",
      result: "Opening Field Operations so managers can review officer status, assignments, devices, and latest field activity.",
      tone: activeOfficerCount ? "accent" : "neutral",
      value: activeOfficerCount.toLocaleString(),
      view: "officers",
    },
    {
      action: "Review role profiles",
      detail: `${roleProfileCount.toLocaleString()} operational role profile(s) generated from users and stacked roles.`,
      icon: UserRoundCheck,
      label: "Role profiles",
      result: "Opening Users & Teams so managers can review role profiles, responsibilities, scopes, and account controls.",
      tone: roleProfileCount ? "success" : "neutral",
      value: roleProfileCount.toLocaleString(),
      view: "organizations",
    },
    {
      action: "Check sync health",
      detail: staleSyncCount ? `${staleSyncCount.toLocaleString()} active officer(s) have stale or missing sync.` : "No stale sync signal from active officers.",
      icon: DatabaseZap,
      label: "Sync health",
      result: "Opening sync and connectivity tools so managers can inspect pending uploads, failed syncs, and device readiness.",
      tone: staleSyncCount ? "warning" : "success",
      value: staleSyncCount ? `${staleSyncCount} stale` : `${summaryQuery.data?.sync_health_percent ?? syncProgressPercent}%`,
      view: "connectivity",
    },
    {
      action: "Open approvals",
      detail: `${approvalOverview.pending.toLocaleString()} submission(s) waiting for approval or review.`,
      icon: ClipboardCheck,
      label: "Pending approvals",
      result: "Opening Submissions so reviewers can approve, return, reject, or archive records before they count.",
      tone: approvalOverview.pending ? "warning" : "success",
      value: approvalOverview.pending.toLocaleString(),
      view: "submissions",
    },
    {
      action: "Review visits",
      detail: `${pendingVisitRequests.toLocaleString()} visit request(s) need supervisor action, ${activeVisitRequests.toLocaleString()} are approved or underway.`,
      icon: MapPinned,
      label: "Visit requests",
      result: "Opening Field Operations so supervisors can approve visit requests and verify check-in evidence.",
      tone: pendingVisitRequests ? "warning" : activeVisitRequests ? "accent" : "neutral",
      value: pendingVisitRequests.toLocaleString(),
      view: "officers",
    },
    {
      action: "Resolve quality issues",
      detail: `${openQualitySignalCount.toLocaleString()} open quality issue(s), flags, or reconciliation risks need attention.`,
      icon: AlertTriangle,
      label: "Data quality issues",
      result: "Opening Data Quality so managers can resolve duplicates, GPS issues, missing data, outliers, and conflicts.",
      tone: openQualitySignalCount ? "danger" : "success",
      value: openQualitySignalCount.toLocaleString(),
      view: "dataQuality",
    },
    {
      action: "Open coverage maps",
      detail: `${coverageOverview.coveragePercent}% GPS coverage across ${coverageOverview.totalSubmissions.toLocaleString()} submitted record(s).`,
      icon: Gauge,
      label: "Project coverage",
      result: "Opening Mapping so managers can inspect project coverage, entity locations, GPS evidence, and collection gaps.",
      tone: coverageOverview.coveragePercent >= 80 ? "success" : coverageOverview.coveragePercent ? "warning" : "neutral",
      value: `${coverageOverview.coveragePercent}%`,
      view: "map",
    },
  ];
  const possibleAlerts: Array<DashboardAlert | null> = [
    formPerformanceTotals.pendingReview
      ? {
          detail: "Review queue has records waiting for a decision.",
          label: "Pending reviews",
          tone: "warning" as const,
          value: formPerformanceTotals.pendingReview.toLocaleString(),
          view: "submissions" as const,
        }
      : null,
    summaryQuery.data?.quality_flags
      ? {
          detail: "Resolve quality flags before reports use this data.",
          label: "Quality flags",
          tone: "danger" as const,
          value: summaryQuery.data.quality_flags.toLocaleString(),
          view: "dataQuality" as const,
        }
      : null,
    summaryQuery.data?.open_cases
      ? {
          detail: "Cases need assignment, follow-up, or closure.",
          label: "Open cases",
          tone: "warning" as const,
          value: summaryQuery.data.open_cases.toLocaleString(),
          view: "submissions" as const,
        }
      : null,
    formPerformanceTotals.offlineRecords
      ? {
          detail: "Some records were collected offline and need sync review.",
          label: "Offline records",
          tone: "neutral" as const,
          value: formPerformanceTotals.offlineRecords.toLocaleString(),
          view: "officers" as const,
        }
      : null,
    draftForms.length
      ? {
          detail: "Draft forms exist and may need testing or publishing.",
          label: "Draft forms",
          tone: "neutral" as const,
          value: draftForms.length.toLocaleString(),
          view: "forms" as const,
        }
      : null,
  ];
  const recentAlerts = possibleAlerts.filter((alert): alert is DashboardAlert =>
    Boolean(alert),
  );
  const possibleActionQueueItems: {
    count: number;
    label: string;
    result: string;
    tone: "danger" | "warning" | "neutral";
    view: WorkspaceView;
  }[] = [
    {
      count: approvalOverview.pending,
      label: "submissions awaiting review",
      result:
        "Opening the review queue so you can approve, return, or reject waiting records.",
      tone: "warning",
      view: "submissions",
    },
    {
      count: openQualitySignalCount,
      label: "open data quality issues",
      result:
        "Opening Data Quality so duplicates, GPS issues, and validation failures can be resolved.",
      tone: "danger",
      view: "dataQuality",
    },
    {
      count: pendingVisitRequests,
      label: "visit requests need supervisor action",
      result:
        "Opening Field Operations so supervisors can approve or reschedule visit requests.",
      tone: "warning",
      view: "officers",
    },
    {
      count: staleSyncCount,
      label: "officers with stale or missing sync",
      result:
        "Opening sync monitoring so pending uploads and offline devices can be checked.",
      tone: "warning",
      view: "connectivity",
    },
    {
      count: summaryQuery.data?.open_cases ?? 0,
      label: "open cases need follow-up",
      result:
        "Opening cases so follow-ups can be assigned, progressed, or closed.",
      tone: "warning",
      view: "cases",
    },
    {
      count: draftForms.length,
      label: "draft forms waiting to publish",
      result:
        "Opening Forms so drafts can be tested and published for field collection.",
      tone: "neutral",
      view: "forms",
    },
  ];
  const actionQueueItems = possibleActionQueueItems.filter(
    (item) => item.count > 0,
  );

  function openView(action: {
    label: string;
    result: string;
    view: WorkspaceView;
  }): void {
    setDashboardResult(action.result);
    setLastActionResult(action.result);
    pushToast({
      title: action.label,
      description: action.result,
      tone: "success",
    });
    setActiveView(action.view);
  }

  function handleAttention(
    item: string,
    view: WorkspaceView,
    result: string,
  ): void {
    setDashboardResult(result);
    setLastActionResult(result);
    pushToast({ title: item, description: result, tone: "warning" });
    setActiveView(view);
  }

  function openSetupStep(step: ManagementStep): void {
    const result = `${step.title}: ${step.description}`;
    setDashboardResult(result);
    setLastActionResult(result);
    pushToast({
      title: step.action,
      description: result,
      tone: step.complete ? "success" : "neutral",
    });
    setActiveView(step.view);
  }

  function openQualityStep(step: QualityWorkflowStep): void {
    const result = `${step.title}: ${step.description}`;
    setDashboardResult(result);
    setLastActionResult(result);
    pushToast({
      title: step.action,
      description: result,
      tone: "neutral",
    });
    setActiveView(step.view);
  }

  return (
    <section aria-labelledby="dashboard-title" className="space-y-6">
      <section
        className="surface-premium rounded-2xl p-5 md:p-6"
        aria-labelledby="dashboard-title"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Command dashboard
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <h1
                id="dashboard-title"
                className="text-3xl font-semibold tracking-tight"
              >
                Operations, quality, approvals, and coverage
              </h1>
              <HelpHint
                label="About the command dashboard"
                title="Command dashboard"
              >
                The first screen follows the platform architecture: projects,
                forms, submissions, reviews, data quality, field activity,
                indicators, alerts, approvals, and map readiness.
              </HelpHint>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() =>
                handleAttention(
                  "Review queue",
                  "submissions",
                  "Opening the review queue so you can approve clean records, request corrections, or reject poor submissions.",
                )
              }
              type="button"
              variant="primary"
            >
              Review queue
              <ArrowUpRight aria-hidden="true" />
            </Button>
            <Button
              onClick={() =>
                openView({
                  label: "Open map overview",
                  result:
                    "Opening Mapping so managers can inspect project, submission, entity, coverage, and quality maps.",
                  view: "map",
                })
              }
              type="button"
              variant="secondary"
            >
              Map overview
            </Button>
          </div>
        </div>

        {!dashboardLoading ? (
          <section
            aria-label="Needs your attention today"
            className="mt-5 rounded-2xl border bg-background/80 p-4 shadow-line"
          >
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Needs you today
              </p>
              <Badge tone={actionQueueItems.length ? "warning" : "success"}>
                {actionQueueItems.length
                  ? `${actionQueueItems.reduce((total, item) => total + item.count, 0).toLocaleString()} item(s)`
                  : "All caught up"}
              </Badge>
            </div>
            {actionQueueItems.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {actionQueueItems.map((item) => (
                  <button
                    className="flex items-center gap-2 rounded-xl border bg-panel px-3 py-2 text-left text-sm transition hover:-translate-y-0.5 hover:border-primary/35 hover:bg-primary/5 hover:shadow-elevated"
                    key={item.label}
                    onClick={() =>
                      handleAttention(item.label, item.view, item.result)
                    }
                    type="button"
                  >
                    <Badge tone={item.tone}>{item.count.toLocaleString()}</Badge>
                    <span className="font-medium">{item.label}</span>
                    <ArrowUpRight
                      aria-hidden="true"
                      className="text-muted-foreground"
                      size={14}
                    />
                  </button>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                No reviews, quality issues, visit requests, or sync problems are
                waiting on you right now.
              </p>
            )}
          </section>
        ) : null}

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {dashboardLoading
            ? Array.from({ length: 8 }).map((_, index) => (
                <div
                  className="rounded-2xl border bg-background/80 p-4"
                  key={index}
                >
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="mt-3 h-8 w-1/2" />
                  <Skeleton className="mt-3 h-10 w-full" />
                </div>
              ))
            : commandMetrics.map((metric, index) => {
                const Icon = commandMetricIcons[index] ?? Gauge;
                const view = commandMetricViews[index] ?? "dashboard";

                return (
                  <button
                    className="group rounded-2xl border bg-background/80 p-4 text-left shadow-line transition hover:-translate-y-0.5 hover:border-primary/35 hover:bg-primary/5 hover:shadow-elevated"
                    key={metric.label}
                    onClick={() =>
                      openView({
                        label: metric.label,
                        result: `${metric.label}: ${metric.detail}`,
                        view,
                      })
                    }
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                          {metric.label}
                        </p>
                        <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">
                          {metric.value}
                        </p>
                      </div>
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-panel text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                        <Icon aria-hidden="true" size={18} />
                      </span>
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">
                        {metric.detail}
                      </p>
                      <Badge className="shrink-0" tone={metric.tone}>
                        Open
                      </Badge>
                    </div>
                  </button>
                );
              })}
        </div>

        <section
          aria-labelledby="manager-command-center-title"
          className="mt-5 rounded-2xl border bg-panel p-4 shadow-line"
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="support">Manager command center</Badge>
                <Badge tone={pendingManagerActions ? "warning" : "success"}>
                  {pendingManagerActions
                    ? `${pendingManagerActions.toLocaleString()} action(s)`
                    : "No urgent action"}
                </Badge>
              </div>
              <h2
                className="mt-2 text-lg font-semibold tracking-tight"
                id="manager-command-center-title"
              >
                What needs management attention today
              </h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
                One place to review field officer activity, role profiles, sync
                health, approvals, visit requests, data quality issues, and
                project coverage before work slows down in the field.
              </p>
            </div>
            <Button
              onClick={() =>
                openView({
                  label: pendingManagerActions
                    ? "Open urgent management work"
                    : "Open field operations",
                  result: pendingManagerActions
                    ? "Opening Submissions first because pending approvals, visit requests, quality flags, or stale sync items need management action."
                    : "Opening Field Operations so managers can inspect field officers, assignments, devices, visits, and readiness.",
                  view: pendingManagerActions ? "submissions" : "officers",
                })
              }
              type="button"
              variant={pendingManagerActions ? "primary" : "secondary"}
            >
              {pendingManagerActions ? "Open priority work" : "Open operations"}
              <ArrowUpRight aria-hidden="true" />
            </Button>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-7">
            {dashboardLoading
              ? Array.from({ length: 7 }).map((_, index) => (
                  <div
                    className="rounded-xl border bg-background/80 p-3"
                    key={index}
                  >
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="mt-3 h-7 w-1/2" />
                    <Skeleton className="mt-3 h-12 w-full" />
                  </div>
                ))
              : managerCommandCards.map((card) => {
                  const Icon = card.icon;

                  return (
                    <button
                      className="group flex min-h-[156px] flex-col justify-between rounded-xl border bg-background/80 p-3 text-left shadow-line transition hover:-translate-y-0.5 hover:border-primary/35 hover:bg-primary/5 hover:shadow-elevated"
                      key={card.label}
                      onClick={() =>
                        openView({
                          label: card.label,
                          result: card.result,
                          view: card.view,
                        })
                      }
                      type="button"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <Badge tone={card.tone}>{card.label}</Badge>
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border bg-panel text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                            <Icon aria-hidden="true" size={16} />
                          </span>
                        </div>
                        <p className="mt-3 text-2xl font-semibold tabular-nums tracking-tight">
                          {card.value}
                        </p>
                        <p className="mt-2 line-clamp-3 text-xs leading-5 text-muted-foreground">
                          {card.detail}
                        </p>
                      </div>
                      <span className="mt-3 text-xs font-medium text-primary">
                        {card.action}
                      </span>
                    </button>
                  );
                })}
          </div>
        </section>

        <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px_360px]">
          <section className="rounded-2xl border bg-panel p-4 shadow-line">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold">Recent alerts</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Operational exceptions that need management attention.
                </p>
              </div>
              <Badge tone={recentAlerts.length ? "warning" : "success"}>
                {recentAlerts.length ? `${recentAlerts.length} open` : "Clear"}
              </Badge>
            </div>
            <div className="mt-4 divide-y">
              {recentAlerts.length ? (
                recentAlerts.map((alert) => (
                  <button
                    className="grid w-full grid-cols-[1fr_auto] gap-3 py-3 text-left transition hover:bg-muted/35"
                    key={alert.label}
                    onClick={() =>
                      handleAttention(alert.label, alert.view, alert.detail)
                    }
                    type="button"
                  >
                    <div>
                      <p className="text-sm font-medium">{alert.label}</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        {alert.detail}
                      </p>
                    </div>
                    <Badge tone={alert.tone}>{alert.value}</Badge>
                  </button>
                ))
              ) : (
                <div className="py-5 text-sm text-muted-foreground">
                  No active alerts from live project, form, review, quality, or
                  sync data.
                </div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border bg-panel p-4 shadow-line">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold">Approval queue</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Submission review status across active forms.
                </p>
              </div>
              <ClipboardCheck
                aria-hidden="true"
                className="text-muted-foreground"
                size={18}
              />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {[
                ["Pending", approvalOverview.pending, "submissions", "Opening pending review submissions."],
                ["Approved", approvalOverview.approved, "submissions", "Opening approved submission results."],
                ["Returned", approvalOverview.returned, "submissions", "Opening returned submissions that need correction."],
                ["Rejected", approvalOverview.rejected, "submissions", "Opening rejected submission results."],
              ].map(([label, value, view, result]) => (
                <button
                  className="rounded-xl border bg-background/80 p-3 text-left transition hover:border-primary/35 hover:bg-primary/5"
                  key={label}
                  onClick={() =>
                    openView({
                      label: String(label),
                      result: String(result),
                      view: view as WorkspaceView,
                    })
                  }
                  type="button"
                >
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums">
                    {Number(value).toLocaleString()}
                  </p>
                </button>
              ))}
            </div>
            <div className="mt-4 rounded-xl border bg-background/80 p-3">
              <ApprovalStatusChart
                approved={approvalOverview.approved}
                pending={approvalOverview.pending}
                rejected={approvalOverview.rejected}
                returned={approvalOverview.returned}
              />
            </div>
            <div className="mt-4">
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Reviewed</span>
                <span className="font-medium">{reviewCompletionPercent}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${reviewCompletionPercent}%` }}
                />
              </div>
            </div>
            <Button
              className="mt-4 w-full"
              onClick={() =>
                openView({
                  label: "Open approval queue",
                  result:
                    "Opening Submissions so reviewers can approve, reject, return, or archive collected data.",
                  view: "submissions",
                })
              }
              type="button"
              variant="secondary"
            >
              Open submissions
            </Button>
          </section>

          <section className="rounded-2xl border bg-panel p-4 shadow-line">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold">Map overview</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  GPS coverage and mapped evidence readiness.
                </p>
              </div>
              <MapPinned
                aria-hidden="true"
                className="text-muted-foreground"
                size={18}
              />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                className="rounded-xl border bg-background/80 p-3 text-left transition hover:border-primary/35 hover:bg-primary/5"
                onClick={() =>
                  openView({
                    label: "Mapped records",
                    result: "Opening Submission Maps so teams can inspect collected records with GPS coordinates.",
                    view: "map",
                  })
                }
                type="button"
              >
                <p className="text-xs text-muted-foreground">Mapped records</p>
                <p className="mt-1 text-lg font-semibold tabular-nums">
                  {coverageOverview.locatedSubmissions.toLocaleString()}
                </p>
              </button>
              <button
                className="rounded-xl border bg-background/80 p-3 text-left transition hover:border-primary/35 hover:bg-primary/5"
                onClick={() =>
                  openView({
                    label: "Mapped locations",
                    result: "Opening Mapping so teams can review location coverage and map readiness.",
                    view: "map",
                  })
                }
                type="button"
              >
                <p className="text-xs text-muted-foreground">Locations</p>
                <p className="mt-1 text-lg font-semibold tabular-nums">
                  {coverageOverview.uniqueLocations.toLocaleString()}
                </p>
              </button>
            </div>
            <div className="mt-4 space-y-3">
              {[
                ["Coverage", coverageOverview.coveragePercent],
                ["Sync", syncProgressPercent],
              ].map(([label, value]) => (
                <div key={label}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium">{Number(value)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Number(value)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <Button
              className="mt-4 w-full"
              onClick={() =>
                openView({
                  label: "Open mapping",
                  result:
                    "Opening Mapping so teams can inspect project maps, submission maps, coverage, boundaries, and GPS quality.",
                  view: "map",
                })
              }
              type="button"
              variant="secondary"
            >
              Open mapping
            </Button>
          </section>
        </div>
      </section>

      <section
        className="surface-premium rounded-2xl p-5 md:p-6"
        aria-labelledby="form-activity-title"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Data collection
              </p>
              <HelpHint label="About active form cards" title="Active form cards">
                <p>
                  These cards show forms that are live or already receiving
                  responses. Open a card to see its purpose, responses, sync
                  count, review status, and edit actions.
                </p>
              </HelpHint>
            </div>
            <h2
              id="form-activity-title"
              className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl"
            >
              Active forms and responses
            </h2>
          </div>
          <div className="grid min-w-full gap-2 sm:grid-cols-4 lg:min-w-[560px]">
            {[
              ["Active forms", formPerformance.length.toLocaleString(), "forms", "Opening Forms so you can review active and published forms."],
              ["Responses", formPerformanceTotals.submissions.toLocaleString(), "submissions", "Opening Submissions so you can inspect collected responses."],
              ["Synced", formPerformanceTotals.syncedRecords.toLocaleString(), "connectivity", "Opening sync health so synced and pending mobile records can be checked."],
              [
                "Needs review",
                formPerformanceTotals.pendingReview.toLocaleString(),
                "submissions",
                "Opening the review queue for submissions that need reviewer action.",
              ],
            ].map(([label, value, view, result]) => (
              <button
                className="rounded-xl border bg-background/80 p-3 text-left transition hover:border-primary/35 hover:bg-primary/5"
                key={label}
                onClick={() => openView({ label: String(label), result: String(result), view: view as WorkspaceView })}
                type="button"
              >
                <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  {label}
                </p>
                <p className="mt-2 text-lg font-semibold tabular-nums">{value}</p>
              </button>
            ))}
          </div>
        </div>

        {formStatsLoading ? (
          <div className="mt-5 rounded-2xl border bg-background/70 p-4">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="mt-4 h-32 w-full" />
          </div>
        ) : (
          <div className="mt-5 rounded-2xl border bg-background/80 p-4 shadow-line">
            <p className="text-sm font-semibold">Response volume by form</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Submission counts for the most active forms.
            </p>
            <div className="mt-4">
              {formResponseChartData.length ? (
                <FormResponseChart data={formResponseChartData} />
              ) : (
                <div className="flex h-32 flex-col items-center justify-center rounded-xl border border-dashed text-center text-xs text-muted-foreground">
                  No form responses yet. Published forms will appear here once
                  data starts coming in.
                </div>
              )}
            </div>
          </div>
        )}

        {formStatsLoading ? (
          <div className="mt-5 grid gap-3 lg:grid-cols-3">
            {[0, 1, 2].map((item) => (
              <div
                className="rounded-2xl border bg-background/70 p-4"
                key={item}
              >
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="mt-3 h-8 w-1/2" />
                <Skeleton className="mt-4 h-20 w-full" />
              </div>
            ))}
          </div>
        ) : formPerformance.length ? (
          <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
              {formPerformance.map((item) => {
                const selected = selectedForm?.form.id === item.form.id;

                return (
                  <article
                    className={cn(
                      "rounded-2xl border bg-background/80 p-4 shadow-line transition hover:-translate-y-0.5 hover:border-primary/35 hover:bg-primary/5 hover:shadow-elevated",
                      selected &&
                        "border-primary/45 bg-primary/5 shadow-elevated",
                    )}
                    key={item.form.id}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone={item.statusTone}>
                            {item.statusLabel}
                          </Badge>
                          <Badge
                            tone={item.totalSubmissions ? "accent" : "neutral"}
                          >
                            v{item.form.current_version}
                          </Badge>
                        </div>
                        <h2 className="mt-3 truncate text-base font-semibold">
                          {item.form.name}
                        </h2>
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                          {item.form.description ??
                            "Collects survey data for the assigned project."}
                        </p>
                      </div>
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-panel text-primary">
                        <ClipboardList aria-hidden="true" size={18} />
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                      {[
                        ["Responses", item.totalSubmissions.toLocaleString()],
                        ["Synced", item.syncedRecords.toLocaleString()],
                        ["Review", item.pendingReview.toLocaleString()],
                        ["Approved", item.approved.toLocaleString()],
                      ].map(([label, value]) => (
                        <div
                          className="rounded-xl border bg-panel/80 p-3"
                          key={label}
                        >
                          <p className="text-xs text-muted-foreground">
                            {label}
                          </p>
                          <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4">
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Approved</span>
                        <span className="font-medium">{item.completion}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${item.completion}%` }}
                        />
                      </div>
                    </div>

                    <dl className="mt-4 grid gap-2 border-t pt-4 text-xs sm:grid-cols-2">
                      <div>
                        <dt className="text-muted-foreground">Last sync</dt>
                        <dd className="mt-1 font-semibold">
                          {item.lastSyncLabel}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Offline</dt>
                        <dd className="mt-1 font-semibold">
                          {item.offlineRecords.toLocaleString()}
                        </dd>
                      </div>
                    </dl>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        onClick={() => setSelectedFormId(item.form.id)}
                        size="sm"
                        type="button"
                        variant={selected ? "primary" : "secondary"}
                      >
                        Open
                      </Button>
                      <Button
                        onClick={() =>
                          openView({
                            label: "Edit form",
                            result: `Opening Form builder so you can edit ${item.form.name}, manage versions, and adjust collection settings.`,
                            view: "forms",
                          })
                        }
                        size="sm"
                        type="button"
                        variant="ghost"
                      >
                        Edit
                      </Button>
                      <Button
                        onClick={() =>
                          openView({
                            label: "Review data",
                            result: `Opening review queue for ${item.form.name}. Review synced responses, correction requests, and approvals connected to this form.`,
                            view: "submissions",
                          })
                        }
                        size="sm"
                        type="button"
                        variant="ghost"
                      >
                        Review
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>

            {selectedForm ? (
              <aside className="rounded-2xl border bg-panel p-4 shadow-line xl:sticky xl:top-20 xl:self-start">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Badge tone={selectedForm.statusTone}>
                      {selectedForm.statusLabel}
                    </Badge>
                    <h2 className="mt-3 text-lg font-semibold">
                      {selectedForm.form.name}
                    </h2>
                  </div>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-background text-primary">
                    <FileText aria-hidden="true" size={18} />
                  </span>
                </div>

                <div className="mt-4 rounded-xl border bg-background/80 p-3">
                  <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                    Use
                  </p>
                  <p className="mt-2 text-sm leading-6">
                    {selectedForm.form.description ??
                      "Use this form to collect structured survey responses, evidence, and field updates for the assigned project and survey."}
                  </p>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  {[
                    [
                      "Responses",
                      selectedForm.totalSubmissions.toLocaleString(),
                    ],
                    ["Synced", selectedForm.syncedRecords.toLocaleString()],
                    ["Review", selectedForm.pendingReview.toLocaleString()],
                    ["Issues", selectedForm.correctionNeeded.toLocaleString()],
                  ].map(([label, value]) => (
                    <div
                      className="rounded-xl border bg-background/80 p-3"
                      key={label}
                    >
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
                    </div>
                  ))}
                </div>

                <dl className="mt-4 grid gap-2 text-xs">
                  <div className="flex items-center justify-between gap-3 border-b pb-2">
                    <dt className="text-muted-foreground">Last response</dt>
                    <dd className="font-semibold">
                      {selectedForm.lastSubmissionLabel}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3 border-b pb-2">
                    <dt className="text-muted-foreground">Last sync</dt>
                    <dd className="font-semibold">
                      {selectedForm.lastSyncLabel}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3 border-b pb-2">
                    <dt className="text-muted-foreground">Enumerators</dt>
                    <dd className="font-semibold">
                      {selectedForm.enumerators || "Not assigned"}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">Project / Survey</dt>
                    <dd className="font-semibold">
                      {selectedForm.form.project_id &&
                      selectedForm.form.survey_id
                        ? "Assigned"
                        : "Needs context"}
                    </dd>
                  </div>
                </dl>

                <div className="mt-4 grid gap-2">
                  <Button
                    onClick={() =>
                      openView({
                        label: "Edit form",
                        result: `Opening Form builder so you can edit ${selectedForm.form.name}.`,
                        view: "forms",
                      })
                    }
                    type="button"
                    variant="primary"
                  >
                    Edit form
                    <ArrowUpRight aria-hidden="true" />
                  </Button>
                  <Button
                    onClick={() =>
                      openView({
                        label: "Open responses",
                        result: `Opening responses for ${selectedForm.form.name}.`,
                        view: "submissions",
                      })
                    }
                    type="button"
                    variant="secondary"
                  >
                    View responses
                  </Button>
                </div>
              </aside>
            ) : null}
          </div>
        ) : (
          <div className="mt-5 rounded-2xl border border-dashed bg-background/80 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border bg-panel text-primary">
                  <ClipboardList aria-hidden="true" size={20} />
                </span>
                <div>
                  <h2 className="text-sm font-semibold">
                    No active form activity yet
                  </h2>
                  <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
                    {draftForms.length
                      ? `${draftForms.length} draft form${draftForms.length === 1 ? "" : "s"} exist. Publish one when it is ready for collection.`
                      : "Create a project survey, build a form, and publish it for field collection."}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => setActiveView("surveys")}
                  type="button"
                  variant="secondary"
                >
                  Create survey
                </Button>
                <Button
                  onClick={() => setActiveView("forms")}
                  type="button"
                  variant="primary"
                >
                  Open form builder
                </Button>
              </div>
            </div>
          </div>
        )}
      </section>

      <div className="surface-premium rounded-2xl p-5 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Today
              </p>
              <HelpHint label="About daily focus" title="Daily focus">
                <p>
                  Use this section to jump into review, sync, quality, or field
                  activity when something needs attention today.
                </p>
              </HelpHint>
            </div>
            <h2
              id="daily-focus-title"
              className="mt-2 text-3xl font-semibold tracking-tight"
            >
              What needs attention now
            </h2>
          </div>
          <Button
            variant="primary"
            onClick={() =>
              handleAttention(
                "Review queue",
                "submissions",
                "Opening the review queue so you can approve clean records, request corrections, or reject poor submissions.",
              )
            }
            type="button"
          >
            Review queue
            <ArrowUpRight aria-hidden="true" />
          </Button>
        </div>
      </div>

      <section
        className="grid gap-3 md:grid-cols-2 xl:grid-cols-5"
        aria-label="Quick actions"
      >
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.label}
              className="group rounded-2xl border bg-panel p-4 text-left shadow-line transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/5 hover:shadow-elevated"
              onClick={() => openView(action)}
              type="button"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl border bg-background text-primary shadow-sm">
                  <Icon aria-hidden="true" size={17} />
                </span>
                <span>
                  <span className="block text-sm font-semibold">
                    {action.label}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {action.hint}
                  </span>
                </span>
              </div>
            </button>
          );
        })}
      </section>

      {dashboardResult ? (
        <section
          className="rounded-2xl border border-success/30 bg-success/10 p-4"
          aria-live="polite"
        >
          <div className="flex items-start gap-3">
            <CheckCircle2
              aria-hidden="true"
              className="mt-0.5 text-success"
              size={18}
            />
            <div>
              <h2 className="text-sm font-semibold">Dashboard result</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {dashboardResult}
              </p>
            </div>
          </div>
        </section>
      ) : null}

      <section
        aria-label="Setup guide and learning"
        className="surface-premium rounded-2xl"
      >
        <button
          aria-expanded={learnExpanded}
          className="flex w-full items-center justify-between gap-3 p-5 text-left"
          onClick={() => setLearnOpenOverride(!learnExpanded)}
          type="button"
        >
          <div>
            <h2 className="text-lg font-semibold tracking-tight">
              Setup guide &amp; learning
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Role guidance, setup readiness, manager questions, and the data
              quality workflow.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge tone={setupProgress >= 80 ? "success" : "warning"}>
              Setup {setupProgress}%
            </Badge>
            <ChevronDown
              aria-hidden="true"
              className={cn(
                "text-muted-foreground transition-transform",
                learnExpanded && "rotate-180",
              )}
              size={18}
            />
          </div>
        </button>
        {learnExpanded ? (
          <div className="space-y-6 px-5 pb-5">
      <section
        className="surface-premium rounded-2xl p-5"
        aria-labelledby="role-focus-title"
      >
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="flex gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border bg-background text-primary shadow-sm">
              <RoleGuidanceIcon aria-hidden="true" size={20} />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="accent">{roleGuidance.badge}</Badge>
                <Badge>{accountScope}</Badge>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <h2 id="role-focus-title" className="text-lg font-semibold">
                  Your role focus: {roleGuidance.title}
                </h2>
                <HelpHint
                  label="About your role focus"
                  title={roleGuidance.title}
                >
                  {roleGuidance.description}
                </HelpHint>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Signed in as <span className="font-medium">{accountLabel}</span>
              </p>
            </div>
          </div>

          <div className="rounded-xl border bg-background/80 p-4">
            <h3 className="text-sm font-semibold">Recommended next actions</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {roleGuidance.actions.map((action) => (
                <Button
                  key={action.label}
                  onClick={() => openView(action)}
                  size="sm"
                  type="button"
                  variant="secondary"
                >
                  {action.label}
                  <ArrowUpRight aria-hidden="true" />
                </Button>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {roleGuidance.focus.map((item) => (
            <div className="rounded-xl border bg-background/80 p-3" key={item}>
              <div className="flex gap-2">
                <CheckCircle2
                  aria-hidden="true"
                  className="mt-0.5 shrink-0 text-success"
                  size={15}
                />
                <p className="text-xs leading-5 text-muted-foreground">
                  {item}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section
        className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]"
        aria-label="Organization management readiness"
      >
        <div className="surface-premium rounded-2xl p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Guided setup
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold tracking-tight">
                  Organization readiness plan
                </h2>
                <HelpHint
                  label="About organization readiness"
                  title="Organization readiness plan"
                >
                  Follow these steps so managers, reviewers, and field officers
                  can start with clean structure, useful indicators, and safe
                  data.
                </HelpHint>
              </div>
            </div>
            <div className="min-w-[160px] rounded-xl border bg-background/80 p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-semibold">{setupProgress}%</span>
              </div>
              <div className="mt-3 h-2 rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${setupProgress}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {completedSetupSteps} of {setupSteps.length} complete
              </p>
            </div>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {setupSteps.map((step, index) => {
              const Icon = step.icon;
              const isNext =
                step.title === nextSetupStep.title && !step.complete;
              return (
                <button
                  className={cn(
                    "rounded-xl border bg-background/80 p-4 text-left transition hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/5",
                    step.complete && "border-success/25 bg-success/10",
                    isNext && "border-primary/30 bg-primary/10",
                  )}
                  key={step.title}
                  onClick={() => openSetupStep(step)}
                  type="button"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border bg-panel",
                        step.complete ? "text-success" : "text-primary",
                      )}
                    >
                      {step.complete ? (
                        <CheckCircle2 aria-hidden="true" size={17} />
                      ) : (
                        <Icon aria-hidden="true" size={17} />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold">
                          {index + 1}. {step.title}
                        </span>
                        <Badge
                          tone={
                            step.complete
                              ? "success"
                              : isNext
                                ? "accent"
                                : "neutral"
                          }
                        >
                          {step.complete ? "Done" : isNext ? "Next" : "Pending"}
                        </Badge>
                      </span>
                      <span className="mt-2 inline-flex">
                        <HelpHint
                          label={`About ${step.title}`}
                          title={step.title}
                        >
                          {step.description}
                        </HelpHint>
                      </span>
                      <span className="mt-3 inline-flex text-xs font-medium text-primary">
                        {step.action}
                      </span>
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <aside className="surface-premium rounded-2xl p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Health scorecard
              </p>
              <h2 className="mt-2 text-lg font-semibold">Management signals</h2>
            </div>
            <Badge tone={setupProgress >= 80 ? "success" : "warning"}>
              {setupProgress >= 80 ? "Ready" : "Improve"}
            </Badge>
          </div>
          <div className="mt-4 space-y-3">
            {managementHealth.map((item) => (
              <button
                className="w-full rounded-xl border bg-background/80 p-3 text-left transition hover:border-primary/30 hover:bg-primary/5"
                key={item.label}
                onClick={() => {
                  setDashboardResult(`${item.label}: ${item.detail}`);
                  setLastActionResult(`${item.label}: ${item.detail}`);
                }}
                type="button"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    <div className="mt-1">
                      <HelpHint
                        label={`About ${item.label}`}
                        title={item.label}
                      >
                        {item.detail}
                      </HelpHint>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{item.value}</p>
                    <Badge className="mt-2" tone={item.tone}>
                      {item.status}
                    </Badge>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </aside>
      </section>

      <section
        className="surface-premium rounded-2xl p-5"
        aria-labelledby="manager-questions-title"
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Manager questions
            </p>
            <h2
              id="manager-questions-title"
              className="mt-2 text-lg font-semibold"
            >
              What leaders should know immediately
            </h2>
          </div>
          <Button
            onClick={() => setActiveView("help")}
            type="button"
            variant="secondary"
          >
            <HelpCircle aria-hidden="true" />
            Read guidance
          </Button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {managerQuestions.map((item) => (
            <button
              className="rounded-xl border bg-background/80 p-4 text-left transition hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/5"
              key={item.question}
              onClick={() => setActiveView(item.view)}
              type="button"
            >
              <p className="text-sm font-semibold">{item.question}</p>
              <div className="mt-2">
                <HelpHint
                  label={`Answer: ${item.question}`}
                  title={item.question}
                >
                  {item.answer}
                </HelpHint>
              </div>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary">
                Open workspace <ArrowUpRight aria-hidden="true" size={13} />
              </span>
            </button>
          ))}
        </div>
      </section>

      <section
        className="surface-premium rounded-2xl p-5"
        aria-labelledby="quality-workflow-title"
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Data quality path
            </p>
            <h2
              id="quality-workflow-title"
              className="mt-2 text-lg font-semibold"
            >
              Keep data trustworthy from form design to reporting
            </h2>
            <div className="mt-1">
              <HelpHint
                label="About the data quality path"
                title="Data quality path"
              >
                Strong organizations do not wait until reporting day to clean
                data. They prevent errors, detect exceptions, correct records
                with evidence, and report only approved information.
              </HelpHint>
            </div>
          </div>
          <Badge
            tone={summaryQuery.data?.quality_flags ? "warning" : "success"}
          >
            {summaryQuery.data?.quality_flags
              ? `${summaryQuery.data.quality_flags} flags`
              : "No open flags"}
          </Badge>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {qualityWorkflow.map((step, index) => {
            const Icon = step.icon;
            return (
              <button
                className="rounded-xl border bg-background/80 p-4 text-left transition hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/5"
                key={step.title}
                onClick={() => openQualityStep(step)}
                type="button"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border bg-panel text-primary">
                    <Icon aria-hidden="true" size={16} />
                  </span>
                  <Badge>{index + 1}</Badge>
                </div>
                <h3 className="mt-4 text-sm font-semibold">{step.title}</h3>
                <div className="mt-2">
                  <HelpHint label={`About ${step.title}`} title={step.title}>
                    {step.description}
                  </HelpHint>
                </div>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary">
                  {step.action} <ArrowUpRight aria-hidden="true" size={13} />
                </span>
              </button>
            );
          })}
        </div>
      </section>
          </div>
        ) : null}
      </section>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {summaryMetrics.map((metric, index) => {
          const Icon = icons[index] ?? Activity;
          return (
            <article
              key={metric.label}
              className="surface-premium rounded-2xl p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-elevated"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{metric.label}</p>
                <Icon
                  aria-hidden="true"
                  className="text-muted-foreground"
                  size={17}
                />
              </div>
              <p className="mt-3 text-2xl font-semibold tabular-nums tracking-tight">
                {metric.value}
              </p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full",
                    metric.tone === "good"
                      ? "bg-success"
                      : metric.tone === "warn"
                        ? "bg-warning"
                        : "bg-muted-foreground",
                  )}
                  style={{ width: `${[84, 62, 74, 28][index] ?? 50}%` }}
                />
              </div>
              <div className="mt-3 flex items-center justify-between">
                <Badge
                  tone={
                    metric.tone === "good"
                      ? "success"
                      : metric.tone === "warn"
                        ? "warning"
                        : "neutral"
                  }
                >
                  {metric.delta}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  vs previous window
                </span>
              </div>
            </article>
          );
        })}
      </div>

      {hasOperationalData ? (
        <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
          <section
            className="surface-premium rounded-2xl p-5"
            aria-labelledby="throughput-title"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 id="throughput-title" className="text-sm font-semibold">
                  Submissions received
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Saved submissions by time of day
                </p>
              </div>
              <Badge tone="accent" className="gap-1.5">
                <StatusDot tone="syncing" />
                Updating
              </Badge>
            </div>
            <div className="mt-5 grid h-64 grid-cols-12 items-end gap-2">
              {[38, 45, 51, 58, 64, 72, 78, 82, 76, 88, 92, 96].map(
                (height, index) => (
                  <div key={index} className="flex h-full items-end">
                    <div
                      className="w-full rounded-t-lg bg-primary/85 transition-all hover:bg-primary"
                      style={{ height: `${height}%` }}
                      aria-label={`${height}% of today’s expected submissions`}
                      role="img"
                    />
                  </div>
                ),
              )}
            </div>
            <div className="mt-4 grid gap-3 border-t pt-4 sm:grid-cols-3">
              {[
                ["App response", "182 ms"],
                ["Clean submissions", "96.8%"],
                ["Review wait", "4.2 min"],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="mt-1 text-sm font-semibold">{value}</p>
                </div>
              ))}
            </div>
          </section>
          <ActivityTimeline />
        </div>
      ) : (
        <section className="rounded-2xl border bg-panel p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-sm font-semibold">
                This organization is ready for setup
              </h2>
              <div className="mt-1">
                <HelpHint label="About setup readiness" title="Setup readiness">
                  No live operational records have been created yet. Start by
                  inviting users, importing existing data, or creating the first
                  mobile-ready form.
                </HelpHint>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => setActiveView("organizations")}
                type="button"
                variant="secondary"
              >
                Invite users
              </Button>
              <Button
                onClick={() => setActiveView("data")}
                type="button"
                variant="secondary"
              >
                Import data
              </Button>
              <Button
                onClick={() => setActiveView("forms")}
                type="button"
                variant="primary"
              >
                Create first form
              </Button>
            </div>
          </div>
        </section>
      )}

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <section
          className="surface-premium rounded-2xl p-5"
          aria-labelledby="work-queue-title"
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 id="work-queue-title" className="text-sm font-semibold">
              Needs attention
            </h2>
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                handleAttention(
                  "Review",
                  "submissions",
                  "Opening submissions that need attention. Use reviewer notes so field teams understand every correction.",
                )
              }
              type="button"
            >
              Review
              <ArrowUpRight aria-hidden="true" />
            </Button>
          </div>
          <div className="divide-y">
            {attentionItems.map(([item, count, sla, tone, view, result]) => (
              <button
                key={item}
                className="grid w-full grid-cols-[1fr_auto] gap-4 py-3 text-left text-sm transition hover:bg-muted/35"
                onClick={() => handleAttention(item, view, result)}
                type="button"
              >
                <div>
                  <p className="font-medium">{item}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{count}</p>
                </div>
                <Badge tone={tone}>{sla}</Badge>
              </button>
            ))}
          </div>
        </section>

        <section
          className="surface-premium rounded-2xl p-5"
          aria-labelledby="sync-title"
        >
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 id="sync-title" className="text-sm font-semibold">
                Offline data
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Data saved on phones and waiting to upload
              </p>
            </div>
            <Gauge
              aria-hidden="true"
              className="text-muted-foreground"
              size={17}
            />
          </div>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border bg-background/80 p-3">
              <dt className="text-muted-foreground">Waiting to sync</dt>
              <dd className="mt-2 text-xl font-semibold tabular-nums">0</dd>
              <Skeleton className="mt-3 h-1.5 w-4/5" />
            </div>
            <div className="rounded-xl border bg-background/80 p-3">
              <dt className="text-muted-foreground">Retry queue</dt>
              <dd className="mt-2 text-xl font-semibold tabular-nums">0</dd>
              <Skeleton className="mt-3 h-1.5 w-1/3" />
            </div>
          </dl>
          <div className="mt-4 rounded-xl border border-warning/25 bg-warning/10 p-3 text-sm">
            <div className="flex items-start gap-2">
              <FileText
                aria-hidden="true"
                className="mt-0.5 text-warning"
                size={16}
              />
              <p className="leading-6 text-muted-foreground">
                Data is saved locally on devices first. Uploads that need
                another attempt stay in the retry queue until connectivity
                improves.
              </p>
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}
