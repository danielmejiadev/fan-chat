import { processGiftPurchase } from "@/features/gifts/services/giftPurchaseService";
import {
  getPurchasesForProduct,
  initiatePurchase,
  resetPurchaseServiceStore,
  setPurchaseServiceStoreForTests,
} from "@/features/purchases/services/purchaseService";
import { createInMemoryPurchaseStore } from "@/features/purchases/storage/createInMemoryPurchaseStore";
import { StorePurchaseStatus } from "@/features/purchases/types";

const userId = "fan-1";
const productId = "gift-conversation-1";

beforeEach(() => {
  setPurchaseServiceStoreForTests(createInMemoryPurchaseStore());
});

afterEach(() => {
  resetPurchaseServiceStore();
});

describe("giftPurchaseService.processGiftPurchase", () => {
  it("resolves a Pending gift purchase to Succeeded and persists it in the shared ledger", async () => {
    const pendingPurchase = await initiatePurchase(productId, 500, "USD");

    const resolvedPurchase = await processGiftPurchase(pendingPurchase, userId);

    expect(resolvedPurchase.status).toBe(StorePurchaseStatus.Succeeded);

    const [persisted] = await getPurchasesForProduct(productId);
    expect(persisted.status).toBe(StorePurchaseStatus.Succeeded);
  });

  it("does not start a duplicate Pending purchase for a sequential repeated tap on the same gift", async () => {
    // See purchaseService.test.ts: initiatePurchase only dedupes against an
    // already-persisted Pending row, not a still-in-flight concurrent call
    // — concurrent double-taps are guarded by the Pay button disabling
    // itself while a purchase is processing, not by this service.
    const first = await initiatePurchase(productId, 500, "USD");
    const second = await initiatePurchase(productId, 500, "USD");

    expect(second.purchaseId).toBe(first.purchaseId);

    await processGiftPurchase(first, userId);

    const purchasesForProduct = await getPurchasesForProduct(productId);
    expect(purchasesForProduct).toHaveLength(1);
  });

  it("treats each gift as its own independent transaction, not reused across sends", async () => {
    const firstPurchase = await initiatePurchase(productId, 500, "USD");
    await processGiftPurchase(firstPurchase, userId);

    const secondPurchase = await initiatePurchase(productId, 500, "USD");
    await processGiftPurchase(secondPurchase, userId);

    expect(secondPurchase.purchaseId).not.toBe(firstPurchase.purchaseId);

    const purchasesForProduct = await getPurchasesForProduct(productId);
    expect(purchasesForProduct).toHaveLength(2);
    expect(
      purchasesForProduct.every((purchase) => purchase.status === StorePurchaseStatus.Succeeded),
    ).toBe(true);
  });
});
