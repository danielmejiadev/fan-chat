import { useState } from "react";

import { initiatePurchase } from "@/features/purchases/services/purchaseService";
import { processGiftPurchase } from "@/features/gifts/services/giftPurchaseService";
import { StorePurchaseStatus } from "@/features/purchases/types";

export type GiftPurchaseState = "idle" | "pending" | "confirmed" | "failed" | "canceled";

/**
 * Each gift is its own independent, consumable transaction — sending one
 * never unlocks any persistent access, so there is nothing to confirm with
 * the backend or restore later.
 */
export function useGiftPurchase(userId: string, productId: string) {
  const [state, setState] = useState<GiftPurchaseState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const pay = async (amountCents: number): Promise<void> => {
    if (amountCents <= 0) {
      return;
    }

    setState("pending");
    setErrorMessage(null);

    const purchase = await initiatePurchase(productId, amountCents, "USD");
    const processedPurchase = await processGiftPurchase(purchase, userId);

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
