import { useCallback, useEffect, useState } from "react";
import { migrate } from "drizzle-orm/expo-sqlite/migrator";
import * as SplashScreen from "expo-splash-screen";

import { initializeAppDatabase } from "@/lib/database";
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
  const [migrationsSucceeded, setMigrationsSucceeded] = useState(false);
  const [migrationsError, setMigrationsError] = useState<Error | null>(null);

  useEffect(() => {
    let isCancelled = false;

    initializeAppDatabase()
      .then((appDatabase) => migrate(appDatabase, migrations))
      .then(() => {
        if (!isCancelled) {
          setMigrationsSucceeded(true);
        }
      })
      .catch((error: Error) => {
        if (!isCancelled) {
          setMigrationsError(error);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, []);

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
