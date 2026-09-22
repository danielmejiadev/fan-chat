import { useCallback } from "react";

import { useChatConnection } from "@/features/chat/hooks/useChatConnection";
import { useConfirmedMessages } from "@/features/chat/hooks/useConfirmedMessages";
import { usePendingMessages } from "@/features/chat/hooks/usePendingMessages";
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
    send: sendPendingMessage,
    isFailed: isPendingMessageFailed,
    refresh: refreshPendingMessages,
  } = usePendingMessages(conversationId);

  const refresh = useCallback(() => {
    refreshConfirmedMessages();
    refreshPendingMessages();
  }, [refreshConfirmedMessages, refreshPendingMessages]);

  const { forceSync } = useChatConnection(conversationId, senderId, refresh);

  const sendMessage = useCallback(
    (text: string) => {
      sendPendingMessage(text);
      forceSync();
    },
    [sendPendingMessage, forceSync],
  );

  const retryMessage = useCallback(
    (clientId: string) => {
      if (isPendingMessageFailed(clientId)) {
        forceSync();
      }
    },
    [isPendingMessageFailed, forceSync],
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
