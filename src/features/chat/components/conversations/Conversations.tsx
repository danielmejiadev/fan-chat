import { useState } from "react";
import { View } from "react-native";

import { ChatListHeader } from "@/features/chat/components/conversations/ChatListHeader";
import { ConversationListView } from "@/features/chat/components/conversations/ConversationListView";
import { ConversationSearch } from "@/features/chat/components/conversations/ConversationSearch";
import { useIsDesktopLayout } from "@/hooks/useIsDesktopLayout";

interface ConversationsProps {
  conversationId?: string;
}

export function Conversations({ conversationId }: ConversationsProps) {
  const isDesktop = useIsDesktopLayout();
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <View className="flex-1 bg-surface">
      <ChatListHeader conversationId={conversationId} />
      <View className="flex-1 px-4 pt-4">
        <View className="mb-4">
          <ConversationSearch
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={isDesktop ? undefined : "Search messages or users"}
          />
        </View>
        <ConversationListView conversationId={conversationId} searchQuery={searchQuery} />
      </View>
    </View>
  );
}
