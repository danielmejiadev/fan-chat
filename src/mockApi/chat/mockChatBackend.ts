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
  ) => Promise<ServerMessage>;
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
   * client after its next syncThread, same as any other backend-side change,
   * or immediately via subscribe() if the client is connected.
   */
  receiveIncomingMessage: (conversationId: string, senderId: string, text: string) => ServerMessage;
  /**
   * Registers a listener that fires whenever a message joins the canonical
   * thread — this client's own delayed confirmation, or the other
   * participant's incoming message. Mirrors a real socket channel: the
   * notification carries no payload, so a listener re-pulls via
   * listMessages()/syncThread, same as it would reconcile a socket "there's
   * new data" frame. Returns an unsubscribe function.
   */
  subscribe: (listener: () => void) => () => void;
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

/**
 * How long the backend takes, after accepting a submission, to make it part
 * of its canonical thread (i.e. what listMessages()/syncThread surface).
 * This is what the client observes as the Sent → Confirmed (single check →
 * double check) gap — short enough to not annoy manual testing, long enough
 * to read clearly in a demo recording.
 */
export const DEFAULT_CONFIRMATION_DELAY_MS = 600;

/**
 * How long the backend takes to accept/reject a submission in the first
 * place. This is what the client observes as the Pending → Sent (clock →
 * single check) gap — short enough that sending several messages in a row
 * doesn't feel sluggish, but long enough for the clock icon to read clearly
 * for a beat. Kept well under DEFAULT_CONFIRMATION_DELAY_MS so the three
 * delivery states (clock, single check, double check) stay visually
 * distinguishable in sequence.
 */
export const DEFAULT_SUBMIT_DELAY_MS = 300;

export function createMockChatBackend(
  dedupeByClientId: boolean = true,
  seedMessages: SeedMessage[] = [],
  confirmationDelayMs: number = DEFAULT_CONFIRMATION_DELAY_MS,
  submitDelayMs: number = DEFAULT_SUBMIT_DELAY_MS,
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
  const listeners = new Set<() => void>();

  const notifyListeners = (): void => {
    for (const listener of listeners) {
      listener();
    }
  };

  return {
    submitMessage(message, senderId, options) {
      // Simulates the network round-trip for the submission itself — the
      // client only observes the message flip from Pending to Sent once this
      // resolves, separate from and shorter than the confirmation delay.
      return new Promise<ServerMessage>((resolve, reject) => {
        setTimeout(() => {
          if (options?.rejectContent === true) {
            reject(new ContentRejectedError());
            return;
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

            // Accepting the submission happens above, but joining the
            // canonical thread — what listMessages() reports — happens only
            // after this further delay. The client only learns about it by
            // polling/syncing, same as any other backend-side change.
            setTimeout(() => {
              messages.push(serverMessage);
              notifyListeners();
            }, confirmationDelayMs);
          }

          if (options?.dropResponse === true) {
            reject(new ResponseLostError());
            return;
          }

          resolve(serverMessage);
        }, submitDelayMs);
      });
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
      notifyListeners();

      return serverMessage;
    },

    subscribe(listener) {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
  };
}
