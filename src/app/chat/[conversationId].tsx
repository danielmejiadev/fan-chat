import { useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { ConversationsList } from "@/features/chat/components/ConversationsList";
import { DesktopSidebar } from "@/components/layout/DesktopSidebar";
import { useIsDesktopLayout } from "@/hooks/useIsDesktopLayout";
import { ThreadPane } from "@/features/chat/components/ThreadPane";

export default function ChatThreadScreen() {
  const isDesktop = useIsDesktopLayout();
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();

  if (isDesktop) {
    return (
      <View className="flex-1 bg-background">
        <View className="flex-1 flex-row overflow-hidden rounded-2xl bg-surface">
          <DesktopSidebar />
          <View className="w-[400px] border-r border-border">
            <ConversationsList conversationId={conversationId} />
          </View>
          <ThreadPane conversationId={conversationId} />
        </View>
      </View>
    );
  }

  return <ThreadPane conversationId={conversationId} />;
}
