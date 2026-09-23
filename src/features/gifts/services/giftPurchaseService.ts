import { updatePurchaseStatus } from "@/features/purchases/services/purchaseService";
import type { StorePurchase } from "@/features/purchases/types";
import { getPurchaseBackend } from "@/mockApi/gifts/purchaseBackendRegistry";

/** Sends a Pending gift purchase to the mock store and records its result. */
export async function processGiftPurchase(
  purchase: StorePurchase,
  userId: string,
): Promise<StorePurchase> {
  const resolvedPurchase = getPurchaseBackend().purchase(purchase, userId);

  await updatePurchaseStatus(purchase.purchaseId, resolvedPurchase.status);

  return resolvedPurchase;
}
