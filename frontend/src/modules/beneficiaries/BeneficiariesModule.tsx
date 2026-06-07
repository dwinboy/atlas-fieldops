"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ClipboardList,
  CheckCircle2,
  Download,
  FileUp,
  GitBranch,
  History,
  Link2,
  MapPin,
  Smartphone,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { DataTable, type TableColumn } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HelpHint } from "@/components/ui/help-hint";
import { Input, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import {
  getProjectEntities,
  listBeneficiaries,
  listSubmissions,
  mergeBeneficiaries,
  type CurrentPrincipal,
  type SubmissionRead,
} from "@/lib/api";
import {
  mapBeneficiaryRead,
  previewEntities,
  type BeneficiaryEntity,
  type EntityStatus,
} from "@/modules/beneficiaries/data";
import { formatEntityDate } from "@/modules/beneficiaries/utils";
import { ImportsMigrationModule } from "@/modules/imports-migration/ImportsMigrationModule";
import { getPreviewSubmissions } from "@/modules/submissions/utils";
import { useWorkspaceStore, type WorkspaceView } from "@/stores/workspace";

type BeneficiariesModuleProps = {
  principal?: CurrentPrincipal | null;
  token: string | null;
};

function statusTone(status: EntityStatus | BeneficiaryEntity["duplicateStatus"]) {
  if (status === "Active" || status === "Clear") return "success";
  if (status === "Duplicate" || status === "Likely Duplicate") return "danger";
  if (status === "Possible Duplicate" || status === "Moved") return "warning";
  return "neutral";
}

function canManage(principal?: CurrentPrincipal | null): boolean {
  if (!principal || principal.platform_admin) return true;
  return ["beneficiaries.create", "beneficiaries.manage", "beneficiaries.edit"].some(
    (permission) => principal.permissions?.includes(permission),
  );
}

export function BeneficiariesModule({
  principal,
  token,
}: BeneficiariesModuleProps) {
  const preview = !token || token === "preview-token";
  const [localEntities] = useState<BeneficiaryEntity[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<BeneficiaryEntity | null>(
    null,
  );
  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergeDraft, setMergeDraft] = useState({
    duplicateId: "",
    masterId: "",
    reason: "",
  });
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const setActiveView = useWorkspaceStore((state) => state.setActiveView);
  const pushToast = useWorkspaceStore((state) => state.pushToast);
  const isImportRoute =
    (pathname ?? "").replace(/\/+$/, "") === "/beneficiaries/import";
  const entitiesQuery = useQuery({
    enabled: Boolean(token && !preview),
    queryFn: () => listBeneficiaries(token ?? ""),
    queryKey: ["beneficiaries", token],
  });
  const submissionsQuery = useQuery({
    enabled: Boolean(token && !preview),
    queryFn: () => listSubmissions(token ?? ""),
    queryKey: ["beneficiaries", "linked-submissions", token],
  });

  const backendEntities = (entitiesQuery.data ?? []).map(mapBeneficiaryRead);
  const entities = useMemo(
    () => [...localEntities, ...(preview ? previewEntities : backendEntities)],
    [backendEntities, localEntities, preview],
  );
  const linkedSubmissionRows = useMemo<SubmissionRead[]>(
    () => (preview ? getPreviewSubmissions() : submissionsQuery.data ?? []),
    [preview, submissionsQuery.data],
  );
  const submissionsByEntity = useMemo(() => {
    const map = new Map<string, SubmissionRead[]>();
    for (const submission of linkedSubmissionRows) {
      if (!submission.entity_id) continue;
      const current = map.get(submission.entity_id) ?? [];
      current.push(submission);
      map.set(submission.entity_id, current);
    }
    return map;
  }, [linkedSubmissionRows]);
  const duplicates = entities.filter(
    (entity) => entity.duplicateStatus !== "Clear" || entity.qualityFlags > 0,
  );
  const activeEntities = entities.filter((entity) => entity.status === "Active");
  const managerAccess = canManage(principal);
  const mergeMutation = useMutation({
    mutationFn: () => mergeBeneficiaries(token ?? "", {
      duplicate_beneficiary_id: mergeDraft.duplicateId,
      master_beneficiary_id: mergeDraft.masterId,
      merge_profile_fields: true,
      reason: mergeDraft.reason.trim(),
    }),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["beneficiaries", token] });
      setMergeOpen(false);
      setMergeDraft({ duplicateId: "", masterId: "", reason: "" });
      pushToast({
        title: "Beneficiaries merged",
        description: `${result.moved_submissions} submissions and ${result.moved_quality_signals} quality signals now point to the master record.`,
        tone: "success",
      });
    },
    onError: (error) => {
      pushToast({
        title: "Merge failed",
        description: error instanceof Error ? error.message : "The duplicate records could not be merged.",
        tone: "danger",
      });
    },
  });
  const summaryCards: {
    icon: LucideIcon;
    label: string;
    value: string | number;
  }[] = [
    { icon: UsersRound, label: "Total Entities", value: entities.length },
    { icon: CheckCircle2, label: "Active Entities", value: activeEntities.length },
    { icon: AlertTriangle, label: "Duplicates Flagged", value: duplicates.length },
    { icon: Smartphone, label: "Mobile Sync Ready", value: "8 APIs" },
  ];

  function openWorkspace(view: WorkspaceView, path?: string): void {
    setActiveView(view);
    if (path) router.push(path);
  }

  function openMergeReview(duplicate?: BeneficiaryEntity): void {
    const selectedDuplicate = duplicate ?? duplicates[0];
    const masterCandidate =
      entities.find((entity) =>
        selectedDuplicate &&
        entity.id !== selectedDuplicate.id &&
        entity.status === "Active" &&
        entity.entityType === selectedDuplicate.entityType &&
        (entity.householdId === selectedDuplicate.householdId ||
          entity.phoneNumber === selectedDuplicate.phoneNumber ||
          entity.village === selectedDuplicate.village),
      ) ?? entities.find((entity) => entity.id !== selectedDuplicate?.id && entity.status === "Active");
    setMergeDraft({
      duplicateId: selectedDuplicate?.id ?? "",
      masterId: masterCandidate?.id ?? "",
      reason: "",
    });
    setMergeOpen(true);
  }

  function submitMerge(): void {
    if (preview || !token || !managerAccess) {
      pushToast({ title: "Merge unavailable", description: "Sign in with beneficiary management permission to merge duplicate records.", tone: "warning" });
      return;
    }
    if (!mergeDraft.duplicateId || !mergeDraft.masterId || mergeDraft.duplicateId === mergeDraft.masterId) {
      pushToast({ title: "Choose two records", description: "Select one duplicate record and one different master record.", tone: "warning" });
      return;
    }
    if (mergeDraft.reason.trim().length < 8) {
      pushToast({ title: "Reason required", description: "Add a clear merge reason before continuing.", tone: "warning" });
      return;
    }
    mergeMutation.mutate();
  }

  if (isImportRoute) {
    return (
      <section className="space-y-3">
        <div className="rounded-xl border bg-panel p-3.5 shadow-line">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <Badge tone="collect">BENEFICIARIES</Badge>
              <h1 className="mt-3 text-2xl font-semibold tracking-tight">
                Import beneficiaries
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Import farmer, household, beneficiary, facility, school, or
                custom entity registries into a selected project with duplicate
                review and audit tracking.
              </p>
            </div>
            <Button
              onClick={() => openWorkspace("beneficiaries", "/beneficiaries")}
              variant="secondary"
            >
              Back to registry
            </Button>
          </div>
        </div>
        <ImportsMigrationModule mode="administration" token={token} />
      </section>
    );
  }

  const columns: TableColumn<BeneficiaryEntity>[] = [
    {
      header: "Entity",
      key: "entity",
      render: (entity) => (
        <button
          className="text-left"
          onClick={() => setSelectedEntity(entity)}
          type="button"
        >
          <p className="font-medium text-foreground">{entity.fullName}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {entity.entityId} · {entity.entityType}
          </p>
        </button>
      ),
      value: (entity) => `${entity.fullName} ${entity.entityId}`,
    },
    {
      header: "Project",
      key: "project",
      render: (entity) => entity.projectName,
      value: (entity) => entity.projectName,
    },
    {
      header: "Location",
      key: "location",
      render: (entity) =>
        `${entity.village || entity.community}, ${entity.district || entity.region}`,
      value: (entity) => `${entity.village} ${entity.community} ${entity.district}`,
    },
    {
      header: "Status",
      key: "status",
      render: (entity) => (
        <Badge tone={statusTone(entity.status)}>{entity.status}</Badge>
      ),
      value: (entity) => entity.status,
    },
    {
      header: "Officer",
      key: "officer",
      render: (entity) => entity.assignedOfficer,
      value: (entity) => entity.assignedOfficer,
    },
    {
      header: "Records",
      key: "records",
      render: (entity) => `${entity.formsCompleted} completed`,
      value: (entity) => String(entity.formsCompleted),
    },
    {
      header: "Duplicate",
      key: "duplicate",
      render: (entity) => (
        <Badge tone={statusTone(entity.duplicateStatus)}>
          {entity.duplicateStatus}
        </Badge>
      ),
      value: (entity) => entity.duplicateStatus,
    },
  ];

  return (
    <section className="space-y-3">
      <div className="rounded-xl border bg-panel p-3.5 shadow-line">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="collect">OPERATIONS</Badge>
              <Badge tone={duplicates.length ? "warning" : "success"}>
                {duplicates.length
                  ? `${duplicates.length} duplicate signals`
                  : "Registry clean"}
              </Badge>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">
                Beneficiaries
              </h1>
              <HelpHint label="About Beneficiaries" title="Beneficiaries">
                Register each farmer, household, facility, school, group, or
                custom entity once, then link forms and submissions to that
                record over time.
              </HelpHint>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={!managerAccess}
              onClick={() => openWorkspace("beneficiaries", "/beneficiaries/import")}
              variant="primary"
            >
              <FileUp aria-hidden="true" />
              Import beneficiaries
            </Button>
            <Button
              disabled={!managerAccess || !duplicates.length}
              onClick={() => openMergeReview()}
              variant="secondary"
            >
              <AlertTriangle aria-hidden="true" />
              Review duplicates
            </Button>
            <Button
              disabled={!managerAccess}
              onClick={() => openWorkspace("forms", "/forms/create")}
              variant="secondary"
            >
              <Smartphone aria-hidden="true" />
              Create mobile registration form
            </Button>
            <Button variant="secondary">
              <Download aria-hidden="true" />
              Export
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map(({ icon: Icon, label, value }) => (
          <div className="rounded-xl border bg-panel p-3 shadow-line" key={label}>
            <Icon aria-hidden="true" className="text-primary" size={18} />
            <p className="mt-3 text-2xl font-semibold">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <DataTable
          columns={columns}
          emptyLabel="No beneficiary or entity records match this view"
          rows={entities}
          searchLabel="Search entity ID, name, phone, project, location"
          title={entitiesQuery.isFetching ? "Registry syncing" : "Entity registry"}
        />
        <EntitySidePanel
          duplicates={duplicates}
          entity={selectedEntity ?? entities[0] ?? null}
          linkedSubmissions={
            submissionsByEntity.get((selectedEntity ?? entities[0])?.id ?? "") ?? []
          }
          managerAccess={managerAccess}
          onMerge={openMergeReview}
        />
      </div>
      <MergeBeneficiariesModal
        canSubmit={managerAccess && !preview && !mergeMutation.isPending}
        duplicateOptions={duplicates.length ? duplicates : entities}
        draft={mergeDraft}
        entities={entities}
        onChange={setMergeDraft}
        onOpenChange={setMergeOpen}
        onSubmit={submitMerge}
        open={mergeOpen}
        preview={preview}
        saving={mergeMutation.isPending}
      />
    </section>
  );
}

function EntitySidePanel({
  duplicates,
  entity,
  linkedSubmissions,
  managerAccess,
  onMerge,
}: {
  duplicates: BeneficiaryEntity[];
  entity: BeneficiaryEntity | null;
  linkedSubmissions: SubmissionRead[];
  managerAccess: boolean;
  onMerge: (duplicate?: BeneficiaryEntity) => void;
}) {
  const [activeTab, setActiveTab] = useState<
    "Overview" | "Profile" | "Forms & Records" | "Timeline"
  >("Overview");
  if (!entity) {
    return (
      <aside className="rounded-xl border border-dashed bg-panel p-4 text-sm text-muted-foreground">
        Import beneficiaries into a project or collect them through a
        project-linked mobile registration form to see profile, records,
        duplicate status, map readiness, and mobile sync context.
      </aside>
    );
  }

  return (
    <aside className="space-y-3">
      <div className="rounded-xl border bg-panel p-4 shadow-line">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Entity profile
            </p>
            <h2 className="mt-2 text-base font-semibold">{entity.fullName}</h2>
            <p className="text-xs text-muted-foreground">
              {entity.entityId} · {entity.entityType}
            </p>
          </div>
          <Badge tone={statusTone(entity.status)}>{entity.status}</Badge>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <MetricButton
            icon={ClipboardList}
            label="Linked submissions"
            onClick={() => setActiveTab("Forms & Records")}
            value={linkedSubmissions.length}
          />
          <MetricButton
            icon={GitBranch}
            label="Pending updates"
            onClick={() => setActiveTab("Profile")}
            value={profileUpdateProposals(entity).length}
          />
        </div>
        <div className="mt-4 flex gap-1 overflow-x-auto product-scrollbar">
          {(["Overview", "Profile", "Forms & Records", "Timeline"] as const).map((tab) => (
            <button
              className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                activeTab === tab
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-background hover:bg-muted"
              }`}
              key={tab}
              onClick={() => setActiveTab(tab)}
              type="button"
            >
              {tab}
            </button>
          ))}
        </div>
        {activeTab === "Overview" ? (
          <BeneficiaryOverview entity={entity} linkedSubmissions={linkedSubmissions} />
        ) : null}
        {activeTab === "Profile" ? <BeneficiaryProfile entity={entity} /> : null}
        {activeTab === "Forms & Records" ? (
          <BeneficiaryRecords linkedSubmissions={linkedSubmissions} />
        ) : null}
        {activeTab === "Timeline" ? (
          <BeneficiaryTimeline entity={entity} linkedSubmissions={linkedSubmissions} />
        ) : null}
      </div>
      <div className="rounded-xl border bg-panel p-4 shadow-line">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold">Entity-linked collection</h2>
          <HelpHint label="About entity-linked collection" title="Entity-linked collection">
            Field officers should search this entity before opening baseline,
            monitoring, attendance, distribution, or endline forms so known
            profile fields can be pre-filled and duplicate submissions can be
            blocked.
          </HelpHint>
        </div>
        <div className="mt-3 grid gap-2">
          {[
            ["Registration", linkedSubmissions.some((submission) => submission.status === "approved") ? "Complete" : "Due"],
            ["Baseline", entity.formsCompleted > 1 ? "Complete" : "Due"],
            ["Monitoring Visit", linkedSubmissions.length ? "In progress" : "Monthly check"],
            ["Endline", "Pending"],
          ].map(([label, value]) => (
            <div
              className="flex items-center justify-between rounded-lg border bg-background px-3 py-2 text-sm"
              key={label}
            >
              <span>{label}</span>
              <Badge tone={value === "Due" ? "warning" : "neutral"}>{value}</Badge>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-xl border bg-panel p-4 shadow-line">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Duplicate review queue</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Compare possible duplicates, choose a master record, and preserve linked submissions.
            </p>
          </div>
          <Button disabled={!managerAccess || !duplicates.length} onClick={() => onMerge()} size="sm" variant="secondary">
            Review
          </Button>
        </div>
        <div className="mt-3 space-y-2">
          {duplicates.slice(0, 3).map((item) => (
            <div className="rounded-lg border bg-background p-3" key={item.id}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">{item.fullName}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.entityId} · {item.duplicateStatus}
                  </p>
                </div>
                <Button disabled={!managerAccess} onClick={() => onMerge(item)} size="sm" variant="ghost">
                  Merge
                </Button>
              </div>
            </div>
          ))}
          {!duplicates.length ? (
            <p className="rounded-lg border border-dashed bg-background p-3 text-sm text-muted-foreground">
              No duplicate groups are waiting for review.
            </p>
          ) : null}
        </div>
      </div>
    </aside>
  );
}

function BeneficiaryOverview({
  entity,
  linkedSubmissions,
}: {
  entity: BeneficiaryEntity;
  linkedSubmissions: SubmissionRead[];
}) {
  return (
    <div className="mt-4 grid gap-2 text-sm">
      <Signal label="Project" value={entity.projectName} />
      <Signal label="Location" value={`${entity.village}, ${entity.district}`} />
      <Signal label="Phone" value={entity.phoneNumber ?? "Not recorded"} />
      <Signal label="Household" value={entity.householdId ?? "N/A"} />
      <Signal label="Consent" value={entity.consentStatus} />
      <Signal label="Last visit" value={formatEntityDate(entity.lastVisit)} />
      <Signal
        label="Approved records"
        value={`${linkedSubmissions.filter((submission) => submission.status === "approved").length}`}
      />
      <Signal label="Data source" value={entity.registrationSource} />
    </div>
  );
}

function BeneficiaryProfile({ entity }: { entity: BeneficiaryEntity }) {
  const lineage = fieldLineage(entity);
  const proposals = profileUpdateProposals(entity);
  const rows = [
    ["Name", entity.fullName, "display_name"],
    ["Phone", entity.phoneNumber ?? "Not recorded", "phone_number"],
    ["Gender", entity.gender, "sex"],
    ["Village", entity.village, "community"],
    ["District", entity.district, "district"],
    [
      "GPS",
      entity.latitude && entity.longitude
        ? `${entity.latitude}, ${entity.longitude}`
        : "Not recorded",
      "latitude",
    ],
  ];
  return (
    <div className="mt-4 space-y-3">
      {rows.map(([label, value, key]) => {
        const source = lineage[key];
        return (
          <div className="rounded-lg border bg-background p-3" key={key}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-1 text-sm font-semibold">{value}</p>
              </div>
              <Badge tone={source ? "success" : "neutral"}>
                {source ? "Lineage" : "Manual"}
              </Badge>
            </div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              {source
                ? `Source submission ${String(source.sourceClientSubmissionId ?? source.sourceSubmissionId ?? "recorded")} · approved ${formatEntityDate(String(source.approvalDate ?? ""))}`
                : "No form-source lineage is recorded for this field yet."}
            </p>
          </div>
        );
      })}
      {proposals.length ? (
        <div className="rounded-lg border border-warning/30 bg-warning/10 p-3">
          <p className="text-sm font-semibold">Profile update proposals</p>
          <div className="mt-2 space-y-2">
            {proposals.slice(0, 3).map((proposal, index) => (
              <p className="text-xs leading-5 text-muted-foreground" key={index}>
                {proposal.clientSubmissionId ?? proposal.submissionId ?? "Submission"} proposed {Object.keys(proposal.changes ?? {}).length} profile change(s). Review in Data Quality reconciliation.
              </p>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function BeneficiaryRecords({
  linkedSubmissions,
}: {
  linkedSubmissions: SubmissionRead[];
}) {
  if (!linkedSubmissions.length) {
    return (
      <p className="mt-4 rounded-lg border border-dashed bg-background p-3 text-sm text-muted-foreground">
        No approved or pending submissions are linked to this beneficiary yet.
      </p>
    );
  }
  return (
    <div className="mt-4 space-y-2">
      {linkedSubmissions.map((submission) => (
        <div className="rounded-lg border bg-background p-3" key={submission.id}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">{submission.form_id.replaceAll("-", " ")}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {submission.client_submission_id} · {submissionSourceLabel(submission)}
              </p>
            </div>
            <Badge tone={submission.status === "approved" ? "success" : "warning"}>
              {submission.status.replaceAll("_", " ")}
            </Badge>
          </div>
          <div className="mt-3 grid gap-2 text-xs md:grid-cols-2">
            <Signal label="Submitted/uploaded by" value={submissionActorLabel(submission)} />
            <Signal label="Date" value={formatEntityDate(submission.imported_at ?? submission.submitted_at)} />
          </div>
        </div>
      ))}
    </div>
  );
}

function BeneficiaryTimeline({
  entity,
  linkedSubmissions,
}: {
  entity: BeneficiaryEntity;
  linkedSubmissions: SubmissionRead[];
}) {
  const events = [
    {
      label: "Beneficiary Created",
      meta: `${entity.registrationSource} · ${entity.entityId}`,
      time: entity.registrationDate,
    },
    ...linkedSubmissions.map((submission) => ({
      label: submission.status === "approved" ? "Approved Record Linked" : "Submission Linked",
      meta: `${submission.client_submission_id} · ${submission.form_id.replaceAll("-", " ")}`,
      time: submission.imported_at ?? submission.submitted_at,
    })),
  ].sort((left, right) => new Date(right.time).getTime() - new Date(left.time).getTime());
  return (
    <div className="mt-4 space-y-3">
      {events.map((event, index) => (
        <div className="flex gap-3" key={`${event.label}-${event.time}-${index}`}>
          <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border bg-primary/10 text-primary">
            <History aria-hidden="true" size={14} />
          </span>
          <div>
            <p className="text-sm font-medium">{event.label}</p>
            <p className="mt-1 text-xs text-muted-foreground">{event.meta}</p>
            <p className="mt-1 text-xs text-muted-foreground">{formatEntityDate(event.time)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function fieldLineage(entity: BeneficiaryEntity): Record<string, Record<string, unknown>> {
  const value = entity.profileJson.fieldLineage;
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, Record<string, unknown>>)
    : {};
}

function profileUpdateProposals(entity: BeneficiaryEntity): {
  changes?: Record<string, unknown>;
  clientSubmissionId?: string;
  submissionId?: string;
}[] {
  const value = entity.profileJson.profileUpdateProposals;
  return Array.isArray(value)
    ? value.filter((item): item is { changes?: Record<string, unknown>; clientSubmissionId?: string; submissionId?: string } => Boolean(item) && typeof item === "object")
    : [];
}

function submissionSourceLabel(submission: SubmissionRead): string {
  if (submission.is_imported) {
    return submission.source_system ? `Imported from ${submission.source_system}` : "Imported";
  }
  if (submission.offline_created) return "Mobile";
  return "Field submitted";
}

function submissionActorLabel(submission: SubmissionRead): string {
  if (submission.is_imported) return submission.imported_by_user_id ?? "Uploaded user";
  return submission.field_officer_id || "Field officer";
}

function MetricButton({
  icon: Icon,
  label,
  onClick,
  value,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  value: number;
}) {
  return (
    <button
      className="rounded-lg border bg-background p-3 text-left transition hover:bg-muted"
      onClick={onClick}
      type="button"
    >
      <Icon aria-hidden="true" className="text-primary" size={16} />
      <p className="mt-2 text-lg font-semibold">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </button>
  );
}

function MergeBeneficiariesModal({
  canSubmit,
  draft,
  duplicateOptions,
  entities,
  onChange,
  onOpenChange,
  onSubmit,
  open,
  preview,
  saving,
}: {
  canSubmit: boolean;
  draft: { duplicateId: string; masterId: string; reason: string };
  duplicateOptions: BeneficiaryEntity[];
  entities: BeneficiaryEntity[];
  onChange: (draft: { duplicateId: string; masterId: string; reason: string }) => void;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
  open: boolean;
  preview: boolean;
  saving: boolean;
}) {
  const duplicate = entities.find((entity) => entity.id === draft.duplicateId) ?? null;
  const master = entities.find((entity) => entity.id === draft.masterId) ?? null;
  return (
    <Modal
      contentClassName="max-w-4xl"
      description="Compare duplicate beneficiary records, choose the master, provide a reason, and preserve linked submissions."
      onOpenChange={onOpenChange}
      open={open}
      title="Merge duplicate beneficiaries"
    >
      <div className="space-y-4">
        {preview ? (
          <div className="rounded-xl border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
            Preview data can show the workflow, but merging requires a signed-in tenant account with beneficiary management permission.
          </div>
        ) : null}
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm font-medium">
            Duplicate record to close
            <Select
              className="mt-2"
              onChange={(event) => onChange({ ...draft, duplicateId: event.target.value })}
              value={draft.duplicateId}
            >
              <option value="">Select duplicate</option>
              {duplicateOptions.map((entity) => (
                <option key={entity.id} value={entity.id}>
                  {entity.fullName} · {entity.entityId} · {entity.duplicateStatus}
                </option>
              ))}
            </Select>
          </label>
          <label className="text-sm font-medium">
            Master record to keep
            <Select
              className="mt-2"
              onChange={(event) => onChange({ ...draft, masterId: event.target.value })}
              value={draft.masterId}
            >
              <option value="">Select master</option>
              {entities.filter((entity) => entity.id !== draft.duplicateId).map((entity) => (
                <option key={entity.id} value={entity.id}>
                  {entity.fullName} · {entity.entityId} · {entity.status}
                </option>
              ))}
            </Select>
          </label>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <MergeRecordCard label="Duplicate will be marked duplicate" entity={duplicate} tone="warning" />
          <MergeRecordCard label="Master will keep linked data" entity={master} tone="success" />
        </div>
        <label className="block text-sm font-medium">
          Merge reason
          <Input
            className="mt-2"
            onChange={(event) => onChange({ ...draft, reason: event.target.value })}
            placeholder="Example: Same phone, same household ID, and supervisor confirmed one farmer record."
            value={draft.reason}
          />
        </label>
        <div className="rounded-xl border bg-muted/40 p-3 text-sm text-muted-foreground">
          Merging never hard-deletes a beneficiary. Linked submissions and quality signals move to the master record, the duplicate remains traceable, and the reason is stored for audit.
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Button onClick={() => onOpenChange(false)} type="button" variant="secondary">
            Cancel
          </Button>
          <Button disabled={!canSubmit} onClick={onSubmit} type="button" variant="primary">
            {saving ? "Merging..." : "Merge records"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function MergeRecordCard({ entity, label, tone }: { entity: BeneficiaryEntity | null; label: string; tone: "success" | "warning" }) {
  return (
    <div className="rounded-xl border bg-background p-3">
      <Badge tone={tone}>{label}</Badge>
      {entity ? (
        <div className="mt-3 space-y-2 text-sm">
          <p className="font-semibold">{entity.fullName}</p>
          <Signal label="Code" value={entity.entityId} />
          <Signal label="Project" value={entity.projectName} />
          <Signal label="Phone" value={entity.phoneNumber ?? "Not recorded"} />
          <Signal label="Household" value={entity.householdId ?? "N/A"} />
          <Signal label="Location" value={`${entity.village}, ${entity.district}`} />
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">Select a record to compare details.</p>
      )}
    </div>
  );
}

function Signal({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border bg-background px-3 py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-right text-xs font-semibold">{value}</span>
    </div>
  );
}

export function EntityLinkedFlowPreview() {
  return (
    <div className="rounded-xl border bg-panel p-4 shadow-line">
      <div className="flex items-center gap-2">
        <Link2 aria-hidden="true" className="text-primary" size={18} />
        <h3 className="text-sm font-semibold">Entity-linked collection flow</h3>
      </div>
      <div className="mt-3 grid gap-2 text-xs text-muted-foreground md:grid-cols-4">
        {[
          "Import or collect entity",
          "Prefill profile fields",
          "Validate frequency and duplicates",
          "Submit linked record",
        ].map((step, index) => (
          <div className="rounded-lg border bg-background p-3" key={step}>
            <Badge tone="neutral">Step {index + 1}</Badge>
            <p className="mt-2 leading-5">{step}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProjectBeneficiariesPanel({
  onOpenRegistry,
  preview = false,
  projectId,
  token = null,
}: {
  onOpenRegistry?: () => void;
  preview?: boolean;
  projectId: string;
  token?: string | null;
}) {
  const projectEntitiesQuery = useQuery({
    enabled: Boolean(token && token !== "preview-token" && !preview && projectId),
    queryFn: () => getProjectEntities(token ?? "", projectId),
    queryKey: ["project-beneficiaries", token, projectId],
  });
  const projectEntities = preview
    ? previewEntities.filter((entity) => entity.projectId === projectId)
    : (projectEntitiesQuery.data ?? []).map(mapBeneficiaryRead);
  const rows = preview ? (projectEntities.length ? projectEntities : previewEntities.slice(0, 3)) : projectEntities;
  return (
    <div className="space-y-4 rounded-2xl border bg-background/50 p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">Project Beneficiaries</h3>
            <HelpHint label="About Project Beneficiaries" title="Project Beneficiaries">
              This tab shows the entities enrolled in the project. The
              Beneficiaries module owns the registry, duplicate checks,
              assignment, and longitudinal profile history.
            </HelpHint>
          </div>
        </div>
        {onOpenRegistry ? (
          <Button onClick={onOpenRegistry} variant="secondary">
            Open registry
          </Button>
        ) : null}
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {[
          ["Total Entities", rows.length],
          ["Active Entities", rows.filter((entity) => entity.status === "Active").length],
          ["Duplicates Flagged", rows.filter((entity) => entity.duplicateStatus !== "Clear").length],
          ["Monitoring Due", rows.filter((entity) => !entity.lastVisit).length],
        ].map(([label, value]) => (
          <div className="rounded-xl border bg-panel p-3" key={label}>
            <p className="text-xl font-semibold">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {rows.length ? rows.map((entity) => (
          <div className="rounded-xl border bg-panel p-4" key={entity.id}>
            <div className="flex items-center justify-between gap-2">
              <Badge tone={statusTone(entity.status)}>{entity.status}</Badge>
              <Badge tone={statusTone(entity.duplicateStatus)}>
                {entity.duplicateStatus}
              </Badge>
            </div>
            <p className="mt-3 font-medium">{entity.fullName}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {entity.entityId} · {entity.entityType}
            </p>
            <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin aria-hidden="true" size={13} />
              {entity.village}, {entity.district}
            </p>
          </div>
        )) : (
          <div className="rounded-xl border border-dashed bg-panel p-4 text-sm text-muted-foreground xl:col-span-3">
            No beneficiaries are enrolled in this project yet. Import project beneficiaries or collect them with a project-linked mobile registration form.
          </div>
        )}
      </div>
      {!preview && projectEntitiesQuery.isFetching ? (
        <p className="text-xs text-muted-foreground">Loading project beneficiary records...</p>
      ) : null}
    </div>
  );
}
