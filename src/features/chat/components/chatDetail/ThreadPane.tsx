import { useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { FlashListRef } from "@shopify/flash-list";

import { Text } from "@/components/ui/Text";
import { ChatDebugMenu } from "@/features/chat/components/chatDetail/ChatDebugMenu";
import { ChatThreadHeader } from "@/features/chat/components/chatDetail/ChatThreadHeader";
import { MessageInput } from "@/features/chat/components/chatDetail/MessageInput";
import { MessagesList } from "@/features/chat/components/chatDetail/MessagesList";
import { OfflineBanner } from "@/features/chat/components/chatDetail/OfflineBanner";
import { CURRENT_FAN_ID, getConversationById } from "@/features/chat/constants/mockConversations";
import { useChatThread } from "@/features/chat/hooks/useChatThread";
import type { Message } from "@/features/chat/types";
import { useIsOffline } from "@/hooks/useIsOffline";
import { GiftModal } from "@/features/gifts/components/GiftModal";

interface ThreadPaneProps {
  conversationId: string;
}

export function ThreadPane({ conversationId }: ThreadPaneProps) {
  const conversation = getConversationById(conversationId);
  const [isGiftOpen, setIsGiftOpen] = useState(false);
  const isOffline = useIsOffline();
  const messagesListRef = useRef<FlashListRef<Message>>(null);

  const { messages, sendMessage, retryMessage, loadOlderMessages } = useChatThread(
    conversationId,
    CURRENT_FAN_ID,
  );

  const handleInputFocus = () => {
    messagesListRef.current?.scrollToEnd({ animated: true });
  };

  if (conversation === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <Text className="text-body text-foreground-secondary">Conversation not found</Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top"]}>
      <KeyboardAvoidingView
        className="flex-1 bg-surface"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ChatThreadHeader conversation={conversation} />
        {isOffline && <OfflineBanner />}
        <MessagesList
          ref={messagesListRef}
          messages={messages}
          conversation={conversation}
          onLoadOlderMessages={loadOlderMessages}
          onRetryMessage={retryMessage}
        />
        <MessageInput
          onSend={sendMessage}
          onOpenGift={() => setIsGiftOpen(true)}
          onFocus={handleInputFocus}
        />
        <GiftModal
          conversation={conversation}
          visible={isGiftOpen}
          onClose={() => setIsGiftOpen(false)}
          onGiftSent={sendMessage}
        />
      </KeyboardAvoidingView>
      <ChatDebugMenu conversationId={conversationId} participantId={conversation.participantId} />
    </SafeAreaView>
  );
}
