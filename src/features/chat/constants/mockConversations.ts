export const CURRENT_FAN_ID = "fan-1";

export type Conversation = {
  id: string;
  participantId: string;
  participantName: string;
  participantHandle: string;
};

export const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: "conversation-1",
    participantId: "creator-alex",
    participantName: "Alex Creates",
    participantHandle: "@alexcreates",
  },
  {
    id: "conversation-2",
    participantId: "creator-ethan",
    participantName: "Ethan Shoots",
    participantHandle: "@ethan_shoots",
  },
];

export function getConversationById(conversationId: string): Conversation | undefined {
  return MOCK_CONVERSATIONS.find((conversation) => conversation.id === conversationId);
}
