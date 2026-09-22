import { useCallback, useState } from "react";

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
  const [pendingMessages, setPendingMessages] = useState<ClientMessage[]>(() =>
    getPendingMessages(conversationId),
  );

  const refresh = useCallback(() => {
    setPendingMessages(getPendingMessages(conversationId));
  }, [conversationId]);

  const send = useCallback(
    (text: string) => {
      enqueueMessage(conversationId, text);
      refresh();
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
