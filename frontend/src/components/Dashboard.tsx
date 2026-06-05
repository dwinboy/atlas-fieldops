import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  BookOpenCheck,
  CheckCircle2,
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusDot } from "@/components/ui/status-dot";
import {
  getOperationsSummary,
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

type DashboardHelpId = "dailyFocus" | "formActivity";

type DashboardAlert = {
  detail: string;
  label: string;
  tone: "danger" | "neutral" | "success" | "warning";
  value: string;
  view: WorkspaceView;
};

function ContextHelp({
  activeHelp,
  children,
  id,
  setActiveHelp,
  title,
}: {
  activeHelp: DashboardHelpId | null;
  children: ReactNode;
  id: DashboardHelpId;
  setActiveHelp: (id: DashboardHelpId | null) => void;
  title: string;
}) {
  const open = activeHelp === id;

  return (
    <div className="relative inline-flex">
      <button
        aria-expanded={open}
        aria-label={`Help: ${title}`}
        className="inline-flex h-7 w-7 items-center justify-center rounded-full border bg-background text-muted-foreground shadow-line transition hover:border-primary/30 hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35"
        onClick={() => setActiveHelp(open ? null : id)}
        type="button"
      >
        <HelpCircle aria-hidden="true" size={15} />
      </button>
      {open ? (
        <div
          aria-label={title}
          className="absolute right-0 top-9 z-30 w-72 rounded-xl border bg-panel p-3 text-left shadow-elevated"
          role="dialog"
        >
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <div className="mt-1 text-xs leading-5 text-muted-foreground">
            {children}
          </div>
          <button
            className="mt-3 text-xs font-medium text-primary hover:underline"
            onClick={() => setActiveHelp(null)}
            type="button"
          >
            Close
          </button>
        </div>
      ) : null}
    </div>
  );
}

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
  const [activeHelp, setActiveHelp] = useState<DashboardHelpId | null>(null);
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const setActiveView = useWorkspaceStore((state) => state.setActiveView);
  const setLastActionResult = useWorkspaceStore(
    (state) => state.setLastActionResult,
  );
  const pushToast = useWorkspaceStore((state) => state.pushToast);
  const summaryQuery = useQuery({
    queryKey: ["operations-summary", token],
    queryFn: () => getOperationsSummary(token ?? ""),
    enabled: Boolean(token && token !== "preview-token"),
  });
  const formsQuery = useQuery({
    queryKey: ["dashboard-forms", token],
    queryFn: () => listForms(token ?? ""),
    enabled: Boolean(token && token !== "preview-token"),
  });
  const submissionsQuery = useQuery({
    queryKey: ["dashboard-submissions", token],
    queryFn: () => listSubmissions(token ?? ""),
    enabled: Boolean(token && token !== "preview-token"),
  });
  const dashboardForms = formsQuery.data ?? [];
  const dashboardSubmissions = submissionsQuery.data ?? [];
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
  const formStatsLoading = formsQuery.isLoading || submissionsQuery.isLoading;
  const dashboardLoading =
    summaryQuery.isLoading || formsQuery.isLoading || submissionsQuery.isLoading;
  const summaryMetrics = summaryQuery.data
    ? [
        {
          label: "Beneficiaries",
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
          label: "Beneficiaries",
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
    formPerformance.length || formPerformanceTotals.submissions,
  );
  const hasOperationalData = Boolean(
    hasFormActivity ||
      (summaryQuery.data &&
        (summaryQuery.data.beneficiaries ||
          summaryQuery.data.active_programs ||
          summaryQuery.data.indicators ||
          summaryQuery.data.open_cases ||
          summaryQuery.data.quality_flags)),
  );
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
      complete: Boolean(summaryQuery.data?.active_programs),
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
        "Bring beneficiaries, regions, officers, indicators, or historical records into the system.",
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
    summaryQuery.data?.active_programs ??
    new Set(
      dashboardForms
        .map((form) => form.project_id)
        .filter((projectId): projectId is string => Boolean(projectId)),
    ).size;
  const fieldOfficerActivity = new Set(
    dashboardSubmissions
      .map((submission) => submission.field_officer_id)
      .filter(Boolean),
  ).size;
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
    activeForms: formPerformance.length,
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
  const recentAlerts = possibleAlerts.filter(
    (alert): alert is DashboardAlert => Boolean(alert),
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
            <h1
              id="dashboard-title"
              className="mt-2 text-3xl font-semibold tracking-tight"
            >
              Operations, quality, approvals, and coverage
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              The first screen follows the platform architecture: projects,
              forms, submissions, reviews, data quality, field activity,
              indicators, alerts, approvals, and map readiness.
            </p>
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
                    "Opening Mapping so managers can inspect project, submission, beneficiary, coverage, and quality maps.",
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
                        <p className="mt-2 text-2xl font-semibold tracking-tight">
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
                ["Pending", approvalOverview.pending],
                ["Approved", approvalOverview.approved],
                ["Returned", approvalOverview.returned],
                ["Rejected", approvalOverview.rejected],
              ].map(([label, value]) => (
                <div className="rounded-xl border bg-background/80 p-3" key={label}>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="mt-1 text-lg font-semibold">
                    {Number(value).toLocaleString()}
                  </p>
                </div>
              ))}
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
              <div className="rounded-xl border bg-background/80 p-3">
                <p className="text-xs text-muted-foreground">Mapped records</p>
                <p className="mt-1 text-lg font-semibold">
                  {coverageOverview.locatedSubmissions.toLocaleString()}
                </p>
              </div>
              <div className="rounded-xl border bg-background/80 p-3">
                <p className="text-xs text-muted-foreground">Locations</p>
                <p className="mt-1 text-lg font-semibold">
                  {coverageOverview.uniqueLocations.toLocaleString()}
                </p>
              </div>
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
              <ContextHelp
                activeHelp={activeHelp}
                id="formActivity"
                setActiveHelp={setActiveHelp}
                title="Active form cards"
              >
                <p>
                  These cards show forms that are live or already receiving
                  responses. Open a card to see its purpose, responses, sync
                  count, review status, and edit actions.
                </p>
              </ContextHelp>
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
              ["Active forms", formPerformance.length.toLocaleString()],
              ["Responses", formPerformanceTotals.submissions.toLocaleString()],
              ["Synced", formPerformanceTotals.syncedRecords.toLocaleString()],
              ["Needs review", formPerformanceTotals.pendingReview.toLocaleString()],
            ].map(([label, value]) => (
              <div className="rounded-xl border bg-background/80 p-3" key={label}>
                <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  {label}
                </p>
                <p className="mt-2 text-lg font-semibold">{value}</p>
              </div>
            ))}
          </div>
        </div>

        {formStatsLoading ? (
          <div className="mt-5 grid gap-3 lg:grid-cols-3">
            {[0, 1, 2].map((item) => (
              <div className="rounded-2xl border bg-background/70 p-4" key={item}>
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
                      selected && "border-primary/45 bg-primary/5 shadow-elevated",
                    )}
                    key={item.form.id}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone={item.statusTone}>{item.statusLabel}</Badge>
                          <Badge tone={item.totalSubmissions ? "accent" : "neutral"}>
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
                        <div className="rounded-xl border bg-panel/80 p-3" key={label}>
                          <p className="text-xs text-muted-foreground">{label}</p>
                          <p className="mt-1 text-lg font-semibold">{value}</p>
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
                        <dd className="mt-1 font-semibold">{item.lastSyncLabel}</dd>
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
                    ["Responses", selectedForm.totalSubmissions.toLocaleString()],
                    ["Synced", selectedForm.syncedRecords.toLocaleString()],
                    ["Review", selectedForm.pendingReview.toLocaleString()],
                    ["Issues", selectedForm.correctionNeeded.toLocaleString()],
                  ].map(([label, value]) => (
                    <div className="rounded-xl border bg-background/80 p-3" key={label}>
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="mt-1 text-lg font-semibold">{value}</p>
                    </div>
                  ))}
                </div>

                <dl className="mt-4 grid gap-2 text-xs">
                  <div className="flex items-center justify-between gap-3 border-b pb-2">
                    <dt className="text-muted-foreground">Last response</dt>
                    <dd className="font-semibold">{selectedForm.lastSubmissionLabel}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3 border-b pb-2">
                    <dt className="text-muted-foreground">Last sync</dt>
                    <dd className="font-semibold">{selectedForm.lastSyncLabel}</dd>
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
                      {selectedForm.form.project_id && selectedForm.form.survey_id
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
              <ContextHelp
                activeHelp={activeHelp}
                id="dailyFocus"
                setActiveHelp={setActiveHelp}
                title="Daily focus"
              >
                <p>
                  Use this section to jump into review, sync, quality, or field
                  activity when something needs attention today.
                </p>
              </ContextHelp>
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
              <h2 id="role-focus-title" className="mt-3 text-lg font-semibold">
                Your role focus: {roleGuidance.title}
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                {roleGuidance.description}
              </p>
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
              <h2 className="mt-2 text-xl font-semibold tracking-tight">
                Organization readiness plan
              </h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
                Follow these steps so managers, reviewers, and field officers
                can start with clean structure, useful indicators, and safe
                data.
              </p>
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
                      <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                        {step.description}
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
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {item.detail}
                    </p>
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
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                {item.answer}
              </p>
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
            <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
              Strong organizations do not wait until reporting day to clean
              data. They prevent errors, detect exceptions, correct records with
              evidence, and report only approved information.
            </p>
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
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  {step.description}
                </p>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary">
                  {step.action} <ArrowUpRight aria-hidden="true" size={13} />
                </span>
              </button>
            );
          })}
        </div>
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
              <p className="mt-3 text-2xl font-semibold tracking-tight">
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
              <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
                No live operational records have been created yet. Start by
                inviting users, importing existing data, or creating the first
                mobile-ready form.
              </p>
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
              <dd className="mt-2 text-xl font-semibold">0</dd>
              <Skeleton className="mt-3 h-1.5 w-4/5" />
            </div>
            <div className="rounded-xl border bg-background/80 p-3">
              <dt className="text-muted-foreground">Retry queue</dt>
              <dd className="mt-2 text-xl font-semibold">0</dd>
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
