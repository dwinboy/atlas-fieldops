"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Building2,
  CheckCircle2,
  KeyRound,
  LifeBuoy,
  LockKeyhole,
  Plus,
  ShieldCheck,
  UploadCloud,
  UserPlus,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { DataTable, type TableColumn } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HelpHint } from "@/components/ui/help-hint";
import { Input, Select } from "@/components/ui/input";
import {
  createOrganization,
  createOrganizationSupportSession,
  createUser,
  getAccessCatalog,
  importOrganizationUnits,
  importUsers,
  listPlatformOrganizations,
  listOrganizationUnits,
  listRoles,
  listUsers,
  resetUserPassword,
  routeData,
  returnToPlatformSession,
  updatePlatformOrganizationStatus,
  updateUser,
  type AccessCatalog,
  type CurrentPrincipal,
  type PlatformOrganizationRead,
  type RoleRead,
  type UserRead,
} from "@/lib/api";
import { useWorkspaceStore } from "@/stores/workspace";

type OrganizationManagementProps = {
  token: string | null;
  principal?: CurrentPrincipal;
  onTokenChanged?: (token: string) => void;
};

const previewUsers: UserRead[] = [
  {
    id: "preview-user-001",
    email: "amina.manager@example.org",
    full_name: "Amina Program Manager",
    is_active: true,
    role_name: "me_manager",
    scope_type: "project",
    project_id: "nutrition-project",
    login_slug: "atlas-demo",
  },
  {
    id: "preview-user-002",
    email: "joseph.field@example.org",
    full_name: "Joseph Field Officer",
    is_active: true,
    role_name: "field_officer",
    scope_type: "district",
    geography_id: "district-default",
    login_slug: "atlas-demo",
  },
  {
    id: "preview-user-003",
    email: "grace.reviewer@example.org",
    full_name: "Grace Data Reviewer",
    is_active: false,
    role_name: "data_reviewer",
    scope_type: "region",
    geography_id: "region-default",
    login_slug: "atlas-demo",
  },
];

const previewCatalog: AccessCatalog = {
  roles: [
    {
      name: "me_manager",
      label: "M&E Manager",
      description:
        "Can manage forms, review submissions, approve data, and prepare reports for assigned projects.",
      scope_type: "project",
      permissions: [
        "forms.create",
        "submissions.approve",
        "reports.export",
        "indicators.manage",
      ],
      workflow_actions: [
        "approve_submission",
        "request_correction",
        "export_report",
      ],
      menu_views: [
        "dashboard",
        "forms",
        "submissions",
        "analytics",
        "indicators",
      ],
    },
    {
      name: "field_officer",
      label: "Field Officer",
      description:
        "Can collect assigned forms, save offline submissions, and sync field evidence.",
      scope_type: "district",
      permissions: ["forms.collect", "submissions.create", "media.upload"],
      workflow_actions: ["collect_data", "sync_offline"],
      menu_views: ["dashboard", "forms", "connectivity", "help"],
    },
    {
      name: "data_reviewer",
      label: "Data Reviewer",
      description:
        "Can inspect imported data, resolve validation issues, and route corrections.",
      scope_type: "region",
      permissions: ["data.import", "data.clean", "submissions.review"],
      workflow_actions: ["review_data", "route_correction"],
      menu_views: ["dashboard", "data", "submissions", "governance"],
    },
  ],
  permissions: [
    { key: "forms.create", label: "Create forms", group: "Forms" },
    { key: "forms.collect", label: "Collect forms", group: "Forms" },
    {
      key: "submissions.approve",
      label: "Approve submissions",
      group: "Review",
    },
    { key: "data.import", label: "Import data", group: "Data" },
    { key: "reports.export", label: "Export reports", group: "Reports" },
  ],
  scope_types: [
    "organization",
    "country",
    "region",
    "district",
    "project",
    "own",
  ],
  workflow_actions: [
    "collect_data",
    "review_data",
    "approve_submission",
    "request_correction",
    "export_report",
  ],
};

export function OrganizationManagement({
  token,
  principal,
  onTokenChanged,
}: OrganizationManagementProps) {
  const [organizationName, setOrganizationName] = useState("");
  const [organizationSlug, setOrganizationSlug] = useState("");
  const [ownerFullName, setOwnerFullName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("ChangeMe12345!");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [roleName, setRoleName] = useState("");
  const [scopeType, setScopeType] = useState("district");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [editRoleName, setEditRoleName] = useState("me_manager");
  const [editScopeType, setEditScopeType] = useState("project");
  const [editGeographyId, setEditGeographyId] = useState("");
  const [editProjectId, setEditProjectId] = useState("");
  const [editUnitId, setEditUnitId] = useState("");
  const [lastInvite, setLastInvite] = useState<UserRead | null>(null);
  const [routeTitle, setRouteTitle] = useState("Review newly submitted data");
  const [routeDataType, setRouteDataType] = useState("submissions");
  const [routeTargetType, setRouteTargetType] = useState<
    "role" | "team" | "user"
  >("role");
  const [routeRoleName, setRouteRoleName] = useState("me_manager");
  const [routeTeamId, setRouteTeamId] = useState("");
  const [routeUserId, setRouteUserId] = useState("");
  const [routePriority, setRoutePriority] = useState<
    "low" | "normal" | "high" | "urgent"
  >("normal");
  const [routeInstructions, setRouteInstructions] = useState(
    "Review, comment, and approve or request corrections.",
  );
  const [localUsers, setLocalUsers] = useState<UserRead[]>(previewUsers);
  const [accessResult, setAccessResult] = useState("");
  const [routeResult, setRouteResult] = useState("");
  const [accountResult, setAccountResult] = useState("");
  const [bulkImportResult, setBulkImportResult] = useState("");
  const [adminGuideResult, setAdminGuideResult] = useState("");
  const [platformResult, setPlatformResult] = useState("");
  const usersFileInputRef = useRef<HTMLInputElement | null>(null);
  const unitsFileInputRef = useRef<HTMLInputElement | null>(null);
  const pushToast = useWorkspaceStore((state) => state.pushToast);
  const isPreview = token === "preview-token";
  const isSuperAdmin = principal?.roles.includes("super_admin") ?? false;
  const isPlatformOwnerConsole = isSuperAdmin && !principal?.support_mode;

  const usersQuery = useQuery({
    queryKey: ["users", token],
    queryFn: () => listUsers(token ?? ""),
    enabled: Boolean(token && !isPreview),
  });

  const rolesQuery = useQuery({
    queryKey: ["roles", token],
    queryFn: () => listRoles(token ?? ""),
    enabled: Boolean(token && !isPreview),
  });

  const catalogQuery = useQuery({
    queryKey: ["access-catalog", token],
    queryFn: () => getAccessCatalog(token ?? ""),
    enabled: Boolean(token && !isPreview),
  });

  const unitsQuery = useQuery({
    queryKey: ["organization-units", token],
    queryFn: () => listOrganizationUnits(token ?? ""),
    enabled: Boolean(token && !isPreview),
  });

  const platformOrganizationsQuery = useQuery({
    queryKey: ["platform-organizations", token],
    queryFn: () => listPlatformOrganizations(token ?? ""),
    enabled: Boolean(token && !isPreview && isPlatformOwnerConsole),
  });

  const accessLoading =
    usersQuery.isLoading ||
    rolesQuery.isLoading ||
    catalogQuery.isLoading ||
    unitsQuery.isLoading;
  const accessError =
    usersQuery.isError ||
    rolesQuery.isError ||
    catalogQuery.isError ||
    unitsQuery.isError;

  const organizationMutation = useMutation({
    mutationFn: () => {
      if (!isSuperAdmin) {
        throw new Error("Only platform super admins can create organizations.");
      }
      return createOrganization(token ?? "", {
        name: organizationName,
        slug: organizationSlug,
        owner_email: ownerEmail,
        owner_full_name: ownerFullName,
        owner_password: ownerPassword,
      });
    },
    onSuccess: (organization) => {
      setOrganizationName("");
      setOrganizationSlug("");
      setOwnerFullName("");
      setOwnerEmail("");
      setOwnerPassword("ChangeMe12345!");
      pushToast({
        title: "Organization created",
        description: `Login slug: ${organization.slug}${organization.owner_email ? ` · owner: ${organization.owner_email}` : ""}`,
        tone: "success",
      });
      void platformOrganizationsQuery.refetch();
    },
    onError: () =>
      pushToast({
        title: "Organization was not created",
        description:
          "Only super admins can create organizations, and slugs must be unique.",
        tone: "danger",
      }),
  });

  const supportSessionMutation = useMutation({
    mutationFn: (organization: PlatformOrganizationRead) =>
      createOrganizationSupportSession(token ?? "", organization.id),
    onSuccess: (response, organization) => {
      setPlatformResult(
        `Support session opened for ${organization.name}. You are still the platform super admin, but the workspace is now showing ${organization.slug} so you can inspect users, forms, submissions, imports, and configuration problems.`,
      );
      pushToast({
        title: "Support session opened",
        description: `Now viewing ${organization.name}`,
        tone: "success",
      });
      onTokenChanged?.(response.access_token);
    },
    onError: () => {
      setPlatformResult(
        "Support session could not be opened. Confirm the organization still exists and your account has the platform super admin role.",
      );
      pushToast({
        title: "Support session failed",
        description: "Could not open this organization for troubleshooting.",
        tone: "danger",
      });
    },
  });

  const organizationStatusMutation = useMutation({
    mutationFn: (payload: {
      organization: PlatformOrganizationRead;
      active: boolean;
    }) =>
      updatePlatformOrganizationStatus(
        token ?? "",
        payload.organization.id,
        payload.active,
      ),
    onSuccess: async (organization) => {
      setPlatformResult(
        `${organization.name} is now ${organization.is_active ? "active" : "inactive"}. ${organization.is_active ? "Its users can sign in again if their accounts are active." : "Its users cannot sign in until the organization is reactivated."}`,
      );
      pushToast({
        title: organization.is_active
          ? "Organization activated"
          : "Organization deactivated",
        description: `${organization.name} status was updated.`,
        tone: organization.is_active ? "success" : "warning",
      });
      await platformOrganizationsQuery.refetch();
    },
    onError: () => {
      setPlatformResult(
        "Organization status could not be changed. Try again after confirming your platform super admin session is active.",
      );
      pushToast({
        title: "Organization status unchanged",
        description: "The platform action failed.",
        tone: "danger",
      });
    },
  });

  const returnPlatformMutation = useMutation({
    mutationFn: () => returnToPlatformSession(token ?? ""),
    onSuccess: (response) => {
      setPlatformResult(
        "Returned to the platform console. You are no longer viewing a tenant support session.",
      );
      pushToast({
        title: "Returned to platform",
        description: "Platform console session restored.",
        tone: "success",
      });
      onTokenChanged?.(response.access_token);
    },
    onError: () => {
      setPlatformResult(
        "Could not return to the platform console. Sign out and log back in with the platform organization slug if this continues.",
      );
      pushToast({
        title: "Return failed",
        description: "Could not restore the platform console session.",
        tone: "danger",
      });
    },
  });

  const userMutation = useMutation({
    mutationFn: () =>
      createUser(token ?? "", {
        email,
        full_name: fullName,
        password: "ChangeMe12345!",
        role_name: roleName,
        scope_type: scopeType,
      }),
    onSuccess: async (user) => {
      setEmail("");
      setFullName("");
      setLastInvite(user);
      pushToast({
        title: "User invited",
        description: `${user.full_name} can sign in with slug ${user.login_slug ?? "this organization"} and the temporary password shown on this page.`,
        tone: "success",
      });
      await usersQuery.refetch();
    },
    onError: () =>
      pushToast({
        title: "User was not invited",
        description:
          "Check the email, role, and scope. You can only create roles allowed for your account.",
        tone: "danger",
      }),
  });

  const usersImportMutation = useMutation({
    mutationFn: (file: File) => importUsers(token ?? "", file),
    onSuccess: async (response) => {
      setBulkImportResult(
        `${response.created_count} user account${response.created_count === 1 ? "" : "s"} created. ${response.skipped_count} row${response.skipped_count === 1 ? "" : "s"} skipped.`,
      );
      pushToast({
        title: "Users imported",
        description: `${response.created_count} created, ${response.skipped_count} skipped`,
        tone: response.error_count ? "warning" : "success",
      });
      await usersQuery.refetch();
    },
    onError: () => {
      setBulkImportResult(
        "User import failed. Use a CSV with email, full_name, and role_name columns. Optional columns: scope_type, geography_id, project_id, temporary_password.",
      );
      pushToast({
        title: "User import failed",
        description: "Check the CSV columns and role permissions.",
        tone: "danger",
      });
    },
  });

  const unitsImportMutation = useMutation({
    mutationFn: (file: File) => importOrganizationUnits(token ?? "", file),
    onSuccess: async (response) => {
      setBulkImportResult(
        `${response.created_count} organization unit${response.created_count === 1 ? "" : "s"} created. ${response.skipped_count} row${response.skipped_count === 1 ? "" : "s"} skipped.`,
      );
      pushToast({
        title: "Organization units imported",
        description: `${response.created_count} created, ${response.skipped_count} skipped`,
        tone: response.error_count ? "warning" : "success",
      });
      await unitsQuery.refetch();
    },
    onError: () => {
      setBulkImportResult(
        "Organization unit import failed. Use a CSV with name, code, and unit_type columns. Optional columns: parent_code, region.",
      );
      pushToast({
        title: "Unit import failed",
        description:
          "Check the hierarchy CSV and your organization management permission.",
        tone: "danger",
      });
    },
  });

  const userUpdateMutation = useMutation({
    mutationFn: () =>
      updateUser(token ?? "", selectedUserId, {
        role_name: editRoleName,
        scope_type: editScopeType,
        geography_id: editGeographyId || null,
        project_id: editProjectId || null,
        organization_unit_id: editUnitId || null,
      }),
    onSuccess: async (user) => {
      setAccessResult(
        `${user.full_name} now has the ${(user.role_name ?? "selected").replaceAll("_", " ")} role with ${(user.scope_type ?? "organization").replaceAll("_", " ")} scope.`,
      );
      pushToast({
        title: "Access updated",
        description: `${user.full_name}'s role and scope were updated`,
        tone: "success",
      });
      await usersQuery.refetch();
    },
    onError: () =>
      pushToast({
        title: "Access was not updated",
        description:
          "The selected role may not allow that scope, or you may not manage that role.",
        tone: "danger",
      }),
  });

  const statusMutation = useMutation({
    mutationFn: (payload: { userId: string; active: boolean; name: string }) =>
      updateUser(token ?? "", payload.userId, { is_active: payload.active }),
    onSuccess: async (user) => {
      setAccountResult(
        `${user.full_name} is now ${user.is_active ? "active" : "inactive"}. This status controls whether the person can sign in and sync data.`,
      );
      pushToast({
        title: user.is_active ? "User activated" : "User deactivated",
        description: `${user.full_name}'s account status was updated`,
        tone: user.is_active ? "success" : "warning",
      });
      await usersQuery.refetch();
    },
    onError: () =>
      pushToast({
        title: "Status was not changed",
        description: "Try again or check whether your role can manage users.",
        tone: "danger",
      }),
  });

  const resetMutation = useMutation({
    mutationFn: (user: UserRead) => resetUserPassword(token ?? "", user.id),
    onSuccess: (reset) => {
      setAccountResult(
        `Temporary password generated: ${reset.temporary_password}. Share it securely and ask the user to change it after sign-in.`,
      );
      pushToast({
        title: "Password reset",
        description: `Temporary password: ${reset.temporary_password}`,
        tone: "warning",
      });
    },
    onError: () =>
      pushToast({
        title: "Password reset failed",
        description: "Check whether you can manage this user.",
        tone: "danger",
      }),
  });

  const routeMutation = useMutation({
    mutationFn: () =>
      routeData(token ?? "", {
        title: routeTitle,
        data_type: routeDataType,
        target_role_name: routeTargetType === "role" ? routeRoleName : null,
        target_team_id:
          routeTargetType === "team" && routeTeamId ? routeTeamId : null,
        target_user_id:
          routeTargetType === "user" && routeUserId ? routeUserId : null,
        priority: routePriority,
        instructions: routeInstructions,
      }),
    onSuccess: (route) => {
      const target =
        routeTargetType === "role"
          ? routeRoleName
          : routeTargetType === "user"
            ? routeUserId
            : routeTeamId;
      setRouteResult(
        `${route.title} was routed as ${route.priority} priority to ${routeTargetType}: ${target || "selected target"}. Instructions: ${routeInstructions}`,
      );
      pushToast({
        title: "Data routed",
        description: `${route.title} was sent to the selected ${routeTargetType}.`,
        tone: "success",
      });
    },
    onError: () =>
      pushToast({
        title: "Data was not routed",
        description: "Choose a valid role, team, or user before sending.",
        tone: "danger",
      }),
  });

  const displayedUsers = isPreview ? localUsers : (usersQuery.data ?? []);
  const roles: RoleRead[] =
    rolesQuery.data ??
    ["owner", "admin", "manager", "collector"].map((name) => ({
      id: name,
      organization_id: "local",
      name,
      permissions: [],
    }));
  const catalog: AccessCatalog | undefined =
    catalogQuery.data ?? (isPreview ? previewCatalog : undefined);
  const catalogRoles = catalog?.roles ?? [];
  const selectedRole =
    catalogRoles.find((role) => role.name === roleName) ?? catalogRoles[0];
  const selectedEditRole =
    catalogRoles.find((role) => role.name === editRoleName) ?? catalogRoles[0];
  const scopeOptions = catalog?.scope_types ?? [
    "organization",
    "country",
    "region",
    "district",
    "project",
    "own",
  ];
  const selectableRoles = catalogRoles.length ? catalogRoles : roles;
  const scopeRank = [
    "global",
    "organization",
    "country",
    "region",
    "district",
    "field_team",
    "project",
    "own",
  ];
  const allowedScopesForRole = (roleScope?: string | null) => {
    const minimumIndex = Math.max(0, scopeRank.indexOf(roleScope ?? "own"));
    return scopeOptions.filter(
      (scope) => scopeRank.indexOf(scope) >= minimumIndex,
    );
  };
  const inviteScopeOptions = allowedScopesForRole(selectedRole?.scope_type);
  const editScopeOptions = allowedScopesForRole(selectedEditRole?.scope_type);
  const preferredInviteRoleName = (
    selectableRoles.find((role) => role.name === "field_officer") ??
    selectableRoles.find((role) => role.name === "regional_manager") ??
    selectableRoles.find((role) => role.name === "district_supervisor") ??
    selectableRoles[0]
  )?.name;

  useEffect(() => {
    if (
      selectableRoles.length &&
      (!roleName || !selectableRoles.some((role) => role.name === roleName))
    ) {
      setRoleName(preferredInviteRoleName ?? "field_officer");
    }
  }, [preferredInviteRoleName, roleName, selectableRoles]);

  useEffect(() => {
    if (inviteScopeOptions.length && !inviteScopeOptions.includes(scopeType)) {
      setScopeType(inviteScopeOptions[0] ?? "own");
    }
  }, [inviteScopeOptions, scopeType]);

  useEffect(() => {
    if (editScopeOptions.length && !editScopeOptions.includes(editScopeType)) {
      setEditScopeType(editScopeOptions[0] ?? "own");
    }
  }, [editScopeOptions, editScopeType]);

  useEffect(() => {
    if (
      selectableRoles.length &&
      !selectableRoles.some((role) => role.name === routeRoleName)
    ) {
      setRouteRoleName(selectableRoles[0]?.name ?? "field_officer");
    }
  }, [routeRoleName, selectableRoles]);

  function selectUser(user: UserRead): void {
    setSelectedUserId(user.id);
    setEditRoleName(user.role_name ?? "field_officer");
    setEditScopeType(user.scope_type ?? "project");
    setEditGeographyId(user.geography_id ?? "");
    setEditProjectId(user.project_id ?? "");
    setEditUnitId(user.organization_unit_id ?? "");
    setAdminGuideResult(
      `${user.full_name} currently has the ${(user.role_name ?? "unassigned").replaceAll("_", " ")} role with ${(user.scope_type ?? "not scoped").replaceAll("_", " ")} scope. Review their status, role, and scope before changing access.`,
    );
  }

  function invitePreviewUser(): void {
    const nextUser: UserRead = {
      id: `preview-user-${Date.now()}`,
      email,
      full_name: fullName,
      is_active: true,
      role_name: roleName,
      scope_type: scopeType,
      login_slug: "atlas-demo",
      temporary_password: "ChangeMe12345!",
    };
    setLocalUsers((current) => [nextUser, ...current]);
    setLastInvite(nextUser);
    setEmail("");
    setFullName("");
    pushToast({
      title: "Preview user invited",
      description: `${nextUser.full_name} was added to the local preview roster.`,
      tone: "success",
    });
  }

  function updatePreviewAccess(): void {
    const selectedUser = localUsers.find((user) => user.id === selectedUserId);
    setLocalUsers((current) =>
      current.map((user) =>
        user.id === selectedUserId
          ? {
              ...user,
              role_name: editRoleName,
              scope_type: editScopeType,
              geography_id: editGeographyId || null,
              project_id: editProjectId || null,
              organization_unit_id: editUnitId || null,
            }
          : user,
      ),
    );
    setAccessResult(
      `${selectedUser?.full_name ?? "Selected user"} now has the ${editRoleName.replaceAll("_", " ")} role with ${editScopeType.replaceAll("_", " ")} scope in preview.`,
    );
    pushToast({
      title: "Preview access updated",
      description: "Role and scope changed in the local preview roster.",
      tone: "success",
    });
  }

  function routePreviewData(): void {
    const targetLabel =
      routeTargetType === "role"
        ? routeRoleName.replaceAll("_", " ")
        : routeTargetType === "user"
          ? (displayedUsers.find((user) => user.id === routeUserId)
              ?.full_name ?? "selected user")
          : (unitsQuery.data?.find((unit) => unit.id === routeTeamId)?.name ??
            "selected team");
    setRouteResult(
      `${routeTitle} was queued as ${routePriority} priority for ${targetLabel}. Instructions: ${routeInstructions}`,
    );
    pushToast({
      title: "Preview route sent",
      description: `${routeTitle} was queued for the selected ${routeTargetType}.`,
      tone: "success",
    });
  }

  function describeAccessMetric(
    label: string,
    value: string,
    text: string,
  ): void {
    setAdminGuideResult(
      `${label}: ${value}. ${text}. Use this access model to keep work visible only to the right people while still routing reviews, exports, and corrections efficiently.`,
    );
  }

  function describePermission(permission: string): void {
    setAdminGuideResult(
      `${permission.replaceAll(".", " ").replaceAll("_", " ")} allows a specific system action. Only assign this through a role when the person needs it for their daily work, approval responsibility, or reporting duty.`,
    );
  }

  const userColumns: TableColumn<UserRead>[] = [
    {
      key: "name",
      header: "User",
      value: (user) => `${user.full_name} ${user.id}`,
      render: (user) => (
        <div>
          <p className="font-medium">{user.full_name}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {user.id.slice(0, 8)}
          </p>
        </div>
      ),
    },
    {
      key: "email",
      header: "Email",
      value: (user) => user.email,
      render: (user) => user.email,
    },
    {
      key: "role",
      header: "Role",
      value: (user) => user.role_name ?? "",
      render: (user) => (
        <Badge tone="accent">
          {(user.role_name ?? "unassigned").replaceAll("_", " ")}
        </Badge>
      ),
    },
    {
      key: "scope",
      header: "Scope",
      value: (user) => user.scope_type ?? "",
      render: (user) => (
        <div>
          <p className="text-sm">
            {(user.scope_type ?? "not scoped").replaceAll("_", " ")}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {user.geography_id ||
              user.project_id ||
              user.organization_unit_id ||
              "all allowed data"}
          </p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      value: (user) => (user.is_active ? "active" : "inactive"),
      render: (user) => (
        <Badge tone={user.is_active ? "success" : "neutral"}>
          {user.is_active ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      value: (user) => user.id,
      render: (user) => (
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            type="button"
            variant="secondary"
            onClick={() => selectUser(user)}
          >
            Edit access
          </Button>
          <Button
            size="sm"
            type="button"
            variant="ghost"
            onClick={() => {
              if (isPreview) {
                setLocalUsers((current) =>
                  current.map((item) =>
                    item.id === user.id
                      ? { ...item, is_active: !item.is_active }
                      : item,
                  ),
                );
                setAccountResult(
                  `${user.full_name} was ${user.is_active ? "deactivated" : "activated"} in preview. Their roster status now reflects the change.`,
                );
                pushToast({
                  title: user.is_active
                    ? "Preview user deactivated"
                    : "Preview user activated",
                  description: `${user.full_name}'s status changed locally.`,
                  tone: user.is_active ? "warning" : "success",
                });
                return;
              }
              statusMutation.mutate({
                userId: user.id,
                active: !user.is_active,
                name: user.full_name,
              });
            }}
          >
            {user.is_active ? "Deactivate" : "Activate"}
          </Button>
          <Button
            size="sm"
            type="button"
            variant="ghost"
            onClick={() => {
              if (isPreview) {
                setAccountResult(
                  `Temporary password generated for ${user.full_name}: ChangeMe12345!. Share it securely and ask the user to change it after sign-in.`,
                );
                pushToast({
                  title: "Preview password reset",
                  description: "Temporary password: ChangeMe12345!",
                  tone: "warning",
                });
                return;
              }
              resetMutation.mutate(user);
            }}
          >
            Reset password
          </Button>
        </div>
      ),
    },
  ];

  const platformOrganizationColumns: TableColumn<PlatformOrganizationRead>[] = [
    {
      key: "name",
      header: "Organization",
      value: (organization) => `${organization.name} ${organization.slug}`,
      render: (organization) => (
        <div>
          <p className="font-medium">{organization.name}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {organization.slug}
          </p>
        </div>
      ),
    },
    {
      key: "owner",
      header: "Owner",
      value: (organization) => organization.owner_email ?? "",
      render: (organization) => organization.owner_email ?? "No owner assigned",
    },
    {
      key: "users",
      header: "Users",
      align: "right",
      value: (organization) => String(organization.user_count),
      render: (organization) => organization.user_count.toLocaleString(),
    },
    {
      key: "status",
      header: "Status",
      value: (organization) => (organization.is_active ? "active" : "inactive"),
      render: (organization) => (
        <Badge tone={organization.is_active ? "success" : "warning"}>
          {organization.is_active ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Support actions",
      value: (organization) => organization.id,
      render: (organization) => (
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={supportSessionMutation.isPending}
            onClick={() => supportSessionMutation.mutate(organization)}
            size="sm"
            type="button"
            variant="secondary"
          >
            Open support
          </Button>
          <Button
            disabled={organizationStatusMutation.isPending}
            onClick={() =>
              organizationStatusMutation.mutate({
                organization,
                active: !organization.is_active,
              })
            }
            size="sm"
            type="button"
            variant="ghost"
          >
            {organization.is_active ? "Deactivate" : "Activate"}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <section aria-labelledby="organization-title" className="space-y-5">
      <div className="surface-premium rounded-2xl p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Admin
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <h1
                id="organization-title"
                className="text-2xl font-semibold tracking-tight"
              >
                Team and access
              </h1>
              <HelpHint label="About team and access" title="Team and access">
                Invite teammates, choose a practical role, narrow their scope, and
                route work to the right people without exposing another
                organization’s data.
              </HelpHint>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone="accent">
              {catalogRoles.length || roles.length} enterprise roles
            </Badge>
            <Badge tone="neutral">{displayedUsers.length} users</Badge>
            <Badge tone="neutral">{unitsQuery.data?.length ?? 0} units</Badge>
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-4">
          {[
            ["1", "Invite", "Create a login for the person."],
            ["2", "Choose role", "Use the closest job function."],
            [
              "3",
              "Limit scope",
              "Restrict by project, district, or own records.",
            ],
            [
              "4",
              "Route work",
              "Send reviews or data to a role, team, or user.",
            ],
          ].map(([step, title, text]) => (
            <div className="rounded-xl border bg-background/75 p-3" key={step}>
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {step}
                </span>
                <p className="text-sm font-medium">{title}</p>
              </div>
              <div className="mt-2">
                <HelpHint label={`About ${title}`} title={title}>
                  {text}
                </HelpHint>
              </div>
            </div>
          ))}
        </div>
      </div>

      {accessLoading ? (
        <div className="rounded-2xl border bg-surface-container-lowest p-4 text-sm text-muted-foreground">
          Loading users, roles, and access scopes...
        </div>
      ) : null}
      {accessError ? (
        <div
          className="rounded-2xl border border-danger/30 bg-danger/10 p-4 text-sm"
          role="alert"
        >
          Team access data could not load. Check your connection and
          permissions, then refresh.
        </div>
      ) : null}

      {adminGuideResult ? (
        <section
          className="rounded-2xl border border-primary/25 bg-primary/10 p-4"
          aria-live="polite"
        >
          <div className="flex items-start gap-3">
            <ShieldCheck
              aria-hidden="true"
              className="mt-0.5 text-primary"
              size={18}
            />
            <div>
              <h2 className="text-sm font-semibold">Admin guidance</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {adminGuideResult}
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {isPlatformOwnerConsole ? (
        <section className="surface-premium rounded-2xl p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <LifeBuoy aria-hidden="true" size={18} />
                <h2 className="text-sm font-semibold">
                  Platform organization management
                </h2>
              </div>
              <div className="mt-2">
                <HelpHint label="About platform organization management" title="Platform organization management">
                  This area is for the developer/platform super admin account. Use
                  it to create tenants, open a support session inside an
                  organization, reactivate suspended workspaces, or troubleshoot
                  configuration problems without being treated as a normal
                  organization user.
                </HelpHint>
              </div>
              {principal?.support_mode ? (
                <div className="mt-3 rounded-lg border border-warning/30 bg-warning/10 p-3">
                  <p className="text-xs leading-5 text-warning">
                    Support mode is active for{" "}
                    {principal.organization_name ?? principal.organization_slug}
                    . You are viewing this organization as the platform super
                    admin.
                  </p>
                  <Button
                    className="mt-3"
                    disabled={returnPlatformMutation.isPending}
                    onClick={() => returnPlatformMutation.mutate()}
                    size="sm"
                    type="button"
                    variant="secondary"
                  >
                    <LifeBuoy aria-hidden="true" />
                    {returnPlatformMutation.isPending
                      ? "Returning"
                      : "Return to platform console"}
                  </Button>
                </div>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge tone="accent">
                {platformOrganizationsQuery.data?.length ?? 0} organizations
              </Badge>
              <Badge tone="neutral">
                {platformOrganizationsQuery.data?.filter(
                  (organization) => organization.is_active,
                ).length ?? 0}{" "}
                active
              </Badge>
            </div>
          </div>
          {platformResult ? (
            <div
              className="mt-4 rounded-xl border border-primary/25 bg-primary/10 p-3"
              aria-live="polite"
            >
              <p className="text-sm font-semibold">Platform result</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {platformResult}
              </p>
            </div>
          ) : null}
          <div className="mt-4">
            <DataTable
              columns={platformOrganizationColumns}
              emptyLabel="No organizations have been created yet"
              rows={platformOrganizationsQuery.data ?? []}
              searchLabel="Search organizations by name, slug, owner, or status"
              title={
                platformOrganizationsQuery.isFetching
                  ? "Organizations syncing"
                  : "All organizations"
              }
            />
          </div>
        </section>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <section className="surface-premium rounded-2xl p-4">
          <div className="flex items-center gap-2">
            <ShieldCheck aria-hidden="true" size={18} />
            <h2 className="text-sm font-semibold">Access model</h2>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            {[
              [
                "Roles",
                `${catalogRoles.length || roles.length}`,
                "Job-based access profiles",
              ],
              [
                "Permissions",
                `${catalog?.permissions.length ?? 0}`,
                "Actions allowed in the system",
              ],
              [
                "Scopes",
                `${catalog?.scope_types.length ?? 0}`,
                "Country, region, district, project, own",
              ],
              [
                "Units",
                `${unitsQuery.data?.length ?? 0}`,
                "Countries, regions, districts, and teams",
              ],
            ].map(([label, value, text]) => (
              <button
                className="rounded-xl border bg-background/80 p-3 text-left transition hover:border-primary/30 hover:bg-primary/5"
                key={label}
                onClick={() => describeAccessMetric(label, value, text)}
                type="button"
              >
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-2 text-2xl font-semibold">{value}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {text}
                </p>
              </button>
            ))}
          </div>
        </section>
        <aside className="surface-premium rounded-2xl p-4">
          <div className="flex items-center gap-2">
            <KeyRound aria-hidden="true" size={18} />
            <h2 className="text-sm font-semibold">What this person can do</h2>
          </div>
          <p className="mt-3 text-sm font-medium">
            {selectedRole?.label ?? roleName}
          </p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {selectedRole?.description ??
              "Choose a role to preview permissions, scope, and approval access before saving."}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge tone="accent">
              {selectedRole?.scope_type ?? scopeType} scope
            </Badge>
            {(selectedRole?.workflow_actions ?? [])
              .slice(0, 3)
              .map((action) => (
                <button
                  key={action}
                  className="rounded-full"
                  onClick={() =>
                    setAdminGuideResult(
                      `${action.replaceAll("_", " ")} is a workflow action included with ${selectedRole?.label ?? roleName}. Confirm the user needs this action before inviting them.`,
                    )
                  }
                  type="button"
                >
                  <Badge tone="neutral">{action.replaceAll("_", " ")}</Badge>
                </button>
              ))}
          </div>
        </aside>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        {isPlatformOwnerConsole ? (
          <form
            className="rounded-lg border bg-surface-container-lowest p-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (isPreview) {
                pushToast({
                  title: "Preview organization ready",
                  description:
                    "Organization creation is disabled in preview, but this setup flow is ready for platform admins.",
                  tone: "neutral",
                });
                return;
              }
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
                  The owner can log in immediately with the slug, email, and
                  this temporary password.
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
        ) : (
          <section className="rounded-lg border bg-surface-container-lowest p-4">
            <div className="mb-4 flex items-center gap-2">
              <Building2 aria-hidden="true" size={18} />
              <h2 className="text-sm font-semibold">Organization workspace</h2>
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              Organization creation is reserved for platform super admins. Use
              this area to invite team members, assign roles, set scopes, and
              manage access inside your organization.
            </p>
          </section>
        )}

        <form
          className="rounded-lg border bg-surface-container-lowest p-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (isPreview) {
              invitePreviewUser();
              return;
            }
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
                Pick the closest job function. You can narrow access with the
                scope below.
              </span>
              <Select
                className="mt-2"
                value={roleName}
                onChange={(event) => {
                  const nextRoleName = event.target.value;
                  const nextRole = selectableRoles.find(
                    (role) => role.name === nextRoleName,
                  );
                  const nextRoleScope =
                    nextRole && "scope_type" in nextRole
                      ? nextRole.scope_type
                      : undefined;
                  setRoleName(nextRoleName);
                  setScopeType(allowedScopesForRole(nextRoleScope)[0] ?? "own");
                }}
              >
                {selectableRoles.map((role) => (
                  <option
                    key={"id" in role ? role.id : role.name}
                    value={role.name}
                  >
                    {"label" in role && role.label ? role.label : role.name}
                  </option>
                ))}
              </Select>
            </label>
            <label className="block text-sm font-medium sm:col-span-2">
              Access scope
              <span className="mt-1 block text-xs font-normal text-muted-foreground">
                This controls what data they see. District and project scopes
                are safest for field operations.
              </span>
              <Select
                className="mt-2"
                value={scopeType}
                onChange={(event) => setScopeType(event.target.value)}
              >
                {inviteScopeOptions.map((scope) => (
                  <option key={scope} value={scope}>
                    {scope.replaceAll("_", " ")}
                  </option>
                ))}
              </Select>
            </label>
          </div>
          {lastInvite ? (
            <div className="mt-4 rounded-xl border border-success/30 bg-success/10 p-3 text-xs leading-5">
              <p className="font-semibold text-foreground">
                Login details for {lastInvite.full_name}
              </p>
              <p className="mt-1 text-muted-foreground">
                Slug:{" "}
                <span className="font-mono text-foreground">
                  {lastInvite.login_slug ?? "current organization"}
                </span>{" "}
                · Email:{" "}
                <span className="font-mono text-foreground">
                  {lastInvite.email}
                </span>{" "}
                · Temporary password:{" "}
                <span className="font-mono text-foreground">
                  {lastInvite.temporary_password ?? "ChangeMe12345!"}
                </span>
              </p>
            </div>
          ) : null}
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
            Only roles you are allowed to delegate appear here. The selected
            role also limits the access scopes you can assign.
            <button
              className="ml-1 font-medium text-primary hover:underline"
              onClick={() =>
                setAdminGuideResult(
                  `${selectedRole?.label ?? roleName} is being invited with ${scopeType.replaceAll("_", " ")} scope. This means their menus, API access, approvals, and visible records will follow that role and scope combination.`,
                )
              }
              type="button"
            >
              Preview this access.
            </button>
          </div>
        </form>
      </div>

      <section className="grid gap-4 xl:grid-cols-2" aria-label="Bulk imports">
        <article className="rounded-lg border bg-surface-container-lowest p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <UploadCloud aria-hidden="true" size={18} />
                <h2 className="text-sm font-semibold">Import users from CSV</h2>
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Create many managers, reviewers, supervisors, and admin users in
                one upload while keeping role and scope checks active. Use Field
                team for mobile field officer rosters.
              </p>
            </div>
            <Button
              disabled={!token || isPreview || usersImportMutation.isPending}
              onClick={() => usersFileInputRef.current?.click()}
              type="button"
              variant="secondary"
            >
              <UploadCloud aria-hidden="true" />
              {usersImportMutation.isPending ? "Importing" : "Upload users"}
            </Button>
          </div>
          <input
            ref={usersFileInputRef}
            className="sr-only"
            type="file"
            accept=".csv"
            disabled={!token || isPreview || usersImportMutation.isPending}
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              if (file) usersImportMutation.mutate(file);
              event.currentTarget.value = "";
            }}
          />
          <div className="mt-4 rounded-xl border bg-muted/35 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              CSV columns
            </p>
            <p className="mt-2 font-mono text-xs leading-6 text-foreground">
              email,full_name,role_name,scope_type,geography_id,project_id,temporary_password
            </p>
          </div>
        </article>

        <article className="rounded-lg border bg-surface-container-lowest p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Building2 aria-hidden="true" size={18} />
                <h2 className="text-sm font-semibold">
                  Import regions and teams
                </h2>
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Upload countries, regions, districts, offices, or field teams so
                scopes and routes match the real structure.
              </p>
            </div>
            <Button
              disabled={!token || isPreview || unitsImportMutation.isPending}
              onClick={() => unitsFileInputRef.current?.click()}
              type="button"
              variant="secondary"
            >
              <UploadCloud aria-hidden="true" />
              {unitsImportMutation.isPending ? "Importing" : "Upload units"}
            </Button>
          </div>
          <input
            ref={unitsFileInputRef}
            className="sr-only"
            type="file"
            accept=".csv"
            disabled={!token || isPreview || unitsImportMutation.isPending}
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              if (file) unitsImportMutation.mutate(file);
              event.currentTarget.value = "";
            }}
          />
          <div className="mt-4 rounded-xl border bg-muted/35 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              CSV columns
            </p>
            <p className="mt-2 font-mono text-xs leading-6 text-foreground">
              name,code,unit_type,parent_code,region
            </p>
          </div>
        </article>
      </section>

      {bulkImportResult ? (
        <section
          className="rounded-2xl border border-success/30 bg-success/10 p-4"
          aria-live="polite"
        >
          <div className="flex items-start gap-3">
            <UploadCloud
              aria-hidden="true"
              className="mt-0.5 text-success"
              size={18}
            />
            <div>
              <h2 className="text-sm font-semibold">Bulk import result</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {bulkImportResult}
              </p>
            </div>
          </div>
        </section>
      ) : null}

      <DataTable
        columns={userColumns}
        emptyLabel="No users loaded yet"
        rows={displayedUsers}
        searchLabel="Search users"
        title="Users"
      />

      {accountResult ? (
        <section className="rounded-2xl border bg-surface-container-lowest p-4" aria-live="polite">
          <div className="flex items-start gap-3">
            <KeyRound
              aria-hidden="true"
              className="mt-0.5 text-primary"
              size={18}
            />
            <div>
              <h2 className="text-sm font-semibold">Account action result</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {accountResult}
              </p>
            </div>
          </div>
        </section>
      ) : null}

      <section className="surface-premium rounded-2xl p-4">
        <div className="flex items-center gap-2">
          <ShieldCheck aria-hidden="true" size={18} />
          <h2 className="text-sm font-semibold">Edit existing user access</h2>
        </div>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Select a user, then change their role and operational scope. Use
          project, region, or district scopes for daily field operations.
        </p>
        <form
          className="mt-4 grid gap-4 lg:grid-cols-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (isPreview) {
              updatePreviewAccess();
              return;
            }
            userUpdateMutation.mutate();
          }}
        >
          <label className="block text-sm font-medium">
            User
            <Select
              className="mt-2"
              value={selectedUserId}
              onChange={(event) => {
                const user = displayedUsers.find(
                  (item) => item.id === event.target.value,
                );
                if (user) selectUser(user);
              }}
              required
            >
              <option value="">Choose a user</option>
              {displayedUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.full_name} - {user.email}
                </option>
              ))}
            </Select>
          </label>
          <label className="block text-sm font-medium">
            Role
            <Select
              className="mt-2"
              value={editRoleName}
              onChange={(event) => setEditRoleName(event.target.value)}
            >
              {selectableRoles.map((role) => (
                <option
                  key={"id" in role ? role.id : role.name}
                  value={role.name}
                >
                  {"label" in role && role.label ? role.label : role.name}
                </option>
              ))}
            </Select>
          </label>
          <label className="block text-sm font-medium">
            Scope
            <Select
              className="mt-2"
              value={editScopeType}
              onChange={(event) => setEditScopeType(event.target.value)}
            >
              {editScopeOptions.map((scope) => (
                <option key={scope} value={scope}>
                  {scope.replaceAll("_", " ")}
                </option>
              ))}
            </Select>
          </label>
          <label className="block text-sm font-medium">
            Geography code
            <Input
              className="mt-2"
              placeholder="region-default or district-default"
              value={editGeographyId}
              onChange={(event) => setEditGeographyId(event.target.value)}
            />
          </label>
          <label className="block text-sm font-medium">
            Project ID
            <Input
              className="mt-2"
              placeholder="Optional project id"
              value={editProjectId}
              onChange={(event) => setEditProjectId(event.target.value)}
            />
          </label>
          <label className="block text-sm font-medium">
            Organization unit
            <Select
              className="mt-2"
              value={editUnitId}
              onChange={(event) => setEditUnitId(event.target.value)}
            >
              <option value="">No unit selected</option>
              {(unitsQuery.data ?? []).map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name} - {unit.unit_type}
                </option>
              ))}
            </Select>
          </label>
          <div className="rounded-xl border bg-background/80 p-3 text-xs leading-5 text-muted-foreground lg:col-span-2">
            <span className="block font-medium text-foreground">
              {selectedEditRole?.label ?? editRoleName}
            </span>
            {selectedEditRole?.description ??
              "Choose a role to preview what this user can do."}
            <button
              className="mt-2 block font-medium text-primary hover:underline"
              onClick={() =>
                setAdminGuideResult(
                  `${selectedEditRole?.label ?? editRoleName} with ${editScopeType.replaceAll("_", " ")} scope will control this user's menus, allowed actions, visible data, and approval responsibilities after saving.`,
                )
              }
              type="button"
            >
              Explain this access change
            </button>
          </div>
          <Button
            className="self-end"
            disabled={!selectedUserId || userUpdateMutation.isPending}
            type="submit"
            variant="primary"
          >
            <ShieldCheck aria-hidden="true" />
            Save access
          </Button>
        </form>
        {accessResult ? (
          <div
            className="mt-4 rounded-xl border border-success/30 bg-success/10 p-3"
            aria-live="polite"
          >
            <p className="text-sm font-semibold">Access change saved</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {accessResult}
            </p>
          </div>
        ) : null}
      </section>

      <section className="surface-premium rounded-2xl p-4">
        <div className="flex items-center gap-2">
          <ShieldCheck aria-hidden="true" size={18} />
          <h2 className="text-sm font-semibold">
            Send data or work to a role, team, or person
          </h2>
        </div>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Route submissions, imports, cases, or reports to the right internal
          group. Routes stay inside this organization and create a workflow
          queue item.
        </p>
        <form
          className="mt-4 grid gap-4 lg:grid-cols-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (isPreview) {
              routePreviewData();
              return;
            }
            routeMutation.mutate();
          }}
        >
          <label className="block text-sm font-medium">
            Route title
            <Input
              className="mt-2"
              value={routeTitle}
              onChange={(event) => setRouteTitle(event.target.value)}
              required
            />
          </label>
          <label className="block text-sm font-medium">
            Data type
            <Select
              className="mt-2"
              value={routeDataType}
              onChange={(event) => setRouteDataType(event.target.value)}
            >
              {[
                "submissions",
                "beneficiaries",
                "imports",
                "cases",
                "reports",
                "indicators",
              ].map((type) => (
                <option key={type} value={type}>
                  {type.replaceAll("_", " ")}
                </option>
              ))}
            </Select>
          </label>
          <label className="block text-sm font-medium">
            Priority
            <Select
              className="mt-2"
              value={routePriority}
              onChange={(event) =>
                setRoutePriority(event.target.value as typeof routePriority)
              }
            >
              {["low", "normal", "high", "urgent"].map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </Select>
          </label>
          <label className="block text-sm font-medium">
            Send to
            <Select
              className="mt-2"
              value={routeTargetType}
              onChange={(event) =>
                setRouteTargetType(event.target.value as typeof routeTargetType)
              }
            >
              <option value="role">Role</option>
              <option value="team">Team or unit</option>
              <option value="user">Specific user</option>
            </Select>
          </label>
          {routeTargetType === "role" ? (
            <label className="block text-sm font-medium">
              Target role
              <Select
                className="mt-2"
                value={routeRoleName}
                onChange={(event) => setRouteRoleName(event.target.value)}
              >
                {selectableRoles.map((role) => (
                  <option
                    key={"id" in role ? role.id : role.name}
                    value={role.name}
                  >
                    {"label" in role && role.label ? role.label : role.name}
                  </option>
                ))}
              </Select>
            </label>
          ) : null}
          {routeTargetType === "team" ? (
            <label className="block text-sm font-medium">
              Target team
              <Select
                className="mt-2"
                value={routeTeamId}
                onChange={(event) => setRouteTeamId(event.target.value)}
                required
              >
                <option value="">Choose a team</option>
                {(unitsQuery.data ?? []).map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name} - {unit.unit_type}
                  </option>
                ))}
              </Select>
            </label>
          ) : null}
          {routeTargetType === "user" ? (
            <label className="block text-sm font-medium">
              Target user
              <Select
                className="mt-2"
                value={routeUserId}
                onChange={(event) => setRouteUserId(event.target.value)}
                required
              >
                <option value="">Choose a user</option>
                {displayedUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.full_name} - {user.role_name}
                  </option>
                ))}
              </Select>
            </label>
          ) : null}
          <label className="block text-sm font-medium lg:col-span-2">
            Instructions
            <Input
              className="mt-2"
              value={routeInstructions}
              onChange={(event) => setRouteInstructions(event.target.value)}
              required
            />
          </label>
          <Button
            className="self-end"
            disabled={!token || routeMutation.isPending}
            type="submit"
            variant="primary"
          >
            <ShieldCheck aria-hidden="true" />
            Send route
          </Button>
          <div className="rounded-xl border bg-background/80 p-3 text-xs leading-5 text-muted-foreground lg:col-span-3">
            <span className="font-medium text-foreground">Route preview: </span>
            {routeTitle} will be sent as {routePriority} priority to a{" "}
            {routeTargetType}. Routes create a queue item and keep instructions
            visible for reviewers.
            <button
              className="ml-1 font-medium text-primary hover:underline"
              onClick={() =>
                setAdminGuideResult(
                  `${routeTitle} will route ${routeDataType.replaceAll("_", " ")} to the selected ${routeTargetType} with ${routePriority} priority. Use clear instructions so the receiver knows whether to review, approve, correct, or export the data.`,
                )
              }
              type="button"
            >
              Explain route impact.
            </button>
          </div>
        </form>
        {routeResult ? (
          <div
            className="mt-4 rounded-xl border border-success/30 bg-success/10 p-3"
            aria-live="polite"
          >
            <p className="text-sm font-semibold">Route queued</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {routeResult}
            </p>
          </div>
        ) : null}
      </section>

      <section className="surface-premium rounded-2xl p-4">
        <div className="flex items-center gap-2">
          <LockKeyhole aria-hidden="true" size={18} />
          <h2 className="text-sm font-semibold">Permission preview</h2>
        </div>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          A plain preview of the selected role. These capabilities drive menus,
          buttons, API access, approval workflows, and audit visibility.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {(selectedRole?.permissions ?? roles[0]?.permissions ?? [])
            .slice(0, 12)
            .map((permission) => (
              <button
                className="flex items-center gap-2 rounded-xl border bg-background/80 px-3 py-2 text-left text-sm transition hover:border-primary/30 hover:bg-primary/5"
                key={permission}
                onClick={() => describePermission(permission)}
                type="button"
              >
                <CheckCircle2
                  aria-hidden="true"
                  className="text-success"
                  size={15}
                />
                <span>
                  {permission.replaceAll(".", " ").replaceAll("_", " ")}
                </span>
              </button>
            ))}
        </div>
      </section>
    </section>
  );
}
