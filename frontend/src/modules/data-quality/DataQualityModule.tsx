"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileWarning,
  Gauge,
  GitCompare,
  ListChecks,
  LocateFixed,
  MapPinned,
  Plus,
  Save,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Table2,
  UploadCloud,
  type LucideIcon,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useContextualBack } from "@/hooks/useContextualBack";
import { useEffect, useMemo, useState } from "react";

import { DataTable, type TableColumn } from "@/components/DataTable";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HelpHint } from "@/components/ui/help-hint";
import { Input, Textarea } from "@/components/ui/input";
import { Modal, ModalBody, ModalFooter } from "@/components/ui/modal";
import {
  bulkUpdateImportCleaningRows,
  confirmImportedFormDataRows,
  ApiError,
  listDataQualitySignals,
  listImportCleaningRows,
  reviewBeneficiaryProfileUpdateProposal,
  updateDataQualitySignal,
  type BeneficiaryProfileUpdateProposalReview,
  type CurrentPrincipal,
  type DataQualitySignalRead,
  type ImportCleaningRowRead,
} from "@/lib/api";
import { formatSubmissionId } from "@/lib/identifiers";
import { useSectorTerminology } from "@/lib/sectorTerminology";
import { cn } from "@/lib/utils";
import {
  dataQualitySectionFromPath,
  dataQualitySections,
  previewDuplicateGroups as sampleDuplicateGroups,
  previewGpsIssues as sampleGpsIssues,
  previewOutliers as sampleOutliers,
  previewQualityAuditEvents as sampleQualityAuditEvents,
  previewQualityIssues as sampleQualityIssues,
  previewQualityRules as sampleQualityRules,
  previewQualityScores as sampleQualityScores,
  previewRiskAlerts as sampleRiskAlerts,
  previewValidationFailures as sampleValidationFailures,
  type DataQualitySection,
  type DuplicateGroup,
  type GPSIssueRecord,
  type OutlierRecord,
  type QualityAuditEvent,
  type QualityIssue,
  type QualityIssueStatus,
  type QualityIssueType,
  type QualityRuleRecord,
  type QualityScore,
  type QualityScope,
  type QualitySeverity,
  type RiskAlertRecord,
  type ValidationFailureRecord,
} from "@/modules/data-quality/data";
import {
  averageResolutionImpact,
  buildQualityInvestigationSummary,
  calculateQualityScore,
  countReconciliationIssuesByFilter,
  computeQualityScoreFromIssues,
  computeQualitySummary,
  filterProfileConflictsByFocus,
  filterReconciliationIssues,
  formatSignalEvidence,
  filterIssuesBySection,
  issueAttentionNote,
  type ProfileConflictDecisionFilter,
  type ProfileConflictFocusFilter,
  profileConflictChecklist,
  profileConflictDecisionBlocker,
  profileConflictDecisionState,
  profileConflictFocusDescription,
  preferredIssueDetailTab,
  profileConflictReviewFocus,
  profileConflictSensitiveFieldCount,
  summarizeProfileConflictFocusDecisionStates,
  sortProfileConflictIssuesForReview,
  summarizeProfileConflictDecisionStates,
  filterProfileConflictsByDecisionState,
  profileFieldDecisionHint,
  profileFieldSensitivity,
  requiresProfileConflictDecision,
  isProfileConflictIssue,
  nextInvestigationStatus,
  profileConflictChangesFromEvidence,
  qualityCategory,
  rankByField,
  rankByIssueType,
  rankIssuesForAttention,
  summarizeProfileConflictFocus,
  type ReconciliationFocusFilter,
  scoreTone,
  severityTone,
  signalStatusHistoryFromEvidence,
  statusTone,
  toCsv,
} from "@/modules/data-quality/utils";
import { useWorkspaceStore } from "@/stores/workspace";

type DataQualityModuleProps = {
  principal?: CurrentPrincipal | null;
  token: string | null;
};

type ProposalReviewDraft = {
  action: BeneficiaryProfileUpdateProposalReview["action"];
  beneficiaryId: string;
  beneficiaryUid: string;
  changes: { current: string; field: string; proposed: string }[];
  comment: string;
  entityName: string;
  submissionId: string;
};

type IssueDetailTab = "Overview" | "Related Submission" | "Investigation" | "Resolution" | "History" | "Audit Trail";

const issueTabs: IssueDetailTab[] = ["Overview", "Related Submission", "Investigation", "Resolution", "History", "Audit Trail"];

const sectionGroups: { label: string; ids: DataQualitySection[] }[] = [
  { label: "Overview", ids: ["dashboard", "quality-dashboard"] },
  { label: "Issue Queues", ids: ["duplicates", "outliers", "gps-issues", "missing-data", "validation-failures", "risk-alerts"] },
  { label: "Workflows", ids: ["import-cleaning", "reconciliation"] },
  { label: "Rules", ids: ["rules"] },
];

function titleCase(value: string): string {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function signalSeverity(value: string): QualitySeverity {
  const normalized = value.toLowerCase();
  if (normalized === "critical") return "Critical";
  if (normalized === "high") return "High";
  if (normalized === "low") return "Low";
  return "Medium";
}

function signalIssueType(value: string): QualityIssueType {
  const normalized = value.toLowerCase();
  if (
    normalized.includes("possible_duplicate_entity") ||
    normalized.includes("profile_conflict") ||
    normalized.includes("missing_entity_link") ||
    normalized.includes("entity_link") ||
    normalized.includes("unlinked") ||
    normalized.includes("reconciliation") ||
    normalized.includes("unmatched")
  ) return "Reconciliation";
  if (normalized.includes("duplicate")) return "Duplicate";
  if (normalized.includes("gps")) return "GPS Issue";
  if (normalized.includes("missing")) return "Missing Data";
  if (normalized.includes("outlier")) return "Outlier";
  if (normalized.includes("risk") || normalized.includes("fraud")) return "Risk Alert";
  return "Validation Failure";
}

function signalStatus(value: string): QualityIssueStatus {
  const normalized = value.toLowerCase();
  if (normalized === "resolved") return "Resolved";
  if (normalized === "closed") return "Closed";
  if (normalized === "assigned") return "Assigned";
  if (normalized === "under_investigation" || normalized === "under investigation") return "Under Investigation";
  if (normalized === "escalated") return "Escalated";
  if (normalized === "governance_review" || normalized === "governance review") return "Governance Review";
  return "Detected";
}

function qualityIssueFromSignal(signal: DataQualitySignalRead): QualityIssue {
  const evidenceJson = {
    ...(signal.evidence_json ?? {}),
    beneficiary_id: signal.beneficiary_id ?? "",
    signal_type: signal.signal_type,
    submission_id: signal.submission_id ?? "",
  };
  return {
    assignedTo: "Unassigned",
    detectedAt: signal.created_at,
    description: signal.summary,
    enumerator: String(signal.evidence_json?.submitted_by_name ?? signal.evidence_json?.uploaded_by_name ?? "Unknown"),
    evidence: formatSignalEvidence(evidenceJson, signal.confidence),
    evidenceJson,
    form: String(signal.evidence_json?.form_name ?? "Unknown form"),
    id: signal.id,
    location: String(signal.evidence_json?.location ?? signal.evidence_json?.community ?? "Unknown location"),
    project: String(signal.evidence_json?.project_name ?? "Project context pending"),
    recommendedAction: String(signal.evidence_json?.recommended_action ?? signal.evidence_json?.recommended_queue ?? "Review and assign an investigator."),
    scoreImpact: signal.severity.toLowerCase() === "critical" ? 18 : signal.severity.toLowerCase() === "high" ? 12 : signal.severity.toLowerCase() === "low" ? 4 : 8,
    severity: signalSeverity(signal.severity),
    status: signalStatus(signal.status),
    submissionId: signal.submission_id ?? "Not linked",
    supervisor: "Unassigned",
    title: signal.summary,
    type: signalIssueType(signal.signal_type),
  };
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

export function DataQualityModule({ principal, token }: DataQualityModuleProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<DataQualitySection>(() => dataQualitySectionFromPath(pathname));
  const terminology = useSectorTerminology(token);
  const primaryEntity = terminology.primaryEntity;
  const primaryEntityLower = primaryEntity.toLowerCase();
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  useContextualBack(Boolean(selectedIssueId));
  const [activeIssueTab, setActiveIssueTab] = useState<IssueDetailTab>("Overview");
  const [actionResult, setActionResult] = useState("");
  const [reconciliationFilter, setReconciliationFilter] = useState<ReconciliationFocusFilter>("all");
  const [profileConflictFocusFilter, setProfileConflictFocusFilter] = useState<ProfileConflictFocusFilter>("all");
  const [profileConflictDecisionFilter, setProfileConflictDecisionFilter] = useState<ProfileConflictDecisionFilter>("all");
  const [proposalReviewOpen, setProposalReviewOpen] = useState(false);
  const [proposalReviewDraft, setProposalReviewDraft] = useState<ProposalReviewDraft>({
    action: "approve",
    beneficiaryId: "",
    beneficiaryUid: "",
    changes: [],
    comment: "",
    entityName: "",
    submissionId: "",
  });
  const pushToast = useWorkspaceStore((state) => state.pushToast);
  const preview = !token || token === "preview-token";
  const qualitySignalsQuery = useQuery({
    enabled: !preview && Boolean(token),
    queryFn: () => listDataQualitySignals(token ?? "", { status: "open" }),
    queryKey: ["data-quality", "signals", token],
  });
  const importCleaningQuery = useQuery({
    enabled: !preview && Boolean(token),
    queryFn: () => listImportCleaningRows(token ?? ""),
    queryKey: ["data-quality", "import-cleaning", token],
  });
  const updateSignalMutation = useMutation({
    mutationFn: ({ comment, signalId, status }: { comment: string; signalId: string; status: "assigned" | "under_investigation" | "resolved" | "closed" }) =>
      updateDataQualitySignal(token ?? "", signalId, { comment, status }),
    onSuccess: async (signal) => {
      await qualitySignalsQuery.refetch();
      setSelectedIssueId(null);
      setActionResult(`${titleCase(signal.signal_type)} was marked ${titleCase(signal.status)}.`);
      pushToast({ title: "Reconciliation updated", description: signal.summary, tone: "success" });
    },
    onError: () => {
      pushToast({ title: "Could not update issue", description: "Check your permission to manage entity and data-quality records.", tone: "danger" });
    },
  });
  const reviewProposalMutation = useMutation({
    mutationFn: ({ beneficiaryId, payload }: { beneficiaryId: string; payload: BeneficiaryProfileUpdateProposalReview }) =>
      reviewBeneficiaryProfileUpdateProposal(token ?? "", beneficiaryId, payload),
    onSuccess: async (_beneficiary, variables) => {
      await qualitySignalsQuery.refetch();
      setProposalReviewOpen(false);
      setProposalReviewDraft({
        action: "approve",
        beneficiaryId: "",
        beneficiaryUid: "",
        changes: [],
        comment: "",
        entityName: "",
        submissionId: "",
      });
      setSelectedIssueId(null);
      setActionResult(
        variables.payload.action === "approve"
          ? `Profile update approved for ${variables.payload.submission_id}. Official ${primaryEntityLower} fields were updated and the conflict left the queue.`
          : `Profile update rejected for ${variables.payload.submission_id}. The official ${primaryEntityLower} profile stayed unchanged and the conflict left the queue.`,
      );
      pushToast({
        title: variables.payload.action === "approve" ? "Profile update approved" : "Profile update rejected",
        description: `The reconciliation decision was recorded in the ${primaryEntityLower} history and audit trail.`,
        tone: "success",
      });
    },
    onError: (error) => {
      pushToast({
        title: "Profile update decision failed",
        description:
          error instanceof ApiError && error.status === 403
            ? `You need ${primaryEntityLower} edit permission to approve or reject submission-driven profile changes.`
            : error instanceof Error
              ? error.message
              : "The profile conflict decision could not be saved.",
        tone: "danger",
      });
    },
  });
  const qualityIssues = useMemo(
    () => (preview ? sampleQualityIssues : (qualitySignalsQuery.data ?? []).map(qualityIssueFromSignal)),
    [preview, qualitySignalsQuery.data],
  );
  const qualityAuditEvents = useMemo(() => (preview ? sampleQualityAuditEvents : []), [preview]);
  const gpsIssues = useMemo(() => (preview ? sampleGpsIssues : []), [preview]);
  const riskAlerts = useMemo(() => (preview ? sampleRiskAlerts : []), [preview]);
  const qualityRules = useMemo(() => (preview ? sampleQualityRules : []), [preview]);
  const qualityScores = useMemo(
    () => (preview ? sampleQualityScores : { Organization: computeQualityScoreFromIssues(qualityIssues) }),
    [preview, qualityIssues],
  );
  const duplicateGroups = useMemo(() => (preview ? sampleDuplicateGroups : []), [preview]);
  const outliers = useMemo(() => (preview ? sampleOutliers : []), [preview]);
  const validationFailures = useMemo(() => (preview ? sampleValidationFailures : []), [preview]);
  const organizationScore = qualityScores.Organization;
  const summary = useMemo(() => computeQualitySummary(qualityIssues, organizationScore), [organizationScore, qualityIssues]);
  const visibleIssues = useMemo(() => filterIssuesBySection(qualityIssues, activeSection), [activeSection, qualityIssues]);
  const selectedIssue = qualityIssues.find((issue) => issue.id === selectedIssueId) ?? null;
  const roleLabel = principal?.roles?.join(", ") || "Workspace user";
  const importCleaningRows = preview ? [] : (importCleaningQuery.data ?? []);

  async function bulkSignalUpdate(
    issueIds: string[],
    status: "resolved" | "under_investigation",
    comment: string,
  ): Promise<void> {
    if (!token) return;
    let failed = 0;
    for (const signalId of issueIds) {
      try {
        await updateDataQualitySignal(token, signalId, { comment, status });
      } catch {
        failed += 1;
      }
    }
    await qualitySignalsQuery.refetch();
    pushToast({
      title: failed
        ? `Bulk update: ${issueIds.length - failed} done, ${failed} failed`
        : `Bulk update: ${issueIds.length} issue(s) marked ${titleCase(status)}`,
      description: failed
        ? "Failed issues kept their previous status. Check permissions and issue state."
        : "Each issue kept its own audit trail entry.",
      tone: failed ? "warning" : "success",
    });
  }

  const bulkUpdateHandler = !preview && token ? bulkSignalUpdate : undefined;

  useEffect(() => {
    const routeSection = dataQualitySectionFromPath(pathname);
    if (routeSection !== activeSection) {
      setActiveSection(routeSection);
      setSelectedIssueId(null);
    }
  }, [activeSection, pathname]);

  function selectSection(section: DataQualitySection): void {
    setActiveSection(section);
    setSelectedIssueId(null);
    const route = dataQualitySections.find((item) => item.id === section)?.route;
    if (route && route !== pathname) router.push(route);
  }

  function openIssue(issue: QualityIssue, tab: IssueDetailTab = "Overview"): void {
    setSelectedIssueId(issue.id);
    setActiveIssueTab(tab);
    setActionResult(buildQualityInvestigationSummary(issue));
  }

  function openProfileConflictQueue(focus: ProfileConflictFocusFilter = "all", decisionFilter: ProfileConflictDecisionFilter = "all"): void {
    setSelectedIssueId(null);
    setReconciliationFilter("profile_conflicts");
    setProfileConflictFocusFilter(focus);
    setProfileConflictDecisionFilter(decisionFilter);
    selectSection("reconciliation");
  }

  function exportIssues(): void {
    downloadCsv(
      "atlas-data-quality-issues.csv",
      qualityIssues.map((issue) => ({
        assignedTo: issue.assignedTo,
        detectedAt: issue.detectedAt,
        enumerator: issue.enumerator,
        form: issue.form,
        id: issue.id,
        location: issue.location,
        project: issue.project,
        severity: issue.severity,
        status: issue.status,
        submissionId: issue.submissionId,
        supervisor: issue.supervisor,
        title: issue.title,
        type: issue.type,
      })),
    );
    setActionResult("Quality issue export prepared. Production exports should be permission-controlled and audited through Governance.");
    pushToast({ title: "Quality issues exported", description: "The data quality issue CSV is ready.", tone: "success" });
  }

  function openProposalReview(issue: QualityIssue, action: BeneficiaryProfileUpdateProposalReview["action"]): void {
    const beneficiaryId = typeof issue.evidenceJson?.beneficiary_id === "string" ? issue.evidenceJson.beneficiary_id : "";
    if (!beneficiaryId || issue.submissionId === "Not linked") {
      pushToast({
        title: "Profile conflict details are incomplete",
        description: `This signal is missing the linked ${primaryEntityLower} or submission needed for a decision.`,
        tone: "warning",
      });
      return;
    }
    setProposalReviewDraft({
      action,
      beneficiaryId,
      beneficiaryUid: typeof issue.evidenceJson?.beneficiary_uid === "string" ? issue.evidenceJson.beneficiary_uid : "",
      changes: profileConflictChangesFromEvidence(issue.evidenceJson),
      comment: "",
      entityName: issue.title,
      submissionId: issue.submissionId,
    });
    setProposalReviewOpen(true);
  }

  function submitProposalReview(): void {
    if (!proposalReviewDraft.beneficiaryId || !proposalReviewDraft.submissionId) return;
    reviewProposalMutation.mutate({
      beneficiaryId: proposalReviewDraft.beneficiaryId,
      payload: {
        action: proposalReviewDraft.action,
        comment: proposalReviewDraft.comment.trim(),
        submission_id: proposalReviewDraft.submissionId,
      },
    });
  }

  return (
    <section className="space-y-3">
      <div className="module-header rounded-xl p-3.5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="governance">ANALYTICS</Badge>
              <Badge tone={scoreTone(summary.overallScore)}>{summary.overallScore}/100 · {qualityCategory(summary.overallScore)}</Badge>
              <Badge tone={summary.criticalIssues ? "danger" : "success"}>{summary.criticalIssues} critical</Badge>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">Data Quality</h1>
              <HelpHint label="About Data Quality" title="Data Quality">
                Monitor trust, detect duplicates, outliers, GPS issues, missing data, validation failures, risk alerts, and manage quality rules before records power indicators, reports, and program decisions.
              </HelpHint>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Access context: {roleLabel}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => selectSection("rules")} type="button" variant="secondary">
              <ListChecks aria-hidden="true" /> Manage rules
            </Button>
            <Button onClick={exportIssues} type="button">
              <Download aria-hidden="true" /> Export issues
            </Button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
          {sectionGroups.map((group) => (
            <div key={group.label}>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{group.label}</p>
              <div className="flex flex-wrap gap-1.5">
                {group.ids.map((id) => {
                  const section = dataQualitySections.find((candidate) => candidate.id === id);
                  if (!section) return null;
                  return (
                    <button
                      className={cn(
                        "min-w-36 rounded-lg border px-2.5 py-1.5 text-left transition hover:border-primary/40 hover:bg-primary/5",
                        activeSection === section.id ? "border-primary/50 bg-primary/10 shadow-line" : "bg-background",
                      )}
                      key={section.id}
                      onClick={() => {
                        if (section.id === "reconciliation") {
                          setReconciliationFilter("all");
                          setProfileConflictFocusFilter("all");
                        }
                        selectSection(section.id);
                      }}
                      type="button"
                    >
                      <span className="text-xs font-semibold">{section.label}</span>
                      <span className="mt-0.5 block text-[11px] leading-4 text-muted-foreground">{section.route}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {actionResult ? (
        <section className="rounded-2xl border border-success/30 bg-success/10 p-4" aria-live="polite">
          <div className="flex items-start gap-3">
            <CheckCircle2 aria-hidden="true" className="mt-0.5 text-success" size={18} />
            <div>
              <h2 className="text-sm font-semibold">Data quality update</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{actionResult}</p>
            </div>
          </div>
        </section>
      ) : null}

      {!preview && qualitySignalsQuery.isLoading ? (
        <section className="rounded-xl border bg-panel p-4 shadow-line" aria-live="polite">
          <div className="flex items-start gap-3">
            <Gauge aria-hidden="true" className="mt-0.5 text-primary" size={18} />
            <div>
              <h2 className="text-sm font-semibold">Loading live quality signals</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Atlas is checking reconciliation, duplicate, GPS, validation, and profile-conflict signals for this organization.
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {!preview && qualitySignalsQuery.isError ? (
        <section className="rounded-xl border border-danger/30 bg-danger/10 p-4 shadow-line" role="alert">
          <div className="flex items-start gap-3">
            <AlertTriangle aria-hidden="true" className="mt-0.5 text-danger" size={18} />
            <div>
              <h2 className="text-sm font-semibold">Quality signals could not load</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                The dashboard is available, but live data cleaning signals did not load. Check your connection or permission to view entity and submission quality issues.
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {!preview && !qualitySignalsQuery.isLoading && !qualitySignalsQuery.isError && !qualityIssues.length ? (
        <section className="rounded-xl border border-success/30 bg-success/10 p-4 shadow-line">
          <div className="flex items-start gap-3">
            <ShieldCheck aria-hidden="true" className="mt-0.5 text-success" size={18} />
            <div>
              <h2 className="text-sm font-semibold">No open reconciliation signals</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                No open duplicate, profile conflict, GPS, missing data, validation, or risk signals are currently waiting for action.
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {selectedIssue ? (
        <IssueDetail
          auditEvents={qualityAuditEvents.filter((event) => event.issueId === selectedIssue.id)}
          isUpdating={updateSignalMutation.isPending}
          issue={selectedIssue}
          onBack={() => setSelectedIssueId(null)}
          onOpenApproveProposal={(issue) => openProposalReview(issue, "approve")}
          onOpenBeneficiary={(beneficiaryId) => router.push(`/beneficiaries?beneficiaryId=${beneficiaryId}`)}
          onOpenGovernance={() => router.push("/governance")}
          onOpenMapping={() => router.push("/mapping")}
          onOpenProfileConflictQueue={openProfileConflictQueue}
          onOpenRejectProposal={(issue) => openProposalReview(issue, "reject")}
          onOpenSubmission={(submissionId) => router.push(`/submissions/all?submissionId=${submissionId}`)}
          onUpdateStatus={(status, comment) => updateSignalMutation.mutate({ comment, signalId: selectedIssue.id, status })}
          primaryEntity={primaryEntity}
          primaryEntityLower={primaryEntityLower}
          selectedTab={activeIssueTab}
          setSelectedTab={setActiveIssueTab}
        />
      ) : null}

      {!selectedIssue && activeSection === "dashboard" ? (
        <QualityLanding
          importCleaningRows={importCleaningRows}
          issues={qualityIssues}
          onOpenIssue={openIssue}
          onOpenProfileConflicts={() => openProfileConflictQueue("all")}
          onOpenProfileConflictFocus={openProfileConflictQueue}
          onOpenProfileConflictDecision={(decisionFilter) => openProfileConflictQueue("all", decisionFilter)}
          onOpenProfileConflictFocusDecision={(focus, decisionFilter) => openProfileConflictQueue(focus, decisionFilter)}
          onOpenSection={(section) => {
            if (section === "reconciliation") {
              setReconciliationFilter("all");
              setProfileConflictFocusFilter("all");
              setProfileConflictDecisionFilter("all");
            }
            selectSection(section);
          }}
          primaryEntityLower={primaryEntityLower}
          scores={qualityScores}
          summary={summary}
        />
      ) : null}
      {!selectedIssue && activeSection === "quality-dashboard" ? (
        <QualityDashboard
          issues={qualityIssues}
          onOpenIssue={(issue) => openIssue(issue, preferredIssueDetailTab(issue))}
          scores={qualityScores}
        />
      ) : null}
      {!selectedIssue && activeSection === "duplicates" ? <DuplicatesSection groups={duplicateGroups} issues={visibleIssues} onBulkUpdate={bulkUpdateHandler} onOpenIssue={openIssue} /> : null}
      {!selectedIssue && activeSection === "outliers" ? <OutliersSection outliers={outliers} issues={visibleIssues} onBulkUpdate={bulkUpdateHandler} onOpenIssue={openIssue} /> : null}
      {!selectedIssue && activeSection === "gps-issues" ? <GPSIssuesSection gpsIssues={gpsIssues} issues={visibleIssues} onBulkUpdate={bulkUpdateHandler} onOpenIssue={openIssue} onOpenMapping={() => router.push("/mapping")} /> : null}
      {!selectedIssue && activeSection === "import-cleaning" ? (
        <ImportCleaningSection
          isLoading={importCleaningQuery.isLoading}
          onBulkSave={async (rows, reason) => {
            if (!token) return;
            const response = await bulkUpdateImportCleaningRows(token, {
              reason,
              rows: rows.map((row) => ({ responses: row.responses, submission_id: row.submissionId })),
            });
            await importCleaningQuery.refetch();
            setActionResult(`${response.updated_rows} imported row(s) saved and rechecked. ${response.skipped_rows} row(s) were skipped.`);
            pushToast({ title: "Bulk cleaning saved", description: "Edited rows were saved, revalidated, and kept in the import cleaning queue if issues remain.", tone: "success" });
          }}
          onConfirmRows={async (rows) => {
            if (!token) return;
            const rowsByForm = rows.reduce<Record<string, ImportCleaningRowRead[]>>((groups, row) => {
              groups[row.form_id] = [...(groups[row.form_id] ?? []), row];
              return groups;
            }, {});
            for (const [formId, formRows] of Object.entries(rowsByForm)) {
              await confirmImportedFormDataRows(token, formId, {
                comment: "Cleaned imported rows confirmed from Data Quality import cleaning queue.",
                submission_ids: formRows.map((row) => row.id),
              });
            }
            await importCleaningQuery.refetch();
            setActionResult(`${rows.length} cleaned imported row(s) confirmed and released for approved-data processing.`);
            pushToast({ title: "Imported rows confirmed", description: "Cleaned rows are now approved for entity processing and reporting.", tone: "success" });
          }}
          onOpenRow={(row) => router.push(`/submissions/all?submissionId=${row.id}&tab=Responses`)}
          rows={importCleaningRows}
        />
      ) : null}
      {!selectedIssue && activeSection === "missing-data" ? <IssueTable description="Track missing required fields, incomplete sections, missing consent, missing attachments, and missing GPS." issues={visibleIssues} onBulkUpdate={bulkUpdateHandler} onOpenIssue={openIssue} route="/data-quality/missing-data" title="Missing Data" /> : null}
      {!selectedIssue && activeSection === "reconciliation" ? (
        <ReconciliationSection
          isUpdating={updateSignalMutation.isPending}
          isReviewingProposal={reviewProposalMutation.isPending}
          issues={visibleIssues}
          onChangeFilter={setReconciliationFilter}
          onChangeProfileConflictDecision={setProfileConflictDecisionFilter}
          onChangeProfileConflictFocus={setProfileConflictFocusFilter}
          onOpenApproveProposal={(issue) => openProposalReview(issue, "approve")}
          onMarkResolved={(issue) => updateSignalMutation.mutate({ comment: "Reviewed from reconciliation queue.", signalId: issue.id, status: "resolved" })}
          onMarkUnderInvestigation={(issue) => updateSignalMutation.mutate({ comment: "Assigned for reconciliation investigation.", signalId: issue.id, status: "under_investigation" })}
          onOpenBeneficiary={(beneficiaryId) => router.push(`/beneficiaries?beneficiaryId=${beneficiaryId}`)}
          onOpenIssue={(issue) => openIssue(issue, preferredIssueDetailTab(issue))}
          onOpenRejectProposal={(issue) => openProposalReview(issue, "reject")}
          onOpenSubmission={(submissionId) => router.push(`/submissions/all?submissionId=${submissionId}`)}
          primaryEntityLower={primaryEntityLower}
          selectedProfileConflictDecision={profileConflictDecisionFilter}
          selectedProfileConflictFocus={profileConflictFocusFilter}
          selectedFilter={reconciliationFilter}
        />
      ) : null}
      {!selectedIssue && activeSection === "validation-failures" ? <ValidationFailuresSection failures={validationFailures} issues={visibleIssues} onBulkUpdate={bulkUpdateHandler} onOpenIssue={openIssue} /> : null}
      {!selectedIssue && activeSection === "risk-alerts" ? <RiskAlertsSection alerts={riskAlerts} issues={visibleIssues} onBulkUpdate={bulkUpdateHandler} onOpenGovernance={() => router.push("/governance")} onOpenIssue={openIssue} /> : null}
      {!selectedIssue && activeSection === "rules" ? <QualityRulesSection rules={qualityRules} /> : null}

      <section className="rounded-xl border bg-panel p-3.5 shadow-line">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-sm font-semibold">Module boundaries</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Data Quality detects, monitors, investigates, and resolves quality issues. Forms define validation rules, Submissions store records, Mapping visualizes spatial issues, Governance handles compliance escalation, and Reports publish formal outputs.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => router.push("/submissions")} type="button" variant="secondary">
              <ClipboardCheck aria-hidden="true" /> Submissions
            </Button>
            <Button onClick={() => router.push("/mapping")} type="button" variant="secondary">
              <MapPinned aria-hidden="true" /> Mapping
            </Button>
            <Button onClick={() => router.push("/reports")} type="button" variant="secondary">
              <BarChart3 aria-hidden="true" /> Reports
            </Button>
          </div>
        </div>
      </section>
      <Modal
        contentClassName="max-w-xl"
        description="Approve or reject a submission-driven profile change without leaving the reconciliation queue."
        onOpenChange={(open) => {
          setProposalReviewOpen(open);
          if (!open) {
            setProposalReviewDraft({
              action: "approve",
              beneficiaryId: "",
              beneficiaryUid: "",
              changes: [],
              comment: "",
              entityName: "",
              submissionId: "",
            });
          }
        }}
        open={proposalReviewOpen}
        title={proposalReviewDraft.action === "approve" ? "Approve profile update" : "Reject profile update"}
      >
        <ModalBody className="space-y-3">
          <div className="rounded-lg border bg-background p-3 text-sm">
            <p className="font-medium">{proposalReviewDraft.entityName || "Profile conflict decision"}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Beneficiary {proposalReviewDraft.beneficiaryUid || "linked record"} · Submission {proposalReviewDraft.submissionId || "not linked"}
            </p>
          </div>
          {proposalReviewDraft.changes.length ? (
            <div className="rounded-lg border bg-background p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Changed fields</p>
              <div className="mt-2">
                <ProfileChangeCards changes={proposalReviewDraft.changes} compact />
              </div>
            </div>
          ) : null}
          <label className="block text-sm font-medium">
            Decision comment <span aria-hidden="true" className="text-danger">*</span>
            <Textarea
              aria-invalid={proposalReviewDraft.comment.trim().length < 3}
              className="mt-2"
              placeholder={
                proposalReviewDraft.action === "approve"
                  ? `Explain why these ${primaryEntityLower} fields should become the official values.`
                  : `Explain why the proposed ${primaryEntityLower} changes should not replace the official profile.`
              }
              rows={4}
              value={proposalReviewDraft.comment}
              onChange={(event) => setProposalReviewDraft((current) => ({ ...current, comment: event.target.value }))}
            />
          </label>
        </ModalBody>
        <ModalFooter>
          <Button onClick={() => setProposalReviewOpen(false)} variant="secondary">Cancel</Button>
          <Button
            disabled={preview || reviewProposalMutation.isPending || proposalReviewDraft.comment.trim().length < 3}
            onClick={submitProposalReview}
            variant="primary"
          >
            {reviewProposalMutation.isPending
              ? "Saving…"
              : proposalReviewDraft.action === "approve"
                ? "Approve update"
                : "Reject update"}
          </Button>
        </ModalFooter>
      </Modal>
    </section>
  );
}

function QualityLanding({
  importCleaningRows,
  issues,
  onOpenProfileConflictDecision,
  onOpenProfileConflictFocusDecision,
  onOpenIssue,
  onOpenProfileConflictFocus,
  onOpenProfileConflicts,
  onOpenSection,
  primaryEntityLower,
  scores,
  summary,
}: {
  importCleaningRows: ImportCleaningRowRead[];
  issues: QualityIssue[];
  primaryEntityLower: string;
  onOpenProfileConflictDecision: (decisionFilter: Exclude<ProfileConflictDecisionFilter, "all">) => void;
  onOpenProfileConflictFocusDecision: (
    focus: Exclude<ProfileConflictFocusFilter, "all">,
    decisionFilter: Exclude<ProfileConflictDecisionFilter, "all">,
  ) => void;
  onOpenIssue: (issue: QualityIssue, tab?: IssueDetailTab) => void;
  onOpenProfileConflictFocus: (focus: Exclude<ProfileConflictFocusFilter, "all">) => void;
  onOpenProfileConflicts: () => void;
  onOpenSection: (section: DataQualitySection) => void;
  scores: Partial<Record<QualityScope, QualityScore>>;
  summary: ReturnType<typeof computeQualitySummary>;
}) {
  const prioritizedIssues = rankIssuesForAttention(issues);
  const profileConflictPressure = summarizeProfileConflictFocus(issues);
  const profileConflictFocusDecisionPressure = summarizeProfileConflictFocusDecisionStates(issues);
  const profileConflictDecisionCounts = summarizeProfileConflictDecisionStates(issues);
  const openIssueFromOverview = (issue: QualityIssue) => onOpenIssue(issue, preferredIssueDetailTab(issue));
  const cards = [
    { icon: Gauge, label: "Overall Data Quality Score", value: `${summary.overallScore}/100`, tone: scoreTone(summary.overallScore) },
    { icon: FileWarning, label: "Open Quality Issues", value: summary.openQualityIssues, tone: summary.openQualityIssues ? "warning" : "success" },
    { icon: AlertTriangle, label: "Critical Issues", value: summary.criticalIssues, tone: summary.criticalIssues ? "danger" : "success" },
    { icon: GitCompare, label: "Duplicate Records", onClick: () => onOpenSection("duplicates"), value: summary.duplicateRecords, tone: "warning" },
    { icon: ClipboardCheck, label: "Reconciliation Queue", onClick: () => onOpenSection("reconciliation"), value: summary.reconciliationIssues, tone: summary.reconciliationIssues ? "warning" : "success" },
    { icon: ClipboardCheck, label: "Profile Conflicts Pending", onClick: onOpenProfileConflicts, value: summary.profileConflictsPending, tone: summary.profileConflictsPending ? "warning" : "success" },
    { icon: ShieldCheck, label: "Ready Profile Conflicts", onClick: () => onOpenProfileConflictDecision("ready"), value: summary.profileConflictsReady, tone: summary.profileConflictsReady ? "success" : "neutral" },
    { icon: ShieldAlert, label: "Blocked Profile Conflicts", onClick: () => onOpenProfileConflictDecision("blocked"), value: summary.profileConflictsBlocked, tone: summary.profileConflictsBlocked ? "warning" : "neutral" },
    { icon: UploadCloud, label: "Import Rows to Clean", onClick: () => onOpenSection("import-cleaning"), value: importCleaningRows.length, tone: importCleaningRows.length ? "warning" : "success" },
    { icon: LocateFixed, label: "GPS Issues", onClick: () => onOpenSection("gps-issues"), value: summary.gpsIssues, tone: "danger" },
    { icon: ShieldAlert, label: "Validation Failures", onClick: () => onOpenSection("validation-failures"), value: summary.validationFailures, tone: "warning" },
    { icon: ClipboardCheck, label: "Missing Data Records", onClick: () => onOpenSection("missing-data"), value: summary.missingDataRecords, tone: "danger" },
    { icon: Sparkles, label: "High-Risk Submissions", onClick: () => onOpenSection("risk-alerts"), value: summary.highRiskSubmissions, tone: "danger" },
    { icon: CheckCircle2, label: "Resolved Issues", value: summary.resolvedIssues, tone: "success" },
  ] satisfies { icon: LucideIcon; label: string; onClick?: () => void; tone: BadgeProps["tone"]; value: number | string }[];

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => <MetricCard icon={card.icon} key={card.label} label={card.label} onClick={card.onClick} tone={card.tone} value={card.value} />)}
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel action={<Button onClick={() => onOpenSection("quality-dashboard")} size="sm" variant="secondary">Open dashboard</Button>} title="Quality Trends">
          <TrendBars scores={scores.Organization ?? {
            accuracy: 100,
            completeness: 100,
            consistency: 100,
            consentCompliance: 100,
            duplicateDetection: 100,
            gpsCompliance: 100,
            timeliness: 100,
            validationSuccess: 100,
          }} />
        </Panel>
        <Panel title="Open Investigations">
          <Timeline
            records={prioritizedIssues.filter((issue) => issue.status !== "Resolved" && issue.status !== "Closed").slice(0, 5).map((issue) => ({
              badge: issue.severity,
              label: issue.title,
              meta: `${issue.status} · ${issue.project} · ${issue.assignedTo}${issueAttentionNote(issue) ? ` · ${issueAttentionNote(issue)}` : ""}`,
              onClick: () => openIssueFromOverview(issue),
              tone: severityTone(issue.severity),
            }))}
          />
        </Panel>
      </div>
      {profileConflictPressure.length ? (
        <Panel title="Profile Conflict Pressure">
          <div className="mb-3 grid gap-3 md:grid-cols-2">
            <button className="rounded-xl border bg-background p-3 text-left transition hover:border-primary/40 hover:bg-primary/5" onClick={() => onOpenProfileConflictDecision("ready")} type="button">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">Ready for decision</p>
                <Badge tone="success">{profileConflictDecisionCounts.ready}</Badge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Conflicts with enough {primaryEntityLower} and submission context to approve or reject now.</p>
            </button>
            <button className="rounded-xl border bg-background p-3 text-left transition hover:border-primary/40 hover:bg-primary/5" onClick={() => onOpenProfileConflictDecision("blocked")} type="button">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">Blocked conflicts</p>
                <Badge tone="warning">{profileConflictDecisionCounts.blocked}</Badge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Conflicts that still need missing {primaryEntityLower} links or source submissions before decision.</p>
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {profileConflictFocusDecisionPressure.map((item) => (
              <div className="rounded-xl border bg-background p-3" key={item.focus}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{item.focus} conflicts</p>
                  <Badge tone={item.focus === "Identity" || item.focus === "Location" ? "warning" : "neutral"}>{item.count}</Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{profileConflictFocusDescription(item.focus)}</p>
                <p className="mt-2 text-[11px] font-medium text-foreground">
                  {item.ready ? `${item.ready} ready` : "0 ready"}
                  {item.blocked ? ` · ${item.blocked} blocked` : ""}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button onClick={() => onOpenProfileConflictFocus(item.focus)} size="sm" type="button" variant="secondary">
                    Open all conflicts
                  </Button>
                  {item.ready ? (
                    <Button
                      onClick={() => onOpenProfileConflictFocusDecision(item.focus, "ready")}
                      size="sm"
                      type="button"
                      variant="secondary"
                    >
                      Open ready conflicts ({item.ready})
                    </Button>
                  ) : null}
                  {item.blocked ? (
                    <Button
                      onClick={() => onOpenProfileConflictFocusDecision(item.focus, "blocked")}
                      size="sm"
                      type="button"
                      variant="secondary"
                    >
                      Open blocked conflicts ({item.blocked})
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      ) : null}
      <div className="grid gap-5 xl:grid-cols-3">
        <RankingPanel title="Quality by Project" rows={rankByField(issues, "project")} />
        <RankingPanel title="Quality by Form" rows={rankByField(issues, "form")} />
        <RankingPanel title="Quality by Issue Type" rows={rankByIssueType(issues)} />
      </div>
      <Panel title="Top Quality Issues">
        <IssueCards issues={prioritizedIssues.slice(0, 4)} onOpenIssue={openIssueFromOverview} />
      </Panel>
    </div>
  );
}

function QualityDashboard({ issues, onOpenIssue, scores }: { issues: QualityIssue[]; onOpenIssue: (issue: QualityIssue) => void; scores: Partial<Record<QualityScope, QualityScore>> }) {
  const pushToast = useWorkspaceStore((state) => state.pushToast);
  const prioritizedIssues = rankIssuesForAttention(issues.filter((issue) => issue.severity === "Critical" || issue.severity === "High"));

  function exportDashboard(): void {
    const severityRows = (["Critical", "High", "Medium", "Low"] as const).map((severity) => ({
      metric: `${severity} issues`,
      value: issues.filter((issue) => issue.severity === severity).length,
    }));
    const scoreRows = Object.entries(scores).map(([scope, score]) => {
      const value = calculateQualityScore(score);
      return { metric: `${scope} quality score`, value: `${value} (${qualityCategory(value)})` };
    });
    downloadCsv("atlas-data-quality-dashboard.csv", [
      ...severityRows,
      { metric: "Average score impact", value: averageResolutionImpact(issues) },
      ...scoreRows,
    ]);
    pushToast({ description: "The data quality dashboard summary CSV is ready.", title: "Dashboard exported", tone: "success" });
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={exportDashboard} type="button">
          <Download aria-hidden="true" />
          Export dashboard
        </Button>
      </div>
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <Panel title="Issue Severity Breakdown">
          <div className="grid gap-3 md:grid-cols-4">
            {(["Critical", "High", "Medium", "Low"] as const).map((severity) => (
              <div className="rounded-xl border bg-background p-4" key={severity}>
                <Badge tone={severityTone(severity)}>{severity}</Badge>
                <p className="mt-3 text-2xl font-semibold">{issues.filter((issue) => issue.severity === severity).length}</p>
                <p className="text-xs text-muted-foreground">Open and historical quality issues</p>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Resolution Progress">
          <div className="rounded-xl border bg-background p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Average score impact</p>
            <p className="mt-2 text-3xl font-semibold">{averageResolutionImpact(issues)}</p>
            <p className="mt-2 text-sm text-muted-foreground">Potential score recovery if open issues are resolved.</p>
          </div>
        </Panel>
      </div>
      <Panel title="Quality Heatmap">
        <div className="grid gap-3 md:grid-cols-4">
          {Object.entries(scores).map(([scope, score]) => {
            const value = calculateQualityScore(score);
            return (
              <div className="rounded-xl border bg-background p-4" key={scope}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{scope}</p>
                  <Badge tone={scoreTone(value)}>{value}</Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{qualityCategory(value)}</p>
              </div>
            );
          })}
        </div>
      </Panel>
      <Panel title="Issues Requiring Attention">
        <IssueCards issues={prioritizedIssues} onOpenIssue={onOpenIssue} />
      </Panel>
    </div>
  );
}

type BulkSignalUpdateHandler = (issueIds: string[], status: "resolved" | "under_investigation", comment: string) => Promise<void>;

function DuplicatesSection({ groups, issues, onBulkUpdate, onOpenIssue }: { groups: DuplicateGroup[]; issues: QualityIssue[]; onBulkUpdate?: BulkSignalUpdateHandler; onOpenIssue: (issue: QualityIssue) => void }) {
  const columns: TableColumn<DuplicateGroup>[] = [
    { header: "Group", key: "id", render: (group) => <div><p className="font-medium">{group.id}</p><p className="text-xs text-muted-foreground">{group.records.join(", ")}</p></div>, value: (group) => group.id },
    { header: "Method", key: "method", render: (group) => group.matchingMethod, value: (group) => group.matchingMethod },
    { header: "Fields", key: "fields", render: (group) => group.fields.join(", "), value: (group) => group.fields.join(" ") },
    { header: "Confidence", key: "confidence", render: (group) => `${group.confidence}%`, value: (group) => String(group.confidence) },
    { header: "Severity", key: "severity", render: (group) => <Badge tone={severityTone(group.severity)}>{group.severity}</Badge>, value: (group) => group.severity },
    { header: "Status", key: "status", render: (group) => <Badge tone={statusTone(group.status)}>{group.status}</Badge>, value: (group) => group.status },
  ];
  return (
    <div className="space-y-3">
      <SectionHeader description="Detect and manage exact, fuzzy, and rule-based duplicate records across entity IDs, household IDs, phone numbers, national IDs, GPS, and custom fields." route="/data-quality/duplicates" title="Duplicates" />
      {groups.length ? <DataTable columns={columns} emptyLabel="No duplicate groups yet" rows={groups} searchLabel="Search duplicate groups, fields, records" title="Duplicate groups" /> : null}
      <IssueTable description="Duplicate issue workflow for compare, merge, mark valid, or flag for investigation." issues={issues} onBulkUpdate={onBulkUpdate} onOpenIssue={onOpenIssue} route="/data-quality/duplicates" title="Duplicate Investigations" />
    </div>
  );
}

function OutliersSection({ issues, onBulkUpdate, onOpenIssue, outliers }: { issues: QualityIssue[]; onBulkUpdate?: BulkSignalUpdateHandler; onOpenIssue: (issue: QualityIssue) => void; outliers: OutlierRecord[] }) {
  const columns: TableColumn<OutlierRecord>[] = [
    { header: "Outlier", key: "outlier", render: (row) => <div><p className="font-medium">{row.field}</p><p className="text-xs text-muted-foreground">{row.outlierType}</p></div>, value: (row) => `${row.field} ${row.outlierType}` },
    { header: "Observed", key: "observed", render: (row) => row.observedValue, value: (row) => row.observedValue },
    { header: "Expected", key: "expected", render: (row) => row.expectedRange, value: (row) => row.expectedRange },
    { header: "Submission", key: "submission", render: (row) => row.submissionId, value: (row) => row.submissionId },
    { header: "Severity", key: "severity", render: (row) => <Badge tone={severityTone(row.severity)}>{row.severity}</Badge>, value: (row) => row.severity },
  ];
  return (
    <div className="space-y-3">
      <SectionHeader description="Identify statistical, business-rule, location, and behavioral outliers such as impossible ages, extreme income, and unusually fast surveys." route="/data-quality/outliers" title="Outliers" />
      {outliers.length ? <DataTable columns={columns} emptyLabel="No outliers yet" rows={outliers} searchLabel="Search outliers, fields, submissions" title="Outlier records" /> : null}
      <IssueTable description="Review outliers, mark valid, flag for correction, or assign investigation." issues={issues} onBulkUpdate={onBulkUpdate} onOpenIssue={onOpenIssue} route="/data-quality/outliers" title="Outlier Investigations" />
    </div>
  );
}

function GPSIssuesSection({ gpsIssues, issues, onBulkUpdate, onOpenIssue, onOpenMapping }: { gpsIssues: GPSIssueRecord[]; issues: QualityIssue[]; onBulkUpdate?: BulkSignalUpdateHandler; onOpenIssue: (issue: QualityIssue) => void; onOpenMapping: () => void }) {
  const columns: TableColumn<GPSIssueRecord>[] = [
    { header: "Issue", key: "issue", render: (row) => <div><p className="font-medium">{row.issueType}</p><p className="text-xs text-muted-foreground">{row.submissionId}</p></div>, value: (row) => `${row.issueType} ${row.submissionId}` },
    { header: "Coordinates", key: "coords", render: (row) => row.coordinates, value: (row) => row.coordinates },
    { header: "Accuracy", key: "accuracy", render: (row) => row.accuracyMeters === null ? "Missing" : `${row.accuracyMeters}m`, value: (row) => String(row.accuracyMeters ?? "missing") },
    { header: "Boundary", key: "boundary", render: (row) => row.boundary, value: (row) => row.boundary },
    { header: "Severity", key: "severity", render: (row) => <Badge tone={severityTone(row.severity)}>{row.severity}</Badge>, value: (row) => row.severity },
  ];
  return (
    <div className="space-y-3">
      <SectionHeader action={<Button onClick={onOpenMapping} variant="secondary"><MapPinned aria-hidden="true" /> Open Mapping</Button>} description="Monitor missing GPS, outside-boundary points, duplicate coordinates, low accuracy, suspicious locations, and invalid coordinates. GIS visualization remains in Mapping." route="/data-quality/gps-issues" title="GPS Issues" />
      {gpsIssues.length ? <DataTable columns={columns} emptyLabel="No GPS issues yet" rows={gpsIssues} searchLabel="Search GPS issues, submission, boundary" title="GPS issue records" /> : null}
      <IssueTable description="Assign investigation, open map, resolve issue, or return affected submission for correction." issues={issues} onBulkUpdate={onBulkUpdate} onOpenIssue={onOpenIssue} route="/data-quality/gps-issues" title="GPS Investigations" />
    </div>
  );
}

function ValidationFailuresSection({ failures, issues, onBulkUpdate, onOpenIssue }: { failures: ValidationFailureRecord[]; issues: QualityIssue[]; onBulkUpdate?: BulkSignalUpdateHandler; onOpenIssue: (issue: QualityIssue) => void }) {
  const columns: TableColumn<ValidationFailureRecord>[] = [
    { header: "Rule", key: "rule", render: (row) => <div><p className="font-medium">{row.ruleName}</p><p className="text-xs text-muted-foreground">{row.category}</p></div>, value: (row) => `${row.ruleName} ${row.category}` },
    { header: "Field", key: "field", render: (row) => row.field, value: (row) => row.field },
    { header: "Submission", key: "submission", render: (row) => row.submissionId, value: (row) => row.submissionId },
    { header: "Severity", key: "severity", render: (row) => <Badge tone={severityTone(row.severity)}>{row.severity}</Badge>, value: (row) => row.severity },
    { header: "Status", key: "status", render: (row) => <Badge tone={statusTone(row.status)}>{row.status}</Badge>, value: (row) => row.status },
  ];
  return (
    <div className="space-y-3">
      <SectionHeader description="Track range, logic, cross-field, conditional logic, and reference data rule failures generated by forms and workflows." route="/data-quality/validation-failures" title="Validation Failures" />
      {failures.length ? <DataTable columns={columns} emptyLabel="No validation failures yet" rows={failures} searchLabel="Search validation failures, rules, fields" title="Validation failure records" /> : null}
      <IssueTable description="Review failed rule, inspect submission, override with reason, or resolve the issue." issues={issues} onBulkUpdate={onBulkUpdate} onOpenIssue={onOpenIssue} route="/data-quality/validation-failures" title="Validation Investigations" />
    </div>
  );
}

function RiskAlertsSection({ alerts, issues, onBulkUpdate, onOpenGovernance, onOpenIssue }: { alerts: RiskAlertRecord[]; issues: QualityIssue[]; onBulkUpdate?: BulkSignalUpdateHandler; onOpenGovernance: () => void; onOpenIssue: (issue: QualityIssue) => void }) {
  const columns: TableColumn<RiskAlertRecord>[] = [
    { header: "Alert", key: "alert", render: (alert) => <div><p className="font-medium">{alert.pattern}</p><p className="text-xs text-muted-foreground">{alert.category}</p></div>, value: (alert) => `${alert.pattern} ${alert.category}` },
    { header: "Owner", key: "owner", render: (alert) => alert.owner, value: (alert) => alert.owner },
    { header: "Risk", key: "risk", render: (alert) => <Badge tone={severityTone(alert.riskLevel)}>{alert.riskLevel}</Badge>, value: (alert) => alert.riskLevel },
    { header: "Status", key: "status", render: (alert) => <Badge tone={statusTone(alert.status)}>{alert.status}</Badge>, value: (alert) => alert.status },
    { header: "Action", key: "action", render: (alert) => alert.recommendedAction, value: (alert) => alert.recommendedAction },
  ];
  return (
    <div className="space-y-3">
      <SectionHeader action={<Button onClick={onOpenGovernance} variant="secondary"><ShieldCheck aria-hidden="true" /> Governance review</Button>} description="Investigate data fraud, enumerator fraud, submission manipulation, location fraud, mass duplicates, and abnormal activity." route="/data-quality/risk-alerts" title="Risk Alerts" />
      {alerts.length ? <DataTable columns={columns} emptyLabel="No risk alerts yet" rows={alerts} searchLabel="Search risk alerts, owners, patterns" title="Risk alert center" /> : null}
      <IssueTable description="Escalate, assign reviewer, resolve, or send suspicious high-risk records to Governance Review." issues={issues} onBulkUpdate={onBulkUpdate} onOpenIssue={onOpenIssue} route="/data-quality/risk-alerts" title="High-Risk Investigations" />
    </div>
  );
}

function QualityRulesSection({ rules }: { rules: QualityRuleRecord[] }) {
  const pushToast = useWorkspaceStore((state) => state.pushToast);
  const columns: TableColumn<QualityRuleRecord>[] = [
    { header: "Rule", key: "name", render: (rule) => <div><p className="font-medium">{rule.name}</p><p className="text-xs text-muted-foreground">{rule.description}</p></div>, value: (rule) => `${rule.name} ${rule.description}` },
    { header: "Type", key: "type", render: (rule) => rule.type, value: (rule) => rule.type },
    { header: "Scope", key: "scope", render: (rule) => <div><p>{rule.scope}</p><p className="text-xs text-muted-foreground">{rule.project}</p></div>, value: (rule) => `${rule.scope} ${rule.project}` },
    { header: "Severity", key: "severity", render: (rule) => <Badge tone={severityTone(rule.severity)}>{rule.severity}</Badge>, value: (rule) => rule.severity },
    { header: "Status", key: "active", render: (rule) => <Badge tone={rule.active ? "success" : "neutral"}>{rule.active ? "Active" : "Archived"}</Badge>, value: (rule) => String(rule.active) },
  ];
  return (
    <div className="space-y-3">
      <SectionHeader action={<Button onClick={() => pushToast({ description: "Connect a quality-rules service to author new completeness, consistency, GPS, duplicate, outlier, or timeliness rules. This control is a preview for now.", title: "Creating rules isn't available yet", tone: "warning" })} type="button"><Plus aria-hidden="true" /> Create Rule</Button>} description="Manage platform-wide completeness, consistency, GPS, duplicate, outlier, timeliness, and custom rules with project, form, indicator, or organization scope." route="/data-quality/rules" title="Quality Rules" />
      <DataTable columns={columns} emptyLabel="No quality rules yet" rows={rules} searchLabel="Search rules, type, scope, project" title="Quality rules management" />
    </div>
  );
}

function ImportCleaningSection({
  isLoading,
  onBulkSave,
  onConfirmRows,
  onOpenRow,
  rows,
}: {
  isLoading: boolean;
  onBulkSave: (rows: { submissionId: string; responses: Record<string, unknown> }[], reason: string) => Promise<void>;
  onConfirmRows: (rows: ImportCleaningRowRead[]) => Promise<void>;
  onOpenRow: (row: ImportCleaningRowRead) => void;
  rows: ImportCleaningRowRead[];
}) {
  const [busyRowId, setBusyRowId] = useState<string | null>(null);
  const [activeFormId, setActiveFormId] = useState("");
  const [bulkDraft, setBulkDraft] = useState<Record<string, Record<string, string>>>({});
  const [bulkReason, setBulkReason] = useState("Cleaned imported form rows in the Data Quality bulk editor.");
  const [errorMessage, setErrorMessage] = useState("");
  const [rowSearch, setRowSearch] = useState("");
  const [showIssueRowsOnly, setShowIssueRowsOnly] = useState(false);
  const readyRows = rows.filter((row) => row.ready_to_confirm);
  const issueRows = rows.filter((row) => !row.ready_to_confirm);
  const formOptions = useMemo(() => {
    const forms = new Map<string, { id: string; name: string; count: number }>();
    for (const row of rows) {
      const current = forms.get(row.form_id);
      forms.set(row.form_id, { count: (current?.count ?? 0) + 1, id: row.form_id, name: row.form_name });
    }
    return Array.from(forms.values()).sort((left, right) => left.name.localeCompare(right.name));
  }, [rows]);
  const selectedFormId = activeFormId || formOptions[0]?.id || "";
  const selectedRows = rows.filter((row) => row.form_id === selectedFormId);
  const bulkColumns = useMemo(() => {
    const keys = new Set<string>();
    for (const row of selectedRows) {
      Object.keys(row.response_values ?? {}).forEach((key) => keys.add(key));
      row.missing_field_keys.forEach((key) => keys.add(key));
    }
    return Array.from(keys).filter(Boolean).sort((left, right) => {
      const leftMissing = selectedRows.some((row) => row.missing_field_keys.includes(left));
      const rightMissing = selectedRows.some((row) => row.missing_field_keys.includes(right));
      if (leftMissing !== rightMissing) return leftMissing ? -1 : 1;
      return left.localeCompare(right);
    });
  }, [selectedRows]);
  const visibleRows = useMemo(() => {
    const query = rowSearch.trim().toLowerCase();
    return selectedRows.filter((row) => {
      if (showIssueRowsOnly && row.ready_to_confirm) return false;
      if (!query) return true;
      const haystack = [
        row.client_submission_id,
        row.source_record_id ?? "",
        row.source_system ?? "",
        row.uploaded_by_name ?? "",
        ...row.missing_fields,
        ...Object.values(row.response_values ?? {}).map((value) => String(value ?? "")),
      ].join(" ").toLowerCase();
      return haystack.includes(query);
    });
  }, [rowSearch, selectedRows, showIssueRowsOnly]);
  const changedRows = selectedRows
    .map((row) => {
      const changes = bulkDraft[row.id] ?? {};
      const responses: Record<string, unknown> = { ...(row.response_values ?? {}) };
      for (const [key, value] of Object.entries(changes)) {
        responses[key] = value;
      }
      return { changed: Object.keys(changes).length > 0, responses, submissionId: row.id };
    })
    .filter((row) => row.changed);

  async function confirmRows(selectedRows: ImportCleaningRowRead[], busyId = "batch"): Promise<void> {
    if (!selectedRows.length) return;
    setBusyRowId(busyId);
    setErrorMessage("");
    try {
      await onConfirmRows(selectedRows);
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError && error.status === 403
          ? "You need Data Import permission (data.import) to confirm cleaned uploaded rows. Ask an organization owner or admin to update your role in Users & Teams > Permissions."
          : error instanceof Error ? error.message : "The selected import rows could not be confirmed.",
      );
    } finally {
      setBusyRowId(null);
    }
  }

  async function saveBulkChanges(): Promise<void> {
    if (!changedRows.length) return;
    setBusyRowId("bulk-save");
    setErrorMessage("");
    try {
      await onBulkSave(changedRows, bulkReason);
      setBulkDraft({});
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError && error.status === 403
          ? "You need Bulk Edit permission (data.bulk_edit) to save many cleaned rows. Ask an organization owner or admin to update your role in Users & Teams > Permissions."
          : error instanceof Error ? error.message : "Bulk row cleaning could not be saved.",
      );
    } finally {
      setBusyRowId(null);
    }
  }

  function cellValue(row: ImportCleaningRowRead, key: string): string {
    const draftValue = bulkDraft[row.id]?.[key];
    if (draftValue !== undefined) return draftValue;
    const value = row.response_values?.[key];
    if (value === null || value === undefined) return "";
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  }

  function updateCell(rowId: string, key: string, value: string): void {
    setBulkDraft((current) => ({
      ...current,
      [rowId]: {
        ...(current[rowId] ?? {}),
        [key]: value,
      },
    }));
  }

  const totalColumnCount = bulkColumns.length + 4;
  const gridWidth = Math.max(880, 520 + bulkColumns.length * 132);

  return (
    <div className="space-y-2">
      <section className="rounded-xl border bg-panel shadow-line">
        <div className="flex flex-col gap-2 border-b bg-muted/25 px-3 py-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge tone="warning">Import Cleaning</Badge>
              <Badge tone={issueRows.length ? "danger" : "success"}>{issueRows.length} need cleaning</Badge>
              <Badge tone={readyRows.length ? "success" : "neutral"}>{readyRows.length} ready</Badge>
              <Badge tone="neutral">{bulkColumns.length} fields</Badge>
            </div>
            <h2 className="mt-1 text-sm font-semibold">Excel-style cleaning workspace</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Edit cells directly, scroll across all fields, save changes, then confirm rows that are ready for platform use.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Button disabled={!changedRows.length || busyRowId === "bulk-save"} onClick={saveBulkChanges} size="sm" type="button">
              <Save aria-hidden="true" /> Save {changedRows.length || ""} change{changedRows.length === 1 ? "" : "s"}
            </Button>
            <Button disabled={!selectedRows.some((row) => row.ready_to_confirm) || busyRowId === "bulk-confirm"} onClick={() => confirmRows(selectedRows.filter((row) => row.ready_to_confirm), "bulk-confirm")} size="sm" type="button" variant="secondary">
              <CheckCircle2 aria-hidden="true" /> Confirm ready
            </Button>
            <Button disabled={!readyRows.length || busyRowId === "batch"} onClick={() => confirmRows(readyRows)} size="sm" type="button" variant="secondary">
              Confirm all
            </Button>
          </div>
        </div>
        <div className="grid gap-2 border-b px-3 py-2 lg:grid-cols-[minmax(220px,320px)_minmax(220px,1fr)_180px] lg:items-end">
          <label className="grid gap-1">
            <span className="text-[11px] font-semibold text-muted-foreground">Form</span>
            <select
              className="h-7 rounded-md border bg-background px-2 text-xs shadow-line"
              id="import-cleaning-form-filter"
              onChange={(event) => {
                setActiveFormId(event.target.value);
                setBulkDraft({});
                setRowSearch("");
              }}
              value={selectedFormId}
            >
              {formOptions.map((form) => (
                <option key={form.id} value={form.id}>{form.name} ({form.count})</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1">
            <span className="text-[11px] font-semibold text-muted-foreground">Cleaning reason</span>
            <input
              className="h-7 rounded-md border bg-background px-2 text-xs shadow-line"
              onChange={(event) => setBulkReason(event.target.value)}
              value={bulkReason}
            />
          </label>
          <label className="flex h-7 items-center gap-2 rounded-md border bg-background px-2 text-xs">
            <input checked={showIssueRowsOnly} onChange={(event) => setShowIssueRowsOnly(event.target.checked)} type="checkbox" />
            Rows with issues
          </label>
        </div>
        <div className="flex flex-col gap-2 border-b px-3 py-2 md:flex-row md:items-center md:justify-between">
          <label className="relative w-full md:max-w-md">
            <span className="sr-only">Search rows</span>
            <input
              className="h-7 w-full rounded-md border bg-background px-2 text-xs shadow-line"
              onChange={(event) => setRowSearch(event.target.value)}
              placeholder="Search row ID, source, missing field, or cell value"
              value={rowSearch}
            />
          </label>
          <p className="text-[11px] text-muted-foreground">
            Showing {visibleRows.length} of {selectedRows.length} rows · {totalColumnCount} columns · small cells for dense review
          </p>
        </div>
      </section>
      {errorMessage ? (
        <section className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm" role="alert">
          {errorMessage}
        </section>
      ) : null}
      {isLoading ? (
        <section className="rounded-xl border bg-panel p-4 shadow-line" aria-live="polite">
          <p className="text-sm font-semibold">Loading staged uploaded rows</p>
          <p className="mt-1 text-sm text-muted-foreground">Atlas is checking uploaded form rows that still need cleaning or confirmation.</p>
        </section>
      ) : null}
      {selectedRows.length && bulkColumns.length ? (
        <div className="h-[calc(100vh-250px)] min-h-[520px] overflow-auto rounded-xl border bg-background product-scrollbar">
          <table className="table-fixed border-separate border-spacing-0 text-left text-[11px]" style={{ width: `${gridWidth}px` }}>
            <thead className="sticky top-0 z-20 bg-muted/80 text-muted-foreground shadow-line backdrop-blur">
              <tr>
                <th className="sticky left-0 z-30 w-36 border-b border-r bg-muted/90 px-1.5 py-1 font-semibold">Row</th>
                <th className="w-24 border-b border-r px-1.5 py-1 font-semibold">Status</th>
                <th className="w-28 border-b border-r px-1.5 py-1 font-semibold">Issues</th>
                <th className="w-28 border-b border-r px-1.5 py-1 font-semibold">Source</th>
                {bulkColumns.map((key) => (
                  <th className="w-32 border-b border-r px-1.5 py-1 font-semibold" key={key}>
                    <span className="block truncate" title={titleCase(key)}>{titleCase(key)}</span>
                    <span className="block truncate text-[11px] font-normal leading-3" title={key}>{key}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row, rowIndex) => (
                <tr className={cn("hover:bg-primary/5", rowIndex % 2 ? "bg-muted/10" : "bg-background")} key={row.id}>
                  <td className="sticky left-0 z-10 border-b border-r bg-inherit px-1.5 py-1 align-top">
                    <button className="block max-w-32 truncate font-semibold text-primary hover:underline" onClick={() => onOpenRow(row)} title={formatSubmissionId(row)} type="button">
                      {formatSubmissionId(row)}
                    </button>
                    <span className="block truncate text-[11px] text-muted-foreground">#{row.source_record_id ?? "?"}</span>
                  </td>
                  <td className="border-b border-r px-1 py-1 align-top">
                    <Badge tone={row.ready_to_confirm ? "success" : "warning"}>{row.ready_to_confirm ? "Ready" : "Clean"}</Badge>
                  </td>
                  <td className="border-b border-r px-1.5 py-1 align-top">
                    <span className={cn("font-semibold", row.missing_field_count ? "text-danger" : "text-muted-foreground")}>
                      {row.missing_field_count ? `${row.missing_field_count} missing` : `${row.issue_count} issue(s)`}
                    </span>
                  </td>
                  <td className="border-b border-r px-1.5 py-1 align-top">
                    <span className="block truncate" title={row.source_system ?? "Uploaded file"}>{row.source_system ?? "Uploaded"}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">{row.uploaded_by_name ?? "Unknown"}</span>
                  </td>
                  {bulkColumns.map((key) => {
                    const missing = row.missing_field_keys.includes(key);
                    const changed = bulkDraft[row.id]?.[key] !== undefined;
                    return (
                      <td className={cn("border-b border-r p-0 align-top", missing ? "bg-danger/5" : changed ? "bg-success/10" : "")} key={key}>
                        <input
                          aria-label={`${row.client_submission_id} ${key}`}
                          className={cn(
                            "h-6 w-full rounded-none border-0 bg-transparent px-1.5 text-[11px] leading-6 outline-none ring-inset transition focus:bg-primary/5 focus:ring-1 focus:ring-primary",
                            missing && !cellValue(row, key) ? "text-danger placeholder:text-danger/70" : "text-foreground",
                          )}
                          onChange={(event) => updateCell(row.id, key, event.target.value)}
                          placeholder={missing ? "Missing" : ""}
                          value={cellValue(row, key)}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
              {!visibleRows.length ? (
                <tr>
                  <td className="px-4 py-12 text-center text-sm text-muted-foreground" colSpan={totalColumnCount}>
                    No rows match the current filter.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed bg-muted/20 p-5 text-sm text-muted-foreground">
          <Table2 aria-hidden="true" className="mb-2" size={18} />
          Choose a form with staged uploaded rows to edit values in bulk.
        </div>
      )}
    </div>
  );
}

function evidenceText(issue: QualityIssue, key: string): string {
  const value = issue.evidenceJson?.[key];
  return typeof value === "string" && value.trim() ? value : "";
}

/** Human-readable submission label for an issue — never the raw UUID. */
function issueSubmissionLabel(issue: QualityIssue): string {
  if (issue.submissionId === "Not linked") return "Not linked";
  const clientId = evidenceText(issue, "client_submission_id");
  return clientId ? formatSubmissionId({ client_submission_id: clientId }) : "Linked submission";
}

function ProfileChangeCards({
  changes,
  columns = "grid-cols-1",
  compact = false,
}: {
  changes: { current: string; field: string; proposed: string }[];
  columns?: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("grid gap-2", columns)}>
      {changes.map((change) => {
        const sensitivity = profileFieldSensitivity(change.field);
        return (
          <div className={cn("rounded-md border bg-panel px-3 py-2 text-sm", compact ? "" : "md:min-h-28")} key={change.field}>
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium">{titleCase(change.field)}</p>
              <Badge tone={sensitivity === "Sensitive" ? "warning" : "neutral"}>{sensitivity}</Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Current: {change.current}</p>
            <p className="text-xs">Proposed: {change.proposed}</p>
            <p className="mt-2 text-[11px] leading-5 text-muted-foreground">{profileFieldDecisionHint(change.field)}</p>
          </div>
        );
      })}
    </div>
  );
}

function ReconciliationSection({
  isUpdating,
  isReviewingProposal,
  issues,
  onChangeFilter,
  onChangeProfileConflictDecision,
  onChangeProfileConflictFocus,
  onOpenApproveProposal,
  onMarkResolved,
  onMarkUnderInvestigation,
  onOpenBeneficiary,
  onOpenIssue,
  onOpenRejectProposal,
  onOpenSubmission,
  primaryEntityLower,
  selectedProfileConflictDecision,
  selectedProfileConflictFocus,
  selectedFilter,
}: {
  isUpdating: boolean;
  isReviewingProposal: boolean;
  issues: QualityIssue[];
  primaryEntityLower: string;
  onChangeFilter: (filter: ReconciliationFocusFilter) => void;
  onChangeProfileConflictDecision: (filter: ProfileConflictDecisionFilter) => void;
  onChangeProfileConflictFocus: (focus: ProfileConflictFocusFilter) => void;
  onOpenApproveProposal: (issue: QualityIssue) => void;
  onMarkResolved: (issue: QualityIssue) => void;
  onMarkUnderInvestigation: (issue: QualityIssue) => void;
  onOpenBeneficiary: (beneficiaryId: string) => void;
  onOpenIssue: (issue: QualityIssue) => void;
  onOpenRejectProposal: (issue: QualityIssue) => void;
  onOpenSubmission: (submissionId: string) => void;
  selectedProfileConflictDecision: ProfileConflictDecisionFilter;
  selectedProfileConflictFocus: ProfileConflictFocusFilter;
  selectedFilter: ReconciliationFocusFilter;
}) {
  const reconciliationIssues = filterReconciliationIssues(issues, selectedFilter);
  const profileConflictIssues = filterReconciliationIssues(issues, "profile_conflicts");
  const decisionScopedProfileConflictIssues = filterProfileConflictsByDecisionState(profileConflictIssues, selectedProfileConflictDecision);
  const profileConflictDecisionCounts = summarizeProfileConflictDecisionStates(profileConflictIssues);
  const profileConflictFocusDecisionTotals = summarizeProfileConflictFocusDecisionStates(profileConflictIssues);
  const filteredIssues =
    selectedFilter === "profile_conflicts"
      ? filterProfileConflictsByFocus(decisionScopedProfileConflictIssues, selectedProfileConflictFocus)
      : reconciliationIssues;
  const filterCounts = countReconciliationIssuesByFilter(issues);
  const profileConflictFocusDecisionPressure = summarizeProfileConflictFocusDecisionStates(decisionScopedProfileConflictIssues);
  const selectedFocusDecisionTotals =
    selectedProfileConflictFocus === "all"
      ? null
      : profileConflictFocusDecisionTotals.find((item) => item.focus === selectedProfileConflictFocus) ?? null;
  const readyDecisionCount = selectedFocusDecisionTotals?.ready ?? profileConflictDecisionCounts.ready;
  const blockedDecisionCount = selectedFocusDecisionTotals?.blocked ?? profileConflictDecisionCounts.blocked;
  const selectedFocusVisibleCount =
    selectedProfileConflictDecision === "ready"
      ? selectedFocusDecisionTotals?.ready ?? 0
      : selectedProfileConflictDecision === "blocked"
        ? selectedFocusDecisionTotals?.blocked ?? 0
        : selectedFocusDecisionTotals?.count ?? 0;
  const selectedDecisionVisibleCount =
    selectedFilter === "profile_conflicts" && selectedProfileConflictDecision !== "all" ? filteredIssues.length : 0;
  const selectedFocusVisibleCountLabel =
    selectedFocusVisibleCount === 1 ? "1 conflict currently matches this queue." : `${selectedFocusVisibleCount} conflicts currently match this queue.`;
  const selectedDecisionVisibleCountLabel =
    selectedDecisionVisibleCount === 1 ? "1 conflict is currently in this queue." : `${selectedDecisionVisibleCount} conflicts are currently in this queue.`;
  const readyDecisionCountLabel = readyDecisionCount === 1 ? "1 ready conflict" : `${readyDecisionCount} ready conflicts`;
  const blockedDecisionCountLabel = blockedDecisionCount === 1 ? "1 blocked conflict" : `${blockedDecisionCount} blocked conflicts`;
  const profileConflictFocusFilterOptions = profileConflictFocusDecisionTotals.map((item) => {
    const scopedItem = profileConflictFocusDecisionPressure.find((candidate) => candidate.focus === item.focus);
    const visibleCount =
      selectedProfileConflictDecision === "ready"
        ? scopedItem?.ready ?? 0
        : selectedProfileConflictDecision === "blocked"
          ? scopedItem?.blocked ?? 0
          : item.count;
    return {
      ...item,
      visibleCount,
    };
  });
  const prioritizedIssues =
    selectedFilter === "profile_conflicts"
      ? sortProfileConflictIssuesForReview(filteredIssues)
      : [...filteredIssues].sort((left, right) => {
          const leftChanges = profileConflictChangesFromEvidence(left.evidenceJson);
          const rightChanges = profileConflictChangesFromEvidence(right.evidenceJson);
          const leftSensitive = leftChanges.filter((change) => profileFieldSensitivity(change.field) === "Sensitive").length;
          const rightSensitive = rightChanges.filter((change) => profileFieldSensitivity(change.field) === "Sensitive").length;
          return rightSensitive - leftSensitive;
        });
  const emptyTitle =
    selectedFilter === "profile_conflicts"
      ? selectedProfileConflictDecision === "ready"
        ? selectedProfileConflictFocus === "all"
          ? "No profile conflicts are ready for decision."
          : `No ${selectedProfileConflictFocus.toLowerCase()} conflicts are ready for decision.`
        : selectedProfileConflictDecision === "blocked"
          ? selectedProfileConflictFocus === "all"
            ? "No blocked profile conflicts need action."
            : `No blocked ${selectedProfileConflictFocus.toLowerCase()} conflicts need action.`
          : selectedProfileConflictFocus === "all"
            ? "No profile conflicts need action."
            : `No ${selectedProfileConflictFocus.toLowerCase()} conflicts need action.`
      : "No other reconciliation items need action.";
  const emptyDescription =
    selectedFilter === "profile_conflicts"
      ? selectedProfileConflictDecision === "ready"
        ? selectedProfileConflictFocus === "all"
          ? `Every profile conflict with enough ${primaryEntityLower} and submission context has already been decided.`
          : `${selectedProfileConflictFocus} conflicts with enough ${primaryEntityLower} and submission context have already been decided.`
        : selectedProfileConflictDecision === "blocked"
          ? selectedProfileConflictFocus === "all"
            ? `No profile conflicts are currently waiting for missing ${primaryEntityLower} links or source submissions.`
            : `No ${selectedProfileConflictFocus.toLowerCase()} conflicts are currently waiting for missing ${primaryEntityLower} links or source submissions.`
          : selectedProfileConflictFocus === "all"
            ? `Submission-driven ${primaryEntityLower} profile changes have all been decided.`
            : `${selectedProfileConflictFocus} conflicts have all been cleared from the reconciliation queue.`
      : "The remaining queue is made up of profile conflicts only.";
  return (
    <div className="space-y-3">
      <SectionHeader
        description="Resolve unlinked approved submissions, possible duplicate entities, profile conflicts, and imported records that need a human data-manager decision before they enter official results."
        route="/data-quality/reconciliation"
        title="Reconciliation Queue"
      />
      <div className="flex flex-wrap gap-2">
        {[
          { label: "All reconciliation", value: "all" as const },
          { label: "Profile conflicts", value: "profile_conflicts" as const },
          { label: "Other reconciliation", value: "other_reconciliation" as const },
        ].map((option) => (
          <button
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs transition",
              selectedFilter === option.value ? "border-primary/50 bg-primary/10 text-foreground" : "bg-background text-muted-foreground hover:text-foreground",
            )}
            key={option.value}
            onClick={() => {
              onChangeFilter(option.value);
              if (option.value !== "profile_conflicts") {
                onChangeProfileConflictFocus("all");
                onChangeProfileConflictDecision("all");
              }
            }}
            type="button"
          >
            {option.label} ({filterCounts[option.value]})
          </button>
        ))}
      </div>
      {selectedFilter === "profile_conflicts" && profileConflictFocusFilterOptions.length ? (
        <div className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <button
              className={cn(
                "rounded-xl border bg-background p-3 text-left transition hover:border-primary/40 hover:bg-primary/5",
                selectedProfileConflictDecision === "ready" ? "border-primary/50 bg-primary/10" : "",
              )}
              onClick={() => onChangeProfileConflictDecision(selectedProfileConflictDecision === "ready" ? "all" : "ready")}
              type="button"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">Ready for decision</p>
                <Badge tone="success">{readyDecisionCount}</Badge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {selectedProfileConflictFocus === "all"
                  ? "Managers can approve or reject these now."
                  : `${selectedProfileConflictFocus} conflicts that are ready for approval or rejection.`}
              </p>
              <p className="mt-2 text-[11px] font-medium text-foreground">{readyDecisionCountLabel}</p>
            </button>
            <button
              className={cn(
                "rounded-xl border bg-background p-3 text-left transition hover:border-primary/40 hover:bg-primary/5",
                selectedProfileConflictDecision === "blocked" ? "border-primary/50 bg-primary/10" : "",
              )}
              onClick={() => onChangeProfileConflictDecision(selectedProfileConflictDecision === "blocked" ? "all" : "blocked")}
              type="button"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">Blocked conflicts</p>
                <Badge tone="warning">{blockedDecisionCount}</Badge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {selectedProfileConflictFocus === "all"
                  ? `These still need missing ${primaryEntityLower} or submission context.`
                  : `${selectedProfileConflictFocus} conflicts still missing ${primaryEntityLower} or submission context.`}
              </p>
              <p className="mt-2 text-[11px] font-medium text-foreground">{blockedDecisionCountLabel}</p>
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs transition",
                selectedProfileConflictFocus === "all" ? "border-primary/50 bg-primary/10 text-foreground" : "bg-background text-muted-foreground hover:text-foreground",
              )}
              onClick={() => onChangeProfileConflictFocus("all")}
              type="button"
            >
              {selectedProfileConflictDecision === "ready"
                ? `All ready conflicts (${decisionScopedProfileConflictIssues.length})`
                : selectedProfileConflictDecision === "blocked"
                  ? `All blocked conflicts (${decisionScopedProfileConflictIssues.length})`
                  : `All profile conflicts (${decisionScopedProfileConflictIssues.length})`}
              {selectedProfileConflictDecision === "all" && (profileConflictDecisionCounts.ready || profileConflictDecisionCounts.blocked)
                ? ` · ${profileConflictDecisionCounts.ready} ready${profileConflictDecisionCounts.blocked ? ` · ${profileConflictDecisionCounts.blocked} blocked` : ""}`
                : ""}
            </button>
            {profileConflictFocusFilterOptions.map((item) => (
              <button
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs transition",
                  selectedProfileConflictFocus === item.focus ? "border-primary/50 bg-primary/10 text-foreground" : "bg-background text-muted-foreground hover:text-foreground",
                )}
                key={item.focus}
                onClick={() => onChangeProfileConflictFocus(item.focus)}
                type="button"
              >
                {selectedProfileConflictDecision === "ready"
                  ? `${item.focus} ready conflicts (${item.visibleCount})`
                  : selectedProfileConflictDecision === "blocked"
                    ? `${item.focus} blocked conflicts (${item.visibleCount})`
                    : `${item.focus} conflicts (${item.visibleCount})`}
                {selectedProfileConflictDecision === "all" && (item.ready || item.blocked)
                  ? ` · ${item.ready || 0} ready${item.blocked ? ` · ${item.blocked} blocked` : ""}`
                  : ""}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {selectedFilter === "profile_conflicts" && selectedProfileConflictFocus !== "all" ? (
        <div className="rounded-xl border border-primary/25 bg-primary/5 p-3">
          <p className="text-sm font-semibold">
            {selectedProfileConflictDecision === "ready"
              ? `${selectedProfileConflictFocus} ready conflicts`
              : selectedProfileConflictDecision === "blocked"
                ? `${selectedProfileConflictFocus} blocked conflicts`
                : `${selectedProfileConflictFocus} conflicts`}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {profileConflictFocusDescription(selectedProfileConflictFocus)}
            {selectedProfileConflictDecision !== "all" ? ` ${selectedFocusVisibleCountLabel}` : ""}
          </p>
          {selectedFocusDecisionTotals ? (
            <p className="mt-2 text-xs font-medium text-foreground">
              {selectedFocusDecisionTotals.ready ? `${selectedFocusDecisionTotals.ready} ready` : "0 ready"}
              {selectedFocusDecisionTotals.blocked ? ` · ${selectedFocusDecisionTotals.blocked} blocked` : ""}
            </p>
          ) : null}
        </div>
      ) : null}
      {selectedFilter === "profile_conflicts" && selectedProfileConflictDecision !== "all" ? (
        <div className="rounded-xl border border-primary/25 bg-primary/5 p-3">
          <p className="text-sm font-semibold">
            {selectedProfileConflictDecision === "ready" ? "Ready for decision" : "Blocked"}{" "}
            {selectedProfileConflictFocus === "all" ? "profile conflicts" : `${selectedProfileConflictFocus.toLowerCase()} conflicts`}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {selectedProfileConflictDecision === "ready"
              ? selectedProfileConflictFocus === "all"
                ? `These conflicts have enough linked context for managers to approve or reject immediately. ${selectedDecisionVisibleCountLabel}`
                : `These ${selectedProfileConflictFocus.toLowerCase()} conflicts have enough linked context for managers to approve or reject immediately. ${selectedDecisionVisibleCountLabel}`
              : selectedProfileConflictFocus === "all"
                ? `These conflicts still need missing ${primaryEntityLower} or submission context before a final decision can be made. ${selectedDecisionVisibleCountLabel}`
                : `These ${selectedProfileConflictFocus.toLowerCase()} conflicts still need missing ${primaryEntityLower} or submission context before a final decision can be made. ${selectedDecisionVisibleCountLabel}`}
          </p>
        </div>
      ) : null}
      <div className="grid gap-3">
        {prioritizedIssues.map((issue) => {
          const candidateId = evidenceText(issue, "candidate_beneficiary_id");
          const candidateUid = evidenceText(issue, "candidate_beneficiary_uid") || evidenceText(issue, "beneficiary_uid");
          const matchedFields = Array.isArray(issue.evidenceJson?.matched_fields)
            ? issue.evidenceJson?.matched_fields.map(String).join(", ")
            : "";
          const proposedChanges = profileConflictChangesFromEvidence(issue.evidenceJson);
          const reviewFocus = profileConflictReviewFocus(proposedChanges.map((change) => change.field));
          const sensitiveFieldCount = profileConflictSensitiveFieldCount(proposedChanges.map((change) => change.field));
          const requiresDecision = requiresProfileConflictDecision(issue);
          const decisionBlocker = profileConflictDecisionBlocker(issue);
          const decisionState = profileConflictDecisionState(issue);
          const canReviewProposal =
            requiresDecision &&
            Boolean(evidenceText(issue, "beneficiary_id")) &&
            issue.submissionId !== "Not linked";
          const reviewDetailsLabel =
            requiresDecision && decisionBlocker
              ? "Open blocker details"
              : canReviewProposal
                ? "Open update decision"
                : requiresDecision
                  ? "Open conflict decision"
                  : "Open issue details";
          return (
            <article className="rounded-xl border bg-panel p-3.5 shadow-line" key={issue.id}>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={severityTone(issue.severity)}>{issue.severity}</Badge>
                    <Badge tone={statusTone(issue.status)}>{issue.status}</Badge>
                    <Badge tone="warning">{issue.type}</Badge>
                    {decisionState ? <Badge tone={decisionState.tone}>{decisionState.label}</Badge> : null}
                  </div>
                  <h3 className="mt-2 font-semibold">{issue.title}</h3>
                  <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">{issue.description}</p>
                  <div className="mt-3 grid gap-2 text-xs text-muted-foreground md:grid-cols-2 xl:grid-cols-4">
                    <span>Submission: {issueSubmissionLabel(issue)}</span>
                    <span>Candidate: {candidateUid || "None"}</span>
                    <span>Matched: {matchedFields || "Not recorded"}</span>
                    <span>Recommended: {issue.recommendedAction}</span>
                  </div>
                  {canReviewProposal ? (
                    <div className="mt-3 rounded-lg border bg-background p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Proposed profile changes</p>
                        {reviewFocus.map((focus) => (
                          <Badge key={focus} tone={focus === "Identity" || focus === "Location" ? "warning" : "neutral"}>
                            {focus} conflict
                          </Badge>
                        ))}
                        {sensitiveFieldCount ? <Badge tone="warning">{sensitiveFieldCount} sensitive</Badge> : null}
                      </div>
                      <div className="mt-2">
                        <ProfileChangeCards changes={proposedChanges} columns="md:grid-cols-2" compact />
                      </div>
                    </div>
                  ) : null}
                  {requiresDecision && decisionBlocker ? (
                    <div className="mt-3 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-foreground">
                      {decisionBlocker}
                    </div>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button onClick={() => onOpenIssue(issue)} size="sm" type="button" variant="secondary">
                    {reviewDetailsLabel}
                  </Button>
                  {issue.submissionId !== "Not linked" ? (
                    <Button onClick={() => onOpenSubmission(issue.submissionId)} size="sm" type="button" variant="secondary">
                      Open submission
                    </Button>
                  ) : null}
                  {candidateId ? (
                    <Button onClick={() => onOpenBeneficiary(candidateId)} size="sm" type="button" variant="secondary">
                      Open candidate
                    </Button>
                  ) : null}
                  <Button disabled={isUpdating} onClick={() => onMarkUnderInvestigation(issue)} size="sm" type="button" variant="secondary">
                    Investigate
                  </Button>
                  {canReviewProposal ? (
                    <>
                      <Button disabled={isReviewingProposal} onClick={() => onOpenRejectProposal(issue)} size="sm" type="button" variant="secondary">
                        Reject update
                      </Button>
                      <Button disabled={isReviewingProposal} onClick={() => onOpenApproveProposal(issue)} size="sm" type="button">
                        Approve update
                      </Button>
                    </>
                  ) : null}
                  {!requiresDecision ? (
                    <Button disabled={isUpdating} onClick={() => onMarkResolved(issue)} size="sm" type="button">
                      Mark resolved
                    </Button>
                  ) : (
                    <span className="inline-flex items-center rounded-full border border-warning/30 bg-warning/10 px-2.5 py-1 text-[11px] font-medium text-foreground">
                      {decisionBlocker ?? (canReviewProposal ? "Approve or reject the proposed update" : "Open the conflict decision to finish reconciliation")}
                    </span>
                  )}
                </div>
              </div>
            </article>
          );
        })}
        {!issues.length ? (
          <div className="rounded-xl border border-success/30 bg-success/10 p-4">
            <p className="text-sm font-semibold">No reconciliation items need action.</p>
            <p className="mt-1 text-sm text-muted-foreground">Approved submissions are linked or waiting in their normal workflow queues.</p>
          </div>
        ) : !filteredIssues.length ? (
          <div className="rounded-xl border border-success/30 bg-success/10 p-4">
            <p className="text-sm font-semibold">{emptyTitle}</p>
            <p className="mt-1 text-sm text-muted-foreground">{emptyDescription}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function IssueTable({ description, issues, onBulkUpdate, onOpenIssue, route, title }: { description: string; issues: QualityIssue[]; onBulkUpdate?: (issueIds: string[], status: "resolved" | "under_investigation", comment: string) => Promise<void>; onOpenIssue: (issue: QualityIssue) => void; route: string; title: string }) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkComment, setBulkComment] = useState("");
  const [bulkRunning, setBulkRunning] = useState(false);

  async function runBulk(status: "resolved" | "under_investigation"): Promise<void> {
    if (!onBulkUpdate || !selectedIds.size) return;
    setBulkRunning(true);
    try {
      await onBulkUpdate(Array.from(selectedIds), status, bulkComment.trim());
      setSelectedIds(new Set());
      setBulkComment("");
    } finally {
      setBulkRunning(false);
    }
  }

  const columns: TableColumn<QualityIssue>[] = [
    {
      header: "Issue",
      key: "issue",
      render: (issue) => (
        <button className="text-left font-medium text-primary hover:underline" onClick={() => onOpenIssue(issue)} type="button">
          {issue.title}
          <span className="mt-1 block text-xs font-normal text-muted-foreground">{issue.description}</span>
        </button>
      ),
      value: (issue) => `${issue.title} ${issue.description} ${issue.type}`,
    },
    { header: "Severity", key: "severity", render: (issue) => <Badge tone={severityTone(issue.severity)}>{issue.severity}</Badge>, value: (issue) => issue.severity },
    { header: "Status", key: "status", render: (issue) => <Badge tone={statusTone(issue.status)}>{issue.status}</Badge>, value: (issue) => issue.status },
    { header: "Project/Form", key: "project", render: (issue) => <div><p>{issue.project}</p><p className="text-xs text-muted-foreground">{issue.form}</p></div>, value: (issue) => `${issue.project} ${issue.form}` },
    { header: "Owner", key: "owner", render: (issue) => <div><p>{issue.assignedTo}</p><p className="text-xs text-muted-foreground">{issue.enumerator}</p></div>, value: (issue) => `${issue.assignedTo} ${issue.enumerator}` },
  ];
  return (
    <div className="space-y-3">
      <SectionHeader description={description} route={route} title={title} />
      {onBulkUpdate && selectedIds.size ? (
        <section className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/25 bg-primary/5 p-3">
          <Badge tone="accent">{selectedIds.size} selected</Badge>
          <Input
            aria-label="Bulk resolution comment"
            className="h-8 min-w-64 flex-1 text-xs"
            disabled={bulkRunning}
            onChange={(event) => setBulkComment(event.target.value)}
            placeholder="Comment applied to every selected issue"
            value={bulkComment}
          />
          <Button disabled={bulkRunning || !bulkComment.trim()} onClick={() => void runBulk("resolved")} size="sm" variant="primary">
            {bulkRunning ? "Processing…" : "Resolve selected"}
          </Button>
          <Button disabled={bulkRunning || !bulkComment.trim()} onClick={() => void runBulk("under_investigation")} size="sm" variant="secondary">
            Investigate selected
          </Button>
          <Button disabled={bulkRunning} onClick={() => setSelectedIds(new Set())} size="sm" variant="ghost">
            Clear
          </Button>
        </section>
      ) : null}
      <DataTable
        columns={columns}
        emptyLabel={`No ${title.toLowerCase()} yet`}
        rows={issues}
        searchLabel={`Search ${title.toLowerCase()}, project, form, owner`}
        selection={
          onBulkUpdate
            ? {
                isSelectable: (issue) => !["Resolved", "Closed"].includes(issue.status),
                isSelected: (issue) => selectedIds.has(issue.id),
                onToggle: (issue, checked) =>
                  setSelectedIds((current) => {
                    const next = new Set(current);
                    if (checked) next.add(issue.id);
                    else next.delete(issue.id);
                    return next;
                  }),
                onToggleAll: (rows, checked) =>
                  setSelectedIds((current) => {
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
        title={title}
      />
    </div>
  );
}

function IssueDetail({
  auditEvents,
  isUpdating,
  issue,
  onOpenApproveProposal,
  onOpenBeneficiary,
  onBack,
  onOpenGovernance,
  onOpenMapping,
  onOpenProfileConflictQueue,
  onOpenRejectProposal,
  onOpenSubmission,
  onUpdateStatus,
  primaryEntity,
  primaryEntityLower,
  selectedTab,
  setSelectedTab,
}: {
  auditEvents: QualityAuditEvent[];
  isUpdating: boolean;
  issue: QualityIssue;
  primaryEntity: string;
  primaryEntityLower: string;
  onOpenApproveProposal: (issue: QualityIssue) => void;
  onOpenBeneficiary: (beneficiaryId: string) => void;
  onBack: () => void;
  onOpenGovernance: () => void;
  onOpenMapping: () => void;
  onOpenProfileConflictQueue: (focus: ProfileConflictFocusFilter, decisionFilter?: ProfileConflictDecisionFilter) => void;
  onOpenRejectProposal: (issue: QualityIssue) => void;
  onOpenSubmission: (submissionId: string) => void;
  onUpdateStatus: (status: "assigned" | "under_investigation" | "resolved" | "closed", comment: string) => void;
  selectedTab: IssueDetailTab;
  setSelectedTab: (tab: IssueDetailTab) => void;
}) {
  const beneficiaryId = evidenceText(issue, "beneficiary_id");
  const beneficiaryUid = evidenceText(issue, "beneficiary_uid");
  const attentionNote = issueAttentionNote(issue);
  const requiresDecision = requiresProfileConflictDecision(issue);
  const decisionBlocker = profileConflictDecisionBlocker(issue);
  const decisionState = profileConflictDecisionState(issue);
  const canReviewProposal =
    requiresDecision &&
    Boolean(beneficiaryId) &&
    issue.submissionId !== "Not linked";
  const signalHistory = signalStatusHistoryFromEvidence(issue.evidenceJson);
  const historyRecords = [
    {
      badge: "Detected",
      label: issue.title,
      meta: `${new Date(issue.detectedAt).toLocaleString()} · ${issue.assignedTo}`,
      tone: statusTone("Detected" as QualityIssueStatus),
    },
    ...signalHistory.map((entry) => ({
      badge: entry.proposalAction ? `${titleCase(entry.proposalAction)} update` : entry.to ? titleCase(entry.to) : "Conflict decision",
      label: entry.comment || "Decision recorded",
      meta: `${entry.changedAt ? new Date(entry.changedAt).toLocaleString() : "Time not recorded"} · ${entry.changedByUserId || "Decision maker not recorded"}${entry.from || entry.to ? ` · ${titleCase(entry.from || "open")} -> ${titleCase(entry.to || "resolved")}` : ""}`,
      tone: statusTone(signalStatus(entry.to || "resolved")),
    })),
    {
      badge: issue.status,
      label: "Current workflow status",
      meta: `Next step: ${nextInvestigationStatus(issue.status)}`,
      tone: statusTone(issue.status),
    },
  ];
  const auditTrailRecords = [
    ...auditEvents.map((event) => ({
      badge: event.action,
      label: event.actor,
      meta: `${new Date(event.createdAt).toLocaleString()} · ${event.reason}`,
      tone: "governance" as const,
    })),
    ...signalHistory.map((entry) => ({
      badge: entry.proposalAction ? `${titleCase(entry.proposalAction)} update` : "Conflict decision",
      label: entry.changedByUserId || "Decision maker not recorded",
      meta: `${entry.changedAt ? new Date(entry.changedAt).toLocaleString() : "Time not recorded"} · ${entry.comment || "No comment recorded"}`,
      tone: "governance" as const,
    })),
  ];
  return (
    <section className="space-y-3 rounded-xl border bg-panel p-3.5 shadow-line">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={severityTone(issue.severity)}>{issue.severity}</Badge>
            <Badge tone={statusTone(issue.status)}>{issue.status}</Badge>
            <Badge tone="neutral">{issue.type}</Badge>
            {decisionState ? <Badge tone={decisionState.tone}>{decisionState.label}</Badge> : null}
          </div>
          <h2 className="mt-3 text-xl font-semibold">{issue.title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{issue.description}</p>
          {attentionNote ? (
            <div className="mt-3 inline-flex max-w-3xl rounded-full border border-warning/30 bg-warning/10 px-3 py-1 text-xs font-medium text-foreground">
              {attentionNote}
            </div>
          ) : null}
          {decisionBlocker ? (
            <div className="mt-3 max-w-3xl rounded-xl border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-foreground">
              {decisionBlocker}
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={onBack} type="button" variant="secondary">Back to Data Quality</Button>
          {issue.submissionId !== "Not linked" ? (
            <Button onClick={() => onOpenSubmission(issue.submissionId)} type="button" variant="secondary">
              Open submission
            </Button>
          ) : null}
          {beneficiaryId ? (
            <Button onClick={() => onOpenBeneficiary(beneficiaryId)} type="button" variant="secondary">
              Open {beneficiaryUid || primaryEntityLower}
            </Button>
          ) : null}
          {canReviewProposal ? (
            <>
              <Button onClick={() => onOpenRejectProposal(issue)} type="button" variant="secondary">
                Reject update
              </Button>
              <Button onClick={() => onOpenApproveProposal(issue)} type="button">
                Approve update
              </Button>
            </>
          ) : null}
          <Button onClick={issue.type === "GPS Issue" ? onOpenMapping : onOpenGovernance} type="button">
            {issue.type === "GPS Issue" ? <MapPinned aria-hidden="true" /> : <ShieldCheck aria-hidden="true" />}
            {issue.type === "GPS Issue" ? "Open map" : "Escalate"}
          </Button>
        </div>
      </div>
      <div className="flex gap-2 overflow-x-auto border-b pb-2 product-scrollbar">
        {issueTabs.map((tab) => (
          <button
            className={cn("rounded-full px-2.5 py-1 text-xs transition", selectedTab === tab ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground")}
            key={tab}
            onClick={() => setSelectedTab(tab)}
            type="button"
          >
            {tab}
          </button>
        ))}
      </div>
      {selectedTab === "Overview" ? <IssueOverview issue={issue} primaryEntity={primaryEntity} /> : null}
      {selectedTab === "Related Submission" ? <IssueRelatedSubmission issue={issue} primaryEntityLower={primaryEntityLower} /> : null}
      {selectedTab === "Investigation" ? (
        <InvestigationPanel
          isUpdating={isUpdating}
          issue={issue}
          onEscalate={issue.type === "GPS Issue" ? onOpenMapping : onOpenGovernance}
          onDecisionBlocker={decisionBlocker}
          onOpenResolution={requiresDecision ? () => setSelectedTab("Resolution") : undefined}
          onUpdateStatus={onUpdateStatus}
          primaryEntityLower={primaryEntityLower}
        />
      ) : null}
      {selectedTab === "Resolution" ? (
        <IssueResolution
          issue={issue}
          onOpenApproveProposal={canReviewProposal ? () => onOpenApproveProposal(issue) : undefined}
          onOpenProfileConflictQueue={onOpenProfileConflictQueue}
          onOpenRejectProposal={canReviewProposal ? () => onOpenRejectProposal(issue) : undefined}
          onOpenSubmission={issue.submissionId !== "Not linked" ? onOpenSubmission : undefined}
          primaryEntityLower={primaryEntityLower}
        />
      ) : null}
      {selectedTab === "History" ? <Timeline records={historyRecords} /> : null}
      {selectedTab === "Audit Trail" ? <Timeline records={auditTrailRecords} /> : null}
    </section>
  );
}

function IssueOverview({ issue, primaryEntity }: { issue: QualityIssue; primaryEntity: string }) {
  const primaryEntityLower = primaryEntity.toLowerCase();
  const profileChanges = profileConflictChangesFromEvidence(issue.evidenceJson);
  const beneficiaryUid = evidenceText(issue, "beneficiary_uid");
  const clientSubmissionId = evidenceText(issue, "client_submission_id");
  const reviewFocus = profileConflictReviewFocus(profileChanges.map((change) => change.field));
  const sensitiveFieldCount = profileConflictSensitiveFieldCount(profileChanges.map((change) => change.field));
  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
      <div className="space-y-5">
        <KeyValuePanel rows={[["Project", issue.project], ["Form", issue.form], ["Submission", issueSubmissionLabel(issue)], ["Assigned to", issue.assignedTo], ["Detected", new Date(issue.detectedAt).toLocaleString()], ["Score impact", `${issue.scoreImpact} points`]]} title="Issue Summary" />
        {profileChanges.length ? (
          <Panel title="Profile Conflict Summary">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border bg-background p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{primaryEntity}</p>
                <p className="mt-2 text-sm font-medium">{beneficiaryUid || `Linked ${primaryEntityLower}`}</p>
                <p className="mt-1 text-xs text-muted-foreground">Submission {clientSubmissionId || issue.submissionId}</p>
              </div>
              <div className="rounded-xl border bg-background p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Decision guidance</p>
                  {reviewFocus.map((focus) => (
                    <Badge key={focus} tone={focus === "Identity" || focus === "Location" ? "warning" : "neutral"}>
                      {focus} conflict
                    </Badge>
                  ))}
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Approve only when the new submission values are verified and should become the official {primaryEntityLower} profile. Reject when the submission is informative, incomplete, or should remain history only.
                </p>
                {sensitiveFieldCount ? (
                  <p className="mt-2 text-xs font-medium text-foreground">
                    {sensitiveFieldCount} sensitive field{sensitiveFieldCount === 1 ? "" : "s"} need direct verification before the official record changes.
                  </p>
                ) : null}
              </div>
            </div>
            <div className="mt-3 space-y-2">
              <ProfileChangeCards changes={profileChanges} />
            </div>
          </Panel>
        ) : null}
      </div>
      <Panel title="Evidence">
        <div className="space-y-2">
          {issue.evidence.map((item) => (
            <div className="rounded-xl border bg-background p-3 text-sm" key={item}>{item}</div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function IssueRelatedSubmission({ issue, primaryEntityLower }: { issue: QualityIssue; primaryEntityLower: string }) {
  const beneficiaryUid = evidenceText(issue, "beneficiary_uid");
  const clientSubmissionId = evidenceText(issue, "client_submission_id");
  const decisionBlocker = profileConflictDecisionBlocker(issue);
  const decisionState = profileConflictDecisionState(issue);
  const source = evidenceText(issue, "source") || evidenceText(issue, "submission_source");
  const matchedFields = Array.isArray(issue.evidenceJson?.matched_fields)
    ? issue.evidenceJson?.matched_fields.map(String).join(", ")
    : "";
  const rows: [string, string][] = [
    ["Submission ID", issue.submissionId],
    ["Client Submission ID", clientSubmissionId || "Not recorded"],
    ["Project", issue.project],
    ["Form", issue.form],
    ["Enumerator", issue.enumerator],
    ["Supervisor", issue.supervisor],
    ["Location", issue.location],
    ["Source", source || "Not recorded"],
  ];
  if (beneficiaryUid) rows.push([titleCase(primaryEntityLower), beneficiaryUid]);
  if (decisionState) rows.push(["Decision state", decisionState.label]);
  if (decisionBlocker) rows.push(["Decision blocker", decisionBlocker]);
  if (matchedFields) rows.push(["Matched Fields", matchedFields]);
  return <KeyValuePanel rows={rows} title="Related Submission" />;
}

function IssueResolution({
  issue,
  onOpenApproveProposal,
  onOpenProfileConflictQueue,
  onOpenRejectProposal,
  onOpenSubmission,
  primaryEntityLower,
}: {
  issue: QualityIssue;
  onOpenApproveProposal?: () => void;
  onOpenProfileConflictQueue?: (focus: ProfileConflictFocusFilter, decisionFilter?: ProfileConflictDecisionFilter) => void;
  onOpenRejectProposal?: () => void;
  onOpenSubmission?: (submissionId: string) => void;
  primaryEntityLower: string;
}) {
  const profileChanges = profileConflictChangesFromEvidence(issue.evidenceJson);
  if (!profileChanges.length) {
    return <KeyValuePanel rows={[["Recommended action", issue.recommendedAction], ["Next status", nextInvestigationStatus(issue.status)], ["Score impact", `${issue.scoreImpact} points`], ["Assigned to", issue.assignedTo]]} title="Resolution" />;
  }

  const fieldList = profileChanges.map((change) => titleCase(change.field)).join(", ");
  const checklist = profileConflictChecklist(profileChanges.map((change) => change.field));
  const reviewFocus = profileConflictReviewFocus(profileChanges.map((change) => change.field));
  const sensitiveFieldCount = profileConflictSensitiveFieldCount(profileChanges.map((change) => change.field));
  const similarQueueDecisionFilter =
    profileConflictDecisionState(issue)?.label === "Ready for decision"
      ? "ready"
      : profileConflictDecisionState(issue)?.label === "Blocked"
        ? "blocked"
        : undefined;
  const similarQueueTitle =
    similarQueueDecisionFilter === "ready"
      ? "Similar ready conflicts"
      : similarQueueDecisionFilter === "blocked"
        ? "Similar blocked conflicts"
        : "Similar profile conflicts";
  const similarQueueDescription =
    similarQueueDecisionFilter === "ready"
      ? `Jump back into the ready-to-decide queue with the same profile-conflict focus so related ${primaryEntityLower} approvals can be handled together.`
      : similarQueueDecisionFilter === "blocked"
        ? `Jump back into the blocked queue with the same profile-conflict focus so missing ${primaryEntityLower} or submission context can be resolved together.`
        : `Jump back into the queue with the same profile-conflict focus so related ${primaryEntityLower} decisions can be handled together.`;
  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
      <KeyValuePanel
        rows={[
          ["Recommended action", issue.recommendedAction],
          ["Decision state", profileConflictDecisionState(issue)?.label ?? "Not required"],
          ["Fields affected", `${profileChanges.length}`],
          ["Sensitive fields", `${sensitiveFieldCount}`],
          ["Fields", fieldList],
          ["Next status", nextInvestigationStatus(issue.status)],
        ]}
        title="Resolution"
      />
      <Panel title="Decision Impact">
        <div className="space-y-3">
          <div className="rounded-xl border bg-background p-3">
            <p className="text-sm font-medium">Before approving</p>
            <ul className="mt-2 space-y-2 text-sm leading-6 text-muted-foreground">
              {checklist.map((item) => (
                <li className="flex gap-2" key={item}>
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border bg-background p-3">
            <p className="text-sm font-medium">Approve update</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Atlas will replace the official {primaryEntityLower} values for the listed fields, keep lineage to this approved submission, and remove the conflict from the reconciliation queue.
            </p>
          </div>
          <div className="rounded-xl border bg-background p-3">
            <p className="text-sm font-medium">Reject update</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Atlas will keep the current official {primaryEntityLower} profile unchanged, record the decision in audit history, and still preserve the submission as historical evidence.
            </p>
          </div>
          {onOpenSubmission && issue.submissionId !== "Not linked" ? (
            <div className="rounded-xl border bg-background p-3">
              <p className="text-sm font-medium">Verify the original submission</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Open the source record to confirm the captured answers, timestamps, GPS evidence, and respondent details before you approve or reject the profile update.
              </p>
              <div className="mt-3">
                <Button onClick={() => onOpenSubmission(issue.submissionId)} type="button" variant="secondary">
                  Open source submission
                </Button>
              </div>
            </div>
          ) : null}
          {requiresProfileConflictDecision(issue) && profileConflictDecisionBlocker(issue) ? (
            <div className="rounded-xl border border-warning/30 bg-warning/10 p-3 text-sm text-foreground">
              {profileConflictDecisionBlocker(issue)}
            </div>
          ) : null}
          {onOpenProfileConflictQueue ? (
            <div className="rounded-xl border bg-background p-3">
              <p className="text-sm font-medium">{similarQueueTitle}</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{similarQueueDescription}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button onClick={() => onOpenProfileConflictQueue("all", similarQueueDecisionFilter)} type="button" variant="secondary">
                  {similarQueueDecisionFilter === "ready"
                    ? "Open all ready conflicts"
                    : similarQueueDecisionFilter === "blocked"
                      ? "Open all blocked conflicts"
                      : "Open all profile conflicts"}
                </Button>
                {reviewFocus.map((focus) => (
                  <Button key={focus} onClick={() => onOpenProfileConflictQueue(focus, similarQueueDecisionFilter)} type="button" variant="secondary">
                    {similarQueueDecisionFilter === "ready"
                      ? `Open ${focus} ready conflicts`
                      : similarQueueDecisionFilter === "blocked"
                        ? `Open ${focus} blocked conflicts`
                        : `Open ${focus} conflicts`}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}
          {onOpenApproveProposal || onOpenRejectProposal ? (
            <div className="flex flex-wrap justify-end gap-2 rounded-xl border border-primary/20 bg-primary/5 p-3">
              {onOpenRejectProposal ? (
                <Button onClick={onOpenRejectProposal} type="button" variant="secondary">
                  Reject update
                </Button>
              ) : null}
              {onOpenApproveProposal ? (
                <Button onClick={onOpenApproveProposal} type="button">
                  Approve update
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      </Panel>
    </div>
  );
}

function InvestigationPanel({
  isUpdating,
  issue,
  onDecisionBlocker,
  onEscalate,
  onOpenResolution,
  onUpdateStatus,
  primaryEntityLower,
}: {
  isUpdating: boolean;
  issue: QualityIssue;
  onDecisionBlocker?: string | null;
  onEscalate: () => void;
  onOpenResolution?: () => void;
  onUpdateStatus: (status: "assigned" | "under_investigation" | "resolved" | "closed", comment: string) => void;
  primaryEntityLower: string;
}) {
  const pushToast = useWorkspaceStore((state) => state.pushToast);
  const requiresDecision = requiresProfileConflictDecision(issue);
  const canReviewProposal =
    requiresDecision &&
    Boolean(evidenceText(issue, "beneficiary_id")) &&
    issue.submissionId !== "Not linked";
  const resolutionActionLabel = onDecisionBlocker
    ? "Open blocker details"
    : canReviewProposal
      ? "Open update decision"
      : "Open conflict decision";
  const actions: { label: string; onClick: () => void }[] = [
    { label: "Assign investigator", onClick: () => onUpdateStatus("assigned", `Assigned ${issue.title} for investigation.`) },
    { label: "Add notes", onClick: () => pushToast({ description: "Investigation notes will be available in a future update.", title: "Notes aren't available yet", tone: "warning" }) },
    { label: "Add evidence", onClick: () => pushToast({ description: "Attaching evidence files will be available in a future update.", title: "Evidence uploads aren't available yet", tone: "warning" }) },
    { label: "Escalate", onClick: onEscalate },
    ...(requiresDecision
      ? onOpenResolution
        ? [{ label: resolutionActionLabel, onClick: onOpenResolution }]
        : []
      : [
          { label: "Resolve", onClick: () => onUpdateStatus("resolved", `Resolved ${issue.title}.`) },
          { label: "Close", onClick: () => onUpdateStatus("closed", `Closed ${issue.title}.`) },
        ]),
  ];
  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
      <Panel title="Investigation Workflow">
        <div className="grid gap-3 md:grid-cols-5">
          {["Detected", "Assigned", "Under Investigation", "Resolved", "Closed"].map((step) => (
            <div className={cn("rounded-xl border p-3 text-sm", issue.status === step ? "border-primary/50 bg-primary/10" : "bg-background")} key={step}>
              {step}
            </div>
          ))}
        </div>
      </Panel>
      <Panel title="Investigation Actions">
        {requiresDecision ? (
          <div className="mb-3 rounded-xl border border-warning/30 bg-warning/10 p-3 text-sm text-foreground">
            {onDecisionBlocker ?? `Profile conflicts that propose ${primaryEntityLower} field changes need an explicit approve or reject decision before they can leave the queue.`}
          </div>
        ) : null}
        <div className="space-y-2">
          {actions.map((action) => (
            <button
              className="flex w-full items-center justify-between rounded-xl border bg-background p-3 text-left text-sm transition hover:border-primary/40 hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isUpdating}
              key={action.label}
              onClick={action.onClick}
              type="button"
            >
              {action.label}
              <ArrowRight aria-hidden="true" size={15} />
            </button>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function IssueCards({ issues, onOpenIssue }: { issues: QualityIssue[]; onOpenIssue: (issue: QualityIssue) => void }) {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {issues.map((issue) => {
        const attentionNote = issueAttentionNote(issue);
        const decisionState = profileConflictDecisionState(issue);
        return (
          <button className="rounded-2xl border bg-background p-4 text-left shadow-line transition hover:border-primary/40 hover:bg-primary/5" key={issue.id} onClick={() => onOpenIssue(issue)} type="button">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">{issue.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{issue.project} · {issue.form}</p>
                {attentionNote ? <p className="mt-2 text-[11px] font-medium text-foreground">{attentionNote}</p> : null}
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                {decisionState ? <Badge tone={decisionState.tone}>{decisionState.label}</Badge> : null}
                <Badge tone={severityTone(issue.severity)}>{issue.severity}</Badge>
              </div>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{issue.recommendedAction}</p>
          </button>
        );
      })}
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  onClick,
  tone,
  value,
}: {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  tone: BadgeProps["tone"];
  value: number | string;
}) {
  const content = (
    <>
      <div className="flex items-center justify-between gap-3">
        <span className="rounded-xl bg-primary/10 p-2 text-primary">
          <Icon aria-hidden="true" size={18} />
        </span>
        <Badge tone={tone}>Quality</Badge>
      </div>
      <p className="mt-4 text-2xl font-semibold">{typeof value === "number" ? value.toLocaleString() : value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
    </>
  );
  if (onClick) {
    return (
      <button className="rounded-xl border bg-panel p-3 text-left shadow-line transition hover:border-primary/40 hover:bg-primary/5" onClick={onClick} type="button">
        {content}
      </button>
    );
  }
  return <article className="rounded-xl border bg-panel p-3 shadow-line">{content}</article>;
}

function Panel({ action, children, title }: { action?: ReactNode; children: ReactNode; title: string }) {
  return (
    <section className="rounded-xl border bg-panel p-3.5 shadow-line">
      <div className="mb-4 flex items-start justify-between gap-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function SectionHeader({ action, description, route, title }: { action?: ReactNode; description: string; route: string; title: string }) {
  return (
    <div className="rounded-xl border bg-panel p-3.5 shadow-line">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="governance">ANALYTICS</Badge>
            <Badge tone="accent">{route}</Badge>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold">{title}</h2>
            <HelpHint label={`About ${title}`} title={title}>{description}</HelpHint>
          </div>
        </div>
        {action}
      </div>
    </div>
  );
}

function Timeline({ records }: { records: { badge: string; label: string; meta: string; onClick?: () => void; tone: BadgeProps["tone"] }[] }) {
  if (!records.length) return <div className="rounded-xl border border-dashed bg-muted/20 p-5 text-sm text-muted-foreground">No records yet.</div>;
  return (
    <div className="space-y-3">
      {records.map((record, index) => {
        const content = (
          <>
            <Badge tone={record.tone}>{record.badge}</Badge>
            <div>
              <p className="text-sm font-medium">{record.label}</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{record.meta}</p>
            </div>
          </>
        );
        if (record.onClick) {
          return (
            <button className="flex w-full gap-3 rounded-xl border bg-background p-3 text-left transition hover:border-primary/40 hover:bg-primary/5" key={`${record.label}-${index}`} onClick={record.onClick} type="button">
              {content}
            </button>
          );
        }
        return <div className="flex gap-3 rounded-xl border bg-background p-3" key={`${record.label}-${index}`}>{content}</div>;
      })}
    </div>
  );
}

function RankingPanel({ rows, title }: { rows: [string, number][]; title: string }) {
  if (!rows.length) {
    return (
      <Panel title={title}>
        <div className="rounded-xl border border-dashed bg-muted/20 p-5 text-sm text-muted-foreground">No records yet.</div>
      </Panel>
    );
  }
  return (
    <Panel title={title}>
      <div className="space-y-3">
        {rows.map(([label, score]) => (
          <div className="rounded-xl border bg-background p-3" key={label}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">{label}</p>
              <Badge tone={scoreTone(score)}>{score}</Badge>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${score}%` }} />
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function TrendBars({ scores }: { scores: Record<string, number> }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {Object.entries(scores).map(([label, value]) => (
        <div className="rounded-xl border bg-background p-3" key={label}>
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">{label.replace(/([A-Z])/g, " $1").trim()}</p>
            <Badge tone={scoreTone(value)}>{value}</Badge>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${value}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function KeyValuePanel({ rows, title }: { rows: [string, string][]; title: string }) {
  return (
    <Panel title={title}>
      <div className="grid gap-3 md:grid-cols-2">
        {rows.map(([label, value]) => (
          <div className="rounded-xl border bg-background p-3" key={label}>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
            <p className="mt-2 text-sm font-medium">{value}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}
