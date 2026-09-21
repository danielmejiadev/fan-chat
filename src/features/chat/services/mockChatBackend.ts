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

export type MockChatBackend = {
  submitMessage: (
    message: ClientMessage,
    senderId: string,
    options?: { dropResponse?: boolean },
  ) => ServerMessage;
  /**
   * The backend's canonical thread. A client only sees its own submissions
   * through submitMessage's return value — if that response was lost, the
   * duplicate a non-deduping backend created is invisible until the client
   * reconciles against this list, e.g. on reconnect.
   */
  listMessages: (conversationId: string) => ServerMessage[];
};

/**
 * dedupeByClientId controls whether the backend recognizes a retried
 * clientId as the same submission (the fix) or always creates a new message
 * (the bug). Production code always uses the default, deduping backend —
 * the non-deduping one exists only to reproduce the duplicate-message bug in
 * tests.
 */
export function createMockChatBackend(dedupeByClientId: boolean = true): MockChatBackend {
  const messages: ServerMessage[] = [];
  const acceptedByClientId = new Map<string, ServerMessage>();
  let nextServerId = 1;

  return {
    submitMessage(message, senderId, options) {
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
  };
}
