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
  UserPlus,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { DataTable, type TableColumn } from "@/components/DataTable";
import { statusTone as canonicalStatusTone } from "@/lib/statusTones";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HelpHint } from "@/components/ui/help-hint";
import { Input, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import {
  createBeneficiary,
  updateBeneficiary,
  getProjectEntities,
  governExport,
  listEntityCategories,
  listBeneficiaries,
  listFieldOfficers,
  listProjects,
  listSubmissions,
  mergeBeneficiaries,
  type BeneficiaryCreate,
  type CurrentPrincipal,
  type FieldOfficerRead,
  type EntityCategoryRead,
  type ProjectListItemRead,
  type SubmissionRead,
} from "@/lib/api";
import {
  entityTypes,
  mapBeneficiaryRead,
  previewEntities,
  type BeneficiaryEntity,
  type DuplicateCandidate,
  type EntityRegistrationDraft,
  type EntityStatus,
  type EntityType,
} from "@/modules/beneficiaries/data";
import {
  enrichEntity,
  findDuplicateCandidates,
  formatEntityDate,
  generateEntityId,
  toCsv,
} from "@/modules/beneficiaries/utils";
import { ImportsMigrationModule } from "@/modules/imports-migration/ImportsMigrationModule";
import { getPreviewSubmissions } from "@/modules/submissions/utils";
import { useWorkspaceStore, type WorkspaceView } from "@/stores/workspace";

type BeneficiariesModuleProps = {
  principal?: CurrentPrincipal | null;
  token: string | null;
};

function statusTone(status: EntityStatus | BeneficiaryEntity["duplicateStatus"]) {
  return canonicalStatusTone(status);
}

function canManage(principal?: CurrentPrincipal | null): boolean {
  if (!principal || principal.platform_admin) return true;
  return ["beneficiaries.create", "beneficiaries.manage", "beneficiaries.edit"].some(
    (permission) => principal.permissions?.includes(permission),
  );
}

const emptyRegistrationDraft: EntityRegistrationDraft = {
  consentStatus: "Missing",
  continuationReason: "",
  country: "",
  customProfile: {},
  community: "",
  dateOfBirth: "",
  district: "",
  entityType: "Farmer",
  firstName: "",
  gender: "",
  householdId: "",
  lastName: "",
  latitude: "",
  longitude: "",
  nationalId: "",
  phoneNumber: "",
  projectId: "",
  projectName: "",
  region: "",
  village: "",
};

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

function exportableProfileFields(entity: BeneficiaryEntity): Record<string, string | number | boolean | null | undefined> {
  const skip = new Set([
    "assignedOfficer",
    "country",
    "formsCompleted",
    "householdId",
    "nationalId",
    "projectName",
    "registrationDate",
    "fieldLineage",
    "profileFieldLineage",
    "profileLineage",
    "profileUpdateProposals",
  ]);
  return Object.fromEntries(
    Object.entries(entity.profileJson ?? {})
      .filter(([key, value]) => value !== null && value !== undefined && value !== "" && !key.startsWith("_") && !skip.has(key))
      .map(([key, value]) => [
        `profile_${key.replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "").toLowerCase()}`,
        typeof value === "object" ? JSON.stringify(value) : String(value),
      ]),
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
  const [registerOpen, setRegisterOpen] = useState(false);
  const [registerDraft, setRegisterDraft] = useState<EntityRegistrationDraft>(emptyRegistrationDraft);
  const [editOpen, setEditOpen] = useState(false);
  const [editEntityId, setEditEntityId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState({
    community: "",
    displayName: "",
    district: "",
    phoneNumber: "",
    reason: "",
    region: "",
    status: "Active" as EntityStatus,
  });
  const [entityTypeFilter, setEntityTypeFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const setActiveView = useWorkspaceStore((state) => state.setActiveView);
  const setPendingMapFeatureId = useWorkspaceStore((state) => state.setPendingMapFeatureId);
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
  const projectsQuery = useQuery({
    enabled: Boolean(token && !preview),
    queryFn: () => listProjects(token ?? ""),
    queryKey: ["beneficiaries", "projects", token],
  });
  const officersQuery = useQuery({
    enabled: Boolean(token && !preview),
    queryFn: () => listFieldOfficers(token ?? ""),
    queryKey: ["beneficiaries", "field-officers", token],
  });
  const entityCategoriesQuery = useQuery({
    enabled: Boolean(token && !preview),
    queryFn: () => listEntityCategories(token ?? "", { include_archived: false }),
    queryKey: ["beneficiaries", "entity-categories", token],
  });

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
  const projectMap = useMemo(
    () => new Map<string, ProjectListItemRead>((projectsQuery.data ?? []).map((project) => [project.id, project])),
    [projectsQuery.data],
  );
  const officerMap = useMemo(
    () => new Map<string, FieldOfficerRead>((officersQuery.data ?? []).map((officer) => [officer.id, officer])),
    [officersQuery.data],
  );
  const backendEntities = useMemo(
    () =>
      (entitiesQuery.data ?? []).map((row) => {
        const entity = mapBeneficiaryRead(row);
        return enrichEntity(entity, submissionsByEntity.get(entity.id) ?? [], projectMap, officerMap);
      }),
    [entitiesQuery.data, officerMap, projectMap, submissionsByEntity],
  );
  const entities = useMemo(
    () => (preview ? [...localEntities, ...previewEntities] : backendEntities),
    [backendEntities, localEntities, preview],
  );
  const duplicates = entities.filter(
    (entity) => entity.duplicateStatus !== "Clear" || entity.qualityFlags > 0,
  );
  const entityTypeOptions = useMemo(
    () => Array.from(new Set(entities.map((entity) => entity.entityType))).sort(),
    [entities],
  );
  const registrationEntityTypes = useMemo(
    () =>
      Array.from(
        new Set([
          ...entityTypes,
          ...(entityCategoriesQuery.data ?? []).map((category) => category.name),
          ...entityTypeOptions,
        ]),
      ).sort(),
    [entityCategoriesQuery.data, entityTypeOptions],
  );
  const filteredEntities = useMemo(
    () =>
      entities.filter(
        (entity) =>
          (entityTypeFilter === "all" || entity.entityType === entityTypeFilter) &&
          (projectFilter === "all" || entity.projectId === projectFilter),
      ),
    [entities, entityTypeFilter, projectFilter],
  );
  const managerAccess = canManage(principal);
  const projectOptions = useMemo(() => {
    if (preview) {
      const seen = new Map<string, string>();
      for (const entity of previewEntities) {
        if (!seen.has(entity.projectId)) seen.set(entity.projectId, entity.projectName);
      }
      return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
    }
    return (projectsQuery.data ?? []).map((project) => ({ id: project.id, name: project.name }));
  }, [preview, projectsQuery.data]);
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
        title: "Entities merged",
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
  const updateEntityMutation = useMutation({
    mutationFn: () =>
      updateBeneficiary(token ?? "", editEntityId ?? "", {
        reason: editDraft.reason.trim(),
        display_name: editDraft.displayName.trim() || undefined,
        phone_number: editDraft.phoneNumber.trim() || null,
        region: editDraft.region.trim() || null,
        district: editDraft.district.trim() || null,
        community: editDraft.community.trim() || null,
        enrollment_status: editDraft.status.toLowerCase(),
      }),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["beneficiaries", token] });
      setEditOpen(false);
      setEditEntityId(null);
      pushToast({
        title: "Entity profile updated",
        description: `${result.display_name} (${result.beneficiary_uid}) was corrected with an audited reason.`,
        tone: "success",
      });
    },
    onError: (error) => {
      pushToast({
        title: "Profile update failed",
        description: error instanceof Error ? error.message : "The entity profile could not be updated.",
        tone: "danger",
      });
    },
  });
  const createMutation = useMutation({
    mutationFn: (payload: BeneficiaryCreate) => createBeneficiary(token ?? "", payload),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["beneficiaries", token] });
      setRegisterOpen(false);
      setRegisterDraft(emptyRegistrationDraft);
      pushToast({
        title: "Entity registered",
        description: `${result.display_name} (${result.beneficiary_uid}) was added to the registry.`,
        tone: "success",
      });
    },
    onError: (error) => {
      pushToast({
        title: "Registration failed",
        description: error instanceof Error ? error.message : "The entity could not be registered.",
        tone: "danger",
      });
    },
  });
  const summaryCards: {
    icon: LucideIcon;
    label: string;
    value: string | number;
  }[] = [
    { icon: UsersRound, label: "Total Entities", value: filteredEntities.length },
    { icon: CheckCircle2, label: "Active Entities", value: filteredEntities.filter((entity) => entity.status === "Active").length },
    { icon: AlertTriangle, label: "Duplicates Flagged", value: filteredEntities.filter((entity) => entity.duplicateStatus !== "Clear" || entity.qualityFlags > 0).length },
    {
      icon: Smartphone,
      label: "Pending Profile Updates",
      value: filteredEntities.reduce((total, entity) => total + profileUpdateProposals(entity).length, 0),
    },
  ];

  function openWorkspace(view: WorkspaceView, path?: string): void {
    setActiveView(view);
    if (path) router.push(path);
  }

  function openEditEntity(entity: BeneficiaryEntity): void {
    setEditEntityId(entity.id);
    setEditDraft({
      community: entity.community,
      displayName: entity.fullName,
      district: entity.district,
      phoneNumber: entity.phoneNumber ?? "",
      reason: "",
      region: entity.region,
      status: entity.status,
    });
    setEditOpen(true);
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
      pushToast({ title: "Merge unavailable", description: "Sign in with entity management permission to merge duplicate records.", tone: "warning" });
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

  function openRegisterModal(): void {
    const firstProject = projectOptions[0];
    setRegisterDraft({
      ...emptyRegistrationDraft,
      projectId: firstProject?.id ?? "",
      projectName: firstProject?.name ?? "",
    });
    setRegisterOpen(true);
  }

  function submitRegistration(): void {
    if (preview || !token || !managerAccess) {
      pushToast({ title: "Registration unavailable", description: "Sign in with entity management permission to register new entities.", tone: "warning" });
      return;
    }
    if (!registerDraft.projectId) {
      pushToast({ title: "Project required", description: "Select a project to enroll this entity in.", tone: "warning" });
      return;
    }
    const isInstitution = registerDraft.entityType === "Facility" || registerDraft.entityType === "School";
    const displayName = isInstitution
      ? registerDraft.firstName.trim()
      : `${registerDraft.firstName} ${registerDraft.lastName}`.trim();
    if (!displayName) {
      pushToast({ title: "Name required", description: "Enter a name for this entity.", tone: "warning" });
      return;
    }
    if (registerDraft.continuationReason.trim().length < 8) {
      pushToast({ title: "Reason required", description: "Add a short reason for registering this entity manually.", tone: "warning" });
      return;
    }
    const birthYear = registerDraft.dateOfBirth ? Number.parseInt(registerDraft.dateOfBirth.slice(0, 4), 10) : NaN;
    const latitude = Number.parseFloat(registerDraft.latitude);
    const longitude = Number.parseFloat(registerDraft.longitude);
    createMutation.mutate({
      beneficiary_uid: generateEntityId(
        registerDraft.entityType,
        entities.filter((entity) => entity.entityType === registerDraft.entityType).length,
      ),
      beneficiary_type: registerDraft.entityType.toLowerCase().replace(/\s+/g, "_"),
      birth_year: Number.isFinite(birthYear) ? birthYear : null,
      community: registerDraft.community || registerDraft.village || null,
      display_name: displayName,
      district: registerDraft.district || null,
      latitude: Number.isFinite(latitude) ? latitude : null,
      longitude: Number.isFinite(longitude) ? longitude : null,
      phone_number: registerDraft.phoneNumber || null,
      profile_json: {
        ...registerDraft.customProfile,
        consentStatus: registerDraft.consentStatus,
        country: registerDraft.country,
        householdId: registerDraft.householdId,
        nationalId: registerDraft.nationalId,
        projectName: registerDraft.projectName,
        registrationDate: new Date().toISOString(),
        registrationReason: registerDraft.continuationReason.trim(),
        registrationSource: "Web",
        village: registerDraft.village,
      },
      project_id: registerDraft.projectId,
      region: registerDraft.region || null,
      sex: registerDraft.gender || null,
    });
  }

  async function exportEntities(): Promise<void> {
    if (token && !preview) {
      await governExport(token, {
        dataset_type: "beneficiaries",
        export_format: "csv",
        anonymized: false,
        record_count: filteredEntities.length,
        filters_json: { entity_type: entityTypeFilter, project_id: projectFilter },
      }).catch(() => undefined);
    }
    downloadCsv(
      "atlas-entities.csv",
      filteredEntities.map((entity) => ({
        ...exportableProfileFields(entity),
        entity_id: entity.entityId,
        full_name: entity.fullName,
        entity_type: entity.entityType,
        project: entity.projectName,
        village: entity.village,
        community: entity.community,
        district: entity.district,
        region: entity.region,
        status: entity.status,
        assigned_officer: entity.assignedOfficer,
        forms_completed: entity.formsCompleted,
        duplicate_status: entity.duplicateStatus,
        phone_number: entity.phoneNumber ?? "",
        household_id: entity.householdId ?? "",
        registration_date: entity.registrationDate,
      })),
    );
  }

  if (isImportRoute) {
    return (
      <section className="space-y-3">
        <div className="rounded-xl border bg-panel p-3.5 shadow-line">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <Badge tone="collect">ENTITIES</Badge>
              <h1 className="mt-3 text-2xl font-semibold tracking-tight">
                Import entities
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Import farmer, household, entity, facility, school, or
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
      header: "Entity ID",
      key: "beneficiary_id",
      render: (entity) => (
        <span className="font-mono text-xs" title="Readable system code. Prefix shows entity type, year shows creation year, number is the organization sequence.">
          {entity.entityId}
        </span>
      ),
      value: (entity) => entity.entityId,
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
    {
      header: "",
      key: "map",
      align: "right",
      render: (entity) =>
        entity.latitude && entity.longitude ? (
          <Button
            onClick={() => {
              setPendingMapFeatureId(`beneficiary-${entity.id}`);
              setActiveView("map");
            }}
            size="sm"
            variant="ghost"
          >
            <MapPin aria-hidden="true" />
            Map
          </Button>
        ) : null,
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
                Entities
              </h1>
              <HelpHint label="About Entities" title="Entities">
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
              Import entities
            </Button>
            <Button
              disabled={!managerAccess}
              onClick={() => openRegisterModal()}
              variant="secondary"
            >
              <UserPlus aria-hidden="true" />
              Register entity
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
            <Button disabled={!entities.length} onClick={() => void exportEntities()} variant="secondary">
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

      <div className="flex flex-col gap-2 rounded-xl border bg-panel p-3 shadow-line md:flex-row md:items-end">
        <label className="text-sm font-medium md:w-64">
          Entity category
          <Select
            className="mt-1"
            onChange={(event) => setEntityTypeFilter(event.target.value)}
            value={entityTypeFilter}
          >
            <option value="all">All categories</option>
            {entityTypeOptions.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </Select>
        </label>
        <label className="text-sm font-medium md:w-72">
          Project
          <Select
            className="mt-1"
            onChange={(event) => setProjectFilter(event.target.value)}
            value={projectFilter}
          >
            <option value="all">All projects</option>
            {projectOptions.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </Select>
        </label>
        <Button
          disabled={entityTypeFilter === "all" && projectFilter === "all"}
          onClick={() => {
            setEntityTypeFilter("all");
            setProjectFilter("all");
          }}
          variant="secondary"
        >
          Clear filters
        </Button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <DataTable
          columns={columns}
          emptyAction={
            managerAccess
              ? {
                  label: "Import entities",
                  onClick: () => openWorkspace("beneficiaries", "/beneficiaries/import"),
                }
              : undefined
          }
          emptyDescription="Import entities from CSV or Excel into a project, or register them through a published mobile form."
          emptyLabel="No entity records match this view"
          rows={filteredEntities}
          searchLabel="Search entity ID, name, phone, project, location"
          title={entitiesQuery.isFetching ? "Registry syncing" : "Entity registry"}
        />
        <EntitySidePanel
          duplicates={duplicates}
          entity={selectedEntity ?? filteredEntities[0] ?? null}
          onEdit={openEditEntity}
          linkedSubmissions={
            submissionsByEntity.get((selectedEntity ?? filteredEntities[0])?.id ?? "") ?? []
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
      <RegisterEntityModal
        canSubmit={managerAccess && !preview && !createMutation.isPending}
        draft={registerDraft}
        entities={entities}
        entityCategories={entityCategoriesQuery.data ?? []}
        entityTypeOptions={registrationEntityTypes}
        onChange={setRegisterDraft}
        onOpenChange={setRegisterOpen}
        onSubmit={submitRegistration}
        open={registerOpen}
        preview={preview}
        projectOptions={projectOptions}
        saving={createMutation.isPending}
      />
      <Modal
        contentClassName="max-w-xl"
        description="Correct this entity's profile. The entity ID stays fixed, and the change is recorded in the audit trail with your reason."
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) setEditEntityId(null);
        }}
        open={editOpen}
        title="Edit entity profile"
      >
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm font-medium">
            Display name
            <Input className="mt-2" value={editDraft.displayName} onChange={(event) => setEditDraft((current) => ({ ...current, displayName: event.target.value }))} />
          </label>
          <label className="text-sm font-medium">
            Phone number
            <Input className="mt-2" value={editDraft.phoneNumber} onChange={(event) => setEditDraft((current) => ({ ...current, phoneNumber: event.target.value }))} />
          </label>
          <label className="text-sm font-medium">
            Region
            <Input className="mt-2" value={editDraft.region} onChange={(event) => setEditDraft((current) => ({ ...current, region: event.target.value }))} />
          </label>
          <label className="text-sm font-medium">
            District
            <Input className="mt-2" value={editDraft.district} onChange={(event) => setEditDraft((current) => ({ ...current, district: event.target.value }))} />
          </label>
          <label className="text-sm font-medium">
            Community
            <Input className="mt-2" value={editDraft.community} onChange={(event) => setEditDraft((current) => ({ ...current, community: event.target.value }))} />
          </label>
          <label className="text-sm font-medium">
            Enrollment status
            <Select
              className="mt-2"
              onChange={(event) => setEditDraft((current) => ({ ...current, status: event.target.value as EntityStatus }))}
              value={editDraft.status}
            >
              {["Active", "Inactive", "Moved", "Deceased", "Duplicate"].map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </Select>
          </label>
        </div>
        <label className="mt-3 block text-sm font-medium">
          Reason for correction
          <Input
            className="mt-2"
            placeholder="e.g. Household relocated after verification visit"
            value={editDraft.reason}
            onChange={(event) => setEditDraft((current) => ({ ...current, reason: event.target.value }))}
          />
        </label>
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={() => setEditOpen(false)} variant="secondary">Cancel</Button>
          <Button
            disabled={!managerAccess || preview || updateEntityMutation.isPending || editDraft.reason.trim().length < 3 || !editDraft.displayName.trim()}
            onClick={() => updateEntityMutation.mutate()}
            variant="primary"
          >
            {updateEntityMutation.isPending ? "Saving…" : "Save correction"}
          </Button>
        </div>
      </Modal>
    </section>
  );
}

function EntitySidePanel({
  duplicates,
  entity,
  linkedSubmissions,
  managerAccess,
  onEdit,
  onMerge,
}: {
  duplicates: BeneficiaryEntity[];
  entity: BeneficiaryEntity | null;
  linkedSubmissions: SubmissionRead[];
  managerAccess: boolean;
  onEdit: (entity: BeneficiaryEntity) => void;
  onMerge: (duplicate?: BeneficiaryEntity) => void;
}) {
  const [activeTab, setActiveTab] = useState<
    "Overview" | "Profile" | "Forms & Records" | "Timeline"
  >("Overview");
  if (!entity) {
    return (
      <aside className="rounded-xl border border-dashed bg-panel p-4 text-sm text-muted-foreground">
        Import entities into a project or collect them through a
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
          <div className="flex flex-col items-end gap-2">
            <Badge tone={statusTone(entity.status)}>{entity.status}</Badge>
            <Button disabled={!managerAccess} onClick={() => onEdit(entity)} size="sm" variant="secondary">
              Edit profile
            </Button>
          </div>
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
  const customProfileRows = Object.entries(entity.profileJson ?? {})
    .filter(([key, value]) => {
      const normalized = key.toLowerCase();
      return (
        value !== null &&
        value !== undefined &&
        value !== "" &&
        !normalized.startsWith("_") &&
        ![
          "assignedofficer",
          "country",
          "formsccompleted",
          "formscompleted",
          "householdid",
          "nationalid",
          "projectname",
          "registrationdate",
          "fieldlineage",
          "profilefieldlineage",
          "profilelineage",
          "profileupdateproposals",
        ].includes(normalized)
      );
    })
    .slice(0, 24);
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
      {customProfileRows.length ? (
        <div className="rounded-lg border bg-background p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Custom profile fields</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Dynamic values captured from this entity category or approved form submissions.
              </p>
            </div>
            <Badge tone="neutral">{customProfileRows.length}</Badge>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {customProfileRows.map(([key, value]) => (
              <div className="rounded-md border bg-panel/60 p-2" key={key}>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  {humanizeProfileKey(key)}
                </p>
                <p className="mt-1 truncate text-sm font-medium" title={formatProfileValue(value)}>
                  {formatProfileValue(value)}
                </p>
              </div>
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
        No approved or pending submissions are linked to this entity yet.
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
      label: "Entity Created",
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

function humanizeProfileKey(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatProfileValue(value: unknown): string {
  if (Array.isArray(value)) return value.map(formatProfileValue).join(", ");
  if (value && typeof value === "object") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value ?? "Not recorded");
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
      description="Compare duplicate entity records, choose the master, provide a reason, and preserve linked submissions."
      onOpenChange={onOpenChange}
      open={open}
      title="Merge duplicate entities"
    >
      <div className="space-y-4">
        {preview ? (
          <div className="rounded-xl border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
            Preview data can show the workflow, but merging requires a signed-in tenant account with entity management permission.
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
          Merging never hard-deletes an entity. Linked submissions and quality signals move to the master record, the duplicate remains traceable, and the reason is stored for audit.
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

function duplicateLevelTone(level: DuplicateCandidate["level"]) {
  if (level === "Likely duplicate") return "danger";
  if (level === "Possible duplicate") return "warning";
  return "neutral";
}

function RegisterEntityModal({
  canSubmit,
  draft,
  entities,
  entityCategories,
  entityTypeOptions,
  onChange,
  onOpenChange,
  onSubmit,
  open,
  preview,
  projectOptions,
  saving,
}: {
  canSubmit: boolean;
  draft: EntityRegistrationDraft;
  entities: BeneficiaryEntity[];
  entityCategories: EntityCategoryRead[];
  entityTypeOptions: string[];
  onChange: (draft: EntityRegistrationDraft) => void;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
  open: boolean;
  preview: boolean;
  projectOptions: { id: string; name: string }[];
  saving: boolean;
}) {
  const projectCategoryOptions = useMemo(
    () =>
      entityCategories.filter(
        (category) => !draft.projectId || !category.project_id || category.project_id === draft.projectId,
      ),
    [draft.projectId, entityCategories],
  );
  const selectedCategory = useMemo(
    () =>
      projectCategoryOptions.find((category) => category.name === draft.entityType) ??
      entityCategories.find((category) => category.name === draft.entityType) ??
      null,
    [draft.entityType, entityCategories, projectCategoryOptions],
  );
  const customAttributes = useMemo(
    () =>
      (selectedCategory?.attributes ?? [])
        .filter((attribute) => attribute.status !== "archived")
        .sort((first, second) => (first.order_index ?? 0) - (second.order_index ?? 0)),
    [selectedCategory],
  );
  const isInstitution = draft.entityType === "Facility" || draft.entityType === "School";
  const duplicates = useMemo(
    () =>
      draft.firstName || draft.lastName || draft.nationalId || draft.phoneNumber || draft.householdId
        ? findDuplicateCandidates(draft, entities)
        : [],
    [draft, entities],
  );

  function update<K extends keyof EntityRegistrationDraft>(key: K, value: EntityRegistrationDraft[K]): void {
    onChange({ ...draft, [key]: value });
  }

  function updateCustomProfile(key: string, value: string): void {
    onChange({ ...draft, customProfile: { ...draft.customProfile, [key]: value } });
  }

  return (
    <Modal
      contentClassName="max-w-4xl"
      description="Register a new farmer, household, entity, facility, school, or other entity in this registry, with a live duplicate check before saving."
      onOpenChange={onOpenChange}
      open={open}
      title="Register entity"
    >
      <div className="max-h-[70vh] space-y-4 overflow-y-auto product-scrollbar pr-1">
        {preview ? (
          <div className="rounded-xl border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
            Preview data can show the workflow, but registering a new entity requires a signed-in tenant account with entity management permission.
          </div>
        ) : null}
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm font-medium">
            Entity type
            <Select
              className="mt-2"
              onChange={(event) => update("entityType", event.target.value as EntityType)}
              value={draft.entityType}
            >
              {entityTypeOptions.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </Select>
            {projectCategoryOptions.length ? (
              <span className="mt-1 block text-xs font-normal text-muted-foreground">
                Project categories available: {projectCategoryOptions.map((category) => category.name).slice(0, 4).join(", ")}
              </span>
            ) : null}
          </label>
          <label className="text-sm font-medium">
            Project
            <Select
              className="mt-2"
              onChange={(event) => {
                const project = projectOptions.find((option) => option.id === event.target.value);
                const category = entityCategories.find(
                  (item) => item.project_id === event.target.value,
                );
                onChange({
                  ...draft,
                  entityType: (category?.name ?? draft.entityType) as EntityType,
                  projectId: event.target.value,
                  projectName: project?.name ?? "",
                });
              }}
              value={draft.projectId}
            >
              <option value="">Select project</option>
              {projectOptions.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </Select>
          </label>
        </div>
        {customAttributes.length ? (
          <div className="rounded-xl border bg-muted/30 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{draft.entityType} fields</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Fields configured for this project entity category.
                </p>
              </div>
              <Badge tone="neutral">{customAttributes.length}</Badge>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {customAttributes.slice(0, 12).map((attribute) => (
                <label className="text-sm font-medium" key={attribute.field_key}>
                  {attribute.label}
                  {attribute.required ? <span className="text-danger"> *</span> : null}
                  {attribute.options_json?.length ? (
                    <Select
                      className="mt-2"
                      onChange={(event) => updateCustomProfile(attribute.field_key, event.target.value)}
                      value={draft.customProfile[attribute.field_key] ?? ""}
                    >
                      <option value="">Select</option>
                      {attribute.options_json.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </Select>
                  ) : (
                    <Input
                      className="mt-2"
                      onChange={(event) => updateCustomProfile(attribute.field_key, event.target.value)}
                      type={attribute.field_type === "number" ? "number" : attribute.field_type === "date" ? "date" : "text"}
                      value={draft.customProfile[attribute.field_key] ?? ""}
                    />
                  )}
                </label>
              ))}
            </div>
          </div>
        ) : null}
        {isInstitution ? (
          <label className="block text-sm font-medium">
            Name
            <Input
              className="mt-2"
              onChange={(event) => update("firstName", event.target.value)}
              placeholder="Example: Bonaberi Health Post"
              value={draft.firstName}
            />
          </label>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm font-medium">
              First name
              <Input className="mt-2" onChange={(event) => update("firstName", event.target.value)} value={draft.firstName} />
            </label>
            <label className="text-sm font-medium">
              Last name
              <Input className="mt-2" onChange={(event) => update("lastName", event.target.value)} value={draft.lastName} />
            </label>
          </div>
        )}
        {!isInstitution ? (
          <div className="grid gap-3 md:grid-cols-3">
            <label className="text-sm font-medium">
              Gender
              <Select className="mt-2" onChange={(event) => update("gender", event.target.value)} value={draft.gender}>
                <option value="">Not recorded</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </Select>
            </label>
            <label className="text-sm font-medium">
              Date of birth
              <Input className="mt-2" onChange={(event) => update("dateOfBirth", event.target.value)} type="date" value={draft.dateOfBirth} />
            </label>
            <label className="text-sm font-medium">
              Phone number
              <Input className="mt-2" onChange={(event) => update("phoneNumber", event.target.value)} value={draft.phoneNumber} />
            </label>
          </div>
        ) : null}
        <div className="grid gap-3 md:grid-cols-3">
          <label className="text-sm font-medium">
            National ID
            <Input className="mt-2" onChange={(event) => update("nationalId", event.target.value)} value={draft.nationalId} />
          </label>
          <label className="text-sm font-medium">
            Household ID
            <Input className="mt-2" onChange={(event) => update("householdId", event.target.value)} value={draft.householdId} />
          </label>
          <label className="text-sm font-medium">
            Consent status
            <Select
              className="mt-2"
              onChange={(event) => update("consentStatus", event.target.value as EntityRegistrationDraft["consentStatus"])}
              value={draft.consentStatus}
            >
              <option value="Granted">Granted</option>
              <option value="Missing">Missing</option>
              <option value="Expired">Expired</option>
              <option value="Not Required">Not Required</option>
            </Select>
          </label>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="text-sm font-medium">
            Village
            <Input className="mt-2" onChange={(event) => update("village", event.target.value)} value={draft.village} />
          </label>
          <label className="text-sm font-medium">
            Community
            <Input className="mt-2" onChange={(event) => update("community", event.target.value)} value={draft.community} />
          </label>
          <label className="text-sm font-medium">
            District
            <Input className="mt-2" onChange={(event) => update("district", event.target.value)} value={draft.district} />
          </label>
          <label className="text-sm font-medium">
            Region
            <Input className="mt-2" onChange={(event) => update("region", event.target.value)} value={draft.region} />
          </label>
          <label className="text-sm font-medium">
            Country
            <Input className="mt-2" onChange={(event) => update("country", event.target.value)} value={draft.country} />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-sm font-medium">
              Latitude
              <Input className="mt-2" onChange={(event) => update("latitude", event.target.value)} placeholder="5.9631" value={draft.latitude} />
            </label>
            <label className="text-sm font-medium">
              Longitude
              <Input className="mt-2" onChange={(event) => update("longitude", event.target.value)} placeholder="10.1591" value={draft.longitude} />
            </label>
          </div>
        </div>
        <label className="block text-sm font-medium">
          Reason for manual registration
          <Input
            className="mt-2"
            onChange={(event) => update("continuationReason", event.target.value)}
            placeholder="Example: Household enrolled during in-person intake, no mobile device available."
            value={draft.continuationReason}
          />
        </label>
        {duplicates.length ? (
          <div className="rounded-xl border border-warning/30 bg-warning/10 p-3">
            <p className="text-sm font-semibold">Possible existing records</p>
            <div className="mt-2 space-y-2">
              {duplicates.slice(0, 3).map((candidate) => (
                <div className="flex items-start justify-between gap-3 rounded-lg border bg-background p-3" key={candidate.entity.id}>
                  <div>
                    <p className="text-sm font-medium">{candidate.entity.fullName}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {candidate.entity.entityId} · matched on {candidate.matchedFields.join(", ")}
                    </p>
                  </div>
                  <Badge tone={duplicateLevelTone(candidate.level)}>{candidate.level}</Badge>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Review these records before saving to avoid creating a duplicate entity. This warning does not block registration.
              {customAttributes.length ? " Category fields such as IDs, codes, names, phones, and locations are included in this check." : ""}
            </p>
          </div>
        ) : null}
        <div className="flex flex-wrap justify-end gap-2">
          <Button onClick={() => onOpenChange(false)} type="button" variant="secondary">
            Cancel
          </Button>
          <Button disabled={!canSubmit} onClick={onSubmit} type="button" variant="primary">
            {saving ? "Registering..." : "Register entity"}
          </Button>
        </div>
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
            <h3 className="font-semibold">Project Entities</h3>
            <HelpHint label="About Project Entities" title="Project Entities">
              This tab shows the entities enrolled in the project. The
              Entities module owns the registry, duplicate checks,
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
            No entities are enrolled in this project yet. Import project entities or collect them with a project-linked mobile registration form.
          </div>
        )}
      </div>
      {!preview && projectEntitiesQuery.isFetching ? (
        <p className="text-xs text-muted-foreground">Loading project entity records...</p>
      ) : null}
    </div>
  );
}
