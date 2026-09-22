import { act, renderHook, waitFor } from "@testing-library/react-native";

import {
  resetConversationBackends,
  setConversationBackendForTests,
} from "@/mockApi/chat/chatBackendRegistry";
import {
  resetChatServiceStore,
  setChatServiceStoreForTests,
  simulateIncomingMessages,
} from "@/features/chat/services/chatService";
import { useChatThread } from "@/features/chat/hooks/useChatThread";
import { createInMemoryChatStore } from "@/features/chat/storage/createInMemoryChatStore";
import { MessageStatus, type Message } from "@/features/chat/types";

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
    expect(result.current.messages[0].text).toBe("hello there");

    // The real-time submit + confirmation + follow-up-poll delays now stack
    // up past waitFor's default 1000ms timeout (see DEFAULT_SUBMIT_DELAY_MS
    // and DEFAULT_CONFIRMATION_DELAY_MS in mockChatBackend.ts).
    await waitFor(
      () => {
        expect(result.current.messages[0].status).toBe(MessageStatus.Confirmed);
      },
      { timeout: 3000 },
    );

    // Without this, the hook's pending reconcile timers keep firing after
    // the test ends and can hit a reset store in a later test.
    unmount();
  });

  it("lets a failed message be retried and resolves it once the backend accepts it", async () => {
    let isBackendReachable = false;
    // Confirmation is surfaced through listMessages(), same contract as the
    // real mock backend — just without an artificial delay, since this test
    // isn't exercising the Sent -> Confirmed timing.
    const confirmedMessages: Message[] = [];

    const flakyBackend = {
      async submitMessage(message: Message, submitterId: string) {
        if (!isBackendReachable) {
          throw new Error("network unreachable");
        }

        const confirmedMessage: Message = {
          id: "srv_1",
          serverId: "srv_1",
          clientId: message.clientId,
          conversationId: message.conversationId,
          senderId: submitterId,
          text: message.text,
          createdAt: message.createdAt,
          status: MessageStatus.Confirmed,
          failureReason: null,
        };

        confirmedMessages.push(confirmedMessage);

        return confirmedMessage;
      },
      listMessages: () => confirmedMessages,
      receiveIncomingMessage: () => {
        throw new Error("not used in this test");
      },
      subscribe: () => () => {},
    };
    setConversationBackendForTests(conversationId, flakyBackend);

    const { result, unmount } = await renderHook(() => useChatThread(conversationId, senderId));

    await act(() => {
      result.current.sendMessage("please deliver");
    });

    await waitFor(() => {
      expect(result.current.messages[0].status).toBe(MessageStatus.Failed);
    });

    const failedMessage = result.current.messages[0];

    isBackendReachable = true;

    await act(() => {
      result.current.retryMessage(failedMessage.id);
    });

    await waitFor(() => {
      expect(result.current.messages[0].status).toBe(MessageStatus.Confirmed);
    });

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].status).toBe(MessageStatus.Confirmed);

    unmount();
  });

  it("keeps a just-sent message visible when reconcile runs concurrently from multiple sources", async () => {
    const { result, unmount } = await renderHook(() => useChatThread(conversationId, senderId));

    // Mimics the real app: the connection reconciles on mount, and again
    // whenever the backend notifies it (here, simulated incoming messages
    // firing around the same time as a send) — all unguarded against each
    // other before the fix. Firing several overlapping triggers around the
    // send is what used to let a stale, in-flight read clobber the
    // optimistic pending message.
    await act(() => {
      simulateIncomingMessages(conversationId, "creator-1", ["hi"]);
      result.current.sendMessage("still here");
      simulateIncomingMessages(conversationId, "creator-1", ["hi again"]);
    });

    const findSentMessage = () =>
      result.current.messages.find((message) => message.text === "still here");

    // Poll repeatedly instead of a single assertion, since the bug was the
    // message disappearing transiently after first appearing.
    for (let checkIndex = 0; checkIndex < 10; checkIndex += 1) {
      expect(findSentMessage()).toBeDefined();
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });
    }

    await waitFor(
      () => {
        expect(findSentMessage()?.status).toBe(MessageStatus.Confirmed);
      },
      { timeout: 3000 },
    );
    expect(result.current.messages).toHaveLength(3);

    unmount();
  });

  it("loads the newest window first, then grows it on loadOlderMessages", async () => {
    const store = createInMemoryChatStore();
    const totalMessages = 45;
    await store.insertMessages(
      Array.from({ length: totalMessages }, (_, index) => ({
        id: `srv_${index}`,
        serverId: `srv_${index}`,
        clientId: null,
        conversationId,
        senderId: "creator-1",
        text: `message ${index}`,
        createdAt: index * 1000,
        status: MessageStatus.Confirmed,
        failureReason: null,
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
    expect(result.current.messages[0].text).toBe("message 15");

    await act(() => {
      result.current.loadOlderMessages();
    });

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(totalMessages);
    });
    expect(result.current.hasMoreOlderMessages).toBe(false);
    expect(result.current.messages[0].text).toBe("message 0");

    unmount();
  });
});
