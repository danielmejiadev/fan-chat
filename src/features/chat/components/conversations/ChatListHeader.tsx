import { View } from "react-native";
import { clsx } from "clsx";

import { Icon } from "@/components/ui/Icon";
import { Text } from "@/components/ui/Text";
import { useIsDesktopLayout } from "@/hooks/useIsDesktopLayout";

interface ChatListHeaderProps {
  conversationId?: string;
}

export function ChatListHeader({ conversationId }: ChatListHeaderProps) {
  const isDesktop = useIsDesktopLayout();

  return (
    <View
      className={clsx("flex-row items-center gap-1 border-b border-border px-4", {
        "py-3.5": isDesktop,
        "py-3": !isDesktop,
      })}
    >
      {!isDesktop && conversationId && (
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
  );
}
