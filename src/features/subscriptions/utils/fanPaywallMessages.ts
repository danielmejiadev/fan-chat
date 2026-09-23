import { SubscriptionStatus } from "@/features/subscriptions/types";
import type { SubscriptionPurchaseUiState } from "@/features/subscriptions/hooks/useSubscription";

export function getFanPurchaseButtonLabel(purchaseState: SubscriptionPurchaseUiState): string {
  if (purchaseState === "purchasing") {
    return "Processing...";
  }

  if (purchaseState === "restoring") {
    return "Restoring...";
  }

  return "Become a Fan";
}

export function getFanStatusMessage(
  purchaseState: SubscriptionPurchaseUiState,
  status: SubscriptionStatus,
): string | null {
  if (status === SubscriptionStatus.Active) {
    return "You're now a Fan! Your fan membership is active.";
  }

  if (status === SubscriptionStatus.PendingConfirmation) {
    return "Purchase successful — We're confirming your fan membership... Please wait.";
  }

  if (purchaseState === "cancelled") {
    return "Purchase canceled. No charge was made.";
  }

  if (purchaseState === "failed") {
    return "Purchase failed. Please try again.";
  }

  if (purchaseState === "not_found") {
    return "No previous purchase was found.";
  }

  return null;
}
