export enum MessageStatus {
  Pending = "pending",
  Sent = "sent",
  Confirmed = "confirmed",
  Failed = "failed",
}

/**
 * Only meaningful when status is Failed. "recoverable" covers transient
 * delivery problems (lost response, timeout) where retrying with the same
 * id is the right action. "rejected" covers the backend refusing the
 * content outright — retrying the same text would just fail again, so the
 * UI must not offer a retry for it.
 */
export enum MessageFailureReason {
  Recoverable = "recoverable",
  Rejected = "rejected",
}

/**
 * One row per message in a conversation's thread. `id` is assigned once, at
 * creation, and never changes: the clientId this device generated if the
 * message originated here, or the backend's serverId if it came from the
 * other participant. Every later change (Sent, Confirmed, Failed) is a
 * single UPDATE of this same row by `id` — a message never moves between
 * tables or gets deleted and reinserted, so there is no window where it
 * exists nowhere.
 */
export type Message = {
  id: string;
  serverId: string | null;
  clientId: string | null;
  conversationId: string;
  senderId: string;
  text: string;
  createdAt: number;
  status: MessageStatus;
  failureReason: MessageFailureReason | null;
};
