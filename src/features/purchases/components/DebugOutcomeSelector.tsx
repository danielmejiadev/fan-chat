import { Pressable, View } from "react-native";
import { clsx } from "clsx";

import { Text } from "@/components/ui/Text";
import type { PurchaseAttemptOutcome } from "@/mockApi/purchases/mockPurchaseBackend";
import { StorePurchaseStatus } from "@/features/purchases/types";

const DEBUG_OUTCOMES: { label: string; value: PurchaseAttemptOutcome }[] = [
  { label: "Success", value: StorePurchaseStatus.Succeeded },
  { label: "Cancel", value: StorePurchaseStatus.Canceled },
  { label: "Fail", value: StorePurchaseStatus.Failed },
];

interface DebugOutcomeSelectorProps {
  selectedOutcome: PurchaseAttemptOutcome | undefined;
  onSelect: (outcome: PurchaseAttemptOutcome) => void;
  onRestore: () => void;
}

export function DebugOutcomeSelector({
  selectedOutcome,
  onSelect,
  onRestore,
}: DebugOutcomeSelectorProps) {
  return (
    <View className="gap-2 rounded-xl border border-dashed border-border-light p-3">
      <Text className="text-caption font-sans-medium text-foreground-secondary">
        Demo: force store outcome
      </Text>
      <View className="flex-row gap-2">
        {DEBUG_OUTCOMES.map((outcome) => (
          <Pressable
            key={outcome.value}
            onPress={() => onSelect(outcome.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: selectedOutcome === outcome.value }}
            className={clsx("h-8 flex-1 items-center justify-center rounded-lg border", {
              "border-primary bg-highlight": selectedOutcome === outcome.value,
              "border-border-light bg-surface": selectedOutcome !== outcome.value,
            })}
          >
            <Text className="text-caption text-foreground-primary">{outcome.label}</Text>
          </Pressable>
        ))}
      </View>
      <Pressable onPress={onRestore} accessibilityRole="button">
        <Text className="text-caption font-sans-medium text-primary">Restore purchases</Text>
      </Pressable>
    </View>
  );
}
