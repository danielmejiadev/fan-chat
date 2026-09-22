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
/**
 * Shared across every backend instance (one per conversationId) so serverId
 * stays globally unique — the messages table's primary key isn't scoped by
 * conversationId, so two backends both starting their own counter at 1 would
 * collide and silently drop one conversation's messages via INSERT OR IGNORE.
 */
let nextServerId = 1;

export function createMockChatBackend(
  dedupeByClientId: boolean = true,
  seedMessages: SeedMessage[] = [],
): MockChatBackend {
  // seed.serverId is deterministic (fixed per conversationId + index), not
  // drawn from nextServerId: the mock backend and its counter are recreated
  // from scratch on every app reload, but the messages table in SQLite
  // persists across reloads. A counter-based id would mint a "new" row for
  // the same seed message on every reload, and INSERT OR IGNORE would never
  // recognize it as a duplicate — accumulating repeated openers over time.
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
