import { getConversationById } from "@/features/chat/constants/mockConversations";
import { getConversationBackend } from "@/features/chat/services/chatBackendRegistry";
import { syncThread } from "@/features/chat/services/chatService";
import type { ChatStore } from "@/features/chat/storage/chatStore";

const DEMO_OPENERS = [
  "Hey! Thanks for joining All Access 🎉",
  "Let me know if you have any questions!",
];

/**
 * Gives each mock conversation a couple of opening messages from the
 * creator, so the thread isn't empty the first time it's opened — and
 * exercises receiveIncomingMessage + syncThread in the running app, not
 * just in tests. Idempotent: checks the backend's own thread before
 * seeding, so reopening a conversation never re-sends the openers.
 */
export function ensureDemoConversationSeeded(conversationId: string, store?: ChatStore): void {
  const conversation = getConversationById(conversationId);

  if (conversation === undefined) {
    return;
  }

  const backend = getConversationBackend(conversationId);

  if (backend.listMessages(conversationId).length > 0) {
    return;
  }

  for (const text of DEMO_OPENERS) {
    backend.receiveIncomingMessage(conversationId, conversation.participantId, text);
  }

  syncThread(backend, conversationId, store);
}
