export enum StorePurchaseStatus {
  Pending = "pending",
  Succeeded = "succeeded",
  Canceled = "canceled",
  Failed = "failed",
  Restored = "restored",
}

/**
 * The result of the mock store flow (tap "Pay" → mock payment sheet).
 * This is deliberately separate from EntitlementStatus below: a successful
 * purchase here does not grant access until the mock backend confirms it.
 */
export type StorePurchase = {
  purchaseId: string;
  productId: string;
  priceCents: number;
  currency: string;
  status: StorePurchaseStatus;
  createdAt: number;
};

export enum EntitlementStatus {
  Pending = "pending",
  Active = "active",
  Revoked = "revoked",
}

/**
 * The mock backend's confirmation of a StorePurchase. Access is granted only
 * when entitlementStatus is "active" — never from StorePurchaseStatus alone.
 */
export type PurchaseConfirmation = {
  purchaseId: string;
  entitlementStatus: EntitlementStatus;
  confirmedAt: number | null;
};
