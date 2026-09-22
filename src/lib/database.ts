import { openDatabaseSync, type SQLiteDatabase } from "expo-sqlite";
import { drizzle, type ExpoSQLiteDatabase } from "drizzle-orm/expo-sqlite";

import * as chatSchema from "@/features/chat/storage/schema";
import * as purchasesSchema from "@/features/purchases/storage/schema";

const schema = { ...chatSchema, ...purchasesSchema };

let rawDatabase: SQLiteDatabase | null = null;
let drizzleDatabase: ExpoSQLiteDatabase<typeof schema> | null = null;

function getRawDatabaseInstance(): SQLiteDatabase {
  if (rawDatabase === null) {
    rawDatabase = openDatabaseSync("fan-chat.db");
  }

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
 */
export function getAppDatabase(): ExpoSQLiteDatabase<typeof schema> {
  if (drizzleDatabase === null) {
    drizzleDatabase = drizzle(getRawDatabaseInstance(), { schema });
  }

  return drizzleDatabase;
}
