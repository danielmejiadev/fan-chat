import { useState } from "react";

import { getPurchaseBackend } from "@/features/purchases/services/purchaseBackendRegistry";
import {
  confirmPurchase,
  getEntitlementStatus,
  initiatePurchase,
  processPurchase,
} from "@/features/purchases/services/purchaseService";
import { EntitlementStatus, StorePurchaseStatus } from "@/features/purchases/types";

export type GiftPurchaseState = "idle" | "pending" | "confirmed" | "failed" | "canceled";

export function useGiftPurchase(userId: string, productId: string) {
  const [state, setState] = useState<GiftPurchaseState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const pay = (amountCents: number): boolean => {
    if (amountCents <= 0) {
      return false;
    }

    setState("pending");
    setErrorMessage(null);

    const backend = getPurchaseBackend();
    const purchase = initiatePurchase(productId, amountCents, "USD");
    const processedPurchase = processPurchase(purchase, backend, userId);

    if (processedPurchase.status === StorePurchaseStatus.Canceled) {
      setState("canceled");
      return false;
    }

    if (processedPurchase.status !== StorePurchaseStatus.Succeeded) {
      setState("failed");
      setErrorMessage("Payment failed. Try again.");
      return false;
    }

    confirmPurchase(processedPurchase.purchaseId, backend);
    const entitlement = getEntitlementStatus(productId);

    if (entitlement === EntitlementStatus.Active) {
      setState("confirmed");
      return true;
    }

    setState("pending");
    return false;
  };

  const reset = () => {
    setState("idle");
    setErrorMessage(null);
  };

  return { state, errorMessage, pay, reset };
}
