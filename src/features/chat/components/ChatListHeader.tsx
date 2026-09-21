import { View } from "react-native";
import { clsx } from "clsx";

import { Icon } from "@/components/ui/Icon";
import { Text } from "@/components/ui/Text";
import { ConversationSearch } from "@/features/chat/components/ConversationSearch";
import { useIsDesktopLayout } from "@/hooks/useIsDesktopLayout";

interface ChatListHeaderProps {
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
}

export function ChatListHeader({ searchQuery, onSearchQueryChange }: ChatListHeaderProps) {
  const isDesktop = useIsDesktopLayout();

  return (
    <View
      className={clsx({
        "gap-4 border-b border-border px-4 py-3.5": isDesktop,
        "gap-3 border-b border-border px-4": !isDesktop,
      })}
    >
      <View className="flex-row items-center gap-1">
        {!isDesktop && (
          <View className="h-9 w-9 items-center justify-center">
            <Icon name="chevron-back" size={16} className="text-foreground-primary" />
          </View>
        )}
        <Text
          className={clsx({
            "text-h4 font-sans-medium text-foreground-primary": isDesktop,
            "text-h5 font-sans-medium text-foreground-ink": !isDesktop,
          })}
        >
          Chats
        </Text>
      </View>
      {!isDesktop && (
        <ConversationSearch
          value={searchQuery}
          onChangeText={onSearchQueryChange}
          placeholder="Search messages or users"
        />
      )}
    </View>
  );
}
