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

/**
 * Coalesces concurrent calls for the same key into one shared promise, so a
 * second call while the first is still running returns the same in-flight
 * result instead of starting a duplicate operation.
 */
function dedupeInFlight<T>(
  inFlight: Map<string, Promise<T>>,
  key: string,
  start: () => Promise<T>,
): Promise<T> {
  const existing = inFlight.get(key);
  if (existing !== undefined) {
    return existing;
  }

  const promise = start().finally(() => inFlight.delete(key));
  inFlight.set(key, promise);
  return promise;
}

const inFlightStartsByProductId = new Map<string, Promise<StorePurchase>>();
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
 * Starts (or joins) a fan membership purchase — creates the Pending store
 * purchase and stops there, standing in for a real payment sheet that's now
 * open and waiting on the user. Guarded against concurrent duplicate
 * initiations for the same product at the service level — a second call
 * while one is already pending returns the same in-flight promise instead
 * of starting a new purchase flow.
 */
export function startSubscriptionPurchase(): Promise<StorePurchase> {
  return dedupeInFlight(inFlightStartsByProductId, FAN_PRODUCT_ID, () =>
    initiatePurchase(FAN_PRODUCT_ID, FAN_PRODUCT_PRICE_CENTS, FAN_PRODUCT_CURRENCY),
  );
}

/**
 * Resolves a Pending purchase with a chosen outcome — standing in for the
 * user tapping Confirm/Cancel on the store's payment sheet, or the store
 * reporting a failure. Separate from startSubscriptionPurchase so the UI can
 * hold a purchase open in "purchasing" until this is explicitly called.
 */
export async function resolveSubscriptionPurchase(
  userId: string,
  purchase: StorePurchase,
  outcome: FanPurchaseOutcome,
): Promise<StorePurchase> {
  const resolvedPurchase = getFanPurchaseBackend().purchase(purchase, userId, outcome);

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
  return dedupeInFlight(inFlightRestoresByProductId, FAN_PRODUCT_ID, () =>
    runSubscriptionRestore(userId),
  );
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

const inFlightConfirmationsByPurchaseId = new Map<string, Promise<void>>();

/**
 * Confirms the subscription for a purchase against the mock backend.
 * Idempotent against repeated events for the same purchaseId two ways: an
 * already-confirmed purchaseId short-circuits without calling the backend
 * again, and two concurrent calls for a purchaseId still in flight share the
 * same promise instead of each calling the backend — otherwise both would
 * pass the "already confirmed" check before either finishes and hit the
 * backend twice. The subscription is only ever set Active here — never as a
 * side effect of the purchase call itself.
 */
export function confirmSubscription(
  userId: string,
  purchaseId: string,
  delayMs?: number,
): Promise<void> {
  if (confirmedPurchaseIds.has(purchaseId)) {
    return Promise.resolve();
  }

  return dedupeInFlight(inFlightConfirmationsByPurchaseId, purchaseId, () =>
    runSubscriptionConfirmation(userId, purchaseId, delayMs),
  );
}

async function runSubscriptionConfirmation(
  userId: string,
  purchaseId: string,
  delayMs?: number,
): Promise<void> {
  useSubscriptionStore.getState().setStatus(SubscriptionStatus.PendingConfirmation, purchaseId);
  await resolveSubscriptionStore().setSubscription({
    userId,
    status: SubscriptionStatus.PendingConfirmation,
    purchaseId,
    updatedAt: Date.now(),
  });

  const confirmation = await getSubscriptionBackend().confirmSubscription(purchaseId, delayMs);

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
  inFlightStartsByProductId.clear();
  inFlightRestoresByProductId.clear();
  inFlightConfirmationsByPurchaseId.clear();
  confirmedPurchaseIds.clear();
}

/**
 * Dev-only: simulates losing local subscription state (e.g. a reinstall)
 * while leaving the store_purchases ledger untouched — the same way a real
 * reinstall would wipe the app's local data but leave Apple/Google's
 * purchase record intact for a later "Restore purchase" to find. Useful for
 * demoing/testing restore without wiping the purchase history it depends on
 * (unlike the app's full "Reset demo data" action, which clears both).
 */
export async function clearSubscriptionAccess(userId: string): Promise<void> {
  resetSubscriptionServiceState();

  await resolveSubscriptionStore().setSubscription({
    userId,
    status: SubscriptionStatus.Inactive,
    purchaseId: null,
    updatedAt: Date.now(),
  });

  useSubscriptionStore.getState().setStatus(SubscriptionStatus.Inactive, null);
}
