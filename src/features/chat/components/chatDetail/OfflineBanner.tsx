import { Animated } from "react-native";

import { Text } from "@/components/ui/Text";
import { useFadeInEntrance } from "@/hooks/useFadeInEntrance";

export function OfflineBanner() {
  const opacity = useFadeInEntrance();

  return (
    <Animated.View className="bg-primary/5 px-4 py-2" style={{ opacity }}>
      <Text className="text-caption text-foreground-secondary">
        Offline — messages stay pending and retry automatically
      </Text>
    </Animated.View>
  );
}
