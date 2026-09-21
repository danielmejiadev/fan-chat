import {
  confirmPurchase,
  getEntitlementStatus,
  initiatePurchase,
  processPurchase,
  restorePurchases,
} from "@/features/purchases/services/purchaseService";
import { createMockPurchaseBackend } from "@/features/purchases/services/mockPurchaseBackend";
import type { PurchaseStore } from "@/features/purchases/storage/purchaseStore";
import {
  EntitlementStatus,
  StorePurchaseStatus,
  type PurchaseConfirmation,
  type StorePurchase,
} from "@/features/purchases/types";

function createInMemoryPurchaseStore(): PurchaseStore {
  const purchases = new Map<string, StorePurchase>();
  const confirmations = new Map<string, PurchaseConfirmation>();

  return {
    insertPurchase(purchase) {
      if (!purchases.has(purchase.purchaseId)) {
        purchases.set(purchase.purchaseId, purchase);
      }
    },
    updatePurchaseStatus(purchaseId, status) {
      const existing = purchases.get(purchaseId);
      if (existing !== undefined) {
        purchases.set(purchaseId, { ...existing, status });
      }
    },
    getPurchase(purchaseId) {
      return purchases.get(purchaseId);
    },
    getPurchasesForProduct(productId) {
      return Array.from(purchases.values())
        .filter((purchase) => purchase.productId === productId)
        .sort((a, b) => a.createdAt - b.createdAt);
    },
    upsertConfirmation(confirmation) {
      confirmations.set(confirmation.purchaseId, confirmation);
    },
    getConfirmation(purchaseId) {
      return confirmations.get(purchaseId);
    },
  };
}

const userId = "fan-1";
const productId = "product-vip-badge";
const priceCents = 999;
const currency = "USD";

describe("purchaseService successful purchase", () => {
  it("only grants access once the backend confirms, not when the store succeeds", () => {
    const store = createInMemoryPurchaseStore();
    const backend = createMockPurchaseBackend();

    const purchase = initiatePurchase(productId, priceCents, currency, store);
    processPurchase(purchase, backend, userId, undefined, store);

    expect(getEntitlementStatus(productId, store)).toBe(EntitlementStatus.Pending);

    confirmPurchase(purchase.purchaseId, backend, store);

    expect(getEntitlementStatus(productId, store)).toBe(EntitlementStatus.Active);
  });
});

describe("purchaseService cancellation", () => {
  it("never grants access and leaves the purchase canceled", () => {
    const store = createInMemoryPurchaseStore();
    const backend = createMockPurchaseBackend();

    const purchase = initiatePurchase(productId, priceCents, currency, store);
    const resolvedPurchase = processPurchase(
      purchase,
      backend,
      userId,
      { outcome: StorePurchaseStatus.Canceled },
      store,
    );

    expect(resolvedPurchase.status).toBe(StorePurchaseStatus.Canceled);
    expect(store.getPurchase(purchase.purchaseId)?.status).toBe(StorePurchaseStatus.Canceled);
    expect(getEntitlementStatus(productId, store)).toBe(EntitlementStatus.Revoked);
  });
});

describe("purchaseService failure", () => {
  it("never grants access and leaves the purchase failed", () => {
    const store = createInMemoryPurchaseStore();
    const backend = createMockPurchaseBackend();

    const purchase = initiatePurchase(productId, priceCents, currency, store);
    const resolvedPurchase = processPurchase(
      purchase,
      backend,
      userId,
      { outcome: StorePurchaseStatus.Failed },
      store,
    );

    expect(resolvedPurchase.status).toBe(StorePurchaseStatus.Failed);
    expect(store.getPurchase(purchase.purchaseId)?.status).toBe(StorePurchaseStatus.Failed);
    expect(getEntitlementStatus(productId, store)).toBe(EntitlementStatus.Revoked);
  });

  it("throws when asked to confirm entitlement for a purchase that never succeeded", () => {
    const store = createInMemoryPurchaseStore();
    const backend = createMockPurchaseBackend();

    const purchase = initiatePurchase(productId, priceCents, currency, store);
    processPurchase(purchase, backend, userId, { outcome: StorePurchaseStatus.Failed }, store);

    expect(() => confirmPurchase(purchase.purchaseId, backend, store)).toThrow();
  });
});

describe("purchaseService restoration", () => {
  it("recovers access from previous purchases without duplicating it", () => {
    const store = createInMemoryPurchaseStore();
    const backend = createMockPurchaseBackend();

    const originalPurchase = initiatePurchase(productId, priceCents, currency, store);
    processPurchase(originalPurchase, backend, userId, undefined, store);
    confirmPurchase(originalPurchase.purchaseId, backend, store);

    const freshStore = createInMemoryPurchaseStore();
    expect(getEntitlementStatus(productId, freshStore)).toBe(EntitlementStatus.Revoked);

    const restoredOnce = restorePurchases(userId, backend, freshStore);
    const restoredTwice = restorePurchases(userId, backend, freshStore);

    expect(restoredOnce).toHaveLength(1);
    expect(restoredTwice).toHaveLength(1);
    expect(freshStore.getPurchasesForProduct(productId)).toHaveLength(1);
    expect(getEntitlementStatus(productId, freshStore)).toBe(EntitlementStatus.Active);
  });
});

describe("purchaseService delayed confirmation (mandatory scenario)", () => {
  it("keeps entitlement honestly Pending between the store's success and the backend's confirmation", () => {
    const store = createInMemoryPurchaseStore();
    const backend = createMockPurchaseBackend();

    const purchase = initiatePurchase(productId, priceCents, currency, store);
    const resolvedPurchase = processPurchase(purchase, backend, userId, undefined, store);

    expect(resolvedPurchase.status).toBe(StorePurchaseStatus.Succeeded);
    expect(getEntitlementStatus(productId, store)).toBe(EntitlementStatus.Pending);

    // The backend's confirmation call happens later, separately in time.
    const confirmation = confirmPurchase(purchase.purchaseId, backend, store);

    expect(confirmation.entitlementStatus).toBe(EntitlementStatus.Active);
    expect(getEntitlementStatus(productId, store)).toBe(EntitlementStatus.Active);
  });
});

describe("purchaseService repeated taps", () => {
  it("does not start a second purchase while one is already Pending for the product", () => {
    const store = createInMemoryPurchaseStore();

    const firstTap = initiatePurchase(productId, priceCents, currency, store);
    const secondTap = initiatePurchase(productId, priceCents, currency, store);
    const thirdTap = initiatePurchase(productId, priceCents, currency, store);

    expect(secondTap.purchaseId).toBe(firstTap.purchaseId);
    expect(thirdTap.purchaseId).toBe(firstTap.purchaseId);
    expect(store.getPurchasesForProduct(productId)).toHaveLength(1);
  });

  it("allows a new purchase for the same product once the previous one is resolved", () => {
    const store = createInMemoryPurchaseStore();
    const backend = createMockPurchaseBackend();

    const firstPurchase = initiatePurchase(productId, priceCents, currency, store);
    processPurchase(firstPurchase, backend, userId, { outcome: StorePurchaseStatus.Failed }, store);

    const secondPurchase = initiatePurchase(productId, priceCents, currency, store);

    expect(secondPurchase.purchaseId).not.toBe(firstPurchase.purchaseId);
    expect(store.getPurchasesForProduct(productId)).toHaveLength(2);
  });
});

describe("purchaseService duplicate confirmation events", () => {
  it("does not duplicate the effect of granting access when the same confirmation arrives twice", () => {
    const store = createInMemoryPurchaseStore();
    const backend = createMockPurchaseBackend();

    const purchase = initiatePurchase(productId, priceCents, currency, store);
    processPurchase(purchase, backend, userId, undefined, store);

    confirmPurchase(purchase.purchaseId, backend, store);
    confirmPurchase(purchase.purchaseId, backend, store);
    confirmPurchase(purchase.purchaseId, backend, store);

    expect(getEntitlementStatus(productId, store)).toBe(EntitlementStatus.Active);
  });
});

describe("purchaseService isolation between purchases", () => {
  it("does not revoke an existing Active entitlement when an unrelated purchase fails", () => {
    const store = createInMemoryPurchaseStore();
    const backend = createMockPurchaseBackend();
    const otherProductId = "product-monthly-subscription";

    const activePurchase = initiatePurchase(productId, priceCents, currency, store);
    processPurchase(activePurchase, backend, userId, undefined, store);
    confirmPurchase(activePurchase.purchaseId, backend, store);
    expect(getEntitlementStatus(productId, store)).toBe(EntitlementStatus.Active);

    const unrelatedPurchase = initiatePurchase(otherProductId, priceCents, currency, store);
    processPurchase(
      unrelatedPurchase,
      backend,
      userId,
      { outcome: StorePurchaseStatus.Failed },
      store,
    );

    expect(getEntitlementStatus(productId, store)).toBe(EntitlementStatus.Active);
    expect(getEntitlementStatus(otherProductId, store)).toBe(EntitlementStatus.Revoked);
  });

  it("does not revoke an existing Active entitlement when a later purchase of the same product fails", () => {
    const store = createInMemoryPurchaseStore();
    const backend = createMockPurchaseBackend();

    const activePurchase = initiatePurchase(productId, priceCents, currency, store);
    processPurchase(activePurchase, backend, userId, undefined, store);
    confirmPurchase(activePurchase.purchaseId, backend, store);
    expect(getEntitlementStatus(productId, store)).toBe(EntitlementStatus.Active);

    const secondPurchase = initiatePurchase(productId, priceCents, currency, store);
    processPurchase(
      secondPurchase,
      backend,
      userId,
      { outcome: StorePurchaseStatus.Failed },
      store,
    );

    expect(getEntitlementStatus(productId, store)).toBe(EntitlementStatus.Active);
  });
});
