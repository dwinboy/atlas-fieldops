import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";

import { AuthService } from "@/auth/authService";
import { ExpoSecureSessionStore } from "@/auth/expoSecureSessionStore.native";
import type { MobileSession } from "@/auth/sessionStore";
import { localDatabase } from "@/storage/localDatabase";
import { BootstrapSyncService } from "@/sync/bootstrapSyncService";
import { NetworkStatusService } from "@/sync/networkStatus";
import { SyncEngine } from "@/sync/syncEngine";

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
const networkService = new NetworkStatusService();

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

  // AppState listener: sync when returning to foreground
  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      if (appState.current.match(/inactive|background/) && nextState === "active") {
        networkService.setOnline();
        setIsOnline(true);
        if (session?.accessToken) {
          runSyncQueue().catch(() => {});
        }
      }
      if (nextState.match(/inactive|background/)) {
        appState.current = nextState;
      } else {
        appState.current = nextState;
      }
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

  async function runSyncQueue() {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const engine = new SyncEngine(localDatabase, networkService, async () => {
        const current = await authService.currentSession();
        if (current && current.accessToken !== session?.accessToken) {
          setSessionState(current);
        }
        return current?.accessToken ?? null;
      });
      const result = await engine.syncNow("Automatic");
      if (result.synced > 0 || result.failed > 0) {
        setLastSyncMessage(result.message);
        refresh();
      }
    } catch {
      // silent — background sync should not surface errors directly
    } finally {
      setIsSyncing(false);
    }
  }

  const syncWork = useCallback(async () => {
    if (!session?.accessToken) return;
    setIsSyncing(true);
    setLastSyncMessage("Syncing assigned work…");
    try {
      const svc = new BootstrapSyncService(localDatabase);
      const pkg = await svc.syncAssignedWork(session.accessToken);
      setSession({ ...session, bootstrap: pkg.bootstrap });
      setLastSyncMessage(
        `Sync complete: ${pkg.assignments.length} assignment(s), ${pkg.forms.length} form(s), ${pkg.entities.length} entity record(s), ${pkg.entityCategories.length} category setup(s).`,
      );
      refresh();
    } catch (err) {
      setLastSyncMessage(err instanceof Error ? err.message : "Sync failed. Check your connection.");
    } finally {
      setIsSyncing(false);
    }
  }, [session, refresh]);

  const syncQueue = useCallback(async () => {
    if (!session?.accessToken) return;
    await runSyncQueue();
    setLastSyncMessage(lastSyncMessage || "Queue sync complete.");
  }, [session, lastSyncMessage]);

  const logout = useCallback(async () => {
    await authService.logout();
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
