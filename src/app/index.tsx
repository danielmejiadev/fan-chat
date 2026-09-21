import { useRouter } from "expo-router";
import { View } from "react-native";

import { ChatListHeader } from "@/features/chat/components/ChatListHeader";
import { ConversationsList } from "@/features/chat/components/ConversationsList";

export default function ChatListScreen() {
  const router = useRouter();

  const handleSelectConversation = (conversationId: string) => {
    router.push({ pathname: "/chat/[conversationId]", params: { conversationId } });
  };

  return (
    <View className="flex-1 pt-16 bg-canvas">
      <ChatListHeader />
      <ConversationsList onSelectConversation={handleSelectConversation} />
    </View>
  );
}
