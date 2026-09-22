import { useEffect } from "react";

import { mockChatConnection } from "@/mockApi/chat/mockChatConnection";

/**
 * Opens the connection on mount, closes it on unmount. The connection is
 * fully event-driven and self-contained (see mockChatConnection.ts) — it
 * owns its own backend subscription, NetInfo reconnect listener, and
 * AppState foreground listener, and calls onChange whenever there's
 * something new worth reading. This hook has nothing else to expose.
 */
export function useChatConnection(
  conversationId: string,
  senderId: string,
  onChange: () => void,
): void {
  useEffect(() => {
    const connection = mockChatConnection.connect(conversationId, senderId, onChange);

    return () => {
      connection.disconnect();
    };
  }, [conversationId, senderId, onChange]);
}
