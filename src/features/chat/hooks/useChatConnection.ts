import { useCallback, useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";

import { mockChatConnection } from "@/mockApi/chat/mockChatConnection";

export type UseChatConnectionResult = {
  forceSync: () => void;
};

/** Opens the connection on mount, closes it on unmount, and forces a sync when the app returns to the foreground. */
export function useChatConnection(
  conversationId: string,
  senderId: string,
  onChange: () => void,
): UseChatConnectionResult {
  const forceSyncRef = useRef<() => void>(() => {});

  useEffect(() => {
    const connection = mockChatConnection.connect(conversationId, senderId, onChange);
    forceSyncRef.current = connection.forceSync;

    const subscription = AppState.addEventListener("change", (nextAppState: AppStateStatus) => {
      if (nextAppState === "active") {
        connection.forceSync();
      }
    });

    return () => {
      connection.disconnect();
      subscription.remove();
    };
  }, [conversationId, senderId, onChange]);

  return {
    forceSync: useCallback(() => forceSyncRef.current(), []),
  };
}
