import { View } from "react-native";

import { TabIcon } from "@/components/layout/TabIcon";

type ShellTab = "home" | "feed" | "discover" | "bookmarks" | "more";

interface MobileTabBarProps {
  activeTab: ShellTab;
}

export function MobileTabBar({ activeTab }: MobileTabBarProps) {
  return (
    <View className="border-t border-border bg-surface/95 pb-8 pt-0 rounded-t-nav">
      <View className="flex-row items-start px-6">
        <TabIcon name="star-outline" label="Home" isActive={activeTab === "home"} />
        <TabIcon name="albums-outline" label="Feed" isActive={activeTab === "feed"} />
        <TabIcon name="compass-outline" label="Discover" isActive={activeTab === "discover"} />
        <TabIcon name="archive-outline" label="Bookmarks" isActive={activeTab === "bookmarks"} />
        <TabIcon name="apps-outline" label="More" isActive={activeTab === "more"} />
      </View>
    </View>
  );
}
