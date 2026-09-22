import { useCallback, useEffect, useRef, useState } from "react";

import { enqueueMessage, getPendingMessages } from "@/features/chat/services/chatService";
import { MessageStatus, type ClientMessage } from "@/features/chat/types";

export type UsePendingMessagesResult = {
  pendingMessages: ClientMessage[];
  enqueue: (text: string) => Promise<void>;
  isFailed: (clientId: string) => boolean;
  refresh: () => void;
};

/**
 * Owns the optimistic/outbox side of a thread — messages the local device
 * has queued but the server hasn't confirmed yet. Submitting a queued
 * message to the mock backend is the caller's job (see useChatThread), since
 * that step also needs to refresh the confirmed thread.
 */
export function usePendingMessages(conversationId: string): UsePendingMessagesResult {
  const [pendingMessages, setPendingMessages] = useState<ClientMessage[]>([]);
  // Several sources can trigger a refresh (mount, a fresh enqueue, the
  // connection's own reconcile). Each call does its own DB read, and those
  // reads can resolve out of order — without this guard, an older read
  // landing after a newer one can overwrite fresh state with a stale
  // snapshot that's missing a just-sent message. Only the most recently
  // *issued* read is allowed to apply its result.
  const latestRequestId = useRef(0);

  const refresh = useCallback(() => {
    const requestId = ++latestRequestId.current;

    void getPendingMessages(conversationId).then((messages) => {
      if (requestId === latestRequestId.current) {
        setPendingMessages(messages);
      }
    });
  }, [conversationId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const enqueue = useCallback(
    (text: string) =>
      enqueueMessage(conversationId, text).then((message) => {
        // Bumps the request id so any refresh() already in flight can't
        // overwrite this optimistic add when it resolves.
        latestRequestId.current += 1;
        setPendingMessages((currentPendingMessages) => [...currentPendingMessages, message]);
      }),
    [conversationId],
  );

  const isFailed = useCallback(
    (clientId: string) =>
      pendingMessages.some(
        (pendingMessage) =>
          pendingMessage.clientId === clientId && pendingMessage.status === MessageStatus.Failed,
      ),
    [pendingMessages],
  );

  return { pendingMessages, enqueue, isFailed, refresh };
}
