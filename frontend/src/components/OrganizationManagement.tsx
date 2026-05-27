"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Building2, Plus, UserPlus } from "lucide-react";
import { useState } from "react";

import { DataTable, type TableColumn } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { createOrganization, createUser, listRoles, listUsers, type RoleRead, type UserRead } from "@/lib/api";
import { useWorkspaceStore } from "@/stores/workspace";

type OrganizationManagementProps = {
  token: string | null;
};

export function OrganizationManagement({ token }: OrganizationManagementProps) {
  const [organizationName, setOrganizationName] = useState("");
  const [organizationSlug, setOrganizationSlug] = useState("");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [roleName, setRoleName] = useState("collector");
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
        role_name: roleName
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
        <Badge tone="accent">{roles.length} roles available</Badge>
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
                {roles.map((role) => (
                  <option key={role.id} value={role.name}>
                    {role.name}
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
    </section>
  );
}
