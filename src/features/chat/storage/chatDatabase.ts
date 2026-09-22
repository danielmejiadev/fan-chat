import { and, count, desc, eq, lt, ne, or } from "drizzle-orm";

import { getAppDatabase } from "@/lib/database";
import { messages } from "@/features/chat/storage/schema";
import type { ChatStore } from "@/features/chat/storage/chatStore";
import { MessageStatus, type Message } from "@/features/chat/types";

/** Wipes the chat table — used by the demo's reset action, never in normal app flow. */
export async function clearChatData(): Promise<void> {
  const database = getAppDatabase();

  await database.delete(messages);
}

function toMessage(row: typeof messages.$inferSelect): Message {
  return {
    id: row.id,
    serverId: row.serverId,
    clientId: row.clientId,
    conversationId: row.conversationId,
    senderId: row.senderId,
    text: row.text,
    createdAt: row.createdAt,
    status: row.status as MessageStatus,
    failureReason: row.failureReason as Message["failureReason"],
  };
}

export function createSqliteChatStore(): ChatStore {
  const database = getAppDatabase();

  return {
    async insertMessage(message: Message): Promise<void> {
      await database.insert(messages).values(message).onConflictDoNothing();
    },

    async insertMessages(newMessages: Message[]): Promise<void> {
      await database.transaction(async (transaction) => {
        for (const message of newMessages) {
          await transaction.insert(messages).values(message).onConflictDoNothing();
        }
      });
    },

    async updateMessage(id, update): Promise<void> {
      await database.update(messages).set(update).where(eq(messages.id, id));
    },

    async getNonConfirmedMessages(conversationId: string): Promise<Message[]> {
      const rows = await database
        .select()
        .from(messages)
        .where(
          and(eq(messages.conversationId, conversationId), ne(messages.status, MessageStatus.Confirmed)),
        )
        .orderBy(messages.createdAt);

      return rows.map(toMessage);
    },

    async countConfirmedMessages(conversationId: string): Promise<number> {
      const rows = await database
        .select({ count: count() })
        .from(messages)
        .where(
          and(eq(messages.conversationId, conversationId), eq(messages.status, MessageStatus.Confirmed)),
        );

      return rows[0]?.count ?? 0;
    },

    async getConfirmedMessagesPage(conversationId, options): Promise<Message[]> {
      const { before } = options;

      const whereClause =
        before === undefined
          ? and(eq(messages.conversationId, conversationId), eq(messages.status, MessageStatus.Confirmed))
          : and(
              eq(messages.conversationId, conversationId),
              eq(messages.status, MessageStatus.Confirmed),
              or(
                lt(messages.createdAt, before.createdAt),
                and(
                  eq(messages.createdAt, before.createdAt),
                  lt(messages.serverId, before.serverId),
                ),
              ),
            );

      const rows = await database
        .select()
        .from(messages)
        .where(whereClause)
        .orderBy(desc(messages.createdAt), desc(messages.serverId))
        .limit(options.limit);

      return rows.map(toMessage);
    },
  };
}
