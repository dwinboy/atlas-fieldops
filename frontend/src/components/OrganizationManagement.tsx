"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Building2, Plus, UserPlus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/Button";
import { createOrganization, createUser, listRoles, listUsers, type RoleRead } from "@/lib/api";

type OrganizationManagementProps = {
  token: string | null;
};

export function OrganizationManagement({ token }: OrganizationManagementProps) {
  const [organizationName, setOrganizationName] = useState("");
  const [organizationSlug, setOrganizationSlug] = useState("");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [roleName, setRoleName] = useState("collector");

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

  return (
    <section aria-labelledby="organization-title" className="space-y-6">
      <div>
        <h1 id="organization-title" className="text-2xl font-semibold">
          Organization management
        </h1>
        <p className="mt-1 text-sm text-slate-600">Provision tenants, invite users, and inspect role coverage.</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <form
          className="rounded border border-slate-200 bg-white p-5"
          onSubmit={(event) => {
            event.preventDefault();
            organizationMutation.mutate({ name: organizationName, slug: organizationSlug });
          }}
        >
          <div className="mb-4 flex items-center gap-2">
            <Building2 aria-hidden="true" size={18} />
            <h2 className="text-base font-semibold">Create organization</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">
              Name
              <input
                className="mt-2 h-10 w-full rounded border border-slate-300 px-3"
                value={organizationName}
                onChange={(event) => setOrganizationName(event.target.value)}
                required
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Slug
              <input
                className="mt-2 h-10 w-full rounded border border-slate-300 px-3"
                value={organizationSlug}
                onChange={(event) => setOrganizationSlug(event.target.value)}
                pattern="[a-z0-9-]+"
                required
              />
            </label>
          </div>
          {organizationMutation.isError ? (
            <p className="mt-3 text-sm text-red-700" role="alert">
              Organization could not be created.
            </p>
          ) : null}
          <Button
            className="mt-5"
            disabled={organizationMutation.isPending}
            icon={<Plus aria-hidden="true" size={18} />}
            type="submit"
            variant="primary"
          >
            Create
          </Button>
        </form>

        <form
          className="rounded border border-slate-200 bg-white p-5"
          onSubmit={(event) => {
            event.preventDefault();
            userMutation.mutate();
          }}
        >
          <div className="mb-4 flex items-center gap-2">
            <UserPlus aria-hidden="true" size={18} />
            <h2 className="text-base font-semibold">Invite user</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">
              Full name
              <input
                className="mt-2 h-10 w-full rounded border border-slate-300 px-3"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                required
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Email
              <input
                className="mt-2 h-10 w-full rounded border border-slate-300 px-3"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>
            <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
              Role
              <select
                className="mt-2 h-10 w-full rounded border border-slate-300 px-3"
                value={roleName}
                onChange={(event) => setRoleName(event.target.value)}
              >
                {roles.map((role) => (
                  <option key={role.id} value={role.name}>
                    {role.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <Button
            className="mt-5"
            disabled={!token || userMutation.isPending}
            icon={<UserPlus aria-hidden="true" size={18} />}
            type="submit"
            variant="primary"
          >
            Invite
          </Button>
        </form>
      </div>

      <section className="rounded border border-slate-200 bg-white" aria-labelledby="users-title">
        <div className="border-b border-slate-200 p-5">
          <h2 id="users-title" className="text-base font-semibold">
            Users
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(usersQuery.data ?? []).map((user) => (
                <tr key={user.id}>
                  <td className="px-5 py-3">{user.full_name}</td>
                  <td className="px-5 py-3">{user.email}</td>
                  <td className="px-5 py-3">{user.is_active ? "Active" : "Inactive"}</td>
                </tr>
              ))}
              {!usersQuery.data?.length ? (
                <tr>
                  <td className="px-5 py-6 text-slate-500" colSpan={3}>
                    No users loaded yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}

