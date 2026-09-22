export type PaymentMethod = "card" | "apple" | "paypal" | "crypto";

export enum StorePurchaseStatus {
  Pending = "pending",
  Succeeded = "succeeded",
  Canceled = "canceled",
  Failed = "failed",
  Restored = "restored",
}

export type StorePurchase = {
  purchaseId: string;
  productId: string;
  priceCents: number;
  currency: string;
  status: StorePurchaseStatus;
  createdAt: number;
};
