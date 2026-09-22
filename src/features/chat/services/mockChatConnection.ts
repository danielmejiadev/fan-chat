import type { ChatConnection } from "@/features/chat/services/chatConnection";
import { flushPendingMessages, syncThread } from "@/features/chat/services/chatService";

const POLL_INTERVAL_MS = 5000;

export const mockChatConnection: ChatConnection = {
  connect(conversationId, senderId, onChange) {
    const forceSync = () => {
      flushPendingMessages(conversationId, senderId);
      syncThread(conversationId);
      onChange();
    };

    forceSync();
    const intervalId = setInterval(forceSync, POLL_INTERVAL_MS);

    return {
      forceSync,
      disconnect: () => clearInterval(intervalId),
    };
  },
};
