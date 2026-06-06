export type LocalMigration = {
  version: number;
  description: string;
  statements: string[];
};

export class LocalDatabaseMigrationService {
  readonly migrations: LocalMigration[] = [
    {
      version: 1,
      description: "Initial offline field data schema",
      statements: ["CREATE_BASE_SCHEMA"],
    },
    {
      version: 2,
      description: "Production hardening indexes, conflicts, attachment progress, and sync logs",
      statements: ["ADD_CONFLICTS", "ADD_ATTACHMENT_PROGRESS", "ADD_SYNC_LOG_FIELDS", "ADD_PERFORMANCE_INDEXES"],
    },
  ];

  latestVersion(): number {
    return this.migrations[this.migrations.length - 1]?.version ?? 0;
  }

  pending(currentVersion: number): LocalMigration[] {
    return this.migrations.filter((migration) => migration.version > currentVersion);
  }
}
