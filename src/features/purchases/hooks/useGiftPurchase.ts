import { useState } from "react";

import type { PurchaseAttemptOutcome } from "@/mockApi/purchases/mockPurchaseBackend";
import { initiatePurchase, processPurchase } from "@/features/purchases/services/purchaseService";
import { StorePurchaseStatus } from "@/features/purchases/types";

export type GiftPurchaseState = "idle" | "pending" | "confirmed" | "failed" | "canceled";

/**
 * Each gift is its own independent, consumable transaction — sending one
 * never unlocks any persistent access, so there is nothing to confirm with
 * the backend or restore later. The delayed store-confirmation and
 * aggregated-entitlement scenarios the task requires are demonstrated
 * against a real paywall product in purchaseService.test.ts instead.
 */
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

    setState("confirmed");
  };

  const reset = () => {
    setState("idle");
    setErrorMessage(null);
  };

  return { state, errorMessage, pay, reset };
}
