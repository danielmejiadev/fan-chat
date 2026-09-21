import type {
  PurchaseConfirmation,
  StorePurchase,
  StorePurchaseStatus,
} from "@/features/purchases/types";

/**
 * The CRUD contract purchaseService depends on. createSqlitePurchaseStore
 * (below) implements it against expo-sqlite for the app; tests implement it
 * in memory so the entitlement logic can run in Jest without a native
 * SQLite binary.
 */
export type PurchaseStore = {
  insertPurchase: (purchase: StorePurchase) => void;
  updatePurchaseStatus: (purchaseId: string, status: StorePurchaseStatus) => void;
  getPurchase: (purchaseId: string) => StorePurchase | undefined;
  getPurchasesForProduct: (productId: string) => StorePurchase[];
  upsertConfirmation: (confirmation: PurchaseConfirmation) => void;
  getConfirmation: (purchaseId: string) => PurchaseConfirmation | undefined;
};
