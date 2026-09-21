import { useCallback, useEffect, useMemo, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";

import { getConversationBackend } from "@/features/chat/services/chatBackendRegistry";
import {
  enqueueMessage,
  flushPendingMessages,
  getConfirmedThread,
  getPendingMessages,
  syncThread,
} from "@/features/chat/services/chatService";
import type { MockChatBackend } from "@/features/chat/services/mockChatBackend";
import type { ChatStore } from "@/features/chat/storage/chatStore";
import { MessageStatus, type ThreadMessage } from "@/features/chat/types";
import { mergeThreadMessages } from "@/features/chat/utils/mergeThreadMessages";

const RECONCILE_INTERVAL_MS = 5000;

export type UseChatThreadResult = {
  messages: ThreadMessage[];
  sendMessage: (text: string) => void;
  retryMessage: (clientId: string) => void;
  isOffline: boolean;
};

/**
 * Local useState/useEffect, not Zustand: a chat thread belongs to a single
 * screen showing one conversationId at a time, and nothing outside this hook
 * needs to read or write it. AGENTS.md reserves Zustand for state shared
 * across unrelated components — this would move there if, say, an unread
 * badge elsewhere needed the same data. No React Query either: there is no
 * remote fetch to cache, everything chatService does is synchronous local
 * storage plus a mock backend call.
 *
 * `store` and `backend` are optional overrides, mirroring chatService's own
 * DI pattern: production code omits them and falls back to the SQLite
 * singleton plus the per-conversation mock backend, while tests pass an
 * in-memory ChatStore (so this hook can be exercised in Jest without
 * touching the native expo-sqlite binary) and, when needed, a backend
 * stubbed to fail so failure/retry states can be driven directly.
 */
export function useChatThread(
  conversationId: string,
  senderId: string,
  store?: ChatStore,
  backendOverride?: MockChatBackend,
): UseChatThreadResult {
  const registryBackend = useMemo(() => getConversationBackend(conversationId), [conversationId]);
  const backend = backendOverride ?? registryBackend;

  const readMessages = useCallback(
    () =>
      mergeThreadMessages(
        getConfirmedThread(conversationId, store),
        getPendingMessages(conversationId, store),
      ),
    [conversationId, store],
  );

  const [messages, setMessages] = useState<ThreadMessage[]>(readMessages);

  // Reset the thread when conversationId (or its store) changes, without an
  // effect: this is React's documented "adjusting state during render"
  // pattern for deriving state from a changed prop, not a setState-in-effect.
  const [renderedConversationId, setRenderedConversationId] = useState(conversationId);
  if (renderedConversationId !== conversationId) {
    setRenderedConversationId(conversationId);
    setMessages(readMessages());
  }

  const refreshMessages = useCallback(() => {
    setMessages(readMessages());
  }, [readMessages]);

  const reconcile = useCallback(() => {
    flushPendingMessages(backend, conversationId, senderId, store);
    syncThread(backend, conversationId, store);
    refreshMessages();
  }, [backend, conversationId, senderId, store, refreshMessages]);

  // Periodic reconciliation stands in for a push/socket connection the mock
  // backend doesn't have; foreground reconciliation covers the "reconnect
  // after coming back from background" case explicitly.
  useEffect(() => {
    const intervalId = setInterval(reconcile, RECONCILE_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
    };
  }, [reconcile]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState: AppStateStatus) => {
      if (nextAppState === "active") {
        reconcile();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [reconcile]);

  const sendMessage = useCallback(
    (text: string) => {
      enqueueMessage(conversationId, text, store);
      refreshMessages();
      reconcile();
    },
    [conversationId, store, refreshMessages, reconcile],
  );

  const retryMessage = useCallback(
    (clientId: string) => {
      const failedMessage = getPendingMessages(conversationId, store).find(
        (pendingMessage) =>
          pendingMessage.clientId === clientId && pendingMessage.status === MessageStatus.Failed,
      );

      if (failedMessage === undefined) {
        return;
      }

      reconcile();
    },
    [conversationId, store, reconcile],
  );

  // There is no real network layer to observe here (the backend is a local
  // mock, not a socket/HTTP client), so "offline" is approximated from its
  // only observable symptom: a message chatService could not deliver. Wiring
  // this to real connectivity (e.g. @react-native-community/netinfo) is a
  // later-phase concern once there's an actual network to be offline from.
  const isOffline = messages.some(
    (threadMessage) =>
      threadMessage.origin === "client" && threadMessage.message.status === MessageStatus.Failed,
  );

  return { messages, sendMessage, retryMessage, isOffline };
}
