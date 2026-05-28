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
import { SubmissionReview } from "@/components/SubmissionReview";
import { WorkflowManagement } from "@/components/WorkflowManagement";
import { WorkforceGovernanceCenter } from "@/components/WorkforceGovernanceCenter";
import { getCurrentPrincipal, getOrganizationContext } from "@/lib/api";
import { clearToken, readToken, writeToken } from "@/lib/session";
import { useWorkspaceStore, type WorkspaceView } from "@/stores/workspace";

export function WorkspaceApp() {
  const [token, setToken] = useState<string | null>(null);
  const activeView = useWorkspaceStore((state) => state.activeView);
  const theme = useWorkspaceStore((state) => state.theme);

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
    enabled: Boolean(token)
  });

  const organizationQuery = useQuery({
    queryKey: ["organization-context", token],
    queryFn: () => getOrganizationContext(token ?? ""),
    enabled: Boolean(token)
  });

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

  const organizationLabel =
    organizationQuery.data?.name ??
    (principalQuery.data?.organization_id
      ? `Organization ${principalQuery.data.organization_id.slice(0, 8)}`
      : "Organization workspace");

  const content = {
    dashboard: <Dashboard token={token} />,
    ecosystem: <OperationalEcosystem />,
    enterprise: <EnterpriseOperationsCenter />,
    governance: <GovernanceCommandCenter token={token} />,
    workforce: <WorkforceGovernanceCenter token={token} />,
    data: <DataInteroperabilityCenter token={token} />,
    programs: <ProgramManagement token={token} />,
    beneficiaries: <BeneficiaryRegistry token={token} />,
    indicators: <IndicatorTracking token={token} />,
    organizations: <OrganizationManagement token={token} principal={principalQuery.data} />,
    officers: <FieldOfficerOperations token={token} />,
    templates: <FormTemplateLibrary token={token} />,
    forms: <DynamicForms token={token} />,
    submissions: <SubmissionReview token={token} />,
    cases: <CaseManagement token={token} />,
    map: <GeospatialIntelligence />,
    analytics: <ReportingCenter token={token} />,
    workflows: <WorkflowManagement />,
    connectivity: <ConnectivityCenter />
  } satisfies Record<WorkspaceView, React.ReactNode>;

  return (
    <AppShell
      onSignOut={() => {
        clearToken();
        setToken(null);
      }}
      organizationLabel={organizationLabel}
      organizationLogoUrl={organizationQuery.data?.logo_url}
      organizationSlug={organizationQuery.data?.slug}
      principal={principalQuery.data}
    >
      <CommandPalette />
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
