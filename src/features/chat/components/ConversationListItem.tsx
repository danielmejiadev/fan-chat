import { Pressable, Text } from "react-native";

import type { Conversation } from "@/features/chat/constants/mockConversations";

export function ConversationListItem({
  conversation,
  onPress,
}: {
  conversation: Conversation;
  onPress: (conversationId: string) => void;
}) {
  return (
    <Pressable
      onPress={() => onPress(conversation.id)}
      className="px-4 py-3 border-b border-border-light"
    >
      <Text className="text-base font-medium text-text-primary">
        {conversation.participantName}
      </Text>
      <Text className="text-text-secondary">{conversation.participantHandle}</Text>
    </Pressable>
  );
}
