import { describe, expect, it } from "vitest";

import type {
  ApiKeyRecord,
  BackupJob,
  FeatureFlag,
  IntegrationRecord,
  LocationRecord,
} from "@/modules/administration/types";
import {
  getAdministrationOverviewMetrics,
  statusTone,
  toCsv,
} from "@/modules/administration/utils";

describe("administration utilities", () => {
  it("summarizes platform administration metrics without tenant demo data", () => {
    const locations: LocationRecord[] = [
      {
        boundaryReference: "",
        code: "CMR",
        coordinates: "",
        id: "loc-1",
        name: "Cameroon",
        parentId: null,
        status: "active",
        type: "Country",
        updatedAt: "2026-06-05 09:00",
      },
    ];
    const integrations: IntegrationRecord[] = [
      {
        id: "int-1",
        lastSync: "2026-06-05",
        name: "Email",
        owner: "System Admin",
        status: "connected",
        type: "Email Service",
      },
    ];
    const apiKeys: ApiKeyRecord[] = [
      {
        id: "key-1",
        lastUsed: "Never",
        name: "Reporting API",
        owner: "Data Team",
        rateLimit: "100/hour",
        scope: "Read",
        status: "active",
      },
    ];
    const backups: BackupJob[] = [
      {
        date: "2026-06-05",
        id: "backup-1",
        retentionDays: 30,
        size: "Queued",
        status: "scheduled",
        type: "Database Backup",
      },
    ];
    const featureFlags: FeatureFlag[] = [
      {
        enabled: true,
        environment: "Production",
        id: "flag-1",
        name: "Mapping",
        rollout: 100,
      },
    ];

    const metrics = getAdministrationOverviewMetrics({
      activeProjects: 0,
      activeUsers: 12,
      apiKeys,
      backups,
      failedJobs: 0,
      featureFlags,
      healthStatus: "healthy",
      integrations,
      locations,
      organizations: 3,
    });

    expect(metrics.map((metric) => metric.label)).toEqual([
      "Organizations",
      "Countries",
      "Active users",
      "Active projects",
      "API integrations",
      "System health",
      "Scheduled backups",
      "Failed jobs",
      "Active feature flags",
    ]);
    expect(metrics.find((metric) => metric.label === "Countries")?.value).toBe(
      "1",
    );
    expect(metrics.find((metric) => metric.label === "System health")?.tone).toBe(
      "success",
    );
  });

  it("maps administration statuses to badge tones", () => {
    expect(statusTone("active")).toBe("success");
    expect(statusTone("scheduled")).toBe("neutral");
    expect(statusTone("critical")).toBe("danger");
    expect(statusTone("warning")).toBe("warning");
  });

  it("exports csv with escaped values", () => {
    expect(
      toCsv([
        {
          code: "A1",
          label: 'North "A"',
        },
      ]),
    ).toBe('"code","label"\n"A1","North ""A"""');
  });
});

