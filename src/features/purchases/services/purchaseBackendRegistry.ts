import { createMockPurchaseBackend } from "@/features/purchases/services/mockPurchaseBackend";
import type { MockPurchaseBackend } from "@/features/purchases/services/mockPurchaseBackend";

let purchaseBackend: MockPurchaseBackend | null = null;

export function getPurchaseBackend(): MockPurchaseBackend {
  if (purchaseBackend === null) {
    purchaseBackend = createMockPurchaseBackend();
  }

  return purchaseBackend;
}
