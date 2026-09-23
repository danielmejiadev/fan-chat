import { useDebugNetworkStore } from "@/store/debugNetworkStore";

export function useIsOffline(): boolean {
  return useDebugNetworkStore((state) => state.isForcedOffline);
}
