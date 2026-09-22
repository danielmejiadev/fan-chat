import { MOCK_CONVERSATIONS } from "@/features/chat/constants/mockConversations";

export type SeedMessage = {
  serverId: string;
  conversationId: string;
  senderId: string;
  text: string;
  createdAt: number;
};

const DEMO_OPENERS = [
  "Hey! Thanks for joining All Access 🎉",
  "Let me know if you have any questions!",
];

/**
 * Stands in for history the server already has before the client ever asks —
 * a real backend wouldn't need the client to seed anything. Read once by
 * chatBackendRegistry when it first creates a conversation's mock backend, so
 * the client only ever learns about these through the normal sync path
 * (syncThread), the same way it would learn about any other message.
 */
export function getSeedMessagesForConversation(conversationId: string): SeedMessage[] {
  const conversation = MOCK_CONVERSATIONS.find((item) => item.id === conversationId);

  if (conversation === undefined) {
    return [];
  }

  return DEMO_OPENERS.map((text, index) => ({
    // Fixed, not counter-based: stays identical across app reloads so
    // INSERT OR IGNORE in SQLite can actually recognize the seed message as
    // already stored instead of re-inserting it as "new" every time.
    serverId: `demo_${conversationId}_${index}`,
    conversationId,
    senderId: conversation.participantId,
    text,
    createdAt: conversation.lastMessageAt - (DEMO_OPENERS.length - index) * 1000,
  }));
}
