import { memo } from "react";
import { Pressable, View } from "react-native";
import { clsx } from "clsx";
import { format } from "date-fns";

import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import { Text } from "@/components/ui/Text";
import { GiftRow } from "@/features/chat/components/chatDetail/GiftRow";
import { getMessageDeliveryTick } from "@/features/chat/utils/getMessageDeliveryTick";
import { isGiftMessage } from "@/features/chat/utils/isGiftMessage";
import { MessageFailureReason, MessageStatus, type Message } from "@/features/chat/types";

interface MessageBubbleProps {
  message: Message;
  onRetry: (id: string) => void;
  participantName: string;
  participantTint: string;
}

function MessageBubbleComponent({
  message,
  onRetry,
  participantName,
  participantTint,
}: MessageBubbleProps) {
  const isOwnMessage = message.clientId !== null;
  const isRejected = message.failureReason === MessageFailureReason.Rejected;
  const isGift = isGiftMessage(message.text);
  const deliveryTick = isOwnMessage ? getMessageDeliveryTick(message) : null;

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
            "opacity-60": message.status === MessageStatus.Pending,
            "opacity-100": message.status !== MessageStatus.Pending,
            "border border-error": message.status === MessageStatus.Failed,
          })}
        >
          {isGift && <GiftRow text={message.text} />}
          {!isGift && <Text className="text-body text-foreground-primary">{message.text}</Text>}
          <View className="mt-2.5 flex-row items-center gap-1">
            <Text className="text-caption text-foreground-date">
              {format(message.createdAt, "h:mm a")}
            </Text>
            {deliveryTick && (
              <Icon
                name={deliveryTick.iconName}
                size={14}
                accessibilityLabel={deliveryTick.accessibilityLabel}
                className={deliveryTick.colorClassName}
              />
            )}
          </View>
        </View>
      </View>
      {message.status === MessageStatus.Failed && isOwnMessage && !isRejected && (
        <Pressable
          onPress={() => onRetry(message.id)}
          accessibilityRole="button"
          accessibilityLabel="Retry sending message"
        >
          <Text className="mt-1 text-caption text-error">Failed — tap to retry</Text>
        </Pressable>
      )}
      {message.status === MessageStatus.Failed && isRejected && (
        <Text className="mt-1 text-caption text-error">
          Can&apos;t be sent — remove the flagged content
        </Text>
      )}
    </View>
  );
}

export const MessageBubble = memo(MessageBubbleComponent, arePropsEqual);

function arePropsEqual(previous: MessageBubbleProps, next: MessageBubbleProps) {
  return (
    previous.message.id === next.message.id &&
    previous.message.text === next.message.text &&
    previous.message.status === next.message.status &&
    previous.message.failureReason === next.message.failureReason &&
    previous.onRetry === next.onRetry &&
    previous.participantName === next.participantName &&
    previous.participantTint === next.participantTint
  );
}
