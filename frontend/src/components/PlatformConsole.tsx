"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Activity,
  Building2,
  CheckCircle2,
  Database,
  KeyRound,
  LifeBuoy,
  LockKeyhole,
  Plus,
  RadioTower,
  Search,
  Settings,
  ShieldCheck,
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

const operatorTools = [
  {
    title: "Platform users",
    status: "Backend endpoint needed",
    description: "Manage platform super admins and support operators separately from tenant users."
  },
  {
    title: "Audit logs",
    status: "Telemetry endpoint needed",
    description: "Track organization creation, support sessions, status changes, password resets, imports, and exports."
  },
  {
    title: "Usage and plans",
    status: "Usage service needed",
    description: "Review users, submissions, forms, storage, plan limits, and billing readiness for each organization."
  },
  {
    title: "Platform settings",
    status: "Configuration endpoint needed",
    description: "Control global security policy, upload limits, allowed domains, default roles, and provider status."
  }
];

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function PlatformConsole({ onTokenChanged, principal, token }: PlatformConsoleProps) {
  const [organizationName, setOrganizationName] = useState("");
  const [organizationSlug, setOrganizationSlug] = useState("");
  const [ownerFullName, setOwnerFullName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("ChangeMe12345!");
  const [platformResult, setPlatformResult] = useState("");
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
      setPlatformResult(`${organization.name} was created. Login slug: ${organization.slug}. Owner: ${organization.owner_email ?? ownerEmail}.`);
      setOrganizationName("");
      setOrganizationSlug("");
      setOwnerFullName("");
      setOwnerEmail("");
      setOwnerPassword("ChangeMe12345!");
      pushToast({ title: "Organization created", description: `${organization.name} is ready for owner sign-in.`, tone: "success" });
      await organizationsQuery.refetch();
    },
    onError: () => {
      setPlatformResult("Organization was not created. Confirm the slug is unique, owner details are valid, and your platform super admin session is active.");
      pushToast({ title: "Organization was not created", description: "Check slug, owner details, and platform permissions.", tone: "danger" });
    }
  });

  const statusMutation = useMutation({
    mutationFn: (payload: { organization: PlatformOrganizationRead; active: boolean }) =>
      updatePlatformOrganizationStatus(token ?? "", payload.organization.id, payload.active),
    onSuccess: async (organization) => {
      setPlatformResult(`${organization.name} is now ${organization.is_active ? "active" : "inactive"}.`);
      pushToast({
        title: organization.is_active ? "Organization activated" : "Organization deactivated",
        description: `${organization.name} status was updated.`,
        tone: organization.is_active ? "success" : "warning"
      });
      await organizationsQuery.refetch();
    },
    onError: () => {
      setPlatformResult("Organization status could not be changed. Confirm your platform session and try again.");
      pushToast({ title: "Status unchanged", description: "The platform action failed.", tone: "danger" });
    }
  });

  const supportMutation = useMutation({
    mutationFn: (organization: PlatformOrganizationRead) => createOrganizationSupportSession(token ?? "", organization.id),
    onSuccess: (response, organization) => {
      setPlatformResult(`Support session opened for ${organization.name}. You are now viewing tenant data as platform support.`);
      pushToast({ title: "Support session opened", description: `Now viewing ${organization.name}`, tone: "success" });
      onTokenChanged?.(response.access_token);
    },
    onError: () => {
      setPlatformResult("Support session could not be opened. Confirm the tenant exists and your super admin session is active.");
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
        render: (organization) => organization.owner_email ?? "No owner assigned"
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
            <Button
              disabled={supportMutation.isPending}
              onClick={() => supportMutation.mutate(organization)}
              size="sm"
              type="button"
              variant="secondary"
            >
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
              Manage Atlas FieldOps as the platform operator: create organizations, control tenant status, open support sessions, and monitor production readiness without becoming a tenant user.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone="accent">{principal?.email ?? "Platform admin"}</Badge>
            <Badge tone="success">Operator account</Badge>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {[
          ["Organizations", organizations.length.toLocaleString(), Building2, "All tenant workspaces"],
          ["Active", activeOrganizations.toLocaleString(), CheckCircle2, "Can sign in"],
          ["Suspended", suspendedOrganizations.toLocaleString(), LockKeyhole, "Temporarily disabled"],
          ["Tenant users", totalUsers.toLocaleString(), UsersRound, "Across organizations"],
          ["Needs attention", setupAttentionCount.toLocaleString(), Activity, "Owner/status/health"]
        ].map(([label, value, Icon, detail]) => (
          <article className="rounded-lg border bg-panel p-4 shadow-line" key={label as string}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">{label as string}</p>
              <Icon aria-hidden="true" className="text-muted-foreground" size={17} />
            </div>
            <p className="mt-3 text-2xl font-semibold tracking-tight">{value as string}</p>
            <p className="mt-1 text-xs text-muted-foreground">{detail as string}</p>
          </article>
        ))}
      </div>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-5">
          {platformResult ? (
            <section className="rounded-2xl border border-primary/25 bg-primary/10 p-4" aria-live="polite">
              <p className="text-sm font-semibold">Platform result</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{platformResult}</p>
            </section>
          ) : null}

          <DataTable
            columns={columns}
            emptyLabel={organizationsQuery.isFetching ? "Loading organizations..." : "No organizations have been created yet"}
            rows={organizations}
            searchLabel="Search organizations, slugs, owners, or status"
            title={organizationsQuery.isFetching ? "Organizations syncing" : "Organizations"}
          />
        </div>

        <aside className="space-y-5">
          <form
            className="rounded-lg border bg-panel p-4 shadow-line"
            onSubmit={(event) => {
              event.preventDefault();
              organizationMutation.mutate();
            }}
          >
            <div className="mb-4 flex items-center gap-2">
              <Plus aria-hidden="true" size={18} />
              <h2 className="text-sm font-semibold">Create organization</h2>
            </div>
            <label className="block text-sm font-medium">
              Organization name
              <Input
                className="mt-2"
                value={organizationName}
                onChange={(event) => {
                  setOrganizationName(event.target.value);
                  if (!organizationSlug) {
                    setOrganizationSlug(slugify(event.target.value));
                  }
                }}
                required
              />
            </label>
            <label className="mt-4 block text-sm font-medium">
              Login slug
              <Input
                className="mt-2"
                pattern="[a-z0-9-]+"
                value={organizationSlug}
                onChange={(event) => setOrganizationSlug(slugify(event.target.value))}
                required
              />
              <span className="mt-1 block text-xs font-normal text-muted-foreground">Users enter this slug on the sign-in page.</span>
            </label>
            <label className="mt-4 block text-sm font-medium">
              Owner full name
              <Input className="mt-2" value={ownerFullName} onChange={(event) => setOwnerFullName(event.target.value)} required />
            </label>
            <label className="mt-4 block text-sm font-medium">
              Owner email
              <Input className="mt-2" type="email" value={ownerEmail} onChange={(event) => setOwnerEmail(event.target.value)} required />
            </label>
            <label className="mt-4 block text-sm font-medium">
              Temporary password
              <Input className="mt-2" minLength={12} value={ownerPassword} onChange={(event) => setOwnerPassword(event.target.value)} required />
            </label>
            <Button className="mt-5 w-full" disabled={organizationMutation.isPending} type="submit" variant="primary">
              <Building2 aria-hidden="true" />
              {organizationMutation.isPending ? "Creating" : "Create tenant"}
            </Button>
          </form>

          <section className="rounded-lg border bg-panel p-4 shadow-line">
            <div className="flex items-center gap-2">
              <RadioTower aria-hidden="true" size={18} />
              <h2 className="text-sm font-semibold">System health</h2>
            </div>
            <div className="mt-4 space-y-3">
              {[
                ["API", healthQuery.data?.status === "ok" ? "Online" : healthQuery.isError ? "Check required" : "Checking"],
                ["Database", healthQuery.data?.status === "ok" ? "Reachable" : "Unknown"],
                ["Migrations", "Verify in Railway logs"],
                ["Frontend domain", "Vercel configured"]
              ].map(([label, value]) => (
                <div className="flex items-center justify-between rounded-md border bg-background p-3 text-sm" key={label}>
                  <span className="text-muted-foreground">{label}</span>
                  <Badge tone={value === "Online" || value === "Reachable" || value === "Vercel configured" ? "success" : "warning"}>{value}</Badge>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </section>

      <section className="rounded-lg border bg-panel p-4 shadow-line">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Settings aria-hidden="true" size={18} />
              <h2 className="text-sm font-semibold">Platform management tools</h2>
            </div>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              These tools belong to the platform account, not tenant workspaces. They are shown separately so operators understand what still needs dedicated backend telemetry or configuration endpoints.
            </p>
          </div>
          <Badge tone="neutral">Operator roadmap</Badge>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {operatorTools.map((tool) => (
            <article className="rounded-md border bg-background p-4" key={tool.title}>
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-sm font-semibold">{tool.title}</h3>
                <Badge tone="warning">{tool.status}</Badge>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{tool.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-lg border bg-panel p-4 shadow-line">
        <div className="flex items-center gap-2">
          <ShieldCheck aria-hidden="true" size={18} />
          <h2 className="text-sm font-semibold">How support mode should be used</h2>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {[
            ["1", "Open support only for a real issue", "Use support mode to inspect tenant configuration, forms, users, submissions, imports, or permissions."],
            ["2", "Keep operator identity visible", "The header will show Support mode so the operator is not mistaken for a tenant user."],
            ["3", "Return to platform console", "Exit support mode after troubleshooting so organization work and platform work stay separate."]
          ].map(([step, title, text]) => (
            <div className="rounded-md border bg-background p-3" key={step}>
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{step}</span>
                <p className="text-sm font-medium">{title}</p>
              </div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border bg-panel p-4 shadow-line">
        <div className="flex items-center gap-2">
          <Search aria-hidden="true" size={18} />
          <h2 className="text-sm font-semibold">Operator checklist</h2>
        </div>
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {[
            "Confirm every organization has an owner email.",
            "Suspend organizations only when access must be blocked.",
            "Use support sessions instead of asking tenants for passwords.",
            "Verify API health before investigating tenant reports.",
            "Track missing platform telemetry as backend work, not manual memory.",
            "Document any support action in the tenant issue record."
          ].map((item) => (
            <div className="flex gap-2 rounded-md border bg-background p-3 text-sm" key={item}>
              <CheckCircle2 aria-hidden="true" className="mt-0.5 shrink-0 text-success" size={15} />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border bg-panel p-4 shadow-line">
        <div className="flex items-center gap-2">
          <KeyRound aria-hidden="true" size={18} />
          <h2 className="text-sm font-semibold">Security boundary</h2>
        </div>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Platform operators should manage tenants from this console. Tenant admins should manage only their own organization from Team & access. Support mode is the controlled bridge between those worlds.
        </p>
      </section>
    </section>
  );
}
