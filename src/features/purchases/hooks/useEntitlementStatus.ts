import { useCallback, useState } from "react";

import { getEntitlementStatus } from "@/features/purchases/services/purchaseService";
import type { EntitlementStatus } from "@/features/purchases/types";

export type UseEntitlementStatusResult = {
  entitlementStatus: EntitlementStatus;
  refresh: () => void;
};

/**
 * getEntitlementStatus reads local storage synchronously and isn't reactive
 * on its own — this wraps it in state so a component (e.g. a header badge)
 * re-renders when something elsewhere (a confirmed purchase, a restore)
 * calls refresh().
 */
export function useEntitlementStatus(productId: string): UseEntitlementStatusResult {
  const [entitlementStatus, setEntitlementStatus] = useState<EntitlementStatus>(() =>
    getEntitlementStatus(productId),
  );

  const refresh = useCallback(() => {
    setEntitlementStatus(getEntitlementStatus(productId));
  }, [productId]);

  return { entitlementStatus, refresh };
}
