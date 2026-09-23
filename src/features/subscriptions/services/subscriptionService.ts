import {
  getPurchasesForProduct,
  initiatePurchase,
  updatePurchaseStatus,
} from "@/features/purchases/services/purchaseService";
import { StorePurchaseStatus, type StorePurchase } from "@/features/purchases/types";
import {
  FAN_PRODUCT_CURRENCY,
  FAN_PRODUCT_ID,
  FAN_PRODUCT_PRICE_CENTS,
} from "@/features/subscriptions/constants/fanProduct";
import { SubscriptionStatus } from "@/features/subscriptions/types";
import { createSqliteSubscriptionStore } from "@/features/subscriptions/storage/subscriptionsDatabase";
import type { SubscriptionStore } from "@/features/subscriptions/storage/subscriptionStore";
import { getFanPurchaseBackend } from "@/mockApi/subscriptions/fanPurchaseBackendRegistry";
import type { FanPurchaseOutcome } from "@/mockApi/subscriptions/mockFanPurchaseBackend";
import { getSubscriptionBackend } from "@/mockApi/subscriptions/subscriptionBackendRegistry";
import { useSubscriptionStore } from "@/store/subscriptionStore";

/**
 * How this would map to real store billing:
 *
 * - Purchases would go through StoreKit (iOS) / Play Billing (Android)
 *   instead of `getFanPurchaseBackend()`, returning a signed receipt/token
 *   rather than a plain `succeed`/`cancel`/`fail` outcome.
 * - `confirmSubscription` would send that receipt to our own backend, which
 *   is the only trusted source of truth: it re-validates the receipt with
 *   Apple/Google server-to-server before ever marking the subscription
 *   Active. A client-reported purchase success is never sufficient on its
 *   own.
 * - An Active subscription would carry a backend-tracked `expiresAt`; a
 *   scheduled job (or a check on each app open) would flip Active → a new
 *   "expired" status once `expiresAt` passes, instead of staying Active
 *   forever.
 * - Refunds/revocations arrive as store server notifications (App Store
 *   Server Notifications / RTDN) to our backend, which then updates the
 *   subscription the same way expiry does — never something the client
 *   decides for itself.
 */

let defaultStore: SubscriptionStore | null = null;

function resolveSubscriptionStore(): SubscriptionStore {
  if (defaultStore === null) {
    defaultStore = createSqliteSubscriptionStore();
  }

  return defaultStore;
}

/** Test-only: forces the next resolveSubscriptionStore() call to use this store instead of SQLite. */
export function setSubscriptionServiceStoreForTests(store: SubscriptionStore): void {
  defaultStore = store;
}

/** Test-only: clears the cached store so each test starts from a fresh one. */
export function resetSubscriptionServiceStore(): void {
  defaultStore = null;
}

const inFlightPurchasesByProductId = new Map<string, Promise<StorePurchase>>();
const inFlightRestoresByProductId = new Map<string, Promise<StorePurchase | null>>();
const confirmedPurchaseIds = new Set<string>();

/**
 * Loads the persisted subscription record for a user into the reactive
 * Zustand store — the local equivalent of "ask the backend for my current
 * subscription status" on app start, so a user who already subscribed in a
 * previous session doesn't get asked to buy again.
 */
export async function hydrateSubscription(userId: string): Promise<void> {
  const record = await resolveSubscriptionStore().getSubscription(userId);

  if (record !== undefined) {
    useSubscriptionStore.getState().setStatus(record.status, record.purchaseId);
  }
}

/**
 * Starts (or joins) a fan membership purchase. Guarded against concurrent
 * duplicate initiations for the same product at the service level — a
 * second call while one is already running returns the same in-flight
 * promise instead of starting a new purchase flow.
 */
export function purchaseSubscription(
  userId: string,
  outcome: FanPurchaseOutcome = "succeed",
): Promise<StorePurchase> {
  const existingPurchase = inFlightPurchasesByProductId.get(FAN_PRODUCT_ID);
  if (existingPurchase !== undefined) {
    return existingPurchase;
  }

  const purchasePromise = runSubscriptionPurchase(userId, outcome).finally(() => {
    inFlightPurchasesByProductId.delete(FAN_PRODUCT_ID);
  });

  inFlightPurchasesByProductId.set(FAN_PRODUCT_ID, purchasePromise);
  return purchasePromise;
}

async function runSubscriptionPurchase(
  userId: string,
  outcome: FanPurchaseOutcome,
): Promise<StorePurchase> {
  const pendingPurchase = await initiatePurchase(
    FAN_PRODUCT_ID,
    FAN_PRODUCT_PRICE_CENTS,
    FAN_PRODUCT_CURRENCY,
  );
  const resolvedPurchase = getFanPurchaseBackend().purchase(pendingPurchase, userId, outcome);

  await updatePurchaseStatus(resolvedPurchase.purchaseId, resolvedPurchase.status);

  return resolvedPurchase;
}

/**
 * Looks for a previous purchase of the fan product that actually succeeded
 * (or was already restored) and, if found, restores it — going through the
 * same backend confirmation step as a fresh purchase. Returns null when
 * there is nothing to restore; the subscription is left untouched either
 * way.
 */
export function restoreSubscription(userId: string): Promise<StorePurchase | null> {
  const existingRestore = inFlightRestoresByProductId.get(FAN_PRODUCT_ID);
  if (existingRestore !== undefined) {
    return existingRestore;
  }

  const restorePromise = runSubscriptionRestore(userId).finally(() => {
    inFlightRestoresByProductId.delete(FAN_PRODUCT_ID);
  });

  inFlightRestoresByProductId.set(FAN_PRODUCT_ID, restorePromise);
  return restorePromise;
}

async function runSubscriptionRestore(_userId: string): Promise<StorePurchase | null> {
  const previousPurchases = await getPurchasesForProduct(FAN_PRODUCT_ID);
  const restorablePurchase = previousPurchases.find(
    (purchase) =>
      purchase.status === StorePurchaseStatus.Succeeded ||
      purchase.status === StorePurchaseStatus.Restored,
  );

  if (restorablePurchase === undefined) {
    return null;
  }

  await updatePurchaseStatus(restorablePurchase.purchaseId, StorePurchaseStatus.Restored);

  return { ...restorablePurchase, status: StorePurchaseStatus.Restored };
}

/**
 * Confirms the subscription for a purchase against the mock backend.
 * Idempotent: a purchaseId already confirmed short-circuits without calling
 * the backend again, and the backend itself never schedules a second delay
 * for a purchaseId that's already pending or confirmed (see
 * mockSubscriptionBackend). The subscription is only ever set Active here —
 * never as a side effect of the purchase call itself.
 */
export async function confirmSubscription(userId: string, purchaseId: string, delayMs?: number): Promise<void> {
  if (confirmedPurchaseIds.has(purchaseId)) {
    return;
  }

  useSubscriptionStore.getState().setStatus(SubscriptionStatus.PendingConfirmation, purchaseId);
  await resolveSubscriptionStore().setSubscription({
    userId,
    status: SubscriptionStatus.PendingConfirmation,
    purchaseId,
    updatedAt: Date.now(),
  });

  const confirmation = await getSubscriptionBackend().confirmSubscription(purchaseId, delayMs);

  if (confirmedPurchaseIds.has(purchaseId)) {
    return;
  }

  confirmedPurchaseIds.add(purchaseId);
  useSubscriptionStore.getState().setStatus(SubscriptionStatus.Active, confirmation.purchaseId);
  await resolveSubscriptionStore().setSubscription({
    userId,
    status: SubscriptionStatus.Active,
    purchaseId: confirmation.purchaseId,
    updatedAt: Date.now(),
  });
}

/** Test-only: clears in-flight/idempotency tracking so each test starts fresh. */
export function resetSubscriptionServiceState(): void {
  inFlightPurchasesByProductId.clear();
  inFlightRestoresByProductId.clear();
  confirmedPurchaseIds.clear();
}
