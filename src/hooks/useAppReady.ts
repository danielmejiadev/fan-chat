import { useCallback, useEffect, useState } from "react";
import { migrate } from "drizzle-orm/expo-sqlite/migrator";
import * as SplashScreen from "expo-splash-screen";

import { initializeAppDatabase } from "@/lib/database";
import { useAppFonts } from "@/hooks/useAppFonts";
import { ensurePerfTestMessagesSeeded } from "@/features/chat/services/perfTestSeed";
import { hydrateSubscription } from "@/features/subscriptions/services/subscriptionService";
import { CURRENT_FAN_ID } from "@/features/chat/constants/mockConversations";
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

        // Fire-and-forget: seeds the 50k-message perf-test dataset in the
        // background so it's ready by the time that conversation is opened,
        // without delaying app startup (splash hide only waits on
        // migrationsSucceeded above).
        void ensurePerfTestMessagesSeeded();

        // Fire-and-forget: loads any previously confirmed subscription so
        // the header doesn't ask a returning fan to buy again.
        void hydrateSubscription(CURRENT_FAN_ID);
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
