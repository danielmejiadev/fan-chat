import NetInfo from "@react-native-community/netinfo";

import type { ChatConnection } from "@/mockApi/chat/chatConnection";
import { flushPendingMessages, syncThread } from "@/features/chat/services/chatService";

const POLL_INTERVAL_MS = 5000;

export const mockChatConnection: ChatConnection = {
  connect(conversationId, senderId, onChange) {
    let isConnected = true;

    // Real disconnection: pending messages stay pending and nothing is
    // fetched until connectivity returns — matches sendMessage still
    // writing to the local outbox immediately either way.
    const forceSync = () => {
      if (isConnected) {
        flushPendingMessages(conversationId, senderId);
        syncThread(conversationId);
      }
      onChange();
    };

    forceSync();
    const intervalId = setInterval(forceSync, POLL_INTERVAL_MS);

    // Syncs right away on reconnect instead of waiting for the next poll tick.
    const netInfoUnsubscribe = NetInfo.addEventListener((state) => {
      const wasConnected = isConnected;
      isConnected = state.isConnected !== false;

      if (!wasConnected && isConnected) {
        forceSync();
      }
    });

    return {
      forceSync,
      disconnect: () => {
        clearInterval(intervalId);
        netInfoUnsubscribe();
      },
    };
  },
};
