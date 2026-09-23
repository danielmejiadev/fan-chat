import { eq } from "drizzle-orm";

import { getAppDatabase } from "@/lib/database";
import { storePurchases } from "@/features/purchases/storage/schema";
import type { PurchaseStore } from "@/features/purchases/storage/purchaseStore";
import type { StorePurchase, StorePurchaseStatus } from "@/features/purchases/types";

/** Wipes the store purchases ledger — used by the demo's reset action, never in normal app flow. */
export async function clearPurchasesData(): Promise<void> {
  const database = getAppDatabase();

  await database.delete(storePurchases);
}

export function createSqlitePurchaseStore(): PurchaseStore {
  const database = getAppDatabase();

  return {
    async insertPurchase(purchase: StorePurchase): Promise<void> {
      await database.insert(storePurchases).values(purchase).onConflictDoNothing();
    },

    async updatePurchaseStatus(purchaseId: string, status: StorePurchaseStatus): Promise<void> {
      await database
        .update(storePurchases)
        .set({ status })
        .where(eq(storePurchases.purchaseId, purchaseId));
    },

    async getPurchasesForProduct(productId: string): Promise<StorePurchase[]> {
      const rows = await database
        .select()
        .from(storePurchases)
        .where(eq(storePurchases.productId, productId))
        .orderBy(storePurchases.createdAt);

      return rows as StorePurchase[];
    },
  };
}
