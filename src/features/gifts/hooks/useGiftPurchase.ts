import { useState } from "react";

import { initiatePurchase } from "@/features/purchases/services/purchaseService";
import { processGiftPurchase } from "@/features/gifts/services/giftPurchaseService";
import { StorePurchaseStatus } from "@/features/purchases/types";

export enum GiftPurchaseState {
  Idle = "idle",
  Pending = "pending",
  Confirmed = "confirmed",
  Failed = "failed",
  Canceled = "canceled",
}

/**
 * Each gift is its own independent, consumable transaction — sending one
 * never unlocks any persistent access, so there is nothing to confirm with
 * the backend or restore later.
 */
export function useGiftPurchase(userId: string, productId: string) {
  const [state, setState] = useState<GiftPurchaseState>(GiftPurchaseState.Idle);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const pay = async (amountCents: number): Promise<GiftPurchaseState> => {
    if (amountCents <= 0) {
      return state;
    }

    setState(GiftPurchaseState.Pending);
    setErrorMessage(null);

    const purchase = await initiatePurchase(productId, amountCents, "USD");
    const processedPurchase = await processGiftPurchase(purchase, userId);

    if (processedPurchase.status === StorePurchaseStatus.Canceled) {
      setState(GiftPurchaseState.Canceled);
      return GiftPurchaseState.Canceled;
    }

    if (processedPurchase.status !== StorePurchaseStatus.Succeeded) {
      setState(GiftPurchaseState.Failed);
      setErrorMessage("Payment failed. Try again.");
      return GiftPurchaseState.Failed;
    }

    setState(GiftPurchaseState.Confirmed);
    return GiftPurchaseState.Confirmed;
  };

  const reset = () => {
    setState(GiftPurchaseState.Idle);
    setErrorMessage(null);
  };

  return { state, errorMessage, pay, reset };
}
