import { useLocalSearchParams } from "expo-router";

import { ChatWorkspace } from "@/features/chat/components/ChatWorkspace";

export default function ChatThreadScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();

  return <ChatWorkspace selectedConversationId={conversationId} />;
}
