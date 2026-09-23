import { StorePurchaseStatus, type StorePurchase } from "@/features/purchases/types";

/**
 * Unlike gift purchases (mockPurchaseBackend.ts, always Succeeded), fan
 * membership purchases need to demonstrate cancellation and failure too —
 * kept as a separate mock backend so gifts stay unaffected.
 */
export type FanPurchaseOutcome = "succeed" | "cancel" | "fail";

const STATUS_BY_OUTCOME: Record<FanPurchaseOutcome, StorePurchaseStatus> = {
  succeed: StorePurchaseStatus.Succeeded,
  cancel: StorePurchaseStatus.Canceled,
  fail: StorePurchaseStatus.Failed,
};

export type MockFanPurchaseBackend = {
  /** Simulates the store's payment sheet resolving for a Pending purchase, with a chosen outcome. */
  purchase: (purchase: StorePurchase, userId: string, outcome: FanPurchaseOutcome) => StorePurchase;
};

export function createMockFanPurchaseBackend(): MockFanPurchaseBackend {
  return {
    purchase(purchaseRequest, _userId, outcome) {
      return { ...purchaseRequest, status: STATUS_BY_OUTCOME[outcome] };
    },
  };
}
