import { formatUsdFromCents } from "@/features/purchases/constants/giftAmounts";
import type { GiftPurchaseState } from "@/features/purchases/hooks/useGiftPurchase";

export function getPayButtonLabel(state: GiftPurchaseState, amountCents: number) {
  if (state === "pending") {
    return "Processing…";
  }
  return `Pay ${formatUsdFromCents(amountCents)}`;
}
