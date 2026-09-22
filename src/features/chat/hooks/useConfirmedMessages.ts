import { useCallback, useEffect, useState } from "react";

import { getConfirmedMessagesPage } from "@/features/chat/services/chatService";
import type { ServerMessage } from "@/features/chat/types";

const INITIAL_PAGE_SIZE = 30;
const PAGE_SIZE_STEP = 30;

export type UseConfirmedMessagesResult = {
  confirmedMessages: ServerMessage[];
  hasMore: boolean;
  loadMore: () => void;
  refresh: () => void;
};

/** Assumes it's remounted per conversationId, so it only ever has to handle a growing page size. */
export function useConfirmedMessages(conversationId: string): UseConfirmedMessagesResult {
  const [pageSize, setPageSize] = useState(INITIAL_PAGE_SIZE);
  const [confirmedMessages, setConfirmedMessages] = useState<ServerMessage[]>([]);
  // Heuristic: a full page might mean there's more history to load; a short
  // one means we've reached the start of the thread.
  const [hasMore, setHasMore] = useState(false);

  const loadPage = useCallback(
    (size: number) => {
      void getConfirmedMessagesPage(conversationId, size).then((page) => {
        setConfirmedMessages(page);
        setHasMore(page.length >= size);
      });
    },
    [conversationId],
  );

  useEffect(() => {
    loadPage(pageSize);
    // Only reload the initial page automatically on mount/conversation
    // change — loadMore/refresh below trigger their own reloads explicitly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  const refresh = useCallback(() => {
    loadPage(pageSize);
  }, [loadPage, pageSize]);

  const loadMore = useCallback(() => {
    if (!hasMore) {
      return;
    }

    const nextPageSize = pageSize + PAGE_SIZE_STEP;
    setPageSize(nextPageSize);
    loadPage(nextPageSize);
  }, [hasMore, loadPage, pageSize]);

  return { confirmedMessages, hasMore, loadMore, refresh };
}
