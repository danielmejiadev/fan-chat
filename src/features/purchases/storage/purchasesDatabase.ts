import { getDatabase } from "@/lib/database";
import type { PurchaseStore } from "@/features/purchases/storage/purchaseStore";
import type {
  PurchaseConfirmation,
  StorePurchase,
  StorePurchaseStatus,
} from "@/features/purchases/types";

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

export function createSqlitePurchaseStore(): PurchaseStore {
  const database = getDatabase();

  return {
    insertPurchase(purchase: StorePurchase): void {
      database.runSync(
        `INSERT OR IGNORE INTO store_purchases (purchaseId, productId, priceCents, currency, status, createdAt)
         VALUES ($purchaseId, $productId, $priceCents, $currency, $status, $createdAt)`,
        {
          $purchaseId: purchase.purchaseId,
          $productId: purchase.productId,
          $priceCents: purchase.priceCents,
          $currency: purchase.currency,
          $status: purchase.status,
          $createdAt: purchase.createdAt,
        },
      );
    },

    updatePurchaseStatus(purchaseId: string, status: StorePurchaseStatus): void {
      database.runSync(
        `UPDATE store_purchases SET status = $status WHERE purchaseId = $purchaseId`,
        {
          $status: status,
          $purchaseId: purchaseId,
        },
      );
    },

    getPurchase(purchaseId: string): StorePurchase | undefined {
      const row = database.getFirstSync<StorePurchase>(
        `SELECT purchaseId, productId, priceCents, currency, status, createdAt
         FROM store_purchases
         WHERE purchaseId = $purchaseId`,
        { $purchaseId: purchaseId },
      );

      return row ?? undefined;
    },

    getPurchasesForProduct(productId: string): StorePurchase[] {
      return database.getAllSync<StorePurchase>(
        `SELECT purchaseId, productId, priceCents, currency, status, createdAt
         FROM store_purchases
         WHERE productId = $productId
         ORDER BY createdAt ASC`,
        { $productId: productId },
      );
    },

    upsertConfirmation(confirmation: PurchaseConfirmation): void {
      database.runSync(
        `INSERT INTO purchase_confirmations (purchaseId, entitlementStatus, confirmedAt)
         VALUES ($purchaseId, $entitlementStatus, $confirmedAt)
         ON CONFLICT(purchaseId) DO UPDATE SET
           entitlementStatus = excluded.entitlementStatus,
           confirmedAt = excluded.confirmedAt`,
        {
          $purchaseId: confirmation.purchaseId,
          $entitlementStatus: confirmation.entitlementStatus,
          $confirmedAt: confirmation.confirmedAt,
        },
      );
    },

    getConfirmation(purchaseId: string): PurchaseConfirmation | undefined {
      const row = database.getFirstSync<PurchaseConfirmation>(
        `SELECT purchaseId, entitlementStatus, confirmedAt
         FROM purchase_confirmations
         WHERE purchaseId = $purchaseId`,
        { $purchaseId: purchaseId },
      );

      return row ?? undefined;
    },
  };
}
