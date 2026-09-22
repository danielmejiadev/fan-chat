import { useCallback, useEffect, useRef, useState } from "react";

import {
  enqueueMessage,
  getConfirmedMessagesPage,
  getNonConfirmedMessages,
} from "@/features/chat/services/chatService";
import { MessageStatus, type Message } from "@/features/chat/types";

const INITIAL_PAGE_SIZE = 30;
const PAGE_SIZE_STEP = 30;

export type UseMessagesResult = {
  messages: Message[];
  hasMoreOlderMessages: boolean;
  loadOlderMessages: () => void;
  enqueue: (text: string) => Promise<void>;
  isFailed: (id: string) => boolean;
  refresh: () => void;
};

/**
 * Owns the single source of truth for one conversation's thread: one
 * subscription, one stale-read guard, one array. Confirmed messages
 * paginate via a keyset window (see chatStore.getConfirmedMessagesPage);
 * every Pending/Sent/Failed message is always included in full alongside
 * whatever confirmed page is loaded — there are only ever a handful of
 * those at once, so they don't need their own pagination.
 *
 * Assumes it's remounted per conversationId, so it only ever has to handle
 * a growing confirmed-page size.
 */
export function useMessages(conversationId: string, senderId: string): UseMessagesResult {
  const [pageSize, setPageSize] = useState(INITIAL_PAGE_SIZE);
  const [confirmedMessages, setConfirmedMessages] = useState<Message[]>([]);
  const [nonConfirmedMessages, setNonConfirmedMessages] = useState<Message[]>([]);
  // Heuristic: a full confirmed page might mean there's more history to
  // load; a short one means we've reached the start of the thread.
  const [hasMoreOlderMessages, setHasMoreOlderMessages] = useState(false);
  // Several sources can trigger a refresh (mount, a fresh enqueue, the
  // connection's own reconcile), and those reads can resolve out of order.
  // Only the most recently *issued* read is allowed to apply its result.
  const latestRequestId = useRef(0);

  const load = useCallback(
    (size: number) => {
      const requestId = ++latestRequestId.current;

      return Promise.all([
        getConfirmedMessagesPage(conversationId, size),
        getNonConfirmedMessages(conversationId),
      ]).then(([confirmedPage, nonConfirmed]) => {
        if (requestId === latestRequestId.current) {
          setConfirmedMessages(confirmedPage);
          setNonConfirmedMessages(nonConfirmed);
          setHasMoreOlderMessages(confirmedPage.length >= size);
        }
      });
    },
    [conversationId],
  );

  useEffect(() => {
    void load(pageSize);
    // Only reload the initial page automatically on mount/conversation
    // change — loadOlderMessages/refresh below trigger their own reloads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  const refresh = useCallback(() => {
    void load(pageSize);
  }, [load, pageSize]);

  const loadOlderMessages = useCallback(() => {
    if (!hasMoreOlderMessages) {
      return;
    }

    const nextPageSize = pageSize + PAGE_SIZE_STEP;
    setPageSize(nextPageSize);
    void load(nextPageSize);
  }, [hasMoreOlderMessages, load, pageSize]);

  const enqueue = useCallback(
    (text: string) =>
      enqueueMessage(conversationId, senderId, text).then((message) => {
        // Bumps the request id so any load() already in flight can't
        // overwrite this optimistic add when it resolves.
        latestRequestId.current += 1;
        setNonConfirmedMessages((current) => [...current, message]);
      }),
    [conversationId, senderId],
  );

  const isFailed = useCallback(
    (id: string) =>
      nonConfirmedMessages.some(
        (message) => message.id === id && message.status === MessageStatus.Failed,
      ),
    [nonConfirmedMessages],
  );

  const messages = [...confirmedMessages, ...nonConfirmedMessages].sort(
    (a, b) => a.createdAt - b.createdAt,
  );

  return { messages, hasMoreOlderMessages, loadOlderMessages, enqueue, isFailed, refresh };
}
