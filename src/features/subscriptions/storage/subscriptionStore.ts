import type { SubscriptionStatus } from "@/features/subscriptions/types";

export type SubscriptionRecord = {
  userId: string;
  status: SubscriptionStatus;
  purchaseId: string | null;
  updatedAt: number;
};

/**
 * The CRUD contract subscriptionService depends on. createSqliteSubscriptionStore
 * (in subscriptionsDatabase.ts) implements it against Drizzle for the app;
 * tests implement it in memory so subscription logic can run in Jest
 * without a native SQLite binary.
 */
export type SubscriptionStore = {
  getSubscription: (userId: string) => Promise<SubscriptionRecord | undefined>;
  setSubscription: (record: SubscriptionRecord) => Promise<void>;
};
