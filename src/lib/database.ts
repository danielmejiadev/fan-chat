import { openDatabaseSync, type SQLiteDatabase } from "expo-sqlite";

let database: SQLiteDatabase | null = null;

export function getDatabase(): SQLiteDatabase {
  if (database === null) {
    database = openDatabaseSync("fan-chat.db");
    database.execSync("PRAGMA journal_mode = WAL;");
  }

  return database;
}
