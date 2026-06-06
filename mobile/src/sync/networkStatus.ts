export type NetworkSnapshot = {
  isOnline: boolean;
  lastOnlineAt: string | null;
  connectionType: "wifi" | "cellular" | "ethernet" | "unknown" | "offline";
};

export class NetworkStatusService {
  private snapshot: NetworkSnapshot = {
    isOnline: true,
    lastOnlineAt: new Date().toISOString(),
    connectionType: "unknown",
  };

  current(): NetworkSnapshot {
    return this.snapshot;
  }

  setOnline(connectionType: NetworkSnapshot["connectionType"] = "unknown"): NetworkSnapshot {
    this.snapshot = {
      isOnline: true,
      lastOnlineAt: new Date().toISOString(),
      connectionType,
    };
    return this.snapshot;
  }

  setOffline(): NetworkSnapshot {
    this.snapshot = {
      ...this.snapshot,
      isOnline: false,
      connectionType: "offline",
    };
    return this.snapshot;
  }
}
