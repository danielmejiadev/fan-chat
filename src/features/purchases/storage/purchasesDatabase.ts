import { eq } from "drizzle-orm";

import { getAppDatabase } from "@/lib/database";
import { purchaseConfirmations, storePurchases } from "@/features/purchases/storage/schema";
import type { PurchaseStore } from "@/features/purchases/storage/purchaseStore";
import type {
  PurchaseConfirmation,
  StorePurchase,
  StorePurchaseStatus,
} from "@/features/purchases/types";

/** Wipes every purchases table — used by the demo's reset action, never in normal app flow. */
export async function clearPurchasesData(): Promise<void> {
  const database = getAppDatabase();

  await database.delete(storePurchases);
  await database.delete(purchaseConfirmations);
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

    async getPurchase(purchaseId: string): Promise<StorePurchase | undefined> {
      const row = await database.query.storePurchases.findFirst({
        where: eq(storePurchases.purchaseId, purchaseId),
      });

      return row as StorePurchase | undefined;
    },

    async getPurchasesForProduct(productId: string): Promise<StorePurchase[]> {
      const rows = await database
        .select()
        .from(storePurchases)
        .where(eq(storePurchases.productId, productId))
        .orderBy(storePurchases.createdAt);

      return rows as StorePurchase[];
    },

    async upsertConfirmation(confirmation: PurchaseConfirmation): Promise<void> {
      await database
        .insert(purchaseConfirmations)
        .values(confirmation)
        .onConflictDoUpdate({
          target: purchaseConfirmations.purchaseId,
          set: {
            entitlementStatus: confirmation.entitlementStatus,
            confirmedAt: confirmation.confirmedAt,
          },
        });
    },

    async getConfirmation(purchaseId: string): Promise<PurchaseConfirmation | undefined> {
      const row = await database.query.purchaseConfirmations.findFirst({
        where: eq(purchaseConfirmations.purchaseId, purchaseId),
      });

      return row as PurchaseConfirmation | undefined;
    },
  };
}
