import {
  resetConversationBackends,
  setConversationBackendForTests,
} from "@/mockApi/chat/chatBackendRegistry";
import {
  enqueueMessage,
  flushPendingMessages,
  getConfirmedThread,
  getNonConfirmedMessages,
  receiveMessages,
  resetChatServiceStore,
  setChatServiceStoreForTests,
  syncThread,
} from "@/features/chat/services/chatService";
import {
  createMockChatBackend,
  DEFAULT_CONFIRMATION_DELAY_MS,
  DEFAULT_SUBMIT_DELAY_MS,
  ResponseLostError,
  type MockChatBackend,
} from "@/mockApi/chat/mockChatBackend";
import { createInMemoryChatStore } from "@/features/chat/storage/createInMemoryChatStore";
import { MessageStatus, type Message } from "@/features/chat/types";

/**
 * Wraps a MockChatBackend so the first submission for each listed id
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
    async submitMessage(message, senderId, options) {
      if (message.clientId !== null && pending.has(message.clientId)) {
        pending.delete(message.clientId);
        await backend.submitMessage(message, senderId);
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

/**
 * flushPendingMessages() now awaits the backend's submission delay (see
 * DEFAULT_SUBMIT_DELAY_MS in mockChatBackend.ts) before it resolves — under
 * fake timers that await never settles on its own, so this starts the flush
 * and advances timers past the submit delay concurrently.
 */
async function flushPastSubmitDelay(conversationId: string, senderId: string): Promise<void> {
  const flushPromise = flushPendingMessages(conversationId, senderId);
  await jest.advanceTimersByTimeAsync(DEFAULT_SUBMIT_DELAY_MS);
  await flushPromise;
}

describe("chatService bug reproduction: a non-deduping backend creates a duplicate server-side", () => {
  it("stores two confirmed messages on the backend, but the client's own thread only ever shows one", async () => {
    const buggyBackend = createMockChatBackend(false);

    const message = await enqueueMessage(conversationId, senderId, "hello");

    // First attempt: backend accepts and stores it, but the response is lost.
    const droppingOnce = createResponseDroppingBackend(buggyBackend, [message.id]);
    setConversationBackendForTests(conversationId, droppingOnce);
    await flushPastSubmitDelay(conversationId, senderId);
    expect((await getNonConfirmedMessages(conversationId))[0].status).toBe(MessageStatus.Failed);

    // Retry: same id, but the buggy backend has no memory of it — a second
    // message is created server-side.
    setConversationBackendForTests(conversationId, buggyBackend);
    await flushPastSubmitDelay(conversationId, senderId);
    await advancePastBackendConfirmation();

    // The backend's own canonical thread really does hold two messages —
    // this is the underlying bug, still reproducible when dedupeByClientId
    // is off.
    expect(buggyBackend.listMessages(conversationId)).toHaveLength(2);

    // But the client reconciles by id (the original id, fixed since
    // enqueueMessage), so a second confirmation for that same id just
    // updates the one local row again instead of creating a second one —
    // no visible duplicate reaches the UI, even against a broken backend.
    await syncThread(conversationId);
    expect(await getConfirmedThread(conversationId)).toHaveLength(1);
  });
});

describe("chatService fix: idempotent retry after a lost response", () => {
  it("resolves to a single message no matter how many times the retry runs", async () => {
    const backend = createMockChatBackend(true);

    const message = await enqueueMessage(conversationId, senderId, "hello");

    const droppingOnce = createResponseDroppingBackend(backend, [message.id]);
    setConversationBackendForTests(conversationId, droppingOnce);
    await flushPastSubmitDelay(conversationId, senderId);
    expect((await getNonConfirmedMessages(conversationId))[0].status).toBe(MessageStatus.Failed);
    expect(await getConfirmedThread(conversationId)).toHaveLength(0);

    setConversationBackendForTests(conversationId, backend);
    await flushPastSubmitDelay(conversationId, senderId);
    await advancePastBackendConfirmation();
    await syncThread(conversationId);

    const thread = await getConfirmedThread(conversationId);
    expect(thread).toHaveLength(1);
    expect(thread[0].text).toBe("hello");
    expect(await getNonConfirmedMessages(conversationId)).toHaveLength(0);
  });

  it("still resolves to one message after a third redundant retry", async () => {
    setConversationBackendForTests(conversationId, createMockChatBackend(true));

    await enqueueMessage(conversationId, senderId, "hello");

    await flushPastSubmitDelay(conversationId, senderId);
    await flushPastSubmitDelay(conversationId, senderId);
    await flushPastSubmitDelay(conversationId, senderId);
    await advancePastBackendConfirmation();
    await syncThread(conversationId);

    expect(await getConfirmedThread(conversationId)).toHaveLength(1);
  });
});

describe("chatService delivery ticks: Pending stays observable before Sent is confirmed accepted", () => {
  it("does not resolve flushPendingMessages until the backend's submit delay elapses", async () => {
    setConversationBackendForTests(conversationId, createMockChatBackend(true));

    await enqueueMessage(conversationId, senderId, "hello");

    let hasFlushResolved = false;
    const flushPromise = flushPendingMessages(conversationId, senderId).then(() => {
      hasFlushResolved = true;
    });

    // The caller (useMessages' submit) only notifies the UI to re-render
    // with the Sent status after flushPendingMessages resolves — this delay
    // is what keeps the client's optimistic Pending bubble on screen for a
    // beat instead of flipping to Sent virtually instantly.
    await jest.advanceTimersByTimeAsync(DEFAULT_SUBMIT_DELAY_MS - 1);
    expect(hasFlushResolved).toBe(false);

    await jest.advanceTimersByTimeAsync(1);
    await flushPromise;
    expect(hasFlushResolved).toBe(true);
  });
});

describe("chatService delivery ticks: Sent stays observable before Confirmed", () => {
  it("keeps a message as Sent (single check) until the backend's delayed confirmation promotes it", async () => {
    setConversationBackendForTests(conversationId, createMockChatBackend(true));

    await enqueueMessage(conversationId, senderId, "hello");
    await flushPastSubmitDelay(conversationId, senderId);

    // The backend accepted the submission (Sent), but hasn't yet surfaced it
    // in its canonical thread — nothing to reconcile into Confirmed yet.
    const nonConfirmedBeforeConfirmation = await getNonConfirmedMessages(conversationId);
    expect(nonConfirmedBeforeConfirmation).toHaveLength(1);
    expect(nonConfirmedBeforeConfirmation[0].status).toBe(MessageStatus.Sent);
    expect(await getConfirmedThread(conversationId)).toHaveLength(0);

    await advancePastBackendConfirmation();
    await syncThread(conversationId);

    expect(await getNonConfirmedMessages(conversationId)).toHaveLength(0);
    const confirmedThread = await getConfirmedThread(conversationId);
    expect(confirmedThread).toHaveLength(1);
    expect(confirmedThread[0].text).toBe("hello");
  });
});

describe("chatService offline queueing", () => {
  it("keeps messages pending, in order, until they are flushed", async () => {
    await enqueueMessage(conversationId, senderId, "first");
    await enqueueMessage(conversationId, senderId, "second");
    await enqueueMessage(conversationId, senderId, "third");

    const nonConfirmed = await getNonConfirmedMessages(conversationId);

    expect(nonConfirmed.map((message) => message.text)).toEqual(["first", "second", "third"]);
    expect(nonConfirmed.every((message) => message.status === MessageStatus.Pending)).toBe(true);
    expect(await getConfirmedThread(conversationId)).toHaveLength(0);
  });
});

describe("chatService incoming message reconciliation", () => {
  it("does not duplicate the thread when the same batch is received twice", async () => {
    const incoming: Message[] = [
      { text: "hi", createdAt: 1 },
      { text: "how are you", createdAt: 2 },
      { text: "there", createdAt: 3 },
      { text: "?", createdAt: 4 },
    ].map(({ text, createdAt }, index) => ({
      id: `srv_${index}`,
      serverId: `srv_${index}`,
      clientId: null,
      conversationId,
      senderId: "creator-1",
      text,
      createdAt,
      status: MessageStatus.Confirmed,
      failureReason: null,
    }));

    await receiveMessages(incoming);
    await receiveMessages(incoming);

    expect(await getConfirmedThread(conversationId)).toHaveLength(4);
  });
});

describe("chatService failure handling", () => {
  it("preserves the text and marks the message failed when the backend rejects it", async () => {
    const unreachableBackend: MockChatBackend = {
      async submitMessage() {
        throw new Error("network unreachable");
      },
      listMessages() {
        return [];
      },
      receiveIncomingMessage() {
        throw new Error("not used in this test");
      },
      subscribe() {
        return () => {};
      },
    };
    setConversationBackendForTests(conversationId, unreachableBackend);

    await enqueueMessage(conversationId, senderId, "please deliver");
    await flushPendingMessages(conversationId, senderId);

    const nonConfirmed = await getNonConfirmedMessages(conversationId);
    expect(nonConfirmed).toHaveLength(1);
    expect(nonConfirmed[0].status).toBe(MessageStatus.Failed);
    expect(nonConfirmed[0].text).toBe("please deliver");
  });
});
