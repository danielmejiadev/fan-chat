import { Pressable, Text, View } from "react-native";

import { CURRENT_FAN_ID } from "@/features/chat/constants/mockConversations";
import { MessageStatus, type ThreadMessage } from "@/features/chat/types";

export function MessageBubble({
  threadMessage,
  onRetry,
}: {
  threadMessage: ThreadMessage;
  onRetry: (clientId: string) => void;
}) {
  const isOwnMessage =
    threadMessage.origin === "client" || threadMessage.message.senderId === CURRENT_FAN_ID;
  const status = threadMessage.origin === "client" ? threadMessage.message.status : null;

  return (
    <View className={`py-1 ${isOwnMessage ? "items-end" : "items-start"}`}>
      <View
        className={`max-w-[80%] rounded-lg p-2 ${isOwnMessage ? "bg-highlight" : "bg-zinc-100"} ${
          status === MessageStatus.Pending ? "opacity-60" : "opacity-100"
        } ${status === MessageStatus.Failed ? "border border-error" : ""}`}
      >
        <Text className="text-text-primary">{threadMessage.message.text}</Text>
      </View>
      {status === MessageStatus.Failed && threadMessage.origin === "client" && (
        <Pressable onPress={() => onRetry(threadMessage.message.clientId)}>
          <Text className="text-error text-xs">Failed — tap to retry</Text>
        </Pressable>
      )}
    </View>
  );
}
