import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { clsx } from "clsx";

import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import { Text } from "@/components/ui/Text";
import type { Conversation } from "@/features/chat/constants/mockConversations";
import { EntitlementStatus } from "@/features/purchases/types";
import { useIsDesktopLayout } from "@/hooks/useIsDesktopLayout";

interface ChatThreadHeaderProps {
  conversation: Conversation;
  entitlementStatus: EntitlementStatus;
}

const ENTITLEMENT_LABELS: Record<EntitlementStatus, string> = {
  [EntitlementStatus.Active]: "Fan in All Access",
  [EntitlementStatus.Pending]: "Confirming access…",
  [EntitlementStatus.Revoked]: "Become a Fan",
};

export function ChatThreadHeader({ conversation, entitlementStatus }: ChatThreadHeaderProps) {
  const isDesktop = useIsDesktopLayout();
  const router = useRouter();

  return (
    <View className="border-b border-border px-4 py-3">
      {!isDesktop && (
        <View className="mb-2 flex-row items-center">
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Back to chats"
            className="h-9 w-9 items-center justify-center"
          >
            <Icon name="chevron-back" size={16} className="text-foreground-primary" />
          </Pressable>
          <Text className="flex-1 text-h5 font-sans-medium text-foreground-ink">Chat with</Text>
          <Icon name="ellipsis-vertical" size={16} className="text-foreground-zinc" />
        </View>
      )}
      <View className="flex-row items-center gap-2">
        {isDesktop && (
          <Icon name="ellipsis-horizontal" size={16} className="text-foreground-zinc" />
        )}
        <Avatar
          name={conversation.participantName}
          size={isDesktop ? 40 : 32}
          tint={conversation.avatarTint}
        />
        <View className="flex-1 gap-0.5">
          <Text className="text-h5 font-sans-semibold leading-none text-foreground-zinc">
            {conversation.participantName}
          </Text>
          <Text className="text-caption leading-none text-primary">
            {conversation.participantHandle}
          </Text>
        </View>
        {!isDesktop && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={ENTITLEMENT_LABELS[entitlementStatus]}
            className={clsx(
              "h-9 flex-row items-center gap-2 rounded-[10px] bg-highlight px-4 shadow-inset-xs",
              { "opacity-60": entitlementStatus !== EntitlementStatus.Active },
            )}
          >
            <Icon name="star-outline" size={16} className="text-primary" />
            <Text className="text-h5 font-sans-medium text-primary">
              {ENTITLEMENT_LABELS[entitlementStatus]}
            </Text>
          </Pressable>
        )}
        {isDesktop && <Icon name="ellipsis-vertical" size={16} className="text-foreground-zinc" />}
      </View>
    </View>
  );
}
