import { Pressable, View } from "react-native";
import { clsx } from "clsx";

import { Text } from "@/components/ui/Text";
import { formatUsdFromCents, GIFT_AMOUNT_CENTS } from "@/features/purchases/constants/giftAmounts";

interface GiftAmountSelectorProps {
  selectedAmountCents: number;
  onSelect: (amountCents: number) => void;
  errorMessage?: string;
}

export function GiftAmountSelector({
  selectedAmountCents,
  onSelect,
  errorMessage,
}: GiftAmountSelectorProps) {
  return (
    <View className="rounded-xl border border-border p-4">
      <Text className="mb-3 text-h5 font-sans-medium text-foreground-primary">
        Gift for the creator
      </Text>
      <View className="mb-3 flex-row gap-2">
        {GIFT_AMOUNT_CENTS.map((amountCents) => (
          <Pressable
            key={amountCents}
            onPress={() => onSelect(amountCents)}
            accessibilityRole="button"
            accessibilityState={{ selected: selectedAmountCents === amountCents }}
            className={clsx("h-9 flex-1 items-center justify-center rounded-lg border", {
              "border-primary bg-highlight": selectedAmountCents === amountCents,
              "border-border-light bg-surface": selectedAmountCents !== amountCents,
            })}
          >
            <Text className="text-caption text-foreground-primary">
              {formatUsdFromCents(amountCents)}
            </Text>
          </Pressable>
        ))}
      </View>
      <View className="flex-row justify-between py-1">
        <Text className="text-body text-foreground-secondary">Subtotal</Text>
        <Text className="text-body text-foreground-primary">
          {formatUsdFromCents(selectedAmountCents)}
        </Text>
      </View>
      <View className="flex-row justify-between py-1">
        <Text className="text-body text-foreground-secondary">Fees</Text>
        <Text className="text-body text-foreground-primary">$0.00</Text>
      </View>
      <View className="mt-2 flex-row justify-between border-t border-border pt-2">
        <Text className="text-h5 font-sans-medium text-foreground-primary">Total</Text>
        <Text className="text-h5 font-sans-medium text-foreground-primary">
          {formatUsdFromCents(selectedAmountCents)}
        </Text>
      </View>
      {errorMessage && <Text className="mt-2 text-caption text-error">{errorMessage}</Text>}
    </View>
  );
}
