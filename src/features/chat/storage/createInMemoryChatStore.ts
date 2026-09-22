import type { ChatStore } from "@/features/chat/storage/chatStore";
import { MessageStatus, type Message } from "@/features/chat/types";

/**
 * In-memory ChatStore for tests — expo-sqlite is a native module that does
 * not run under Jest/Node, so unit tests exercise the same ChatStore
 * contract against this fake instead of createSqliteChatStore. Stays
 * logically synchronous internally; only the return values are wrapped in
 * Promises to satisfy the async ChatStore contract.
 */
export function createInMemoryChatStore(): ChatStore {
  const messages = new Map<string, Message>();

  return {
    async insertMessage(message) {
      if (!messages.has(message.id)) {
        messages.set(message.id, message);
      }
    },
    async insertMessages(newMessages) {
      for (const message of newMessages) {
        if (!messages.has(message.id)) {
          messages.set(message.id, message);
        }
      }
    },
    async updateMessage(id, update) {
      const existing = messages.get(id);
      if (existing !== undefined) {
        messages.set(id, { ...existing, ...update });
      }
    },
    async getNonConfirmedMessages(conversationId) {
      return Array.from(messages.values())
        .filter(
          (message) =>
            message.conversationId === conversationId && message.status !== MessageStatus.Confirmed,
        )
        .sort((a, b) => a.createdAt - b.createdAt);
    },
    async countConfirmedMessages(conversationId) {
      let total = 0;
      for (const message of messages.values()) {
        if (message.conversationId === conversationId && message.status === MessageStatus.Confirmed) {
          total += 1;
        }
      }
      return total;
    },
    async getConfirmedMessagesPage(conversationId, options) {
      const { before } = options;

      return Array.from(messages.values())
        .filter(
          (message) =>
            message.conversationId === conversationId && message.status === MessageStatus.Confirmed,
        )
        .filter((message) => {
          if (before === undefined) {
            return true;
          }
          if (message.createdAt !== before.createdAt) {
            return message.createdAt < before.createdAt;
          }
          return (message.serverId ?? "") < before.serverId;
        })
        .sort((a, b) => {
          if (a.createdAt !== b.createdAt) {
            return b.createdAt - a.createdAt;
          }
          return (b.serverId ?? "").localeCompare(a.serverId ?? "");
        })
        .slice(0, options.limit);
    },
  };
}
