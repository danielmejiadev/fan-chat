import type { StorePurchase, StorePurchaseStatus } from "@/features/purchases/types";

/**
 * The CRUD contract purchaseService depends on. createSqlitePurchaseStore
 * (below) implements it against Drizzle for the app; tests implement it
 * in memory so purchase logic can run in Jest without a native SQLite
 * binary.
 */
export type PurchaseStore = {
  insertPurchase: (purchase: StorePurchase) => Promise<void>;
  updatePurchaseStatus: (purchaseId: string, status: StorePurchaseStatus) => Promise<void>;
  getPurchase: (purchaseId: string) => Promise<StorePurchase | undefined>;
  getPurchasesForProduct: (productId: string) => Promise<StorePurchase[]>;
};
