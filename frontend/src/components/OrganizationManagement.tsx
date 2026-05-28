"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Building2, KeyRound, Plus, ShieldCheck, UserPlus } from "lucide-react";
import { useState } from "react";

import { DataTable, type TableColumn } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import {
  createOrganization,
  createUser,
  getAccessCatalog,
  listOrganizationUnits,
  listRoles,
  listUsers,
  type AccessCatalog,
  type RoleRead,
  type UserRead
} from "@/lib/api";
import { useWorkspaceStore } from "@/stores/workspace";

type OrganizationManagementProps = {
  token: string | null;
};

export function OrganizationManagement({ token }: OrganizationManagementProps) {
  const [organizationName, setOrganizationName] = useState("");
  const [organizationSlug, setOrganizationSlug] = useState("");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [roleName, setRoleName] = useState("field_officer");
  const [scopeType, setScopeType] = useState("district");
  const pushToast = useWorkspaceStore((state) => state.pushToast);

  const usersQuery = useQuery({
    queryKey: ["users", token],
    queryFn: () => listUsers(token ?? ""),
    enabled: Boolean(token)
  });

  const rolesQuery = useQuery({
    queryKey: ["roles", token],
    queryFn: () => listRoles(token ?? ""),
    enabled: Boolean(token)
  });

  const catalogQuery = useQuery({
    queryKey: ["access-catalog", token],
    queryFn: () => getAccessCatalog(token ?? ""),
    enabled: Boolean(token)
  });

  const unitsQuery = useQuery({
    queryKey: ["organization-units", token],
    queryFn: () => listOrganizationUnits(token ?? ""),
    enabled: Boolean(token)
  });

  const organizationMutation = useMutation({
    mutationFn: createOrganization,
    onSuccess: () => {
      setOrganizationName("");
      setOrganizationSlug("");
      pushToast({ title: "Organization created", description: "Default roles were provisioned", tone: "success" });
    }
  });

  const userMutation = useMutation({
    mutationFn: () =>
      createUser(token ?? "", {
        email,
        full_name: fullName,
        password: "ChangeMe12345!",
        role_name: roleName,
        scope_type: scopeType
      }),
    onSuccess: async () => {
      setEmail("");
      setFullName("");
      pushToast({ title: "User invited", description: `${fullName || email} was added to this organization`, tone: "success" });
      await usersQuery.refetch();
    }
  });

  const roles: RoleRead[] =
    rolesQuery.data ??
    ["owner", "admin", "manager", "collector"].map((name) => ({
      id: name,
      organization_id: "local",
      name,
      permissions: []
    }));
  const catalog: AccessCatalog | undefined = catalogQuery.data;
  const catalogRoles = catalog?.roles ?? [];
  const selectedRole = catalogRoles.find((role) => role.name === roleName) ?? catalogRoles[0];

  const userColumns: TableColumn<UserRead>[] = [
    {
      key: "name",
      header: "User",
      value: (user) => `${user.full_name} ${user.id}`,
      render: (user) => (
        <div>
          <p className="font-medium">{user.full_name}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{user.id.slice(0, 8)}</p>
        </div>
      )
    },
    { key: "email", header: "Email", value: (user) => user.email, render: (user) => user.email },
    {
      key: "status",
      header: "Status",
      value: (user) => (user.is_active ? "active" : "inactive"),
      render: (user) => <Badge tone={user.is_active ? "success" : "neutral"}>{user.is_active ? "Active" : "Inactive"}</Badge>
    }
  ];

  return (
    <section aria-labelledby="organization-title" className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Organization</p>
          <h1 id="organization-title" className="mt-2 text-2xl font-semibold tracking-tight">
            Organization management
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            Create organizations, invite teammates, and choose what each person can access.
          </p>
        </div>
        <Badge tone="accent">{catalogRoles.length || roles.length} enterprise roles available</Badge>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <section className="surface-premium rounded-2xl p-4">
          <div className="flex items-center gap-2">
            <ShieldCheck aria-hidden="true" size={18} />
            <h2 className="text-sm font-semibold">Enterprise access model</h2>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            {[
              ["Roles", `${catalogRoles.length || roles.length}`, "Default and custom role profiles"],
              ["Permissions", `${catalog?.permissions.length ?? 0}`, "Granular dot-style capabilities"],
              ["Scopes", `${catalog?.scope_types.length ?? 0}`, "Country, region, district, project, own"],
              ["Units", `${unitsQuery.data?.length ?? 0}`, "Organization hierarchy nodes"]
            ].map(([label, value, text]) => (
              <div className="rounded-xl border bg-background/80 p-3" key={label}>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-2 text-2xl font-semibold">{value}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
        </section>
        <aside className="surface-premium rounded-2xl p-4">
          <div className="flex items-center gap-2">
            <KeyRound aria-hidden="true" size={18} />
            <h2 className="text-sm font-semibold">Selected role policy</h2>
          </div>
          <p className="mt-3 text-sm font-medium">{selectedRole?.label ?? roleName}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{selectedRole?.description ?? "Choose a role to preview its permissions and scope."}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge tone="accent">{selectedRole?.scope_type ?? scopeType} scope</Badge>
            {(selectedRole?.workflow_actions ?? []).slice(0, 3).map((action) => (
              <Badge key={action} tone="neutral">{action.replaceAll("_", " ")}</Badge>
            ))}
          </div>
        </aside>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <form
          className="rounded-lg border bg-panel p-4"
          onSubmit={(event) => {
            event.preventDefault();
            organizationMutation.mutate({ name: organizationName, slug: organizationSlug });
          }}
        >
          <div className="mb-4 flex items-center gap-2">
            <Building2 aria-hidden="true" size={18} />
            <h2 className="text-sm font-semibold">Create organization</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium">
              Name
              <Input
                className="mt-2"
                value={organizationName}
                onChange={(event) => setOrganizationName(event.target.value)}
                required
              />
            </label>
            <label className="block text-sm font-medium">
              Slug
              <Input
                className="mt-2"
                value={organizationSlug}
                onChange={(event) => setOrganizationSlug(event.target.value)}
                pattern="[a-z0-9-]+"
                required
              />
            </label>
          </div>
          {organizationMutation.isError ? (
            <p className="mt-3 text-sm text-danger" role="alert">
              Organization could not be created.
            </p>
          ) : null}
          <Button
            className="mt-5"
            disabled={organizationMutation.isPending}
            type="submit"
            variant="primary"
          >
            <Plus aria-hidden="true" />
            Create
          </Button>
        </form>

        <form
          className="rounded-lg border bg-panel p-4"
          onSubmit={(event) => {
            event.preventDefault();
            userMutation.mutate();
          }}
        >
          <div className="mb-4 flex items-center gap-2">
            <UserPlus aria-hidden="true" size={18} />
            <h2 className="text-sm font-semibold">Invite user</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium">
              Full name
              <Input
                className="mt-2"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                required
              />
            </label>
            <label className="block text-sm font-medium">
              Email
              <Input
                className="mt-2"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>
            <label className="block text-sm font-medium sm:col-span-2">
              Role
              <Select
                className="mt-2"
                value={roleName}
                onChange={(event) => setRoleName(event.target.value)}
              >
                {(catalogRoles.length ? catalogRoles : roles).map((role) => (
                  <option key={"id" in role ? role.id : role.name} value={role.name}>
                    {"label" in role && role.label ? role.label : role.name}
                  </option>
                ))}
              </Select>
            </label>
            <label className="block text-sm font-medium sm:col-span-2">
              Access scope
              <Select
                className="mt-2"
                value={scopeType}
                onChange={(event) => setScopeType(event.target.value)}
              >
                {(catalog?.scope_types ?? ["organization", "country", "region", "district", "project", "own"]).map((scope) => (
                  <option key={scope} value={scope}>
                    {scope.replaceAll("_", " ")}
                  </option>
                ))}
              </Select>
            </label>
          </div>
          <Button
            className="mt-5"
            disabled={!token || userMutation.isPending}
            type="submit"
            variant="primary"
          >
            <UserPlus aria-hidden="true" />
            Invite
          </Button>
        </form>
      </div>

      <DataTable columns={userColumns} emptyLabel="No users loaded yet" rows={usersQuery.data ?? []} searchLabel="Search users" title="Users" />

      <section className="surface-premium rounded-2xl p-4">
        <h2 className="text-sm font-semibold">Custom role builder foundation</h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Organizations can combine permissions, scope type, workflow approvals, project access, and geography assignments without hardcoded menu logic.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {(selectedRole?.permissions ?? roles[0]?.permissions ?? []).slice(0, 12).map((permission) => (
            <div className="rounded-xl border bg-background/80 px-3 py-2 text-sm" key={permission}>
              {permission}
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}
