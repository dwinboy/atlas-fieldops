"use client";

import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileUp,
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
import { listBeneficiaries, type CurrentPrincipal } from "@/lib/api";
import {
  mapBeneficiaryRead,
  previewEntities,
  type BeneficiaryEntity,
  type EntityStatus,
} from "@/modules/beneficiaries/data";
import { formatEntityDate } from "@/modules/beneficiaries/utils";
import { ImportsMigrationModule } from "@/modules/imports-migration/ImportsMigrationModule";
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
  const router = useRouter();
  const pathname = usePathname();
  const setActiveView = useWorkspaceStore((state) => state.setActiveView);
  const isImportRoute =
    (pathname ?? "").replace(/\/+$/, "") === "/beneficiaries/import";
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

  function openWorkspace(view: WorkspaceView, path?: string): void {
    setActiveView(view);
    if (path) router.push(path);
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
        />
      </div>
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
}: {
  onOpenRegistry?: () => void;
  preview?: boolean;
  projectId: string;
}) {
  const projectEntities = preview
    ? previewEntities.filter((entity) => entity.projectId === projectId)
    : [];
  const rows = preview ? (projectEntities.length ? projectEntities : previewEntities.slice(0, 3)) : [];
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
    </div>
  );
}
