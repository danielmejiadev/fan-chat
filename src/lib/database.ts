import { Platform } from "react-native";
import { openDatabaseAsync, openDatabaseSync, type SQLiteDatabase } from "expo-sqlite";
import { drizzle, type ExpoSQLiteDatabase } from "drizzle-orm/expo-sqlite";

import * as chatSchema from "@/features/chat/storage/schema";
import * as purchasesSchema from "@/features/purchases/storage/schema";
import * as subscriptionsSchema from "@/features/subscriptions/storage/schema";

const schema = { ...chatSchema, ...purchasesSchema, ...subscriptionsSchema };

let rawDatabase: SQLiteDatabase | null = null;
let drizzleDatabase: ExpoSQLiteDatabase<typeof schema> | null = null;
let initializationPromise: Promise<ExpoSQLiteDatabase<typeof schema>> | null = null;

/**
 * On web, opening the connection through the `*Sync` API routes through
 * expo-sqlite's worker + Atomics busy-wait bridge (needed for OPFS), which
 * can throw "Sync operation timeout" if the worker's wasm/OPFS setup takes
 * longer than the busy-wait's fixed iteration budget — most likely on a
 * cold open. `openDatabaseAsync` opens the same connection without that
 * busy-wait. Native has no such worker, so it keeps the (cheap, immediate)
 * sync open.
 */
async function openRawDatabase(): Promise<SQLiteDatabase> {
  if (rawDatabase !== null) {
    return rawDatabase;
  }

  rawDatabase =
    Platform.OS === "web"
      ? await openDatabaseAsync("fan-chat.db")
      : openDatabaseSync("fan-chat.db");

  return rawDatabase;
}

/**
 * Drizzle-wrapped handle shared by chat and purchases — both features live
 * in the same physical fan-chat.db file, so they share one drizzle()
 * instance/schema rather than opening separate connections to the same
 * file. expo-sqlite's `*Sync` API funnels every call through a hardcoded
 * 1 MiB SharedArrayBuffer on web, which overflows (and corrupts JSON) on
 * large result sets — Drizzle's expo-sqlite driver uses the async API
 * instead and isn't subject to that cap.
 *
 * Must be awaited once (e.g. via `useAppReady`) before `getAppDatabase()`
 * is called anywhere else in the app.
 */
export async function initializeAppDatabase(): Promise<ExpoSQLiteDatabase<typeof schema>> {
  if (drizzleDatabase !== null) {
    return drizzleDatabase;
  }

  if (initializationPromise === null) {
    initializationPromise = openRawDatabase().then((database) => {
      drizzleDatabase = drizzle(database, { schema });

      return drizzleDatabase;
    });
  }

  return initializationPromise;
}

export function getAppDatabase(): ExpoSQLiteDatabase<typeof schema> {
  if (drizzleDatabase === null) {
    throw new Error("getAppDatabase() called before initializeAppDatabase() resolved");
  }

  return drizzleDatabase;
}
