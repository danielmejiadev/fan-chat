import "@/global.css";

import { View } from "react-native";
import { Stack } from "expo-router";

import { useAppReady } from "@/hooks/useAppReady";

export default function RootLayout() {
  const { isReady, onRootViewLayout } = useAppReady();

  if (!isReady) {
    return null;
  }

  return (
    <View style={{ flex: 1 }} onLayout={onRootViewLayout}>
      <Stack screenOptions={{ headerShown: false }} />
    </View>
  );
}
