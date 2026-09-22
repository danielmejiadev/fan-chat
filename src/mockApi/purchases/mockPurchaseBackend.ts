import { StorePurchaseStatus, type StorePurchase } from "@/features/purchases/types";

export type MockPurchaseBackend = {
  /** Simulates the store's payment sheet resolving for a Pending purchase. */
  purchase: (purchase: StorePurchase, userId: string) => StorePurchase;
};

export function createMockPurchaseBackend(): MockPurchaseBackend {
  return {
    purchase(purchaseRequest) {
      return { ...purchaseRequest, status: StorePurchaseStatus.Succeeded };
    },
  };
}
