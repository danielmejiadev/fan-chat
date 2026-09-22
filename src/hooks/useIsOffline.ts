import NetInfo from "@react-native-community/netinfo";
import { useEffect, useState } from "react";

export function useIsOffline(): boolean {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    return NetInfo.addEventListener((state) => {
      setIsOffline(state.isConnected === false);
    });
  }, []);

  return isOffline;
}
