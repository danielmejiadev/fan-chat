import { useCallback, useEffect, useState } from "react";

import { getEntitlementStatus } from "@/features/purchases/services/purchaseService";
import { EntitlementStatus } from "@/features/purchases/types";

export type UseEntitlementStatusResult = {
  entitlementStatus: EntitlementStatus;
  refresh: () => void;
};

/**
 * getEntitlementStatus reads local storage and isn't reactive on its own —
 * this wraps it in state so a component (e.g. a header badge) re-renders
 * when something elsewhere (a confirmed purchase, a restore) calls
 * refresh(), or once the initial read resolves.
 */
export function useEntitlementStatus(productId: string): UseEntitlementStatusResult {
  const [entitlementStatus, setEntitlementStatus] = useState<EntitlementStatus>(
    EntitlementStatus.Pending,
  );

  const refresh = useCallback(() => {
    getEntitlementStatus(productId).then(setEntitlementStatus);
  }, [productId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { entitlementStatus, refresh };
}
