import { View } from "react-native";

import { Text } from "@/components/ui/Text";

export function OfflineBanner() {
  return (
    <View className="bg-primary/5 px-4 py-2">
      <Text className="text-caption text-foreground-secondary">
        Offline — messages stay pending and retry automatically
      </Text>
    </View>
  );
}
