import { createMockPurchaseBackend } from "@/mockApi/gifts/mockPurchaseBackend";
import type { MockPurchaseBackend } from "@/mockApi/gifts/mockPurchaseBackend";

let purchaseBackend: MockPurchaseBackend | null = null;

export function getPurchaseBackend(): MockPurchaseBackend {
  if (purchaseBackend === null) {
    purchaseBackend = createMockPurchaseBackend();
  }

  return purchaseBackend;
}

/** Test-only: clears the cached backend so each test starts from a fresh one. */
export function resetPurchaseBackend(): void {
  purchaseBackend = null;
}
