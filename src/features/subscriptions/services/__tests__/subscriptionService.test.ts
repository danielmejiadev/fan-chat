import {
  confirmSubscription,
  purchaseSubscription,
  restoreSubscription,
  resetSubscriptionServiceState,
  resetSubscriptionServiceStore,
  setSubscriptionServiceStoreForTests,
} from "@/features/subscriptions/services/subscriptionService";
import {
  resetPurchaseServiceStore,
  setPurchaseServiceStoreForTests,
} from "@/features/purchases/services/purchaseService";
import { createInMemoryPurchaseStore } from "@/features/purchases/storage/createInMemoryPurchaseStore";
import { createInMemorySubscriptionStore } from "@/features/subscriptions/storage/createInMemorySubscriptionStore";
import {
  resetFanPurchaseBackend,
  setFanPurchaseBackendForTests,
} from "@/mockApi/subscriptions/fanPurchaseBackendRegistry";
import {
  resetSubscriptionBackend,
  setSubscriptionBackendForTests,
} from "@/mockApi/subscriptions/subscriptionBackendRegistry";
import { createMockFanPurchaseBackend } from "@/mockApi/subscriptions/mockFanPurchaseBackend";
import {
  createMockSubscriptionBackend,
  DEFAULT_SUBSCRIPTION_CONFIRMATION_DELAY_MS,
} from "@/mockApi/subscriptions/mockSubscriptionBackend";
import { StorePurchaseStatus } from "@/features/purchases/types";
import { SubscriptionStatus } from "@/features/subscriptions/types";
import { resetSubscriptionStore, useSubscriptionStore } from "@/store/subscriptionStore";

const userId = "fan-1";
const confirmationDelayMs = 1000;

beforeEach(() => {
  jest.useFakeTimers();
  setPurchaseServiceStoreForTests(createInMemoryPurchaseStore());
  setSubscriptionServiceStoreForTests(createInMemorySubscriptionStore());
  setFanPurchaseBackendForTests(createMockFanPurchaseBackend());
  setSubscriptionBackendForTests(createMockSubscriptionBackend());
  resetSubscriptionServiceState();
  resetSubscriptionStore();
});

afterEach(() => {
  resetPurchaseServiceStore();
  resetSubscriptionServiceStore();
  resetFanPurchaseBackend();
  resetSubscriptionBackend();
  jest.useRealTimers();
});

describe("subscriptionService delayed backend confirmation", () => {
  it("keeps the subscription pending until confirmation resolves, then activates it", async () => {
    const purchase = await purchaseSubscription(userId, "succeed");
    expect(purchase.status).toBe(StorePurchaseStatus.Succeeded);

    const confirmPromise = confirmSubscription(userId, purchase.purchaseId, confirmationDelayMs);

    await jest.advanceTimersByTimeAsync(confirmationDelayMs - 1);
    expect(useSubscriptionStore.getState().status).toBe(SubscriptionStatus.PendingConfirmation);

    await jest.advanceTimersByTimeAsync(1);
    await confirmPromise;

    expect(useSubscriptionStore.getState().status).toBe(SubscriptionStatus.Active);
  });
});

describe("subscriptionService cancellation", () => {
  it("activates no subscription when the purchase is cancelled", async () => {
    const purchase = await purchaseSubscription(userId, "cancel");

    expect(purchase.status).toBe(StorePurchaseStatus.Canceled);
    expect(useSubscriptionStore.getState().status).toBe(SubscriptionStatus.Inactive);
  });
});

describe("subscriptionService failure", () => {
  it("activates no subscription when the purchase fails", async () => {
    const purchase = await purchaseSubscription(userId, "fail");

    expect(purchase.status).toBe(StorePurchaseStatus.Failed);
    expect(useSubscriptionStore.getState().status).toBe(SubscriptionStatus.Inactive);
  });
});

describe("subscriptionService: a failed purchase never clears an active subscription", () => {
  it("keeps the subscription active after an unrelated failed purchase attempt", async () => {
    const successfulPurchase = await purchaseSubscription(userId, "succeed");
    await jest.advanceTimersByTimeAsync(DEFAULT_SUBSCRIPTION_CONFIRMATION_DELAY_MS);
    await confirmSubscription(userId, successfulPurchase.purchaseId);
    expect(useSubscriptionStore.getState().status).toBe(SubscriptionStatus.Active);

    resetSubscriptionServiceState();
    const failedPurchase = await purchaseSubscription(userId, "fail");

    expect(failedPurchase.status).toBe(StorePurchaseStatus.Failed);
    expect(useSubscriptionStore.getState().status).toBe(SubscriptionStatus.Active);
  });
});

describe("subscriptionService restore", () => {
  it("restores the subscription when a previous successful purchase exists", async () => {
    const originalPurchase = await purchaseSubscription(userId, "succeed");
    await jest.advanceTimersByTimeAsync(DEFAULT_SUBSCRIPTION_CONFIRMATION_DELAY_MS);
    await confirmSubscription(userId, originalPurchase.purchaseId);
    resetSubscriptionStore();
    resetSubscriptionServiceState();

    const restoredPurchase = await restoreSubscription(userId);
    expect(restoredPurchase).not.toBeNull();
    expect(restoredPurchase?.status).toBe(StorePurchaseStatus.Restored);

    await jest.advanceTimersByTimeAsync(DEFAULT_SUBSCRIPTION_CONFIRMATION_DELAY_MS);
    await confirmSubscription(userId, restoredPurchase!.purchaseId);

    expect(useSubscriptionStore.getState().status).toBe(SubscriptionStatus.Active);
  });

  it("returns null when there is nothing to restore", async () => {
    const restoredPurchase = await restoreSubscription(userId);

    expect(restoredPurchase).toBeNull();
    expect(useSubscriptionStore.getState().status).toBe(SubscriptionStatus.Inactive);
  });
});

describe("subscriptionService idempotent confirmation", () => {
  it("only calls the backend once for a duplicate confirmation event", async () => {
    const backend = createMockSubscriptionBackend();
    const confirmSpy = jest.spyOn(backend, "confirmSubscription");
    setSubscriptionBackendForTests(backend);

    const purchase = await purchaseSubscription(userId, "succeed");

    const firstConfirm = confirmSubscription(userId, purchase.purchaseId, confirmationDelayMs);
    const secondConfirm = confirmSubscription(userId, purchase.purchaseId, confirmationDelayMs);

    await jest.advanceTimersByTimeAsync(confirmationDelayMs);
    await Promise.all([firstConfirm, secondConfirm]);

    await confirmSubscription(userId, purchase.purchaseId, confirmationDelayMs);

    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(useSubscriptionStore.getState().status).toBe(SubscriptionStatus.Active);
  });
});

describe("subscriptionService duplicate purchase flow prevention", () => {
  it("does not start a second purchase while one is already in flight", async () => {
    const backend = createMockFanPurchaseBackend();
    const purchaseSpy = jest.spyOn(backend, "purchase");
    setFanPurchaseBackendForTests(backend);

    const [firstPurchase, secondPurchase] = await Promise.all([
      purchaseSubscription(userId, "succeed"),
      purchaseSubscription(userId, "succeed"),
    ]);

    expect(firstPurchase.purchaseId).toBe(secondPurchase.purchaseId);
    expect(purchaseSpy).toHaveBeenCalledTimes(1);
  });
});
