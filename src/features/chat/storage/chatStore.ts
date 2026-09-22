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
  insertPendingMessage: (message: ClientMessage) => Promise<void>;
  updatePendingMessageStatus: (
    clientId: string,
    status: MessageStatus,
    failureReason?: MessageFailureReason,
  ) => Promise<void>;
  deletePendingMessage: (clientId: string) => Promise<void>;
  getPendingMessages: (conversationId: string) => Promise<ClientMessage[]>;
  isClientIdAccepted: (clientId: string) => Promise<boolean>;
  recordAcceptedClientId: (clientId: string, serverId: string) => Promise<void>;
  insertMessage: (message: ServerMessage) => Promise<void>;
  getThreadMessages: (conversationId: string) => Promise<ServerMessage[]>;
  /** Bulk insert for seeding large datasets — wrapped in a single transaction. */
  insertMessages: (messages: ServerMessage[]) => Promise<void>;
  countMessages: (conversationId: string) => Promise<number>;
  /**
   * Newest-first page of the thread. Without `before`, returns the most
   * recent `limit` messages. With `before`, returns the next `limit`
   * messages older than that cursor — pass the last item of the previous
   * page to keep scrolling back through history.
   */
  getThreadMessagesPage: (
    conversationId: string,
    options: { limit: number; before?: MessagePageCursor },
  ) => Promise<ServerMessage[]>;
};
