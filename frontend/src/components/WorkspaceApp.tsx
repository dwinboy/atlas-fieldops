"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { AppShell, type WorkspaceView } from "@/components/AppShell";
import { AuthPanel } from "@/components/AuthPanel";
import { Dashboard } from "@/components/Dashboard";
import { DynamicForms } from "@/components/DynamicForms";
import { OrganizationManagement } from "@/components/OrganizationManagement";
import { RealtimeAnalytics } from "@/components/RealtimeAnalytics";
import { getCurrentPrincipal } from "@/lib/api";
import { clearToken, readToken, writeToken } from "@/lib/session";

export function WorkspaceApp() {
  const [token, setToken] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<WorkspaceView>("dashboard");

  useEffect(() => {
    setToken(readToken());
  }, []);

  const principalQuery = useQuery({
    queryKey: ["principal", token],
    queryFn: () => getCurrentPrincipal(token ?? ""),
    enabled: Boolean(token)
  });

  if (!token) {
    return (
      <AuthPanel
        onAuthenticated={(nextToken) => {
          writeToken(nextToken);
          setToken(nextToken);
        }}
      />
    );
  }

  const organizationLabel = principalQuery.data?.organization_id
    ? `Tenant ${principalQuery.data.organization_id.slice(0, 8)}`
    : "Tenant context";

  const content = {
    dashboard: <Dashboard />,
    organizations: <OrganizationManagement token={token} />,
    forms: <DynamicForms />,
    analytics: <RealtimeAnalytics />
  } satisfies Record<WorkspaceView, React.ReactNode>;

  return (
    <AppShell
      activeView={activeView}
      onSignOut={() => {
        clearToken();
        setToken(null);
      }}
      onViewChange={setActiveView}
      organizationLabel={organizationLabel}
    >
      {content[activeView]}
    </AppShell>
  );
}

