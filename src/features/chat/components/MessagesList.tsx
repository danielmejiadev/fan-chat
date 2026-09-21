import { FlashList } from "@shopify/flash-list";

import { MessageBubble } from "@/features/chat/components/MessageBubble";
import type { ThreadMessage } from "@/features/chat/types";

export function MessagesList({
  messages,
  onLoadOlderMessages,
  onRetryMessage,
}: {
  messages: ThreadMessage[];
  onLoadOlderMessages: () => void;
  onRetryMessage: (clientId: string) => void;
}) {
  return (
    <FlashList
      data={messages}
      keyExtractor={(threadMessage) =>
        threadMessage.origin === "server"
          ? threadMessage.message.serverId
          : threadMessage.message.clientId
      }
      onStartReached={onLoadOlderMessages}
      onStartReachedThreshold={0.5}
      maintainVisibleContentPosition={{ startRenderingFromBottom: true }}
      contentContainerStyle={{ paddingHorizontal: 16 }}
      renderItem={({ item: threadMessage }) => (
        <MessageBubble threadMessage={threadMessage} onRetry={onRetryMessage} />
      )}
    />
  );
}
