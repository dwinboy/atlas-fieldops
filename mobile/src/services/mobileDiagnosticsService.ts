import type { MobileDiagnosticsReport } from "@/models/contracts";
import { LocalDatabase } from "@/storage/localDatabase";
import { NetworkStatusService } from "@/sync/networkStatus";
import { nowIso } from "@/utils/ids";

export class MobileDiagnosticsService {
  private fakeOfflineMode = false;

  constructor(
    private readonly database: LocalDatabase,
    private readonly network: NetworkStatusService,
  ) {}

  setFakeOfflineMode(enabled: boolean): void {
    this.fakeOfflineMode = enabled;
    if (enabled) {
      this.network.setOffline();
    } else {
      this.network.setOnline("unknown");
    }
  }

  report(): MobileDiagnosticsReport {
    const warnings: string[] = [];
    const drafts = this.database.draftSubmissions.list();
    const queue = this.database.syncQueue.list();
    if (queue.filter((item) => item.status === "Failed").length > 0) {
      warnings.push("There are failed sync items waiting for retry.");
    }
    if (drafts.length > 500) {
      warnings.push("This device has a large number of local drafts. Sync as soon as possible.");
    }
    return {
      generatedAt: nowIso(),
      fakeOfflineMode: this.fakeOfflineMode,
      storage: {
        drafts: drafts.length,
        queueItems: queue.length,
        entities: this.database.entities.list().length,
        forms: this.database.forms.list().length,
      },
      sync: {
        pending: queue.filter((item) => item.status === "Queued").length,
        failed: queue.filter((item) => item.status === "Failed").length,
        conflicts: this.database.conflicts.list().length,
      },
      warnings,
    };
  }
}
