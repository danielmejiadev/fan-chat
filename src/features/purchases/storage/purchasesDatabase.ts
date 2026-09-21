import { getDatabase } from "@/lib/database";

/**
 * store_purchases: the result of the mock store flow, keyed by purchaseId so
 * repeated taps on "Pay" for the same in-flight purchase cannot duplicate it.
 *
 * purchase_confirmations: the mock backend's entitlement decision, kept in
 * its own table so a purchase can be "succeeded" at the store while access
 * is still "pending" here — the two are never conflated.
 */
export function initPurchasesSchema(): void {
  const database = getDatabase();

  database.execSync(`
    CREATE TABLE IF NOT EXISTS store_purchases (
      purchaseId TEXT PRIMARY KEY NOT NULL,
      productId TEXT NOT NULL,
      priceCents INTEGER NOT NULL,
      currency TEXT NOT NULL,
      status TEXT NOT NULL,
      createdAt INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS purchase_confirmations (
      purchaseId TEXT PRIMARY KEY NOT NULL,
      entitlementStatus TEXT NOT NULL,
      confirmedAt INTEGER
    );
  `);
}
