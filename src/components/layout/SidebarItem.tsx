import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { clsx } from "clsx";

import { Icon } from "@/components/ui/Icon";
import { Text } from "@/components/ui/Text";

interface SidebarItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  isActive?: boolean;
  badgeCount?: number;
}

export function SidebarItem({ icon, label, isActive, badgeCount }: SidebarItemProps) {
  return (
    <Pressable
      accessibilityRole="button"
      className={clsx("mb-1 flex-row items-center gap-3 rounded-lg px-3 py-2", {
        "bg-highlight": isActive,
      })}
    >
      <Icon
        name={icon}
        size={18}
        className={clsx({ "text-primary": isActive, "text-foreground-zinc": !isActive })}
      />
      <Text
        className={clsx("flex-1 text-body", {
          "font-sans-medium text-primary": isActive,
          "text-foreground-zinc": !isActive,
        })}
      >
        {label}
      </Text>
      {badgeCount !== undefined && badgeCount > 0 && (
        <View className="h-5 min-w-5 items-center justify-center rounded-full bg-error px-1">
          <Text className="text-[10px] font-sans-medium text-error-foreground">{badgeCount}</Text>
        </View>
      )}
    </Pressable>
  );
}
