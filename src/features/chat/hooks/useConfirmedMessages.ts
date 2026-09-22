import { useCallback, useState } from "react";

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
  const [confirmedMessages, setConfirmedMessages] = useState<ServerMessage[]>(() =>
    getConfirmedMessagesPage(conversationId, INITIAL_PAGE_SIZE),
  );
  // Heuristic: a full page might mean there's more history to load; a short
  // one means we've reached the start of the thread.
  const [hasMore, setHasMore] = useState(() => confirmedMessages.length >= INITIAL_PAGE_SIZE);

  const refresh = useCallback(() => {
    const page = getConfirmedMessagesPage(conversationId, pageSize);
    setConfirmedMessages(page);
    setHasMore(page.length >= pageSize);
  }, [conversationId, pageSize]);

  const loadMore = useCallback(() => {
    if (!hasMore) {
      return;
    }

    const nextPageSize = pageSize + PAGE_SIZE_STEP;
    const page = getConfirmedMessagesPage(conversationId, nextPageSize);

    setPageSize(nextPageSize);
    setConfirmedMessages(page);
    setHasMore(page.length >= nextPageSize);
  }, [conversationId, hasMore, pageSize]);

  return { confirmedMessages, hasMore, loadMore, refresh };
}
