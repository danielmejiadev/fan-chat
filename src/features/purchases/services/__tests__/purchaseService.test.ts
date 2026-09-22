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
    async getPurchase(purchaseId) {
      return purchases.get(purchaseId);
    },
    async getPurchasesForProduct(productId) {
      return Array.from(purchases.values())
        .filter((purchase) => purchase.productId === productId)
        .sort((a, b) => a.createdAt - b.createdAt);
    },
    async upsertConfirmation(confirmation) {
      confirmations.set(confirmation.purchaseId, confirmation);
    },
    async getConfirmation(purchaseId) {
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
  it("only grants access once the backend confirms, not when the store succeeds", async () => {
    const purchase = await initiatePurchase(productId, priceCents, currency);
    await processPurchase(purchase, userId);

    expect(await getEntitlementStatus(productId)).toBe(EntitlementStatus.Pending);

    await confirmPurchase(purchase.purchaseId);

    expect(await getEntitlementStatus(productId)).toBe(EntitlementStatus.Active);
  });
});

describe("purchaseService cancellation", () => {
  it("never grants access and leaves the purchase canceled", async () => {
    const store = createInMemoryPurchaseStore();
    setPurchaseServiceStoreForTests(store);

    const purchase = await initiatePurchase(productId, priceCents, currency);
    const resolvedPurchase = await processPurchase(purchase, userId, {
      outcome: StorePurchaseStatus.Canceled,
    });

    expect(resolvedPurchase.status).toBe(StorePurchaseStatus.Canceled);
    expect((await store.getPurchase(purchase.purchaseId))?.status).toBe(
      StorePurchaseStatus.Canceled,
    );
    expect(await getEntitlementStatus(productId)).toBe(EntitlementStatus.Revoked);
  });
});

describe("purchaseService failure", () => {
  it("never grants access and leaves the purchase failed", async () => {
    const store = createInMemoryPurchaseStore();
    setPurchaseServiceStoreForTests(store);

    const purchase = await initiatePurchase(productId, priceCents, currency);
    const resolvedPurchase = await processPurchase(purchase, userId, {
      outcome: StorePurchaseStatus.Failed,
    });

    expect(resolvedPurchase.status).toBe(StorePurchaseStatus.Failed);
    expect((await store.getPurchase(purchase.purchaseId))?.status).toBe(StorePurchaseStatus.Failed);
    expect(await getEntitlementStatus(productId)).toBe(EntitlementStatus.Revoked);
  });

  it("throws when asked to confirm entitlement for a purchase that never succeeded", async () => {
    const purchase = await initiatePurchase(productId, priceCents, currency);
    await processPurchase(purchase, userId, { outcome: StorePurchaseStatus.Failed });

    await expect(confirmPurchase(purchase.purchaseId)).rejects.toThrow();
  });
});

describe("purchaseService restoration", () => {
  it("recovers access from previous purchases without duplicating it", async () => {
    const originalPurchase = await initiatePurchase(productId, priceCents, currency);
    await processPurchase(originalPurchase, userId);
    await confirmPurchase(originalPurchase.purchaseId);

    // Simulates a reinstall: same backend (it remembers the succeeded
    // purchase), fresh local store.
    const freshStore = createInMemoryPurchaseStore();
    setPurchaseServiceStoreForTests(freshStore);
    expect(await getEntitlementStatus(productId)).toBe(EntitlementStatus.Revoked);

    const restoredOnce = await restorePurchases(userId);
    const restoredTwice = await restorePurchases(userId);

    expect(restoredOnce).toHaveLength(1);
    expect(restoredTwice).toHaveLength(1);
    expect(await freshStore.getPurchasesForProduct(productId)).toHaveLength(1);
    expect(await getEntitlementStatus(productId)).toBe(EntitlementStatus.Active);
  });
});

describe("purchaseService delayed confirmation (mandatory scenario)", () => {
  it("keeps entitlement honestly Pending between the store's success and the backend's confirmation", async () => {
    const purchase = await initiatePurchase(productId, priceCents, currency);
    const resolvedPurchase = await processPurchase(purchase, userId);

    expect(resolvedPurchase.status).toBe(StorePurchaseStatus.Succeeded);
    expect(await getEntitlementStatus(productId)).toBe(EntitlementStatus.Pending);

    // The backend's confirmation call happens later, separately in time.
    const confirmation = await confirmPurchase(purchase.purchaseId);

    expect(confirmation.entitlementStatus).toBe(EntitlementStatus.Active);
    expect(await getEntitlementStatus(productId)).toBe(EntitlementStatus.Active);
  });
});

describe("purchaseService repeated taps", () => {
  it("does not start a second purchase while one is already Pending for the product", async () => {
    const firstTap = await initiatePurchase(productId, priceCents, currency);
    const secondTap = await initiatePurchase(productId, priceCents, currency);
    const thirdTap = await initiatePurchase(productId, priceCents, currency);

    expect(secondTap.purchaseId).toBe(firstTap.purchaseId);
    expect(thirdTap.purchaseId).toBe(firstTap.purchaseId);
  });

  it("allows a new purchase for the same product once the previous one is resolved", async () => {
    const store = createInMemoryPurchaseStore();
    setPurchaseServiceStoreForTests(store);

    const firstPurchase = await initiatePurchase(productId, priceCents, currency);
    await processPurchase(firstPurchase, userId, { outcome: StorePurchaseStatus.Failed });

    const secondPurchase = await initiatePurchase(productId, priceCents, currency);

    expect(secondPurchase.purchaseId).not.toBe(firstPurchase.purchaseId);
    expect(await store.getPurchasesForProduct(productId)).toHaveLength(2);
  });
});

describe("purchaseService duplicate confirmation events", () => {
  it("does not duplicate the effect of granting access when the same confirmation arrives twice", async () => {
    const purchase = await initiatePurchase(productId, priceCents, currency);
    await processPurchase(purchase, userId);

    await confirmPurchase(purchase.purchaseId);
    await confirmPurchase(purchase.purchaseId);
    await confirmPurchase(purchase.purchaseId);

    expect(await getEntitlementStatus(productId)).toBe(EntitlementStatus.Active);
  });
});

describe("purchaseService isolation between purchases", () => {
  it("does not revoke an existing Active entitlement when an unrelated purchase fails", async () => {
    const otherProductId = "product-monthly-subscription";

    const activePurchase = await initiatePurchase(productId, priceCents, currency);
    await processPurchase(activePurchase, userId);
    await confirmPurchase(activePurchase.purchaseId);
    expect(await getEntitlementStatus(productId)).toBe(EntitlementStatus.Active);

    const unrelatedPurchase = await initiatePurchase(otherProductId, priceCents, currency);
    await processPurchase(unrelatedPurchase, userId, { outcome: StorePurchaseStatus.Failed });

    expect(await getEntitlementStatus(productId)).toBe(EntitlementStatus.Active);
    expect(await getEntitlementStatus(otherProductId)).toBe(EntitlementStatus.Revoked);
  });

  it("does not revoke an existing Active entitlement when a later purchase of the same product fails", async () => {
    const activePurchase = await initiatePurchase(productId, priceCents, currency);
    await processPurchase(activePurchase, userId);
    await confirmPurchase(activePurchase.purchaseId);
    expect(await getEntitlementStatus(productId)).toBe(EntitlementStatus.Active);

    const secondPurchase = await initiatePurchase(productId, priceCents, currency);
    await processPurchase(secondPurchase, userId, { outcome: StorePurchaseStatus.Failed });

    expect(await getEntitlementStatus(productId)).toBe(EntitlementStatus.Active);
  });
});
