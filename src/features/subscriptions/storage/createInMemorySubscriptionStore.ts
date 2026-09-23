import type {
  SubscriptionRecord,
  SubscriptionStore,
} from "@/features/subscriptions/storage/subscriptionStore";

/**
 * In-memory SubscriptionStore for tests — expo-sqlite is a native module
 * that does not run under Jest/Node, so unit tests exercise the same
 * SubscriptionStore contract against this fake instead of
 * createSqliteSubscriptionStore.
 */
export function createInMemorySubscriptionStore(): SubscriptionStore {
  const records = new Map<string, SubscriptionRecord>();

  return {
    async getSubscription(userId) {
      return records.get(userId);
    },
    async setSubscription(record) {
      records.set(record.userId, record);
    },
  };
}
