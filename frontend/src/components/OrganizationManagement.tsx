"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Building2, CheckCircle2, KeyRound, LockKeyhole, Plus, ShieldCheck, UserPlus } from "lucide-react";
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
  resetUserPassword,
  updateUser,
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
  const [ownerFullName, setOwnerFullName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("ChangeMe12345!");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [roleName, setRoleName] = useState("field_officer");
  const [scopeType, setScopeType] = useState("district");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [editRoleName, setEditRoleName] = useState("me_manager");
  const [editScopeType, setEditScopeType] = useState("project");
  const [editGeographyId, setEditGeographyId] = useState("");
  const [editProjectId, setEditProjectId] = useState("");
  const [editUnitId, setEditUnitId] = useState("");
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
    mutationFn: () =>
      createOrganization(token ?? "", {
        name: organizationName,
        slug: organizationSlug,
        owner_email: ownerEmail,
        owner_full_name: ownerFullName,
        owner_password: ownerPassword
      }),
    onSuccess: (organization) => {
      setOrganizationName("");
      setOrganizationSlug("");
      setOwnerFullName("");
      setOwnerEmail("");
      setOwnerPassword("ChangeMe12345!");
      pushToast({
        title: "Organization created",
        description: `Login slug: ${organization.slug}${organization.owner_email ? ` · owner: ${organization.owner_email}` : ""}`,
        tone: "success"
      });
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

  const userUpdateMutation = useMutation({
    mutationFn: () =>
      updateUser(token ?? "", selectedUserId, {
        role_name: editRoleName,
        scope_type: editScopeType,
        geography_id: editGeographyId || null,
        project_id: editProjectId || null,
        organization_unit_id: editUnitId || null
      }),
    onSuccess: async (user) => {
      pushToast({ title: "Access updated", description: `${user.full_name}'s role and scope were updated`, tone: "success" });
      await usersQuery.refetch();
    }
  });

  const statusMutation = useMutation({
    mutationFn: (payload: { userId: string; active: boolean; name: string }) =>
      updateUser(token ?? "", payload.userId, { is_active: payload.active }),
    onSuccess: async (user) => {
      pushToast({
        title: user.is_active ? "User activated" : "User deactivated",
        description: `${user.full_name}'s account status was updated`,
        tone: user.is_active ? "success" : "warning"
      });
      await usersQuery.refetch();
    }
  });

  const resetMutation = useMutation({
    mutationFn: (user: UserRead) => resetUserPassword(token ?? "", user.id),
    onSuccess: (reset) => {
      pushToast({
        title: "Password reset",
        description: `Temporary password: ${reset.temporary_password}`,
        tone: "warning"
      });
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
  const selectedEditRole = catalogRoles.find((role) => role.name === editRoleName) ?? catalogRoles[0];
  const scopeOptions = catalog?.scope_types ?? ["organization", "country", "region", "district", "project", "own"];
  const selectableRoles = catalogRoles.length ? catalogRoles : roles;

  function selectUser(user: UserRead): void {
    setSelectedUserId(user.id);
    setEditRoleName(user.role_name ?? "field_officer");
    setEditScopeType(user.scope_type ?? "project");
    setEditGeographyId(user.geography_id ?? "");
    setEditProjectId(user.project_id ?? "");
    setEditUnitId(user.organization_unit_id ?? "");
  }

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
      key: "role",
      header: "Role",
      value: (user) => user.role_name ?? "",
      render: (user) => <Badge tone="accent">{(user.role_name ?? "unassigned").replaceAll("_", " ")}</Badge>
    },
    {
      key: "scope",
      header: "Scope",
      value: (user) => user.scope_type ?? "",
      render: (user) => (
        <div>
          <p className="text-sm">{(user.scope_type ?? "not scoped").replaceAll("_", " ")}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{user.geography_id || user.project_id || user.organization_unit_id || "all allowed data"}</p>
        </div>
      )
    },
    {
      key: "status",
      header: "Status",
      value: (user) => (user.is_active ? "active" : "inactive"),
      render: (user) => <Badge tone={user.is_active ? "success" : "neutral"}>{user.is_active ? "Active" : "Inactive"}</Badge>
    },
    {
      key: "actions",
      header: "Actions",
      value: (user) => user.id,
      render: (user) => (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" type="button" variant="secondary" onClick={() => selectUser(user)}>
            Edit access
          </Button>
          <Button
            size="sm"
            type="button"
            variant="ghost"
            onClick={() => statusMutation.mutate({ userId: user.id, active: !user.is_active, name: user.full_name })}
          >
            {user.is_active ? "Deactivate" : "Activate"}
          </Button>
          <Button size="sm" type="button" variant="ghost" onClick={() => resetMutation.mutate(user)}>
            Reset password
          </Button>
        </div>
      )
    }
  ];

  return (
    <section aria-labelledby="organization-title" className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Admin</p>
          <h1 id="organization-title" className="mt-2 text-2xl font-semibold tracking-tight">
            Team and access
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            Invite people, choose their role, and control exactly which regions, projects, and workflows they can use.
          </p>
        </div>
        <Badge tone="accent">{catalogRoles.length || roles.length} enterprise roles available</Badge>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <section className="surface-premium rounded-2xl p-4">
          <div className="flex items-center gap-2">
            <ShieldCheck aria-hidden="true" size={18} />
            <h2 className="text-sm font-semibold">Access model</h2>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            {[
              ["Roles", `${catalogRoles.length || roles.length}`, "Job-based access profiles"],
              ["Permissions", `${catalog?.permissions.length ?? 0}`, "Actions allowed in the system"],
              ["Scopes", `${catalog?.scope_types.length ?? 0}`, "Country, region, district, project, own"],
              ["Units", `${unitsQuery.data?.length ?? 0}`, "Countries, regions, districts, and teams"]
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
            <h2 className="text-sm font-semibold">What this person can do</h2>
          </div>
          <p className="mt-3 text-sm font-medium">{selectedRole?.label ?? roleName}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {selectedRole?.description ?? "Choose a role to preview permissions, scope, and approval access before saving."}
          </p>
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
            organizationMutation.mutate();
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
              Login slug
              <Input
                className="mt-2"
                value={organizationSlug}
                onChange={(event) => setOrganizationSlug(event.target.value)}
                pattern="[a-z0-9-]+"
                placeholder="example-org"
                required
              />
              <span className="mt-1 block text-xs font-normal text-muted-foreground">
                Users must enter this exact slug when signing in.
              </span>
            </label>
            <label className="block text-sm font-medium">
              Owner full name
              <Input
                className="mt-2"
                value={ownerFullName}
                onChange={(event) => setOwnerFullName(event.target.value)}
                placeholder="Jane Program Admin"
                required
              />
            </label>
            <label className="block text-sm font-medium">
              Owner email
              <Input
                className="mt-2"
                type="email"
                value={ownerEmail}
                onChange={(event) => setOwnerEmail(event.target.value)}
                placeholder="admin@example.org"
                required
              />
            </label>
            <label className="block text-sm font-medium sm:col-span-2">
              Owner temporary password
              <Input
                className="mt-2"
                type="text"
                value={ownerPassword}
                onChange={(event) => setOwnerPassword(event.target.value)}
                minLength={12}
                required
              />
              <span className="mt-1 block text-xs font-normal text-muted-foreground">
                The owner can log in immediately with the slug, email, and this temporary password.
              </span>
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
            <h2 className="text-sm font-semibold">Invite teammate</h2>
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
              <span className="mt-1 block text-xs font-normal text-muted-foreground">
                Pick the closest job function. You can narrow access with the scope below.
              </span>
              <Select
                className="mt-2"
                value={roleName}
                onChange={(event) => setRoleName(event.target.value)}
              >
                {selectableRoles.map((role) => (
                  <option key={"id" in role ? role.id : role.name} value={role.name}>
                    {"label" in role && role.label ? role.label : role.name}
                  </option>
                ))}
              </Select>
            </label>
            <label className="block text-sm font-medium sm:col-span-2">
              Access scope
              <span className="mt-1 block text-xs font-normal text-muted-foreground">
                This controls what data they see. District and project scopes are safest for field operations.
              </span>
              <Select
                className="mt-2"
                value={scopeType}
                onChange={(event) => setScopeType(event.target.value)}
              >
                {scopeOptions.map((scope) => (
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
          <div className="mt-4 rounded-xl border bg-muted/35 p-3 text-xs leading-5 text-muted-foreground">
            Temporary local password: <span className="font-mono text-foreground">ChangeMe12345!</span>. Require users to reset it before production use.
          </div>
        </form>
      </div>

      <DataTable columns={userColumns} emptyLabel="No users loaded yet" rows={usersQuery.data ?? []} searchLabel="Search users" title="Users" />

      <section className="surface-premium rounded-2xl p-4">
        <div className="flex items-center gap-2">
          <ShieldCheck aria-hidden="true" size={18} />
          <h2 className="text-sm font-semibold">Edit existing user access</h2>
        </div>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Select a user, then change their role and operational scope. Use project, region, or district scopes for daily field operations.
        </p>
        <form
          className="mt-4 grid gap-4 lg:grid-cols-3"
          onSubmit={(event) => {
            event.preventDefault();
            userUpdateMutation.mutate();
          }}
        >
          <label className="block text-sm font-medium">
            User
            <Select
              className="mt-2"
              value={selectedUserId}
              onChange={(event) => {
                const user = usersQuery.data?.find((item) => item.id === event.target.value);
                if (user) selectUser(user);
              }}
              required
            >
              <option value="">Choose a user</option>
              {(usersQuery.data ?? []).map((user) => (
                <option key={user.id} value={user.id}>
                  {user.full_name} - {user.email}
                </option>
              ))}
            </Select>
          </label>
          <label className="block text-sm font-medium">
            Role
            <Select className="mt-2" value={editRoleName} onChange={(event) => setEditRoleName(event.target.value)}>
              {selectableRoles.map((role) => (
                <option key={"id" in role ? role.id : role.name} value={role.name}>
                  {"label" in role && role.label ? role.label : role.name}
                </option>
              ))}
            </Select>
          </label>
          <label className="block text-sm font-medium">
            Scope
            <Select className="mt-2" value={editScopeType} onChange={(event) => setEditScopeType(event.target.value)}>
              {scopeOptions.map((scope) => (
                <option key={scope} value={scope}>
                  {scope.replaceAll("_", " ")}
                </option>
              ))}
            </Select>
          </label>
          <label className="block text-sm font-medium">
            Geography code
            <Input className="mt-2" placeholder="region-default or district-default" value={editGeographyId} onChange={(event) => setEditGeographyId(event.target.value)} />
          </label>
          <label className="block text-sm font-medium">
            Project ID
            <Input className="mt-2" placeholder="Optional project id" value={editProjectId} onChange={(event) => setEditProjectId(event.target.value)} />
          </label>
          <label className="block text-sm font-medium">
            Organization unit
            <Select className="mt-2" value={editUnitId} onChange={(event) => setEditUnitId(event.target.value)}>
              <option value="">No unit selected</option>
              {(unitsQuery.data ?? []).map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name} - {unit.unit_type}
                </option>
              ))}
            </Select>
          </label>
          <div className="rounded-xl border bg-background/80 p-3 text-xs leading-5 text-muted-foreground lg:col-span-2">
            <span className="block font-medium text-foreground">{selectedEditRole?.label ?? editRoleName}</span>
            {selectedEditRole?.description ?? "Choose a role to preview what this user can do."}
          </div>
          <Button className="self-end" disabled={!selectedUserId || userUpdateMutation.isPending} type="submit" variant="primary">
            <ShieldCheck aria-hidden="true" />
            Save access
          </Button>
        </form>
      </section>

      <section className="surface-premium rounded-2xl p-4">
        <div className="flex items-center gap-2">
          <LockKeyhole aria-hidden="true" size={18} />
          <h2 className="text-sm font-semibold">Permission preview</h2>
        </div>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          A plain preview of the selected role. These capabilities drive menus, buttons, API access, approval workflows, and audit visibility.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {(selectedRole?.permissions ?? roles[0]?.permissions ?? []).slice(0, 12).map((permission) => (
            <div className="flex items-center gap-2 rounded-xl border bg-background/80 px-3 py-2 text-sm" key={permission}>
              <CheckCircle2 aria-hidden="true" className="text-success" size={15} />
              <span>{permission.replaceAll(".", " ").replaceAll("_", " ")}</span>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}
