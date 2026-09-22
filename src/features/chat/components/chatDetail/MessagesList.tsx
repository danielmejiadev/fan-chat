import type { ForwardedRef } from "react";
import { forwardRef } from "react";
import { View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import type { FlashListRef } from "@shopify/flash-list";

import { Text } from "@/components/ui/Text";
import { MessageBubble } from "@/features/chat/components/chatDetail/MessageBubble";
import type { Conversation } from "@/features/chat/constants/mockConversations";
import type { Message } from "@/features/chat/types";

interface MessagesListProps {
  messages: Message[];
  conversation: Conversation;
  onLoadOlderMessages: () => void;
  onRetryMessage: (id: string) => void;
}

function MessagesListInner(
  { messages, conversation, onLoadOlderMessages, onRetryMessage }: MessagesListProps,
  ref: ForwardedRef<FlashListRef<Message>>,
) {
  return (
    <View className="flex-1">
      <FlashList
        ref={ref}
        data={messages}
        keyExtractor={(message) => message.id}
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
        renderItem={({ item: message }) => (
          <MessageBubble
            message={message}
            onRetry={onRetryMessage}
            participantName={conversation.participantName}
            participantTint={conversation.avatarTint}
          />
        )}
      />
    </View>
  );
}

export const MessagesList = forwardRef(MessagesListInner);
