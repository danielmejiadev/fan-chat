import { create } from "zustand";

import { SubscriptionStatus } from "@/features/subscriptions/types";

/**
 * Reactive mirror of the subscription record persisted in the
 * `subscriptions` table — this store holds nothing durable itself. It's
 * populated by subscriptionService.hydrateSubscription() on app start and
 * kept in sync by subscriptionService.confirmSubscription() afterwards, so
 * components can subscribe without re-reading the database on every render.
 */
type SubscriptionStore = {
  status: SubscriptionStatus;
  activePurchaseId: string | null;
  setStatus: (status: SubscriptionStatus, purchaseId: string | null) => void;
};

export const useSubscriptionStore = create<SubscriptionStore>((set) => ({
  status: SubscriptionStatus.Inactive,
  activePurchaseId: null,
  setStatus: (status, purchaseId) => {
    set({ status, activePurchaseId: purchaseId });
  },
}));

/** Resets in-memory state — used by the demo's reset action and by tests. */
export function resetSubscriptionStore(): void {
  useSubscriptionStore.setState({ status: SubscriptionStatus.Inactive, activePurchaseId: null });
}

/** Non-reactive read for use outside React components (services, mockApi). */
export function isSubscriptionActive(): boolean {
  return useSubscriptionStore.getState().status === SubscriptionStatus.Active;
}
