import { useState } from "react";
import { Pressable } from "react-native";
import { clsx } from "clsx";

import { Icon } from "@/components/ui/Icon";
import { Text } from "@/components/ui/Text";
import { CURRENT_FAN_ID } from "@/features/chat/constants/mockConversations";
import { FanPaywallModal } from "@/features/subscriptions/components/FanPaywallModal";
import { useSubscription } from "@/features/subscriptions/hooks/useSubscription";
import { SubscriptionStatus } from "@/features/subscriptions/types";

interface BecomeFanButtonProps {
  className?: string;
}

const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  [SubscriptionStatus.Active]: "Fan in All Access",
  [SubscriptionStatus.PendingConfirmation]: "Confirming access…",
  [SubscriptionStatus.Inactive]: "Become a Fan",
};

/**
 * Entry point into the fan membership paywall — self-contained (owns its
 * own modal open state) so it can be dropped into any header/shell without
 * extra wiring from the parent.
 */
export function BecomeFanButton({ className }: BecomeFanButtonProps) {
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const { status } = useSubscription(CURRENT_FAN_ID);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={SUBSCRIPTION_STATUS_LABELS[status]}
        disabled={status !== SubscriptionStatus.Inactive}
        onPress={() => setIsPaywallOpen(true)}
        className={clsx(
          "h-9 flex-row items-center gap-2 rounded-[10px] bg-highlight px-4 shadow-inset-xs",
          className,
        )}
      >
        <Icon name="star-outline" size={16} className="text-primary" />
        <Text className="text-h5 font-sans-medium text-primary">
          {SUBSCRIPTION_STATUS_LABELS[status]}
        </Text>
      </Pressable>
      <FanPaywallModal visible={isPaywallOpen} onClose={() => setIsPaywallOpen(false)} />
    </>
  );
}
