import {
  EntitlementStatus,
  StorePurchaseStatus,
  type PurchaseConfirmation,
  type StorePurchase,
} from "@/features/purchases/types";

export type PurchaseAttemptOutcome =
  StorePurchaseStatus.Succeeded | StorePurchaseStatus.Canceled | StorePurchaseStatus.Failed;

export type MockPurchaseBackend = {
  /**
   * Simulates the store's payment sheet resolving for an already-created,
   * Pending purchase. Deliberately does not grant access — that only
   * happens through confirmEntitlement, called separately (and possibly
   * much later).
   */
  purchase: (
    purchase: StorePurchase,
    userId: string,
    options?: { outcome?: PurchaseAttemptOutcome },
  ) => StorePurchase;
  /**
   * The backend's own, later confirmation step — the "delayed confirmation"
   * scenario: the store already said "succeeded", but access is granted
   * only when this resolves.
   */
  confirmEntitlement: (purchaseId: string) => PurchaseConfirmation;
  /** Previously succeeded purchases for a user, as the store would return them. */
  restorePurchases: (userId: string) => StorePurchase[];
};

export function createMockPurchaseBackend(): MockPurchaseBackend {
  const purchasesById = new Map<string, StorePurchase>();
  const succeededPurchasesByUserId = new Map<string, StorePurchase[]>();

  return {
    purchase(purchaseRequest, userId, options) {
      const outcome = options?.outcome ?? StorePurchaseStatus.Succeeded;
      const resolvedPurchase: StorePurchase = { ...purchaseRequest, status: outcome };

      purchasesById.set(resolvedPurchase.purchaseId, resolvedPurchase);

      if (outcome === StorePurchaseStatus.Succeeded) {
        const userPurchases = succeededPurchasesByUserId.get(userId) ?? [];
        userPurchases.push(resolvedPurchase);
        succeededPurchasesByUserId.set(userId, userPurchases);
      }

      return resolvedPurchase;
    },

    confirmEntitlement(purchaseId) {
      const purchase = purchasesById.get(purchaseId);

      if (purchase === undefined || purchase.status !== StorePurchaseStatus.Succeeded) {
        throw new Error(
          `Cannot confirm entitlement for a purchase that has not succeeded: ${purchaseId}`,
        );
      }

      return {
        purchaseId,
        entitlementStatus: EntitlementStatus.Active,
        confirmedAt: Date.now(),
      };
    },

    restorePurchases(userId) {
      return succeededPurchasesByUserId.get(userId) ?? [];
    },
  };
}
