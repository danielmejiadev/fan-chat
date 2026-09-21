export enum MessageStatus {
  Pending = "pending",
  Sent = "sent",
  Failed = "failed",
}

/**
 * A message as created on this device, before the mock backend confirms it.
 * The clientId is generated at creation time and must survive app restarts —
 * it is the idempotency key the mock backend uses to reconcile retries.
 */
export type ClientMessage = {
  clientId: string;
  conversationId: string;
  text: string;
  createdAt: number;
  status: MessageStatus;
};

/**
 * A message as confirmed by the mock backend. clientId is present when the
 * server message originated from a ClientMessage sent by this device, and
 * null for messages that came from the other participant.
 */
export type ServerMessage = {
  serverId: string;
  clientId: string | null;
  conversationId: string;
  senderId: string;
  text: string;
  createdAt: number;
};

export type ThreadMessage =
  { origin: "client"; message: ClientMessage } | { origin: "server"; message: ServerMessage };
