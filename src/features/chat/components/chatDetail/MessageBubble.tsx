import { Pressable, View } from "react-native";
import { clsx } from "clsx";
import { format } from "date-fns";

import { Avatar } from "@/components/ui/Avatar";
import { Text } from "@/components/ui/Text";
import { CURRENT_FAN_ID } from "@/features/chat/constants/mockConversations";
import { GiftRow } from "@/features/chat/components/chatDetail/GiftRow";
import { MessageFailureReason, MessageStatus, type ThreadMessage } from "@/features/chat/types";

const GIFT_MESSAGE_PATTERN = /sent a \$[\d.]+ gift/i;

interface MessageBubbleProps {
  threadMessage: ThreadMessage;
  onRetry: (clientId: string) => void;
  participantName: string;
  participantTint: string;
}

export function MessageBubble({
  threadMessage,
  onRetry,
  participantName,
  participantTint,
}: MessageBubbleProps) {
  const isOwnMessage =
    threadMessage.origin === "client" || threadMessage.message.senderId === CURRENT_FAN_ID;
  const status = threadMessage.origin === "client" ? threadMessage.message.status : null;
  const failureReason =
    threadMessage.origin === "client" ? threadMessage.message.failureReason : undefined;
  const isRejected = failureReason === MessageFailureReason.Rejected;
  const isGiftMessage = GIFT_MESSAGE_PATTERN.test(threadMessage.message.text);

  return (
    <View className={clsx("py-3", { "items-end": isOwnMessage, "items-start": !isOwnMessage })}>
      <View
        className={clsx("max-w-[320px] flex-row items-end gap-3", {
          "flex-row-reverse": isOwnMessage,
        })}
      >
        {!isOwnMessage && <Avatar name={participantName} size={32} tint={participantTint} />}
        <View
          className={clsx("rounded-bubble px-3 py-2", {
            "bg-primary/5": isOwnMessage,
            "bg-bubble-received": !isOwnMessage,
            "opacity-60": status === MessageStatus.Pending,
            "opacity-100": status !== MessageStatus.Pending,
            "border border-error": status === MessageStatus.Failed,
          })}
        >
          {isGiftMessage && <GiftRow text={threadMessage.message.text} />}
          {!isGiftMessage && (
            <Text className="text-body text-foreground-primary">{threadMessage.message.text}</Text>
          )}
          <Text className="mt-2.5 text-caption text-foreground-date">
            {format(threadMessage.message.createdAt, "h:mm a")}
          </Text>
        </View>
      </View>
      {status === MessageStatus.Failed && threadMessage.origin === "client" && !isRejected && (
        <Pressable
          onPress={() => onRetry(threadMessage.message.clientId)}
          accessibilityRole="button"
          accessibilityLabel="Retry sending message"
        >
          <Text className="mt-1 text-caption text-error">Failed — tap to retry</Text>
        </Pressable>
      )}
      {status === MessageStatus.Failed && isRejected && (
        <Text className="mt-1 text-caption text-error">
          Can&apos;t be sent — remove the flagged content
        </Text>
      )}
      {status === MessageStatus.Pending && (
        <Text className="mt-1 text-caption text-foreground-secondary">Sending…</Text>
      )}
    </View>
  );
}
