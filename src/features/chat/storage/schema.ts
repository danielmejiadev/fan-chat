import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * The local outbox: written before a message is ever sent, so it survives a
 * force-quit while still "pending". See chatDatabase.ts for how it's
 * reconciled against `messages`.
 */
export const pendingMessages = sqliteTable(
  "pending_messages",
  {
    clientId: text("clientId").primaryKey(),
    conversationId: text("conversationId").notNull(),
    text: text("text").notNull(),
    createdAt: integer("createdAt").notNull(),
    status: text("status").notNull(),
    failureReason: text("failureReason"),
  },
  (table) => [index("idx_pending_messages_conversation").on(table.conversationId, table.createdAt)],
);

/**
 * Idempotency table kept separate from the outbox — the mock backend
 * consults it to tell a genuine retry from a duplicate submit.
 */
export const acceptedClientIds = sqliteTable("accepted_client_ids", {
  clientId: text("clientId").primaryKey(),
  serverId: text("serverId").notNull(),
});

/** The reconciled thread as confirmed by the mock backend. */
export const messages = sqliteTable(
  "messages",
  {
    serverId: text("serverId").primaryKey(),
    clientId: text("clientId"),
    conversationId: text("conversationId").notNull(),
    senderId: text("senderId").notNull(),
    text: text("text").notNull(),
    createdAt: integer("createdAt").notNull(),
  },
  (table) => [index("idx_messages_conversation").on(table.conversationId, table.createdAt)],
);
