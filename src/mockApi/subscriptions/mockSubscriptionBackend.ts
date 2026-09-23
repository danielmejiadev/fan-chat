export type SubscriptionConfirmation = {
  purchaseId: string;
  confirmedAt: number;
};

/** Default artificial delay used outside tests, so the pending-confirmation UI state is visible. */
export const DEFAULT_SUBSCRIPTION_CONFIRMATION_DELAY_MS = 1500;

/**
 * Simulates the backend call that validates a purchase server-side and
 * activates the subscription — deliberately separate from the store
 * purchase result itself (see StorePurchaseStatus vs SubscriptionStatus).
 * Safe against repeated confirmation events for the same purchaseId: an
 * already-confirmed or already-in-flight confirmation is returned again
 * instead of scheduling a second delay or producing a second result.
 */
export type MockSubscriptionBackend = {
  confirmSubscription: (purchaseId: string, delayMs?: number) => Promise<SubscriptionConfirmation>;
};

export function createMockSubscriptionBackend(): MockSubscriptionBackend {
  const confirmationsByPurchaseId = new Map<string, SubscriptionConfirmation>();
  const pendingConfirmationsByPurchaseId = new Map<string, Promise<SubscriptionConfirmation>>();

  return {
    confirmSubscription(purchaseId, delayMs = DEFAULT_SUBSCRIPTION_CONFIRMATION_DELAY_MS) {
      const existingConfirmation = confirmationsByPurchaseId.get(purchaseId);
      if (existingConfirmation !== undefined) {
        return Promise.resolve(existingConfirmation);
      }

      const existingPendingConfirmation = pendingConfirmationsByPurchaseId.get(purchaseId);
      if (existingPendingConfirmation !== undefined) {
        return existingPendingConfirmation;
      }

      const pendingConfirmation = new Promise<SubscriptionConfirmation>((resolve) => {
        setTimeout(() => {
          const confirmation: SubscriptionConfirmation = { purchaseId, confirmedAt: Date.now() };
          confirmationsByPurchaseId.set(purchaseId, confirmation);
          pendingConfirmationsByPurchaseId.delete(purchaseId);
          resolve(confirmation);
        }, delayMs);
      });

      pendingConfirmationsByPurchaseId.set(purchaseId, pendingConfirmation);
      return pendingConfirmation;
    },
  };
}
