import { useState } from "react";

import type { PurchaseAttemptOutcome } from "@/mockApi/purchases/mockPurchaseBackend";
import {
  confirmPurchase,
  getEntitlementStatus,
  initiatePurchase,
  processPurchase,
  restorePurchases,
} from "@/features/purchases/services/purchaseService";
import { EntitlementStatus, StorePurchaseStatus } from "@/features/purchases/types";

export type GiftPurchaseState =
  "idle" | "pending" | "pending-confirmation" | "confirmed" | "failed" | "canceled";

const CONFIRMATION_DELAY_MS = 1500;

export function useGiftPurchase(userId: string, productId: string) {
  const [state, setState] = useState<GiftPurchaseState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  /**
   * debugOutcome lets the demo controls force a store outcome other than
   * "succeeded" — production callers never pass it, so real behavior is
   * unaffected.
   */
  const pay = async (amountCents: number, debugOutcome?: PurchaseAttemptOutcome): Promise<void> => {
    if (amountCents <= 0) {
      return;
    }

    setState("pending");
    setErrorMessage(null);

    const purchase = await initiatePurchase(productId, amountCents, "USD");
    const processedPurchase = await processPurchase(
      purchase,
      userId,
      debugOutcome !== undefined ? { outcome: debugOutcome } : undefined,
    );

    if (processedPurchase.status === StorePurchaseStatus.Canceled) {
      setState("canceled");
      return;
    }

    if (processedPurchase.status !== StorePurchaseStatus.Succeeded) {
      setState("failed");
      setErrorMessage("Payment failed. Try again.");
      return;
    }

    // The store confirmed the charge, but access isn't granted yet — the
    // backend's own entitlement confirmation is a separate, possibly-delayed
    // step. Simulating that delay here is what makes the "pending
    // confirmation" state honestly reachable from the real UI instead of
    // only from a test with an injected backend.
    setState("pending-confirmation");

    setTimeout(async () => {
      await confirmPurchase(processedPurchase.purchaseId);
      const entitlement = await getEntitlementStatus(productId);
      setState(entitlement === EntitlementStatus.Active ? "confirmed" : "pending");
    }, CONFIRMATION_DELAY_MS);
  };

  /** Restoring never demotes a still-valid entitlement gained some other way. */
  const restore = async (): Promise<boolean> => {
    await restorePurchases(userId);
    const entitlement = await getEntitlementStatus(productId);

    if (entitlement === EntitlementStatus.Active) {
      setState("confirmed");
      return true;
    }

    return false;
  };

  const reset = () => {
    setState("idle");
    setErrorMessage(null);
  };

  return { state, errorMessage, pay, restore, reset };
}
