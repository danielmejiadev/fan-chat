import { eq } from "drizzle-orm";

import { getAppDatabase } from "@/lib/database";
import { subscriptions } from "@/features/subscriptions/storage/schema";
import type {
  SubscriptionRecord,
  SubscriptionStore,
} from "@/features/subscriptions/storage/subscriptionStore";

/** Wipes the subscriptions table — used by the demo's reset action, never in normal app flow. */
export async function clearSubscriptionsData(): Promise<void> {
  const database = getAppDatabase();

  await database.delete(subscriptions);
}

export function createSqliteSubscriptionStore(): SubscriptionStore {
  const database = getAppDatabase();

  return {
    async getSubscription(userId: string): Promise<SubscriptionRecord | undefined> {
      const row = await database.query.subscriptions.findFirst({
        where: eq(subscriptions.userId, userId),
      });

      return row as SubscriptionRecord | undefined;
    },

    async setSubscription(record: SubscriptionRecord): Promise<void> {
      await database
        .insert(subscriptions)
        .values(record)
        .onConflictDoUpdate({
          target: subscriptions.userId,
          set: {
            status: record.status,
            purchaseId: record.purchaseId,
            updatedAt: record.updatedAt,
          },
        });
    },
  };
}
