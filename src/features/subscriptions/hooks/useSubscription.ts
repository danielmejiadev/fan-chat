import { useState } from "react";

import {
  confirmSubscription,
  purchaseSubscription,
  restoreSubscription,
} from "@/features/subscriptions/services/subscriptionService";
import { StorePurchaseStatus } from "@/features/purchases/types";
import { useSubscriptionStore } from "@/store/subscriptionStore";
import type { FanPurchaseOutcome } from "@/mockApi/subscriptions/mockFanPurchaseBackend";

export type SubscriptionPurchaseUiState =
  | "idle"
  | "purchasing"
  | "restoring"
  | "success"
  | "restored"
  | "cancelled"
  | "failed"
  | "not_found";

/**
 * Thin client-side layer over subscriptionService: purchaseState is this
 * hook's own local UI state (idle/purchasing/success/...), subscription
 * status is read straight from the persisted subscriptionStore — the two
 * are never merged into a single boolean.
 */
export function useSubscription(userId: string) {
  const status = useSubscriptionStore((state) => state.status);
  const [purchaseState, setPurchaseState] = useState<SubscriptionPurchaseUiState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isBusy = purchaseState === "purchasing" || purchaseState === "restoring";

  const purchase = async (outcome: FanPurchaseOutcome = "succeed"): Promise<void> => {
    if (isBusy) {
      return;
    }

    setPurchaseState("purchasing");
    setErrorMessage(null);

    const resolvedPurchase = await purchaseSubscription(userId, outcome);

    if (resolvedPurchase.status === StorePurchaseStatus.Canceled) {
      setPurchaseState("cancelled");
      return;
    }

    if (resolvedPurchase.status === StorePurchaseStatus.Failed) {
      setPurchaseState("failed");
      setErrorMessage("Purchase failed. Please try again.");
      return;
    }

    setPurchaseState("success");
    void confirmSubscription(userId, resolvedPurchase.purchaseId);
  };

  const restore = async (): Promise<void> => {
    if (isBusy) {
      return;
    }

    setPurchaseState("restoring");
    setErrorMessage(null);

    const restoredPurchase = await restoreSubscription(userId);

    if (restoredPurchase === null) {
      setPurchaseState("not_found");
      return;
    }

    setPurchaseState("restored");
    void confirmSubscription(userId, restoredPurchase.purchaseId);
  };

  const reset = (): void => {
    setPurchaseState("idle");
    setErrorMessage(null);
  };

  return { purchaseState, status, errorMessage, purchase, restore, reset };
}
