import { useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { View } from "react-native";
import { Conversations } from "@/features/chat/components/conversations/Conversations";
import { DesktopSidebar } from "@/components/layout/DesktopSidebar";
import { useIsDesktopLayout } from "@/hooks/useIsDesktopLayout";
import { ThreadPane } from "@/features/chat/components/chatDetail/ThreadPane";
import { ensurePerfTestMessagesSeeded } from "@/features/chat/services/perfTestSeed";
import { PERF_TEST_CONVERSATION_ID } from "@/features/chat/utils/generatePerfTestMessages";

export default function ChatThreadScreen() {
  const isDesktop = useIsDesktopLayout();
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();

  useEffect(() => {
    // "perf-test" is a dedicated conversation for profiling scroll/pagination
    // against a 50k-message history, not a real demo conversation.
    if (conversationId === PERF_TEST_CONVERSATION_ID) {
      void ensurePerfTestMessagesSeeded();
    }
  }, [conversationId]);

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
