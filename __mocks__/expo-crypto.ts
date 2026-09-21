import { randomUUID as nodeRandomUUID } from "node:crypto";

/**
 * expo-crypto is a native module — under Jest its auto-mock returns
 * undefined from randomUUID(), which made every generated clientId and
 * purchaseId collide. Jest picks up this file automatically for any
 * `import ... from "expo-crypto"` (manual mock convention, no explicit
 * jest.mock call needed).
 */
export function randomUUID(): string {
  return nodeRandomUUID();
}
