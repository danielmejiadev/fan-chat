import { createMockChatBackend } from "@/mockApi/chat/mockChatBackend";
import { MessageStatus, type ClientMessage } from "@/features/chat/types";

const conversationId = "conversation-1";
const senderId = "fan-1";

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("mockChatBackend subscribe", () => {
  it("notifies listeners once a submitted message joins the canonical thread", async () => {
    const backend = createMockChatBackend(true, [], 50, 10);
    const notifications: number[] = [];
    const unsubscribe = backend.subscribe(() => {
      notifications.push(Date.now());
    });

    const message: ClientMessage = {
      clientId: "client-1",
      conversationId,
      text: "hello",
      createdAt: Date.now(),
      status: MessageStatus.Pending,
    };

    const submitPromise = backend.submitMessage(message, senderId);
    await jest.advanceTimersByTimeAsync(10);
    await submitPromise;

    // Accepted, but not yet in the canonical thread — no notification yet.
    expect(notifications).toHaveLength(0);
    expect(backend.listMessages(conversationId)).toHaveLength(0);

    await jest.advanceTimersByTimeAsync(50);

    expect(notifications).toHaveLength(1);
    expect(backend.listMessages(conversationId)).toHaveLength(1);

    unsubscribe();
  });

  it("notifies listeners immediately for an incoming message, and stops after unsubscribe", () => {
    const backend = createMockChatBackend();
    let notificationCount = 0;
    const unsubscribe = backend.subscribe(() => {
      notificationCount += 1;
    });

    backend.receiveIncomingMessage(conversationId, "creator-1", "hi");
    expect(notificationCount).toBe(1);

    unsubscribe();

    backend.receiveIncomingMessage(conversationId, "creator-1", "still there?");
    expect(notificationCount).toBe(1);
  });

  it("supports multiple independent listeners without one dropping the other's notification", () => {
    const backend = createMockChatBackend();
    let firstListenerCalls = 0;
    let secondListenerCalls = 0;
    backend.subscribe(() => {
      firstListenerCalls += 1;
    });
    backend.subscribe(() => {
      secondListenerCalls += 1;
    });

    backend.receiveIncomingMessage(conversationId, "creator-1", "hi");

    expect(firstListenerCalls).toBe(1);
    expect(secondListenerCalls).toBe(1);
  });
});
