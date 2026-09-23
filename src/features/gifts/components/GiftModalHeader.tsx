import { View } from "react-native";

import { Avatar } from "@/components/ui/Avatar";
import { Text } from "@/components/ui/Text";
import type { Conversation } from "@/features/chat/constants/mockConversations";

interface GiftModalHeaderProps {
  conversation: Conversation;
}

export function GiftModalHeader({ conversation }: GiftModalHeaderProps) {
  return (
    <View className="mb-6 flex-row items-center pr-8">
      <Text className="flex-1 text-h4 font-sans-medium text-foreground-primary">
        Gift the creator
      </Text>
      <View className="flex-row items-center gap-2">
        <Avatar name={conversation.participantName} size={28} tint={conversation.avatarTint} />
        <View>
          <Text className="text-h5 font-sans-medium text-foreground-primary">
            {conversation.participantName}
          </Text>
          <Text className="text-caption text-foreground-secondary">
            {conversation.participantHandle}
          </Text>
        </View>
      </View>
    </View>
  );
}
