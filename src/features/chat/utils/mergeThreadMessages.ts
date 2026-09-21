import type { ClientMessage, ServerMessage, ThreadMessage } from "@/features/chat/types";

/**
 * Combines the confirmed thread with the local outbox into one renderable,
 * chronologically ordered list. A message only ever appears in one of the
 * two inputs at a time (flushPendingMessages deletes it from the outbox as
 * soon as the backend confirms it), so there is no dedupe to do here.
 */
export function mergeThreadMessages(
  confirmedMessages: ServerMessage[],
  pendingMessages: ClientMessage[],
): ThreadMessage[] {
  const confirmedThread: ThreadMessage[] = confirmedMessages.map((message) => ({
    origin: "server",
    message,
  }));
  const pendingThread: ThreadMessage[] = pendingMessages.map((message) => ({
    origin: "client",
    message,
  }));

  return [...confirmedThread, ...pendingThread].sort(
    (a, b) => a.message.createdAt - b.message.createdAt,
  );
}
