import { formatUsdFromCents } from "@/features/gifts/constants/giftAmounts";
import type { GiftPurchaseState } from "@/features/gifts/hooks/useGiftPurchase";

export function getPayButtonLabel(state: GiftPurchaseState, amountCents: number) {
  if (state === "pending") {
    return "Processing…";
  }
  return `Pay ${formatUsdFromCents(amountCents)}`;
}
