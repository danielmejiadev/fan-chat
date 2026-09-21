import { Text as RNText, type TextProps } from "react-native";
import { clsx } from "clsx";

// NativeWind doesn't apply a default font family the way a browser's
// `body { font-family }` cascade would — overriding theme.fontFamily.sans
// alone doesn't make it apply automatically (nativewind/nativewind#387).
// This wrapper bakes the regular-weight Geist family in as the default, so
// callers only add font-sans-medium/font-sans-semibold when the weight
// actually deviates from regular — never font-sans itself.
export function Text({ className, ...props }: TextProps) {
  return <RNText className={clsx("font-sans", className)} {...props} />;
}
