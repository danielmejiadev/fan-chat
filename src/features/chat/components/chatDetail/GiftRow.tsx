import { View } from "react-native";

import { Text } from "@/components/ui/Text";

interface GiftRowProps {
  text: string;
}

export function GiftRow({ text }: GiftRowProps) {
  return (
    <View className="flex-row items-center gap-2">
      <View className="h-9 w-9 items-center justify-center rounded-[10px] bg-surface-muted shadow-inset-primary">
        <Text className="text-base">🎁</Text>
      </View>
      <Text className="shrink text-body text-foreground-primary">{text}</Text>
    </View>
  );
}
