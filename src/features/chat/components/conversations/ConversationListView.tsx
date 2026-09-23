import { FlatList, View } from "react-native";
import { useRouter } from "expo-router";

import { ConversationListItem } from "@/features/chat/components/conversations/ConversationListItem";
import { MOCK_CONVERSATIONS, type Conversation } from "@/features/chat/constants/mockConversations";
import { filterConversations } from "@/features/chat/utils/filterConversations";

interface ConversationListViewProps {
  conversationId?: string;
  searchQuery: string;
}

export function ConversationListView({ conversationId, searchQuery }: ConversationListViewProps) {
  const router = useRouter();

  const conversations = filterConversations(MOCK_CONVERSATIONS, searchQuery);

  const selectConversation = (conversationId: string) => {
    router.push({ pathname: "/chat/[conversationId]", params: { conversationId } });
  };

  return (
    <FlatList
      data={conversations}
      keyExtractor={(conversation: Conversation) => conversation.id}
      ItemSeparatorComponent={() => <View className="h-1" />}
      renderItem={({ item: conversation }) => (
        <ConversationListItem
          conversation={conversation}
          isSelected={conversation.id === conversationId}
          onPress={selectConversation}
        />
      )}
    />
  );
}
