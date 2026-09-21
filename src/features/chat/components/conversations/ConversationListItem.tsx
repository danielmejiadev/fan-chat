import { Pressable, View } from "react-native";
import { clsx } from "clsx";
import { formatDistanceToNowStrict } from "date-fns";

import { Avatar } from "@/components/ui/Avatar";
import { Text } from "@/components/ui/Text";
import type { Conversation } from "@/features/chat/constants/mockConversations";

interface ConversationListItemProps {
  conversation: Conversation;
  isSelected: boolean;
  onPress: (conversationId: string) => void;
}

export function ConversationListItem({
  conversation,
  isSelected,
  onPress,
}: ConversationListItemProps) {
  return (
    <Pressable
      onPress={() => onPress(conversation.id)}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      className={clsx("flex-row items-center gap-2 rounded-lg p-2", {
        "bg-highlight": isSelected,
        "bg-surface": !isSelected,
      })}
    >
      <Avatar
        name={conversation.participantName}
        size={40}
        tint={conversation.avatarTint}
        showStatus
        isOnline={conversation.isOnline}
      />
      <View className="flex-1 gap-1">
        <Text className="text-h5 font-sans-medium text-foreground-primary" numberOfLines={1}>
          {conversation.participantName}{" "}
          <Text className="text-primary">{conversation.participantHandle}</Text>
        </Text>
        <View className="flex-row items-center gap-3">
          <Text className="flex-1 text-caption text-foreground-secondary" numberOfLines={1}>
            {conversation.lastMessagePreview}
          </Text>
          <Text className="text-caption text-foreground-secondary">
            · {formatDistanceToNowStrict(conversation.lastMessageAt, { addSuffix: true })}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}
