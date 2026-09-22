import NetInfo from "@react-native-community/netinfo";

import { ContentRejectedError } from "@/mockApi/chat/mockChatBackend";
import { getConversationBackend } from "@/mockApi/chat/chatBackendRegistry";
import { createSqliteChatStore } from "@/features/chat/storage/chatDatabase";
import type { ChatStore, MessagePageCursor } from "@/features/chat/storage/chatStore";
import { MessageFailureReason, MessageStatus, type Message } from "@/features/chat/types";
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
 * Writes the message to the store before any network attempt, so it
 * survives a force-quit while still "pending". Its id is the clientId —
 * fixed for the rest of this message's life, even once it's Confirmed.
 */
export async function enqueueMessage(
  conversationId: string,
  senderId: string,
  text: string,
): Promise<Message> {
  const clientId = generateUuid();
  const message: Message = {
    id: clientId,
    serverId: null,
    clientId,
    conversationId,
    senderId,
    text,
    createdAt: Date.now(),
    status: MessageStatus.Pending,
    failureReason: null,
  };

  await resolveStore().insertMessage(message);

  return message;
}

/**
 * Attempts to deliver every Pending/Sent/Failed message for a conversation.
 * Submitting only gets the message *accepted* (status → Sent, single check)
 * — the backend itself surfaces the confirmed message into its canonical
 * thread asynchronously, after its own simulated delay (see
 * mockChatBackend.ts). This function does not wait for that; the message is
 * promoted to Confirmed (double check) later, by receiveMessages(), once
 * syncThread()/polling observes it in the backend's thread.
 *
 * A lost response (ResponseLostError) leaves the message Failed locally with
 * its text intact — a later retry reuses the same id, so a backend that
 * dedupes by clientId resolves it to a single message no matter how many
 * times this runs.
 *
 * No-ops while offline, leaving queued messages Pending (clock icon) instead
 * of reaching the backend — mockChatConnection's own reconcile() picks them
 * up once NetInfo reports reconnection.
 */
export async function flushPendingMessages(
  conversationId: string,
  senderId: string,
): Promise<void> {
  const networkState = await NetInfo.fetch();

  if (networkState.isConnected === false) {
    return;
  }

  const chatStore = resolveStore();
  const backend = getConversationBackend(conversationId);
  const nonConfirmedMessages = await chatStore.getNonConfirmedMessages(conversationId);

  const shouldDropNextResponse = conversationIdsWithDroppedResponse.delete(conversationId);
  const shouldRejectNextMessage = conversationIdsWithRejectedContent.delete(conversationId);

  for (const [index, message] of nonConfirmedMessages.entries()) {
    await chatStore.updateMessage(message.id, { status: MessageStatus.Sent, failureReason: null });

    try {
      await backend.submitMessage(message, senderId, {
        dropResponse: shouldDropNextResponse && index === 0,
        rejectContent: shouldRejectNextMessage && index === 0,
      });
    } catch (error) {
      const failureReason =
        error instanceof ContentRejectedError
          ? MessageFailureReason.Rejected
          : MessageFailureReason.Recoverable;

      await chatStore.updateMessage(message.id, { status: MessageStatus.Failed, failureReason });
    }
  }
}

/**
 * Reconciles messages from the backend's canonical thread — the other
 * participant's messages, or this device's own submissions finally
 * surfacing as confirmed. A message with a clientId is this device's own:
 * it already has a row (inserted by enqueueMessage), so it's promoted in
 * place with a single UPDATE. A message without one came from the other
 * participant and is being seen for the first time, so it's INSERTed —
 * deduped by id (its serverId), so replaying the same batch never
 * duplicates the thread.
 */
export async function receiveMessages(confirmedMessages: Message[]): Promise<void> {
  const chatStore = resolveStore();

  for (const confirmedMessage of confirmedMessages) {
    if (confirmedMessage.clientId !== null) {
      await chatStore.updateMessage(confirmedMessage.clientId, {
        status: MessageStatus.Confirmed,
        serverId: confirmedMessage.serverId,
        failureReason: null,
      });
    } else {
      await chatStore.insertMessage(confirmedMessage);
    }
  }
}

/**
 * Pulls the backend's canonical thread and reconciles it locally — the
 * "reconnect" path. A client only learns about its own submissions through
 * submitMessage's return value, so this is what surfaces messages the
 * backend accepted while the client was offline or a response was lost.
 */
export async function syncThread(conversationId: string): Promise<void> {
  const backend = getConversationBackend(conversationId);

  await receiveMessages(backend.listMessages(conversationId));
}

/**
 * Submits whatever's currently queued for a conversation to the mock
 * backend and immediately reconciles the response — used right after a
 * fresh send and when retrying a failed message. This is the entire
 * request/response round trip for that one action; it does not depend on
 * mockChatConnection at all. Backend-side changes this device didn't
 * initiate (an incoming message, another device's own submission) still
 * reach the client through mockChatConnection's own backend subscription.
 */
export async function submitPendingMessages(
  conversationId: string,
  senderId: string,
): Promise<void> {
  await flushPendingMessages(conversationId, senderId);
  await syncThread(conversationId);
}

/**
 * Every Confirmed message for a conversation, oldest first. Test-only
 * convenience — the app itself only ever reads a bounded page (see
 * getConfirmedMessagesPage).
 */
export async function getConfirmedThread(conversationId: string): Promise<Message[]> {
  const newestFirstPage = await resolveStore().getConfirmedMessagesPage(conversationId, {
    limit: Number.MAX_SAFE_INTEGER,
  });

  return newestFirstPage.slice().reverse();
}

export async function getConfirmedMessagesPage(
  conversationId: string,
  limit: number,
  before?: MessagePageCursor,
): Promise<Message[]> {
  return resolveStore().getConfirmedMessagesPage(conversationId, { limit, before });
}

export async function getNonConfirmedMessages(conversationId: string): Promise<Message[]> {
  return resolveStore().getNonConfirmedMessages(conversationId);
}
