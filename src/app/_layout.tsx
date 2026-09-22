import "@/global.css";

import { useEffect } from "react";
import { View } from "react-native";
import { Stack } from "expo-router";
import { SQLiteProvider } from "expo-sqlite";
import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";
import * as SplashScreen from "expo-splash-screen";

import { getChatDatabase } from "@/lib/database";
import { initPurchasesSchema } from "@/features/purchases/storage/purchasesDatabase";
import { useLoadFonts } from "@/hooks/useLoadFonts";
import migrations from "../../drizzle/chat/migrations";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { fontsLoaded, onRootViewLayout } = useLoadFonts();
  const { success: chatMigrationsSucceeded, error: chatMigrationsError } = useMigrations(
    getChatDatabase(),
    migrations,
  );

  useEffect(() => {
    if (chatMigrationsError) {
      console.error("Chat schema migration failed", chatMigrationsError);
    }
  }, [chatMigrationsError]);

  if (!fontsLoaded || !chatMigrationsSucceeded) {
    return null;
  }

  return (
    <View style={{ flex: 1 }} onLayout={onRootViewLayout}>
      <SQLiteProvider
        databaseName="myapp.db"
        onInit={async () => {
          initPurchasesSchema();
        }}
      >
        <Stack screenOptions={{ headerShown: false }} />
      </SQLiteProvider>
    </View>
  );
}
