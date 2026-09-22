import { useCallback } from "react";

import { useChatConnection } from "@/features/chat/hooks/useChatConnection";
import { useConfirmedMessages } from "@/features/chat/hooks/useConfirmedMessages";
import { usePendingMessages } from "@/features/chat/hooks/usePendingMessages";
import { submitPendingMessages } from "@/features/chat/services/chatService";
import type { ThreadMessage } from "@/features/chat/types";
import { mergeThreadMessages } from "@/features/chat/utils/mergeThreadMessages";

export type UseChatThreadResult = {
  messages: ThreadMessage[];
  sendMessage: (text: string) => void;
  retryMessage: (clientId: string) => void;
  loadOlderMessages: () => void;
  hasMoreOlderMessages: boolean;
};

/** Assumes it's remounted per conversationId, so nothing here detects a conversation change itself. */
export function useChatThread(conversationId: string, senderId: string): UseChatThreadResult {
  const {
    confirmedMessages,
    hasMore: hasMoreOlderMessages,
    loadMore: loadOlderMessages,
    refresh: refreshConfirmedMessages,
  } = useConfirmedMessages(conversationId);

  const {
    pendingMessages,
    enqueue: enqueuePendingMessage,
    isFailed: isPendingMessageFailed,
    refresh: refreshPendingMessages,
  } = usePendingMessages(conversationId);

  // Confirmed messages must land in state before the message they replace is
  // dropped from the pending outbox — otherwise there's a window where it's
  // in neither list and its bubble briefly disappears.
  const refresh = useCallback(() => {
    void refreshConfirmedMessages().then(() => refreshPendingMessages());
  }, [refreshConfirmedMessages, refreshPendingMessages]);

  useChatConnection(conversationId, senderId, refresh);

  // Submits to the mock backend and reconciles the result — used right
  // after a fresh send and after a manual retry. This talks to chatService
  // directly; it never goes through mockChatConnection.
  const submit = useCallback(() => {
    void submitPendingMessages(conversationId, senderId).then(refresh);
  }, [conversationId, senderId, refresh]);

  const sendMessage = useCallback(
    (text: string) => {
      void enqueuePendingMessage(text).then(submit);
    },
    [enqueuePendingMessage, submit],
  );

  const retryMessage = useCallback(
    (clientId: string) => {
      if (isPendingMessageFailed(clientId)) {
        submit();
      }
    },
    [isPendingMessageFailed, submit],
  );

  const messages = mergeThreadMessages(confirmedMessages, pendingMessages);

  return {
    messages,
    sendMessage,
    retryMessage,
    loadOlderMessages,
    hasMoreOlderMessages,
  };
}
