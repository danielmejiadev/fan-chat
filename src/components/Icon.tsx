import type { ComponentProps, ComponentType } from "react";
import { Ionicons } from "@expo/vector-icons";
import { cssInterop } from "nativewind";

// Ionicons isn't a NativeWind-aware component — it reads color through its
// own `color` prop, not through `className`/`style` like View/Text. This
// interop maps `className`'s resolved color onto that prop, so icons can
// use the same CSS-variable-backed Tailwind tokens as everything else
// instead of a hardcoded hex.
cssInterop(Ionicons, {
  className: {
    target: "style",
    nativeStyleToProp: { color: true },
  },
});

export const Icon = Ionicons as unknown as ComponentType<
  ComponentProps<typeof Ionicons> & { className?: string }
>;
