import { useCallback } from "react";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "@expo-google-fonts/geist/useFonts";
import { Geist_400Regular } from "@expo-google-fonts/geist/400Regular";
import { Geist_500Medium } from "@expo-google-fonts/geist/500Medium";
import { Geist_600SemiBold } from "@expo-google-fonts/geist/600SemiBold";

export function useLoadFonts() {
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

  return { fontsLoaded, onRootViewLayout };
}
