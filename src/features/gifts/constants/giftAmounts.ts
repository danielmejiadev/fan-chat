export const GIFT_AMOUNT_CENTS = [500, 1000, 2000, 5000, 10000] as const;

export const DEFAULT_GIFT_AMOUNT_CENTS = 0;

export function formatUsdFromCents(amountCents: number): string {
  return `$${(amountCents / 100).toFixed(2)}`;
}
