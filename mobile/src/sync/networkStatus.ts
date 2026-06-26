export type NetworkSnapshot = {
  isOnline: boolean;
  lastOnlineAt: string | null;
  connectionType: "wifi" | "cellular" | "ethernet" | "unknown" | "offline";
};

type NetworkListener = (snapshot: NetworkSnapshot) => void;

export class NetworkStatusService {
  private snapshot: NetworkSnapshot = {
    isOnline: true,
    lastOnlineAt: new Date().toISOString(),
    connectionType: "unknown",
  };
  private readonly listeners = new Set<NetworkListener>();

  current(): NetworkSnapshot {
    return this.snapshot;
  }

  /** Subscribe to connectivity changes. Returns an unsubscribe function. */
  subscribe(listener: NetworkListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  setOnline(connectionType: NetworkSnapshot["connectionType"] = "unknown"): NetworkSnapshot {
    const wasOnline = this.snapshot.isOnline;
    this.snapshot = {
      isOnline: true,
      lastOnlineAt: new Date().toISOString(),
      connectionType,
    };
    if (!wasOnline) this.emit();
    return this.snapshot;
  }

  setOffline(): NetworkSnapshot {
    const wasOnline = this.snapshot.isOnline;
    this.snapshot = {
      ...this.snapshot,
      isOnline: false,
      connectionType: "offline",
    };
    if (wasOnline) this.emit();
    return this.snapshot;
  }

  /** The app reached the API server (any HTTP response, even an error) — we are online. */
  reportServerReachable(): void {
    this.setOnline();
  }

  /** A request failed before reaching the server (DNS/timeout/no radio) — treat as offline. */
  reportNetworkError(): void {
    this.setOffline();
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener(this.snapshot);
    }
  }
}

/** Shared connectivity state for the whole app: the HTTP client reports request outcomes
 * here, and the app context / sync engine read and subscribe to it. Using one instance keeps
 * the "Online/Offline" indicator and sync gating consistent with real network behavior. */
export const networkStatusService = new NetworkStatusService();
