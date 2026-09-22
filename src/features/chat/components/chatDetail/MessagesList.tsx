import { View } from "react-native";
import { FlashList } from "@shopify/flash-list";

import { Text } from "@/components/ui/Text";
import { MessageBubble } from "@/features/chat/components/chatDetail/MessageBubble";
import type { Conversation } from "@/features/chat/constants/mockConversations";
import type { ThreadMessage } from "@/features/chat/types";

interface MessagesListProps {
  messages: ThreadMessage[];
  conversation: Conversation;
  onLoadOlderMessages: () => void;
  onRetryMessage: (clientId: string) => void;
}

export function MessagesList({
  messages,
  conversation,
  onLoadOlderMessages,
  onRetryMessage,
}: MessagesListProps) {
  return (
    <View className="flex-1">
      <FlashList
        data={messages}
        keyExtractor={(threadMessage) =>
          threadMessage.origin === "server"
            ? threadMessage.message.serverId
            : threadMessage.message.clientId
        }
        onStartReached={onLoadOlderMessages}
        onStartReachedThreshold={0.5}
        maintainVisibleContentPosition={{
          startRenderingFromBottom: true,
          autoscrollToBottomThreshold: 0.2,
        }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 24 }}
        ListHeaderComponent={
          <Text className="mb-6 text-center text-caption text-foreground-date">Today</Text>
        }
        renderItem={({ item: threadMessage }) => (
          <MessageBubble
            threadMessage={threadMessage}
            onRetry={onRetryMessage}
            participantName={conversation.participantName}
            participantTint={conversation.avatarTint}
          />
        )}
      />
    </View>
  );
}
