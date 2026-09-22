import { Pressable } from "react-native";
import { useRouter } from "expo-router";
import { clsx } from "clsx";

import { Icon } from "@/components/ui/Icon";
import { Text } from "@/components/ui/Text";
import { resetDemoData } from "@/services/resetDemoData";

interface DemoResetButtonProps {
  variant: "sidebar" | "floating";
}

/**
 * Wipes every persisted chat/purchase table and returns to the conversation
 * list, so each recording of the required scenarios starts from a clean
 * state — a reset action the task requires explicitly.
 */
export function DemoResetButton({ variant }: DemoResetButtonProps) {
  const router = useRouter();

  const handleReset = async () => {
    await resetDemoData();
    router.replace("/");
  };

  if (variant === "floating") {
    return (
      <Pressable
        onPress={handleReset}
        accessibilityRole="button"
        accessibilityLabel="Reset demo data"
        className="absolute bottom-24 left-4 h-12 w-12 items-center justify-center rounded-full bg-foreground-primary shadow-lg"
      >
        <Icon name="refresh-outline" size={20} className="text-white" />
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={handleReset}
      accessibilityRole="button"
      className={clsx(
        "mt-2 flex-row items-center justify-center gap-2 rounded-[10px] border border-border-light px-4 py-2.5",
      )}
    >
      <Icon name="refresh-outline" size={16} className="text-foreground-secondary" />
      <Text className="text-h5 font-sans-medium text-foreground-secondary">Reset demo data</Text>
    </Pressable>
  );
}
