import {
  confirmSubscription,
  resolveSubscriptionPurchase,
  restoreSubscription,
  startSubscriptionPurchase,
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
import type { FanPurchaseOutcome } from "@/mockApi/subscriptions/mockFanPurchaseBackend";
import {
  createMockSubscriptionBackend,
  DEFAULT_SUBSCRIPTION_CONFIRMATION_DELAY_MS,
} from "@/mockApi/subscriptions/mockSubscriptionBackend";
import { StorePurchaseStatus, type StorePurchase } from "@/features/purchases/types";
import { SubscriptionStatus } from "@/features/subscriptions/types";
import { resetSubscriptionStore, useSubscriptionStore } from "@/store/subscriptionStore";

const userId = "fan-1";
const confirmationDelayMs = 1000;

/** Mirrors what the paywall does: start a purchase, then resolve it with a chosen outcome. */
async function purchaseWithOutcome(outcome: FanPurchaseOutcome): Promise<StorePurchase> {
  const startedPurchase = await startSubscriptionPurchase();
  return resolveSubscriptionPurchase(userId, startedPurchase, outcome);
}

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
    const purchase = await purchaseWithOutcome("succeed");
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
    const purchase = await purchaseWithOutcome("cancel");

    expect(purchase.status).toBe(StorePurchaseStatus.Canceled);
    expect(useSubscriptionStore.getState().status).toBe(SubscriptionStatus.Inactive);
  });
});

describe("subscriptionService failure", () => {
  it("activates no subscription when the purchase fails", async () => {
    const purchase = await purchaseWithOutcome("fail");

    expect(purchase.status).toBe(StorePurchaseStatus.Failed);
    expect(useSubscriptionStore.getState().status).toBe(SubscriptionStatus.Inactive);
  });
});

describe("subscriptionService: a failed purchase never clears an active subscription", () => {
  it("keeps the subscription active after an unrelated failed purchase attempt", async () => {
    const successfulPurchase = await purchaseWithOutcome("succeed");
    const confirmPromise = confirmSubscription(userId, successfulPurchase.purchaseId);
    await jest.advanceTimersByTimeAsync(DEFAULT_SUBSCRIPTION_CONFIRMATION_DELAY_MS);
    await confirmPromise;
    expect(useSubscriptionStore.getState().status).toBe(SubscriptionStatus.Active);

    resetSubscriptionServiceState();
    const failedPurchase = await purchaseWithOutcome("fail");

    expect(failedPurchase.status).toBe(StorePurchaseStatus.Failed);
    expect(useSubscriptionStore.getState().status).toBe(SubscriptionStatus.Active);
  });
});

describe("subscriptionService restore", () => {
  it("restores the subscription when a previous successful purchase exists", async () => {
    const originalPurchase = await purchaseWithOutcome("succeed");
    const firstConfirmPromise = confirmSubscription(userId, originalPurchase.purchaseId);
    await jest.advanceTimersByTimeAsync(DEFAULT_SUBSCRIPTION_CONFIRMATION_DELAY_MS);
    await firstConfirmPromise;
    resetSubscriptionStore();
    resetSubscriptionServiceState();

    const restoredPurchase = await restoreSubscription(userId);
    expect(restoredPurchase).not.toBeNull();
    expect(restoredPurchase?.status).toBe(StorePurchaseStatus.Restored);

    const secondConfirmPromise = confirmSubscription(userId, restoredPurchase!.purchaseId);
    await jest.advanceTimersByTimeAsync(DEFAULT_SUBSCRIPTION_CONFIRMATION_DELAY_MS);
    await secondConfirmPromise;

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

    const purchase = await purchaseWithOutcome("succeed");

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
  it("does not start a second Pending purchase while one is already awaiting an outcome", async () => {
    const [firstStart, secondStart] = await Promise.all([
      startSubscriptionPurchase(),
      startSubscriptionPurchase(),
    ]);

    expect(firstStart.purchaseId).toBe(secondStart.purchaseId);
    expect(firstStart.status).toBe(StorePurchaseStatus.Pending);
  });
});
