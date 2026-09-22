import type { Ionicons } from "@expo/vector-icons";

import { MessageStatus, type Message } from "@/features/chat/types";

export type MessageDeliveryTick = {
  iconName: keyof typeof Ionicons.glyphMap;
  accessibilityLabel: string;
  colorClassName: string;
};

/**
 * WhatsApp-style delivery state for the current user's own messages:
 * Pending (queued locally) -> Sent (backend accepted it) -> Confirmed
 * (reconciled into the canonical thread). Purely status-driven — call only
 * for own messages, the caller decides that. Returns null for a status that
 * doesn't map to a tick (there is none today, but keeps the function total).
 */
export function getMessageDeliveryTick(message: Message): MessageDeliveryTick | null {
  if (message.status === MessageStatus.Confirmed) {
    return {
      iconName: "checkmark-done",
      accessibilityLabel: "Confirmed",
      colorClassName: "text-foreground-date",
    };
  }

  if (message.status === MessageStatus.Pending) {
    return {
      iconName: "time-outline",
      accessibilityLabel: "Pending",
      colorClassName: "text-foreground-secondary",
    };
  }

  if (message.status === MessageStatus.Sent) {
    return {
      iconName: "checkmark",
      accessibilityLabel: "Sent",
      colorClassName: "text-foreground-date",
    };
  }

  if (message.status === MessageStatus.Failed) {
    return {
      iconName: "alert-circle",
      accessibilityLabel: "Failed to send",
      colorClassName: "text-error",
    };
  }

  return null;
}
