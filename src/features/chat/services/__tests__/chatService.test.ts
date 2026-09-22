import {
  resetConversationBackends,
  setConversationBackendForTests,
} from "@/mockApi/chat/chatBackendRegistry";
import {
  enqueueMessage,
  flushPendingMessages,
  getConfirmedThread,
  getPendingMessages,
  receiveMessages,
  resetChatServiceStore,
  setChatServiceStoreForTests,
  syncThread,
} from "@/features/chat/services/chatService";
import {
  createMockChatBackend,
  DEFAULT_CONFIRMATION_DELAY_MS,
  ResponseLostError,
  type MockChatBackend,
} from "@/mockApi/chat/mockChatBackend";
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

beforeEach(() => {
  jest.useFakeTimers();
  resetConversationBackends();
  setChatServiceStoreForTests(createInMemoryChatStore());
});

afterEach(() => {
  resetChatServiceStore();
  jest.useRealTimers();
});

/**
 * The mock backend confirms a submission asynchronously (see
 * DEFAULT_CONFIRMATION_DELAY_MS in mockChatBackend.ts) — advancing fake
 * timers past that delay is what makes the confirmed message actually show
 * up in listMessages()/syncThread, without a real-time sleep in the test.
 */
async function advancePastBackendConfirmation(): Promise<void> {
  await jest.advanceTimersByTimeAsync(DEFAULT_CONFIRMATION_DELAY_MS);
}

describe("chatService bug reproduction: lost response after retry", () => {
  it("documents the bug — a backend that does not dedupe by clientId creates two messages", async () => {
    const buggyBackend = createMockChatBackend(false);

    const message = await enqueueMessage(conversationId, "hello");

    // First attempt: backend accepts and stores it, but the response is lost.
    const droppingOnce = createResponseDroppingBackend(buggyBackend, [message.clientId]);
    setConversationBackendForTests(conversationId, droppingOnce);
    await flushPendingMessages(conversationId, senderId);
    expect((await getPendingMessages(conversationId))[0].status).toBe(MessageStatus.Failed);

    // Retry: same clientId, but the buggy backend has no memory of it — a
    // second message is created server-side.
    setConversationBackendForTests(conversationId, buggyBackend);
    await flushPendingMessages(conversationId, senderId);
    await advancePastBackendConfirmation();

    // Reconnect sync pulls the backend's canonical thread, surfacing both.
    await syncThread(conversationId);

    expect(await getConfirmedThread(conversationId)).toHaveLength(2);
  });
});

describe("chatService fix: idempotent retry after a lost response", () => {
  it("resolves to a single message no matter how many times the retry runs", async () => {
    const backend = createMockChatBackend(true);

    const message = await enqueueMessage(conversationId, "hello");

    const droppingOnce = createResponseDroppingBackend(backend, [message.clientId]);
    setConversationBackendForTests(conversationId, droppingOnce);
    await flushPendingMessages(conversationId, senderId);
    expect((await getPendingMessages(conversationId))[0].status).toBe(MessageStatus.Failed);
    expect(await getConfirmedThread(conversationId)).toHaveLength(0);

    setConversationBackendForTests(conversationId, backend);
    await flushPendingMessages(conversationId, senderId);
    await advancePastBackendConfirmation();
    await syncThread(conversationId);

    const thread = await getConfirmedThread(conversationId);
    expect(thread).toHaveLength(1);
    expect(thread[0].text).toBe("hello");
    expect(await getPendingMessages(conversationId)).toHaveLength(0);
  });

  it("still resolves to one message after a third redundant retry", async () => {
    setConversationBackendForTests(conversationId, createMockChatBackend(true));

    await enqueueMessage(conversationId, "hello");

    await flushPendingMessages(conversationId, senderId);
    await flushPendingMessages(conversationId, senderId);
    await flushPendingMessages(conversationId, senderId);
    await advancePastBackendConfirmation();
    await syncThread(conversationId);

    expect(await getConfirmedThread(conversationId)).toHaveLength(1);
  });
});

describe("chatService delivery ticks: Sent stays observable before Confirmed", () => {
  it("keeps a message as Sent (single check) until the backend's delayed confirmation promotes it", async () => {
    setConversationBackendForTests(conversationId, createMockChatBackend(true));

    await enqueueMessage(conversationId, "hello");
    await flushPendingMessages(conversationId, senderId);

    // The backend accepted the submission (Sent), but hasn't yet surfaced it
    // in its canonical thread — nothing to reconcile into "Confirmed" yet.
    const pendingBeforeConfirmation = await getPendingMessages(conversationId);
    expect(pendingBeforeConfirmation).toHaveLength(1);
    expect(pendingBeforeConfirmation[0].status).toBe(MessageStatus.Sent);
    expect(await getConfirmedThread(conversationId)).toHaveLength(0);

    await advancePastBackendConfirmation();
    await syncThread(conversationId);

    expect(await getPendingMessages(conversationId)).toHaveLength(0);
    const confirmedThread = await getConfirmedThread(conversationId);
    expect(confirmedThread).toHaveLength(1);
    expect(confirmedThread[0].text).toBe("hello");
  });
});

describe("chatService offline queueing", () => {
  it("keeps messages pending, in order, until they are flushed", async () => {
    await enqueueMessage(conversationId, "first");
    await enqueueMessage(conversationId, "second");
    await enqueueMessage(conversationId, "third");

    const pending = await getPendingMessages(conversationId);

    expect(pending.map((message) => message.text)).toEqual(["first", "second", "third"]);
    expect(pending.every((message) => message.status === MessageStatus.Pending)).toBe(true);
    expect(await getConfirmedThread(conversationId)).toHaveLength(0);
  });
});

describe("chatService incoming message reconciliation", () => {
  it("does not duplicate the thread when the same batch is received twice", async () => {
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

    await receiveMessages(incoming);
    await receiveMessages(incoming);

    expect(await getConfirmedThread(conversationId)).toHaveLength(4);
  });
});

describe("chatService failure handling", () => {
  it("preserves the text and marks the message failed when the backend rejects it", async () => {
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
    setConversationBackendForTests(conversationId, unreachableBackend);

    await enqueueMessage(conversationId, "please deliver");
    await flushPendingMessages(conversationId, senderId);

    const pending = await getPendingMessages(conversationId);
    expect(pending).toHaveLength(1);
    expect(pending[0].status).toBe(MessageStatus.Failed);
    expect(pending[0].text).toBe("please deliver");
  });
});
