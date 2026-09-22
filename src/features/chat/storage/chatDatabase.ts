import { and, count, desc, eq, lt, or } from "drizzle-orm";

import { getAppDatabase } from "@/lib/database";
import { acceptedClientIds, messages, pendingMessages } from "@/features/chat/storage/schema";
import type { ChatStore, MessagePageCursor } from "@/features/chat/storage/chatStore";
import type {
  ClientMessage,
  MessageFailureReason,
  MessageStatus,
  ServerMessage,
} from "@/features/chat/types";

/** Wipes every chat table — used by the demo's reset action, never in normal app flow. */
export async function clearChatData(): Promise<void> {
  const database = getAppDatabase();

  await database.delete(pendingMessages);
  await database.delete(acceptedClientIds);
  await database.delete(messages);
}

export function createSqliteChatStore(): ChatStore {
  const database = getAppDatabase();

  return {
    async insertPendingMessage(message: ClientMessage): Promise<void> {
      await database.insert(pendingMessages).values({
        clientId: message.clientId,
        conversationId: message.conversationId,
        text: message.text,
        createdAt: message.createdAt,
        status: message.status,
      });
    },

    async updatePendingMessageStatus(
      clientId: string,
      status: MessageStatus,
      failureReason?: MessageFailureReason,
    ): Promise<void> {
      await database
        .update(pendingMessages)
        .set({ status, failureReason: failureReason ?? null })
        .where(eq(pendingMessages.clientId, clientId));
    },

    async deletePendingMessage(clientId: string): Promise<void> {
      await database.delete(pendingMessages).where(eq(pendingMessages.clientId, clientId));
    },

    async getPendingMessages(conversationId: string): Promise<ClientMessage[]> {
      const rows = await database
        .select()
        .from(pendingMessages)
        .where(eq(pendingMessages.conversationId, conversationId))
        .orderBy(pendingMessages.createdAt);

      return rows.map(({ failureReason, ...row }) => ({
        ...row,
        status: row.status as MessageStatus,
        ...(failureReason !== null ? { failureReason: failureReason as MessageFailureReason } : {}),
      }));
    },

    async isClientIdAccepted(clientId: string): Promise<boolean> {
      const rows = await database
        .select({ clientId: acceptedClientIds.clientId })
        .from(acceptedClientIds)
        .where(eq(acceptedClientIds.clientId, clientId))
        .limit(1);

      return rows.length > 0;
    },

    async recordAcceptedClientId(clientId: string, serverId: string): Promise<void> {
      await database.insert(acceptedClientIds).values({ clientId, serverId }).onConflictDoNothing();
    },

    async insertMessage(message: ServerMessage): Promise<void> {
      await database.insert(messages).values(message).onConflictDoNothing();
    },

    async getThreadMessages(conversationId: string): Promise<ServerMessage[]> {
      const rows = await database
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conversationId))
        .orderBy(messages.createdAt);

      return rows;
    },

    async insertMessages(newMessages: ServerMessage[]): Promise<void> {
      await database.transaction(async (transaction) => {
        for (const message of newMessages) {
          await transaction.insert(messages).values(message).onConflictDoNothing();
        }
      });
    },

    async countMessages(conversationId: string): Promise<number> {
      const rows = await database
        .select({ count: count() })
        .from(messages)
        .where(eq(messages.conversationId, conversationId));

      return rows[0]?.count ?? 0;
    },

    async getThreadMessagesPage(
      conversationId: string,
      options: { limit: number; before?: MessagePageCursor },
    ): Promise<ServerMessage[]> {
      const { before } = options;

      const whereClause =
        before === undefined
          ? eq(messages.conversationId, conversationId)
          : and(
              eq(messages.conversationId, conversationId),
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

      return rows;
    },
  };
}
