import {
  getPurchasesForProduct,
  initiatePurchase,
  resetPurchaseServiceStore,
  setPurchaseServiceStoreForTests,
  updatePurchaseStatus,
} from "@/features/purchases/services/purchaseService";
import { createInMemoryPurchaseStore } from "@/features/purchases/storage/createInMemoryPurchaseStore";
import { StorePurchaseStatus } from "@/features/purchases/types";

beforeEach(() => {
  setPurchaseServiceStoreForTests(createInMemoryPurchaseStore());
});

afterEach(() => {
  resetPurchaseServiceStore();
});

describe("purchaseService.initiatePurchase", () => {
  it("creates a new Pending purchase with the requested product, price, and currency", async () => {
    const purchase = await initiatePurchase("fan-membership", 999, "USD");

    expect(purchase.productId).toBe("fan-membership");
    expect(purchase.priceCents).toBe(999);
    expect(purchase.currency).toBe("USD");
    expect(purchase.status).toBe(StorePurchaseStatus.Pending);
  });

  it("returns the existing Pending purchase instead of starting a duplicate for a sequential repeated tap", async () => {
    // initiatePurchase only dedupes against an already-persisted Pending row
    // — it has no in-flight lock of its own, so this only holds once the
    // first call's insert has actually completed (as it would for two
    // sequential taps). Guarding against a still-in-flight concurrent call
    // is the UI's job (the Pay button disables itself while pending) or, for
    // subscriptions specifically, subscriptionService's own in-flight map.
    const first = await initiatePurchase("fan-membership", 999, "USD");
    const second = await initiatePurchase("fan-membership", 999, "USD");

    expect(second.purchaseId).toBe(first.purchaseId);

    const purchasesForProduct = await getPurchasesForProduct("fan-membership");
    expect(purchasesForProduct).toHaveLength(1);
  });

  it("starts a fresh purchase once the previous one for that product is no longer Pending", async () => {
    const first = await initiatePurchase("gift-conversation-1", 500, "USD");
    await updatePurchaseStatus(first.purchaseId, StorePurchaseStatus.Succeeded);

    const second = await initiatePurchase("gift-conversation-1", 500, "USD");

    expect(second.purchaseId).not.toBe(first.purchaseId);

    const purchasesForProduct = await getPurchasesForProduct("gift-conversation-1");
    expect(purchasesForProduct).toHaveLength(2);
  });

  it("isolates in-flight purchases between different products", async () => {
    const [membershipPurchase, giftPurchase] = await Promise.all([
      initiatePurchase("fan-membership", 999, "USD"),
      initiatePurchase("gift-conversation-1", 500, "USD"),
    ]);

    expect(membershipPurchase.purchaseId).not.toBe(giftPurchase.purchaseId);
  });
});

describe("purchaseService.updatePurchaseStatus", () => {
  it("persists a new status for an existing purchase", async () => {
    const purchase = await initiatePurchase("fan-membership", 999, "USD");

    await updatePurchaseStatus(purchase.purchaseId, StorePurchaseStatus.Canceled);

    const [persisted] = await getPurchasesForProduct("fan-membership");
    expect(persisted.status).toBe(StorePurchaseStatus.Canceled);
  });
});

describe("purchaseService.getPurchasesForProduct", () => {
  it("only returns purchases for the requested product", async () => {
    await initiatePurchase("fan-membership", 999, "USD");
    await initiatePurchase("gift-conversation-1", 500, "USD");

    const membershipPurchases = await getPurchasesForProduct("fan-membership");

    expect(membershipPurchases).toHaveLength(1);
    expect(membershipPurchases[0].productId).toBe("fan-membership");
  });
});
