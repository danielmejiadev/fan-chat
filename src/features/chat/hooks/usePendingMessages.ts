import { useCallback, useEffect, useState } from "react";

import { enqueueMessage, getPendingMessages } from "@/features/chat/services/chatService";
import { MessageStatus, type ClientMessage } from "@/features/chat/types";

export type UsePendingMessagesResult = {
  pendingMessages: ClientMessage[];
  send: (text: string) => void;
  isFailed: (clientId: string) => boolean;
  refresh: () => void;
};

/**
 * Owns the optimistic/outbox side of a thread — messages the local device
 * has queued but the server hasn't confirmed yet.
 */
export function usePendingMessages(conversationId: string): UsePendingMessagesResult {
  const [pendingMessages, setPendingMessages] = useState<ClientMessage[]>([]);

  const refresh = useCallback(() => {
    void getPendingMessages(conversationId).then(setPendingMessages);
  }, [conversationId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const send = useCallback(
    (text: string) => {
      void enqueueMessage(conversationId, text).then((message) => {
        setPendingMessages((currentPendingMessages) => [...currentPendingMessages, message]);
        refresh();
      });
    },
    [conversationId, refresh],
  );

  const isFailed = useCallback(
    (clientId: string) =>
      pendingMessages.some(
        (pendingMessage) =>
          pendingMessage.clientId === clientId && pendingMessage.status === MessageStatus.Failed,
      ),
    [pendingMessages],
  );

  return { pendingMessages, send, isFailed, refresh };
}
