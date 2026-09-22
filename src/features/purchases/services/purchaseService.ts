import { getPurchaseBackend } from "@/mockApi/purchases/purchaseBackendRegistry";
import { createSqlitePurchaseStore } from "@/features/purchases/storage/purchasesDatabase";
import type { PurchaseStore } from "@/features/purchases/storage/purchaseStore";
import { StorePurchaseStatus, type StorePurchase } from "@/features/purchases/types";
import { generateUuid } from "@/utils/generateUuid";

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

/** Sends a Pending purchase to the mock store and records its result. */
export async function processPurchase(
  purchase: StorePurchase,
  userId: string,
): Promise<StorePurchase> {
  const resolvedPurchase = getPurchaseBackend().purchase(purchase, userId);

  await resolveStore().updatePurchaseStatus(purchase.purchaseId, resolvedPurchase.status);

  return resolvedPurchase;
}
