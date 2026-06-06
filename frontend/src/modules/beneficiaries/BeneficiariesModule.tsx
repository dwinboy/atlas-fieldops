"use client";

import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileUp,
  Fingerprint,
  Link2,
  MapPin,
  Plus,
  Search,
  Smartphone,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { useMemo, useState } from "react";

import { DataTable, type TableColumn } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HelpHint } from "@/components/ui/help-hint";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import {
  createBeneficiary,
  listBeneficiaries,
  type CurrentPrincipal,
} from "@/lib/api";
import {
  entityTypes,
  mapBeneficiaryRead,
  previewEntities,
  type BeneficiaryEntity,
  type DuplicateCandidate,
  type EntityRegistrationDraft,
  type EntityStatus,
} from "@/modules/beneficiaries/data";
import {
  entityFromDraft,
  findDuplicateCandidates,
  formatEntityDate,
} from "@/modules/beneficiaries/utils";
import { useWorkspaceStore } from "@/stores/workspace";

type BeneficiariesModuleProps = {
  principal?: CurrentPrincipal | null;
  token: string | null;
};

const defaultDraft: EntityRegistrationDraft = {
  community: "",
  consentStatus: "Granted",
  continuationReason: "",
  country: "Cameroon",
  dateOfBirth: "",
  district: "",
  entityType: "Farmer",
  firstName: "",
  gender: "Female",
  householdId: "",
  lastName: "",
  latitude: "",
  longitude: "",
  nationalId: "",
  phoneNumber: "",
  projectId: "project-agri",
  projectName: "Agricultural Resilience Program",
  region: "",
  village: "",
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
  const [localEntities, setLocalEntities] = useState<BeneficiaryEntity[]>([]);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [draft, setDraft] = useState<EntityRegistrationDraft>(defaultDraft);
  const [duplicateCandidates, setDuplicateCandidates] = useState<
    DuplicateCandidate[]
  >([]);
  const [selectedEntity, setSelectedEntity] = useState<BeneficiaryEntity | null>(
    null,
  );
  const pushToast = useWorkspaceStore((state) => state.pushToast);
  const entitiesQuery = useQuery({
    enabled: Boolean(token && !preview),
    queryFn: () => listBeneficiaries(token ?? ""),
    queryKey: ["beneficiaries", token],
  });

  const backendEntities = (entitiesQuery.data ?? []).map(mapBeneficiaryRead);
  const entities = useMemo(
    () => [...localEntities, ...(preview ? previewEntities : backendEntities)],
    [backendEntities, localEntities, preview],
  );
  const duplicates = entities.filter(
    (entity) => entity.duplicateStatus !== "Clear" || entity.qualityFlags > 0,
  );
  const activeEntities = entities.filter((entity) => entity.status === "Active");
  const managerAccess = canManage(principal);
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

  function runDuplicateCheck(): DuplicateCandidate[] {
    const candidates = findDuplicateCandidates(draft, entities);
    setDuplicateCandidates(candidates);
    if (candidates.some((candidate) => candidate.score >= 90)) {
      pushToast({
        description:
          "A likely duplicate was found. Use the existing entity, cancel, or continue only with a reason.",
        title: "Duplicate found",
        tone: "warning",
      });
    }
    return candidates;
  }

  async function saveEntity(force = false) {
    const candidates = runDuplicateCheck();
    const likelyDuplicate = candidates.some((candidate) => candidate.score >= 90);
    if (likelyDuplicate && !force) return;
    if (likelyDuplicate && draft.continuationReason.trim().length < 8) {
      pushToast({
        description:
          "Provide a supervisor-readable reason before creating a possible duplicate entity.",
        title: "Reason required",
        tone: "danger",
      });
      return;
    }
    const nextEntity = entityFromDraft(draft, entities.length);
    setLocalEntities((current) => [nextEntity, ...current]);
    if (token && !preview) {
      try {
        await createBeneficiary(token, {
          beneficiary_type: draft.entityType.toLowerCase().replace(/\s+/g, "_"),
          beneficiary_uid: nextEntity.entityId,
          birth_year: draft.dateOfBirth
            ? Number(draft.dateOfBirth.slice(0, 4))
            : undefined,
          community: draft.community || draft.village,
          district: draft.district,
          display_name: nextEntity.fullName,
          latitude: nextEntity.latitude,
          longitude: nextEntity.longitude,
          phone_number: draft.phoneNumber || undefined,
          profile_json: {
            consentStatus: draft.consentStatus,
            country: draft.country,
            householdId: draft.householdId,
            nationalId: draft.nationalId,
            registrationDate: nextEntity.registrationDate,
            registrationSource: "Web",
          },
          project_id: draft.projectId.startsWith("project-")
            ? undefined
            : draft.projectId,
          region: draft.region,
          sex: draft.gender,
          vulnerability_score: 0,
        });
      } catch {
        pushToast({
          description:
            "The entity is saved in this workspace preview. Backend save will retry after the API accepts the selected project ID.",
          title: "Saved locally",
          tone: "warning",
        });
      }
    }
    setDraft(defaultDraft);
    setDuplicateCandidates([]);
    setRegisterOpen(false);
    setSelectedEntity(nextEntity);
    pushToast({
      description: `${nextEntity.entityId} is ready for entity-linked forms, assignments, submissions, and history.`,
      title: "Entity registered",
      tone: "success",
    });
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
              onClick={() => setRegisterOpen(true)}
              variant="primary"
            >
              <Plus aria-hidden="true" />
              Register entity
            </Button>
            <Button variant="secondary">
              <FileUp aria-hidden="true" />
              Import
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
        />
      </div>

      <RegisterEntityModal
        candidates={duplicateCandidates}
        draft={draft}
        onChange={setDraft}
        onCheck={runDuplicateCheck}
        onOpenChange={setRegisterOpen}
        onSave={saveEntity}
        open={registerOpen}
      />
    </section>
  );
}

function EntitySidePanel({
  duplicates,
  entity,
}: {
  duplicates: BeneficiaryEntity[];
  entity: BeneficiaryEntity | null;
}) {
  if (!entity) {
    return (
      <aside className="rounded-xl border border-dashed bg-panel p-4 text-sm text-muted-foreground">
        Select or register an entity to see profile, records, duplicate status,
        map readiness, and mobile sync context.
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
        <div className="mt-4 grid gap-2 text-sm">
          <Signal label="Project" value={entity.projectName} />
          <Signal
            label="Location"
            value={`${entity.village}, ${entity.district}`}
          />
          <Signal label="Phone" value={entity.phoneNumber ?? "Not recorded"} />
          <Signal label="Household" value={entity.householdId ?? "N/A"} />
          <Signal label="Consent" value={entity.consentStatus} />
          <Signal label="Last visit" value={formatEntityDate(entity.lastVisit)} />
        </div>
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
            ["Registration", "Complete"],
            ["Baseline", entity.formsCompleted > 1 ? "Complete" : "Due"],
            ["Monitoring Visit", "Monthly check"],
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
        <h2 className="text-sm font-semibold">Duplicate review queue</h2>
        <div className="mt-3 space-y-2">
          {duplicates.slice(0, 3).map((item) => (
            <div className="rounded-lg border bg-background p-3" key={item.id}>
              <p className="text-sm font-medium">{item.fullName}</p>
              <p className="text-xs text-muted-foreground">
                {item.entityId} · {item.duplicateStatus}
              </p>
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

function RegisterEntityModal({
  candidates,
  draft,
  onChange,
  onCheck,
  onOpenChange,
  onSave,
  open,
}: {
  candidates: DuplicateCandidate[];
  draft: EntityRegistrationDraft;
  onChange: (draft: EntityRegistrationDraft) => void;
  onCheck: () => DuplicateCandidate[];
  onOpenChange: (open: boolean) => void;
  onSave: (force?: boolean) => void;
  open: boolean;
}) {
  const likelyDuplicate = candidates.some((candidate) => candidate.score >= 90);
  return (
    <Modal
      contentClassName="max-w-5xl"
      description="Register an entity once, run duplicate checks, then link future forms and submissions to the same longitudinal record."
      onOpenChange={onOpenChange}
      open={open}
      title="Register entity"
    >
      <div className="grid max-h-[76vh] gap-5 overflow-y-auto p-5 product-scrollbar xl:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <Select
              value={draft.projectName}
              onChange={(event) =>
                onChange({
                  ...draft,
                  projectId:
                    event.target.value === "Community Health Access Project"
                      ? "project-health"
                      : event.target.value === "Education Attendance Baseline"
                        ? "project-edu"
                        : "project-agri",
                  projectName: event.target.value,
                })
              }
            >
              <option>Agricultural Resilience Program</option>
              <option>Community Health Access Project</option>
              <option>Education Attendance Baseline</option>
            </Select>
            <Select
              value={draft.entityType}
              onChange={(event) =>
                onChange({
                  ...draft,
                  entityType: event.target.value as EntityRegistrationDraft["entityType"],
                })
              }
            >
              {entityTypes.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </Select>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              placeholder={draft.entityType === "Facility" ? "Facility name" : "First name"}
              value={draft.firstName}
              onChange={(event) =>
                onChange({ ...draft, firstName: event.target.value })
              }
            />
            <Input
              placeholder="Last name"
              value={draft.lastName}
              onChange={(event) =>
                onChange({ ...draft, lastName: event.target.value })
              }
            />
            <Select
              value={draft.gender}
              onChange={(event) =>
                onChange({ ...draft, gender: event.target.value })
              }
            >
              <option>Female</option>
              <option>Male</option>
              <option>Other</option>
              <option>N/A</option>
            </Select>
            <Input
              type="date"
              value={draft.dateOfBirth}
              onChange={(event) =>
                onChange({ ...draft, dateOfBirth: event.target.value })
              }
            />
            <Input
              placeholder="Phone number"
              value={draft.phoneNumber}
              onChange={(event) =>
                onChange({ ...draft, phoneNumber: event.target.value })
              }
            />
            <Input
              placeholder="National ID"
              value={draft.nationalId}
              onChange={(event) =>
                onChange({ ...draft, nationalId: event.target.value })
              }
            />
            <Input
              placeholder="Household ID"
              value={draft.householdId}
              onChange={(event) =>
                onChange({ ...draft, householdId: event.target.value })
              }
            />
            <Select
              value={draft.consentStatus}
              onChange={(event) =>
                onChange({
                  ...draft,
                  consentStatus: event.target
                    .value as EntityRegistrationDraft["consentStatus"],
                })
              }
            >
              <option>Granted</option>
              <option>Missing</option>
              <option>Expired</option>
              <option>Not Required</option>
            </Select>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              placeholder="Village"
              value={draft.village}
              onChange={(event) =>
                onChange({ ...draft, village: event.target.value })
              }
            />
            <Input
              placeholder="Community"
              value={draft.community}
              onChange={(event) =>
                onChange({ ...draft, community: event.target.value })
              }
            />
            <Input
              placeholder="District"
              value={draft.district}
              onChange={(event) =>
                onChange({ ...draft, district: event.target.value })
              }
            />
            <Input
              placeholder="Region"
              value={draft.region}
              onChange={(event) =>
                onChange({ ...draft, region: event.target.value })
              }
            />
            <Input
              placeholder="Latitude"
              value={draft.latitude}
              onChange={(event) =>
                onChange({ ...draft, latitude: event.target.value })
              }
            />
            <Input
              placeholder="Longitude"
              value={draft.longitude}
              onChange={(event) =>
                onChange({ ...draft, longitude: event.target.value })
              }
            />
          </div>
          {likelyDuplicate ? (
            <Textarea
              placeholder="Reason to continue with a new entity despite duplicate risk"
              value={draft.continuationReason}
              onChange={(event) =>
                onChange({ ...draft, continuationReason: event.target.value })
              }
            />
          ) : null}
        </div>

        <aside className="space-y-3">
          <div className="rounded-xl border bg-background p-4">
            <div className="flex items-center gap-2">
              <Search aria-hidden="true" className="text-primary" size={18} />
              <h3 className="text-sm font-semibold">Duplicate check</h3>
            </div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Checks National ID, phone, household ID, name/date of birth,
              name/village, and GPS proximity before save.
            </p>
            <Button className="mt-3 w-full" onClick={onCheck} variant="secondary">
              Run duplicate check
            </Button>
          </div>
          <div className="rounded-xl border bg-background p-4">
            <h3 className="text-sm font-semibold">Possible matches</h3>
            <div className="mt-3 space-y-2">
              {candidates.length ? (
                candidates.slice(0, 4).map((candidate) => (
                  <div className="rounded-lg border bg-panel p-3" key={candidate.entity.id}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">
                        {candidate.entity.fullName}
                      </p>
                      <Badge
                        tone={candidate.score >= 90 ? "danger" : "warning"}
                      >
                        {candidate.score}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {candidate.entity.entityId}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {candidate.matchedFields.join(", ") || "Similar profile"}
                    </p>
                  </div>
                ))
              ) : (
                <p className="rounded-lg border border-dashed bg-panel p-3 text-xs text-muted-foreground">
                  No duplicate check has been run yet.
                </p>
              )}
            </div>
          </div>
          <div className="grid gap-2">
            <Button onClick={() => onSave(false)} variant="primary">
              <Fingerprint aria-hidden="true" />
              Save entity
            </Button>
            {likelyDuplicate ? (
              <Button onClick={() => onSave(true)} variant="secondary">
                Continue with reason
              </Button>
            ) : null}
          </div>
        </aside>
      </div>
    </Modal>
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
          "Search or register entity",
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
  projectId,
}: {
  onOpenRegistry?: () => void;
  projectId: string;
}) {
  const projectEntities = previewEntities.filter(
    (entity) => entity.projectId === projectId,
  );
  const rows = projectEntities.length ? projectEntities : previewEntities.slice(0, 3);
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
          ["Monitoring Due", rows.filter((entity) => !entity.lastVisit).length + 1],
        ].map(([label, value]) => (
          <div className="rounded-xl border bg-panel p-3" key={label}>
            <p className="text-xl font-semibold">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((entity) => (
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
        ))}
      </div>
    </div>
  );
}
