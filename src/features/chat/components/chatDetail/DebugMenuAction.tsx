import { Pressable } from "react-native";

import { Text } from "@/components/ui/Text";

interface DebugMenuActionProps {
  title: string;
  description: string;
  onPress: () => void;
}

export function DebugMenuAction({ title, description, onPress }: DebugMenuActionProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      className="rounded-lg border border-border-light px-4 py-3"
    >
      <Text className="text-body font-sans-medium text-foreground-primary">{title}</Text>
      <Text className="text-caption text-foreground-secondary">{description}</Text>
    </Pressable>
  );
}
