import { useWindowDimensions } from "react-native";

const DESKTOP_BREAKPOINT = 1024;

export function useIsDesktopLayout(): boolean {
  const { width } = useWindowDimensions();

  return width >= DESKTOP_BREAKPOINT;
}
