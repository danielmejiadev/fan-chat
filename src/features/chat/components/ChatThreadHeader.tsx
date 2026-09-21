import { Text, View } from "react-native";

export function ChatThreadHeader({ title }: { title: string }) {
  return (
    <View className="px-4 pb-2">
      <Text className="text-lg font-semibold text-text-primary">{title}</Text>
    </View>
  );
}
