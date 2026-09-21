import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Icon } from "@/components/ui/Icon";

interface TabIconProps {
  name: keyof typeof Ionicons.glyphMap;
  label: string;
  isActive: boolean;
}

export function TabIcon({ name, label, isActive }: TabIconProps) {
  return (
    <Pressable
      className="h-14 flex-1 items-center justify-center"
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: isActive }}
    >
      <Icon name={name} size={20} className={isActive ? "text-primary" : "text-foreground-zinc"} />
      {isActive && <View className="mt-1 h-1 w-1 rounded-full bg-primary" />}
    </Pressable>
  );
}
