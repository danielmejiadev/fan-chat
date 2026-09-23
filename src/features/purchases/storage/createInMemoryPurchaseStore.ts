import type { PurchaseStore } from "@/features/purchases/storage/purchaseStore";
import type { StorePurchase } from "@/features/purchases/types";

/**
 * In-memory PurchaseStore for tests — expo-sqlite is a native module that
 * does not run under Jest/Node, so unit tests exercise the same
 * PurchaseStore contract against this fake instead of createSqlitePurchaseStore.
 */
export function createInMemoryPurchaseStore(): PurchaseStore {
  const purchases = new Map<string, StorePurchase>();

  return {
    async insertPurchase(purchase) {
      if (!purchases.has(purchase.purchaseId)) {
        purchases.set(purchase.purchaseId, purchase);
      }
    },
    async updatePurchaseStatus(purchaseId, status) {
      const existing = purchases.get(purchaseId);
      if (existing !== undefined) {
        purchases.set(purchaseId, { ...existing, status });
      }
    },
    async getPurchasesForProduct(productId) {
      return Array.from(purchases.values())
        .filter((purchase) => purchase.productId === productId)
        .sort((a, b) => a.createdAt - b.createdAt);
    },
  };
}
