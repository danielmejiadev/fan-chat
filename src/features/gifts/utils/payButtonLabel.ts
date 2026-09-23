import { formatUsdFromCents } from "@/features/gifts/constants/giftAmounts";
import { GiftPurchaseState } from "@/features/gifts/hooks/useGiftPurchase";

export function getPayButtonLabel(state: GiftPurchaseState, amountCents: number) {
  if (state === GiftPurchaseState.Pending) {
    return "Processing…";
  }
  return `Pay ${formatUsdFromCents(amountCents)}`;
}
