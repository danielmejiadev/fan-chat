import "@/global.css";

import { useCallback } from "react";
import { View } from "react-native";
import { Stack } from "expo-router";
import { SQLiteProvider } from "expo-sqlite";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "@expo-google-fonts/geist/useFonts";
import { Geist_400Regular } from "@expo-google-fonts/geist/400Regular";
import { Geist_500Medium } from "@expo-google-fonts/geist/500Medium";
import { Geist_600SemiBold } from "@expo-google-fonts/geist/600SemiBold";

import { initChatSchema } from "@/features/chat/storage/chatDatabase";
import { initPurchasesSchema } from "@/features/purchases/storage/purchasesDatabase";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
  });

  const onRootViewLayout = useCallback(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={{ flex: 1 }} onLayout={onRootViewLayout}>
      <SQLiteProvider
        databaseName="myapp.db"
        onInit={async () => {
          initChatSchema();
          initPurchasesSchema();
        }}
      >
        <Stack screenOptions={{ headerShown: false }} />
      </SQLiteProvider>
    </View>
  );
}
