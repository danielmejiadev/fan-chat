import type { ClientMessage, MessageStatus, ServerMessage } from "@/features/chat/types";

/**
 * The CRUD contract chatService depends on. createSqliteChatStore (below)
 * implements it against expo-sqlite for the app; tests implement it in
 * memory so the retry/idempotency logic can run in Jest without a native
 * SQLite binary.
 */
export type ChatStore = {
  insertPendingMessage: (message: ClientMessage) => void;
  updatePendingMessageStatus: (clientId: string, status: MessageStatus) => void;
  deletePendingMessage: (clientId: string) => void;
  getPendingMessages: (conversationId: string) => ClientMessage[];
  isClientIdAccepted: (clientId: string) => boolean;
  recordAcceptedClientId: (clientId: string, serverId: string) => void;
  insertMessage: (message: ServerMessage) => void;
  getThreadMessages: (conversationId: string) => ServerMessage[];
};
