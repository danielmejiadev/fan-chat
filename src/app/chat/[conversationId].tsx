import { useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { View } from "react-native";

import { ChatThreadHeader } from "@/features/chat/components/ChatThreadHeader";
import { MessageInput } from "@/features/chat/components/MessageInput";
import { MessagesList } from "@/features/chat/components/MessagesList";
import { OfflineBanner } from "@/features/chat/components/OfflineBanner";
import { CURRENT_FAN_ID, getConversationById } from "@/features/chat/constants/mockConversations";
import { useChatThread } from "@/features/chat/hooks/useChatThread";
import { ensureDemoConversationSeeded } from "@/features/chat/services/demoConversationSeed";

export default function ChatThreadScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const conversation = getConversationById(conversationId);

  useEffect(() => {
    ensureDemoConversationSeeded(conversationId);
  }, [conversationId]);

  const { messages, sendMessage, retryMessage, loadOlderMessages, isOffline } = useChatThread(
    conversationId,
    CURRENT_FAN_ID,
  );

  return (
    <View className="flex-1 pt-16 bg-canvas">
      <ChatThreadHeader title={conversation?.participantName ?? conversationId} />
      {isOffline && <OfflineBanner />}
      <MessagesList
        messages={messages}
        onLoadOlderMessages={loadOlderMessages}
        onRetryMessage={retryMessage}
      />
      <MessageInput onSend={sendMessage} />
    </View>
  );
}
