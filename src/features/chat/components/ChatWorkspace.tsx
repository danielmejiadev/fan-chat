import { View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { Text } from "@/components/ui/Text";
import { ConversationsList } from "@/features/chat/components/ConversationsList";
import { ThreadPane } from "@/features/chat/components/ThreadPane";
import { DesktopSidebar } from "@/components/layout/DesktopSidebar";
import { MobileTabBar } from "@/components/layout/MobileTabBar";
import { useIsDesktopLayout } from "@/hooks/useIsDesktopLayout";

interface ChatWorkspaceProps {
  selectedConversationId?: string;
}

export function ChatWorkspace({ selectedConversationId }: ChatWorkspaceProps) {
  const isDesktop = useIsDesktopLayout();
  const router = useRouter();

  const handleSelectConversation = (conversationId: string) => {
    router.push({ pathname: "/chat/[conversationId]", params: { conversationId } });
  };

  if (!isDesktop) {
    if (selectedConversationId !== undefined) {
      return <ThreadPane conversationId={selectedConversationId} />;
    }

    return (
      <SafeAreaView className="flex-1 bg-surface" edges={["top"]}>
        <ConversationsList onSelectConversation={handleSelectConversation} />
        <MobileTabBar activeTab="feed" />
      </SafeAreaView>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <View className="flex-1 flex-row overflow-hidden rounded-2xl bg-surface">
        <DesktopSidebar />
        <View className="w-[400px] border-r border-border">
          <ConversationsList
            selectedConversationId={selectedConversationId}
            onSelectConversation={handleSelectConversation}
          />
        </View>
        {selectedConversationId !== undefined ? (
          <ThreadPane conversationId={selectedConversationId} />
        ) : (
          <View className="flex-1 items-center justify-center">
            <Text className="text-body text-foreground-secondary">Select a conversation</Text>
          </View>
        )}
      </View>
    </View>
  );
}
