import type { Message } from "@/features/chat/types";

/**
 * Keyset cursor for getConfirmedMessagesPage — (createdAt, serverId) rather
 * than just createdAt, so pagination stays stable even if two messages
 * share a timestamp. serverId (not `id`) is the tiebreaker because it's the
 * value that's guaranteed unique and present on every Confirmed row.
 */
export type MessagePageCursor = {
  createdAt: number;
  serverId: string;
};

export type MessageUpdate = Partial<Pick<Message, "status" | "serverId" | "failureReason">>;

/**
 * The CRUD contract chatService depends on. createSqliteChatStore (below)
 * implements it against expo-sqlite for the app; tests implement it in
 * memory so the retry/idempotency logic can run in Jest without a native
 * SQLite binary.
 */
export type ChatStore = {
  /** The first write for a message — never called twice for the same id. */
  insertMessage: (message: Message) => Promise<void>;
  /** Bulk insert for seeding large (already-Confirmed) datasets — wrapped in a single transaction. */
  insertMessages: (messages: Message[]) => Promise<void>;
  /** Every transition after the first write. A no-op if `id` doesn't exist. */
  updateMessage: (id: string, update: MessageUpdate) => Promise<void>;
  /**
   * Every Pending/Sent/Failed message for a conversation, oldest first.
   * Always returned in full — there are only ever a handful of these at
   * once, so unlike confirmed messages they're never paginated.
   */
  getNonConfirmedMessages: (conversationId: string) => Promise<Message[]>;
  countConfirmedMessages: (conversationId: string) => Promise<number>;
  /**
   * Newest-first page of Confirmed messages. Without `before`, returns the
   * most recent `limit` messages. With `before`, returns the next `limit`
   * messages older than that cursor — pass the last item of the previous
   * page to keep scrolling back through history.
   */
  getConfirmedMessagesPage: (
    conversationId: string,
    options: { limit: number; before?: MessagePageCursor },
  ) => Promise<Message[]>;
};
