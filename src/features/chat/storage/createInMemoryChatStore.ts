import type { ChatStore } from "@/features/chat/storage/chatStore";
import type { ClientMessage, ServerMessage } from "@/features/chat/types";

/**
 * In-memory ChatStore for tests — expo-sqlite is a native module that does
 * not run under Jest/Node, so unit tests exercise the same ChatStore
 * contract against this fake instead of createSqliteChatStore. Stays
 * logically synchronous internally; only the return values are wrapped in
 * Promises to satisfy the async ChatStore contract.
 */
export function createInMemoryChatStore(): ChatStore {
  const pendingMessages = new Map<string, ClientMessage>();
  const acceptedClientIds = new Map<string, string>();
  const messages = new Map<string, ServerMessage>();

  return {
    async insertPendingMessage(message) {
      pendingMessages.set(message.clientId, message);
    },
    async updatePendingMessageStatus(clientId, status, failureReason) {
      const existing = pendingMessages.get(clientId);
      if (existing !== undefined) {
        pendingMessages.set(clientId, { ...existing, status, failureReason });
      }
    },
    async deletePendingMessage(clientId) {
      pendingMessages.delete(clientId);
    },
    async getPendingMessages(conversationId) {
      return Array.from(pendingMessages.values())
        .filter((message) => message.conversationId === conversationId)
        .sort((a, b) => a.createdAt - b.createdAt);
    },
    async isClientIdAccepted(clientId) {
      return acceptedClientIds.has(clientId);
    },
    async recordAcceptedClientId(clientId, serverId) {
      acceptedClientIds.set(clientId, serverId);
    },
    async insertMessage(message) {
      if (!messages.has(message.serverId)) {
        messages.set(message.serverId, message);
      }
    },
    async getThreadMessages(conversationId) {
      return Array.from(messages.values())
        .filter((message) => message.conversationId === conversationId)
        .sort((a, b) => a.createdAt - b.createdAt);
    },
    async insertMessages(newMessages) {
      for (const message of newMessages) {
        if (!messages.has(message.serverId)) {
          messages.set(message.serverId, message);
        }
      }
    },
    async countMessages(conversationId) {
      let count = 0;
      for (const message of messages.values()) {
        if (message.conversationId === conversationId) {
          count += 1;
        }
      }
      return count;
    },
    async getThreadMessagesPage(conversationId, options) {
      const { before } = options;

      return Array.from(messages.values())
        .filter((message) => message.conversationId === conversationId)
        .filter((message) => {
          if (before === undefined) {
            return true;
          }
          if (message.createdAt !== before.createdAt) {
            return message.createdAt < before.createdAt;
          }
          return message.serverId < before.serverId;
        })
        .sort((a, b) => {
          if (a.createdAt !== b.createdAt) {
            return b.createdAt - a.createdAt;
          }
          return b.serverId.localeCompare(a.serverId);
        })
        .slice(0, options.limit);
    },
  };
}
