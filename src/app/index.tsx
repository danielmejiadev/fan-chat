import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DemoResetButton } from "@/components/DemoResetButton";
import { Text } from "@/components/ui/Text";
import { Conversations } from "@/features/chat/components/conversations/Conversations";
import { DesktopSidebar } from "@/components/layout/DesktopSidebar";
import { MobileTabBar } from "@/components/layout/MobileTabBar";
import { useIsDesktopLayout } from "@/hooks/useIsDesktopLayout";

export default function ChatListScreen() {
  const isDesktop = useIsDesktopLayout();

  if (isDesktop) {
    return (
      <View className="flex-1 bg-background">
        <View className="flex-1 flex-row overflow-hidden rounded-2xl bg-surface">
          <DesktopSidebar />
          <View className="w-[400px] border-r border-border">
            <Conversations />
          </View>
          <View className="flex-1 items-center justify-center">
            <Text className="text-body text-foreground-secondary">Select a conversation</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top"]}>
      <Conversations />
      <DemoResetButton variant="floating" />
      <MobileTabBar activeTab="feed" />
    </SafeAreaView>
  );
}
