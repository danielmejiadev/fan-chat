import { useEffect, useState } from "react";
import { Animated } from "react-native";

import { useReducedMotion } from "@/hooks/useReducedMotion";

const DEFAULT_DURATION_MS = 200;

export function useFadeInEntrance(durationMs: number = DEFAULT_DURATION_MS): Animated.Value {
  const isReducedMotionEnabled = useReducedMotion();
  const [opacity] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (isReducedMotionEnabled) {
      opacity.setValue(1);
      return;
    }

    Animated.timing(opacity, {
      toValue: 1,
      duration: durationMs,
      useNativeDriver: true,
    }).start();
  }, [isReducedMotionEnabled, opacity, durationMs]);

  return opacity;
}
