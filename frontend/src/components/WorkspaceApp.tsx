"use client";

import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { AuthPanel } from "@/components/AuthPanel";
import { CommandPalette } from "@/components/CommandPalette";
import { Dashboard } from "@/components/Dashboard";
import { DynamicForms } from "@/components/DynamicForms";
import { FieldOfficerOperations } from "@/components/FieldOfficerOperations";
import { FormTemplateLibrary } from "@/components/FormTemplateLibrary";
import { GovernanceCommandCenter } from "@/components/GovernanceCommandCenter";
import {
  BeneficiaryRegistry,
  CaseManagement,
  ConnectivityCenter,
  DataInteroperabilityCenter,
  EnterpriseOperationsCenter,
  GeospatialIntelligence,
  IndicatorTracking,
  OperationalEcosystem,
  ProgramManagement,
  ReportingCenter
} from "@/components/MEOperations";
import { NotificationCenter } from "@/components/NotificationCenter";
import { OrganizationManagement } from "@/components/OrganizationManagement";
import { PlatformConsole } from "@/components/PlatformConsole";
import { ProductHelpCenter } from "@/components/ProductHelpCenter";
import { SubmissionReview } from "@/components/SubmissionReview";
import { WorkflowManagement } from "@/components/WorkflowManagement";
import { WorkforceGovernanceCenter } from "@/components/WorkforceGovernanceCenter";
import { getCurrentPrincipal, getOrganizationContext } from "@/lib/api";
import { clearToken, readToken, writeToken } from "@/lib/session";
import { useWorkspaceStore, type WorkspaceView } from "@/stores/workspace";

export function WorkspaceApp() {
  const [token, setToken] = useState<string | null>(null);
  const activeView = useWorkspaceStore((state) => state.activeView);
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
    enabled: Boolean(token && !isPreviewToken)
  });

  const organizationQuery = useQuery({
    queryKey: ["organization-context", token],
    queryFn: () => getOrganizationContext(token ?? ""),
    enabled: Boolean(token && !isPreviewToken)
  });

  useEffect(() => {
    if (!token || isPreviewToken || !principalQuery.isError) {
      return;
    }
    clearToken();
    setToken(null);
    pushToast({
      title: "Session needs sign-in",
      description: "Your saved session could not be verified. Sign in again to continue.",
      tone: "warning"
    });
  }, [isPreviewToken, principalQuery.isError, pushToast, token]);

  const isPlatformConsoleMode = Boolean(principalQuery.data?.platform_admin && !principalQuery.data.support_mode);

  useEffect(() => {
    if (!principalQuery.data) {
      return;
    }
    if (!principalQuery.data.platform_admin && activeView === "platform") {
      setActiveView("dashboard");
      return;
    }
    if (!principalQuery.data.support_mode && activeView !== "platform" && activeView !== "help") {
      setActiveView("platform");
    }
    if (principalQuery.data.support_mode && activeView === "platform") {
      setActiveView("dashboard");
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
            <p className="text-sm font-semibold">Checking your workspace access</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Atlas is confirming your account, organization, role, and menu permissions before opening the workspace.
            </p>
          </div>
        </section>
        <NotificationCenter />
      </>
    );
  }

  const organizationLabel =
    isPlatformConsoleMode
      ? "Atlas FieldOps Platform"
      : organizationQuery.data?.name ??
    (principalQuery.data?.organization_id
      ? `Organization ${principalQuery.data.organization_id.slice(0, 8)}`
      : "Organization workspace");
  const organizationSlug = isPlatformConsoleMode ? "platform-console" : organizationQuery.data?.slug;

  const content = {
    platform: (
      <PlatformConsole
        token={token}
        principal={principalQuery.data}
        onTokenChanged={(nextToken) => {
          setToken(nextToken);
          writeToken(nextToken);
        }}
      />
    ),
    dashboard: <Dashboard token={token} />,
    ecosystem: <OperationalEcosystem token={token} />,
    enterprise: <EnterpriseOperationsCenter token={token} />,
    governance: <GovernanceCommandCenter token={token} />,
    workforce: <WorkforceGovernanceCenter token={token} />,
    data: <DataInteroperabilityCenter token={token} />,
    programs: <ProgramManagement token={token} />,
    beneficiaries: <BeneficiaryRegistry token={token} />,
    indicators: <IndicatorTracking token={token} />,
    organizations: (
      <OrganizationManagement
        token={token}
        principal={principalQuery.data}
        onTokenChanged={(nextToken) => {
          setToken(nextToken);
          writeToken(nextToken);
        }}
      />
    ),
    officers: <FieldOfficerOperations token={token} />,
    templates: <FormTemplateLibrary token={token} />,
    forms: <DynamicForms token={token} />,
    submissions: <SubmissionReview token={token} />,
    cases: <CaseManagement token={token} />,
    map: <GeospatialIntelligence token={token} />,
    analytics: <ReportingCenter token={token} />,
    workflows: <WorkflowManagement token={token} />,
    connectivity: <ConnectivityCenter token={token} />,
    help: <ProductHelpCenter />
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
