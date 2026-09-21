import { Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { clsx } from "clsx";

import { Icon } from "@/components/ui/Icon";
import { Text } from "@/components/ui/Text";

interface PaymentMethodChipProps {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  isSelected: boolean;
  onPress: () => void;
}

export function PaymentMethodChip({ label, icon, isSelected, onPress }: PaymentMethodChipProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      className={clsx(
        "h-10 min-w-[96px] flex-row items-center justify-center gap-2 rounded-xl border px-3",
        {
          "border-primary bg-highlight": isSelected,
          "border-border-light bg-surface": !isSelected,
        },
      )}
    >
      <Icon
        name={icon}
        size={16}
        className={isSelected ? "text-primary" : "text-foreground-zinc"}
      />
      <Text
        className={clsx("text-body", {
          "font-sans-medium text-primary": isSelected,
          "text-foreground-zinc": !isSelected,
        })}
      >
        {label}
      </Text>
    </Pressable>
  );
}
