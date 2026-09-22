import { act, renderHook, waitFor } from "@testing-library/react-native";

import {
  resetConversationBackends,
  setConversationBackendForTests,
} from "@/mockApi/chat/chatBackendRegistry";
import {
  resetChatServiceStore,
  setChatServiceStoreForTests,
} from "@/features/chat/services/chatService";
import { useChatThread } from "@/features/chat/hooks/useChatThread";
import { createInMemoryChatStore } from "@/features/chat/storage/createInMemoryChatStore";
import { MessageStatus, type ClientMessage, type ServerMessage } from "@/features/chat/types";

// Deliberately not a MOCK_CONVERSATIONS id, so the registry's mock backend
// starts with no seed messages and tests aren't coupled to fixture data.
const conversationId = "test-conversation";
const senderId = "fan-1";

describe("useChatThread", () => {
  beforeEach(() => {
    resetConversationBackends();
    setChatServiceStoreForTests(createInMemoryChatStore());
  });

  afterEach(() => {
    resetChatServiceStore();
  });

  it("shows a sent message optimistically as soon as sendMessage is called", async () => {
    const { result, unmount } = await renderHook(() => useChatThread(conversationId, senderId));

    await act(() => {
      result.current.sendMessage("hello there");
    });

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(1);
    });
    expect(result.current.messages[0].message.text).toBe("hello there");

    await waitFor(() => {
      expect(result.current.messages[0].origin).toBe("server");
    });

    // Without this, the hook's pending reconcile timers keep firing after
    // the test ends and can hit a reset store in a later test.
    unmount();
  });

  it("lets a failed message be retried and resolves it once the backend accepts it", async () => {
    let isBackendReachable = false;
    // Confirmation is surfaced through listMessages(), same contract as the
    // real mock backend — just without an artificial delay, since this test
    // isn't exercising the Sent -> Confirmed timing.
    const confirmedMessages: ServerMessage[] = [];

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

        confirmedMessages.push(serverMessage);

        return serverMessage;
      },
      listMessages: () => confirmedMessages,
      receiveIncomingMessage: () => {
        throw new Error("not used in this test");
      },
    };
    setConversationBackendForTests(conversationId, flakyBackend);

    const { result, unmount } = await renderHook(() => useChatThread(conversationId, senderId));

    await act(() => {
      result.current.sendMessage("please deliver");
    });

    await waitFor(() => {
      const failedMessage = result.current.messages[0].message as ClientMessage;
      expect(failedMessage.status).toBe(MessageStatus.Failed);
    });

    const failedMessage = result.current.messages[0].message as ClientMessage;

    isBackendReachable = true;

    await act(() => {
      result.current.retryMessage(failedMessage.clientId);
    });

    await waitFor(() => {
      expect(result.current.messages[0].origin).toBe("server");
    });

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].origin).toBe("server");

    unmount();
  });

  it("loads the newest window first, then grows it on loadOlderMessages", async () => {
    const store = createInMemoryChatStore();
    const totalMessages = 45;
    await store.insertMessages(
      Array.from({ length: totalMessages }, (_, index) => ({
        serverId: `srv_${index}`,
        clientId: null,
        conversationId,
        senderId: "creator-1",
        text: `message ${index}`,
        createdAt: index * 1000,
      })),
    );
    setChatServiceStoreForTests(store);

    const { result, unmount } = await renderHook(() => useChatThread(conversationId, senderId));

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(30);
    });
    expect(result.current.hasMoreOlderMessages).toBe(true);
    // Newest-first window, then re-sorted chronologically: the oldest
    // message visible should be the 16th (index 15), not index 0.
    expect(result.current.messages[0].message.text).toBe("message 15");

    await act(() => {
      result.current.loadOlderMessages();
    });

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(totalMessages);
    });
    expect(result.current.hasMoreOlderMessages).toBe(false);
    expect(result.current.messages[0].message.text).toBe("message 0");

    unmount();
  });
});
