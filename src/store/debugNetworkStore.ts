import { openDatabaseAsync, type SQLiteDatabase } from "expo-sqlite";
import { create } from "zustand";

/**
 * Dev-only override that's the sole source of truth for "offline" in this
 * app — there's no real network connectivity check; every offline scenario
 * is demoed by toggling this flag.
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

/**
 * The same typed store contract every other feature's storage/ uses —
 * SQLite for the real app, an in-memory double for Jest, which can't load
 * expo-sqlite's native module. Without this, any test that reaches
 * flushPendingMessages() (which always awaits waitForDebugNetworkHydration())
 * would crash trying to open a real database, regardless of which chat/
 * purchase store it already injected.
 */
type DebugSettingsStore = {
  getForcedOffline: () => Promise<boolean | null>;
  setForcedOffline: (value: boolean) => Promise<void>;
};

function createSqliteDebugSettingsStore(): DebugSettingsStore {
  let databasePromise: Promise<SQLiteDatabase> | null = null;

  async function getDatabase(): Promise<SQLiteDatabase> {
    databasePromise ??= (async () => {
      const database = await openDatabaseAsync("fan-chat.db");
      await database.execAsync(
        "CREATE TABLE IF NOT EXISTS debug_settings (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL)",
      );

      return database;
    })();

    return databasePromise;
  }

  return {
    async getForcedOffline() {
      const database = await getDatabase();
      const row = await database.getFirstAsync<{ value: string }>(
        "SELECT value FROM debug_settings WHERE key = ?",
        [OFFLINE_KEY],
      );

      return row === null ? null : row.value === "1";
    },
    async setForcedOffline(value) {
      const database = await getDatabase();
      await database.runAsync(
        "INSERT INTO debug_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        [OFFLINE_KEY, value ? "1" : "0"],
      );
    },
  };
}

/** Test-only: no persistence, just an in-memory value — Jest can't load expo-sqlite's native module. */
export function createInMemoryDebugSettingsStore(): DebugSettingsStore {
  let storedValue: boolean | null = null;

  return {
    async getForcedOffline() {
      return storedValue;
    },
    async setForcedOffline(value) {
      storedValue = value;
    },
  };
}

let defaultStore: DebugSettingsStore | null = null;

function resolveDebugSettingsStore(): DebugSettingsStore {
  defaultStore ??= createSqliteDebugSettingsStore();

  return defaultStore;
}

/** Test-only: forces the next resolveDebugSettingsStore() call to use this store instead of SQLite. */
export function setDebugSettingsStoreForTests(store: DebugSettingsStore): void {
  defaultStore = store;
}

/** Test-only: clears the cached store and in-memory state so each test starts from a fresh one. */
export function resetDebugSettingsStore(): void {
  defaultStore = null;
  hydrationPromise = null;
  useDebugNetworkStore.setState({ isForcedOffline: false });
}

export const useDebugNetworkStore = create<DebugNetworkStore>((set) => ({
  isForcedOffline: false,
  setForcedOffline: (value) => {
    set({ isForcedOffline: value });
    void resolveDebugSettingsStore().setForcedOffline(value);
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
    const persistedValue = await resolveDebugSettingsStore().getForcedOffline();

    if (persistedValue !== null) {
      useDebugNetworkStore.setState({ isForcedOffline: persistedValue });
    }
  })();

  return hydrationPromise;
}

/** Non-reactive read for use outside React components (services, mockApi). */
export function isDebugForcedOffline(): boolean {
  return useDebugNetworkStore.getState().isForcedOffline;
}
