import type { Ionicons } from "@expo/vector-icons";

import { MessageStatus, type ThreadMessage } from "@/features/chat/types";

export type MessageDeliveryTick = {
  iconName: keyof typeof Ionicons.glyphMap;
  accessibilityLabel: string;
  colorClassName: string;
};

/**
 * WhatsApp-style delivery state for the current user's own messages:
 * Pending (queued locally) -> Sent (backend accepted it) -> Confirmed
 * (reconciled into the canonical thread, i.e. origin "server"). A message
 * only reaches "server" origin once chatService's receiveMessages()
 * promotes it, so origin alone already distinguishes Sent from Confirmed.
 * Returns null for received messages, which never show a tick.
 */
export function getMessageDeliveryTick(threadMessage: ThreadMessage): MessageDeliveryTick | null {
  if (threadMessage.origin === "server") {
    return {
      iconName: "checkmark-done",
      accessibilityLabel: "Confirmed",
      colorClassName: "text-foreground-date",
    };
  }

  if (threadMessage.message.status === MessageStatus.Pending) {
    return {
      iconName: "time-outline",
      accessibilityLabel: "Pending",
      colorClassName: "text-foreground-secondary",
    };
  }

  if (threadMessage.message.status === MessageStatus.Sent) {
    return {
      iconName: "checkmark",
      accessibilityLabel: "Sent",
      colorClassName: "text-foreground-date",
    };
  }

  if (threadMessage.message.status === MessageStatus.Failed) {
    return {
      iconName: "alert-circle",
      accessibilityLabel: "Failed to send",
      colorClassName: "text-error",
    };
  }

  return null;
}
