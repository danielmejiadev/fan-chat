import { useCallback } from "react";

import { useChatConnection } from "@/features/chat/hooks/useChatConnection";
import { useMessages } from "@/features/chat/hooks/useMessages";
import { submitPendingMessages } from "@/features/chat/services/chatService";
import type { Message } from "@/features/chat/types";

export type UseChatThreadResult = {
  messages: Message[];
  sendMessage: (text: string) => void;
  retryMessage: (id: string) => void;
  loadOlderMessages: () => void;
  hasMoreOlderMessages: boolean;
};

/** Assumes it's remounted per conversationId, so nothing here detects a conversation change itself. */
export function useChatThread(conversationId: string, senderId: string): UseChatThreadResult {
  const { messages, hasMoreOlderMessages, loadOlderMessages, enqueue, isFailed, refresh } =
    useMessages(conversationId, senderId);

  useChatConnection(conversationId, senderId, refresh);

  // Submits to the mock backend and reconciles the result — used right
  // after a fresh send and after a manual retry. This talks to chatService
  // directly; it never goes through mockChatConnection.
  const submit = useCallback(() => {
    void submitPendingMessages(conversationId, senderId).then(refresh);
  }, [conversationId, senderId, refresh]);

  const sendMessage = useCallback(
    (text: string) => {
      void enqueue(text).then(submit);
    },
    [enqueue, submit],
  );

  const retryMessage = useCallback(
    (id: string) => {
      if (isFailed(id)) {
        submit();
      }
    },
    [isFailed, submit],
  );

  return { messages, sendMessage, retryMessage, loadOlderMessages, hasMoreOlderMessages };
}
