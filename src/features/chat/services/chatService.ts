import { ContentRejectedError } from "@/mockApi/chat/mockChatBackend";
import { getConversationBackend } from "@/mockApi/chat/chatBackendRegistry";
import { createSqliteChatStore } from "@/features/chat/storage/chatDatabase";
import type { ChatStore } from "@/features/chat/storage/chatStore";
import {
  MessageFailureReason,
  MessageStatus,
  type ClientMessage,
  type ServerMessage,
} from "@/features/chat/types";
import { generateUuid } from "@/utils/generateUuid";

let defaultStore: ChatStore | null = null;
const conversationIdsWithDroppedResponse = new Set<string>();
const conversationIdsWithRejectedContent = new Set<string>();

/**
 * Debug-only: makes the next flushPendingMessages() call for this
 * conversation accept the send on the backend but drop the response, so the
 * client sees it as failed and a retry exercises the same dedupe path as a
 * real lost response. Consumed once, then cleared automatically.
 */
export function dropNextResponse(conversationId: string): void {
  conversationIdsWithDroppedResponse.add(conversationId);
}

/**
 * Debug-only: makes the next flushPendingMessages() call for this
 * conversation reject the send outright (never accepted by the backend) —
 * the non-recoverable failure case, where retrying is pointless. Consumed
 * once, then cleared automatically.
 */
export function rejectNextMessage(conversationId: string): void {
  conversationIdsWithRejectedContent.add(conversationId);
}

/**
 * Debug-only: simulates the other participant sending `count` messages while
 * this device may be offline — only visible to the client on its next
 * syncThread(), same as any other backend-side change.
 */
export function simulateIncomingMessages(
  conversationId: string,
  senderId: string,
  texts: string[],
): void {
  const backend = getConversationBackend(conversationId);

  for (const text of texts) {
    backend.receiveIncomingMessage(conversationId, senderId, text);
  }
}

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

  const shouldDropNextResponse = conversationIdsWithDroppedResponse.delete(conversationId);
  const shouldRejectNextMessage = conversationIdsWithRejectedContent.delete(conversationId);

  for (const [index, pendingMessage] of pendingMessages.entries()) {
    chatStore.updatePendingMessageStatus(pendingMessage.clientId, MessageStatus.Sent);

    try {
      const serverMessage = backend.submitMessage(pendingMessage, senderId, {
        dropResponse: shouldDropNextResponse && index === 0,
        rejectContent: shouldRejectNextMessage && index === 0,
      });

      chatStore.recordAcceptedClientId(pendingMessage.clientId, serverMessage.serverId);
      chatStore.insertMessage(serverMessage);
      chatStore.deletePendingMessage(pendingMessage.clientId);
    } catch (error) {
      const failureReason =
        error instanceof ContentRejectedError
          ? MessageFailureReason.Rejected
          : MessageFailureReason.Recoverable;

      chatStore.updatePendingMessageStatus(
        pendingMessage.clientId,
        MessageStatus.Failed,
        failureReason,
      );
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
