import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * The result of the mock store flow, keyed by purchaseId so repeated taps on
 * "Pay" for the same in-flight purchase cannot duplicate it.
 */
export const storePurchases = sqliteTable("store_purchases", {
  purchaseId: text("purchaseId").primaryKey(),
  productId: text("productId").notNull(),
  priceCents: integer("priceCents").notNull(),
  currency: text("currency").notNull(),
  status: text("status").notNull(),
  createdAt: integer("createdAt").notNull(),
});
