import { openDatabaseAsync, type SQLiteDatabase } from "expo-sqlite";
import { create } from "zustand";

/**
 * Dev-only override for "offline" that doesn't depend on NetInfo. The iOS
 * Simulator has no real Wi-Fi/Airplane Mode radio to toggle, so NetInfo's
 * isConnected can stay true regardless of what the host Mac's network is
 * doing — this store lets the offline failure scenarios be demoed reliably
 * on Simulator instead of depending on host network state.
 *
 * Persisted so a force-quit while "offline" stays offline after reopening —
 * the force-quit-while-offline scenario the task requires would otherwise
 * silently flip back online on relaunch. Backed by a raw expo-sqlite row
 * instead of zustand's AsyncStorage persist middleware: this project's
 * Expo Go runtime doesn't have AsyncStorage's native module available
 * ("Native module is null, cannot access legacy storage"), while
 * expo-sqlite is already proven working here (it's what every other
 * persisted value in the app uses).
 */
const OFFLINE_KEY = "isForcedOffline";

type DebugNetworkStore = {
  isForcedOffline: boolean;
  setForcedOffline: (value: boolean) => void;
};

let databasePromise: Promise<SQLiteDatabase> | null = null;

async function getDebugSettingsDatabase(): Promise<SQLiteDatabase> {
  databasePromise ??= (async () => {
    const database = await openDatabaseAsync("fan-chat.db");
    await database.execAsync(
      "CREATE TABLE IF NOT EXISTS debug_settings (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL)",
    );

    return database;
  })();

  return databasePromise;
}

export const useDebugNetworkStore = create<DebugNetworkStore>((set) => ({
  isForcedOffline: false,
  setForcedOffline: (value) => {
    set({ isForcedOffline: value });
    void getDebugSettingsDatabase().then((database) =>
      database.runAsync(
        "INSERT INTO debug_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        [OFFLINE_KEY, value ? "1" : "0"],
      ),
    );
  },
}));

let hydrationPromise: Promise<void> | null = null;

/**
 * Resolves once the persisted flag has loaded from disk. Callers that read
 * isDebugForcedOffline() at app startup (mockChatConnection's initial
 * reconcile, an early flushPendingMessages) must await this first, or a
 * cold start could see the in-memory default (false) instead of a forced
 * offline state that was actually persisted from before the restart.
 */
export function waitForDebugNetworkHydration(): Promise<void> {
  hydrationPromise ??= (async () => {
    const database = await getDebugSettingsDatabase();
    const row = await database.getFirstAsync<{ value: string }>(
      "SELECT value FROM debug_settings WHERE key = ?",
      [OFFLINE_KEY],
    );

    if (row !== null) {
      useDebugNetworkStore.setState({ isForcedOffline: row.value === "1" });
    }
  })();

  return hydrationPromise;
}

/** Non-reactive read for use outside React components (services, mockApi). */
export function isDebugForcedOffline(): boolean {
  return useDebugNetworkStore.getState().isForcedOffline;
}
