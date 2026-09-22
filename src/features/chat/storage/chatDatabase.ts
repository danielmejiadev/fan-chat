import { getDatabase } from "@/lib/database";
import type { ChatStore, MessagePageCursor } from "@/features/chat/storage/chatStore";
import type {
  ClientMessage,
  MessageFailureReason,
  MessageStatus,
  ServerMessage,
} from "@/features/chat/types";

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
      status TEXT NOT NULL,
      failureReason TEXT
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

/** Wipes every chat table — used by the demo's reset action, never in normal app flow. */
export function clearChatData(): void {
  const database = getDatabase();

  database.execSync(`
    DELETE FROM pending_messages;
    DELETE FROM accepted_client_ids;
    DELETE FROM messages;
  `);
}

export function createSqliteChatStore(): ChatStore {
  const database = getDatabase();

  return {
    insertPendingMessage(message: ClientMessage): void {
      database.runSync(
        `INSERT INTO pending_messages (clientId, conversationId, text, createdAt, status)
         VALUES ($clientId, $conversationId, $text, $createdAt, $status)`,
        {
          $clientId: message.clientId,
          $conversationId: message.conversationId,
          $text: message.text,
          $createdAt: message.createdAt,
          $status: message.status,
        },
      );
    },

    updatePendingMessageStatus(
      clientId: string,
      status: MessageStatus,
      failureReason?: MessageFailureReason,
    ): void {
      database.runSync(
        `UPDATE pending_messages SET status = $status, failureReason = $failureReason
         WHERE clientId = $clientId`,
        {
          $status: status,
          $failureReason: failureReason ?? null,
          $clientId: clientId,
        },
      );
    },

    deletePendingMessage(clientId: string): void {
      database.runSync(`DELETE FROM pending_messages WHERE clientId = $clientId`, {
        $clientId: clientId,
      });
    },

    getPendingMessages(conversationId: string): ClientMessage[] {
      const rows = database.getAllSync<
        ClientMessage & { failureReason: MessageFailureReason | null }
      >(
        `SELECT clientId, conversationId, text, createdAt, status, failureReason
         FROM pending_messages
         WHERE conversationId = $conversationId
         ORDER BY createdAt ASC`,
        { $conversationId: conversationId },
      );

      return rows.map(({ failureReason, ...row }) => ({
        ...row,
        ...(failureReason !== null ? { failureReason } : {}),
      }));
    },

    isClientIdAccepted(clientId: string): boolean {
      const row = database.getFirstSync<{ clientId: string }>(
        `SELECT clientId FROM accepted_client_ids WHERE clientId = $clientId`,
        { $clientId: clientId },
      );

      return row !== null;
    },

    recordAcceptedClientId(clientId: string, serverId: string): void {
      database.runSync(
        `INSERT OR IGNORE INTO accepted_client_ids (clientId, serverId) VALUES ($clientId, $serverId)`,
        { $clientId: clientId, $serverId: serverId },
      );
    },

    insertMessage(message: ServerMessage): void {
      database.runSync(
        `INSERT OR IGNORE INTO messages (serverId, clientId, conversationId, senderId, text, createdAt)
         VALUES ($serverId, $clientId, $conversationId, $senderId, $text, $createdAt)`,
        {
          $serverId: message.serverId,
          $clientId: message.clientId,
          $conversationId: message.conversationId,
          $senderId: message.senderId,
          $text: message.text,
          $createdAt: message.createdAt,
        },
      );
    },

    getThreadMessages(conversationId: string): ServerMessage[] {
      return database.getAllSync<ServerMessage>(
        `SELECT serverId, clientId, conversationId, senderId, text, createdAt
         FROM messages
         WHERE conversationId = $conversationId
         ORDER BY createdAt ASC`,
        { $conversationId: conversationId },
      );
    },

    insertMessages(messages: ServerMessage[]): void {
      database.withTransactionSync(() => {
        for (const message of messages) {
          database.runSync(
            `INSERT OR IGNORE INTO messages (serverId, clientId, conversationId, senderId, text, createdAt)
             VALUES ($serverId, $clientId, $conversationId, $senderId, $text, $createdAt)`,
            {
              $serverId: message.serverId,
              $clientId: message.clientId,
              $conversationId: message.conversationId,
              $senderId: message.senderId,
              $text: message.text,
              $createdAt: message.createdAt,
            },
          );
        }
      });
    },

    countMessages(conversationId: string): number {
      const row = database.getFirstSync<{ count: number }>(
        `SELECT COUNT(*) as count FROM messages WHERE conversationId = $conversationId`,
        { $conversationId: conversationId },
      );

      return row?.count ?? 0;
    },

    getThreadMessagesPage(
      conversationId: string,
      options: { limit: number; before?: MessagePageCursor },
    ): ServerMessage[] {
      if (options.before === undefined) {
        return database.getAllSync<ServerMessage>(
          `SELECT serverId, clientId, conversationId, senderId, text, createdAt
           FROM messages
           WHERE conversationId = $conversationId
           ORDER BY createdAt DESC, serverId DESC
           LIMIT $limit`,
          { $conversationId: conversationId, $limit: options.limit },
        );
      }

      return database.getAllSync<ServerMessage>(
        `SELECT serverId, clientId, conversationId, senderId, text, createdAt
         FROM messages
         WHERE conversationId = $conversationId
           AND (createdAt < $beforeCreatedAt
                OR (createdAt = $beforeCreatedAt AND serverId < $beforeServerId))
         ORDER BY createdAt DESC, serverId DESC
         LIMIT $limit`,
        {
          $conversationId: conversationId,
          $beforeCreatedAt: options.before.createdAt,
          $beforeServerId: options.before.serverId,
          $limit: options.limit,
        },
      );
    },
  };
}
