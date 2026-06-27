import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";

import { AuthService } from "@/auth/authService";
import { pinService } from "@/auth/pinService";
import { ExpoSecureSessionStore } from "@/auth/expoSecureSessionStore.native";
import type { MobileSession } from "@/auth/sessionStore";
import { localDatabase } from "@/storage/localDatabase";
import { networkStatusService } from "@/sync/networkStatus";
import { SyncEngine, type SyncMode } from "@/sync/syncEngine";

// ─── Types ───────────────────────────────────────────────────────────────────

export type AppContextValue = {
  session: MobileSession | null;
  setSession: (session: MobileSession | null) => void;
  /** Increment this to force all screens to re-read from localDatabase */
  refreshKey: number;
  refresh: () => void;
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncMessage: string;
  syncWork: () => Promise<void>;
  syncQueue: () => Promise<void>;
  logout: () => Promise<void>;
};

// ─── Context ─────────────────────────────────────────────────────────────────

const AppContext = createContext<AppContextValue | null>(null);

const authService = new AuthService(new ExpoSecureSessionStore());
// Shared singleton so the HTTP client's real request outcomes drive the same connectivity
// state the UI and sync engine read.
const networkService = networkStatusService;

// ─── Provider ────────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [session, setSessionState] = useState<MobileSession | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncMessage, setLastSyncMessage] = useState("");
  const appState = useRef<AppStateStatus>(AppState.currentState);

  // Restore session on mount
  useEffect(() => {
    authService.currentSession().then((stored) => {
      if (stored) setSessionState(stored);
    }).catch(() => {});
  }, []);

  // Reflect real connectivity: the HTTP client reports request outcomes to the shared
  // network service, and we mirror that into React state for the Online/Offline indicator.
  useEffect(() => {
    setIsOnline(networkService.current().isOnline);
    return networkService.subscribe((snapshot) => setIsOnline(snapshot.isOnline));
  }, []);

  // AppState listener: probe connectivity and sync when returning to foreground.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      if (appState.current.match(/inactive|background/) && nextState === "active") {
        if (session?.accessToken) {
          // A manual-mode run always attempts the network, so it doubles as a connectivity
          // probe that recovers the online state once the device is back in coverage.
          runSyncQueue({ mode: "Manual", silent: true }).catch(() => {});
        }
      }
      appState.current = nextState;
    });
    return () => sub.remove();
  }, [session]);

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const setSession = useCallback((s: MobileSession | null) => {
    setSessionState(s);
    refresh();
  }, [refresh]);

  async function runSyncQueue(options?: {
    mode?: SyncMode;
    initialMessage?: string;
    silent?: boolean;
  }) {
    if (isSyncing) return;
    setIsSyncing(true);
    if (options?.initialMessage) {
      setLastSyncMessage(options.initialMessage);
    }
    try {
      const engine = new SyncEngine(localDatabase, networkService, async () => {
        const current = await authService.currentSession();
        if (current && current.accessToken !== session?.accessToken) {
          setSessionState(current);
        }
        return current?.accessToken ?? null;
      });
      const result = await engine.syncNow(options?.mode ?? "Automatic");
      setLastSyncMessage(result.message);
      refresh();
      return result;
    } catch (err) {
      if (!options?.silent) {
        setLastSyncMessage(err instanceof Error ? err.message : "Sync failed. Check your connection.");
      }
      return null;
    } finally {
      setIsSyncing(false);
    }
  }

  const syncWork = useCallback(async () => {
    if (!session?.accessToken) return;
    await runSyncQueue({
      mode: "Manual",
      initialMessage: "Syncing assigned work and uploading queued submissions…",
    });
  }, [session, isSyncing]);

  const syncQueue = useCallback(async () => {
    if (!session?.accessToken) return;
    await runSyncQueue({
      mode: "Manual",
      initialMessage: "Uploading queued submissions and refreshing mobile data…",
    });
  }, [session, isSyncing]);

  const logout = useCallback(async () => {
    await authService.logout();
    await pinService.clearPin();
    setSessionState(null);
    refresh();
  }, [refresh]);

  return (
    <AppContext.Provider
      value={{
        session,
        setSession,
        refreshKey,
        refresh,
        isOnline,
        isSyncing,
        lastSyncMessage,
        syncWork,
        syncQueue,
        logout,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used inside AppProvider");
  return ctx;
}
