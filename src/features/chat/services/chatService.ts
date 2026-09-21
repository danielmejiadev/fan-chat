import { createSqliteChatStore } from "@/features/chat/storage/chatDatabase";
import type { ChatStore } from "@/features/chat/storage/chatStore";
import { MessageStatus, type ClientMessage, type ServerMessage } from "@/features/chat/types";
import { generateClientId } from "@/features/chat/utils/generateClientId";
import type { MockChatBackend } from "@/features/chat/services/mockChatBackend";

let defaultStore: ChatStore | null = null;

function resolveStore(store?: ChatStore): ChatStore {
  if (store !== undefined) {
    return store;
  }

  if (defaultStore === null) {
    defaultStore = createSqliteChatStore();
  }

  return defaultStore;
}

/**
 * Writes the message to the local outbox before any network attempt, so it
 * survives a force-quit while still "pending".
 */
export function enqueueMessage(
  conversationId: string,
  text: string,
  store?: ChatStore,
): ClientMessage {
  const message: ClientMessage = {
    clientId: generateClientId(),
    conversationId,
    text,
    createdAt: Date.now(),
    status: MessageStatus.Pending,
  };

  resolveStore(store).insertPendingMessage(message);

  return message;
}

/**
 * Attempts to deliver every pending message for a conversation. A lost
 * response (ResponseLostError) leaves the message "failed" locally with its
 * text intact — a later retry reuses the same clientId, so a backend that
 * dedupes by clientId resolves it to a single message no matter how many
 * times this runs.
 */
export function flushPendingMessages(
  backend: MockChatBackend,
  conversationId: string,
  senderId: string,
  store?: ChatStore,
): void {
  const chatStore = resolveStore(store);
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
export function receiveMessages(serverMessages: ServerMessage[], store?: ChatStore): void {
  const chatStore = resolveStore(store);

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
export function syncThread(
  backend: MockChatBackend,
  conversationId: string,
  store?: ChatStore,
): void {
  receiveMessages(backend.listMessages(conversationId), store);
}

export function getConfirmedThread(conversationId: string, store?: ChatStore): ServerMessage[] {
  return resolveStore(store).getThreadMessages(conversationId);
}

/**
 * The newest `limit` confirmed messages. Grows the window instead of
 * accumulating cursor pages — simpler to keep correct while the thread also
 * gets new messages from reconciliation, at the cost of re-reading the whole
 * window on every call. Fine at this scale; worth revisiting in Phase 5 if
 * profiling shows it's the bottleneck on the 50k-message conversation.
 */
export function getThreadWindow(
  conversationId: string,
  limit: number,
  store?: ChatStore,
): ServerMessage[] {
  return resolveStore(store).getThreadMessagesPage(conversationId, { limit });
}

export function getPendingMessages(conversationId: string, store?: ChatStore): ClientMessage[] {
  return resolveStore(store).getPendingMessages(conversationId);
}
