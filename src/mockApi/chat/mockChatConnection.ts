import NetInfo from "@react-native-community/netinfo";

import type { ChatConnection } from "@/mockApi/chat/chatConnection";
import {
  flushPendingMessages,
  getPendingMessages,
  syncThread,
} from "@/features/chat/services/chatService";
import { DEFAULT_CONFIRMATION_DELAY_MS } from "@/mockApi/chat/mockChatBackend";
import { MessageStatus } from "@/features/chat/types";

const POLL_INTERVAL_MS = 5000;

/**
 * How long after a forceSync to check again for messages the mock backend
 * has since confirmed. Slightly above the backend's own confirmation delay
 * (see DEFAULT_CONFIRMATION_DELAY_MS) so the Sent → Confirmed (single check
 * → double check) promotion reads quickly in the UI instead of waiting for
 * the next regular POLL_INTERVAL_MS tick.
 */
const CONFIRMATION_FOLLOWUP_DELAY_MS = DEFAULT_CONFIRMATION_DELAY_MS + 100;

export const mockChatConnection: ChatConnection = {
  connect(conversationId, senderId, onChange) {
    let isConnected = true;

    // Real disconnection: pending messages stay pending and nothing is
    // fetched until connectivity returns — matches sendMessage still
    // writing to the local outbox immediately either way.
    const forceSync = () => {
      void (async () => {
        if (isConnected) {
          await flushPendingMessages(conversationId, senderId);
          await syncThread(conversationId);

          const hasMessagesAwaitingConfirmation = (await getPendingMessages(conversationId)).some(
            (message) => message.status === MessageStatus.Sent,
          );

          if (hasMessagesAwaitingConfirmation) {
            setTimeout(forceSync, CONFIRMATION_FOLLOWUP_DELAY_MS);
          }
        }
        onChange();
      })();
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
