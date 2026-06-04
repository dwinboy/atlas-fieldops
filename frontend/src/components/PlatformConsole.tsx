"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Database,
  FileClock,
  KeyRound,
  LifeBuoy,
  LockKeyhole,
  Plus,
  RadioTower,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  UserCog,
  UsersRound
} from "lucide-react";
import { useMemo, useState } from "react";

import { DataTable, type TableColumn } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createOrganization,
  createOrganizationSupportSession,
  getHealth,
  listPlatformOrganizations,
  updatePlatformOrganizationStatus,
  type CurrentPrincipal,
  type PlatformOrganizationRead
} from "@/lib/api";
import { useWorkspaceStore } from "@/stores/workspace";

type PlatformConsoleProps = {
  onTokenChanged?: (token: string) => void;
  principal?: CurrentPrincipal | null;
  token: string | null;
};

type PlatformSection = "dashboard" | "organizations" | "support" | "users" | "health" | "audit" | "usage" | "settings" | "onboarding";

type ActionLog = {
  action: string;
  detail: string;
  time: string;
};

const sections: { id: PlatformSection; label: string; icon: typeof Building2 }[] = [
  { id: "dashboard", label: "Dashboard", icon: BarChart3 },
  { id: "organizations", label: "Organizations", icon: Building2 },
  { id: "support", label: "Support sessions", icon: LifeBuoy },
  { id: "users", label: "Platform users", icon: UserCog },
  { id: "health", label: "System health", icon: RadioTower },
  { id: "audit", label: "Audit logs", icon: FileClock },
  { id: "usage", label: "Usage and plans", icon: Activity },
  { id: "settings", label: "Settings", icon: Settings },
  { id: "onboarding", label: "Onboarding", icon: ClipboardCheck }
];

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function formatTime(): string {
  return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(new Date());
}

function SectionShell({ children, description, title }: { children: React.ReactNode; description: string; title: string }) {
  return (
    <section className="surface-premium rounded-2xl p-5">
      <div className="mb-4">
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  );
}

function RequirementCard({ description, status, title }: { description: string; status: string; title: string }) {
  return (
    <article className="rounded-lg border bg-panel p-4 shadow-line">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        <Badge tone="warning">{status}</Badge>
      </div>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
    </article>
  );
}

export function PlatformConsole({ onTokenChanged, principal, token }: PlatformConsoleProps) {
  const [activeSection, setActiveSection] = useState<PlatformSection>("dashboard");
  const [organizationName, setOrganizationName] = useState("");
  const [organizationSlug, setOrganizationSlug] = useState("");
  const [ownerFullName, setOwnerFullName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("ChangeMe12345!");
  const [platformResult, setPlatformResult] = useState("");
  const [actionLog, setActionLog] = useState<ActionLog[]>([]);
  const pushToast = useWorkspaceStore((state) => state.pushToast);

  const organizationsQuery = useQuery({
    queryKey: ["platform-console-organizations", token],
    queryFn: () => listPlatformOrganizations(token ?? ""),
    enabled: Boolean(token && principal?.platform_admin && !principal.support_mode)
  });

  const healthQuery = useQuery({
    queryKey: ["platform-health"],
    queryFn: getHealth,
    enabled: Boolean(token && principal?.platform_admin && !principal.support_mode)
  });

  const organizations = organizationsQuery.data ?? [];
  const activeOrganizations = organizations.filter((organization) => organization.is_active).length;
  const suspendedOrganizations = organizations.length - activeOrganizations;
  const totalUsers = organizations.reduce((sum, organization) => sum + organization.user_count, 0);
  const organizationsWithoutOwner = organizations.filter((organization) => !organization.owner_email).length;
  const setupAttentionCount = suspendedOrganizations + organizationsWithoutOwner + (healthQuery.isError ? 1 : 0);
  const currentOrigin = typeof window === "undefined" ? "Production frontend origin" : window.location.origin;
  const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL ?? "https://backend-production-13c9.up.railway.app";

  const addActionLog = (action: string, detail: string) => {
    setActionLog((rows) => [{ action, detail, time: formatTime() }, ...rows].slice(0, 8));
  };

  const organizationMutation = useMutation({
    mutationFn: () =>
      createOrganization(token ?? "", {
        name: organizationName,
        slug: organizationSlug,
        owner_email: ownerEmail,
        owner_full_name: ownerFullName,
        owner_password: ownerPassword
      }),
    onSuccess: async (organization) => {
      const message = `${organization.name} was created. Login slug: ${organization.slug}. Owner: ${organization.owner_email ?? ownerEmail}.`;
      setPlatformResult(message);
      addActionLog("Organization created", message);
      setOrganizationName("");
      setOrganizationSlug("");
      setOwnerFullName("");
      setOwnerEmail("");
      setOwnerPassword("ChangeMe12345!");
      pushToast({ title: "Organization created", description: `${organization.name} is ready for owner sign-in.`, tone: "success" });
      await organizationsQuery.refetch();
    },
    onError: () => {
      const message = "Organization was not created. Confirm the slug is unique, owner details are valid, and your platform super admin session is active.";
      setPlatformResult(message);
      addActionLog("Organization create failed", message);
      pushToast({ title: "Organization was not created", description: "Check slug, owner details, and platform permissions.", tone: "danger" });
    }
  });

  const statusMutation = useMutation({
    mutationFn: (payload: { organization: PlatformOrganizationRead; active: boolean }) =>
      updatePlatformOrganizationStatus(token ?? "", payload.organization.id, payload.active),
    onSuccess: async (organization) => {
      const message = `${organization.name} is now ${organization.is_active ? "active" : "inactive"}.`;
      setPlatformResult(message);
      addActionLog("Organization status changed", message);
      pushToast({
        title: organization.is_active ? "Organization activated" : "Organization deactivated",
        description: `${organization.name} status was updated.`,
        tone: organization.is_active ? "success" : "warning"
      });
      await organizationsQuery.refetch();
    },
    onError: () => {
      const message = "Organization status could not be changed. Confirm your platform session and try again.";
      setPlatformResult(message);
      addActionLog("Status change failed", message);
      pushToast({ title: "Status unchanged", description: "The platform action failed.", tone: "danger" });
    }
  });

  const supportMutation = useMutation({
    mutationFn: (organization: PlatformOrganizationRead) => createOrganizationSupportSession(token ?? "", organization.id),
    onSuccess: (response, organization) => {
      const message = `Support session opened for ${organization.name}. You are now viewing tenant data as platform support.`;
      setPlatformResult(message);
      addActionLog("Support session opened", message);
      pushToast({ title: "Support session opened", description: `Now viewing ${organization.name}`, tone: "success" });
      onTokenChanged?.(response.access_token);
    },
    onError: () => {
      const message = "Support session could not be opened. Confirm the tenant exists and your super admin session is active.";
      setPlatformResult(message);
      addActionLog("Support session failed", message);
      pushToast({ title: "Support session failed", description: "Could not open this organization.", tone: "danger" });
    }
  });

  const columns = useMemo<TableColumn<PlatformOrganizationRead>[]>(
    () => [
      {
        key: "organization",
        header: "Organization",
        value: (organization) => `${organization.name} ${organization.slug}`,
        render: (organization) => (
          <div>
            <p className="font-medium">{organization.name}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{organization.slug}</p>
          </div>
        )
      },
      {
        key: "owner",
        header: "Owner",
        value: (organization) => organization.owner_email ?? "",
        render: (organization) => organization.owner_email ?? <span className="text-warning">Owner setup needed</span>
      },
      {
        key: "users",
        align: "right",
        header: "Users",
        value: (organization) => String(organization.user_count),
        render: (organization) => organization.user_count.toLocaleString()
      },
      {
        key: "status",
        header: "Status",
        value: (organization) => (organization.is_active ? "active" : "inactive"),
        render: (organization) => <Badge tone={organization.is_active ? "success" : "warning"}>{organization.is_active ? "Active" : "Inactive"}</Badge>
      },
      {
        key: "actions",
        header: "Actions",
        value: (organization) => organization.id,
        render: (organization) => (
          <div className="flex flex-wrap gap-2">
            <Button disabled={supportMutation.isPending} onClick={() => supportMutation.mutate(organization)} size="sm" type="button" variant="secondary">
              <LifeBuoy aria-hidden="true" />
              Open support
            </Button>
            <Button
              disabled={statusMutation.isPending}
              onClick={() => statusMutation.mutate({ organization, active: !organization.is_active })}
              size="sm"
              type="button"
              variant="ghost"
            >
              {organization.is_active ? "Deactivate" : "Activate"}
            </Button>
          </div>
        )
      }
    ],
    [statusMutation, supportMutation]
  );

  const metricCards = [
    ["Organizations", organizations.length.toLocaleString(), Building2, "All tenant workspaces"],
    ["Active", activeOrganizations.toLocaleString(), CheckCircle2, "Can sign in"],
    ["Suspended", suspendedOrganizations.toLocaleString(), LockKeyhole, "Temporarily disabled"],
    ["Tenant users", totalUsers.toLocaleString(), UsersRound, "Across organizations"],
    ["Needs attention", setupAttentionCount.toLocaleString(), Activity, "Owner/status/health"]
  ] as const;

  const organizationForm = (
    <form
      className="grid gap-3 lg:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        organizationMutation.mutate();
      }}
    >
      <label className="space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground">Organization name</span>
        <Input
          onBlur={() => {
            if (!organizationSlug) {
              setOrganizationSlug(slugify(organizationName));
            }
          }}
          onChange={(event) => setOrganizationName(event.target.value)}
          placeholder="North District Health Program"
          required
          value={organizationName}
        />
      </label>
      <label className="space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground">Login slug</span>
        <Input onChange={(event) => setOrganizationSlug(slugify(event.target.value))} placeholder="north-health" required value={organizationSlug} />
      </label>
      <label className="space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground">Owner full name</span>
        <Input onChange={(event) => setOwnerFullName(event.target.value)} placeholder="Amina Bello" required value={ownerFullName} />
      </label>
      <label className="space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground">Owner email</span>
        <Input onChange={(event) => setOwnerEmail(event.target.value)} placeholder="owner@example.org" required type="email" value={ownerEmail} />
      </label>
      <label className="space-y-1.5 lg:col-span-2">
        <span className="text-xs font-medium text-muted-foreground">Temporary password</span>
        <Input minLength={10} onChange={(event) => setOwnerPassword(event.target.value)} required type="text" value={ownerPassword} />
      </label>
      <div className="flex flex-wrap gap-2 lg:col-span-2">
        <Button disabled={organizationMutation.isPending} type="submit" variant="primary">
          <Plus aria-hidden="true" />
          Create organization
        </Button>
        <Button
          onClick={() => {
            setOrganizationSlug(slugify(organizationName));
          }}
          type="button"
          variant="secondary"
        >
          Generate slug
        </Button>
      </div>
    </form>
  );

  return (
    <section aria-labelledby="platform-console-title" className="space-y-5">
      <div className="surface-premium rounded-2xl p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Platform owner</p>
            <h1 id="platform-console-title" className="mt-2 text-2xl font-semibold tracking-tight">
              Platform console
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              Manage Atlas FieldOps as the platform operator. Create organizations, control tenant status, enter support sessions, review readiness, and keep platform work separate from tenant work.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone="accent">{principal?.email ?? "Platform admin"}</Badge>
            <Badge tone="success">Operator account</Badge>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {metricCards.map(([label, value, Icon, detail]) => (
          <article className="rounded-lg border bg-panel p-4 shadow-line" key={label}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">{label}</p>
              <Icon aria-hidden="true" className="text-muted-foreground" size={17} />
            </div>
            <p className="mt-3 text-2xl font-semibold tracking-tight">{value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
          </article>
        ))}
      </div>

      <nav className="flex gap-2 overflow-x-auto rounded-2xl border bg-panel p-2 shadow-line" aria-label="Platform console sections">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <Button
              className="justify-start whitespace-nowrap"
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              size="sm"
              type="button"
              variant={activeSection === section.id ? "primary" : "ghost"}
            >
              <Icon aria-hidden="true" />
              {section.label}
            </Button>
          );
        })}
      </nav>

      {platformResult ? (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
          <p className="text-sm font-medium text-primary">Latest platform action</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{platformResult}</p>
        </div>
      ) : null}

      {activeSection === "dashboard" ? (
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <SectionShell
            title="Operator overview"
            description="Use this view at the start of a support or onboarding session. It shows tenant count, account status, production health, and the actions that need an operator decision."
          >
            <div className="grid gap-3 md:grid-cols-3">
              {[
                ["Account boundary", "Platform account", "You are managing Atlas FieldOps, not operating as a tenant user."],
                ["Production API", healthQuery.data?.status === "ok" ? "Online" : healthQuery.isError ? "Check required" : "Checking", configuredApiUrl],
                ["Frontend origin", currentOrigin, "This origin must be present in backend CORS settings."]
              ].map(([title, value, detail]) => (
                <article className="rounded-lg border bg-panel p-4 shadow-line" key={title}>
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">{title}</p>
                  <p className="mt-2 text-sm font-semibold">{value}</p>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">{detail}</p>
                </article>
              ))}
            </div>
            <div className="mt-4 rounded-lg border bg-muted/35 p-4">
              <h3 className="text-sm font-semibold">Operator priorities</h3>
              <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
                {[
                  "Create tenant organizations only from verified customer or program requests.",
                  "Use support mode only when investigating a tenant issue, then return to platform console.",
                  "Deactivate an organization only when access must be paused for security, contract, or operational reasons.",
                  "Use session audit and usage telemetry requirements to guide the next backend hardening pass."
                ].map((item) => (
                  <div className="flex gap-2" key={item}>
                    <CheckCircle2 aria-hidden="true" className="mt-0.5 text-success" size={16} />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </SectionShell>

          <SectionShell title="Current session audit" description="Recent platform actions from this browser session. Persistent audit history needs the platform audit endpoint listed below.">
            <div className="space-y-3">
              {actionLog.length ? (
                actionLog.map((item) => (
                  <article className="rounded-lg border bg-panel p-3" key={`${item.time}-${item.action}-${item.detail}`}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium">{item.action}</p>
                      <span className="text-xs text-muted-foreground">{item.time}</span>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.detail}</p>
                  </article>
                ))
              ) : (
                <p className="rounded-lg border border-dashed p-4 text-sm leading-6 text-muted-foreground">
                  No platform actions in this browser session yet. Create an organization, change status, or open support to see immediate operator history.
                </p>
              )}
            </div>
          </SectionShell>
        </section>
      ) : null}

      {activeSection === "organizations" ? (
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
          <DataTable columns={columns} emptyLabel="No organizations yet" rows={organizations} searchLabel="Search organizations" title="Platform organizations" />
          <SectionShell title="Create organization" description="Create a tenant workspace and its first organization owner. Give the owner the slug, email, and temporary password after creation.">
            {organizationForm}
          </SectionShell>
        </section>
      ) : null}

      {activeSection === "support" ? (
        <SectionShell
          title="Tenant support sessions"
          description="Open a support session only when a tenant needs help. The platform token changes into support mode, the tenant workspace opens, and a support banner helps you return to platform control."
        >
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {organizations.map((organization) => (
              <article className="rounded-lg border bg-panel p-4 shadow-line" key={organization.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold">{organization.name}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">{organization.slug}</p>
                  </div>
                  <Badge tone={organization.is_active ? "success" : "warning"}>{organization.is_active ? "Active" : "Inactive"}</Badge>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Owner: {organization.owner_email ?? "Owner not assigned"} · Users: {organization.user_count.toLocaleString()}
                </p>
                <Button className="mt-4 w-full" disabled={supportMutation.isPending} onClick={() => supportMutation.mutate(organization)} type="button">
                  <LifeBuoy aria-hidden="true" />
                  Open support mode
                </Button>
              </article>
            ))}
          </div>
        </SectionShell>
      ) : null}

      {activeSection === "users" ? (
        <SectionShell
          title="Platform users and admins"
          description="Platform users are different from tenant users. They manage the Atlas FieldOps platform, enter support sessions, and resolve operational issues across organizations."
        >
          <div className="grid gap-3 lg:grid-cols-2">
            <article className="rounded-lg border bg-panel p-4 shadow-line">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold">{principal?.full_name ?? principal?.email ?? "Current platform admin"}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{principal?.email ?? "Signed-in operator"}</p>
                </div>
                <Badge tone="accent">Super admin</Badge>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                This account can create organizations, activate or deactivate tenants, and open support sessions. It should not be used for routine tenant data entry.
              </p>
            </article>
            <RequirementCard
              title="Invite and remove platform admins"
              status="Backend endpoint needed"
              description="Add a platform-only user endpoint with invite, deactivate, role assignment, MFA status, last sign-in, and audit logging before exposing admin creation in production."
            />
          </div>
        </SectionShell>
      ) : null}

      {activeSection === "health" ? (
        <SectionShell
          title="System health and diagnostics"
          description="Confirm whether the frontend, backend API, database connection, and environment setup are ready before investigating tenant issues."
        >
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {[
              ["Backend API", healthQuery.data?.status === "ok" ? "Online" : healthQuery.isError ? "Needs review" : "Checking", healthQuery.data?.status === "ok" ? "success" : healthQuery.isError ? "danger" : "warning", configuredApiUrl],
              ["Database", healthQuery.data?.status === "ok" ? "Reachable" : "Unknown", healthQuery.data?.status === "ok" ? "success" : "warning", "Health route confirms API readiness. Add deep DB check for stronger diagnostics."],
              ["CORS origin", currentOrigin, "accent", "Railway BACKEND_CORS_ORIGINS must include this origin exactly."],
              ["Kafka events", "Optional", "warning", "Startup warnings are acceptable when Kafka is not provisioned; event publishing is disabled gracefully."]
            ].map(([label, value, tone, detail]) => (
              <article className="rounded-lg border bg-panel p-4 shadow-line" key={label}>
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-sm font-semibold">{label}</h3>
                  <Badge tone={tone as "success" | "warning" | "danger" | "accent"}>{value}</Badge>
                </div>
                <p className="mt-3 text-xs leading-5 text-muted-foreground">{detail}</p>
              </article>
            ))}
          </div>
        </SectionShell>
      ) : null}

      {activeSection === "audit" ? (
        <SectionShell
          title="Platform audit logs"
          description="Platform audit history should show who created organizations, changed tenant status, opened support, reset access, imported users, and exported data."
        >
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="space-y-3">
              {actionLog.length ? (
                actionLog.map((item) => (
                  <article className="rounded-lg border bg-panel p-4 shadow-line" key={`${item.time}-${item.action}-${item.detail}`}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold">{item.action}</p>
                      <span className="text-xs text-muted-foreground">{item.time}</span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.detail}</p>
                  </article>
                ))
              ) : (
                <p className="rounded-lg border border-dashed p-4 text-sm leading-6 text-muted-foreground">
                  Persistent platform audit history is not connected yet. This page will display saved operator events when the backend audit endpoint is added.
                </p>
              )}
            </div>
            <RequirementCard
              title="Persistent platform audit API"
              status="Backend endpoint needed"
              description="Expose read-only platform audit logs with filters by organization, actor, action, date range, and risk level. Store support-session start and return events."
            />
          </div>
        </SectionShell>
      ) : null}

      {activeSection === "usage" ? (
        <SectionShell
          title="Usage, plans, and readiness"
          description="Use organization counts and user totals today, then connect submissions, storage, billing plan, and quota telemetry when the usage service is available."
        >
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {[
              ["Organizations", organizations.length.toLocaleString(), "Total tenants on the platform"],
              ["Active tenants", activeOrganizations.toLocaleString(), "Organizations currently allowed to sign in"],
              ["Total users", totalUsers.toLocaleString(), "Tenant users reported by the organization API"],
              ["Suspended tenants", suspendedOrganizations.toLocaleString(), "Tenants blocked from normal access"]
            ].map(([label, value, detail]) => (
              <article className="rounded-lg border bg-panel p-4 shadow-line" key={label}>
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="mt-3 text-2xl font-semibold">{value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
              </article>
            ))}
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <RequirementCard
              title="Plan and quota controls"
              status="Usage service needed"
              description="Add plan fields, storage usage, submission volume, API usage, form limits, and billing status before enabling paid-plan enforcement."
            />
            <RequirementCard
              title="Tenant health scoring"
              status="Telemetry needed"
              description="Score each organization by failed logins, sync failures, stale owners, inactive users, import errors, and unresolved workflow queues."
            />
          </div>
        </SectionShell>
      ) : null}

      {activeSection === "settings" ? (
        <SectionShell
          title="Platform settings"
          description="Review production configuration that affects all tenants. Global settings should be changed through a dedicated audited backend endpoint before editable controls are enabled."
        >
          <div className="grid gap-3 lg:grid-cols-2">
            {[
              ["API base URL", configuredApiUrl, Database],
              ["Frontend origin", currentOrigin, Search],
              ["Token policy", "JWT secret required in Railway; access tokens expire by backend setting.", KeyRound],
              ["CORS policy", "Specific origins only. Do not use wildcard origins with credentials.", ShieldCheck]
            ].map(([title, detail, Icon]) => (
              <article className="rounded-lg border bg-panel p-4 shadow-line" key={title as string}>
                <div className="flex items-center gap-2">
                  <Icon aria-hidden="true" className="text-primary" size={17} />
                  <h3 className="text-sm font-semibold">{title as string}</h3>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{detail as string}</p>
              </article>
            ))}
          </div>
          <div className="mt-4 rounded-lg border border-warning/25 bg-warning/10 p-4">
            <div className="flex gap-2">
              <AlertTriangle aria-hidden="true" className="mt-0.5 text-warning" size={17} />
              <p className="text-sm leading-6 text-muted-foreground">
                Editable global settings are intentionally locked until the backend provides audited configuration storage. This prevents accidental production-wide changes from the browser only.
              </p>
            </div>
          </div>
        </SectionShell>
      ) : null}

      {activeSection === "onboarding" ? (
        <section className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
          <SectionShell title="New organization setup" description="Use this form to create the tenant and its first owner. The owner completes workspace setup after sign-in.">
            {organizationForm}
          </SectionShell>
          <SectionShell title="Setup checklist" description="Follow these steps so a new tenant starts cleanly and does not inherit demo data or platform-only configuration.">
            <div className="grid gap-3 md:grid-cols-2">
              {[
                ["Create tenant", "Create organization, slug, owner email, and temporary password from verified onboarding information."],
                ["Owner signs in", "Ask the organization owner to sign in, change password, and confirm the organization name."],
                ["Configure team", "Create departments, regions, roles, field officers, and reviewer accounts inside the tenant."],
                ["Import starter data", "Use tenant data tools to import officers, beneficiaries, geography, indicators, and organization units."],
                ["Build forms", "Create or import collection forms, validate them, and publish only when ready for field use."],
                ["Verify empty state", "Confirm dashboard, submissions, reports, and work queues show no demo data until real records are entered."]
              ].map(([title, detail], index) => (
                <article className="rounded-lg border bg-panel p-4 shadow-line" key={title}>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                      {index + 1}
                    </span>
                    <h3 className="text-sm font-semibold">{title}</h3>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{detail}</p>
                </article>
              ))}
            </div>
          </SectionShell>
        </section>
      ) : null}

      <div className="rounded-lg border bg-panel p-4 shadow-line">
        <div className="flex items-start gap-3">
          <SlidersHorizontal aria-hidden="true" className="mt-0.5 text-primary" size={18} />
          <div>
            <h2 className="text-sm font-semibold">Production boundary</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Organization creation, status changes, and support sessions are live platform actions. Platform users, persistent audit, usage plans, and editable settings are exposed as operator work areas with clear backend requirements so the UI does not pretend to save data that has no API yet.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
