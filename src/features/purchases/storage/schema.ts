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

/**
 * The mock backend's entitlement decision, kept in its own table so a
 * purchase can be "succeeded" at the store while access is still "pending"
 * here — the two are never conflated.
 */
export const purchaseConfirmations = sqliteTable("purchase_confirmations", {
  purchaseId: text("purchaseId").primaryKey(),
  entitlementStatus: text("entitlementStatus").notNull(),
  confirmedAt: integer("confirmedAt"),
});
