import { type Conversation } from "@/features/chat/constants/mockConversations";

export function filterConversations(
  conversations: Conversation[],
  searchQuery: string,
): Conversation[] {
  const normalizedQuery = searchQuery.trim().toLowerCase();

  if (normalizedQuery.length === 0) {
    return conversations;
  }

  return conversations.filter((conversation) => {
    return (
      conversation.participantName.toLowerCase().includes(normalizedQuery) ||
      conversation.participantHandle.toLowerCase().includes(normalizedQuery)
    );
  });
}
