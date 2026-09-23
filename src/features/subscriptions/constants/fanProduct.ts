export const FAN_PRODUCT_ID = "fan-membership";

export const FAN_PRODUCT_NAME = "Fan Membership";

export const FAN_PRODUCT_DESCRIPTION = "Get access to exclusive fan content.";

export const FAN_PRODUCT_PRICE_CENTS = 499;

export const FAN_PRODUCT_CURRENCY = "USD";

export const FAN_PRODUCT_PERIOD = "month";

export function formatFanProductPrice(): string {
  return `$${(FAN_PRODUCT_PRICE_CENTS / 100).toFixed(2)} / ${FAN_PRODUCT_PERIOD}`;
}
