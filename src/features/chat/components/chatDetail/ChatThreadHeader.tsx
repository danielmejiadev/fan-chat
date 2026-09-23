import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";

import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import { Text } from "@/components/ui/Text";
import type { Conversation } from "@/features/chat/constants/mockConversations";
import { BecomeFanButton } from "@/features/subscriptions/components/BecomeFanButton";
import { useIsDesktopLayout } from "@/hooks/useIsDesktopLayout";

interface ChatThreadHeaderProps {
  conversation: Conversation;
}

export function ChatThreadHeader({ conversation }: ChatThreadHeaderProps) {
  const isDesktop = useIsDesktopLayout();
  const router = useRouter();

  return (
    <View className="border-b border-border px-4 py-3">
      {!isDesktop && (
        <View className="mb-2 flex-row items-center">
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Back to chats"
            className="h-9 w-9 items-center justify-center"
          >
            <Icon name="chevron-back" size={16} className="text-foreground-primary" />
          </Pressable>
          <Text className="flex-1 text-h5 font-sans-medium text-foreground-ink">Chat with</Text>
          <Icon name="ellipsis-vertical" size={16} className="text-foreground-zinc" />
        </View>
      )}
      <View className="flex-row items-center gap-2">
        {isDesktop && (
          <Icon name="ellipsis-horizontal" size={16} className="text-foreground-zinc" />
        )}
        <Avatar
          name={conversation.participantName}
          size={isDesktop ? 40 : 32}
          tint={conversation.avatarTint}
        />
        <View className="flex-1 gap-0.5">
          <Text className="text-h5 font-sans-semibold leading-none text-foreground-zinc">
            {conversation.participantName}
          </Text>
          <Text className="text-caption leading-none text-primary">
            {conversation.participantHandle}
          </Text>
        </View>
        <BecomeFanButton className="px-3 py-1.5" />
        {isDesktop && <Icon name="ellipsis-vertical" size={16} className="text-foreground-zinc" />}
      </View>
    </View>
  );
}
