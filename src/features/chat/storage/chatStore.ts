import type {
  ClientMessage,
  MessageFailureReason,
  MessageStatus,
  ServerMessage,
} from "@/features/chat/types";

/**
 * Keyset cursor for getThreadMessagesPage — (createdAt, serverId) rather
 * than just createdAt, so pagination stays stable even if two messages
 * share a timestamp.
 */
export type MessagePageCursor = {
  createdAt: number;
  serverId: string;
};

/**
 * The CRUD contract chatService depends on. createSqliteChatStore (below)
 * implements it against expo-sqlite for the app; tests implement it in
 * memory so the retry/idempotency logic can run in Jest without a native
 * SQLite binary.
 */
export type ChatStore = {
  insertPendingMessage: (message: ClientMessage) => void;
  updatePendingMessageStatus: (
    clientId: string,
    status: MessageStatus,
    failureReason?: MessageFailureReason,
  ) => void;
  deletePendingMessage: (clientId: string) => void;
  getPendingMessages: (conversationId: string) => ClientMessage[];
  isClientIdAccepted: (clientId: string) => boolean;
  recordAcceptedClientId: (clientId: string, serverId: string) => void;
  insertMessage: (message: ServerMessage) => void;
  getThreadMessages: (conversationId: string) => ServerMessage[];
  /** Bulk insert for seeding large datasets — wrapped in a single transaction. */
  insertMessages: (messages: ServerMessage[]) => void;
  countMessages: (conversationId: string) => number;
  /**
   * Newest-first page of the thread. Without `before`, returns the most
   * recent `limit` messages. With `before`, returns the next `limit`
   * messages older than that cursor — pass the last item of the previous
   * page to keep scrolling back through history.
   */
  getThreadMessagesPage: (
    conversationId: string,
    options: { limit: number; before?: MessagePageCursor },
  ) => ServerMessage[];
};
