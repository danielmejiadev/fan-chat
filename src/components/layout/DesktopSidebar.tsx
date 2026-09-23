import { View } from "react-native";

import { DemoResetButton } from "@/components/DemoResetButton";
import { Text } from "@/components/ui/Text";
import { SidebarItem } from "@/components/layout/SidebarItem";

export function DesktopSidebar() {
  return (
    <View className="w-64 justify-between border-r border-border bg-highlight/40 px-4 py-6">
      <View>
        <Text className="mb-8 px-2 text-h4 font-sans-semibold text-foreground-primary">
          FanSuite
        </Text>
        <Text className="mb-2 px-3 text-caption text-foreground-secondary">Platform</Text>
        <SidebarItem icon="star-outline" label="My Fan Suites" />
        <SidebarItem icon="albums-outline" label="Feed" />
        <SidebarItem icon="compass-outline" label="Discover" />
        <SidebarItem icon="bookmark-outline" label="Bookmarks" />
        <SidebarItem icon="person-outline" label="My profile" />
        <Text className="mb-2 mt-6 px-3 text-caption text-foreground-secondary">
          Connect with creators
        </Text>
        <SidebarItem icon="chatbubble-ellipses-outline" label="Messages" isActive />
        <SidebarItem icon="notifications-outline" label="Notifications" badgeCount={3} />
        <DemoResetButton variant="sidebar" />
      </View>
      <View className="flex-row items-center gap-2 px-2">
        <View className="h-8 w-8 items-center justify-center rounded-full bg-surface-muted">
          <Text className="text-caption font-sans-medium text-foreground-primary">ES</Text>
        </View>
        <View className="flex-1">
          <Text className="text-h5 font-sans-medium text-foreground-primary">Ethan Shoots</Text>
          <Text className="text-caption text-foreground-secondary">@ethan_shoots</Text>
        </View>
      </View>
    </View>
  );
}
