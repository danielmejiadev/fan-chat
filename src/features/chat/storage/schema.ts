import { index, sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

/**
 * The single source of truth for every conversation's thread — pending,
 * sent, failed, and confirmed messages all live here as one row each. See
 * types.ts for what `id` means and why a row is only ever inserted once and
 * then updated in place.
 */
export const messages = sqliteTable(
  "messages",
  {
    id: text("id").primaryKey(),
    serverId: text("serverId"),
    clientId: text("clientId"),
    conversationId: text("conversationId").notNull(),
    senderId: text("senderId").notNull(),
    text: text("text").notNull(),
    createdAt: integer("createdAt").notNull(),
    status: text("status").notNull(),
    failureReason: text("failureReason"),
  },
  (table) => [
    index("idx_messages_conversation_created").on(table.conversationId, table.createdAt),
    index("idx_messages_conversation_status").on(table.conversationId, table.status),
  ],
);
