import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  ClipboardList,
  Clock,
  DatabaseZap,
  FileText,
  Gauge,
  HelpCircle,
  Network,
  Plus,
  ShieldCheck,
  Target,
  UploadCloud,
  UserPlus,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { ActivityTimeline } from "@/components/ActivityTimeline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusDot } from "@/components/ui/status-dot";
import { getOperationsSummary } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useWorkspaceStore, type WorkspaceView } from "@/stores/workspace";

const icons = [Activity, Clock, CheckCircle2, AlertTriangle];

type DashboardProps = {
  token: string | null;
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

export function Dashboard({ token }: DashboardProps) {
  const [dashboardResult, setDashboardResult] = useState("");
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
  const hasOperationalData = Boolean(
    summaryQuery.data &&
    (summaryQuery.data.beneficiaries ||
      summaryQuery.data.active_programs ||
      summaryQuery.data.indicators ||
      summaryQuery.data.open_cases ||
      summaryQuery.data.quality_flags),
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
      title: "Add indicators",
      description:
        "Define baselines, targets, data sources, and reporting periods for M&E tracking.",
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
        "Start from a template, customize labels and validation, then assign it to field teams.",
      view: "templates",
      action: "Open Templates",
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
        "Create indicators with targets, baselines, data sources, and reporting periods.",
      view: "indicators" as WorkspaceView,
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
  const quickActions: {
    label: string;
    hint: string;
    result: string;
    view: WorkspaceView;
    icon: typeof Plus;
  }[] = [
    {
      label: "Create form",
      hint: "Start from a template or blank form",
      result:
        "Opening templates. Pick a proven form, then customize labels, rules, and offline behavior before publishing.",
      view: "templates",
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
          "Create form",
          "neutral",
          "templates",
          "Opening templates so you can create the first mobile-ready collection form.",
        ],
      ];

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

  return (
    <section aria-labelledby="dashboard-title" className="space-y-6">
      <div className="surface-premium rounded-2xl p-5 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Today
            </p>
            <h1
              id="dashboard-title"
              className="mt-2 text-3xl font-semibold tracking-tight"
            >
              What needs attention now
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
              A simple daily view for pending reviews, offline sync, data
              quality, and field team activity.
            </p>
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
                onClick={() => setActiveView("templates")}
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
