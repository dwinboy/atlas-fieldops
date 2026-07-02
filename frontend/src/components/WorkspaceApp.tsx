"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { LifeBuoy, Loader2, Megaphone, RotateCcw } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { AuthPanel } from "@/components/AuthPanel";
import { CommandPalette } from "@/components/CommandPalette";
import { Dashboard } from "@/components/Dashboard";
import { FormTemplateLibrary } from "@/components/FormTemplateLibrary";
import {
  CaseManagement,
  ConnectivityCenter,
  DataInteroperabilityCenter,
  EnterpriseOperationsCenter,
  OperationalEcosystem,
} from "@/components/MEOperations";
import { NotificationCenter } from "@/components/NotificationCenter";
import { PlatformConsole } from "@/components/PlatformConsole";
import { ProductHelpCenter } from "@/components/ProductHelpCenter";
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
import { statusTone } from "@/lib/statusTones";
import {
  getCurrentPrincipal,
  getOrganizationContext,
  getPlatformAnnouncement,
  returnToPlatformSession,
} from "@/lib/api";
import { clearToken, readToken, writeToken } from "@/lib/session";
import { AdministrationModule } from "@/modules/administration/AdministrationModule";
import { BeneficiariesModule } from "@/modules/beneficiaries/BeneficiariesModule";
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

export function viewFromWorkspacePath(pathname: string): WorkspaceView | null {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/app/help") return "help";
  if (path === "/app") return null;
  if (path === "/dashboard") return "dashboard";
  if (path.startsWith("/surveys")) return "surveys";
  if (path.startsWith("/projects")) return "programs";
  if (path.startsWith("/forms")) return "forms";
  if (path.startsWith("/field-operations")) return "officers";
  if (path.startsWith("/submissions")) return "submissions";
  if (path.startsWith("/beneficiaries")) return "beneficiaries";
  if (path.startsWith("/mapping")) return "map";
  if (path.startsWith("/indicators")) return "indicators";
  if (path.startsWith("/reports")) return "analytics";
  if (path.startsWith("/data-quality")) return "dataQuality";
  if (path.startsWith("/users-teams")) return "organizations";
  if (path.startsWith("/governance")) return "governance";
  if (path.startsWith("/administration")) return "administration";
  return null;
}

export function workspaceAppRouteForView(view: WorkspaceView): string | null {
  return getNavigationItemByView(view)?.route ?? null;
}

export function WorkspaceApp() {
  const [token, setToken] = useState<string | null | undefined>(undefined);
  const activeView = useWorkspaceStore((state) => state.activeView);
  const pathname = usePathname();
  const router = useRouter();
  const pushToast = useWorkspaceStore((state) => state.pushToast);
  const setActiveView = useWorkspaceStore((state) => state.setActiveView);
  const theme = useWorkspaceStore((state) => state.theme);
  const isPreviewToken = token === "preview-token";

  useEffect(() => {
    setToken(readToken());
    const fallback = window.setTimeout(() => {
      setToken((current) => (current === undefined ? null : current));
    }, 1200);
    return () => window.clearTimeout(fallback);
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
  const announcementQuery = useQuery({
    queryKey: ["platform-announcement"],
    queryFn: getPlatformAnnouncement,
    enabled: Boolean(token),
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
  const routeView = viewFromWorkspacePath(currentPath);

  useEffect(() => {
    if (
      !principalQuery.data?.platform_admin ||
      principalQuery.data.support_mode ||
      isPlatformRoute ||
      typeof window === "undefined"
    ) {
      return;
    }
    window.history.replaceState(null, "", "/platform/overview");
  }, [isPlatformRoute, principalQuery.data]);

  useEffect(() => {
    if (
      !principalQuery.data?.support_mode ||
      !isPlatformRoute ||
      typeof window === "undefined"
    ) {
      return;
    }
    const targetView = getDefaultWorkspaceView(principalQuery.data);
    const targetRoute = getNavigationItemByView(targetView)?.route ?? "/dashboard";
    window.history.replaceState(null, "", targetRoute);
    setActiveView(targetView);
  }, [isPlatformRoute, principalQuery.data, setActiveView]);

  useEffect(() => {
    if (!routeView) {
      return;
    }
    setActiveView(routeView);
  }, [routeView, setActiveView]);

  useEffect(() => {
    if (!principalQuery.data) {
      return;
    }
    if (!isWorkspaceViewAllowed(activeView, principalQuery.data)) {
      setActiveView(getDefaultWorkspaceView(principalQuery.data));
    }
  }, [activeView, principalQuery.data, setActiveView]);

  if (token === undefined) {
    return (
      <>
        <WorkspaceLoadingScreen
          hint="Restoring your secure session…"
          title="Opening workspace"
        />
        <NotificationCenter />
      </>
    );
  }

  if (token === null) {
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
        <WorkspaceLoadingScreen
          hint="Confirming your access…"
          title="Preparing your workspace"
        />
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
          <div className="max-w-lg rounded-lg border bg-surface-container-lowest p-6 text-center shadow-elevated">
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
    beneficiaries: <BeneficiariesModule token={token} principal={principalQuery.data} />,
    indicators: <IndicatorsModule token={token} principal={principalQuery.data} />,
    organizations: <UsersTeamsModule token={token} principal={principalQuery.data} />,
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
      token={token}
    >
      <CommandPalette principal={principalQuery.data} />
      <NotificationCenter />
      {announcementQuery.data?.announcement_enabled &&
      announcementQuery.data.announcement_title.trim() ? (
        <section className="mb-4 rounded-2xl border border-info/30 bg-info/10 p-4 shadow-line">
          <div className="flex items-start gap-3">
            <Megaphone aria-hidden="true" className="mt-0.5 text-info" size={18} />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-semibold">{announcementQuery.data.announcement_title}</h2>
                <Badge tone={statusTone(announcementQuery.data.announcement_tone)}>{announcementQuery.data.announcement_tone}</Badge>
              </div>
              {announcementQuery.data.announcement_body ? (
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{announcementQuery.data.announcement_body}</p>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}
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

function WorkspaceLoadingScreen({ hint, title }: { hint: string; title: string }) {
  return (
    <section className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="flex w-full max-w-sm animate-[view-fade-up_0.4s_ease] flex-col items-center gap-5 text-center">
        <span className="flex size-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
          <Loader2 aria-hidden="true" className="size-6 animate-spin" />
        </span>
        <div className="space-y-1">
          <p className="text-base font-semibold tracking-tight">{title}</p>
          <p className="text-sm text-muted-foreground">{hint}</p>
        </div>
        <div className="w-full space-y-2" aria-hidden="true">
          <div className="h-2.5 w-3/4 mx-auto rounded-full bg-muted animate-pulse" />
          <div className="h-2.5 w-1/2 mx-auto rounded-full bg-muted/70 animate-pulse" />
        </div>
      </div>
    </section>
  );
}
