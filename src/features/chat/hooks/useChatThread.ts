import { useCallback, useEffect, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";

import {
  enqueueMessage,
  flushPendingMessages,
  getPendingMessages,
  getThreadWindow,
  syncThread,
} from "@/features/chat/services/chatService";
import { MessageStatus, type ThreadMessage } from "@/features/chat/types";
import { mergeThreadMessages } from "@/features/chat/utils/mergeThreadMessages";

const RECONCILE_INTERVAL_MS = 5000;
const INITIAL_WINDOW_SIZE = 30;
const WINDOW_SIZE_STEP = 30;

export type UseChatThreadResult = {
  messages: ThreadMessage[];
  sendMessage: (text: string) => void;
  retryMessage: (clientId: string) => void;
  loadOlderMessages: () => void;
  hasMoreOlderMessages: boolean;
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
 * chatService resolves the store and the conversation's backend on its own —
 * tests swap those out via chatService's/chatBackendRegistry's test-only
 * setters instead of this hook taking DI params it would never receive in
 * production.
 */
export function useChatThread(conversationId: string, senderId: string): UseChatThreadResult {
  const [windowSize, setWindowSize] = useState(INITIAL_WINDOW_SIZE);

  const readConfirmedWindow = useCallback(
    (size: number) => getThreadWindow(conversationId, size),
    [conversationId],
  );

  const readMessages = useCallback(
    (size: number) =>
      mergeThreadMessages(readConfirmedWindow(size), getPendingMessages(conversationId)),
    [readConfirmedWindow, conversationId],
  );

  const [messages, setMessages] = useState<ThreadMessage[]>(() => readMessages(windowSize));
  // Heuristic: a full window might mean there's more history to load; a
  // short one means we've reached the start of the thread. loadOlderMessages
  // grows the window and this gets recomputed on the next read.
  const [hasMoreOlderMessages, setHasMoreOlderMessages] = useState(
    () => readConfirmedWindow(windowSize).length >= windowSize,
  );

  // Re-reads when conversationId (a new thread) or windowSize
  // (loadOlderMessages) changes — React's documented "adjusting state during
  // render" pattern for deriving state from changed props/state, not a
  // setState-in-effect.
  const [renderedConversationId, setRenderedConversationId] = useState(conversationId);
  const [renderedWindowSize, setRenderedWindowSize] = useState(windowSize);
  if (renderedConversationId !== conversationId || renderedWindowSize !== windowSize) {
    const conversationChanged = renderedConversationId !== conversationId;
    const effectiveWindowSize = conversationChanged ? INITIAL_WINDOW_SIZE : windowSize;

    setRenderedConversationId(conversationId);
    setRenderedWindowSize(effectiveWindowSize);
    if (conversationChanged && windowSize !== INITIAL_WINDOW_SIZE) {
      setWindowSize(INITIAL_WINDOW_SIZE);
    }

    const confirmedWindow = readConfirmedWindow(effectiveWindowSize);
    setMessages(mergeThreadMessages(confirmedWindow, getPendingMessages(conversationId)));
    setHasMoreOlderMessages(confirmedWindow.length >= effectiveWindowSize);
  }

  const refreshMessages = useCallback(() => {
    const confirmedWindow = readConfirmedWindow(windowSize);
    setMessages(mergeThreadMessages(confirmedWindow, getPendingMessages(conversationId)));
    setHasMoreOlderMessages(confirmedWindow.length >= windowSize);
  }, [readConfirmedWindow, conversationId, windowSize]);

  const loadOlderMessages = useCallback(() => {
    if (!hasMoreOlderMessages) {
      return;
    }
    setWindowSize((currentWindowSize) => currentWindowSize + WINDOW_SIZE_STEP);
  }, [hasMoreOlderMessages]);

  const reconcile = useCallback(() => {
    flushPendingMessages(conversationId, senderId);
    syncThread(conversationId);
    refreshMessages();
  }, [conversationId, senderId, refreshMessages]);

  // Reconciles immediately (the initial fetch a real app does on opening a
  // thread, before anything is cached locally) and then periodically, which
  // stands in for a push/socket connection the mock backend doesn't have;
  // foreground reconciliation covers the "reconnect after coming back from
  // background" case explicitly.
  useEffect(() => {
    const timeoutId = setTimeout(reconcile, 0);
    const intervalId = setInterval(reconcile, RECONCILE_INTERVAL_MS);

    return () => {
      clearTimeout(timeoutId);
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
      enqueueMessage(conversationId, text);
      refreshMessages();
      reconcile();
    },
    [conversationId, refreshMessages, reconcile],
  );

  const retryMessage = useCallback(
    (clientId: string) => {
      const failedMessage = getPendingMessages(conversationId).find(
        (pendingMessage) =>
          pendingMessage.clientId === clientId && pendingMessage.status === MessageStatus.Failed,
      );

      if (failedMessage === undefined) {
        return;
      }

      reconcile();
    },
    [conversationId, reconcile],
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

  return {
    messages,
    sendMessage,
    retryMessage,
    loadOlderMessages,
    hasMoreOlderMessages,
    isOffline,
  };
}
