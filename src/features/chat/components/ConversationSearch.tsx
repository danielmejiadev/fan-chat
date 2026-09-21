import { View } from "react-native";

import { Icon } from "@/components/ui/Icon";
import { IconButton } from "@/components/ui/IconButton";
import { TextInput } from "@/components/ui/TextInput";

interface ConversationSearchProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export function ConversationSearch({
  value,
  onChangeText,
  placeholder = "Search or conversations",
}: ConversationSearchProps) {
  return (
    <View className="flex-row items-center gap-3">
      <View className="h-9 flex-1 flex-row items-center gap-2 rounded-lg border border-border-light bg-surface px-3 shadow-xs">
        <Icon name="search-outline" size={16} className="text-foreground-muted" />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#737373"
          className="flex-1 text-body text-foreground-primary"
        />
      </View>
      <IconButton name="funnel-outline" accessibilityLabel="Filter conversations" />
    </View>
  );
}
