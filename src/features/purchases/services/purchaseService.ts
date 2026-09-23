import { createSqlitePurchaseStore } from "@/features/purchases/storage/purchasesDatabase";
import type { PurchaseStore } from "@/features/purchases/storage/purchaseStore";
import { StorePurchaseStatus, type StorePurchase } from "@/features/purchases/types";
import { generateUuid } from "@/utils/generateUuid";

/**
 * The shared store-purchase ledger: a generic transaction record both the
 * gifts and subscriptions features build on top of (see
 * features/gifts/services/giftPurchaseService.ts and
 * features/subscriptions/services/subscriptionService.ts for how each
 * resolves a purchase against its own mock backend).
 */

let defaultStore: PurchaseStore | null = null;

function resolveStore(): PurchaseStore {
  if (defaultStore === null) {
    defaultStore = createSqlitePurchaseStore();
  }

  return defaultStore;
}

/** Test-only: forces the next resolveStore() call to use this store instead of SQLite. */
export function setPurchaseServiceStoreForTests(store: PurchaseStore): void {
  defaultStore = store;
}

/** Test-only: clears the cached store so each test starts from a fresh one. */
export function resetPurchaseServiceStore(): void {
  defaultStore = null;
}

/**
 * Starts a purchase for a product, or returns the one already in flight.
 * Keyed by productId so repeated taps on "Pay" while a purchase is still
 * Pending never create a second one.
 */
export async function initiatePurchase(
  productId: string,
  priceCents: number,
  currency: string,
): Promise<StorePurchase> {
  const purchaseStore = resolveStore();
  const existingPurchasesForProduct = await purchaseStore.getPurchasesForProduct(productId);
  const existingPendingPurchase = existingPurchasesForProduct.find(
    (purchase) => purchase.status === StorePurchaseStatus.Pending,
  );

  if (existingPendingPurchase !== undefined) {
    return existingPendingPurchase;
  }

  const purchase: StorePurchase = {
    purchaseId: generateUuid(),
    productId,
    priceCents,
    currency,
    status: StorePurchaseStatus.Pending,
    createdAt: Date.now(),
  };

  await purchaseStore.insertPurchase(purchase);

  return purchase;
}

/**
 * Persists a resolved status for a purchase, independent of which backend
 * produced it — each feature resolves against its own mock backend and
 * reports the result back here.
 */
export async function updatePurchaseStatus(
  purchaseId: string,
  status: StorePurchaseStatus,
): Promise<void> {
  await resolveStore().updatePurchaseStatus(purchaseId, status);
}

/** All purchases ever recorded for a product, oldest first — used to look up a restorable purchase. */
export async function getPurchasesForProduct(productId: string): Promise<StorePurchase[]> {
  return resolveStore().getPurchasesForProduct(productId);
}
