import { Pressable } from "react-native";
import { clsx } from "clsx";

import { Text } from "@/components/ui/Text";

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  className?: string;
}

export function PrimaryButton({ label, onPress, disabled, className }: PrimaryButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      disabled={disabled}
      className={clsx(
        "h-11 items-center justify-center rounded-control bg-primary",
        { "opacity-60": disabled },
        className,
      )}
    >
      <Text className="text-h5 font-sans-medium text-primary-foreground">{label}</Text>
    </Pressable>
  );
}
