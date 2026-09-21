import { enqueueMessage, flushPendingMessages } from "@/features/chat/services/chatService";
import { createMockChatBackend } from "@/features/chat/services/mockChatBackend";
import type { ChatStore } from "@/features/chat/storage/chatStore";
import type { ClientMessage, ServerMessage } from "@/features/chat/types";

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
function createCallOrderSpyStore(callOrder: string[]): ChatStore {
  const pendingMessages = new Map<string, ClientMessage>();
  const messages = new Map<string, ServerMessage>();
  const acceptedClientIds = new Map<string, string>();

  return {
    insertPendingMessage(message) {
      callOrder.push("store:insertPendingMessage");
      pendingMessages.set(message.clientId, message);
    },
    updatePendingMessageStatus(clientId, status) {
      callOrder.push("store:updatePendingMessageStatus");
      const existing = pendingMessages.get(clientId);
      if (existing !== undefined) {
        pendingMessages.set(clientId, { ...existing, status });
      }
    },
    deletePendingMessage(clientId) {
      callOrder.push("store:deletePendingMessage");
      pendingMessages.delete(clientId);
    },
    getPendingMessages(conversationId) {
      return Array.from(pendingMessages.values())
        .filter((message) => message.conversationId === conversationId)
        .sort((a, b) => a.createdAt - b.createdAt);
    },
    isClientIdAccepted(clientId) {
      return acceptedClientIds.has(clientId);
    },
    recordAcceptedClientId(clientId, serverId) {
      acceptedClientIds.set(clientId, serverId);
    },
    insertMessage(message) {
      messages.set(message.serverId, message);
    },
    getThreadMessages(conversationId) {
      return Array.from(messages.values()).filter(
        (message) => message.conversationId === conversationId,
      );
    },
  };
}

const conversationId = "conversation-1";
const senderId = "fan-1";

describe("chatService persistence guarantee (precondition for force-quit recovery)", () => {
  it("writes to the store synchronously before enqueueMessage returns, with no network involved", () => {
    const callOrder: string[] = [];
    const store = createCallOrderSpyStore(callOrder);

    enqueueMessage(conversationId, "hello", store);

    expect(callOrder).toEqual(["store:insertPendingMessage"]);
  });

  it("never calls the network before the pending message is already persisted", () => {
    const callOrder: string[] = [];
    const store = createCallOrderSpyStore(callOrder);
    const realBackend = createMockChatBackend();
    const spiedBackend = {
      submitMessage(message: ClientMessage, submitterId: string) {
        callOrder.push("backend:submitMessage");
        return realBackend.submitMessage(message, submitterId);
      },
      listMessages: realBackend.listMessages,
    };

    enqueueMessage(conversationId, "hello", store);
    flushPendingMessages(spiedBackend, conversationId, senderId, store);

    const persistIndex = callOrder.indexOf("store:insertPendingMessage");
    const networkIndex = callOrder.indexOf("backend:submitMessage");

    expect(persistIndex).toBe(0);
    expect(networkIndex).toBeGreaterThan(persistIndex);
  });
});
