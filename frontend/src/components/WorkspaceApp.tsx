"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { LifeBuoy, RotateCcw } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { AuthPanel } from "@/components/AuthPanel";
import { CommandPalette } from "@/components/CommandPalette";
import { Dashboard } from "@/components/Dashboard";
import { FormTemplateLibrary } from "@/components/FormTemplateLibrary";
import {
  BeneficiaryRegistry,
  CaseManagement,
  ConnectivityCenter,
  DataInteroperabilityCenter,
  EnterpriseOperationsCenter,
  OperationalEcosystem,
} from "@/components/MEOperations";
import { NotificationCenter } from "@/components/NotificationCenter";
import { PlatformConsole } from "@/components/PlatformConsole";
import { ProductHelpCenter } from "@/components/ProductHelpCenter";
import {
  ModuleWorkspace,
  type ModuleWorkspaceAction,
} from "@/components/shared/ModuleWorkspace";
import { SurveyManagement } from "@/components/SurveyManagement";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WorkflowManagement } from "@/components/WorkflowManagement";
import { WorkforceGovernanceCenter } from "@/components/WorkforceGovernanceCenter";
import {
  getDefaultWorkspaceView,
  getNavigationItemByView,
  isWorkspaceViewAllowed,
} from "@/config/navigation";
import {
  getCurrentPrincipal,
  getOrganizationContext,
  returnToPlatformSession,
} from "@/lib/api";
import { clearToken, readToken, writeToken } from "@/lib/session";
import { AdministrationModule } from "@/modules/administration/AdministrationModule";
import { DataQualityModule } from "@/modules/data-quality/DataQualityModule";
import { FieldOperationsModule } from "@/modules/field-operations/FieldOperationsModule";
import { FormsModule } from "@/modules/forms/FormsModule";
import { GovernanceModule } from "@/modules/governance/GovernanceModule";
import { IndicatorsModule } from "@/modules/indicators/IndicatorsModule";
import { MappingModule } from "@/modules/mapping/MappingModule";
import { ProjectsModule } from "@/modules/projects/ProjectsModule";
import { ReportsModule } from "@/modules/reports/ReportsModule";
import { SubmissionsModule } from "@/modules/submissions/SubmissionsModule";
import { UsersTeamsModule } from "@/modules/users-teams/UsersTeamsModule";
import { useWorkspaceStore, type WorkspaceView } from "@/stores/workspace";

export function WorkspaceApp() {
  const [token, setToken] = useState<string | null>(null);
  const activeView = useWorkspaceStore((state) => state.activeView);
  const pathname = usePathname();
  const pushToast = useWorkspaceStore((state) => state.pushToast);
  const setActiveView = useWorkspaceStore((state) => state.setActiveView);
  const theme = useWorkspaceStore((state) => state.theme);
  const isPreviewToken = token === "preview-token";

  useEffect(() => {
    const storedToken = readToken();
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const principalQuery = useQuery({
    queryKey: ["principal", token],
    queryFn: () => getCurrentPrincipal(token ?? ""),
    enabled: Boolean(token && !isPreviewToken),
  });

  const organizationQuery = useQuery({
    queryKey: ["organization-context", token],
    queryFn: () => getOrganizationContext(token ?? ""),
    enabled: Boolean(token && !isPreviewToken),
  });

  const returnSupportMutation = useMutation({
    mutationFn: () => returnToPlatformSession(token ?? ""),
    onSuccess: (response) => {
      setToken(response.access_token);
      writeToken(response.access_token);
      setActiveView("platform");
      pushToast({
        title: "Returned to platform console",
        description:
          "Tenant support mode is closed and your platform operator session is active.",
        tone: "success",
      });
    },
    onError: () => {
      pushToast({
        title: "Could not return to platform",
        description:
          "Sign in again with the platform super admin account if the support session has expired.",
        tone: "danger",
      });
    },
  });

  useEffect(() => {
    if (!token || isPreviewToken || !principalQuery.isError) {
      return;
    }
    clearToken();
    setToken(null);
    pushToast({
      title: "Session needs sign-in",
      description:
        "Your saved session could not be verified. Sign in again to continue.",
      tone: "warning",
    });
  }, [isPreviewToken, principalQuery.isError, pushToast, token]);

  const isPlatformConsoleMode = Boolean(
    principalQuery.data?.platform_admin && !principalQuery.data.support_mode,
  );
  const currentPath =
    typeof window === "undefined" ? (pathname ?? "") : window.location.pathname;
  const isPlatformRoute = currentPath.startsWith("/platform");

  useEffect(() => {
    if (!principalQuery.data) {
      return;
    }
    if (!isWorkspaceViewAllowed(activeView, principalQuery.data)) {
      setActiveView(getDefaultWorkspaceView(principalQuery.data));
    }
  }, [activeView, principalQuery.data, setActiveView]);

  if (!token) {
    return (
      <>
        <AuthPanel
          onAuthenticated={(nextToken) => {
            setToken(nextToken);
            writeToken(nextToken);
          }}
        />
        <NotificationCenter />
      </>
    );
  }

  if (!isPreviewToken && principalQuery.isLoading) {
    return (
      <>
        <section className="flex min-h-screen items-center justify-center bg-background px-6 text-center">
          <div className="max-w-sm rounded-2xl border bg-panel p-6 shadow-line">
            <p className="text-sm font-semibold">
              Checking your workspace access
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Atlas is confirming your account, organization, role, and menu
              permissions before opening the workspace.
            </p>
          </div>
        </section>
        <NotificationCenter />
      </>
    );
  }

  const organizationLabel = isPlatformConsoleMode
    ? "Atlas FieldOps Platform"
    : (organizationQuery.data?.name ??
      (principalQuery.data?.organization_id
        ? `Organization ${principalQuery.data.organization_id.slice(0, 8)}`
        : "Organization workspace"));
  const organizationSlug = isPlatformConsoleMode
    ? "platform-console"
    : organizationQuery.data?.slug;
  const platformConsole = (
    <PlatformConsole
      token={token}
      principal={principalQuery.data}
      onSignOut={() => {
        clearToken();
        setToken(null);
      }}
      onTokenChanged={(nextToken) => {
        setToken(nextToken);
        writeToken(nextToken);
      }}
    />
  );
  function moduleWorkspace(
    view: WorkspaceView,
    child: React.ReactNode,
    actions: ModuleWorkspaceAction[] = [],
    showSections = true,
  ): React.ReactNode {
    const item = getNavigationItemByView(view);
    if (!item) return child;
    return (
      <ModuleWorkspace actions={actions} item={item} showSections={showSections}>
        {child}
      </ModuleWorkspace>
    );
  }

  if (isPlatformConsoleMode) {
    return (
      <>
        {platformConsole}
        <NotificationCenter />
      </>
    );
  }

  if (isPlatformRoute && (isPreviewToken || principalQuery.data)) {
    return (
      <>
        <section className="flex min-h-screen items-center justify-center bg-background px-6">
          <div className="max-w-lg rounded-lg border bg-panel p-6 text-center shadow-elevated">
            <Badge tone="danger">Forbidden</Badge>
            <h1 className="mt-3 text-xl font-semibold">
              Platform Console requires Super Admin access
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Organization users, including organization System Admins, cannot
              open `/platform` or platform-only tools. Use the normal app
              workspace for organization administration.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {principalQuery.data?.platform_admin &&
              principalQuery.data?.support_mode ? (
                <Button
                  disabled={returnSupportMutation.isPending}
                  onClick={() => returnSupportMutation.mutate()}
                  type="button"
                  variant="primary"
                >
                  <RotateCcw aria-hidden="true" />
                  Return to platform
                </Button>
              ) : null}
              <Button
                onClick={() => {
                  window.location.href = "/app";
                }}
                type="button"
                variant="secondary"
              >
                Open organization app
              </Button>
              <Button
                onClick={() => {
                  clearToken();
                  setToken(null);
                }}
                type="button"
                variant="ghost"
              >
                Sign out
              </Button>
            </div>
          </div>
        </section>
        <NotificationCenter />
      </>
    );
  }

  const content = {
    platform: platformConsole,
    dashboard: <Dashboard token={token} principal={principalQuery.data} />,
    ecosystem: <OperationalEcosystem token={token} />,
    enterprise: <EnterpriseOperationsCenter token={token} />,
    governance: <GovernanceModule token={token} principal={principalQuery.data} />,
    workforce: <WorkforceGovernanceCenter token={token} />,
    data: <DataInteroperabilityCenter token={token} />,
    dataQuality: <DataQualityModule token={token} principal={principalQuery.data} />,
    programs: <ProjectsModule token={token} principal={principalQuery.data} />,
    surveys: <SurveyManagement token={token} />,
    beneficiaries: <BeneficiaryRegistry token={token} />,
    indicators: <IndicatorsModule token={token} principal={principalQuery.data} />,
    organizations: moduleWorkspace(
      "organizations",
      <UsersTeamsModule token={token} principal={principalQuery.data} />,
      [
        {
          label: "Open field teams",
          description: "Manage assignments and field execution.",
          onClick: () => setActiveView("officers"),
        },
        {
          label: "Audit trail",
          description: "Review immutable governance events.",
          onClick: () => setActiveView("governance"),
        },
      ],
      false,
    ),
    officers: <FieldOperationsModule token={token} principal={principalQuery.data} />,
    templates: <FormTemplateLibrary token={token} />,
    forms: <FormsModule token={token} principal={principalQuery.data} />,
    submissions: <SubmissionsModule token={token} principal={principalQuery.data} />,
    cases: <CaseManagement token={token} />,
    map: <MappingModule token={token} principal={principalQuery.data} />,
    analytics: <ReportsModule token={token} principal={principalQuery.data} />,
    workflows: <WorkflowManagement token={token} />,
    connectivity: <ConnectivityCenter token={token} />,
    administration: (
      <AdministrationModule token={token} principal={principalQuery.data} />
    ),
    help: <ProductHelpCenter />,
  } satisfies Record<WorkspaceView, React.ReactNode>;

  return (
    <AppShell
      onSignOut={() => {
        clearToken();
        setToken(null);
      }}
      organizationLabel={organizationLabel}
      organizationLogoUrl={organizationQuery.data?.logo_url}
      organizationSlug={organizationSlug}
      principal={principalQuery.data}
    >
      <CommandPalette principal={principalQuery.data} />
      <NotificationCenter />
      {principalQuery.data?.platform_admin &&
      principalQuery.data.support_mode ? (
        <section className="mb-4 rounded-2xl border border-warning/30 bg-warning/10 p-4 shadow-line">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <LifeBuoy
                aria-hidden="true"
                className="mt-0.5 text-warning"
                size={18}
              />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm font-semibold">Tenant support mode</h2>
                  <Badge tone="warning">Platform support</Badge>
                </div>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  You are viewing this organization to troubleshoot a tenant
                  issue. Return to the platform console when the support task is
                  complete.
                </p>
              </div>
            </div>
            <Button
              disabled={returnSupportMutation.isPending}
              onClick={() => returnSupportMutation.mutate()}
              type="button"
              variant="primary"
            >
              <RotateCcw aria-hidden="true" />
              Return to platform
            </Button>
          </div>
        </section>
      ) : null}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeView}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.16, ease: [0.2, 0.8, 0.2, 1] }}
        >
          {content[activeView]}
        </motion.div>
      </AnimatePresence>
    </AppShell>
  );
}
