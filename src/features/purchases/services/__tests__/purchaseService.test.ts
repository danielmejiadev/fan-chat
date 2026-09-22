import { resetPurchaseBackend } from "@/mockApi/purchases/purchaseBackendRegistry";
import {
  confirmPurchase,
  getEntitlementStatus,
  initiatePurchase,
  processPurchase,
  resetPurchaseServiceStore,
  restorePurchases,
  setPurchaseServiceStoreForTests,
} from "@/features/purchases/services/purchaseService";
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

beforeEach(() => {
  resetPurchaseBackend();
  setPurchaseServiceStoreForTests(createInMemoryPurchaseStore());
});

afterEach(() => {
  resetPurchaseServiceStore();
});

describe("purchaseService successful purchase", () => {
  it("only grants access once the backend confirms, not when the store succeeds", () => {
    const purchase = initiatePurchase(productId, priceCents, currency);
    processPurchase(purchase, userId);

    expect(getEntitlementStatus(productId)).toBe(EntitlementStatus.Pending);

    confirmPurchase(purchase.purchaseId);

    expect(getEntitlementStatus(productId)).toBe(EntitlementStatus.Active);
  });
});

describe("purchaseService cancellation", () => {
  it("never grants access and leaves the purchase canceled", () => {
    const store = createInMemoryPurchaseStore();
    setPurchaseServiceStoreForTests(store);

    const purchase = initiatePurchase(productId, priceCents, currency);
    const resolvedPurchase = processPurchase(purchase, userId, {
      outcome: StorePurchaseStatus.Canceled,
    });

    expect(resolvedPurchase.status).toBe(StorePurchaseStatus.Canceled);
    expect(store.getPurchase(purchase.purchaseId)?.status).toBe(StorePurchaseStatus.Canceled);
    expect(getEntitlementStatus(productId)).toBe(EntitlementStatus.Revoked);
  });
});

describe("purchaseService failure", () => {
  it("never grants access and leaves the purchase failed", () => {
    const store = createInMemoryPurchaseStore();
    setPurchaseServiceStoreForTests(store);

    const purchase = initiatePurchase(productId, priceCents, currency);
    const resolvedPurchase = processPurchase(purchase, userId, {
      outcome: StorePurchaseStatus.Failed,
    });

    expect(resolvedPurchase.status).toBe(StorePurchaseStatus.Failed);
    expect(store.getPurchase(purchase.purchaseId)?.status).toBe(StorePurchaseStatus.Failed);
    expect(getEntitlementStatus(productId)).toBe(EntitlementStatus.Revoked);
  });

  it("throws when asked to confirm entitlement for a purchase that never succeeded", () => {
    const purchase = initiatePurchase(productId, priceCents, currency);
    processPurchase(purchase, userId, { outcome: StorePurchaseStatus.Failed });

    expect(() => confirmPurchase(purchase.purchaseId)).toThrow();
  });
});

describe("purchaseService restoration", () => {
  it("recovers access from previous purchases without duplicating it", () => {
    const originalPurchase = initiatePurchase(productId, priceCents, currency);
    processPurchase(originalPurchase, userId);
    confirmPurchase(originalPurchase.purchaseId);

    // Simulates a reinstall: same backend (it remembers the succeeded
    // purchase), fresh local store.
    const freshStore = createInMemoryPurchaseStore();
    setPurchaseServiceStoreForTests(freshStore);
    expect(getEntitlementStatus(productId)).toBe(EntitlementStatus.Revoked);

    const restoredOnce = restorePurchases(userId);
    const restoredTwice = restorePurchases(userId);

    expect(restoredOnce).toHaveLength(1);
    expect(restoredTwice).toHaveLength(1);
    expect(freshStore.getPurchasesForProduct(productId)).toHaveLength(1);
    expect(getEntitlementStatus(productId)).toBe(EntitlementStatus.Active);
  });
});

describe("purchaseService delayed confirmation (mandatory scenario)", () => {
  it("keeps entitlement honestly Pending between the store's success and the backend's confirmation", () => {
    const purchase = initiatePurchase(productId, priceCents, currency);
    const resolvedPurchase = processPurchase(purchase, userId);

    expect(resolvedPurchase.status).toBe(StorePurchaseStatus.Succeeded);
    expect(getEntitlementStatus(productId)).toBe(EntitlementStatus.Pending);

    // The backend's confirmation call happens later, separately in time.
    const confirmation = confirmPurchase(purchase.purchaseId);

    expect(confirmation.entitlementStatus).toBe(EntitlementStatus.Active);
    expect(getEntitlementStatus(productId)).toBe(EntitlementStatus.Active);
  });
});

describe("purchaseService repeated taps", () => {
  it("does not start a second purchase while one is already Pending for the product", () => {
    const firstTap = initiatePurchase(productId, priceCents, currency);
    const secondTap = initiatePurchase(productId, priceCents, currency);
    const thirdTap = initiatePurchase(productId, priceCents, currency);

    expect(secondTap.purchaseId).toBe(firstTap.purchaseId);
    expect(thirdTap.purchaseId).toBe(firstTap.purchaseId);
  });

  it("allows a new purchase for the same product once the previous one is resolved", () => {
    const store = createInMemoryPurchaseStore();
    setPurchaseServiceStoreForTests(store);

    const firstPurchase = initiatePurchase(productId, priceCents, currency);
    processPurchase(firstPurchase, userId, { outcome: StorePurchaseStatus.Failed });

    const secondPurchase = initiatePurchase(productId, priceCents, currency);

    expect(secondPurchase.purchaseId).not.toBe(firstPurchase.purchaseId);
    expect(store.getPurchasesForProduct(productId)).toHaveLength(2);
  });
});

describe("purchaseService duplicate confirmation events", () => {
  it("does not duplicate the effect of granting access when the same confirmation arrives twice", () => {
    const purchase = initiatePurchase(productId, priceCents, currency);
    processPurchase(purchase, userId);

    confirmPurchase(purchase.purchaseId);
    confirmPurchase(purchase.purchaseId);
    confirmPurchase(purchase.purchaseId);

    expect(getEntitlementStatus(productId)).toBe(EntitlementStatus.Active);
  });
});

describe("purchaseService isolation between purchases", () => {
  it("does not revoke an existing Active entitlement when an unrelated purchase fails", () => {
    const otherProductId = "product-monthly-subscription";

    const activePurchase = initiatePurchase(productId, priceCents, currency);
    processPurchase(activePurchase, userId);
    confirmPurchase(activePurchase.purchaseId);
    expect(getEntitlementStatus(productId)).toBe(EntitlementStatus.Active);

    const unrelatedPurchase = initiatePurchase(otherProductId, priceCents, currency);
    processPurchase(unrelatedPurchase, userId, { outcome: StorePurchaseStatus.Failed });

    expect(getEntitlementStatus(productId)).toBe(EntitlementStatus.Active);
    expect(getEntitlementStatus(otherProductId)).toBe(EntitlementStatus.Revoked);
  });

  it("does not revoke an existing Active entitlement when a later purchase of the same product fails", () => {
    const activePurchase = initiatePurchase(productId, priceCents, currency);
    processPurchase(activePurchase, userId);
    confirmPurchase(activePurchase.purchaseId);
    expect(getEntitlementStatus(productId)).toBe(EntitlementStatus.Active);

    const secondPurchase = initiatePurchase(productId, priceCents, currency);
    processPurchase(secondPurchase, userId, { outcome: StorePurchaseStatus.Failed });

    expect(getEntitlementStatus(productId)).toBe(EntitlementStatus.Active);
  });
});
