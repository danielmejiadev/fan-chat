import { getConversationBackend } from "@/features/chat/services/chatBackendRegistry";
import { createSqliteChatStore } from "@/features/chat/storage/chatDatabase";
import type { ChatStore } from "@/features/chat/storage/chatStore";
import { MessageStatus, type ClientMessage, type ServerMessage } from "@/features/chat/types";
import { generateUuid } from "@/utils/generateUuid";

let defaultStore: ChatStore | null = null;

function resolveStore(): ChatStore {
  if (defaultStore === null) {
    defaultStore = createSqliteChatStore();
  }

  return defaultStore;
}

/** Test-only: forces the next resolveStore() call to use this store instead of SQLite. */
export function setChatServiceStoreForTests(store: ChatStore): void {
  defaultStore = store;
}

/** Test-only: clears the cached store so each test starts from a fresh one. */
export function resetChatServiceStore(): void {
  defaultStore = null;
}

/**
 * Writes the message to the local outbox before any network attempt, so it
 * survives a force-quit while still "pending".
 */
export function enqueueMessage(conversationId: string, text: string): ClientMessage {
  const message: ClientMessage = {
    clientId: generateUuid(),
    conversationId,
    text,
    createdAt: Date.now(),
    status: MessageStatus.Pending,
  };

  resolveStore().insertPendingMessage(message);

  return message;
}

/**
 * Attempts to deliver every pending message for a conversation. A lost
 * response (ResponseLostError) leaves the message "failed" locally with its
 * text intact — a later retry reuses the same clientId, so a backend that
 * dedupes by clientId resolves it to a single message no matter how many
 * times this runs.
 */
export function flushPendingMessages(conversationId: string, senderId: string): void {
  const chatStore = resolveStore();
  const backend = getConversationBackend(conversationId);
  const pendingMessages = chatStore.getPendingMessages(conversationId);

  for (const pendingMessage of pendingMessages) {
    chatStore.updatePendingMessageStatus(pendingMessage.clientId, MessageStatus.Sent);

    try {
      const serverMessage = backend.submitMessage(pendingMessage, senderId);

      chatStore.recordAcceptedClientId(pendingMessage.clientId, serverMessage.serverId);
      chatStore.insertMessage(serverMessage);
      chatStore.deletePendingMessage(pendingMessage.clientId);
    } catch {
      chatStore.updatePendingMessageStatus(pendingMessage.clientId, MessageStatus.Failed);
    }
  }
}

/**
 * Reconciles incoming messages from the other participant (or from a
 * confirmed retry). insertMessage is keyed by serverId, so replaying the
 * same batch never duplicates the thread.
 */
export function receiveMessages(serverMessages: ServerMessage[]): void {
  const chatStore = resolveStore();

  for (const serverMessage of serverMessages) {
    chatStore.insertMessage(serverMessage);
  }
}

/**
 * Pulls the backend's canonical thread and reconciles it locally — the
 * "reconnect" path. A client only learns about its own submissions through
 * submitMessage's return value, so this is what surfaces messages the
 * backend accepted while the client was offline or a response was lost.
 */
export function syncThread(conversationId: string): void {
  const backend = getConversationBackend(conversationId);

  receiveMessages(backend.listMessages(conversationId));
}

export function getConfirmedThread(conversationId: string): ServerMessage[] {
  return resolveStore().getThreadMessages(conversationId);
}

/**
 * The newest `limit` confirmed messages. Re-reads the whole page on every
 * call instead of accumulating cursor pages — simpler to keep correct while
 * the thread also gets new messages from reconciliation, at the cost of
 * re-reading on every call. Fine at this scale; worth revisiting in Phase 5
 * if profiling shows it's the bottleneck on the 50k-message conversation.
 */
export function getConfirmedMessagesPage(conversationId: string, limit: number): ServerMessage[] {
  return resolveStore().getThreadMessagesPage(conversationId, { limit });
}

export function getPendingMessages(conversationId: string): ClientMessage[] {
  return resolveStore().getPendingMessages(conversationId);
}
