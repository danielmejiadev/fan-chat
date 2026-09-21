import { getDatabase } from "@/lib/database";

/**
 * pending_messages: the local outbox, written before a message is ever sent
 * so 3 offline messages (and their order) survive a force-quit.
 *
 * accepted_client_ids: idempotency table kept separate from the outbox — the
 * mock backend consults it to tell a genuine retry from a duplicate submit.
 *
 * messages: the reconciled thread as confirmed by the mock backend.
 */
export function initChatSchema(): void {
  const database = getDatabase();

  database.execSync(`
    CREATE TABLE IF NOT EXISTS pending_messages (
      clientId TEXT PRIMARY KEY NOT NULL,
      conversationId TEXT NOT NULL,
      text TEXT NOT NULL,
      createdAt INTEGER NOT NULL,
      status TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS accepted_client_ids (
      clientId TEXT PRIMARY KEY NOT NULL,
      serverId TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      serverId TEXT PRIMARY KEY NOT NULL,
      clientId TEXT,
      conversationId TEXT NOT NULL,
      senderId TEXT NOT NULL,
      text TEXT NOT NULL,
      createdAt INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_messages_conversation
      ON messages (conversationId, createdAt);

    CREATE INDEX IF NOT EXISTS idx_pending_messages_conversation
      ON pending_messages (conversationId, createdAt);
  `);
}
