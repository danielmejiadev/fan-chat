import {
  resetConversationBackends,
  setConversationBackendForTests,
} from "@/mockApi/chat/chatBackendRegistry";
import {
  enqueueMessage,
  flushPendingMessages,
  resetChatServiceStore,
  setChatServiceStoreForTests,
} from "@/features/chat/services/chatService";
import { createMockChatBackend } from "@/mockApi/chat/mockChatBackend";
import { createInMemoryChatStore } from "@/features/chat/storage/createInMemoryChatStore";
import type { ChatStore } from "@/features/chat/storage/chatStore";
import type { ClientMessage } from "@/features/chat/types";

/**
 * expo-sqlite is a native module — Jest runs in Node and cannot execute it —
 * so no Jest test can prove that 3 offline messages actually survive a real
 * force-quit of the app process. See PLAN.md ("Fase 1") for why that specific
 * scenario is out of reach here, and docs/manual-scenarios.md for the manual
 * iOS Simulator checklist that verifies it instead.
 *
 * What Jest CAN prove, and what force-quit recovery actually depends on, is
 * the contract behind it: enqueueMessage must write the message to the store
 * synchronously, strictly before any network attempt. If that ordering ever
 * broke, a message could exist only in JS memory during the gap between "user
 * hits send" and "write completes" — exactly the window a force-quit loses
 * data in. This suite pins that ordering down with a call-order spy, not a
 * simulated restart.
 */
/**
 * Wraps the shared in-memory ChatStore, instrumenting only the calls these
 * tests assert on. Delegating the rest avoids re-implementing the full
 * ChatStore contract a third time just to track call order.
 */
function createCallOrderSpyStore(callOrder: string[]): ChatStore {
  const store = createInMemoryChatStore();

  return {
    ...store,
    async insertPendingMessage(message: ClientMessage) {
      callOrder.push("store:insertPendingMessage");
      await store.insertPendingMessage(message);
    },
    async updatePendingMessageStatus(clientId, status) {
      callOrder.push("store:updatePendingMessageStatus");
      await store.updatePendingMessageStatus(clientId, status);
    },
    async deletePendingMessage(clientId) {
      callOrder.push("store:deletePendingMessage");
      await store.deletePendingMessage(clientId);
    },
  };
}

const conversationId = "conversation-1";
const senderId = "fan-1";

beforeEach(() => {
  resetConversationBackends();
});

afterEach(() => {
  resetChatServiceStore();
});

describe("chatService persistence guarantee (precondition for force-quit recovery)", () => {
  it("writes to the store before enqueueMessage resolves, with no network involved", async () => {
    const callOrder: string[] = [];
    setChatServiceStoreForTests(createCallOrderSpyStore(callOrder));

    await enqueueMessage(conversationId, "hello");

    expect(callOrder).toEqual(["store:insertPendingMessage"]);
  });

  it("never calls the network before the pending message is already persisted", async () => {
    const callOrder: string[] = [];
    setChatServiceStoreForTests(createCallOrderSpyStore(callOrder));
    const realBackend = createMockChatBackend();
    const spiedBackend = {
      ...realBackend,
      submitMessage(message: ClientMessage, submitterId: string) {
        callOrder.push("backend:submitMessage");
        return realBackend.submitMessage(message, submitterId);
      },
    };
    setConversationBackendForTests(conversationId, spiedBackend);

    await enqueueMessage(conversationId, "hello");
    await flushPendingMessages(conversationId, senderId);

    const persistIndex = callOrder.indexOf("store:insertPendingMessage");
    const networkIndex = callOrder.indexOf("backend:submitMessage");

    expect(persistIndex).toBe(0);
    expect(networkIndex).toBeGreaterThan(persistIndex);
  });
});
