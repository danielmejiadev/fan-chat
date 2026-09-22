import { useCallback, useEffect } from "react";
import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";
import * as SplashScreen from "expo-splash-screen";

import { getAppDatabase } from "@/lib/database";
import { useAppFonts } from "@/hooks/useAppFonts";
import migrations from "../../drizzle/app/migrations";

SplashScreen.preventAutoHideAsync();

export type UseAppReadyResult = {
  isReady: boolean;
  onRootViewLayout: () => void;
};

/**
 * App startup bootstrapping: loads fonts, runs the (chat + purchases)
 * Drizzle migrations against the shared database, and hides the splash
 * screen once both are done.
 */
export function useAppReady(): UseAppReadyResult {
  const fontsLoaded = useAppFonts();
  const { success: migrationsSucceeded, error: migrationsError } = useMigrations(
    getAppDatabase(),
    migrations,
  );

  useEffect(() => {
    if (migrationsError) {
      console.error("Database migration failed", migrationsError);
    }
  }, [migrationsError]);

  const isReady = fontsLoaded && migrationsSucceeded;

  const onRootViewLayout = useCallback(() => {
    if (isReady) {
      SplashScreen.hideAsync();
    }
  }, [isReady]);

  return { isReady, onRootViewLayout };
}
