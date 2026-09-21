import { FlatList } from "react-native";

import { ConversationListItem } from "@/features/chat/components/ConversationListItem";
import { MOCK_CONVERSATIONS, type Conversation } from "@/features/chat/constants/mockConversations";

export function ConversationsList({
  onSelectConversation,
}: {
  onSelectConversation: (conversationId: string) => void;
}) {
  return (
    <FlatList
      data={MOCK_CONVERSATIONS}
      keyExtractor={(conversation: Conversation) => conversation.id}
      renderItem={({ item: conversation }) => (
        <ConversationListItem conversation={conversation} onPress={onSelectConversation} />
      )}
    />
  );
}
