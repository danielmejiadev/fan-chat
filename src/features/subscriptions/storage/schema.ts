import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * Confirmed fan membership subscription state, one row per user. Kept
 * separate from store_purchases (features/purchases): a purchase
 * transaction and the backend-confirmed subscription it eventually unlocks
 * are different concerns (see subscriptionService).
 */
export const subscriptions = sqliteTable("subscriptions", {
  userId: text("userId").primaryKey(),
  status: text("status").notNull(),
  purchaseId: text("purchaseId"),
  updatedAt: integer("updatedAt").notNull(),
});
