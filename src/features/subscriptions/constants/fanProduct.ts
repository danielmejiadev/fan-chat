export const FAN_PRODUCT = {
  id: "fan-membership",
  name: "Fan Membership",
  description: "Get access to exclusive fan content.",
  priceCents: 499,
  currency: "USD",
  period: "month",
};

export function formatFanProductPrice(): string {
  return `$${(FAN_PRODUCT.priceCents / 100).toFixed(2)} / ${FAN_PRODUCT.period}`;
}
