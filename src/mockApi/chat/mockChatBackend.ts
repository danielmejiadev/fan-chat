import type { SeedMessage } from "@/features/chat/constants/mockMessages";
import type { ClientMessage, ServerMessage } from "@/features/chat/types";

/**
 * Thrown when the backend accepted and stored the message, but the response
 * never reached the client (dropped connection, backgrounded app, etc). This
 * is the "lost response after retry" scenario: the client cannot tell success
 * from failure and must retry with the same clientId.
 */
export class ResponseLostError extends Error {
  constructor() {
    super("The backend accepted the message but the response was lost in transit");
    this.name = "ResponseLostError";
  }
}

/**
 * Thrown when the backend refuses the content outright — never accepted, so
 * there is nothing to reconcile on retry. Unlike ResponseLostError, retrying
 * the same text is pointless; the UI must offer a different action instead
 * of "tap to retry".
 */
export class ContentRejectedError extends Error {
  constructor() {
    super("The backend rejected this message's content");
    this.name = "ContentRejectedError";
  }
}

export type MockChatBackend = {
  submitMessage: (
    message: ClientMessage,
    senderId: string,
    options?: { dropResponse?: boolean; rejectContent?: boolean },
  ) => ServerMessage;
  /**
   * The backend's canonical thread. A client only sees its own submissions
   * through submitMessage's return value — if that response was lost, the
   * duplicate a non-deduping backend created is invisible until the client
   * reconciles against this list, e.g. on reconnect.
   */
  listMessages: (conversationId: string) => ServerMessage[];
  /**
   * Simulates the other participant sending a message — there is no
   * clientId because it did not originate on this device. Only visible to a
   * client after its next syncThread, same as any other backend-side change.
   */
  receiveIncomingMessage: (conversationId: string, senderId: string, text: string) => ServerMessage;
};

/**
 * dedupeByClientId controls whether the backend recognizes a retried
 * clientId as the same submission (the fix) or always creates a new message
 * (the bug). Production code always uses the default, deduping backend —
 * the non-deduping one exists only to reproduce the duplicate-message bug in
 * tests.
 */
/** Shared across every backend instance so serverId stays unique regardless of conversationId. */
let nextServerId = 1;

export function createMockChatBackend(
  dedupeByClientId: boolean = true,
  seedMessages: SeedMessage[] = [],
): MockChatBackend {
  // seed.serverId must stay identical across reloads for INSERT OR IGNORE to dedupe it.
  const messages: ServerMessage[] = seedMessages.map((seed) => ({
    serverId: seed.serverId,
    clientId: null,
    conversationId: seed.conversationId,
    senderId: seed.senderId,
    text: seed.text,
    createdAt: seed.createdAt,
  }));
  const acceptedByClientId = new Map<string, ServerMessage>();

  return {
    submitMessage(message, senderId, options) {
      if (options?.rejectContent === true) {
        throw new ContentRejectedError();
      }

      const existing = dedupeByClientId ? acceptedByClientId.get(message.clientId) : undefined;

      const serverMessage: ServerMessage = existing ?? {
        serverId: `srv_${nextServerId++}`,
        clientId: message.clientId,
        conversationId: message.conversationId,
        senderId,
        text: message.text,
        createdAt: message.createdAt,
      };

      if (existing === undefined) {
        acceptedByClientId.set(message.clientId, serverMessage);
        messages.push(serverMessage);
      }

      if (options?.dropResponse === true) {
        throw new ResponseLostError();
      }

      return serverMessage;
    },

    listMessages(conversationId) {
      return messages.filter((message) => message.conversationId === conversationId);
    },

    receiveIncomingMessage(conversationId, senderId, text) {
      const serverMessage: ServerMessage = {
        serverId: `srv_${nextServerId++}`,
        clientId: null,
        conversationId,
        senderId,
        text,
        createdAt: Date.now(),
      };

      messages.push(serverMessage);

      return serverMessage;
    },
  };
}
