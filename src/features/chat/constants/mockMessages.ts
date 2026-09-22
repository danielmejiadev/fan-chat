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

export function getSeedMessagesForConversation(conversationId: string): SeedMessage[] {
  const conversation = MOCK_CONVERSATIONS.find((item) => item.id === conversationId);

  if (conversation === undefined) {
    return [];
  }

  return DEMO_OPENERS.map((text, index) => ({
    serverId: `demo_${conversationId}_${index}`,
    conversationId,
    senderId: conversation.participantId,
    text,
    createdAt: conversation.lastMessageAt - (DEMO_OPENERS.length - index) * 1000,
  }));
}
