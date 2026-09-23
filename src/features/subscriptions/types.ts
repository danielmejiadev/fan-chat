/**
 * Whether the fan membership subscription is actually active. Deliberately
 * independent from StorePurchaseStatus (features/purchases/types.ts): a
 * Succeeded purchase does not by itself activate the subscription
 * (PendingConfirmation until the backend confirms it), and a later Failed
 * purchase attempt must never move an already-Active subscription back to
 * Inactive.
 */
export enum SubscriptionStatus {
  Inactive = "inactive",
  PendingConfirmation = "pending_confirmation",
  Active = "active",
}
