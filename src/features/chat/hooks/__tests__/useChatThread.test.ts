import { act, renderHook, waitFor } from "@testing-library/react-native";

import { resetConversationBackends } from "@/features/chat/services/chatBackendRegistry";
import { useChatThread } from "@/features/chat/hooks/useChatThread";
import { createInMemoryChatStore } from "@/features/chat/storage/createInMemoryChatStore";
import { MessageStatus, type ClientMessage, type ServerMessage } from "@/features/chat/types";

const conversationId = "conversation-1";
const senderId = "fan-1";

describe("useChatThread", () => {
  beforeEach(() => {
    resetConversationBackends();
  });

  it("shows a sent message optimistically as soon as sendMessage is called", async () => {
    const store = createInMemoryChatStore();
    const { result } = await renderHook(() => useChatThread(conversationId, senderId, store));

    await act(() => {
      result.current.sendMessage("hello there");
    });

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].message.text).toBe("hello there");

    await waitFor(() => {
      expect(result.current.messages[0].origin).toBe("server");
    });
  });

  it("lets a failed message be retried and resolves it once the backend accepts it", async () => {
    const store = createInMemoryChatStore();
    let isBackendReachable = false;

    const flakyBackend = {
      submitMessage(message: ClientMessage, senderId: string) {
        if (!isBackendReachable) {
          throw new Error("network unreachable");
        }

        const serverMessage: ServerMessage = {
          serverId: "srv_1",
          clientId: message.clientId,
          conversationId: message.conversationId,
          senderId,
          text: message.text,
          createdAt: message.createdAt,
        };

        return serverMessage;
      },
      listMessages: () => [],
    };

    const { result } = await renderHook(() =>
      useChatThread(conversationId, senderId, store, flakyBackend),
    );

    await act(() => {
      result.current.sendMessage("please deliver");
    });

    await waitFor(() => {
      expect(result.current.isOffline).toBe(true);
    });

    const failedMessage = result.current.messages[0].message as ClientMessage;
    expect(failedMessage.status).toBe(MessageStatus.Failed);

    isBackendReachable = true;

    await act(() => {
      result.current.retryMessage(failedMessage.clientId);
    });

    await waitFor(() => {
      expect(result.current.isOffline).toBe(false);
    });

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].origin).toBe("server");
  });
});
