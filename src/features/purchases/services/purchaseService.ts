import { getPurchaseBackend } from "@/features/purchases/services/purchaseBackendRegistry";
import { createSqlitePurchaseStore } from "@/features/purchases/storage/purchasesDatabase";
import type { PurchaseStore } from "@/features/purchases/storage/purchaseStore";
import {
  EntitlementStatus,
  StorePurchaseStatus,
  type PurchaseConfirmation,
  type StorePurchase,
} from "@/features/purchases/types";
import type { PurchaseAttemptOutcome } from "@/features/purchases/services/mockPurchaseBackend";
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
export function initiatePurchase(
  productId: string,
  priceCents: number,
  currency: string,
): StorePurchase {
  const purchaseStore = resolveStore();
  const existingPendingPurchase = purchaseStore
    .getPurchasesForProduct(productId)
    .find((purchase) => purchase.status === StorePurchaseStatus.Pending);

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

  purchaseStore.insertPurchase(purchase);

  return purchase;
}

/**
 * Sends a Pending purchase to the mock store and records its result
 * (succeeded, canceled or failed). This is only the store's response —
 * access is never granted from this alone, see confirmPurchase.
 */
export function processPurchase(
  purchase: StorePurchase,
  userId: string,
  options?: { outcome?: PurchaseAttemptOutcome },
): StorePurchase {
  const resolvedPurchase = getPurchaseBackend().purchase(purchase, userId, options);

  resolveStore().updatePurchaseStatus(purchase.purchaseId, resolvedPurchase.status);

  return resolvedPurchase;
}

/**
 * Asks the mock backend to confirm entitlement for an already-succeeded
 * purchase — the separate, possibly-delayed step that actually grants
 * access. Upserted by purchaseId, so a duplicate confirmation event (e.g. a
 * repeated webhook) never grants access twice.
 */
export function confirmPurchase(purchaseId: string): PurchaseConfirmation {
  const confirmation = getPurchaseBackend().confirmEntitlement(purchaseId);

  resolveStore().upsertConfirmation(confirmation);

  return confirmation;
}

/**
 * Reconciles a user's previously-succeeded purchases (e.g. after a
 * reinstall) without duplicating local state: both the purchase and its
 * confirmation are upserted by their primary key, so restoring the same
 * purchase twice has no further effect.
 */
export function restorePurchases(userId: string): StorePurchase[] {
  const purchaseStore = resolveStore();
  const restoredPurchases = getPurchaseBackend().restorePurchases(userId);

  for (const restoredPurchase of restoredPurchases) {
    purchaseStore.insertPurchase(restoredPurchase);
    purchaseStore.upsertConfirmation({
      purchaseId: restoredPurchase.purchaseId,
      entitlementStatus: EntitlementStatus.Active,
      confirmedAt: Date.now(),
    });
  }

  return restoredPurchases;
}

/**
 * The product's access, aggregated across every purchase made for it. Active
 * as soon as any purchase for the product is confirmed active — an older
 * revoked purchase or an unrelated failed one for the same product never
 * demotes it. A succeeded purchase with no confirmation yet reads as
 * Pending, never Active — that is the honest "delayed confirmation" state.
 */
export function getEntitlementStatus(productId: string): EntitlementStatus {
  const purchaseStore = resolveStore();
  const purchasesForProduct = purchaseStore.getPurchasesForProduct(productId);

  const confirmations = purchasesForProduct
    .map((purchase) => purchaseStore.getConfirmation(purchase.purchaseId))
    .filter((confirmation): confirmation is PurchaseConfirmation => confirmation !== undefined);

  if (
    confirmations.some(
      (confirmation) => confirmation.entitlementStatus === EntitlementStatus.Active,
    )
  ) {
    return EntitlementStatus.Active;
  }

  const hasUnresolvedPurchase = purchasesForProduct.some(
    (purchase) =>
      purchase.status === StorePurchaseStatus.Pending ||
      purchase.status === StorePurchaseStatus.Succeeded,
  );

  if (hasUnresolvedPurchase) {
    return EntitlementStatus.Pending;
  }

  return EntitlementStatus.Revoked;
}
