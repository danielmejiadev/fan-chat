import NetInfo from "@react-native-community/netinfo";
import { useEffect, useState } from "react";

import { useDebugNetworkStore } from "@/store/debugNetworkStore";

export function useIsOffline(): boolean {
  const [isOffline, setIsOffline] = useState(false);
  const isForcedOffline = useDebugNetworkStore((state) => state.isForcedOffline);

  useEffect(() => {
    return NetInfo.addEventListener((state) => {
      setIsOffline(state.isConnected === false);
    });
  }, []);

  return isForcedOffline || isOffline;
}
