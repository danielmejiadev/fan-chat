import { useMemo, useState } from "react";
import { FlatList, View } from "react-native";

import { ChatListHeader } from "@/features/chat/components/ChatListHeader";
import { ConversationListItem } from "@/features/chat/components/ConversationListItem";
import { ConversationSearch } from "@/features/chat/components/ConversationSearch";
import { MOCK_CONVERSATIONS, type Conversation } from "@/features/chat/constants/mockConversations";
import { useIsDesktopLayout } from "@/hooks/useIsDesktopLayout";
import { useRouter } from "expo-router";

interface ConversationsListProps {
  conversationId?: string;
}

export function ConversationsList({ conversationId }: ConversationsListProps) {
  const router = useRouter();
  const isDesktop = useIsDesktopLayout();
  const [searchQuery, setSearchQuery] = useState("");

  const conversations = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    if (normalizedQuery.length === 0) {
      return MOCK_CONVERSATIONS;
    }

    return MOCK_CONVERSATIONS.filter((conversation) => {
      return (
        conversation.participantName.toLowerCase().includes(normalizedQuery) ||
        conversation.participantHandle.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [searchQuery]);

  const selectConversation = (conversationId: string) => {
    router.push({ pathname: "/chat/[conversationId]", params: { conversationId } });
  };

  return (
    <View className="flex-1 bg-surface">
      <ChatListHeader searchQuery={searchQuery} onSearchQueryChange={setSearchQuery} />
      <View className="flex-1 px-4 pt-4">
        {isDesktop && (
          <View className="mb-4">
            <ConversationSearch value={searchQuery} onChangeText={setSearchQuery} />
          </View>
        )}
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
      </View>
    </View>
  );
}
