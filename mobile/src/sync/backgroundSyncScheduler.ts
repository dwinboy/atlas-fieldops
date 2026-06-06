import { SyncEngine, type SyncRunResult } from "@/sync/syncEngine";

export type BackgroundSyncPolicy = {
  enabled: boolean;
  intervalMinutes: number;
  wifiOnly: boolean;
  batterySaverAware: boolean;
};

export class BackgroundSyncScheduler {
  private policy: BackgroundSyncPolicy = {
    enabled: true,
    intervalMinutes: 15,
    wifiOnly: false,
    batterySaverAware: true,
  };

  constructor(private readonly syncEngine: SyncEngine) {}

  configure(policy: Partial<BackgroundSyncPolicy>): BackgroundSyncPolicy {
    this.policy = { ...this.policy, ...policy };
    return this.policy;
  }

  currentPolicy(): BackgroundSyncPolicy {
    return this.policy;
  }

  async runIfAllowed(): Promise<SyncRunResult | null> {
    if (!this.policy.enabled) {
      return null;
    }
    return this.syncEngine.syncInBackground();
  }
}
