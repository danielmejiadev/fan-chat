import { randomUUID } from "expo-crypto";

/**
 * Used as the idempotency key for anything generated client-side (chat
 * clientIds, purchase purchaseIds) that must survive retries and app
 * restarts.
 */
export function generateUuid(): string {
  return randomUUID();
}
