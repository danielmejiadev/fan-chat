import {
  enqueueMessage,
  flushPendingMessages,
  getConfirmedThread,
  getPendingMessages,
  receiveMessages,
  syncThread,
} from "@/features/chat/services/chatService";
import {
  createMockChatBackend,
  ResponseLostError,
  type MockChatBackend,
} from "@/features/chat/services/mockChatBackend";
import { createInMemoryChatStore } from "@/features/chat/storage/createInMemoryChatStore";
import { MessageStatus, type ServerMessage } from "@/features/chat/types";

/**
 * Wraps a MockChatBackend so the first submission for each listed clientId
 * reaches the backend (which stores it) but then throws ResponseLostError,
 * simulating a response dropped in transit. Every later call — the retry —
 * goes straight to the backend, unmodified.
 */
function createResponseDroppingBackend(
  backend: MockChatBackend,
  dropOnceFor: string[],
): MockChatBackend {
  const pending = new Set(dropOnceFor);

  return {
    ...backend,
    submitMessage(message, senderId, options) {
      if (pending.has(message.clientId)) {
        pending.delete(message.clientId);
        backend.submitMessage(message, senderId);
        throw new ResponseLostError();
      }

      return backend.submitMessage(message, senderId, options);
    },
  };
}

const conversationId = "conversation-1";
const senderId = "fan-1";

describe("chatService bug reproduction: lost response after retry", () => {
  it("documents the bug — a backend that does not dedupe by clientId creates two messages", () => {
    const store = createInMemoryChatStore();
    const buggyBackend = createMockChatBackend(false);

    const message = enqueueMessage(conversationId, "hello", store);

    // First attempt: backend accepts and stores it, but the response is lost.
    const droppingOnce = createResponseDroppingBackend(buggyBackend, [message.clientId]);
    flushPendingMessages(droppingOnce, conversationId, senderId, store);
    expect(getPendingMessages(conversationId, store)[0].status).toBe(MessageStatus.Failed);

    // Retry: same clientId, but the buggy backend has no memory of it — a
    // second message is created server-side.
    flushPendingMessages(buggyBackend, conversationId, senderId, store);

    // Reconnect sync pulls the backend's canonical thread, surfacing both.
    syncThread(buggyBackend, conversationId, store);

    expect(getConfirmedThread(conversationId, store)).toHaveLength(2);
  });
});

describe("chatService fix: idempotent retry after a lost response", () => {
  it("resolves to a single message no matter how many times the retry runs", () => {
    const store = createInMemoryChatStore();
    const backend = createMockChatBackend(true);

    const message = enqueueMessage(conversationId, "hello", store);

    const droppingOnce = createResponseDroppingBackend(backend, [message.clientId]);
    flushPendingMessages(droppingOnce, conversationId, senderId, store);
    expect(getPendingMessages(conversationId, store)[0].status).toBe(MessageStatus.Failed);
    expect(getConfirmedThread(conversationId, store)).toHaveLength(0);

    flushPendingMessages(backend, conversationId, senderId, store);
    syncThread(backend, conversationId, store);

    const thread = getConfirmedThread(conversationId, store);
    expect(thread).toHaveLength(1);
    expect(thread[0].text).toBe("hello");
    expect(getPendingMessages(conversationId, store)).toHaveLength(0);
  });

  it("still resolves to one message after a third redundant retry", () => {
    const store = createInMemoryChatStore();
    const backend = createMockChatBackend(true);

    enqueueMessage(conversationId, "hello", store);

    flushPendingMessages(backend, conversationId, senderId, store);
    flushPendingMessages(backend, conversationId, senderId, store);
    flushPendingMessages(backend, conversationId, senderId, store);
    syncThread(backend, conversationId, store);

    expect(getConfirmedThread(conversationId, store)).toHaveLength(1);
  });
});

describe("chatService offline queueing", () => {
  it("keeps messages pending, in order, until they are flushed", () => {
    const store = createInMemoryChatStore();

    enqueueMessage(conversationId, "first", store);
    enqueueMessage(conversationId, "second", store);
    enqueueMessage(conversationId, "third", store);

    const pending = getPendingMessages(conversationId, store);

    expect(pending.map((message) => message.text)).toEqual(["first", "second", "third"]);
    expect(pending.every((message) => message.status === MessageStatus.Pending)).toBe(true);
    expect(getConfirmedThread(conversationId, store)).toHaveLength(0);
  });
});

describe("chatService incoming message reconciliation", () => {
  it("does not duplicate the thread when the same batch is received twice", () => {
    const store = createInMemoryChatStore();
    const incoming: ServerMessage[] = [
      {
        serverId: "srv_a",
        clientId: null,
        conversationId,
        senderId: "creator-1",
        text: "hi",
        createdAt: 1,
      },
      {
        serverId: "srv_b",
        clientId: null,
        conversationId,
        senderId: "creator-1",
        text: "how are you",
        createdAt: 2,
      },
      {
        serverId: "srv_c",
        clientId: null,
        conversationId,
        senderId: "creator-1",
        text: "there",
        createdAt: 3,
      },
      {
        serverId: "srv_d",
        clientId: null,
        conversationId,
        senderId: "creator-1",
        text: "?",
        createdAt: 4,
      },
    ];

    receiveMessages(incoming, store);
    receiveMessages(incoming, store);

    expect(getConfirmedThread(conversationId, store)).toHaveLength(4);
  });
});

describe("chatService failure handling", () => {
  it("preserves the text and marks the message failed when the backend rejects it", () => {
    const store = createInMemoryChatStore();
    const unreachableBackend: MockChatBackend = {
      submitMessage() {
        throw new Error("network unreachable");
      },
      listMessages() {
        return [];
      },
      receiveIncomingMessage() {
        throw new Error("not used in this test");
      },
    };

    enqueueMessage(conversationId, "please deliver", store);
    flushPendingMessages(unreachableBackend, conversationId, senderId, store);

    const pending = getPendingMessages(conversationId, store);
    expect(pending).toHaveLength(1);
    expect(pending[0].status).toBe(MessageStatus.Failed);
    expect(pending[0].text).toBe("please deliver");
  });
});
