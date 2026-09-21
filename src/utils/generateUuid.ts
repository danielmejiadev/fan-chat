/**
 * RFC-4122-shaped v4 UUID without pulling in a new dependency. Used as the
 * idempotency key for anything generated client-side (chat clientIds,
 * purchase purchaseIds) that must survive retries and app restarts.
 */
export function generateUuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (placeholder) => {
    const random = (Math.random() * 16) | 0;
    const value = placeholder === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}
