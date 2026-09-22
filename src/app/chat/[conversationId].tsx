import { useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { Conversations } from "@/features/chat/components/conversations/Conversations";
import { DesktopSidebar } from "@/components/layout/DesktopSidebar";
import { useIsDesktopLayout } from "@/hooks/useIsDesktopLayout";
import { ThreadPane } from "@/features/chat/components/chatDetail/ThreadPane";

export default function ChatThreadScreen() {
  const isDesktop = useIsDesktopLayout();
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();

  if (isDesktop) {
    return (
      <View className="flex-1 bg-background">
        <View className="flex-1 flex-row overflow-hidden rounded-2xl bg-surface">
          <DesktopSidebar />
          <View className="w-[400px] border-r border-border">
            <Conversations conversationId={conversationId} />
          </View>
          <ThreadPane key={conversationId} conversationId={conversationId} />
        </View>
      </View>
    );
  }

  return <ThreadPane key={conversationId} conversationId={conversationId} />;
}
